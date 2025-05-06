"use client";

import type { FC } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { PlusCircle, Trash2 } from 'lucide-react';
import type { Recipe, Ingredient } from "@/types/recipe"; // Import Ingredient type
import { format, parseISO } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; // Import Select components

const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const mealTypes = ["Breakfast", "Lunch", "Dinner", "Snack"];

const ingredientSchema = z.object({
  id: z.string().optional(), // Keep internal ID optional
  name: z.string().min(1, "Ingredient name is required"),
  quantity: z.coerce.number().min(1, "Quantity must be positive"), // Coerce to number
});

const recipeFormSchema = z.object({
  name: z.string().min(1, "Recipe name is required"),
  dayOfWeek: z.string().min(1, "Day of week is required"),
  mealType: z.string().min(1, "Meal type is required"),
  ingredients: z.array(ingredientSchema).min(1, "At least one ingredient is required"),
});

// Use Omit to exclude fields managed by the parent (id, weekStartDate, nutrition)
export type RecipeFormData = Omit<Recipe, 'id' | 'weekStartDate' | 'calories' | 'protein' | 'fat' | 'carbohydrates' | 'description'>;

// Explicitly define the form shape based on the schema
type HookFormShape = z.infer<typeof recipeFormSchema>;

interface RecipeInputFormProps {
  onAddRecipe: (recipe: RecipeFormData) => void; // Pass only the necessary data
  currentWeekStartDate: string; // Receive the current week
}

