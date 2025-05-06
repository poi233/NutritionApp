"use client";

import type { FC } from "react";
import type { Recipe } from "@/types/recipe";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "./ui/button";
import { Trash2 } from "lucide-react";
import { format, parseISO, endOfWeek } from 'date-fns';

interface RecipeListProps {
  recipes: Recipe[]; // Only recipes for the current week are passed
  onDeleteRecipe: (recipeId: string) => void;
  weekStartDate: string; // ISO string date for the start of the week
}

export const RecipeList: FC<RecipeListProps> = ({ recipes, onDeleteRecipe, weekStartDate }) => {

   const formatWeekDisplay = (startDate: string): string => {
      try {
          const start = parseISO(startDate);
          // Use Monday as the start of the week consistently
          const end = endOfWeek(start, { weekStartsOn: 1 });
          return `${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`;
      } catch (e) {
          console.error("Error formatting week display:", e);
          return "Selected Week"; // Fallback title
      }
   }

   const weekTitle = `Recipes for ${formatWeekDisplay(weekStartDate)}`;

  if (recipes.length === 0) {
    return (
      <Card className="mt-8 shadow-md">
        <CardHeader>
          <CardTitle>{weekTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No recipes added for this week. Use the form above to add meals.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mt-8 shadow-md">
      <CardHeader>
        <CardTitle>{weekTitle}</CardTitle>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="w-full">
          {recipes.map((recipe) => (
            <AccordionItem value={recipe.id} key={recipe.id}>
              <div className="flex items-center justify-between">
                 <AccordionTrigger className="flex-1 text-left font-medium pr-2">{recipe.name}</AccordionTrigger> {/* Added pr-2 */}
                 <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDeleteRecipe(recipe.id)}
                    className="text-destructive hover:bg-destructive/10 ml-2 shrink-0"
                    aria-label={`Delete recipe ${recipe.name}`}
                 >
                    <Trash2 className="h-4 w-4" />
                 </Button>
              </div>
              <AccordionContent>
                <ul className="list-disc space-y-1 pl-6 text-sm text-muted-foreground">
                  {recipe.ingredients.map((ingredient) => (
                    <li key={ingredient.id}>
                      {ingredient.name} ({ingredient.quantity}g)
                    </li>
                  ))}
                </ul>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
};
