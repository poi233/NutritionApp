"use client";

import type { FC } from "react";
import type { Recipe } from "@/types/recipe";
import { Card, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, Info } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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

const MAX_VISIBLE_STACKED_CARDS = 3; // Limit how many cards are visually stacked before just showing a count

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
    <Table className="border shadow-md rounded-md overflow-hidden w-full table-fixed"> {/* Ensure table layout is fixed */}
      <TableHeader>
        <TableRow className="bg-muted/50 hover:bg-muted/50">
           {/* Adjust width for the first column (Day) */}
          <TableHead className="sticky left-0 bg-muted/50 z-10 w-[80px] min-w-[80px] font-semibold text-foreground text-center">日期</TableHead>
           {/* Adjust width for meal columns */}
          {mealTypes.map(meal => (
            <TableHead key={meal} className="w-[150px] min-w-[150px] font-semibold text-center text-foreground">
              {meal}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {daysOfWeek.map(day => (
          <TableRow key={day}>
            {/* Ensure first column (Day) sticks */}
            <TableCell className="sticky left-0 bg-background z-10 font-semibold text-center align-top min-h-[80px]"> {/* Reduced min-h */}
              {day}
            </TableCell>
            {mealTypes.map(meal => {
              const slotRecipes = getRecipesForSlot(day, meal);
              const totalRecipesInSlot = slotRecipes.length;
              return (
                 <TableCell key={`${day}-${meal}`} className="p-1 align-top min-h-[80px] relative"> {/* Use relative positioning for potential absolute stacking */}
                  <div className="space-y-0"> {/* Remove vertical space for stacking */}
                     {totalRecipesInSlot > 0 ? (
                       slotRecipes.map((recipe, index) => (
                          <Card
                            key={recipe.id}
                            className="flex flex-col bg-card shadow-sm hover:shadow-md transition-shadow duration-200 w-full overflow-hidden min-h-[36px]" // Reduced min-h, width is full cell width
                            // Apply negative margin for stacking effect (only if more than 1 recipe)
                            // Limit stacking visualization to MAX_VISIBLE_STACKED_CARDS
                            style={totalRecipesInSlot > 1 && index > 0 && index < MAX_VISIBLE_STACKED_CARDS ? { marginTop: '-24px', zIndex: index } : {zIndex: index}}
                          >
                             {/* Only show footer if NOT stacked or if it's the last visible stacked card */}
                             {/* We always show the header */}
                            <CardHeader className="flex flex-row items-center justify-between p-1.5 pb-1 flex-shrink-0"> {/* Reduced padding */}
                              <CardTitle className="text-[10px] font-medium leading-tight flex-1 mr-1 truncate" title={recipe.name}>
                                 {/* Add a number prefix if multiple recipes */}
                                 {totalRecipesInSlot > 1 ? `${index + 1}. ` : ''}{recipe.name}
                              </CardTitle>
                              <div className="flex items-center space-x-0.5 flex-shrink-0">
                                {(recipe.description || recipe.calories !== undefined || (recipe.ingredients && recipe.ingredients.length > 0)) && (
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-4 w-4 text-muted-foreground hover:text-foreground">
                                        <Info className="h-2.5 w-2.5" />
                                         <span className="sr-only">{detailsLabel} {recipe.name}</span>
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-52 text-xs p-2 max-h-[250px] overflow-y-auto">
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
                                  className="h-4 w-4 text-destructive hover:bg-destructive/10"
                                   aria-label={`${deleteLabel} ${recipe.name}`}
                                >
                                  <Trash2 className="h-2.5 w-2.5" />
                                </Button>
                              </div>
                            </CardHeader>
                            {/* Conditionally render footer for non-stacked or last item */}
                            {(totalRecipesInSlot === 1 || index === totalRecipesInSlot - 1 || index === MAX_VISIBLE_STACKED_CARDS - 1) && recipe.calories !== undefined && (
                               <CardFooter className="p-1.5 pt-0 mt-auto flex-shrink-0">
                                  <p className="text-[9px] text-muted-foreground">{recipe.calories?.toFixed(0)} {caloriesLabel} (估算)</p> {/* Even smaller text */}
                               </CardFooter>
                             )}
                             {/* Show indicator if there are more hidden stacked cards */}
                            {index === MAX_VISIBLE_STACKED_CARDS - 1 && totalRecipesInSlot > MAX_VISIBLE_STACKED_CARDS && (
                                <div className="text-center text-[9px] text-muted-foreground bg-gradient-to-t from-background/80 via-background/80 to-transparent pt-1 pb-0.5 -mt-1">
                                    + {totalRecipesInSlot - MAX_VISIBLE_STACKED_CARDS} more...
                                </div>
                            )}
                          </Card>
                        ))
                     ) : (
                       <div className="h-full flex items-center justify-center text-[10px] text-muted-foreground min-h-[80px]">
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
