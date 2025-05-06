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
import { zhCN } from 'date-fns/locale'; // Import Chinese locale
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; // Import Select components
import { Textarea } from "@/components/ui/textarea"; // Import Textarea

// Ingredient schema now allows optional ID and requires positive quantity
const ingredientSchema = z.object({
  id: z.string().optional(), // Keep internal ID optional
  name: z.string().min(1, "成分名称不能为空"), // "Ingredient name cannot be empty if added"
  // Ensure quantity is a positive number, allowing decimals
  quantity: z.coerce // Coerce input to number
    .number({ invalid_type_error: "数量必须是数字" }) // "Quantity must be a number"
    .min(0.1, "数量必须至少为 0.1") // "Quantity must be at least 0.1"
    .positive("数量必须是正数"), // "Quantity must be positive"
});

const recipeFormSchema = z.object({
  name: z.string().min(1, "食谱名称是必填项"), // "Recipe name is required"
  dayOfWeek: z.string().min(1, "星期是必填项"), // "Day of week is required"
  mealType: z.string().min(1, "餐别是必填项"), // "Meal type is required"
  // Ingredients array is now optional, but if present, elements must conform to ingredientSchema
  ingredients: z.array(ingredientSchema).optional(),
  description: z.string().optional(), // Add optional description field
});

// Use Omit to exclude fields managed by the parent (id, weekStartDate, nutrition)
// Keep description as it's part of the form now
export type RecipeFormData = Omit<Recipe, 'id' | 'weekStartDate' | 'calories' | 'protein' | 'fat' | 'carbohydrates'> & {
    ingredients: Omit<Ingredient, 'id'>[]; // Ingredients in form data don't need final ID yet
};


// Explicitly define the form shape based on the schema
type HookFormShape = z.infer<typeof recipeFormSchema>;

interface RecipeInputFormProps {
  onAddRecipe: (recipe: RecipeFormData) => void; // Pass only the necessary data
  currentWeekStartDate: string; // Receive the current week
  daysOfWeek: string[]; // Receive translated days
  mealTypes: string[]; // Receive translated meal types
  // Translation props
  addMealTitle: string;
  recipeNameLabel: string;
  recipeNamePlaceholder: string;
  dayOfWeekLabel: string;
  dayOfWeekPlaceholder: string;
  mealTypeLabel: string;
  mealTypePlaceholder: string;
  descriptionLabel: string;
  descriptionPlaceholder: string;
  ingredientsLabel: string;
  ingredientNamePlaceholder: string;
  quantityPlaceholder: string;
  addIngredientLabel: string;
  submitButtonLabel: string;
}

