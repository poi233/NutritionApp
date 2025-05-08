
"use client";

import type { FC } from "react";
import React, { useState } // Import useState
from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { PlusCircle, Trash2, Sparkles, RefreshCw, XCircle } from 'lucide-react'; // Added Sparkles, RefreshCw, XCircle
import type { Recipe, Ingredient } from "@/types/recipe";
import { format, parseISO } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { suggestRecipeDetails, type SuggestRecipeDetailsOutput } from "@/ai/flows/suggest-recipe-details"; // Import the new flow
import { useToast } from "@/hooks/use-toast"; // Import useToast

// Ingredient schema now allows optional ID and requires positive quantity
const ingredientSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "成分名称不能为空"),
  quantity: z.coerce
    .number({ invalid_type_error: "数量必须是数字" })
    .min(0.1, "数量必须至少为 0.1")
    .positive("数量必须是正数"),
});

const recipeFormSchema = z.object({
  name: z.string().min(1, "食谱名称是必填项"),
  dayOfWeek: z.string().min(1, "星期是必填项"),
  mealType: z.string().min(1, "餐别是必填项"),
  ingredients: z.array(ingredientSchema).optional(),
  description: z.string().optional(),
});

export type RecipeFormData = Omit<Recipe, 'id' | 'weekStartDate' | 'calories' | 'protein' | 'fat' | 'carbohydrates'> & {
    ingredients: Omit<Ingredient, 'id'>[];
};

type HookFormShape = z.infer<typeof recipeFormSchema>;

interface RecipeInputFormProps {
  onAddRecipe: (recipe: RecipeFormData) => void;
  onCloseDialog: () => void; // New prop to handle closing
  currentWeekStartDate: string;
  daysOfWeek: string[];
  mealTypes: string[];
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
  autoFillDetailsLabel?: string; // New prop for translation
}

export const RecipeInputForm: FC<RecipeInputFormProps> = ({
    onAddRecipe,
    onCloseDialog, // Destructure the new prop
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
    submitButtonLabel,
    autoFillDetailsLabel = "智能填充详情" // Default value for the new button
 }) => {
  const { toast } = useToast();
  const [isSuggestingDetails, setIsSuggestingDetails] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
    setValue,
    watch,
    getValues // Added getValues
  } = useForm<HookFormShape>({
    resolver: zodResolver(recipeFormSchema),
    defaultValues: {
      name: "",
      dayOfWeek: "",
      mealType: "",
      ingredients: [],
      description: "",
    },
  });

  const { fields, append, remove, replace } = useFieldArray({ // Added replace
    control,
    name: "ingredients",
  });

  const onSubmit = (data: HookFormShape) => {
    const newRecipeData: RecipeFormData = {
      name: data.name,
      dayOfWeek: data.dayOfWeek,
      mealType: data.mealType,
      description: data.description || "",
      ingredients: (data.ingredients || [])
        .filter(ing => ing.name && ing.quantity > 0)
        .map((ing) => ({
        name: ing.name,
        quantity: ing.quantity,
      })),
    };
    onAddRecipe(newRecipeData); // This now only adds the recipe and shows a toast
    reset(); // Clear the form for the next entry
  };

  const handleAddNewIngredient = () => {
     append({ name: "", quantity: 1 });
  };

  const handleSuggestDetails = async () => {
    const mealName = getValues("name");
    if (!mealName) {
      toast({
        title: "请输入餐点名称",
        description: "需要餐点名称才能获取建议。",
        variant: "destructive",
      });
      return;
    }

    setIsSuggestingDetails(true);
    try {
      const result: SuggestRecipeDetailsOutput = await suggestRecipeDetails({ mealName });
      setValue("description", result.description, { shouldValidate: true, shouldDirty: true });

      // Map AI ingredients to form ingredient shape (without ID)
      const suggestedIngredientsForForm = result.ingredients.map(ing => ({
        name: ing.name,
        quantity: ing.quantity,
      }));
      // Replace existing ingredients with AI suggestions
      replace(suggestedIngredientsForForm);

      toast({
        title: "详情已填充",
        description: `已为 "${mealName}" 自动填充描述和成分。`,
      });
    } catch (error) {
      console.error("获取餐点详情建议时出错:", error);
      const errorMessage = error instanceof Error ? error.message : "无法获取建议。";
      toast({
        title: "填充失败",
        description: errorMessage.startsWith("获取餐点详情失败：") ? errorMessage.substring("获取餐点详情失败：".length) : errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSuggestingDetails(false);
    }
  };


  const selectedDay = watch("dayOfWeek");
  const selectedMeal = watch("mealType");
  const currentMealName = watch("name");

  return (
    <Card className="w-full shadow-none border-0">
      <CardHeader className="p-0 pb-4">
        <CardTitle className="text-lg font-semibold text-center">
             {addMealTitle} {format(parseISO(currentWeekStartDate), 'MMM d', { locale: zhCN })} 周
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <form id="recipe-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
             <Label htmlFor="recipeName" className="block text-sm font-medium mb-1">{recipeNameLabel}</Label>
             <div className="flex items-center gap-2">
                <Input
                  id="recipeName"
                  {...register("name")}
                  placeholder={recipeNamePlaceholder}
                  className="w-full"
                  aria-invalid={errors.name ? "true" : "false"}
                  required
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleSuggestDetails}
                  disabled={isSuggestingDetails || !currentMealName}
                  title={autoFillDetailsLabel}
                  className="shrink-0"
                >
                  {isSuggestingDetails ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  <span className="sr-only">{autoFillDetailsLabel}</span>
                </Button>
             </div>
            {errors.name && <p className="text-destructive text-xs mt-1">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div>
                 <Label htmlFor="dayOfWeek" className="block text-sm font-medium mb-1">{dayOfWeekLabel}</Label>
                 <Select
                   value={selectedDay}
                   onValueChange={(value) => setValue("dayOfWeek", value, { shouldValidate: true })}
                   required
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
                   required
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
                     <Label htmlFor={`ingredients.${index}.name`} className="sr-only">成分名称</Label>
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
                  <div className="w-24 space-y-1">
                       <Label htmlFor={`ingredients.${index}.quantity`} className="sr-only">数量 (克)</Label>
                     <Input
                        id={`ingredients.${index}.quantity`}
                        placeholder={quantityPlaceholder}
                        type="number"
                        step="0.1"
                        min="0.1"
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
                     className="text-destructive hover:bg-destructive/10 mt-1 shrink-0"
                      aria-label={`移除成分 ${index + 1}`}
                   >
                     <Trash2 className="h-4 w-4" />
                   </Button>
                </div>
              ))}
            </div>
             {errors.ingredients?.root && <p className="text-destructive text-xs mt-2">{errors.ingredients.root.message}</p>}

          </div>

          <Button
            type="button"
            variant="outline"
            onClick={handleAddNewIngredient}
            className="w-full justify-start text-sm text-muted-foreground"
          >
            <PlusCircle className="mr-2 h-4 w-4" />
             {addIngredientLabel}
          </Button>
        </form>
      </CardContent>
       <CardFooter className="flex justify-between pt-4 p-0">
           {/* Added Close button */}
           <Button type="button" variant="outline" onClick={onCloseDialog}>
             <XCircle className="mr-2 h-4 w-4" />
              关闭
           </Button>
           <Button type="submit" form="recipe-form" className="bg-primary text-primary-foreground hover:bg-primary/90">
             {submitButtonLabel}
          </Button>
       </CardFooter>
    </Card>
  );
};

