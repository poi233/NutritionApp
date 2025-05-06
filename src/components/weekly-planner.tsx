
"use client";

import type { FC } from "react";
import type { Recipe } from "@/types/recipe";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, Info } from "lucide-react"; // Added Info icon
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"; // Import Popover
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"; // Import Table components

interface WeeklyPlannerProps {
  recipes: Recipe[];
  onDeleteRecipe: (recipeId: string) => void;
  daysOfWeek: string[];
  mealTypes: string[];
  // Translation props
  deleteLabel: string;
  detailsLabel: string;
  emptyLabel: string;
  nutritionLabel: string;
  ingredientsLabel: string;
  descriptionLabel: string;
  caloriesLabel: string;
  proteinLabel: string;
  fatLabel: string;
  carbsLabel: string;

}

export const WeeklyPlanner: FC<WeeklyPlannerProps> = ({
    recipes,
    onDeleteRecipe,
    daysOfWeek,
    mealTypes,
    deleteLabel,
    detailsLabel,
    emptyLabel,
    nutritionLabel,
    ingredientsLabel,
    descriptionLabel,
    caloriesLabel,
    proteinLabel,
    fatLabel,
    carbsLabel
 }) => {

  // Get all recipes for a specific day and meal type
  const getRecipesForSlot = (day: string, meal: string): Recipe[] => {
    return recipes.filter(r => r.dayOfWeek === day && r.mealType === meal);
  };

  return (
    // Using Table component which includes overflow auto wrapper
    <Table className="border shadow-md rounded-md overflow-hidden">
      <TableHeader>
        <TableRow className="bg-muted/50 hover:bg-muted/50">
           <TableHead className="sticky left-0 bg-muted/50 z-10 w-[100px] min-w-[100px] font-semibold text-foreground text-center">餐别</TableHead> {/* Meal Type header */}
          {daysOfWeek.map(day => (
            <TableHead key={day} className="w-[180px] min-w-[180px] font-semibold text-center text-foreground">
              {day}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {mealTypes.map(meal => (
          <TableRow key={meal}>
            {/* Sticky Meal Type cell */}
            <TableCell className="sticky left-0 bg-background z-10 font-semibold text-center align-top min-h-[120px]"> {/* Align top for consistency */}
              {meal}
            </TableCell>
            {/* Recipe cells for the days of the week */}
            {daysOfWeek.map(day => {
              const slotRecipes = getRecipesForSlot(day, meal);
              return (
                <TableCell key={`${day}-${meal}`} className="p-2 align-top min-h-[120px]"> {/* Use align-top */}
                  {/* Container for multiple recipe cards */}
                  <div className="space-y-2">
                     {slotRecipes.length > 0 ? (
                       slotRecipes.map(recipe => (
                          <Card key={recipe.id} className="flex flex-col bg-card shadow-sm hover:shadow-md transition-shadow duration-200 min-h-[80px]"> {/* Adjusted min-height for multiple cards */}
                            <CardHeader className="flex flex-row items-start justify-between p-2 pb-1">
                              <CardTitle className="text-sm font-medium leading-tight flex-1 mr-1 truncate">{recipe.name}</CardTitle>
                              <div className="flex items-center space-x-1">
                                {/* Info Popover */}
                                {(recipe.description || recipe.calories !== undefined || (recipe.ingredients && recipe.ingredients.length > 0)) && (
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground hover:text-foreground">
                                        <Info className="h-3 w-3" />
                                         <span className="sr-only">{detailsLabel} {recipe.name}</span>
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-60 text-sm p-3 max-h-[300px] overflow-y-auto">
                                       {recipe.description && <p className="mb-2"><strong>{descriptionLabel}:</strong> {recipe.description}</p>}
                                      {recipe.calories !== undefined && (
                                        <div className="space-y-1">
                                           <p><strong>{nutritionLabel} (估算):</strong></p>
                                           <p>{caloriesLabel}: {recipe.calories.toLocaleString()}</p>
                                           <p>{proteinLabel}: {recipe.protein?.toFixed(1)}克</p>
                                           <p>{fatLabel}: {recipe.fat?.toFixed(1)}克</p>
                                           <p>{carbsLabel}: {recipe.carbohydrates?.toFixed(1)}克</p>
                                        </div>
                                      )}
                                      {(recipe.ingredients && recipe.ingredients.length > 0) && (
                                          <div className="mt-2 pt-2 border-t">
                                               <p><strong>{ingredientsLabel}:</strong></p>
                                              <ul className="list-disc pl-4 text-xs"> {/* Smaller text for ingredients list */}
                                                  {recipe.ingredients.map(ing => (
                                                      <li key={ing.id || ing.name}>{ing.name} ({ing.quantity}克)</li>
                                                  ))}
                                              </ul>
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
                                   aria-label={`${deleteLabel} ${recipe.name}`}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </CardHeader>
                            {/* Only show ingredients preview if space allows, maybe not needed with popover */}
                            {/* {(recipe.ingredients && recipe.ingredients.length > 0) && (
                              <CardContent className="p-2 pt-0 text-xs text-muted-foreground overflow-hidden flex-1">
                                {recipe.ingredients.slice(0, 2).map(ing => ing.name).join(', ')}{recipe.ingredients.length > 2 ? '...' : ''}
                              </CardContent>
                            )} */}
                            {/* Display estimated calories in footer if available */}
                            {recipe.calories !== undefined && (
                               <CardFooter className="p-2 pt-0 mt-auto">
                                  <p className="text-xs text-muted-foreground">{recipe.calories?.toFixed(0)} {caloriesLabel} (估算)</p>
                               </CardFooter>
                             )}
                          </Card>
                        ))
                     ) : (
                       <div className="h-full flex items-center justify-center text-xs text-muted-foreground min-h-[80px]"> {/* Ensure min height for empty slots */}
                          {emptyLabel}
                       </div>
                     )}
                   </div>
                </TableCell>
              );
            })}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
