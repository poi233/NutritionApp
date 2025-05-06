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

const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const mealTypes = ["Breakfast", "Lunch", "Dinner", "Snack"];


const GenerateWeeklyRecipesInputSchema = z.object({
  weekStartDate: z.string().describe('The start date of the week for which to generate recipes (ISO format: yyyy-MM-dd).'),
  dietaryNeeds: z.string().optional().describe('The dietary needs of the user (e.g., vegetarian, gluten-free).'),
  preferences: z.string().optional().describe('The food preferences of the user (e.g., Italian, spicy).'),
  previousWeekRecipes: z.string().optional().describe('A summary of recipes from the previous week, used for context and nutritional balancing (format: "Day: [Day Name], Meal: [Meal Type], Recipe: [Recipe Name]").'),
  existingCurrentWeekRecipes: z.string().optional().describe('A summary of recipes already planned for the current week, to avoid duplicates and fill gaps (same format as previousWeekRecipes).'),
  numberOfSuggestions: z.number().optional().default(7).describe('Approximate number of meal suggestions to generate (default: 7). Aim for variety across days/meals.')
});
export type GenerateWeeklyRecipesInput = z.infer<typeof GenerateWeeklyRecipesInputSchema>;

const GeneratedIngredientSchema = z.object({
    name: z.string().describe('The name of the estimated ingredient.'),
    quantity: z.number().positive().describe('The estimated quantity of the ingredient in grams.'),
});

const GeneratedRecipeSchema = z.object({
    name: z.string().describe('The name of the generated recipe suggestion.'),
    description: z.string().describe('A brief description of the recipe.'),
    // Add validation for day and meal types using zod enum
    dayOfWeek: z.enum(daysOfWeek as [string, ...string[]]).describe('The suggested day of the week for this meal.'),
    mealType: z.enum(mealTypes as [string, ...string[]]).describe('The suggested meal type for this meal.'),
    // Generate estimated ingredients
    ingredients: z.array(GeneratedIngredientSchema).min(1).describe('An estimated list of ingredients with quantities in grams for this recipe.'),
});

const GenerateWeeklyRecipesOutputSchema = z.object({
  suggestedRecipes: z.array(GeneratedRecipeSchema).describe('A list of suggested recipes with their assigned day, meal type, and estimated ingredients for the specified week.'),
  notes: z.string().optional().describe('Any additional notes or comments on the suggestions, e.g., regarding nutritional balance or variety.'),
});
export type GenerateWeeklyRecipesOutput = z.infer<typeof GenerateWeeklyRecipesOutputSchema>;

// Helper function to check for common API key error messages
const isApiKeyError = (errorMessage: string): boolean => {
    const lowerCaseMessage = errorMessage.toLowerCase();
    return lowerCaseMessage.includes('api key not valid') ||
           lowerCaseMessage.includes('api_key_invalid') ||
           lowerCaseMessage.includes('invalid api key') ||
           lowerCaseMessage.includes('permission denied') || // Sometimes permission errors mask key issues
           lowerCaseMessage.includes('authentication failed');
};

export async function generateWeeklyRecipes(input: GenerateWeeklyRecipesInput): Promise<GenerateWeeklyRecipesOutput> {
   // The flow execution might throw errors (e.g., API key issues, network problems)
   // We catch them here to prevent unhandled promise rejections.
   try {
      console.log("Entering generateWeeklyRecipes function with input:", input);
      const result = await generateWeeklyRecipesFlow(input);
      console.log("generateWeeklyRecipesFlow returned successfully:", result);
      return result;
   } catch (error) {
     console.error("Error executing generateWeeklyRecipes function:", error);
     const errorMessage = error instanceof Error ? error.message : String(error);

     // Provide a more specific error message for API key issues
     if (isApiKeyError(errorMessage)) {
         console.error("Potential API Key issue detected.");
         throw new Error(`Failed to generate weekly recipes: Invalid Google AI API Key or Authentication Error. Please check the GOOGLE_API_KEY environment variable and ensure it's correct and active. Original error: ${errorMessage}`);
     }

     // Check for model not found specifically
     if (errorMessage.includes('Model') && (errorMessage.includes('not found') || errorMessage.includes('NOT_FOUND'))) {
          const modelName = prompt.model?.name || 'Unknown Model';
          console.error(`The specified model in generateWeeklyRecipesPrompt ('${modelName}') was not found or is invalid.`);
          throw new Error(`Failed to generate weekly recipes: AI model not found. ${errorMessage}`);
     }

     // Re-throw other errors
     throw new Error(`Failed to generate weekly recipes: ${errorMessage}`);
   }
}

