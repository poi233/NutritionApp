/**
 * Represents a food item with its nutritional information.
 */
export interface Food {
  /**
   * The name of the food item.
   */
  name: string;
  /**
   * The quantity of the food item in grams.
   */
  quantity: number;
  /**
   * The amount of calories in the food item.
   */
  calories: number;
  /**
   * The amount of protein in the food item.
   */
  protein: number;
  /**
   * The amount of fat in the food item.
   */
  fat: number;
  /**
   * The amount of carbohydrates in the food item.
   */
  carbohydrates: number;
}

/**
 * Asynchronously retrieves nutritional information for a given food.
 *
 * @param food The food item to retrieve nutritional information for.
 * @returns A promise that resolves to a Food object containing nutritional information.
 */
export async function getNutrition(food: string): Promise<Food> {
  // TODO: Implement this by calling an API.

  return {
    name: food,
    quantity: 100,
    calories: 50,
    protein: 5,
    fat: 1,
    carbohydrates: 5,
  };
}
