export interface Ingredient {
  id: string; // Unique ID for React key prop
  name: string;
  quantity: number; // Assuming grams
}

export interface Recipe {
  id: string; // Unique ID for React key prop
  name: string;
  ingredients: Ingredient[];
  weekStartDate: string; // ISO string (yyyy-MM-dd) representing the start of the week
  dayOfWeek: string; // e.g., "Monday", "周一" (allow string for translation)
  mealType: string; // e.g., "Breakfast", "早餐" (allow string for translation)
  // Optional nutritional info (can be calculated/estimated)
  calories?: number;
  protein?: number;
  fat?: number;
  carbohydrates?: number;
  description?: string; // Optional description added for generated recipes
}
