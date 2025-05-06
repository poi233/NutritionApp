"use client";

import type { FC } from "react";
import type { Recipe } from "@/types/recipe";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Trash2, Apple, Info } from "lucide-react"; // Added Info icon
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"; // Import Popover

interface WeeklyPlannerProps {
  recipes: Recipe[];
  onDeleteRecipe: (recipeId: string) => void;
  daysOfWeek: string[];
  mealTypes: string[];
}

export const WeeklyPlanner: FC<WeeklyPlannerProps> = ({ recipes, onDeleteRecipe, daysOfWeek, mealTypes }) => {

  const getRecipeForSlot = (day: string, meal: string): Recipe | undefined => {
    return recipes.find(r => r.dayOfWeek === day && r.mealType === meal);
  };

  return (
    <ScrollArea className="w-full whitespace-nowrap rounded-md border shadow-md">
      <div className="grid grid-flow-col auto-cols-max"> {/* Use grid-flow-col */}
         {/* Header Row for Meal Types */}
         <div className="sticky left-0 bg-background z-10 p-2 border-b border-r min-w-[100px] flex items-center justify-center font-semibold">Day</div>
          {daysOfWeek.map(day => (
            <div key={day} className="p-4 border-b border-r font-semibold text-center min-w-[180px]">
              {day}
            </div>
          ))}

         {/* Meal Rows */}
         {mealTypes.map(meal => (
          <div key={meal} className="grid grid-flow-col auto-cols-max"> {/* Each row is also a grid */}
              <div className="sticky left-0 bg-background z-10 p-4 border-r flex items-center justify-center font-semibold min-w-[100px]">
                 {meal}
              </div>
              {daysOfWeek.map(day => {
                const recipe = getRecipeForSlot(day, meal);
                return (
                  <div key={`${day}-${meal}`} className="p-2 border-r min-w-[180px] min-h-[100px] flex flex-col justify-between">
                    {recipe ? (
                      <Card className="h-full flex flex-col bg-card shadow-sm hover:shadow-md transition-shadow duration-200">
                        <CardHeader className="flex flex-row items-start justify-between p-2 pb-1">
                          <CardTitle className="text-sm font-medium leading-tight flex-1 mr-1 truncate">{recipe.name}</CardTitle>
                          <div className="flex items-center space-x-1">
                             {/* Info Popover */}
                            {(recipe.description || recipe.calories !== undefined) && (
                              <Popover>
                                <PopoverTrigger asChild>
                                   <Button variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground hover:text-foreground">
                                     <Info className="h-3 w-3" />
                                     <span className="sr-only">Details for {recipe.name}</span>
                                   </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-60 text-sm p-3">
                                  {recipe.description && <p className="mb-2"><strong>Description:</strong> {recipe.description}</p>}
                                  {recipe.calories !== undefined && (
                                    <div className="space-y-1">
                                      <p><strong>Nutrition (Est.):</strong></p>
                                      <p>Calories: {recipe.calories.toLocaleString()}</p>
                                      <p>Protein: {recipe.protein?.toFixed(1)}g</p>
                                      <p>Fat: {recipe.fat?.toFixed(1)}g</p>
                                      <p>Carbs: {recipe.carbohydrates?.toFixed(1)}g</p>
                                    </div>
                                  )}
                                </PopoverContent>
                              </Popover>
                            )}
                            {/* Delete Button */}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => onDeleteRecipe(recipe.id)}
                              className="h-5 w-5 text-destructive hover:bg-destructive/10"
                              aria-label={`Delete ${recipe.name}`}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                           </div>
                        </CardHeader>
                        {(recipe.ingredients && recipe.ingredients.length > 0) && (
                          <CardContent className="p-2 pt-0 text-xs text-muted-foreground overflow-hidden flex-1">
                             {/* Simple ingredient list for now, could be a popover/tooltip */}
                             {recipe.ingredients.slice(0, 2).map(ing => ing.name).join(', ')}{recipe.ingredients.length > 2 ? '...' : ''}
                           </CardContent>
                        )}
                        {/* Optional Footer for quick add or other actions */}
                         {/* <CardFooter className="p-1 pt-0">
                             Optional footer content
                         </CardFooter> */}
                      </Card>
                    ) : (
                      <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                        Empty
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
         ))}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
};
