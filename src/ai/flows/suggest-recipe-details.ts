'use server';
/**
 * @fileOverview Suggests a description and ingredients for a given meal name using AI.
 *
 * - suggestRecipeDetails - A function that handles suggesting recipe details.
 * - SuggestRecipeDetailsInput - The input type for the suggestRecipeDetails function.
 * - SuggestRecipeDetailsOutput - The return type for the suggestRecipeDetails function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const SuggestRecipeDetailsInputSchema = z.object({
  mealName: z.string().min(1, "Meal name cannot be empty.").describe('The name of the meal to get details for (e.g., "宫保鸡丁").'),
});
export type SuggestRecipeDetailsInput = z.infer<typeof SuggestRecipeDetailsInputSchema>;

const SuggestedIngredientSchema = z.object({
  name: z.string().describe('Ingredient name, in Chinese.'),
  quantity: z.coerce
    .number({ invalid_type_error: "数量必须是数字" })
    .min(0.1, "数量必须是大于零的正数")
    // .positive("数量必须是正数") // Removed to avoid exclusiveMinimum error
    .describe('Estimated quantity in grams (e.g., 150).'),
});

const SuggestRecipeDetailsOutputSchema = z.object({
  description: z.string().describe('A suggested brief description for the meal, in Chinese.'),
  ingredients: z.array(SuggestedIngredientSchema).min(1).describe('A list of suggested common ingredients and their estimated quantities in grams for this meal. Ingredient names should be in Chinese.'),
});
export type SuggestRecipeDetailsOutput = z.infer<typeof SuggestRecipeDetailsOutputSchema>;

const isApiKeyError = (errorMessage: string): boolean => {
  const lowerCaseMessage = errorMessage.toLowerCase();
  return lowerCaseMessage.includes('api key not valid') ||
         lowerCaseMessage.includes('api_key_invalid') ||
         lowerCaseMessage.includes('invalid api key') ||
         lowerCaseMessage.includes('permission denied') ||
         lowerCaseMessage.includes('authentication failed');
};

export async function suggestRecipeDetails(input: SuggestRecipeDetailsInput): Promise<SuggestRecipeDetailsOutput> {
  try {
    console.log("Entering suggestRecipeDetails function with input:", JSON.stringify(input, null, 2));
    const result = await suggestRecipeDetailsFlow(input);
    console.log("suggestRecipeDetailsFlow returned successfully.");
    return result;
  } catch (error) {
    console.error(`Error executing suggestRecipeDetails function for input: ${JSON.stringify(input, null, 2)}`, error);
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (isApiKeyError(errorMessage)) {
      console.error("Potential API Key issue detected.");
      throw new Error(`获取餐点详情失败：无效的 Google AI API 密钥或身份验证错误。请检查 GOOGLE_API_KEY 环境变量。原始错误: ${errorMessage}`);
    }
    if (errorMessage.includes('Model') && (errorMessage.includes('not found') || errorMessage.includes('NOT_FOUND'))) {
      const modelNameUsed = 'googleai/gemini-1.5-flash';
      console.error(`suggestRecipeDetailsPrompt 中指定的模型 ('${modelNameUsed}') 未找到或无效。`);
      throw new Error(`获取餐点详情失败：AI 模型 ('${modelNameUsed}') 未找到。${errorMessage}`);
    }
     if (error instanceof z.ZodError) {
      console.error("AI output failed Zod validation:", error.issues);
      throw new Error(`获取餐点详情失败：AI 返回的数据格式无效或不完整。模式验证错误: ${error.message}`);
    }
    if (errorMessage.includes('Invalid JSON payload') || errorMessage.includes('response_schema') || errorMessage.includes("exclusiveMinimum")) {
      console.error("AI 返回了无效的 JSON 结构或模式定义问题。错误详情:", errorMessage);
      throw new Error(`AI 提示执行失败：AI 返回的数据格式无效或模式过于复杂。${errorMessage}`);
    }
    throw new Error(`获取餐点详情失败: ${errorMessage}`);
  }
}

const prompt = ai.definePrompt({
  name: 'suggestRecipeDetailsPrompt',
  model: 'googleai/gemini-1.5-flash',
  input: { schema: SuggestRecipeDetailsInputSchema },
  output: { schema: SuggestRecipeDetailsOutputSchema },
  prompt: `根据提供的餐点名称，请提供一份简短的描述和一份常见的估计配料清单（包括以克为单位的数量）。所有文本输出（描述、配料名称）都必须是简体中文。

餐点名称：{{{mealName}}}

请严格按照以下格式提供输出：
- 'description': 餐点的中文描述。
- 'ingredients': 一个包含配料对象（每个对象都有 'name' [中文] 和 'quantity' [克，正数且大于0.09]）的数组。确保配料表至少包含一种配料，且数量大于0.09克。
`,
});

const suggestRecipeDetailsFlow = ai.defineFlow(
  {
    name: 'suggestRecipeDetailsFlow',
    inputSchema: SuggestRecipeDetailsInputSchema,
    outputSchema: SuggestRecipeDetailsOutputSchema,
  },
  async (input) => {
    console.log("Entering suggestRecipeDetailsFlow with input:", JSON.stringify(input, null, 2));
    try {
      const { output } = await prompt(input);
      if (!output) {
        console.error('suggestRecipeDetailsPrompt returned null or undefined output.');
        throw new Error('AI 提示未能生成有效的输出结构。');
      }
      console.log("suggestRecipeDetailsPrompt parsed output:", JSON.stringify(output, null, 2));

      // Validate output again here for robustness, especially array lengths or specific constraints
      // For example, ensure ingredients is not empty if the schema demands it.
      if (!output.ingredients || output.ingredients.length === 0) {
          console.error('AI output is missing ingredients or ingredients array is empty. Output:', output);
          throw new Error('AI 未能提供配料信息。');
      }
       output.ingredients.forEach(ing => {
         if (ing.quantity <= 0) { // Technically .min(0.1) covers this, but good to be explicit if AI doesn't follow strictly
           throw new Error(`AI 提供的配料 "${ing.name}" 数量无效 (${ing.quantity})。数量必须为正。`);
         }
       });


      return output;
    } catch (aiError) {
      console.error("Error calling suggestRecipeDetailsPrompt:", aiError);
      const errorMessage = aiError instanceof Error ? aiError.message : String(aiError);
      if (isApiKeyError(errorMessage)) {
        throw new Error(`AI 提示执行失败：无效的 Google AI API 密钥。${errorMessage}`);
      }
      if (errorMessage.includes('Model') && (errorMessage.includes('not found') || errorMessage.includes('NOT_FOUND'))) {
        throw new Error(`AI 提示执行失败：模型未找到。${errorMessage}`);
      }
      if (aiError instanceof z.ZodError) {
        throw new Error(`AI 返回数据格式校验失败: ${aiError.message}`);
      }
      if (errorMessage.includes('Invalid JSON payload') || errorMessage.includes('response_schema') || errorMessage.includes("exclusiveMinimum")) {
         throw new Error(`AI 提示执行失败：AI 返回的数据格式无效或模式过于复杂。${errorMessage}`);
      }
      throw new Error(`AI 提示执行失败: ${errorMessage}`);
    }
  }
);

