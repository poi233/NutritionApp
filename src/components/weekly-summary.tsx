
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
import { cn } from "@/lib/utils"; // Import cn utility

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
  // New prop for compact display
  isCompact?: boolean;
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
  isCompact = false, // Default to false
}) => {
  const weekDisplay = format(parseISO(weekStartDate), 'MMM d, yyyy', { locale: zhCN });
  const categorizedIngredients = groupIngredientsByCategory(aggregatedIngredients);

  return (
    <Card className={cn("shadow-md", isCompact ? "shadow-none border-none" : "")}>
      <CardHeader className={cn("py-3 px-4", isCompact ? "p-0 mb-1" : "")}>
        <CardTitle className={cn("flex items-center text-base", isCompact ? "text-sm font-semibold" : "")}>
          <ShoppingCart className={cn("mr-2 h-4 w-4 text-primary", isCompact ? "h-3 w-3" : "")} />
          {isCompact ? title : `${title} - ${weekDisplay}`}
        </CardTitle>
        <CardDescription className="text-xs">
          {totalEstimatedPriceLabel}:{" "}
          {isLoadingPrice ? (
            <span className="inline-flex items-center">
              <RefreshCw className="mr-1 h-3 w-3 animate-spin" /> {priceLoadingMessage}
            </span>
          ) : estimatedPrice !== null ? (
            <span className={cn("font-semibold", isCompact ? "" : "text-accent")}>
              {currencySymbol}{estimatedPrice.toFixed(2)}
            </span>
          ) : (
            <span className="inline-flex items-center text-destructive">
              <AlertTriangle className="mr-1 h-3 w-3" /> {priceErrorMessage}
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className={cn("pt-0 pb-3 px-4", isCompact ? "p-0" : "")}>
        <h3 className={cn("text-sm font-semibold mb-1", isCompact ? "text-xs mt-1" : "")}>{ingredientsListLabel}</h3>
        {aggregatedIngredients.length > 0 ? (
          <ScrollArea className={cn("rounded-md border p-1", isCompact ? "h-[120px] border-none p-0" : "h-[200px]")}>
            {INGREDIENT_CATEGORIES_ORDERED.map(category => {
              const itemsInCategory = categorizedIngredients[category];
              if (!itemsInCategory || itemsInCategory.length === 0) {
                return null;
              }
              return (
                <div key={category} className="mb-2 last:mb-0">
                  <h4 className={cn("text-xs font-semibold text-primary mb-1 sticky top-0 bg-background/95 p-1 z-10 -ml-1 -mr-1 pl-2 rounded-t-sm", isCompact ? "text-[10px] p-0.5 pl-1 bg-card/95" : "")}>
                    {category}
                  </h4>
                  {/* Simplified table for compact view */}
                  {isCompact ? (
                    <ul className="text-[10px] space-y-0.5 pl-1">
                      {itemsInCategory.map((item, index) => (
                         <li key={`${category}-${index}-${item.name}`} className="flex justify-between">
                           <span>{item.name}</span>
                           <span className="text-muted-foreground">{item.totalQuantity.toLocaleString()} {quantityLabel}</span>
                         </li>
                      ))}
                    </ul>
                   ) : (
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
                  )}
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

