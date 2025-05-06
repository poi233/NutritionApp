export interface Ingredient {
  id: string; // Unique ID for React key prop
  name: string;
  quantity: number; // Assuming grams
}

export interface Recipe {
  id: string; // Unique ID for React key prop
  name: string;
  ingredients: Ingredient[];
}
