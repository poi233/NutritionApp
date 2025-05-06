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
import type { Recipe } from '@/types/recipe'; // Import Recipe type

// Keep English internally for consistency, will translate in UI or prompt
const daysOfWeekInternal = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
// Removed Snack
const mealTypesInternal = ["Breakfast", "Lunch", "Dinner"];

// Use Zod enums based on the internal English values for validation
const GeneratedIngredientSchema = z.object({
  name: z.string().describe('The name of the estimated ingredient, in Chinese.'), // Specify Chinese name
  // Updated validation: must be a number greater than 0
  quantity: z.coerce // Coerce input to number
    .number({ invalid_type_error: "数量必须是数字" }) // "Quantity must be a number"
    .positive("数量必须是正数（大于0）"), // "Quantity must be positive (greater than 0)"
});

const GeneratedRecipeSchema = z.object({
    name: z.string().describe('The name of the generated recipe suggestion, in Chinese.'), // Specify Chinese name
    description: z.string().describe('A brief description of the recipe, in Chinese.'), // Specify Chinese description
    // Validate against internal English values
    dayOfWeek: z.enum(daysOfWeekInternal as [string, ...string[]]).describe('The suggested day of the week for this meal (must be one of Monday, Tuesday, etc.).'),
    // Updated meal type enum without Snack
    mealType: z.enum(mealTypesInternal as [string, ...string[]]).describe('The suggested meal type for this meal (must be one of Breakfast, Lunch, Dinner).'),
    // Generate estimated ingredients using the updated schema
    ingredients: z.array(GeneratedIngredientSchema).min(1).describe('An estimated list of ingredients with quantities in grams for this recipe. Quantity must be positive.'),
});


// Input schema remains the same, preferences might now include Chinese
const GenerateWeeklyRecipesInputSchema = z.object({
  weekStartDate: z.string().describe('The start date of the week for which to generate recipes (ISO format: yyyy-MM-dd).'),
  dietaryNeeds: z.string().optional().describe('The dietary needs of the user (e.g., vegetarian, gluten-free).'),
  preferences: z.string().optional().describe('The food preferences of the user (e.g., Chinese food, Italian, spicy).'), // Added Chinese food example
  previousWeekRecipes: z.string().optional().describe('A summary of recipes from the previous week, used for context and nutritional balancing (format: "Day: [Day Name], Meal: [Meal Type], Recipe: [Recipe Name]").'),
  existingCurrentWeekRecipes: z.string().optional().describe('A summary of recipes already planned for the current week, to avoid duplicates and fill gaps (same format as previousWeekRecipes).'),
  numberOfSuggestions: z.number().optional().default(7).describe('Approximate number of meal suggestions to generate (default: 7). Aim for variety across days/meals.')
});
export type GenerateWeeklyRecipesInput = z.infer<typeof GenerateWeeklyRecipesInputSchema>;


// Output Schema: Use the updated GeneratedRecipeSchema which expects Chinese names/descriptions
const GenerateWeeklyRecipesOutputSchema = z.object({
  suggestedRecipes: z.array(GeneratedRecipeSchema).describe('A list of suggested recipes with their assigned day, meal type, and estimated ingredients for the specified week. Recipe names and descriptions should be in Chinese.'),
  notes: z.string().optional().describe('Any additional notes or comments on the suggestions (in Chinese), e.g., regarding nutritional balance or variety.'), // Specify Chinese notes
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
      // Explicitly add/ensure Chinese preference if not already strongly specified
       const preferencesWithChinese = input.preferences ?
          (input.preferences.toLowerCase().includes('chinese') || input.preferences.includes('中餐') ? input.preferences : `${input.preferences}, prefers Chinese food (偏爱中餐)`)
          : "prefers Chinese food (偏爱中餐)"; // Default if no preferences given


      const modifiedInput = { ...input, preferences: preferencesWithChinese };
      console.log("Modified input for prompt (emphasizing Chinese):", modifiedInput);

      const result = await generateWeeklyRecipesFlow(modifiedInput);
      console.log("generateWeeklyRecipesFlow returned successfully:", result);
      return result;
   } catch (error) {
     console.error("Error executing generateWeeklyRecipes function:", error);
     const errorMessage = error instanceof Error ? error.message : String(error);

     // Provide a more specific error message for API key issues
     if (isApiKeyError(errorMessage)) {
         console.error("Potential API Key issue detected.");
          throw new Error(`生成每周食谱失败：无效的 Google AI API 密钥或身份验证错误。请检查 GOOGLE_API_KEY 环境变量并确保其正确且有效。原始错误: ${errorMessage}`);
     }

     // Check for model not found specifically
     if (errorMessage.includes('Model') && (errorMessage.includes('not found') || errorMessage.includes('NOT_FOUND'))) {
          const modelName = prompt.model?.name || '未知模型';
          console.error(`generateWeeklyRecipesPrompt 中指定的模型 ('${modelName}') 未找到或无效。`);
          throw new Error(`生成每周食谱失败：AI 模型未找到。${errorMessage}`);
     }

     // Re-throw other errors (in Chinese)
      throw new Error(`生成每周食谱失败: ${errorMessage}`);
   }
}

