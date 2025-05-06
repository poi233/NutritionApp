"use client";

import type { FC } from "react";
import type { Recipe } from "@/types/recipe";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "./ui/button";
import { Trash2 } from "lucide-react";

interface RecipeListProps {
  recipes: Recipe[];
  onDeleteRecipe: (recipeId: string) => void;
}

export const RecipeList: FC<RecipeListProps> = ({ recipes, onDeleteRecipe }) => {
  if (recipes.length === 0) {
    return (
      <Card className="mt-8 shadow-md">
        <CardHeader>
          <CardTitle>Your Weekly Recipes</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No recipes added yet. Use the form above to add your meals.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mt-8 shadow-md">
      <CardHeader>
        <CardTitle>Your Weekly Recipes</CardTitle>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="w-full">
          {recipes.map((recipe) => (
            <AccordionItem value={recipe.id} key={recipe.id}>
              <div className="flex items-center justify-between">
                 <AccordionTrigger className="flex-1 text-left font-medium">{recipe.name}</AccordionTrigger>
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
