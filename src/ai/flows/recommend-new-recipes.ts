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
  return recommendNewRecipesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'recommendNewRecipesPrompt',
  model: 'googleai/gemini-1.5-flash-latest', // Specify the model to use
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
    const {output} = await prompt(input);
    return output!;
  }
);
