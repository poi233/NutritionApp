'use server';
/**
 * @fileOverview Generates recipe suggestions for a specific week based on user preferences and optionally previous recipes.
 *
 * - generateWeeklyRecipes - A function that handles the weekly recipe generation process.
 * - GenerateWeeklyRecipesInput - The input type for the generateWeeklyRecipes function.
 * - GenerateWeeklyRecipesOutput - The return type for the generateWeeklyRecipes function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateWeeklyRecipesInputSchema = z.object({
  weekStartDate: z.string().describe('The start date of the week for which to generate recipes (ISO format: yyyy-MM-dd).'),
  dietaryNeeds: z.string().optional().describe('The dietary needs of the user (e.g., vegetarian, gluten-free).'),
  preferences: z.string().optional().describe('The food preferences of the user (e.g., Italian, spicy).'),
  previousWeekRecipes: z.string().optional().describe('A summary of recipes from the previous week, used for context and nutritional balancing.'),
});
export type GenerateWeeklyRecipesInput = z.infer<typeof GenerateWeeklyRecipesInputSchema>;

const GeneratedRecipeSchema = z.object({
    name: z.string().describe('The name of the generated recipe.'),
    description: z.string().describe('A brief description of the recipe.'),
    // Potential future enhancement: include estimated ingredients
});

const GenerateWeeklyRecipesOutputSchema = z.object({
  suggestedRecipes: z.array(GeneratedRecipeSchema).describe('A list of suggested recipes for the specified week.'),
  notes: z.string().optional().describe('Any additional notes or comments on the suggestions, e.g., regarding nutritional balance.'),
});
export type GenerateWeeklyRecipesOutput = z.infer<typeof GenerateWeeklyRecipesOutputSchema>;

export async function generateWeeklyRecipes(input: GenerateWeeklyRecipesInput): Promise<GenerateWeeklyRecipesOutput> {
  return generateWeeklyRecipesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateWeeklyRecipesPrompt',
  input: { schema: GenerateWeeklyRecipesInputSchema },
  output: { schema: GenerateWeeklyRecipesOutputSchema },
  prompt: `You are an expert meal planner and nutritionist. Generate 3-5 diverse recipe suggestions for the week starting on {{weekStartDate}}.

Consider the following user information:
- Dietary Needs: {{{dietaryNeeds}}}
- Food Preferences: {{{preferences}}}
{{#if previousWeekRecipes}}
- Recipes from the previous week (for context and nutritional balance):
{{{previousWeekRecipes}}}
{{/if}}

Aim for a balanced set of meals for the week. If previous week's recipes are provided, try to suggest recipes that complement or balance the previous week's nutritional profile.

For each suggested recipe, provide a name and a brief description.
Also provide overall notes if applicable (e.g., how these recipes contribute to balance).
`,
});

const generateWeeklyRecipesFlow = ai.defineFlow(
  {
    name: 'generateWeeklyRecipesFlow',
    inputSchema: GenerateWeeklyRecipesInputSchema,
    outputSchema: GenerateWeeklyRecipesOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    // Add basic validation or default values if needed
    return output || { suggestedRecipes: [], notes: 'Could not generate suggestions.' };
  }
);
