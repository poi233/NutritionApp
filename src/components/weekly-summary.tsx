
"use client";

import type { FC } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ShoppingCart, RefreshCw, AlertTriangle } from "lucide-react";
import { format, parseISO } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import type { AggregatedIngredient } from "@/services/pricing";

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

  return (
    <Card className="mt-8 shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center">
          <ShoppingCart className="mr-2 h-5 w-5 text-primary" />
          {title} - {weekDisplay}
        </CardTitle>
        <CardDescription>
          {totalEstimatedPriceLabel}:{" "}
          {isLoadingPrice ? (
            <span className="inline-flex items-center">
              <RefreshCw className="mr-1 h-4 w-4 animate-spin" /> {priceLoadingMessage}
            </span>
          ) : estimatedPrice !== null ? (
            <span className="font-semibold text-accent">
              {currencySymbol}{estimatedPrice.toFixed(2)}
            </span>
          ) : (
            <span className="inline-flex items-center text-destructive">
              <AlertTriangle className="mr-1 h-4 w-4" /> {priceErrorMessage}
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <h3 className="text-lg font-semibold mb-2">{ingredientsListLabel}</h3>
        {aggregatedIngredients.length > 0 ? (
          <ScrollArea className="h-[200px] rounded-md border p-2">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>食材名称</TableHead>
                  <TableHead className="text-right">总量 ({quantityLabel})</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {aggregatedIngredients.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>{item.name}</TableCell>
                    <TableCell className="text-right">{item.totalQuantity.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        ) : (
          <p className="text-sm text-muted-foreground">{noIngredientsMessage}</p>
        )}
      </CardContent>
    </Card>
  );
};
