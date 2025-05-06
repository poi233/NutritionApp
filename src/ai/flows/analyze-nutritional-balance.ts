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
  // The flow execution might throw errors (e.g., API key issues, network problems)
  // We catch them here to prevent unhandled promise rejections.
  try {
      console.log("Entering analyzeNutritionalBalance function with input:", input);
      const result = await analyzeNutritionalBalanceFlow(input);
      console.log("analyzeNutritionalBalanceFlow returned successfully:", result);
      return result;
  } catch (error) {
      console.error("Error executing analyzeNutritionalBalance function:", error);
      // Re-throw the error so the client-side catch block can handle it
      // Or return a specific error structure if needed
      throw new Error(`Failed to analyze nutritional balance: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Note: The prompt now receives recipe names with context
const analyzeNutritionalBalancePrompt = ai.definePrompt({
  name: 'analyzeNutritionalBalancePrompt',
  model: 'gemini-1.5-flash-latest', // Specify the model to use
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
    console.log("Entering analyzeNutritionalBalanceFlow with input:", input);
    try {
        // 1. Calculate nutrition for each recipe first
        console.log("Calculating nutrition for recipes...");
        const calculatedNutrition = await Promise.all(
          input.recipes.map(async recipe => {
            let totalCalories = 0;
            let totalProtein = 0;
            let totalFat = 0;
            let totalCarbohydrates = 0;

            for (const ingredient of recipe.ingredients) {
               try {
                  // console.log(`Fetching nutrition for ingredient: ${ingredient.name}`); // Verbose logging
                  const nutrition = await getNutrition(ingredient.name);
                  const factor = ingredient.quantity / 100; // Assuming nutrition data is per 100g

                  totalCalories += (nutrition.calories || 0) * factor;
                  totalProtein += (nutrition.protein || 0) * factor;
                  totalFat += (nutrition.fat || 0) * factor;
                  totalCarbohydrates += (nutrition.carbohydrates || 0) * factor;
                } catch (error) {
                     // Log specific ingredient error
                     console.warn(`Could not get nutrition for ingredient "${ingredient.name}" in recipe "${recipe.name}" during analysis calculation:`, error);
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
        console.log("Calculated nutrition:", calculatedNutrition);

        // 2. Prepare input for the AI prompt, including the calculated data
        const promptInput = {
          calculatedNutrition: calculatedNutrition,
          originalInput: input, // Pass the original input for context if needed by the prompt
        };
         console.log("Prepared prompt input:", JSON.stringify(promptInput, null, 2)); // Log the input being sent to the AI

        // 3. Call the AI prompt with the combined data
        // Add specific try-catch for the AI call
        let output: AnalyzeNutritionalBalanceOutput | null = null;
        try {
            console.log("Calling analyzeNutritionalBalancePrompt...");
            const promptResult = await analyzeNutritionalBalancePrompt(promptInput);
            console.log("analyzeNutritionalBalancePrompt raw result:", promptResult); // Log the raw result
            output = promptResult.output; // Access output directly
            if (!output) {
                 console.error('analyzeNutritionalBalancePrompt returned null or undefined output.');
                 throw new Error('AI prompt failed to generate a valid output structure.');
            }
             console.log("analyzeNutritionalBalancePrompt parsed output:", output);
        } catch (aiError) {
            console.error("Error calling analyzeNutritionalBalancePrompt:", aiError);
             // Check if it's an API key issue more specifically
            if (aiError instanceof Error && (aiError.message.includes('API key not valid') || aiError.message.includes('API_KEY_INVALID'))) {
                 console.error("It seems like the Google AI API key is invalid or missing. Please check the GOOGLE_API_KEY environment variable.");
                 throw new Error(`AI prompt execution failed: Invalid Google AI API Key. ${aiError.message}`);
            }
            throw new Error(`AI prompt execution failed: ${aiError instanceof Error ? aiError.message : String(aiError)}`);
        }

        // 4. Return the result. Ensure the structure matches the schema.
        // If AI provides analyzedRecipes, use that. Otherwise, fall back to our calculatedNutrition.
        const finalAnalyzedRecipes = (output?.analyzedRecipes && output.analyzedRecipes.length > 0)
            ? output.analyzedRecipes
            : calculatedNutrition;

        // Ensure insights object exists, provide a default if AI failed to generate it but didn't throw
         const finalInsights = output.nutritionalInsights || {
             overallBalance: "Analysis could not determine overall balance.",
             macroNutrientRatio: "Analysis could not determine macronutrient ratio.",
             suggestions: ["No suggestions available due to analysis issue."]
         };


        console.log("analyzeNutritionalBalanceFlow returning final structure:", { analyzedRecipes: finalAnalyzedRecipes, nutritionalInsights: finalInsights });
        return {
          analyzedRecipes: finalAnalyzedRecipes,
          nutritionalInsights: finalInsights,
        };
    } catch (flowError) {
        console.error("Error within analyzeNutritionalBalanceFlow logic:", flowError);
        // Re-throw to be caught by the outer handler in the exported function
        throw flowError;
    }
  }
);

