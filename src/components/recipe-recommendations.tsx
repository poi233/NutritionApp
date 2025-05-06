"use client";

import type { FC } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface RecipeRecommendationsProps {
  recommendations: string[] | null;
  isLoading: boolean;
}

export const RecipeRecommendations: FC<RecipeRecommendationsProps> = ({ recommendations, isLoading }) => {
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
        </CardContent>
      </Card>
    );
  }

  if (!recommendations || recommendations.length === 0) {
    return null; // Don't render if no recommendations or loading finished without results
  }

  return (
    <Card className="mt-8 shadow-md">
      <CardHeader>
        <CardTitle>New Recipe Ideas</CardTitle>
        <CardDescription>Try these recipes based on your profile!</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="list-disc space-y-2 pl-5 text-sm">
          {recommendations.map((recipe, index) => (
            <li key={index} className="text-foreground">{recipe}</li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
};
