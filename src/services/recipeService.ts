"use server";

import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';
import { Recipe, Ingredient } from '@/types/recipe'; // Assuming your path alias is setup
import crypto from 'crypto';

const DB_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DB_DIR, 'nutrition_app.db');

// Ensure the data directory exists
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const db = new sqlite3.Database(DB_PATH, (err: Error | null) => {
  if (err) {
    console.error('Error opening database', err.message);
  } else {
    console.log('Connected to the SQLite database.');
    // Enable foreign key constraint enforcement
    db.run('PRAGMA foreign_keys = ON;', (pragmaErr: Error | null) => {
      if (pragmaErr) {
        console.error('Error enabling foreign key constraints', pragmaErr.message);
      } else {
        console.log('Foreign key constraints enabled.');
        initializeDb();
      }
    });
  }
});

const initializeDb = () => {
  db.serialize(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS recipes (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        weekStartDate TEXT,
        dayOfWeek TEXT,
        mealType TEXT,
        calories REAL,
        protein REAL,
        fat REAL,
        carbohydrates REAL,
        description TEXT
      )
    `, (err: Error | null) => {
      if (err) console.error('Error creating recipes table', err.message);
      else console.log('Recipes table created or already exists.');
    });

    db.run(`
      CREATE TABLE IF NOT EXISTS ingredients (
        id TEXT PRIMARY KEY,
        recipe_id TEXT NOT NULL,
        name TEXT NOT NULL,
        quantity REAL NOT NULL,
        FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
      )
    `, (err: Error | null) => {
      if (err) console.error('Error creating ingredients table', err.message);
      else console.log('Ingredients table created or already exists.');
    });
  });
};

export const addRecipe = async (recipe: Recipe): Promise<string> => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      const recipeStmt = db.prepare(
        'INSERT INTO recipes (id, name, weekStartDate, dayOfWeek, mealType, calories, protein, fat, carbohydrates, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      );
      recipeStmt.run(
        recipe.id,
        recipe.name,
        recipe.weekStartDate,
        recipe.dayOfWeek,
        recipe.mealType,
        recipe.calories,
        recipe.protein,
        recipe.fat,
        recipe.carbohydrates,
        recipe.description,
        function (err: Error | null) {
          if (err) {
            reject(new Error(`Failed to insert recipe: ${err.message}`));
            return;
          }
          
          const ingredientStmt = db.prepare(
            'INSERT INTO ingredients (id, recipe_id, name, quantity) VALUES (?, ?, ?, ?)'
          );
          for (const ingredient of recipe.ingredients) {
            // Use existing ingredient.id if provided and valid, otherwise generate one
            const ingId = ingredient.id && ingredient.id !== '' ? ingredient.id : crypto.randomUUID();
            ingredientStmt.run(ingId, recipe.id, ingredient.name, ingredient.quantity, (ingErr: Error | null) => {
              if (ingErr) {
                // Consider rollback or cleanup here if an ingredient fails
                console.error(`Failed to insert ingredient ${ingredient.name}: ${ingErr.message}`);
              }
            });
          }
          ingredientStmt.finalize((finalizeErr: Error | null) => {
            if (finalizeErr) {
                 // If finalizing ingredient statement fails, it's a serious issue.
                 // The recipe insert might have succeeded, but ingredients might be partially inserted.
                 // This indicates a need for more robust transaction management.
                reject(new Error(`Failed to finalize ingredient insertions: ${finalizeErr.message}`));
            } else {
                resolve(recipe.id);
            }
          });
        }
      );
      recipeStmt.finalize();
    });
  });
};

export const getAllRecipes = async (): Promise<Recipe[]> => {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM recipes', [], (err, rows: any[]) => {
      if (err) {
        reject(new Error(`Failed to fetch recipes: ${err.message}`));
        return;
      }
      
      const recipes: Recipe[] = [];
      let pending = rows.length;
      if (pending === 0) {
        resolve([]);
        return;
      }

      rows.forEach((row) => {
        db.all('SELECT * FROM ingredients WHERE recipe_id = ?', [row.id], (ingErr, ingredients: any[]) => {
          if (ingErr) {
            reject(new Error(`Failed to fetch ingredients for recipe ${row.id}: ${ingErr.message}`));
            return;
          }
          recipes.push({ ...row, ingredients: ingredients.map(ing => ({...ing, id: ing.id || crypto.randomUUID()})) }); // Ensure ingredient has an id for client
          pending--;
          if (pending === 0) {
            resolve(recipes);
          }
        });
      });
    });
  });
};

export const getRecipeById = async (id: string): Promise<Recipe | null> => {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM recipes WHERE id = ?', [id], (err, row: any) => {
      if (err) {
        reject(new Error(`Failed to fetch recipe ${id}: ${err.message}`));
        return;
      }
      if (!row) {
        resolve(null);
        return;
      }
      db.all('SELECT * FROM ingredients WHERE recipe_id = ?', [id], (ingErr, ingredients: any[]) => {
        if (ingErr) {
          reject(new Error(`Failed to fetch ingredients for recipe ${id}: ${ingErr.message}`));
          return;
        }
        resolve({ ...row, ingredients: ingredients.map(ing => ({...ing, id: ing.id || crypto.randomUUID()})) });
      });
    });
  });
};

export const updateRecipe = async (recipe: Recipe): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      const recipeStmt = db.prepare(
        'UPDATE recipes SET name = ?, weekStartDate = ?, dayOfWeek = ?, mealType = ?, calories = ?, protein = ?, fat = ?, carbohydrates = ?, description = ? WHERE id = ?'
      );
      recipeStmt.run(
        recipe.name,
        recipe.weekStartDate,
        recipe.dayOfWeek,
        recipe.mealType,
        recipe.calories,
        recipe.protein,
        recipe.fat,
        recipe.carbohydrates,
        recipe.description,
        recipe.id,
        function (err: Error | null) {
          if (err) {
            reject(new Error(`Failed to update recipe ${recipe.id}: ${err.message}`));
            return;
          }
          // For simplicity, delete old ingredients and add new ones.
          // A more optimized approach would be to diff and update/insert/delete specific ingredients.
          db.run('DELETE FROM ingredients WHERE recipe_id = ?', [recipe.id], (delErr: Error | null) => {
            if (delErr) {
              reject(new Error(`Failed to delete old ingredients for recipe ${recipe.id}: ${delErr.message}`));
              return;
            }
            const ingredientStmt = db.prepare(
              'INSERT INTO ingredients (id, recipe_id, name, quantity) VALUES (?, ?, ?, ?)'
            );
            let ingredientError: Error | null = null;
            for (const ingredient of recipe.ingredients) {
              const ingId = ingredient.id && ingredient.id !== '' ? ingredient.id : crypto.randomUUID();
              ingredientStmt.run(ingId, recipe.id, ingredient.name, ingredient.quantity, (ingErr: Error | null) => {
                if (ingErr && !ingredientError) { // Store first error
                  ingredientError = ingErr;
                }
              });
            }
            ingredientStmt.finalize((finalizeErr: Error | null) => {
              if (ingredientError) {
                reject(new Error(`Failed to insert one or more ingredients: ${ingredientError.message}`));
              } else if (finalizeErr) {
                reject(new Error(`Failed to finalize ingredient insertions during update: ${finalizeErr.message}`));
              }
              else {
                resolve();
              }
            });
          });
        }
      );
      recipeStmt.finalize();
    });
  });
};

export const deleteRecipe = async (id: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    // Due to ON DELETE CASCADE, ingredients will be deleted automatically.
    db.run('DELETE FROM recipes WHERE id = ?', [id], function (err: Error | null) {
      if (err) {
        reject(new Error(`Failed to delete recipe ${id}: ${err.message}`));
      } else if (this.changes === 0) {
        reject(new Error(`Recipe with id ${id} not found for deletion.`));
      }
      else {
        resolve();
      }
    });
  });
};

export const deleteRecipesByWeekStartDate = async (weekStartDate: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM recipes WHERE weekStartDate = ?', [weekStartDate], function (err: Error | null) {
      if (err) {
        reject(new Error(`Failed to delete recipes for week ${weekStartDate}: ${err.message}`));
      } else {
        // this.changes could be 0 if no recipes existed for that week, which is not an error.
        console.log(`Deleted ${this.changes} recipes for week ${weekStartDate}.`);
        resolve();
      }
    });
  });
};


// Function to generate a weekly meal plan
export const generateWeeklyRecipe = async (recipes: Recipe[]): Promise<void> => {
  if (!recipes || recipes.length === 0) {
    console.log("No recipes provided to generate weekly plan.");
    return Promise.resolve();
  }

  const weekStartDate = recipes[0].weekStartDate; // Assuming all recipes in the array share the same weekStartDate

  if (!weekStartDate) {
    return Promise.reject(new Error("weekStartDate is missing in the first recipe, cannot delete old recipes for the week."));
  }

  return new Promise((resolve, reject) => {
    db.serialize(async () => {
      try {
        // Begin transaction
        db.run("BEGIN TRANSACTION;");

        // Delete old recipes for the week
        await deleteRecipesByWeekStartDate(weekStartDate);

        // Add new recipes
        for (const recipe of recipes) {
          // Ensure each recipe has a unique ID if not provided
          if (!recipe.id) {
            recipe.id = crypto.randomUUID();
          }
          await addRecipe(recipe); // addRecipe already handles ingredients
        }
        
        // Commit transaction
        db.run("COMMIT;", (commitErr: Error | null) => {
          if (commitErr) {
            console.error('Failed to commit transaction for generateWeeklyRecipe', commitErr.message);
            // Attempt to rollback on commit error
            db.run("ROLLBACK;"); 
            reject(new Error(`Failed to commit transaction: ${commitErr.message}`));
          } else {
            console.log(`Successfully generated weekly recipes for week starting ${weekStartDate}`);
            resolve();
          }
        });
      } catch (error: any) {
        // Rollback transaction in case of any error during the process
        db.run("ROLLBACK;");
        console.error('Error generating weekly recipe, transaction rolled back.', error.message);
        reject(new Error(`Failed to generate weekly recipes: ${error.message}`));
      }
    });
  });
};

// Gracefully close the database connection when the app exits
// This is more relevant for standalone scripts. For Next.js, connection management can be complex.
// For now, we're keeping it simple, but in a real app, consider connection pooling or per-request connections.
process.on('SIGINT', () => {
  db.close((err: Error | null) => {
    if (err) {
      return console.error(err.message);
    }
    console.log('Closed the database connection.');
    process.exit(0);
  });
});

// Note: For Next.js, especially in serverless environments, managing a persistent sqlite3 connection
// like this can be problematic. Each serverless function invocation might try to re-initialize the DB.
// A common pattern is to ensure the DB object is created once and reused, or to use a
// connection pool if the underlying driver supports it well in such an environment.
// For development and simple cases, this setup might work.
// Consider using a helper function to get the DB instance, ensuring it's initialized only once.
