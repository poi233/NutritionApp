import type { AggregatedIngredient } from "@/services/pricing";

export const INGREDIENT_CATEGORIES_ORDERED = [
  "主食 (Staples)",
  "肉类和蛋白质 (Meats & Proteins)",
  "蔬菜 (Vegetables)",
  "水果 (Fruits)",
  "乳制品和替代品 (Dairy & Alternatives)",
  "调味品和香料 (Condiments & Spices)",
  "其他 (Others)",
] as const;

export type IngredientCategory = typeof INGREDIENT_CATEGORIES_ORDERED[number];

// Simple mapping for common ingredients to categories.
// This should be expanded for better accuracy.
const ingredientToCategoryMap: Record<string, IngredientCategory> = {
  // 主食 (Staples)
  "米饭": "主食 (Staples)",
  "面条": "主食 (Staples)",
  "面包": "主食 (Staples)",
  "土豆": "主食 (Staples)",
  "玉米": "主食 (Staples)",
  "馒头": "主食 (Staples)",
  "包子": "主食 (Staples)",
  "饺子": "主食 (Staples)",
  "意面": "主食 (Staples)",
  "燕麦": "主食 (Staples)",
  "粉条": "主食 (Staples)",
  "米粉": "主食 (Staples)",
  "粥": "主食 (Staples)",

  // 肉类和蛋白质 (Meats & Proteins)
  "鸡胸肉": "肉类和蛋白质 (Meats & Proteins)",
  "鸡肉": "肉类和蛋白质 (Meats & Proteins)",
  "鸡腿肉": "肉类和蛋白质 (Meats & Proteins)",
  "牛肉": "肉类和蛋白质 (Meats & Proteins)",
  "猪肉": "肉类和蛋白质 (Meats & Proteins)",
  "鱼": "肉类和蛋白质 (Meats & Proteins)",
  "虾": "肉类和蛋白质 (Meats & Proteins)",
  "鸡蛋": "肉类和蛋白质 (Meats & Proteins)",
  "豆腐": "肉类和蛋白质 (Meats & Proteins)",
  "豆干": "肉类和蛋白质 (Meats & Proteins)",
  "豆皮": "肉类和蛋白质 (Meats & Proteins)",
  "培根": "肉类和蛋白质 (Meats & Proteins)",
  "香肠": "肉类和蛋白质 (Meats & Proteins)",
  "三文鱼": "肉类和蛋白质 (Meats & Proteins)",
  "鳕鱼": "肉类和蛋白质 (Meats & Proteins)",
  "羊肉": "肉类和蛋白质 (Meats & Proteins)",
  "鸭肉": "肉类和蛋白质 (Meats & Proteins)",

  // 蔬菜 (Vegetables)
  "西兰花": "蔬菜 (Vegetables)",
  "胡萝卜": "蔬菜 (Vegetables)",
  "洋葱": "蔬菜 (Vegetables)",
  "西红柿": "蔬菜 (Vegetables)",
  "番茄": "蔬菜 (Vegetables)",
  "黄瓜": "蔬菜 (Vegetables)",
  "生菜": "蔬菜 (Vegetables)",
  "菠菜": "蔬菜 (Vegetables)",
  "蘑菇": "蔬菜 (Vegetables)",
  "青椒": "蔬菜 (Vegetables)",
  "白菜": "蔬菜 (Vegetables)",
  "大白菜": "蔬菜 (Vegetables)",
  "小白菜": "蔬菜 (Vegetables)",
  "青菜": "蔬菜 (Vegetables)",
  "上海青": "蔬菜 (Vegetables)",
  "茄子": "蔬菜 (Vegetables)",
  "豆芽": "蔬菜 (Vegetables)",
  "香菇": "蔬菜 (Vegetables)",
  "木耳": "蔬菜 (Vegetables)",
  "海带": "蔬菜 (Vegetables)",
  "芹菜": "蔬菜 (Vegetables)",
  "南瓜": "蔬菜 (Vegetables)",
  "冬瓜": "蔬菜 (Vegetables)",
  "苦瓜": "蔬菜 (Vegetables)",
  "莲藕": "蔬菜 (Vegetables)",
  "蒜苔": "蔬菜 (Vegetables)",
  "韭菜": "蔬菜 (Vegetables)",
  "金针菇": "蔬菜 (Vegetables)",
  "油麦菜": "蔬菜 (Vegetables)",
  "娃娃菜": "蔬菜 (Vegetables)",
  "萝卜": "蔬菜 (Vegetables)",
  "白萝卜": "蔬菜 (Vegetables)",
  "青萝卜": "蔬菜 (Vegetables)",
  "芦笋": "蔬菜 (Vegetables)",
  "四季豆": "蔬菜 (Vegetables)",
  "豌豆": "蔬菜 (Vegetables)",
  "毛豆": "蔬菜 (Vegetables)",

  // 水果 (Fruits)
  "苹果": "水果 (Fruits)",
  "香蕉": "水果 (Fruits)",
  "橙子": "水果 (Fruits)",
  "草莓": "水果 (Fruits)",
  "蓝莓": "水果 (Fruits)",
  "葡萄": "水果 (Fruits)",
  "西瓜": "水果 (Fruits)",
  "芒果": "水果 (Fruits)",
  "梨": "水果 (Fruits)",
  "桃子": "水果 (Fruits)",
  "樱桃": "水果 (Fruits)",

  // 乳制品和替代品 (Dairy & Alternatives)
  "牛奶": "乳制品和替代品 (Dairy & Alternatives)",
  "酸奶": "乳制品和替代品 (Dairy & Alternatives)",
  "奶酪": "乳制品和替代品 (Dairy & Alternatives)",
  "豆浆": "乳制品和替代品 (Dairy & Alternatives)",
  "黄油": "乳制品和替代品 (Dairy & Alternatives)",

  // 调味品和香料 (Condiments & Spices)
  "大蒜": "调味品和香料 (Condiments & Spices)",
  "蒜": "调味品和香料 (Condiments & Spices)",
  "姜": "调味品和香料 (Condiments & Spices)",
  "橄榄油": "调味品和香料 (Condiments & Spices)",
  "食用油": "调味品和香料 (Condiments & Spices)",
  "酱油": "调味品和香料 (Condiments & Spices)",
  "盐": "调味品和香料 (Condiments & Spices)",
  "糖": "调味品和香料 (Condiments & Spices)",
  "胡椒": "调味品和香料 (Condiments & Spices)",
  "黑胡椒": "调味品和香料 (Condiments & Spices)",
  "白胡椒": "调味品和香料 (Condiments & Spices)",
  "香菜": "调味品和香料 (Condiments & Spices)",
  "葱": "调味品和香料 (Condiments & Spices)",
  "小葱": "调味品和香料 (Condiments & Spices)",
  "大葱": "调味品和香料 (Condiments & Spices)",
  "料酒": "调味品和香料 (Condiments & Spices)",
  "醋": "调味品和香料 (Condiments & Spices)",
  "米醋": "调味品和香料 (Condiments & Spices)",
  "陈醋": "调味品和香料 (Condiments & Spices)",
  "淀粉": "调味品和香料 (Condiments & Spices)",
  "辣椒": "调味品和香料 (Condiments & Spices)",
  "干辣椒": "调味品和香料 (Condiments & Spices)",
  "辣椒粉": "调味品和香料 (Condiments & Spices)",
  "花椒": "调味品和香料 (Condiments & Spices)",
  "八角": "调味品和香料 (Condiments & Spices)",
  "桂皮": "调味品和香料 (Condiments & Spices)",
  "蚝油": "调味品和香料 (Condiments & Spices)",
  "番茄酱": "调味品和香料 (Condiments & Spices)",
  "芝麻油": "调味品和香料 (Condiments & Spices)",
  "香油": "调味品和香料 (Condiments & Spices)",
  "孜然": "调味品和香料 (Condiments & Spices)",
  "五香粉": "调味品和香料 (Condiments & Spices)",
  "酱": "调味品和香料 (Condiments & Spices)", // Generic sauce

  // 其他 (Others)
  "花生": "其他 (Others)",
  "芝麻": "其他 (Others)",
  "紫菜": "其他 (Others)",
  "水": "其他 (Others)",
  "茶叶": "其他 (Others)",
  "咖啡": "其他 (Others)",
  "蜂蜜": "其他 (Others)",
  "坚果": "其他 (Others)",
  "核桃": "其他 (Others)",
  "腰果": "其他 (Others)",
};

