
"use client";

import type { FC } from "react";
import type { Recipe } from "@/types/recipe";
import { Card, CardHeader, CardTitle, CardFooter, CardContent } from "@/components/ui/card"; 
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
} from "@/components/ui/table"; 

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

const MAX_VISIBLE_STACKED_CARDS = 3; 

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

  const getRecipesForSlot = (day: string, meal: string): Recipe[] => {
    return recipes.filter(r => r.dayOfWeek === day && r.mealType === meal);
  };

  return (
    <Table className="border shadow-md rounded-md overflow-hidden w-full"> {/* Changed from table-fixed mx-auto w-max */}
      <TableHeader>
        <TableRow className="bg-muted/50 hover:bg-muted/50">
          <TableHead className="sticky left-0 bg-muted/50 z-10 w-[60px] min-w-[60px] font-semibold text-foreground text-center align-middle">日期</TableHead> {/* Adjusted width, added align-middle */}
          {mealTypes.map(meal => (
            <TableHead key={meal} className="min-w-[100px] font-semibold text-center text-foreground align-middle"> {/* Adjusted width, added align-middle */}
              {meal}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {daysOfWeek.map(day => (
          <TableRow key={day}>
            <TableCell className="sticky left-0 bg-background z-10 font-semibold text-center align-top min-h-[60px]"> 
              {day}
            </TableCell>
            {mealTypes.map(meal => {
              const slotRecipes = getRecipesForSlot(day, meal);
              const totalRecipesInSlot = slotRecipes.length;
              return (
                 <TableCell key={`${day}-${meal}`} className="p-1 align-top min-h-[60px] relative"> 
                  <div className="space-y-1">
                     {totalRecipesInSlot > 0 ? (
                       slotRecipes.map((recipe, index) => (
                          <Card
                            key={recipe.id}
                            className="flex flex-col bg-card shadow-sm hover:shadow-md transition-shadow duration-200 w-full overflow-hidden min-h-[40px] z-0 hover:z-10" 
                          >
                            <CardHeader className="p-1.5 pb-0 flex-shrink-0">
                              <CardTitle className="text-[10px] font-medium leading-tight truncate" title={recipe.name}>
                                 {totalRecipesInSlot > 1 ? `${index + 1}. ` : ''}{recipe.name}
                              </CardTitle>
                            </CardHeader>
                             {recipe.calories !== undefined && (
                                 <CardContent className="p-1.5 pt-0.5 text-[9px] text-muted-foreground flex-grow">
                                     {recipe.calories?.toFixed(0)} {caloriesLabel} (估)
                                </CardContent>
                             )}
                             <CardFooter className="p-1.5 pt-1 flex items-center justify-end space-x-1 mt-auto flex-shrink-0">
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
                             </CardFooter>
                          </Card>
                        ))
                     ) : (
                       <div className="h-full flex items-center justify-center text-[10px] text-muted-foreground min-h-[60px]"> 
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