export const RecipeInputForm: FC<RecipeInputFormProps> = ({ onAddRecipe, currentWeekStartDate }) => {

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
    setValue, // Add setValue to control Select components
    watch // Add watch to update Select components if needed
  } = useForm<HookFormShape>({ // Use the schema-based type for useForm
    resolver: zodResolver(recipeFormSchema),
    defaultValues: {
      name: "",
      dayOfWeek: "",
      mealType: "",
      ingredients: [{ name: "", quantity: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "ingredients",
  });

  const onSubmit = (data: HookFormShape) => {
    // Map the form data (HookFormShape) to the expected RecipeFormData
    const newRecipeData: RecipeFormData = {
      name: data.name,
      dayOfWeek: data.dayOfWeek,
      mealType: data.mealType,
      ingredients: data.ingredients.map((ing) => ({
        id: `temp-${Math.random().toString(16).slice(2)}`, // Temporary ID, parent will generate final
        name: ing.name,
        quantity: ing.quantity,
      })),
    };
    onAddRecipe(newRecipeData);
    reset(); // Reset form after submission
  };

  const handleAddNewIngredient = () => {
     append({ name: "", quantity: 0 });
  };

  // Watch selected values for Select components
  const selectedDay = watch("dayOfWeek");
  const selectedMeal = watch("mealType");

  return (
    <Card className="w-full max-w-lg mx-auto shadow-md">
      <CardHeader>
        <CardTitle className="text-2xl font-semibold text-center">
            Add Meal for Week of {format(parseISO(currentWeekStartDate), 'MMM d')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Assign an ID to the form for the CardFooter button to reference */}
        <form id="recipe-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <Label htmlFor="recipeName" className="block text-sm font-medium mb-1">Recipe/Meal Name</Label>
            <Input
              id="recipeName"
              {...register("name")}
              placeholder="e.g., Scrambled Eggs, Chicken Salad"
              className="w-full"
              aria-invalid={errors.name ? "true" : "false"}
            />
            {errors.name && <p className="text-destructive text-xs mt-1">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div>
                <Label htmlFor="dayOfWeek" className="block text-sm font-medium mb-1">Day of Week</Label>
                 <Select
                   value={selectedDay}
                   onValueChange={(value) => setValue("dayOfWeek", value, { shouldValidate: true })}
                 >
                   <SelectTrigger id="dayOfWeek" aria-invalid={errors.dayOfWeek ? "true" : "false"}>
                     <SelectValue placeholder="Select day" />
                   </SelectTrigger>
                   <SelectContent>
                     {daysOfWeek.map((day) => (
                       <SelectItem key={day} value={day}>{day}</SelectItem>
                     ))}
                   </SelectContent>
                 </Select>
                {errors.dayOfWeek && <p className="text-destructive text-xs mt-1">{errors.dayOfWeek.message}</p>}
              </div>

              <div>
                <Label htmlFor="mealType" className="block text-sm font-medium mb-1">Meal Type</Label>
                 <Select
                   value={selectedMeal}
                   onValueChange={(value) => setValue("mealType", value, { shouldValidate: true })}
                  >
                   <SelectTrigger id="mealType" aria-invalid={errors.mealType ? "true" : "false"}>
                     <SelectValue placeholder="Select meal" />
                   </SelectTrigger>
                   <SelectContent>
                     {mealTypes.map((meal) => (
                       <SelectItem key={meal} value={meal}>{meal}</SelectItem>
                     ))}
                   </SelectContent>
                 </Select>
                {errors.mealType && <p className="text-destructive text-xs mt-1">{errors.mealType.message}</p>}
              </div>
           </div>


          <div>
            <Label className="block text-sm font-medium mb-2">Ingredients (Optional)</Label>
            <div className="space-y-4">
              {fields.map((field, index) => (
                <div key={field.id} className="flex items-start space-x-2">
                  <div className="flex-1 space-y-1">
                    <Input
                      placeholder="Ingredient Name"
                      {...register(`ingredients.${index}.name`)}
                      className="w-full"
                      aria-invalid={errors.ingredients?.[index]?.name ? "true" : "false"}
                    />
                    {errors.ingredients?.[index]?.name && (
                      <p className="text-destructive text-xs">{errors.ingredients?.[index]?.name?.message}</p>
                    )}
                  </div>
                  <div className="w-28 space-y-1"> {/* Fixed width for quantity */}
                     <Input
                        placeholder="Qty (g)"
                        type="number"
                        step="any" // Allow decimals if needed
                        {...register(`ingredients.${index}.quantity`)}
                        className="w-full"
                        aria-invalid={errors.ingredients?.[index]?.quantity ? "true" : "false"}
                      />
                     {errors.ingredients?.[index]?.quantity && (
                        <p className="text-destructive text-xs">{errors.ingredients?.[index]?.quantity?.message}</p>
                      )}
                  </div>
                  {/* Always show remove button if at least one ingredient exists */}
                  {fields.length >= 1 && (
                     <Button
                       type="button"
                       variant="ghost"
                       size="icon"
                       onClick={() => remove(index)}
                       className="text-destructive hover:bg-destructive/10 mt-1 shrink-0" // Added shrink-0
                       aria-label={`Remove ingredient ${index + 1}`}
                     >
                       <Trash2 className="h-4 w-4" />
                     </Button>
                   )}
                </div>
              ))}
            </div>
            {/* Display root errors for the ingredients array if any */}
            {errors.ingredients?.root && <p className="text-destructive text-xs mt-2">{errors.ingredients.root.message}</p>}
            {/* General message if less than one ingredient and submitted */}
            {/* Update validation message: Ingredients are optional now */}
            {/* errors.ingredients && !errors.ingredients.root && Array.isArray(errors.ingredients) && errors.ingredients.length === 0 && (
                 <p className="text-destructive text-xs mt-2">At least one ingredient is required.</p>
            ) */}
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={handleAddNewIngredient}
            className="w-full justify-start text-sm"
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Ingredient
          </Button>
        </form>
      </CardContent>
       <CardFooter className="flex justify-end">
          {/* Trigger the form submission via the form's ID */}
          <Button type="submit" form="recipe-form" className="bg-primary text-primary-foreground hover:bg-primary/90">
            Add Meal to Week
          </Button>
       </CardFooter>
    </Card>
  );
};
