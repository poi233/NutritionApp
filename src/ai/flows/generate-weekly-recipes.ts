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
  // Updated validation: must be a number greater than 0.
  // Using .min(0.1) instead of .positive() to avoid 'exclusiveMinimum' in schema.
  quantity: z.coerce // Coerce input to number
    .number({ invalid_type_error: "数量必须是数字" }) // "Quantity must be a number"
    .min(0.1, "数量必须是大于零的正数"), // "Quantity must be a positive number greater than 0"
});

const GeneratedRecipeSchema = z.object({
    name: z.string().describe('The name of the generated recipe suggestion, in Chinese.'), // Specify Chinese name
    description: z.string().describe('A brief description of the recipe, in Chinese.'), // Specify Chinese description
    // Validate against internal English values
    dayOfWeek: z.enum(daysOfWeekInternal as [string, ...string[]]).describe('The suggested day of the week for this meal (must be one of Monday, Tuesday, etc.).'),
    // Updated meal type enum without Snack
    mealType: z.enum(mealTypesInternal as [string, ...string[]]).describe('The suggested meal type for this meal (must be one of Breakfast, Lunch, Dinner).'),
    // Generate estimated ingredients using the updated schema
    ingredients: z.array(GeneratedIngredientSchema).min(1).describe('An estimated list of ingredients with quantities in grams for this recipe. Quantity must be positive and greater than 0.'),
});


// Input schema: Removed numberOfSuggestions as we now aim for a full week
const GenerateWeeklyRecipesInputSchema = z.object({
  weekStartDate: z.string().describe('The start date of the week for which to generate recipes (ISO format: yyyy-MM-dd).'),
  dietaryNeeds: z.string().optional().describe('The dietary needs of the user (e.g., vegetarian, gluten-free).'),
  preferences: z.string().optional().describe('The food preferences of the user (e.g., Chinese food, Italian, spicy).'), // Added Chinese food example
  previousWeekRecipes: z.string().optional().describe('A summary of recipes from the previous week, used for context and nutritional balancing (format: "Day: [Day Name], Meal: [Meal Type], Recipe: [Recipe Name]").'),
  existingCurrentWeekRecipes: z.string().optional().describe('A summary of recipes already planned for the current week, to avoid duplicates and fill gaps (same format as previousWeekRecipes).'),
});
export type GenerateWeeklyRecipesInput = z.infer<typeof GenerateWeeklyRecipesInputSchema>;


