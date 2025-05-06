"use client";

import type { FC } from "react";
import { useState } from 'react';
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { PlusCircle, Trash2 } from 'lucide-react';
import type { Recipe, Ingredient } from "@/types/recipe"; // Import Ingredient type
import { format } from 'date-fns';
import { parseISO } from 'date-fns';


const ingredientSchema = z.object({
  id: z.string().optional(), // Keep internal ID optional
  name: z.string().min(1, "Ingredient name is required"),
  quantity: z.coerce.number().min(1, "Quantity must be positive"), // Coerce to number
});

const recipeFormSchema = z.object({
  name: z.string().min(1, "Recipe name is required"),
  ingredients: z.array(ingredientSchema).min(1, "At least one ingredient is required"),
});

// Use Omit to exclude fields managed by the parent (id, weekStartDate)
type RecipeFormData = Omit<Recipe, 'id' | 'weekStartDate'>;
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
  } = useForm<HookFormShape>({ // Use the schema-based type for useForm
    resolver: zodResolver(recipeFormSchema),
    defaultValues: {
      name: "",
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
      ingredients: data.ingredients.map((ing) => ({
        id: `temp-${Math.random()}`, // Temporary ID, parent will generate final
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

  return (
    <Card className="w-full max-w-lg mx-auto shadow-md">
      <CardHeader>
        <CardTitle className="text-2xl font-semibold text-center">
            Add Recipe for Week of {format(parseISO(currentWeekStartDate), 'MMM d')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Assign an ID to the form for the CardFooter button to reference */}
        <form id="recipe-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <Label htmlFor="recipeName" className="block text-sm font-medium mb-1">Recipe Name</Label>
            <Input
              id="recipeName"
              {...register("name")}
              className="w-full"
              aria-invalid={errors.name ? "true" : "false"}
            />
            {errors.name && <p className="text-destructive text-xs mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <Label className="block text-sm font-medium mb-2">Ingredients</Label>
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
                  {/* Only show remove button if more than one ingredient exists */}
                  {fields.length > 1 && (
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
                    {/* Add a placeholder if only one ingredient to maintain layout */}
                   {fields.length <= 1 && (
                      <div className="w-10 h-10 shrink-0"></div> // Placeholder spacer
                   )}
                </div>
              ))}
            </div>
            {/* Display root errors for the ingredients array if any */}
            {errors.ingredients?.root && <p className="text-destructive text-xs mt-2">{errors.ingredients.root.message}</p>}
            {/* General message if less than one ingredient and submitted */}
            {errors.ingredients && !errors.ingredients.root && Array.isArray(errors.ingredients) && errors.ingredients.length === 0 && (
                 <p className="text-destructive text-xs mt-2">At least one ingredient is required.</p>
            )}
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
          <Button type="submit" form="recipe-form" className="bg-accent text-accent-foreground hover:bg-accent/90">
            Add Recipe to Week
          </Button>
       </CardFooter>
    </Card>
  );
};
