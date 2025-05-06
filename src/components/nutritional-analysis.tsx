"use client";

import type { FC } from "react";
import type { AnalyzeNutritionalBalanceOutput } from "@/ai/flows/analyze-nutritional-balance";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface NutritionalAnalysisProps {
  analysis: AnalyzeNutritionalBalanceOutput | null;
  isLoading: boolean;
}

// Helper to format chart data
const formatChartData = (analysis: AnalyzeNutritionalBalanceOutput) => {
  return analysis.analyzedRecipes.map(recipe => ({
    name: recipe.name,
    Calories: recipe.totalCalories.toFixed(0),
    Protein: recipe.totalProtein.toFixed(1),
    Fat: recipe.totalFat.toFixed(1),
    Carbs: recipe.totalCarbohydrates.toFixed(1),
  }));
};


export const NutritionalAnalysis: FC<NutritionalAnalysisProps> = ({ analysis, isLoading }) => {
  if (isLoading) {
    return (
      <Card className="mt-8 shadow-md animate-pulse">
        <CardHeader>
          <div className="h-6 bg-muted rounded w-3/4"></div>
          <div className="h-4 bg-muted rounded w-1/2 mt-2"></div>
        </CardHeader>
        <CardContent className="space-y-4">
           <div className="h-4 bg-muted rounded w-full"></div>
           <div className="h-4 bg-muted rounded w-5/6"></div>
           <div className="h-4 bg-muted rounded w-3/4"></div>
           <Separator className="my-4" />
           <div className="h-4 bg-muted rounded w-1/3"></div>
           <div className="h-4 bg-muted rounded w-full"></div>
           <div className="h-4 bg-muted rounded w-5/6"></div>
        </CardContent>
      </Card>
    );
  }

  if (!analysis) {
    return null; // Don't render anything if no analysis is available yet
  }

  const chartData = formatChartData(analysis);

  return (
    <Card className="mt-8 shadow-md">
      <CardHeader>
        <CardTitle>Nutritional Analysis</CardTitle>
        <CardDescription>Insights based on your weekly recipes.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-2">Overall Balance</h3>
          <p className="text-sm text-muted-foreground">{analysis.nutritionalInsights.overallBalance}</p>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-2">Macronutrient Ratio</h3>
          <p className="text-sm text-muted-foreground">{analysis.nutritionalInsights.macroNutrientRatio}</p>
        </div>

         {analysis.nutritionalInsights.suggestions && analysis.nutritionalInsights.suggestions.length > 0 && (
           <div>
             <h3 className="text-lg font-semibold mb-2">Suggestions for Improvement</h3>
             <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
               {analysis.nutritionalInsights.suggestions.map((suggestion, index) => (
                 <li key={index}>{suggestion}</li>
               ))}
             </ul>
           </div>
         )}


        <Separator className="my-6" />

        <div>
          <h3 className="text-lg font-semibold mb-4">Recipe Breakdown</h3>
           <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius)' }}
                  itemStyle={{ color: 'hsl(var(--foreground))' }}
                 />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="Calories" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Protein" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Fat" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Carbs" fill="hsl(var(--chart-4))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
           </div>
        </div>


      </CardContent>
    </Card>
  );
};