export const RecipeInputForm: FC<RecipeInputFormProps> = ({
    onAddRecipe,
    currentWeekStartDate,
    daysOfWeek,
    mealTypes,
    addMealTitle,
    recipeNameLabel,
    recipeNamePlaceholder,
    dayOfWeekLabel,
    dayOfWeekPlaceholder,
    mealTypeLabel,
    mealTypePlaceholder,
    descriptionLabel,
    descriptionPlaceholder,
    ingredientsLabel,
    ingredientNamePlaceholder,
    quantityPlaceholder,
    addIngredientLabel,
    submitButtonLabel
 }) => {

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
      ingredients: [], // Start with empty ingredients array
      description: "",
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
      description: data.description || "", // Ensure description is string or empty string
      ingredients: (data.ingredients || []) // Ensure ingredients is an array
        .filter(ing => ing.name && ing.quantity > 0) // Filter out any potentially invalid entries before passing
        .map((ing) => ({
        // id: `temp-${Math.random().toString(16).slice(2)}`, // Parent will generate final ID
        name: ing.name,
        quantity: ing.quantity,
      })),
    };
    onAddRecipe(newRecipeData);
    reset(); // Reset form after submission
  };

  const handleAddNewIngredient = () => {
     // Append with a default quantity that passes validation if user doesn't change it
     append({ name: "", quantity: 1 });
  };

  // Watch selected values for Select components
  const selectedDay = watch("dayOfWeek");
  const selectedMeal = watch("mealType");

  return (
    <Card className="w-full shadow-none border-0"> {/* Adjusted styling */}
      <CardHeader className="p-0 pb-4"> {/* Adjusted padding */}
        <CardTitle className="text-lg font-semibold text-center"> {/* Adjusted size */}
             {addMealTitle} {format(parseISO(currentWeekStartDate), 'MMM d', { locale: zhCN })} 周
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0"> {/* Adjusted padding */}
        {/* Assign an ID to the form for the CardFooter button to reference */}
        <form id="recipe-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
             <Label htmlFor="recipeName" className="block text-sm font-medium mb-1">{recipeNameLabel}</Label>
            <Input
              id="recipeName"
              {...register("name")}
              placeholder={recipeNamePlaceholder}
              className="w-full"
              aria-invalid={errors.name ? "true" : "false"}
              required // HTML5 required
            />
            {errors.name && <p className="text-destructive text-xs mt-1">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div>
                 <Label htmlFor="dayOfWeek" className="block text-sm font-medium mb-1">{dayOfWeekLabel}</Label>
                 <Select
                   value={selectedDay}
                   onValueChange={(value) => setValue("dayOfWeek", value, { shouldValidate: true })}
                   required // HTML5 required
                 >
                    <SelectTrigger id="dayOfWeek" aria-invalid={errors.dayOfWeek ? "true" : "false"}>
                      <SelectValue placeholder={dayOfWeekPlaceholder} />
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
                 <Label htmlFor="mealType" className="block text-sm font-medium mb-1">{mealTypeLabel}</Label>
                 <Select
                   value={selectedMeal}
                   onValueChange={(value) => setValue("mealType", value, { shouldValidate: true })}
                   required // HTML5 required
                  >
                    <SelectTrigger id="mealType" aria-invalid={errors.mealType ? "true" : "false"}>
                      <SelectValue placeholder={mealTypePlaceholder} />
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

           {/* Description Field */}
            <div>
                 <Label htmlFor="description" className="block text-sm font-medium mb-1">{descriptionLabel}</Label>
                <Textarea
                    id="description"
                    placeholder={descriptionPlaceholder}
                    {...register("description")}
                    className="w-full min-h-[60px]"
                    aria-invalid={errors.description ? "true" : "false"}
                />
                {errors.description && <p className="text-destructive text-xs mt-1">{errors.description.message}</p>}
            </div>


          <div>
             <Label className="block text-sm font-medium mb-2">{ingredientsLabel}</Label>
            <div className="space-y-3">
              {fields.map((field, index) => (
                <div key={field.id} className="flex items-start space-x-2">
                  <div className="flex-1 space-y-1">
                     <Label htmlFor={`ingredients.${index}.name`} className="sr-only">成分名称</Label> {/* Ingredient Name */}
                    <Input
                      id={`ingredients.${index}.name`}
                      placeholder={ingredientNamePlaceholder}
                      {...register(`ingredients.${index}.name`)}
                      className="w-full"
                      aria-invalid={errors.ingredients?.[index]?.name ? "true" : "false"}
                    />
                    {errors.ingredients?.[index]?.name && (
                      <p className="text-destructive text-xs">{errors.ingredients[index]?.name?.message}</p>
                    )}
                  </div>
                  <div className="w-24 space-y-1"> {/* Slightly narrower width */}
                       <Label htmlFor={`ingredients.${index}.quantity`} className="sr-only">数量 (克)</Label> {/* Quantity (g) */}
                     <Input
                        id={`ingredients.${index}.quantity`}
                        placeholder={quantityPlaceholder}
                        type="number"
                        step="0.1" // Allow increments of 0.1
                        min="0.1"  // HTML5 min validation
                        {...register(`ingredients.${index}.quantity`)}
                        className="w-full"
                        aria-invalid={errors.ingredients?.[index]?.quantity ? "true" : "false"}
                      />
                     {errors.ingredients?.[index]?.quantity && (
                        <p className="text-destructive text-xs">{errors.ingredients[index]?.quantity?.message}</p>
                      )}
                  </div>
                  <Button
                     type="button"
                     variant="ghost"
                     size="icon"
                     onClick={() => remove(index)}
                     className="text-destructive hover:bg-destructive/10 mt-1 shrink-0" // Added shrink-0
                      aria-label={`移除成分 ${index + 1}`} // `Remove ingredient ${index + 1}`
                   >
                     <Trash2 className="h-4 w-4" />
                   </Button>
                </div>
              ))}
            </div>
             {/* Display root errors for the ingredients array if any (e.g., min length error if schema enforced it) */}
             {errors.ingredients?.root && <p className="text-destructive text-xs mt-2">{errors.ingredients.root.message}</p>}

          </div>

          <Button
            type="button"
            variant="outline"
            onClick={handleAddNewIngredient}
            className="w-full justify-start text-sm text-muted-foreground" // Adjusted style
          >
            <PlusCircle className="mr-2 h-4 w-4" />
             {addIngredientLabel}
          </Button>
        </form>
      </CardContent>
       <CardFooter className="flex justify-end pt-4 p-0"> {/* Adjusted padding */}
          {/* Trigger the form submission via the form's ID */}
           <Button type="submit" form="recipe-form" className="bg-primary text-primary-foreground hover:bg-primary/90">
             {submitButtonLabel}
          </Button>
       </CardFooter>
    </Card>
  );
};