// Output Schema: Use the updated GeneratedRecipeSchema which expects Chinese names/descriptions
const GenerateWeeklyRecipesOutputSchema = z.object({
  // Expect exactly 21 recipes (3 meals * 7 days)
  suggestedRecipes: z.array(GeneratedRecipeSchema).length(21, "需要提供完整的每周21餐建议").describe('A list of 21 suggested recipes with their assigned day, meal type, and estimated ingredients for the specified week (one for each Breakfast, Lunch, Dinner slot from Monday to Sunday). Recipe names and descriptions should be in Chinese.'),
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
          const modelNameUsed = prompt.model?.name || '未知模型'; // Use the actual model name from the prompt
          console.error(`generateWeeklyRecipesPrompt 中指定的模型 ('${modelNameUsed}') 未找到或无效。`);
          throw new Error(`生成每周食谱失败：AI 模型 ('${modelNameUsed}') 未找到。${errorMessage}`);
     }

      // Check for schema validation error (like length mismatch)
     if (error instanceof z.ZodError) {
         console.error("AI output failed Zod validation:", error.issues);
         throw new Error(`生成每周食谱失败：AI 返回的数据格式无效或不完整。模式验证错误: ${error.message}`);
     }
      if (errorMessage.includes('Invalid JSON payload') || errorMessage.includes('response_schema')) {
           console.error("AI 返回了无效的 JSON 结构，与 Zod 模式不匹配。请检查 Zod 模式定义和 AI 提示中的输出要求。错误详情:", errorMessage);
           throw new Error(`AI 提示执行失败：AI 返回的数据格式无效。${errorMessage}`);
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
  model: 'googleai/gemini-1.5-flash',
  input: { schema: GenerateWeeklyRecipesInputSchema },
  output: { schema: GenerateWeeklyRecipesOutputSchema },
  // Updated prompt to request Chinese output, use internal English day/meal names, and exclude snacks.
  // Explicitly request a recipe for EVERY meal slot (21 total).
  prompt: `你是一位专业的膳食规划师和营养师。为从 {{weekStartDate}} 开始的一周生成一个完整的每周食谱计划。**目标是为周一至周日的每一餐（早餐、午餐、晚餐）提供一个具体的食谱建议，总共 21 个食谱。** 输出语言必须为简体中文。

请考虑以下用户信息：
- 饮食需求：{{{dietaryNeeds}}}
- 食物偏好：{{{preferences}}} (请优先考虑中餐，因为用户偏爱中餐)
{{#if previousWeekRecipes}}
- 上周食谱（用于参考和营养平衡）：
{{{previousWeekRecipes}}}
{{/if}}
{{#if existingCurrentWeekRecipes}}
- 本周已计划的餐点（请避免在这些时段生成重复建议，但仍需为所有 21 个时段提供建议，可以替换已有的）：
{{{existingCurrentWeekRecipes}}}
{{/if}}

**说明：**
1.  **全覆盖生成：** 创建 **总共 21 个** 符合用户饮食需求和偏好（特别是中餐）的餐点建议。确保每个建议都分配到周一至周日的一个特定餐别时段（早餐、午餐 或 晚餐）。**每个时段必须有一个建议，不得遗漏。**
2.  **多样性与平衡：** 确保这 21 个建议具有多样性，并考虑营养平衡。如果提供了上周的餐点，尝试建议能够补充或平衡上周营养状况的食谱。
3.  **分配日期/餐别：** 对于每个建议，**分配一个具体且有效的 'dayOfWeek'**（必须是 ${daysOfWeekInternal.join(', ')} 中的一个）**和一个具体且有效的 'mealType'**（必须是 ${mealTypesInternal.join(', ')} 中的一个）。**确保最终输出包含所有 7 天 x 3 餐 = 21 个独特的日期/餐别组合。**
4.  **估算成分：** 对于每个建议，提供一份主要“成分”的合理清单，并附有以克为单位的估算“数量”（例如，[{ name: "鸡胸肉", quantity: 150 }, { name: "西兰花", quantity: 100 }]）。确保份量合理，且数量为正数且大于 0（例如，0.1克或更多）。这对后续的营养估算至关重要。成分列表不能为空。**所有成分名称必须是简体中文。**
5.  **格式化输出：** 严格按照 'GenerateWeeklyRecipesOutputSchema' 格式提供输出。**最终的 'suggestedRecipes' 数组必须包含正好 21 个食谱对象。** 每个建议的食谱必须包含 'name'（中文）、'description'（中文）、'dayOfWeek'（英文）、'mealType'（英文）和一个 'ingredients' 数组，其中每个成分都有 'name'（中文）和正数 'quantity'。如果适用，请包含整体的 'notes'（中文）。
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

        // Explicitly check if the output has the required 21 recipes AFTER getting the result.
        if (!output.suggestedRecipes || output.suggestedRecipes.length !== 21) {
            console.error(`AI did not return exactly 21 recipes. Received: ${output.suggestedRecipes?.length || 0}`);
            throw new Error(`AI未能生成完整的每周21餐计划。收到的建议数量：${output.suggestedRecipes?.length || 0}`);
        }


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
            const modelNameUsed = prompt.model?.name || '未知模型'; // Use the actual model name from the prompt
            console.error(`generateWeeklyRecipesPrompt 中指定的模型 ('${modelNameUsed}') 未找到或无效。`);
             throw new Error(`AI 提示执行失败：模型 ('${modelNameUsed}') 未找到。${errorMessage}`);
        }
        // Check for schema validation error from API (like exclusiveMinimum or length)
        if (errorMessage.includes('Invalid JSON payload') && errorMessage.includes('generation_config.response_schema')) {
            console.error("AI 返回了无效的 JSON 结构，与 Zod 模式不匹配。请检查 Zod 模式定义和 AI 提示中的输出要求。错误详情:", errorMessage);
            throw new Error(`AI 提示执行失败：AI 返回的数据格式无效。${errorMessage}`);
        }

       // Throw generic AI error for other issues (in Chinese)
        throw new Error(`AI 提示执行失败: ${errorMessage}`);
    }


     // Validate AI output against Zod schema again for robustness, focusing on the length requirement.
     try {
       // Ensure GenerateWeeklyRecipesOutputSchema checks for length 21
       const validatedOutput = GenerateWeeklyRecipesOutputSchema.parse(output);
       console.log("Validated AI output (21 recipes expected):", validatedOutput);

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
         if (validationError instanceof z.ZodError) {
             console.error("AI output failed Zod validation:", validationError.issues);
             // Check specifically for length error
             const lengthIssue = validationError.issues.find(issue => issue.code === z.ZodIssueCode.too_small || issue.code === z.ZodIssueCode.too_big);
              if (lengthIssue && lengthIssue.path.includes('suggestedRecipes')) {
                 throw new Error(`AI未能生成完整的每周21餐计划。模式验证失败: ${lengthIssue.message}`);
             }
              throw new Error(`AI 输出未通过 Zod 验证: ${validationError.message}`);
         } else {
              console.error("Unknown validation error:", validationError);
              throw new Error("验证 AI 输出时发生未知错误。");
         }
          console.warn("AI output that failed validation:", output); // Log the invalid structure

         // Attempt to salvage - NOT IDEAL if length is the issue, better to throw.
          // Consider if you want fallback behavior or always require 21 recipes.
          // Returning partial data here might be confusing. For now, let the error propagate.
          // throw new Error("AI 生成的食谱数量不正确或格式无效。");

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


    


