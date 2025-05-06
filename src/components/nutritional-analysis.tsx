"use client";

import type { FC } from "react";
import type { AnalyzeNutritionalBalanceOutput } from "@/ai/flows/analyze-nutritional-balance";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, parseISO } from 'date-fns';


interface NutritionalAnalysisProps {
  analysis: AnalyzeNutritionalBalanceOutput | null;
  isLoading: boolean;
  weekStartDate: string; // ISO string date for the start of the week
}

// Helper to format chart data - uses contextual name from analysis
const formatChartData = (analysis: AnalyzeNutritionalBalanceOutput) => {
  return analysis.analyzedRecipes.map(recipe => ({
    // Use the name provided by the analysis (which includes context)
    // Truncate long names for better chart display
    name: recipe.name.length > 25 ? `${recipe.name.substring(0, 22)}...` : recipe.name,
    // Store the full name for the tooltip
    fullName: recipe.name,
    Calories: parseFloat(recipe.totalCalories.toFixed(0)),
    Protein: parseFloat(recipe.totalProtein.toFixed(1)),
    Fat: parseFloat(recipe.totalFat.toFixed(1)),
    Carbs: parseFloat(recipe.totalCarbohydrates.toFixed(1)),
  }));
};

// Custom Tooltip Content - Displays the full name from payload
const CustomTooltip: FC<any> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload; // Get the full data object for the bar
    return (
      <div className="rounded-lg border bg-background p-2 shadow-sm">
        {/* Show full name from the data payload */}
        <p className="mb-1 font-medium">{data.fullName || label}</p>
        {payload.map((entry: any, index: number) => (
           <p key={`item-${index}`} className="text-sm" style={{ color: entry.color }}>
             {`${entry.name}: ${entry.value?.toLocaleString()}${entry.name === 'Calories' ? '' : 'g'}`}
           </p>
        ))}
      </div>
    );
  }
  return null;
};


export const NutritionalAnalysis: FC<NutritionalAnalysisProps> = ({ analysis, isLoading, weekStartDate }) => {
  const weekDisplay = format(parseISO(weekStartDate), 'MMM d, yyyy');

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
           <div className="h-40 bg-muted rounded mt-4"></div> {/* Placeholder for chart */}
        </CardContent>
      </Card>
    );
  }

  if (!analysis) {
     // Optional: Show a placeholder if no analysis has been run yet
     return (
       <Card className="mt-8 shadow-md border-dashed border-muted-foreground/50">
         <CardHeader>
           <CardTitle className="text-lg text-muted-foreground">Nutritional Analysis</CardTitle>
           <CardDescription>Add meals with ingredients and click 'Analyze Nutrition' to see insights.</CardDescription>
         </CardHeader>
         <CardContent>
            <p className="text-sm text-muted-foreground text-center py-4">No analysis data available.</p>
         </CardContent>
       </Card>
     );
  }

   // Only render the full analysis if there are insights
   if (!analysis.nutritionalInsights) {
       return (
         <Card className="mt-8 shadow-md">
           <CardHeader>
             <CardTitle>Nutritional Analysis</CardTitle>
             <CardDescription>Week starting {weekDisplay}</CardDescription>
           </CardHeader>
           <CardContent>
              <p className="text-sm text-muted-foreground">Could not generate nutritional insights.</p>
           </CardContent>
         </Card>
       );
   }

  const chartData = formatChartData(analysis);

  return (
    <Card className="mt-8 shadow-md">
      <CardHeader>
        <CardTitle>Weekly Nutritional Analysis</CardTitle>
        <CardDescription>Insights for week starting {weekDisplay} based on meals with ingredients.</CardDescription>
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
          <h3 className="text-lg font-semibold mb-4">Analyzed Meal Breakdown</h3>
           {chartData.length > 0 ? (
             <div className="h-[350px] w-full"> {/* Increased height slightly */}
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 70 }}> {/* Adjusted margins */}
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  {/* Increased angle, interval, and height for better readability */}
                  <XAxis
                     dataKey="name" // This now includes day/meal context
                     fontSize={9} // Slightly smaller font
                     tickLine={false}
                     axisLine={false}
                     angle={-55} // More angle
                     textAnchor="end" // Anchor angled text
                     height={70} // Increase height significantly for angled text
                     interval={0} // Show all labels if possible
                   />
                  <YAxis fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip
                    content={<CustomTooltip />}
                    cursor={{ fill: 'hsl(var(--muted))' }}
                   />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '15px' }} /> {/* Added more padding */}
                  {/* Use distinct colors from theme */}
                  <Bar dataKey="Calories" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Protein" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Fat" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Carbs" fill="hsl(var(--chart-4))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
             </div>
            ) : (
                <p className="text-sm text-muted-foreground">No meals with ingredients were analyzed to display in the chart.</p>
            )}
        </div>
      </CardContent>
    </Card>
  );
};
