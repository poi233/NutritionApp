"use client";

import type { FC } from "react";
import { useState } from 'react';
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { PlusCircle, Trash2 } from 'lucide-react';
import type { Recipe } from "@/types/recipe";

const ingredientSchema = z.object({
  name: z.string().min(1, "Ingredient name is required"),
  quantity: z.coerce.number().min(1, "Quantity must be positive"), // Coerce to number
});

const recipeFormSchema = z.object({
  name: z.string().min(1, "Recipe name is required"),
  ingredients: z.array(ingredientSchema).min(1, "At least one ingredient is required"),
});

type RecipeFormData = z.infer<typeof recipeFormSchema>;

interface RecipeInputFormProps {
  onAddRecipe: (recipe: Recipe) => void;
}

export const RecipeInputForm: FC<RecipeInputFormProps> = ({ onAddRecipe }) => {
  const [nextIngredientId, setNextIngredientId] = useState(0);
  const [nextRecipeId, setNextRecipeId] = useState(0);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RecipeFormData>({
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

  const onSubmit = (data: RecipeFormData) => {
    const newRecipe: Recipe = {
      id: `recipe-${nextRecipeId}`,
      name: data.name,
      ingredients: data.ingredients.map((ing, index) => ({
        id: `ingredient-${nextIngredientId + index}`,
        name: ing.name,
        quantity: ing.quantity,
      })),
    };
    onAddRecipe(newRecipe);
    setNextRecipeId(prev => prev + 1);
    setNextIngredientId(prev => prev + data.ingredients.length);
    reset(); // Reset form after submission
  };

  const handleAddNewIngredient = () => {
     append({ name: "", quantity: 0 });
  };

  return (
    <Card className="w-full max-w-lg mx-auto shadow-md">
      <CardHeader>
        <CardTitle className="text-2xl font-semibold text-center">Add New Recipe</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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
                  <div className="flex-1 space-y-1">
                     <Input
                        placeholder="Quantity (g)"
                        type="number"
                        {...register(`ingredients.${index}.quantity`)}
                        className="w-full"
                        aria-invalid={errors.ingredients?.[index]?.quantity ? "true" : "false"}
                      />
                     {errors.ingredients?.[index]?.quantity && (
                        <p className="text-destructive text-xs">{errors.ingredients?.[index]?.quantity?.message}</p>
                      )}
                  </div>
                  {fields.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => remove(index)}
                      className="text-destructive hover:bg-destructive/10 mt-1" // Added mt-1 for alignment
                      aria-label={`Remove ingredient ${index + 1}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            {errors.ingredients?.root && <p className="text-destructive text-xs mt-1">{errors.ingredients.root.message}</p>}
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
          <Button type="submit" form="recipe-form" className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={handleSubmit(onSubmit)}>
            Add Recipe
          </Button>
       </CardFooter>
    </Card>
  );
};
