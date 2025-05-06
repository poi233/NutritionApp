"use client";

import type { FC } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface RecipeRecommendationsProps {
  recommendations: string[] | null; // Keep as string array for flexibility
  notes?: string | null; // Add optional notes field
  isLoading: boolean;
  title?: string; // Allow custom title
  description?: string; // Allow custom description
}

export const RecipeRecommendations: FC<RecipeRecommendationsProps> = ({
  recommendations,
  notes,
  isLoading,
  title = "New Recipe Ideas", // Default title
  description = "Try these recipes based on your profile!", // Default description
}) => {
  if (isLoading) {
     return (
      <Card className="mt-8 shadow-md animate-pulse">
        <CardHeader>
          <div className="h-6 bg-muted rounded w-1/2"></div>
           <div className="h-4 bg-muted rounded w-3/4 mt-2"></div>
        </CardHeader>
        <CardContent className="space-y-3">
           <div className="h-4 bg-muted rounded w-full"></div>
           <div className="h-4 bg-muted rounded w-5/6"></div>
           <div className="h-4 bg-muted rounded w-full"></div>
           {/* Placeholder for notes */}
           <div className="h-4 bg-muted rounded w-1/3 mt-4"></div>
           <div className="h-4 bg-muted rounded w-4/5"></div>
        </CardContent>
      </Card>
    );
  }

  // Only render if not loading AND there are recommendations or notes to show
  if (!isLoading && (!recommendations || recommendations.length === 0) && !notes) {
    return null;
  }

  // Even if recommendations are empty, show the card if there are notes
  const shouldRenderCard = recommendations?.length || notes;

  if (!shouldRenderCard) {
    return null;
  }


  return (
    <Card className="mt-8 shadow-md">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        {recommendations && recommendations.length > 0 && (
          <ul className="list-disc space-y-2 pl-5 text-sm mb-4">
            {recommendations.map((recipe, index) => (
              <li key={index} className="text-foreground">{recipe}</li>
            ))}
          </ul>
        )}
         {notes && (
             <div>
               <h4 className="text-sm font-semibold mb-1 text-muted-foreground">Notes:</h4>
               <p className="text-sm text-muted-foreground">{notes}</p>
             </div>
           )}
         {!recommendations?.length && !notes && !isLoading && (
              <p className="text-sm text-muted-foreground">No suggestions generated yet. Click the button above to get ideas!</p>
          )}
      </CardContent>
    </Card>
  );
};
