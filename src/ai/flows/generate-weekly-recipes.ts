"use server";
/**
 * @fileOverview Generates recipe suggestions for specific days and meal types within a week, based on user preferences and optionally previous recipes.
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
  previousWeekRecipes: z.string().optional().describe('A summary of recipes from the previous week, used for context and nutritional balancing (format: "Day: [Day Name], Meal: [Meal Type], Recipe: [Recipe Name]").'),
  existingCurrentWeekRecipes: z.string().optional().describe('A summary of recipes already planned for the current week, to avoid duplicates and fill gaps (same format as previousWeekRecipes).'),
  numberOfSuggestions: z.number().optional().default(7).describe('Approximate number of meal suggestions to generate (default: 7). Aim for variety across days/meals.')
});
export type GenerateWeeklyRecipesInput = z.infer<typeof GenerateWeeklyRecipesInputSchema>;

const GeneratedRecipeSchema = z.object({
    name: z.string().describe('The name of the generated recipe suggestion.'),
    description: z.string().describe('A brief description of the recipe.'),
    dayOfWeek: z.string().describe('The suggested day of the week for this meal (e.g., Monday, Tuesday).'),
    mealType: z.string().describe('The suggested meal type for this meal (e.g., Breakfast, Lunch, Dinner, Snack).'),
    // Potential future enhancement: include estimated ingredients
});

const GenerateWeeklyRecipesOutputSchema = z.object({
  suggestedRecipes: z.array(GeneratedRecipeSchema).describe('A list of suggested recipes with their assigned day and meal type for the specified week.'),
  notes: z.string().optional().describe('Any additional notes or comments on the suggestions, e.g., regarding nutritional balance or variety.'),
});
export type GenerateWeeklyRecipesOutput = z.infer<typeof GenerateWeeklyRecipesOutputSchema>;

export async function generateWeeklyRecipes(input: GenerateWeeklyRecipesInput): Promise<GenerateWeeklyRecipesOutput> {
   // The flow execution might throw errors (e.g., API key issues, network problems)
   // We catch them here to prevent unhandled promise rejections.
   try {
     return await generateWeeklyRecipesFlow(input);
   } catch (error) {
     console.error("Error executing generateWeeklyRecipesFlow:", error);
     // Re-throw the error so the client-side catch block can handle it
     throw new Error(`Failed to generate weekly recipes: ${error instanceof Error ? error.message : String(error)}`);
   }
}

const prompt = ai.definePrompt({
  name: 'generateWeeklyRecipesPrompt',
  input: { schema: GenerateWeeklyRecipesInputSchema },
  output: { schema: GenerateWeeklyRecipesOutputSchema },
  prompt: `You are an expert meal planner and nutritionist. Generate approximately {{numberOfSuggestions}} diverse recipe suggestions to fill the meal plan for the week starting on {{weekStartDate}}. Assign each suggestion to a specific day (Monday-Sunday) and meal type (Breakfast, Lunch, Dinner, Snack).

Consider the following user information:
- Dietary Needs: {{{dietaryNeeds}}}
- Food Preferences: {{{preferences}}}
{{#if previousWeekRecipes}}
- Recipes from the PREVIOUS week (for context and nutritional balance):
{{{previousWeekRecipes}}}
{{/if}}
{{#if existingCurrentWeekRecipes}}
- Meals ALREADY PLANNED for the CURRENT week (avoid suggesting for these slots and complement them):
{{{existingCurrentWeekRecipes}}}
{{/if}}

**Instructions:**
1.  **Analyze:** Look at the previous week's meals (if provided) and the meals already planned for the current week (if provided).
2.  **Identify Gaps:** Determine which days/meal slots are empty in the current week.
3.  **Generate Suggestions:** Create {{numberOfSuggestions}} meal suggestions that fit the user's dietary needs and preferences. Prioritize filling the identified gaps. Ensure variety.
4.  **Assign Day/Meal:** For EACH suggestion, assign a valid 'dayOfWeek' (Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday) and 'mealType' (Breakfast, Lunch, Dinner, Snack). Be specific.
5.  **Balance:** If previous week's meals are provided, try to suggest recipes that complement or balance the previous week's nutritional profile (e.g., if last week was heavy on meat, suggest more vegetarian options).
6.  **Format Output:** Provide the output strictly matching the 'GenerateWeeklyRecipesOutputSchema'. Each suggested recipe must have a 'name', 'description', 'dayOfWeek', and 'mealType'. Include overall 'notes' if applicable.
`,
});


const generateWeeklyRecipesFlow = ai.defineFlow(
  {
    name: 'generateWeeklyRecipesFlow',
    inputSchema: GenerateWeeklyRecipesInputSchema,
    outputSchema: GenerateWeeklyRecipesOutputSchema,
  },
  async (input) => {
    let output: GenerateWeeklyRecipesOutput | null = null;
    try {
        const promptResult = await prompt(input);
        output = promptResult.output; // Access output directly

        if (!output) {
            console.error('generateWeeklyRecipesPrompt returned null or undefined output.');
            throw new Error('AI prompt failed to generate a valid output structure.');
        }
    } catch (aiError) {
       console.error("Error calling generateWeeklyRecipesPrompt:", aiError);
       throw new Error(`AI prompt execution failed: ${aiError instanceof Error ? aiError.message : String(aiError)}`);
    }


     // Ensure each suggested recipe has a valid day and meal type, provide fallbacks if necessary
     const validatedRecipes = (output.suggestedRecipes || []).map(recipe => ({
       ...recipe,
       dayOfWeek: recipe.dayOfWeek || 'Monday', // Fallback example - Ideally AI provides this
       mealType: recipe.mealType || 'Lunch',   // Fallback example - Ideally AI provides this
     }));

     return { suggestedRecipes: validatedRecipes, notes: output.notes };
  }
);
