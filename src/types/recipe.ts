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
}
