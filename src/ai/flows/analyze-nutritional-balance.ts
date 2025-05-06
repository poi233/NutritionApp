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
      // Include day/meal context in the name passed to the prompt
      name: z.string().describe('The name of the recipe, including day and meal type context (e.g., "Chicken Salad (Monday Lunch)").'),
      ingredients: z.array(
        z.object({
          name: z.string().describe('The name of the ingredient.'),
          quantity: z.number().describe('The quantity of the ingredient in grams.'),
        })
      ).min(1).describe('A list of ingredients in the recipe. Must not be empty for analysis.'), // Ensure ingredients exist
    })
  ).min(1).describe('A list of recipes with ingredients to analyze.'), // Ensure there's at least one recipe
});

export type AnalyzeNutritionalBalanceInput = z.infer<typeof AnalyzeNutritionalBalanceInputSchema>;

const AnalyzedRecipeSchema = z.object({
  // Keep the original name for mapping back if needed, but use the contextual name for display
  name: z.string().describe('The name of the recipe, including day and meal type context.'),
  totalCalories: z.number().describe('The total estimated calories in the recipe.'),
  totalProtein: z.number().describe('The total estimated protein in the recipe.'),
  totalFat: z.number().describe('The total estimated fat in the recipe.'),
  totalCarbohydrates: z.number().describe('The total estimated carbohydrates in the recipe.'),
});

const NutritionalInsightsSchema = z.object({
  overallBalance: z.string().describe('An overall assessment of the nutritional balance of the analyzed recipes for the week.'),
  macroNutrientRatio: z.string().describe('An estimated ratio or description of macronutrients (protein, fat, carbohydrates) across the analyzed recipes.'),
  suggestions: z.array(z.string()).describe('Suggestions for improving the nutritional balance for the week.'),
});

const AnalyzeNutritionalBalanceOutputSchema = z.object({
  analyzedRecipes: z.array(AnalyzedRecipeSchema).describe('The analyzed recipes with their estimated nutritional information.'),
  nutritionalInsights: NutritionalInsightsSchema.describe('Overall nutritional insights and suggestions for the week based on the analyzed meals.'),
});

export type AnalyzeNutritionalBalanceOutput = z.infer<typeof AnalyzeNutritionalBalanceOutputSchema>;

export async function analyzeNutritionalBalance(input: AnalyzeNutritionalBalanceInput): Promise<AnalyzeNutritionalBalanceOutput> {
  return analyzeNutritionalBalanceFlow(input);
}

// Note: The prompt now receives recipe names with context
const analyzeNutritionalBalancePrompt = ai.definePrompt({
  name: 'analyzeNutritionalBalancePrompt',
  // Pass the calculated nutritional data along with the original input structure to the prompt
  input: { schema: z.object({
      calculatedNutrition: z.array(AnalyzedRecipeSchema).describe("Pre-calculated nutritional breakdown for each recipe."),
      originalInput: AnalyzeNutritionalBalanceInputSchema.describe("Original input recipes and ingredients for context."),
  }) },
  output: { schema: AnalyzeNutritionalBalanceOutputSchema },
  prompt: `Analyze the overall weekly nutritional balance based on the following meals and their estimated nutrition. Provide insights and suggestions for the entire week.

**Estimated Nutrition per Meal:**
{{#each calculatedNutrition}}
  - {{this.name}}: Calories: {{this.totalCalories}}kcal, Protein: {{this.totalProtein}}g, Fat: {{this.totalFat}}g, Carbs: {{this.totalCarbohydrates}}g
{{/each}}

**Original Recipe Details (for context):**
{{#each originalInput.recipes}}
  Recipe: {{this.name}}
  Ingredients:
  {{#each this.ingredients}}
    - {{this.name}} ({{this.quantity}}g)
  {{/each}}
{{/each}}

**Analysis Task:**
Based *only* on the meals provided above:
1.  **Overall Balance:** Assess the overall nutritional balance for the week represented by these meals. Is it varied? Does it seem too high/low in certain areas?
2.  **Macronutrient Ratio:** Describe the estimated macronutrient distribution (calories from protein, fat, carbohydrates) across these meals.
3.  **Suggestions:** Provide 2-3 actionable suggestions for improving the nutritional balance for a week *like this one* (e.g., "Consider adding more fiber-rich snacks," "Include a source of healthy fats with lunch on days with leaner protein").

Output the results in the specified format, focusing on the 'nutritionalInsights' part. The 'analyzedRecipes' field in the output should mirror the 'calculatedNutrition' provided in the input.`,
});


const analyzeNutritionalBalanceFlow = ai.defineFlow(
  {
    name: 'analyzeNutritionalBalanceFlow',
    inputSchema: AnalyzeNutritionalBalanceInputSchema, // Flow input is still the original list of recipes
    outputSchema: AnalyzeNutritionalBalanceOutputSchema,
  },
  async input => {
    // 1. Calculate nutrition for each recipe first
    const calculatedNutrition = await Promise.all(
      input.recipes.map(async recipe => {
        let totalCalories = 0;
        let totalProtein = 0;
        let totalFat = 0;
        let totalCarbohydrates = 0;

        for (const ingredient of recipe.ingredients) {
           try {
              const nutrition = await getNutrition(ingredient.name);
              const factor = ingredient.quantity / 100; // Assuming nutrition data is per 100g

              totalCalories += (nutrition.calories || 0) * factor;
              totalProtein += (nutrition.protein || 0) * factor;
              totalFat += (nutrition.fat || 0) * factor;
              totalCarbohydrates += (nutrition.carbohydrates || 0) * factor;
            } catch (error) {
                 console.warn(`Could not get nutrition for ingredient "${ingredient.name}" during analysis calculation:`, error);
             }
        }

        return {
          name: recipe.name, // Use the contextual name provided in input
          totalCalories: parseFloat(totalCalories.toFixed(0)),
          totalProtein: parseFloat(totalProtein.toFixed(1)),
          totalFat: parseFloat(totalFat.toFixed(1)),
          totalCarbohydrates: parseFloat(totalCarbohydrates.toFixed(1)),
        };
      })
    );

    // 2. Prepare input for the AI prompt, including the calculated data
    const promptInput = {
      calculatedNutrition: calculatedNutrition,
      originalInput: input, // Pass the original input for context if needed by the prompt
    };

    // 3. Call the AI prompt with the combined data
    const { output } = await analyzeNutritionalBalancePrompt(promptInput);

    // 4. Return the result. The AI's main task is the insights.
    //    The analyzedRecipes part should ideally come directly from the AI's interpretation
    //    of the calculatedNutrition passed in, or we can just return our calculation.
    //    Let's trust the AI to return it based on the input structure, but fallback to our calculation.
    return {
      analyzedRecipes: output?.analyzedRecipes && output.analyzedRecipes.length > 0 ? output.analyzedRecipes : calculatedNutrition,
      nutritionalInsights: output!.nutritionalInsights, // Assume insights are always generated
    };
  }
);