const prompt = ai.definePrompt({
  name: 'generateWeeklyRecipesPrompt',
  // Use the 'googleai/' prefix and a stable, available model name.
  model: 'googleai/gemini-1.5-flash',
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
4.  **Assign Day/Meal:** For EACH suggestion, assign a valid 'dayOfWeek' (exactly one of: ${daysOfWeek.join(', ')}) and 'mealType' (exactly one of: ${mealTypes.join(', ')}). Be specific.
5.  **Estimate Ingredients:** For EACH suggestion, provide a plausible list of main 'ingredients' with estimated 'quantity' in grams (e.g., [{ name: "Chicken Breast", quantity: 150 }, { name: "Broccoli", quantity: 100 }]). Aim for reasonable portion sizes. This is crucial for later nutritional estimation. The ingredients list must not be empty.
6.  **Balance:** If previous week's meals are provided, try to suggest recipes that complement or balance the previous week's nutritional profile (e.g., if last week was heavy on meat, suggest more vegetarian options).
7.  **Format Output:** Provide the output strictly matching the 'GenerateWeeklyRecipesOutputSchema'. Each suggested recipe must have a 'name', 'description', 'dayOfWeek', 'mealType', and an 'ingredients' array. Include overall 'notes' if applicable.
`,
});


const generateWeeklyRecipesFlow = ai.defineFlow(
  {
    name: 'generateWeeklyRecipesFlow',
    inputSchema: GenerateWeeklyRecipesInputSchema,
    outputSchema: GenerateWeeklyRecipesOutputSchema,
  },
  async (input) => {
    console.log("Entering generateWeeklyRecipesFlow with input:", input);
    let output: GenerateWeeklyRecipesOutput | null = null;
    try {
        console.log("Calling generateWeeklyRecipesPrompt...");
        console.log("Prompt input:", JSON.stringify(input, null, 2)); // Log input sent to AI
        const promptResult = await prompt(input);
        console.log("generateWeeklyRecipesPrompt raw result:", promptResult); // Log raw result
        output = promptResult.output; // Access output directly

        if (!output) {
            console.error('generateWeeklyRecipesPrompt returned null or undefined output.');
            throw new Error('AI prompt failed to generate a valid output structure.');
        }
        console.log("generateWeeklyRecipesPrompt parsed output:", output);
    } catch (aiError) {
       console.error("Error calling generateWeeklyRecipesPrompt:", aiError);
       const errorMessage = aiError instanceof Error ? aiError.message : String(aiError);

        // Check if it's an API key issue more specifically
        if (isApiKeyError(errorMessage)) {
             console.error("It seems like the Google AI API key is invalid or missing. Please check the GOOGLE_API_KEY environment variable.");
              // Throw a more specific error that the outer catch block can identify
             throw new Error(`AI prompt execution failed: Invalid Google AI API Key or Authentication Error. ${errorMessage}`);
        }
        // Check for model not found error specifically
        if (errorMessage.includes('Model') && (errorMessage.includes('not found') || errorMessage.includes('NOT_FOUND'))) {
            // Ensure the model name logged matches the one used
            const modelName = prompt.model?.name || 'Unknown Model';
            console.error(`The specified model in generateWeeklyRecipesPrompt ('${modelName}') was not found or is invalid.`);
            throw new Error(`AI prompt execution failed: Model not found. ${errorMessage}`);
        }
       // Throw generic AI error for other issues
       throw new Error(`AI prompt execution failed: ${errorMessage}`);
    }


     // Validate AI output against Zod schema again for robustness, and provide fallbacks
     try {
       const validatedOutput = GenerateWeeklyRecipesOutputSchema.parse(output);
       console.log("Validated AI output:", validatedOutput);
       // Return validated output directly
       return validatedOutput;
     } catch (validationError) {
         console.error("AI output failed Zod validation:", validationError);
         console.warn("AI output that failed validation:", output); // Log the invalid structure

         // Attempt to salvage: Filter valid recipes and provide default notes
         const salvageableRecipes = (output?.suggestedRecipes || []).filter(recipe => {
            try {
                // Ensure generated ingredients are also validated
                GeneratedRecipeSchema.parse(recipe);
                return true;
            } catch {
                console.warn(`Filtering out invalid suggested recipe: ${JSON.stringify(recipe)}`);
                return false;
            }
         });

          return {
              suggestedRecipes: salvageableRecipes,
              notes: output?.notes || "AI generated recipes, but some might be invalid or incomplete due to formatting issues (especially ingredients)."
          };
     }
  }
);