export function getIngredientCategory(ingredientName: string): IngredientCategory {
  const trimmedName = ingredientName.trim();
  // Try direct match
  if (ingredientToCategoryMap[trimmedName]) {
    return ingredientToCategoryMap[trimmedName];
  }
  // Try partial match (e.g., "鸡胸" in "鸡胸肉") - longer keys first for specificity
  const sortedKeys = Object.keys(ingredientToCategoryMap).sort((a, b) => b.length - a.length);
  for (const key of sortedKeys) {
    if (trimmedName.includes(key)) { // If "鸡胸肉" includes "鸡胸" or "肉"
      return ingredientToCategoryMap[key];
    }
  }
  return "其他 (Others)"; // Default category
}

export function groupIngredientsByCategory(
  ingredients: AggregatedIngredient[]
): Record<IngredientCategory, AggregatedIngredient[]> {
  const grouped: Record<IngredientCategory, AggregatedIngredient[]> = {} as Record<IngredientCategory, AggregatedIngredient[]>;

  for (const category of INGREDIENT_CATEGORIES_ORDERED) {
    grouped[category] = [];
  }

  for (const ingredient of ingredients) {
    const category = getIngredientCategory(ingredient.name);
    // The category should always be one of INGREDIENT_CATEGORIES_ORDERED
    // because getIngredientCategory will default to "其他 (Others)"
    grouped[category].push(ingredient);
  }
  return grouped;
}
