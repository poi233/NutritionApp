
"use client";

import type { FC } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ShoppingCart, RefreshCw, AlertTriangle } from "lucide-react";
import { format, parseISO } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import type { AggregatedIngredient } from "@/services/pricing";
import { INGREDIENT_CATEGORIES_ORDERED, groupIngredientsByCategory, type IngredientCategory } from "@/lib/ingredient-categories";

interface WeeklySummaryProps {
  aggregatedIngredients: AggregatedIngredient[];
  estimatedPrice: number | null;
  isLoadingPrice: boolean;
  weekStartDate: string;
  // Translation props
  title: string;
  totalEstimatedPriceLabel: string;
  ingredientsListLabel: string;
  noIngredientsMessage: string;
  priceLoadingMessage: string;
  priceErrorMessage: string;
  quantityLabel: string;
  currencySymbol: string;
}

export const WeeklySummary: FC<WeeklySummaryProps> = ({
  aggregatedIngredients,
  estimatedPrice,
  isLoadingPrice,
  weekStartDate,
  title,
  totalEstimatedPriceLabel,
  ingredientsListLabel,
  noIngredientsMessage,
  priceLoadingMessage,
  priceErrorMessage,
  quantityLabel,
  currencySymbol,
}) => {
  const weekDisplay = format(parseISO(weekStartDate), 'MMM d, yyyy', { locale: zhCN });
  const categorizedIngredients = groupIngredientsByCategory(aggregatedIngredients);

  return (
    <Card className="shadow-md">
      <CardHeader className="py-3 px-4">
        <CardTitle className="flex items-center text-base">
          <ShoppingCart className="mr-2 h-4 w-4 text-primary" />
          {title} - {weekDisplay}
        </CardTitle>
        <CardDescription className="text-xs">
          {totalEstimatedPriceLabel}:{" "}
          {isLoadingPrice ? (
            <span className="inline-flex items-center">
              <RefreshCw className="mr-1 h-3 w-3 animate-spin" /> {priceLoadingMessage}
            </span>
          ) : estimatedPrice !== null ? (
            <span className="font-semibold text-accent">
              {currencySymbol}{estimatedPrice.toFixed(2)}
            </span>
          ) : (
            <span className="inline-flex items-center text-destructive">
              <AlertTriangle className="mr-1 h-3 w-3" /> {priceErrorMessage}
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0 pb-3 px-4">
        <h3 className="text-sm font-semibold mb-1">{ingredientsListLabel}</h3>
        {aggregatedIngredients.length > 0 ? (
          <ScrollArea className="h-[200px] rounded-md border p-1">
            {INGREDIENT_CATEGORIES_ORDERED.map(category => {
              const itemsInCategory = categorizedIngredients[category];
              if (!itemsInCategory || itemsInCategory.length === 0) {
                return null;
              }
              return (
                <div key={category} className="mb-2 last:mb-0">
                  <h4 className="text-xs font-semibold text-primary mb-1 sticky top-0 bg-background/95 p-1 z-10 -ml-1 -mr-1 pl-2 rounded-t-sm">
                    {category}
                  </h4>
                  <Table className="mt-0">
                    <TableBody>
                      {itemsInCategory.map((item, index) => (
                        <TableRow key={`${category}-${index}-${item.name}`}>
                          <TableCell className="py-0.5 px-1 text-xs">{item.name}</TableCell>
                          <TableCell className="text-right py-0.5 px-1 text-xs">{item.totalQuantity.toLocaleString()} {quantityLabel}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              );
            })}
          </ScrollArea>
        ) : (
          <p className="text-xs text-muted-foreground">{noIngredientsMessage}</p>
        )}
      </CardContent>
    </Card>
  );
};