// Mapping for display in prompt (optional, but can help guide the model)
const daysOfWeekChineseMap: { [key: string]: string } = {
    Monday: "周一", Tuesday: "周二", Wednesday: "周三", Thursday: "周四", Friday: "周五", Saturday: "周六", Sunday: "周日"
};
// Updated map without Snack
const mealTypesChineseMap: { [key: string]: string } = {
    Breakfast: "早餐", Lunch: "午餐", Dinner: "晚餐"
};


const prompt = ai.definePrompt({
  name: 'generateWeeklyRecipesPrompt',
  // Use the 'googleai/' prefix and a stable, available model name.
  model: 'googleai/gemini-1.5-flash', // Ensure this model is correct and available
  input: { schema: GenerateWeeklyRecipesInputSchema },
  output: { schema: GenerateWeeklyRecipesOutputSchema },
  // Updated prompt to request Chinese output, use internal English day/meal names, and exclude snacks.
  prompt: `你是一位专业的膳食规划师和营养师。为从 {{weekStartDate}} 开始的一周生成大约 {{numberOfSuggestions}} 种多样化的食谱建议。将每个建议分配到特定的星期（${daysOfWeekInternal.join('/')}）和餐别（${mealTypesInternal.join('/')}）。**不要生成点心 (Snack) 的建议。** 输出语言必须为简体中文。

请考虑以下用户信息：
- 饮食需求：{{{dietaryNeeds}}}
- 食物偏好：{{{preferences}}} (请优先考虑中餐，因为用户偏爱中餐)
{{#if previousWeekRecipes}}
- 上周食谱（用于参考和营养平衡）：
{{{previousWeekRecipes}}}
{{/if}}
{{#if existingCurrentWeekRecipes}}
- 本周已计划的餐点（避免为这些时段提出建议，并补充它们）：
{{{existingCurrentWeekRecipes}}}
{{/if}}

**说明：**
1.  **分析：** 查看上周的餐点（如果提供）和本周已计划的餐点（如果提供）。
2.  **识别空缺：** 确定本周哪些日期/餐别时段是空的。
3.  **生成建议：** 创建 {{numberOfSuggestions}} 个符合用户饮食需求和偏好（特别是中餐）的餐点建议。优先填补已识别的空缺。确保多样性。**只生成早餐、午餐、晚餐的建议。**
4.  **分配日期/餐别：** 对于每个建议，分配一个有效的 'dayOfWeek'（必须是 ${daysOfWeekInternal.join(', ')} 中的一个）和一个有效的 'mealType'（必须是 ${mealTypesInternal.join(', ')} 中的一个）。请具体说明。
5.  **估算成分：** 对于每个建议，提供一份主要“成分”的合理清单，并附有以克为单位的估算“数量”（例如，[{ name: "鸡胸肉", quantity: 150 }, { name: "西兰花", quantity: 100 }]）。确保份量合理，且数量为正数（例如，大于0）。这对后续的营养估算至关重要。成分列表不能为空。**所有成分名称必须是简体中文。**
6.  **平衡：** 如果提供了上周的餐点，尝试建议能够补充或平衡上周营养状况的食谱（例如，如果上周肉类较多，建议更多素食选项）。
7.  **格式化输出：** 严格按照 'GenerateWeeklyRecipesOutputSchema' 格式提供输出。每个建议的食谱必须包含 'name'（中文）、'description'（中文）、'dayOfWeek'（英文）、'mealType'（英文）和一个 'ingredients' 数组，其中每个成分都有 'name'（中文）和正数 'quantity'。如果适用，请包含整体的 'notes'（中文）。
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
             throw new Error('AI 提示未能生成有效的输出结构。');
        }
        console.log("generateWeeklyRecipesPrompt parsed output:", output);
    } catch (aiError) {
       console.error("Error calling generateWeeklyRecipesPrompt:", aiError);
       const errorMessage = aiError instanceof Error ? aiError.message : String(aiError);

        // Check if it's an API key issue more specifically
        if (isApiKeyError(errorMessage)) {
             console.error("看起来 Google AI API 密钥无效或丢失。请检查 GOOGLE_API_KEY 环境变量。");
              // Throw a more specific error that the outer catch block can identify
              throw new Error(`AI 提示执行失败：无效的 Google AI API 密钥或身份验证错误。${errorMessage}`);
        }
        // Check for model not found error specifically
        if (errorMessage.includes('Model') && (errorMessage.includes('not found') || errorMessage.includes('NOT_FOUND'))) {
            // Ensure the model name logged matches the one used
            const modelName = prompt.model?.name || '未知模型';
            console.error(`generateWeeklyRecipesPrompt 中指定的模型 ('${modelName}') 未找到或无效。`);
             throw new Error(`AI 提示执行失败：模型未找到。${errorMessage}`);
        }
       // Throw generic AI error for other issues (in Chinese)
        throw new Error(`AI 提示执行失败: ${errorMessage}`);
    }


     // Validate AI output against Zod schema again for robustness, and provide fallbacks
     try {
       // Ensure GeneratedIngredientSchema is used within GeneratedRecipeSchema for validation
       const validatedOutput = GenerateWeeklyRecipesOutputSchema.parse(output);
       console.log("Validated AI output:", validatedOutput);

       // Map dayOfWeek and mealType back to Chinese for the final Recipe object if needed elsewhere,
       // but the core logic now relies on English enums from the schema.
       // This mapping step might not be strictly necessary if the UI handles the translation based on the English value.
       const translatedRecipes = validatedOutput.suggestedRecipes.map(recipe => ({
            ...recipe,
            // Assuming Recipe type expects Chinese day/meal strings
            // dayOfWeek: daysOfWeekChineseMap[recipe.dayOfWeek] || recipe.dayOfWeek,
            // mealType: mealTypesChineseMap[recipe.mealType] || recipe.mealType,
       }));


       // Return validated output directly (using English day/meal types as validated by Zod)
       // return validatedOutput;
        return { ...validatedOutput, suggestedRecipes: translatedRecipes };

     } catch (validationError) {
         console.error("AI output failed Zod validation:", validationError);
         console.warn("AI output that failed validation:", output); // Log the invalid structure

         // Attempt to salvage: Filter valid recipes and provide default notes
         const salvageableRecipes = (output?.suggestedRecipes || []).filter(recipe => {
            try {
                // Ensure generated ingredients are also validated using the updated schema
                GeneratedRecipeSchema.parse(recipe);
                return true;
            } catch (recipeValidationError) {
                console.warn(`Filtering out invalid suggested recipe: ${JSON.stringify(recipe)}. Error: ${recipeValidationError}`);
                return false;
            }
         });

          // Map salvaged recipes' day/meal types if needed
         const translatedSalvageableRecipes = salvageableRecipes.map(recipe => ({
             ...recipe,
             // dayOfWeek: daysOfWeekChineseMap[recipe.dayOfWeek] || recipe.dayOfWeek,
             // mealType: mealTypesChineseMap[recipe.mealType] || recipe.mealType,
         }));

          return {
              // suggestedRecipes: salvageableRecipes,
               suggestedRecipes: translatedSalvageableRecipes,
               notes: output?.notes || "AI 生成了食谱，但由于格式问题（尤其是成分或数量），某些食谱可能无效或不完整。"
          };
     }
  }
);

// Helper function to map internal English day/meal to Chinese for UI consistency
// (This assumes the Recipe type itself uses Chinese strings)
function mapRecipeToChineseDisplay(recipe: z.infer<typeof GeneratedRecipeSchema>): z.infer<typeof GeneratedRecipeSchema> {
     const mappedRecipe = { ...recipe };
     // Uncomment the following lines if your `Recipe` type definition in `src/types/recipe.ts`
     // actually requires Chinese strings for dayOfWeek and mealType.
     // mappedRecipe.dayOfWeek = daysOfWeekChineseMap[recipe.dayOfWeek] || recipe.dayOfWeek;
     // mappedRecipe.mealType = mealTypesChineseMap[recipe.mealType] || recipe.mealType;
     return mappedRecipe;
}

// Helper to ensure the final Recipe object matches the expected type structure, including translation
function convertGeneratedToRecipe(genRecipe: z.infer<typeof GeneratedRecipeSchema>, weekStartDate: string): Recipe {
     const recipeId = `recipe-gen-${Date.now()}-${Math.random().toString(16).slice(2)}`;
     // Use Chinese day/meal names based on the mapping
     const displayDay = daysOfWeekChineseMap[genRecipe.dayOfWeek] || genRecipe.dayOfWeek;
     const displayMeal = mealTypesChineseMap[genRecipe.mealType] || genRecipe.mealType;

     return {
         id: recipeId,
         name: genRecipe.name,
         description: genRecipe.description,
         ingredients: genRecipe.ingredients.map((ing, ingIndex) => ({
             id: `ingredient-gen-${recipeId}-${ingIndex}`,
             name: ing.name,
             quantity: ing.quantity,
         })),
         weekStartDate: weekStartDate,
         // Store the translated display values in the final Recipe object
         dayOfWeek: displayDay,
         mealType: displayMeal,
         calories: undefined,
         protein: undefined,
         fat: undefined,
         carbohydrates: undefined,
     };
}
