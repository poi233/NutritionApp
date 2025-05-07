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
  overallBalance: z.string().describe('An overall assessment of the nutritional balance of the analyzed recipes for the week, **in Chinese**.'), // Request Chinese output
  macroNutrientRatio: z.string().describe('An estimated ratio or description of macronutrients (protein, fat, carbohydrates) across the analyzed recipes, **in Chinese**.'), // Request Chinese output
  suggestions: z.array(z.string()).describe('Suggestions for improving the nutritional balance for the week, **in Chinese**.'), // Request Chinese output
});

const AnalyzeNutritionalBalanceOutputSchema = z.object({
  analyzedRecipes: z.array(AnalyzedRecipeSchema).describe('The analyzed recipes with their estimated nutritional information.'),
  nutritionalInsights: NutritionalInsightsSchema.describe('Overall nutritional insights and suggestions for the week based on the analyzed meals, **in Chinese**.'), // Request Chinese output
});

export type AnalyzeNutritionalBalanceOutput = z.infer<typeof AnalyzeNutritionalBalanceOutputSchema>;

// Helper function to check for common API key error messages
const isApiKeyError = (errorMessage: string): boolean => {
    const lowerCaseMessage = errorMessage.toLowerCase();
    return lowerCaseMessage.includes('api key not valid') ||
           lowerCaseMessage.includes('api_key_invalid') ||
           lowerCaseMessage.includes('invalid api key') ||
           lowerCaseMessage.includes('permission denied') || // Sometimes permission errors mask key issues
           lowerCaseMessage.includes('authentication failed');
};

export async function analyzeNutritionalBalance(input: AnalyzeNutritionalBalanceInput): Promise<AnalyzeNutritionalBalanceOutput> {
  // The flow execution might throw errors (e.g., API key issues, network problems)
  // We catch them here to prevent unhandled promise rejections.
  try {
      console.log("Entering analyzeNutritionalBalance function with input:", JSON.stringify(input, null, 2));
      const result = await analyzeNutritionalBalanceFlow(input);
      console.log("analyzeNutritionalBalanceFlow returned successfully.");
      return result;
  } catch (error) {
      console.error(`Error executing analyzeNutritionalBalance function for input: ${JSON.stringify(input, null, 2)}`, error);
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Provide a more specific error message for API key issues
      if (isApiKeyError(errorMessage)) {
          console.error("Potential API Key issue detected.");
          // Translate error message
           throw new Error(`分析营养平衡失败：无效的 Google AI API 密钥或身份验证错误。请检查 GOOGLE_API_KEY 环境变量并确保其正确且有效。原始错误: ${errorMessage}`);
      }

      // Check for model not found specifically
      if (errorMessage.includes('Model') && (errorMessage.includes('not found') || errorMessage.includes('NOT_FOUND'))) {
         const modelNameUsed = analyzeNutritionalBalancePromptModelName || '未知模型'; // Use the actual model name from the prompt
         console.error(`analyzeNutritionalBalancePrompt 中指定的模型 ('${modelNameUsed}') 未找到或无效。`);
         throw new Error(`分析营养平衡失败：AI 模型 ('${modelNameUsed}') 未找到。${errorMessage}`);
     }

      // Re-throw other errors (translated)
       throw new Error(`分析营养平衡失败: ${errorMessage}`);
  }
}

// Note: The prompt now receives recipe names with context
const analyzeNutritionalBalancePromptModelName = 'googleai/gemini-1.5-flash';
const analyzeNutritionalBalancePrompt = ai.definePrompt({
  name: 'analyzeNutritionalBalancePrompt',
  // Use the 'googleai/' prefix and a stable model name.
  model: analyzeNutritionalBalancePromptModelName,
  // Pass the calculated nutritional data along with the original input structure to the prompt
  input: { schema: z.object({
      calculatedNutrition: z.array(AnalyzedRecipeSchema).describe("Pre-calculated nutritional breakdown for each recipe."),
      originalInput: AnalyzeNutritionalBalanceInputSchema.describe("Original input recipes and ingredients for context."),
  }) },
  output: { schema: AnalyzeNutritionalBalanceOutputSchema },
  // Updated prompt to explicitly request Chinese output for insights
  prompt: `根据以下餐点及其估算的营养信息，分析本周的整体营养平衡。提供针对整个星期的见解和建议。**输出语言必须为简体中文。**

**每餐估算营养：**
{{#each calculatedNutrition}}
  - {{this.name}}: 卡路里: {{this.totalCalories}}千卡, 蛋白质: {{this.totalProtein}}克, 脂肪: {{this.totalFat}}克, 碳水化合物: {{this.totalCarbohydrates}}克
{{/each}}

**原始食谱详情（供参考）：**
{{#each originalInput.recipes}}
  食谱: {{this.name}}
  成分:
  {{#each this.ingredients}}
    - {{this.name}} ({{this.quantity}}克)
  {{/each}}
{{/each}}

**分析任务（使用简体中文回答）：**
基于*仅*上面提供的餐点：
1.  **整体平衡 (Overall Balance):** 评估这些餐点所代表的一周的整体营养平衡。是否多样化？在某些方面是否显得过高/过低？
2.  **宏量营养素比例 (Macronutrient Ratio):** 描述这些餐点中估算的宏量营养素分布（来自蛋白质、脂肪、碳水化合物的卡路里）。
3.  **建议 (Suggestions):** 提供 2-3 条可行的建议，以改善*类似这样一周*的营养平衡（例如，“考虑增加富含纤维的零食”，“在蛋白质较少的日子里，午餐搭配健康的脂肪来源”）。

请按照指定的格式输出结果，重点关注 'nutritionalInsights' 部分。输出中的 'analyzedRecipes' 字段应镜像输入中提供的 'calculatedNutrition'。**所有文本输出（overallBalance, macroNutrientRatio, suggestions）必须是简体中文。**`,
});


