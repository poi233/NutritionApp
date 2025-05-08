
/**
 * Represents an aggregated ingredient with its total quantity.
 */
export interface AggregatedIngredient {
  name: string;
  totalQuantity: number; // in grams
}

// Placeholder for a more sophisticated pricing model or API call
const MOCK_PRICE_PER_GRAM: { [key: string]: number } = {
  // Prices in currency units per gram. Example: 0.02 currency units per gram of Chicken Breast
  "鸡胸肉": 0.02,
  "鸡腿肉": 0.018,
  "牛肉": 0.03,
  "猪肉": 0.015,
  "鱼": 0.025,
  "虾": 0.04,
  "鸡蛋": 0.005, // Assuming ~50g per egg, so 0.25 per egg / 50g
  "豆腐": 0.008,
  "西兰花": 0.01,
  "胡萝卜": 0.005,
  "土豆": 0.003,
  "洋葱": 0.004,
  "大蒜": 0.015,
  "姜": 0.012,
  "西红柿": 0.006,
  "黄瓜": 0.005,
  "生菜": 0.007,
  "菠菜": 0.009,
  "蘑菇": 0.018,
  "青椒": 0.007,
  "米饭": 0.002,
  "面条": 0.003,
  "面包": 0.004,
  "牛奶": 0.0015, // per ml, assuming 1g approx 1ml for milk
  "酸奶": 0.002,
  "奶酪": 0.03,
  "苹果": 0.006,
  "香蕉": 0.005,
  "橙子": 0.007,
  "草莓": 0.02,
  "蓝莓": 0.03,
  "橄榄油": 0.02,
  "酱油": 0.005,
  "盐": 0.001,
  "糖": 0.002,
  "胡椒": 0.03,
  // Add more ingredients with their estimated prices
  "白菜": 0.004,
  "青菜": 0.005,
  "茄子": 0.006,
  "豆芽": 0.003,
  "玉米": 0.005,
  "花生": 0.01,
  "芝麻": 0.02,
  "香菜": 0.015,
  "葱": 0.008,
  "料酒": 0.003,
  "醋": 0.002,
  "淀粉": 0.002,
  "香菇": 0.02,
  "木耳": 0.025,
  "海带": 0.01,
  "紫菜": 0.03,
  "辣椒": 0.01,
  "花椒": 0.04,
  "八角": 0.05,
  "桂皮": 0.06,
};

const DEFAULT_PRICE_PER_GRAM = 0.01; // Fallback price for unlisted items

/**
 * Asynchronously estimates the total price for a list of aggregated ingredients.
 * This is a placeholder and should be replaced with a real pricing API or more complex logic.
 *
 * @param ingredients A list of aggregated ingredients with their names and total quantities in grams.
 * @returns A promise that resolves to the total estimated price.
 */
export async function estimateTotalPriceForIngredients(
  ingredients: AggregatedIngredient[]
): Promise<number> {
  // Simulate an async operation
  await new Promise(resolve => setTimeout(resolve, 500)); // 0.5 second delay

  let totalPrice = 0;

  for (const item of ingredients) {
    const pricePerGram = MOCK_PRICE_PER_GRAM[item.name] || DEFAULT_PRICE_PER_GRAM;
    totalPrice += item.totalQuantity * pricePerGram;
  }

  // Randomly return an error 5% of the time to simulate API failure for testing
  // if (Math.random() < 0.05) {
  //   throw new Error("Simulated API error: Could not fetch prices.");
  // }

  return parseFloat(totalPrice.toFixed(2));
}
