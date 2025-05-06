'use server';
/**
 * @fileOverview Analyzes the nutritional balance of a list of recipes.
 *
 * - analyzeNutritionalBalance - A function that handles the nutritional balance analysis.
 * - AnalyzeNutritionalBalanceInput - The input type for the analyzeNutritionalBalance function.
 * - AnalyzeNutritionalBalanceOutput - The return type for the analyzeNutritionalBalance function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {Food, getNutrition} from '@/services/nutrition';

const AnalyzeNutritionalBalanceInputSchema = z.object({
  recipes: z.array(
    z.object({
      name: z.string().describe('The name of the recipe.'),
      ingredients: z.array(
        z.object({
          name: z.string().describe('The name of the ingredient.'),
          quantity: z.number().describe('The quantity of the ingredient in grams.'),
        })
      ).describe('A list of ingredients in the recipe.'),
    })
  ).describe('A list of recipes to analyze.'),
});

export type AnalyzeNutritionalBalanceInput = z.infer<typeof AnalyzeNutritionalBalanceInputSchema>;

const AnalyzedRecipeSchema = z.object({
  name: z.string().describe('The name of the recipe.'),
  totalCalories: z.number().describe('The total calories in the recipe.'),
  totalProtein: z.number().describe('The total protein in the recipe.'),
  totalFat: z.number().describe('The total fat in the recipe.'),
  totalCarbohydrates: z.number().describe('The total carbohydrates in the recipe.'),
});

const NutritionalInsightsSchema = z.object({
  overallBalance: z.string().describe('An overall assessment of the nutritional balance of the recipes.'),
  macroNutrientRatio: z.string().describe('The ratio of macronutrients (protein, fat, carbohydrates) in the recipes.'),
  suggestions: z.array(z.string()).describe('Suggestions for improving the nutritional balance.'),
});

const AnalyzeNutritionalBalanceOutputSchema = z.object({
  analyzedRecipes: z.array(AnalyzedRecipeSchema).describe('The analyzed recipes with their nutritional information.'),
  nutritionalInsights: NutritionalInsightsSchema.describe('Overall nutritional insights and suggestions.'),
});

export type AnalyzeNutritionalBalanceOutput = z.infer<typeof AnalyzeNutritionalBalanceOutputSchema>;

export async function analyzeNutritionalBalance(input: AnalyzeNutritionalBalanceInput): Promise<AnalyzeNutritionalBalanceOutput> {
  return analyzeNutritionalBalanceFlow(input);
}

const analyzeNutritionalBalancePrompt = ai.definePrompt({
  name: 'analyzeNutritionalBalancePrompt',
  input: {schema: AnalyzeNutritionalBalanceInputSchema},
  output: {schema: AnalyzeNutritionalBalanceOutputSchema},
  prompt: `Analyze the nutritional balance of the following recipes and provide insights and suggestions.

Recipes:
{{#each recipes}}
  Recipe Name: {{this.name}}
  Ingredients:
  {{#each this.ingredients}}
    - {{this.name}} ({{this.quantity}}g)
  {{/each}}
{{/each}}

Consider the following:
- Overall nutritional balance of the recipes.
- Ratio of macronutrients (protein, fat, carbohydrates).
- Suggestions for improving the nutritional balance.

Output the analyzed recipes with their total calories, protein, fat, and carbohydrates, and overall nutritional insights and suggestions.`, 
});

const analyzeNutritionalBalanceFlow = ai.defineFlow(
  {
    name: 'analyzeNutritionalBalanceFlow',
    inputSchema: AnalyzeNutritionalBalanceInputSchema,
    outputSchema: AnalyzeNutritionalBalanceOutputSchema,
  },
  async input => {
    const analyzedRecipes = await Promise.all(
      input.recipes.map(async recipe => {
        let totalCalories = 0;
        let totalProtein = 0;
        let totalFat = 0;
        let totalCarbohydrates = 0;

        for (const ingredient of recipe.ingredients) {
          const nutrition = await getNutrition(ingredient.name);
          const factor = ingredient.quantity / 100;

          totalCalories += nutrition.calories * factor;
          totalProtein += nutrition.protein * factor;
          totalFat += nutrition.fat * factor;
          totalCarbohydrates += nutrition.carbohydrates * factor;
        }

        return {
          name: recipe.name,
          totalCalories,
          totalProtein,
          totalFat,
          totalCarbohydrates,
        };
      })
    );

    const promptInput = {
      recipes: input.recipes,
    };

    const {output} = await analyzeNutritionalBalancePrompt(promptInput);

    return {
      analyzedRecipes,
      nutritionalInsights: output!.nutritionalInsights,
    };
  }
);
