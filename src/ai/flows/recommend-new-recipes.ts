'use server';
/**
 * @fileOverview Recommends new recipes based on dietary needs and preferences.
 *
 * NOTE: This flow might be superseded by `generate-weekly-recipes.ts`. Consider migrating or removing.
 *
 * - recommendNewRecipes - A function that handles the recipe recommendation process.
 * - RecommendNewRecipesInput - The input type for the recommendNewRecipes function.
 * - RecommendNewRecipesOutput - The return type for the recommendNewRecipes function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const RecommendNewRecipesInputSchema = z.object({
  dietaryNeeds: z
    .string()
    .describe('The dietary needs of the user, e.g., vegetarian, vegan, gluten-free.'),
  preferences: z.string().describe('The food preferences of the user, e.g., Italian, spicy.'),
  weeklyRecipes: z
    .string()
    .describe('A list of the user weekly recipes, with ingredients and quantities.'),
});
export type RecommendNewRecipesInput = z.infer<typeof RecommendNewRecipesInputSchema>;

const RecommendNewRecipesOutputSchema = z.object({
  recipes: z
    .array(z.string())
    .describe('A list of recommended recipes based on the dietary needs and preferences.'),
});
export type RecommendNewRecipesOutput = z.infer<typeof RecommendNewRecipesOutputSchema>;

export async function recommendNewRecipes(input: RecommendNewRecipesInput): Promise<RecommendNewRecipesOutput> {
  try {
    return await recommendNewRecipesFlow(input);
  } catch (error) {
      console.error("Error executing recommendNewRecipes function:", error);
       // Check for specific API key error (example, adjust based on actual error message)
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred during recommendation.";
        const isApiKeyError = errorMessage.includes("API key not valid") || errorMessage.includes("API_KEY_INVALID") || errorMessage.includes("GOOGLE_API_KEY");
        const isModelError = errorMessage.includes('Model') && errorMessage.includes('not found');

        let userFriendlyMessage = `Failed to recommend recipes: ${errorMessage}`;
        if (isApiKeyError) {
            userFriendlyMessage = `Failed to recommend recipes: Invalid Google AI API Key. Please check your configuration.`;
        } else if (isModelError) {
             userFriendlyMessage = `Failed to recommend recipes: The configured AI model was not found.`;
        }

        // Re-throw with a potentially more user-friendly message or the original error
        throw new Error(userFriendlyMessage);
  }
}

const prompt = ai.definePrompt({
  name: 'recommendNewRecipesPrompt',
  model: 'googleai/gemini-1.5-flash-latest', // Use a valid free model
  input: {schema: RecommendNewRecipesInputSchema},
  output: {schema: RecommendNewRecipesOutputSchema},
  prompt: `You are a recipe recommendation expert. You will recommend new recipes based on the dietary needs and preferences of the user.

Dietary Needs: {{{dietaryNeeds}}}
Preferences: {{{preferences}}}
Weekly Recipes: {{{weeklyRecipes}}}

Recommend 3 new recipes that fit these needs and preferences. Provide only the recipe names.`, // Adjusted prompt for clarity
});

const recommendNewRecipesFlow = ai.defineFlow(
  {
    name: 'recommendNewRecipesFlow',
    inputSchema: RecommendNewRecipesInputSchema,
    outputSchema: RecommendNewRecipesOutputSchema,
  },
  async input => {
     try {
        console.log("Calling recommendNewRecipesPrompt with input:", input);
        const {output} = await prompt(input);
        if (!output) {
             console.error('recommendNewRecipesPrompt returned null or undefined output.');
             throw new Error('AI prompt failed to generate a valid output structure.');
        }
        console.log("recommendNewRecipesPrompt returned output:", output);
        return output;
     } catch (aiError) {
         console.error("Error calling recommendNewRecipesPrompt:", aiError);
         // Re-throw the specific AI error to be caught by the exported function's handler
         throw aiError;
     }

  }
);