const analyzeNutritionalBalanceFlow = ai.defineFlow(
  {
    name: 'analyzeNutritionalBalanceFlow',
    inputSchema: AnalyzeNutritionalBalanceInputSchema, // Flow input is still the original list of recipes
    outputSchema: AnalyzeNutritionalBalanceOutputSchema,
  },
  async input => {
    console.log("Entering analyzeNutritionalBalanceFlow with input:", JSON.stringify(input, null, 2));
    try {
        // 1. Calculate nutrition for each recipe first
        console.log("Calculating nutrition for recipes...");
        const calculatedNutritionPromises = input.recipes.map(async recipe => {
           let totalCalories = 0;
           let totalProtein = 0;
           let totalFat = 0;
           let totalCarbohydrates = 0;

           // Ensure ingredients array exists before iterating
           if (!Array.isArray(recipe.ingredients)) {
                console.warn(`Recipe "${recipe.name}" has missing or invalid ingredients array. Skipping nutrition calculation for this recipe.`);
                return {
                    name: recipe.name, // Still return the name
                    totalCalories: 0,
                    totalProtein: 0,
                    totalFat: 0,
                    totalCarbohydrates: 0,
                };
           }

           for (const ingredient of recipe.ingredients) {
              try {
                 // Validate ingredient structure
                 if (!ingredient || typeof ingredient.name !== 'string' || typeof ingredient.quantity !== 'number' || ingredient.quantity <= 0) {
                     console.warn(`Invalid ingredient structure or quantity in recipe "${recipe.name}":`, ingredient);
                     continue; // Skip this invalid ingredient
                 }
                 // console.log(`Fetching nutrition for ingredient: ${ingredient.name}`); // Verbose logging
                 const nutrition = await getNutrition(ingredient.name);
                 const factor = ingredient.quantity / 100; // Assuming nutrition data is per 100g

                 totalCalories += (nutrition.calories || 0) * factor;
                 totalProtein += (nutrition.protein || 0) * factor;
                 totalFat += (nutrition.fat || 0) * factor;
                 totalCarbohydrates += (nutrition.carbohydrates || 0) * factor;
               } catch (error) {
                    // Log specific ingredient error but continue calculation
                    console.warn(`Could not get nutrition for ingredient "${ingredient.name}" (Quantity: ${ingredient.quantity}) in recipe "${recipe.name}" during analysis calculation:`, error);
                }
           }

           return {
             name: recipe.name, // Use the contextual name provided in input
             totalCalories: parseFloat(totalCalories.toFixed(0)),
             totalProtein: parseFloat(totalProtein.toFixed(1)),
             totalFat: parseFloat(totalFat.toFixed(1)),
             totalCarbohydrates: parseFloat(totalCarbohydrates.toFixed(1)),
           };
         });

        const calculatedNutrition = await Promise.all(calculatedNutritionPromises);
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
                  // Translate error message
                  throw new Error('AI 提示未能生成有效的输出结构。');
            }
             console.log("analyzeNutritionalBalancePrompt parsed output:", output);

             // Additional validation: Check if the output structure is as expected
             if (!output.nutritionalInsights || !Array.isArray(output.analyzedRecipes)) {
                 console.error('AI output structure is missing required fields (nutritionalInsights or analyzedRecipes). Output received:', output);
                  throw new Error('AI 返回的数据结构不完整或无效。');
             }

        } catch (aiError) {
            console.error("Error calling analyzeNutritionalBalancePrompt:", aiError);
            const errorMessage = aiError instanceof Error ? aiError.message : String(aiError);

             // Check if it's an API key issue more specifically
            if (isApiKeyError(errorMessage)) {
                 console.error("看起来 Google AI API 密钥无效或丢失。请检查 GOOGLE_API_KEY 环境变量。");
                 // Throw a more specific error that the outer catch block can identify (translated)
                  throw new Error(`AI 提示执行失败：无效的 Google AI API 密钥或身份验证错误。${errorMessage}`);
            }
            // Check for model not found error specifically
            if (errorMessage.includes('Model') && (errorMessage.includes('not found') || errorMessage.includes('NOT_FOUND'))) {
               // Ensure model name logged matches the one used
               const modelName = analyzeNutritionalBalancePromptModelName || '未知模型'; // Use the predefined model name
               console.error(`analyzeNutritionalBalancePrompt 中指定的模型 ('${modelName}') 未找到或无效。`);
                // Translate error message
                throw new Error(`AI 提示执行失败：模型 ('${modelName}') 未找到。${errorMessage}`);
            }
            // Throw generic AI error for other issues (translated)
             throw new Error(`AI 提示执行失败: ${errorMessage}`);
        }

        // 4. Return the result. Ensure the structure matches the schema.
        // Use our calculatedNutrition as the source of truth for the breakdown.
        // The AI might reformat or slightly alter values, leading to discrepancies.
        // We primarily want the AI's textual insights.
        const finalAnalyzedRecipes = calculatedNutrition; // Use our calculation

        // Ensure insights object exists, provide a default if AI failed to generate it but didn't throw
         const finalInsights = output.nutritionalInsights || {
              // Translate default messages
              overallBalance: "分析无法确定整体平衡。",
              macroNutrientRatio: "分析无法确定宏量营养素比例。",
              suggestions: ["由于分析问题，无建议可用。"]
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
