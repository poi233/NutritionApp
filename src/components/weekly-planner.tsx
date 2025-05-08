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
  mealTypes: string[]; // Already filtered in parent component
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
    mealTypes, // Receive filtered meal types
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
          <TableHead className="sticky left-0 bg-muted/50 z-10 w-[100px] min-w-[100px] font-semibold text-foreground text-center">日期</TableHead>
          {mealTypes.map(meal => (
            <TableHead key={meal} className="w-[180px] min-w-[180px] font-semibold text-center text-foreground">
              {meal}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {daysOfWeek.map(day => (
          <TableRow key={day}>
            <TableCell className="sticky left-0 bg-background z-10 font-semibold text-center align-top min-h-[100px]"> {/* Reduced min-h */}
              {day}
            </TableCell>
            {mealTypes.map(meal => {
              const slotRecipes = getRecipesForSlot(day, meal);
              return (
                <TableCell key={`${day}-${meal}`} className="p-1 align-top min-h-[100px]"> {/* Reduced padding and min-h */}
                  <div className="space-y-1"> {/* Reduced space */}
                     {slotRecipes.length > 0 ? (
                       slotRecipes.map(recipe => (
                          <Card key={recipe.id} className="flex flex-col bg-card shadow-sm hover:shadow-md transition-shadow duration-200 min-h-[60px]"> {/* Reduced min-h */}
                            <CardHeader className="flex flex-row items-start justify-between p-1.5 pb-0.5"> {/* Reduced padding */}
                              <CardTitle className="text-xs font-medium leading-tight flex-1 mr-1 truncate" title={recipe.name}>{recipe.name}</CardTitle> {/* Added title attribute for full name on hover */}
                              <div className="flex items-center space-x-0.5"> {/* Reduced space */}
                                {(recipe.description || recipe.calories !== undefined || (recipe.ingredients && recipe.ingredients.length > 0)) && (
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-4 w-4 text-muted-foreground hover:text-foreground"> {/* Smaller button */}
                                        <Info className="h-2.5 w-2.5" /> {/* Smaller icon */}
                                         <span className="sr-only">{detailsLabel} {recipe.name}</span>
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-52 text-xs p-2 max-h-[250px] overflow-y-auto"> {/* Smaller popover */}
                                       {recipe.description && <p className="mb-1 text-xs"><strong>{descriptionLabel}:</strong> {recipe.description}</p>}
                                      {recipe.calories !== undefined && (
                                        <div className="space-y-0.5 text-xs">
                                           <p><strong>{nutritionLabel} (估算):</strong></p>
                                           <p>{caloriesLabel}: {recipe.calories.toLocaleString()}</p>
                                           <p>{proteinLabel}: {recipe.protein?.toFixed(1)}克</p>
                                           <p>{fatLabel}: {recipe.fat?.toFixed(1)}克</p>
                                           <p>{carbsLabel}: {recipe.carbohydrates?.toFixed(1)}克</p>
                                        </div>
                                      )}
                                      {(recipe.ingredients && recipe.ingredients.length > 0) && (
                                          <div className="mt-1 pt-1 border-t">
                                               <p className="text-xs"><strong>{ingredientsLabel}:</strong></p>
                                              <ul className="list-disc pl-3 text-xs">
                                                  {recipe.ingredients.map(ing => (
                                                      <li key={ing.id || ing.name}>{ing.name} ({ing.quantity}克)</li>
                                                  ))}
                                              </ul>
                                          </div>
                                      )}
                                    </PopoverContent>
                                  </Popover>
                                )}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => onDeleteRecipe(recipe.id)}
                                  className="h-4 w-4 text-destructive hover:bg-destructive/10" // Smaller button
                                   aria-label={`${deleteLabel} ${recipe.name}`}
                                >
                                  <Trash2 className="h-2.5 w-2.5" /> {/* Smaller icon */}
                                </Button>
                              </div>
                            </CardHeader>
                            {recipe.calories !== undefined && (
                               <CardFooter className="p-1.5 pt-0 mt-auto"> {/* Reduced padding */}
                                  <p className="text-[10px] text-muted-foreground">{recipe.calories?.toFixed(0)} {caloriesLabel} (估算)</p> {/* Smaller text */}
                               </CardFooter>
                             )}
                          </Card>
                        ))
                     ) : (
                       <div className="h-full flex items-center justify-center text-[10px] text-muted-foreground min-h-[60px]"> {/* Smaller text and min-h */}
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