"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import type { Recipe, Ingredient } from "@/types/recipe";
import { RecipeInputForm, type RecipeFormData } from "@/components/recipe-input-form";
import { WeeklyPlanner } from "@/components/weekly-planner";
import { NutritionalAnalysis } from "@/components/nutritional-analysis";
import { WeeklySummary } from "@/components/weekly-summary";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { analyzeNutritionalBalance, type AnalyzeNutritionalBalanceOutput, type AnalyzeNutritionalBalanceInput } from "@/ai/flows/analyze-nutritional-balance";
import { generateWeeklyRecipes, type GenerateWeeklyRecipesOutput, type GenerateWeeklyRecipesInput } from "@/ai/flows/generate-weekly-recipes";
import { ChefHat, ListChecks, RefreshCw, Calendar, ArrowLeft, ArrowRight, PlusSquare, AlertTriangle, Trash2, Check, FileText, PanelLeftOpen, PanelRightOpen, X } from "lucide-react";
import { startOfWeek, endOfWeek, addWeeks, subWeeks, format, parseISO } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"; 
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getNutrition } from "@/services/nutrition";
import { estimateTotalPriceForIngredients, type AggregatedIngredient } from "@/services/pricing";

import {
  SidebarProvider, 
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarInset,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from "@/components/ui/sheet";


// Basic Error Boundary for client-side component errors
class ClientErrorBoundary extends React.Component<{ children: React.ReactNode, fallback?: React.ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("客户端组件错误边界捕获:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
          <div className="w-full p-4 border border-destructive rounded-md bg-destructive/10 text-destructive">
            <h2 className="font-bold flex items-center gap-2"><AlertTriangle size={18} /> 组件加载时出错</h2>
            <p className="text-sm mt-2">此部分应用程序遇到渲染问题。</p>
            {this.state.error && <pre className="text-xs mt-2 bg-destructive/20 p-2 rounded whitespace-pre-wrap">{this.state.error.toString()}</pre>}
          </div>
      );
    }
    return this.props.children;
  }
}


interface UserPreferences {
  dietaryNeeds?: string;
  preferences?: string;
}

const daysOfWeek = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];
const mealTypes = ["早餐", "午餐", "晚餐"];

const getWeekStartDate = (date: Date): string => {
  return format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd');
};

const estimateRecipeNutrition = async (recipe: Recipe): Promise<Recipe> => {
    let totalCalories = 0;
    let totalProtein = 0;
    let totalFat = 0;
    let totalCarbohydrates = 0;

    if (!recipe.ingredients || recipe.ingredients.length === 0) {
        console.warn(`食谱 "${recipe.name}" 没有用于营养估算的成分。`);
        return {
            ...recipe,
            calories: 0,
            protein: 0,
            fat: 0,
            carbohydrates: 0,
        };
    }

    for (const ingredient of recipe.ingredients) {
        try {
          const quantity = ingredient.quantity || 0;
          if (quantity <= 0) continue;

          const nutrition = await getNutrition(ingredient.name);
          const factor = quantity / 100;

          totalCalories += (nutrition.calories || 0) * factor;
          totalProtein += (nutrition.protein || 0) * factor;
          totalFat += (nutrition.fat || 0) * factor;
          totalCarbohydrates += (nutrition.carbohydrates || 0) * factor;
        } catch (error) {
             console.warn(`估算食谱 "${recipe.name}" 时无法获取成分 "${ingredient.name}" 的营养信息：`, error);
        }
    }

    return {
        ...recipe,
        calories: parseFloat(totalCalories.toFixed(0)),
        protein: parseFloat(totalProtein.toFixed(1)),
        fat: parseFloat(totalFat.toFixed(1)),
        carbohydrates: parseFloat(totalCarbohydrates.toFixed(1)),
    };
};

const daysOfWeekChineseMapReverse: { [key: string]: string } = {
  Monday: "周一", Tuesday: "周二", Wednesday: "周三", Thursday: "周四", Friday: "周五", Saturday: "周六", Sunday: "周日"
};
const mealTypesChineseMapReverse: { [key: string]: string } = {
  Breakfast: "早餐", Lunch: "午餐", Dinner: "晚餐"
};


function HomePageContent() {
  console.log("HomePageContent component rendering/re-rendering.");
  const [weeklyRecipes, setWeeklyRecipes] = useState<{ [weekStartDate: string]: Recipe[] }>({});
  const [currentWeekStartDate, setCurrentWeekStartDate] = useState<string>(() => getWeekStartDate(new Date()));
  const [nutritionalAnalysis, setNutritionalAnalysis] = useState<AnalyzeNutritionalBalanceOutput | null>(null);

  const [isGeneratePreferencesDialogOpen, setIsGeneratePreferencesDialogOpen] = useState(false);
  const [generateDialogPreferences, setGenerateDialogPreferences] = useState<UserPreferences>({ dietaryNeeds: "", preferences: "中餐 (Chinese food)" });

  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);
  const [isLoadingGeneration, setIsLoadingGeneration] = useState(false);
  const [isLoadingPrice, setIsLoadingPrice] = useState(false);
  const [estimatedPrice, setEstimatedPrice] = useState<number | null>(null);
  const [isAddRecipeDialogOpen, setIsAddRecipeDialogOpen] = useState(false);
  const [isClearWeekDialogOpen, setIsClearWeekDialogOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [isSidebarSheetOpen, setIsSidebarSheetOpen] = useState(false);


  useEffect(() => {
    console.log("HomePageContent component mounted on client.");
    setIsClient(true);
    const initialWeekStart = getWeekStartDate(new Date());
    console.log("Setting initial week start date:", initialWeekStart);
    setCurrentWeekStartDate(initialWeekStart);
  }, []);


  const currentWeekRecipes = useMemo(() => {
       if (!isClient) {
           console.log("Deriving currentWeekRecipes (server-side): returning empty array.");
           return [];
       }
       const recipesForWeek = weeklyRecipes[currentWeekStartDate] || [];
        console.log(`Deriving currentWeekRecipes for ${currentWeekStartDate} (client-side): Found ${recipesForWeek.length} recipes.`);
      return recipesForWeek;
  }, [weeklyRecipes, currentWeekStartDate, isClient]);

  const aggregatedIngredientsForCurrentWeek = useMemo(() => {
    if (!isClient || currentWeekRecipes.length === 0) {
      return [];
    }
    const ingredientMap = new Map<string, number>();
    currentWeekRecipes.forEach(recipe => {
      if (recipe.ingredients) {
        recipe.ingredients.forEach(ingredient => {
          if (ingredient.name && ingredient.quantity > 0) {
            const currentQuantity = ingredientMap.get(ingredient.name) || 0;
            ingredientMap.set(ingredient.name, currentQuantity + ingredient.quantity);
          }
        });
      }
    });
    return Array.from(ingredientMap.entries()).map(([name, totalQuantity]) => ({
      name,
      totalQuantity,
    }));
  }, [currentWeekRecipes, isClient]);

  useEffect(() => {
    if (isClient && aggregatedIngredientsForCurrentWeek.length > 0) {
      setIsLoadingPrice(true);
      setEstimatedPrice(null);
      console.log("Estimating price for aggregated ingredients:", aggregatedIngredientsForCurrentWeek);
      estimateTotalPriceForIngredients(aggregatedIngredientsForCurrentWeek)
        .then(price => {
          console.log("Estimated total price:", price);
          setEstimatedPrice(price);
        })
        .catch(error => {
          console.error("估算总价时出错:", error);
          toast({
            title: "价格估算失败",
            description: "无法估算本周食材的总价。",
            variant: "destructive",
          });
          setEstimatedPrice(null);
        })
        .finally(() => {
          setIsLoadingPrice(false);
        });
    } else if (isClient && aggregatedIngredientsForCurrentWeek.length === 0) {
        setEstimatedPrice(0);
        setIsLoadingPrice(false);
    }
  }, [aggregatedIngredientsForCurrentWeek, isClient, toast]);


   useEffect(() => {
     if (isClient) {
        console.log("Attempting to load data from localStorage.");
       try {
         const storedWeeklyRecipes = localStorage.getItem("nutrijournal_weekly_recipes");
         if (storedWeeklyRecipes) {
            const parsedRecipes = JSON.parse(storedWeeklyRecipes);
            console.log("Loaded weekly recipes from localStorage:", parsedRecipes);
           setWeeklyRecipes(parsedRecipes);
         } else {
             console.log("No weekly recipes found in localStorage.");
         }
          setGenerateDialogPreferences({ dietaryNeeds: "", preferences: "中餐 (Chinese food)" });
       } catch (error) {
         console.error("从 localStorage 加载数据时出错:", error);
         toast({
           title: "加载数据出错",
           description: "无法加载已保存的计划。",
           variant: "destructive",
         });
       }
     }
   }, [isClient, toast]);


  useEffect(() => {
     if (isClient) {
        console.log("Weekly recipes changed, attempting to save to localStorage:", weeklyRecipes);
       try {
          if (Object.keys(weeklyRecipes).length > 0) {
             localStorage.setItem("nutrijournal_weekly_recipes", JSON.stringify(weeklyRecipes));
             console.log("Saved weekly recipes to localStorage.");
           } else {
              localStorage.removeItem("nutrijournal_weekly_recipes");
              console.log("Removed weekly recipes from localStorage (object was empty).");
           }
       } catch (error) {
          console.error("将每周食谱保存到 localStorage 时出错:", error);
       }
     }
  }, [weeklyRecipes, isClient]);


   useEffect(() => {
      console.log("Current week changed to:", currentWeekStartDate, "Clearing nutritional analysis and estimated price.");
     setNutritionalAnalysis(null);
     setEstimatedPrice(null);
   }, [currentWeekStartDate]);

   const goToPreviousWeek = () => {
      if (!isClient) return;
       console.log("Navigating to previous week.");
      setCurrentWeekStartDate(prev => getWeekStartDate(subWeeks(parseISO(prev), 1)));
   };

   const goToNextWeek = () => {
      if (!isClient) return;
       console.log("Navigating to next week.");
      setCurrentWeekStartDate(prev => getWeekStartDate(addWeeks(parseISO(prev), 1)));
   };

   const formatWeekDisplay = (startDate: string): string => {
       if (!startDate) {
           console.warn("formatWeekDisplay called with invalid startDate:", startDate);
           return "无效日期";
       }
      try {
        const start = parseISO(startDate);
        const end = endOfWeek(start, { weekStartsOn: 1 });
        return `${format(start, 'MMM d', { locale: zhCN })} - ${format(end, 'MMM d, yyyy', { locale: zhCN })}`;
      } catch (error) {
          console.error("格式化周显示时出错:", error, "Input:", startDate);
          return "无效日期";
      }
   }

   const handleAddRecipe = useCallback(async (newRecipeData: RecipeFormData) => {
    if (!isClient) return;
     console.log("handleAddRecipe called with data:", newRecipeData);
    const recipeId = `recipe-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    let newRecipe: Recipe = {
        ...newRecipeData,
        id: recipeId,
        weekStartDate: currentWeekStartDate,
        ingredients: newRecipeData.ingredients
          .filter(ing => ing.name && ing.quantity > 0)
          .map((ing, index) => ({
            id: `ingredient-gen-${recipeId}-${index}`,
            name: ing.name,
            quantity: Number(ing.quantity) || 0,
          })),
        calories: undefined,
        protein: undefined,
        fat: undefined,
        carbohydrates: undefined,
        description: newRecipeData.description || "",
    };

    if (newRecipe.ingredients.length > 0) {
      try {
        console.log(`正在为 ${newRecipe.name} 估算营养...`);
        newRecipe = await estimateRecipeNutrition(newRecipe);
        console.log(`为 ${newRecipe.name} 估算的营养:`, {calories: newRecipe.calories, protein: newRecipe.protein, fat: newRecipe.fat, carbs: newRecipe.carbohydrates});
      } catch (error) {
        console.error("添加食谱时估算营养出错:", error);
        toast({
           title: "营养估算失败",
           description: "无法为添加的餐点估算营养。",
           variant: "destructive",
        });
      }
    } else {
        console.log(`食谱 "${newRecipe.name}" 添加时没有成分，跳过营养估算。`);
    }

    setWeeklyRecipes((prevWeekly => {
       console.log("Updating weekly recipes state with new recipe for week:", currentWeekStartDate);
      const updatedWeek = [...(prevWeekly[currentWeekStartDate] || []), newRecipe];
      const newState = { ...prevWeekly, [currentWeekStartDate]: updatedWeek };
      console.log("New weeklyRecipes state:", newState);
      return newState;
    }));

     setNutritionalAnalysis(null);
     setEstimatedPrice(null);
    toast({
      title: "餐点已添加",
      description: `${newRecipe.dayOfWeek} ${newRecipe.mealType} 的 ${newRecipe.name} 已添加。您可以继续添加或关闭窗口。`,
    });
  }, [currentWeekStartDate, toast, isClient]);

  const handleDeleteRecipe = (recipeId: string) => {
     if (!isClient) return;
      console.log("handleDeleteRecipe called for recipe ID:", recipeId);
     let deletedRecipeName = "餐点";
     setWeeklyRecipes((prevWeekly) => {
        const weekRecipes = prevWeekly[currentWeekStartDate] || [];
        const recipeToDelete = weekRecipes.find(r => r.id === recipeId);
        if (recipeToDelete) {
            deletedRecipeName = recipeToDelete.name;
             console.log(`Found recipe to delete: ${deletedRecipeName}`);
        } else {
             console.warn(`Recipe with ID ${recipeId} not found in current week ${currentWeekStartDate} for deletion.`);
             return prevWeekly;
        }

        const updatedWeek = weekRecipes.filter(recipe => recipe.id !== recipeId);
         console.log(`Recipes remaining in week ${currentWeekStartDate} after deletion:`, updatedWeek.length);

         if (updatedWeek.length === 0) {
              console.log(`Removing week key ${currentWeekStartDate} as it's now empty.`);
              const { [currentWeekStartDate]: _, ...rest } = prevWeekly;
              if (Object.keys(rest).length === 0) {
                   console.log("Weekly recipes object is now completely empty.");
                  return {};
              }
              console.log("Remaining weeks:", Object.keys(rest));
              return rest;
         }
        const newState = { ...prevWeekly, [currentWeekStartDate]: updatedWeek };
         console.log("New weeklyRecipes state after deletion:", newState);
        return newState;
     });
     setNutritionalAnalysis(null);
     setEstimatedPrice(null);
      toast({
        title: "餐点已移除",
        description: `"${deletedRecipeName}" 已从此周计划中移除。`,
        variant: "destructive",
      });
  };

  const handleRemoveAllRecipes = useCallback(() => {
       if (!isClient) return;
       console.log("handleRemoveAllRecipes called for week:", currentWeekStartDate);
        setWeeklyRecipes((prevWeekly) => {
            const { [currentWeekStartDate]: _, ...rest } = prevWeekly;
             if (Object.keys(rest).length === 0) {
                 console.log("Weekly recipes object is now completely empty after clearing week.");
                return {};
             }
             console.log("Remaining weeks after clearing:", Object.keys(rest));
            return rest;
        });
        setNutritionalAnalysis(null);
        setEstimatedPrice(0);
        setIsClearWeekDialogOpen(false);
        toast({
            title: "本周已清空",
            description: `从 ${isClient ? format(parseISO(currentWeekStartDate), 'MMM d', { locale: zhCN }) : '本周'} 开始的一周的所有餐点都已被移除。`,
            variant: "destructive",
        });
   }, [currentWeekStartDate, toast, isClient]);


  const triggerAnalysis = useCallback(async () => {
    if (!isClient) return;
    console.log("triggerAnalysis called.");
    if (currentWeekRecipes.length === 0) {
        console.log("Analysis trigger failed: No recipes in the current week.");
      toast({
        title: "没有餐点",
        description: "请先添加本周的一些餐点再进行分析。",
        variant: "destructive",
      });
      return;
    }

    const recipesWithIngredients = currentWeekRecipes.filter(r => r.ingredients && r.ingredients.length > 0 && r.ingredients.some(i => i.quantity > 0));
    if (recipesWithIngredients.length === 0) {
        console.log("Analysis trigger failed: No recipes have ingredients with quantity > 0.");
        toast({
            title: "没有成分",
            description: "分析需要带有成分和数量的餐点。请为您的餐点添加详细信息。",
            variant: "destructive",
        });
        return;
    }
     if (recipesWithIngredients.length < currentWeekRecipes.length) {
         console.log("Analysis trigger: Some recipes excluded due to missing/zero quantity ingredients.");
        toast({
            title: "部分分析",
            description: "一些没有成分（或数量为零）的餐点将从分析中排除。",
            variant: "default",
        });
    }


    setIsLoadingAnalysis(true);
    setNutritionalAnalysis(null);

    try {
       const analysisInput: AnalyzeNutritionalBalanceInput = {
         recipes: recipesWithIngredients.map(r => ({
           name: `${r.name} (${r.dayOfWeek} ${r.mealType})`,
           ingredients: r.ingredients
                        .filter(i => i.name && i.quantity > 0)
                        .map(i => ({ name: i.name, quantity: i.quantity })),
         })).filter(r => r.ingredients.length > 0),
       };

       if (analysisInput.recipes.length === 0) {
           console.log("Analysis trigger failed: No recipes remaining after filtering for valid ingredients.");
           toast({
               title: "没有用于分析的有效成分",
               description: "没有一个餐点含有名称和数量大于零的有效成分。",
               variant: "destructive",
           });
           setIsLoadingAnalysis(false);
           return;
       }

       console.log("调用 analyzeNutritionalBalance 流程，输入：", JSON.stringify(analysisInput, null, 2));
       const result = await analyzeNutritionalBalance(analysisInput);
       console.log("收到分析结果：", result);

        if (!result || !result.nutritionalInsights) {
             console.error("分析完成，但返回无效的数据结构:", result);
              throw new Error("分析完成，但返回无效的数据。");
         }

       setNutritionalAnalysis(result);
       toast({
         title: "分析完成",
         description: "已为本周生成营养见解。",
       });
    } catch (error) {
       console.error("在 triggerAnalysis 调用 analyzeNutritionalBalance 时出错:", error);
        const errorMessage = error instanceof Error ? error.message : "分析期间发生未知错误。";

       toast({
         title: "分析失败",
         description: (
             <>
                {errorMessage.includes("无效的 Google AI API 密钥") || errorMessage.includes("API 密钥错误") || errorMessage.includes("API Key issue") ? (
                    <>
                        <AlertTriangle className="inline h-4 w-4 mr-1" />
                         API 密钥错误。请检查 `.env` 中的 GOOGLE_API_KEY 并重启服务器。
                    </>
                ) : (
                    errorMessage
                )}
                <br /> 检查浏览器控制台和服务器日志以获取更多详细信息。
             </>
         ),
         variant: "destructive",
         duration: 8000,
       });
        setNutritionalAnalysis(null);
    } finally {
        console.log("Analysis process finished.");
       setIsLoadingAnalysis(false);
    }
  }, [currentWeekRecipes, toast, isClient]);


  const actualGenerateWeeklyRecipesLogic = useCallback(async (prefs: UserPreferences) => {
    if (!isClient) return;
    console.log("actualGenerateWeeklyRecipesLogic called with preferences:", prefs);
    setIsLoadingGeneration(true);

    let previousWeekRecipesString: string | undefined = undefined;
    try {
        const previousWeekStartDate = getWeekStartDate(subWeeks(parseISO(currentWeekStartDate), 1));
        const previousWeekRecipes = weeklyRecipes[previousWeekStartDate] || [];
        console.log(`Found ${previousWeekRecipes.length} recipes from previous week (${previousWeekStartDate})`);
        previousWeekRecipesString = previousWeekRecipes.length > 0
            ? previousWeekRecipes.map(recipe =>
                 `日期: ${recipe.dayOfWeek}, 餐别: ${recipe.mealType}, 食谱: ${recipe.name}\n${recipe.ingredients && recipe.ingredients.length > 0 ? `成分:\n${recipe.ingredients.filter(i=>i.name && i.quantity>0).map(ing => `- ${ing.name} (${ing.quantity}克)`).join('\n')}` : '(未列出成分)'}`
               ).join('\n\n')
            : undefined;
        console.log("Previous week recipes string (for prompt):", previousWeekRecipesString);
    } catch (error) {
        console.error("处理上周食谱时出错:", error);
    }

    let existingCurrentWeekRecipesString: string | undefined = undefined;
    try {
        const existingRecipes = weeklyRecipes[currentWeekStartDate] || [];
        console.log(`Found ${existingRecipes.length} existing recipes for current week (${currentWeekStartDate})`);
        existingCurrentWeekRecipesString = existingRecipes.length > 0
            ? existingRecipes.map(recipe =>
                `日期: ${recipe.dayOfWeek}, 餐别: ${recipe.mealType}, 食谱: ${recipe.name}`
              ).join('\n')
            : undefined;
         console.log("Existing current week recipes string (for prompt):", existingCurrentWeekRecipesString);
    } catch (error) {
         console.error("处理本周食谱时出错:", error);
    }

    try {
       const generationInput: GenerateWeeklyRecipesInput = {
         weekStartDate: currentWeekStartDate,
         dietaryNeeds: prefs.dietaryNeeds || "未指定",
         preferences: prefs.preferences || "未指定, 偏爱中餐",
         previousWeekRecipes: previousWeekRecipesString,
         existingCurrentWeekRecipes: existingCurrentWeekRecipesString,
       };

       console.log("调用 generateWeeklyRecipes 流程，输入：", JSON.stringify(generationInput, null, 2));
       const result = await generateWeeklyRecipes(generationInput);
       console.log("收到生成结果：", result);

       if (!result || !result.suggestedRecipes) {
          console.error("食谱生成返回无效的数据结构:", result);
           throw new Error("食谱生成返回无效的数据。");
       }


      if (result.suggestedRecipes.length > 0) {
         console.log(`Received ${result.suggestedRecipes.length} generated recipes. Estimating nutrition...`);
         const generatedToAddPromises: Promise<Recipe>[] = result.suggestedRecipes.map(async (genRecipe, index) => {
           const recipeId = `recipe-gen-${Date.now()}-${index}-${Math.random().toString(16).slice(2)}`;

           const displayDay = daysOfWeekChineseMapReverse[genRecipe.dayOfWeek] || daysOfWeek[0];
           const displayMeal = mealTypesChineseMapReverse[genRecipe.mealType] || mealTypes[0];

           const validDay = daysOfWeek.includes(displayDay) ? displayDay : daysOfWeek[index % daysOfWeek.length];
           const validMeal = mealTypes.includes(displayMeal) ? displayMeal : mealTypes[Math.floor(index / daysOfWeek.length) % mealTypes.length];


            if (!daysOfWeek.includes(displayDay) || !mealTypes.includes(displayMeal)) {
                console.warn(`Generated recipe "${genRecipe.name}" has invalid day/meal: ${genRecipe.dayOfWeek}/${genRecipe.mealType}. Mapped to: ${displayDay}/${displayMeal}. Defaulting to ${validDay}/${validMeal}`);
            }

           let recipe: Recipe = {
             id: recipeId,
             name: genRecipe.name || "生成的餐点",
             description: genRecipe.description || "AI 建议的餐点。",
             ingredients: (genRecipe.ingredients || [])
                            .filter(ing => ing.name && ing.quantity > 0)
                            .map((ing, ingIndex) => ({
                                id: `ingredient-gen-${recipeId}-${ingIndex}`,
                                name: ing.name,
                                quantity: Number(ing.quantity) || 0,
                            })),
             weekStartDate: currentWeekStartDate,
             dayOfWeek: validDay,
             mealType: validMeal,
             calories: undefined,
             protein: undefined,
             fat: undefined,
             carbohydrates: undefined,
           };

           if (recipe.ingredients.length > 0) {
               try {
                   recipe = await estimateRecipeNutrition(recipe);
               } catch (error) {
                   console.error(`为生成的餐点 "${recipe.name}" 估算营养时出错：`, error);
               }
           } else {
              console.log(`生成的食谱 "${recipe.name}" 没有有效成分，跳过营养估算。`);
           }

           return recipe;
         });

         const generatedToAdd = await Promise.all(generatedToAddPromises);
          console.log("Generated recipes with estimated nutrition:", generatedToAdd);

          setWeeklyRecipes((prevWeekly) => {
             console.log(`Adding ${generatedToAdd.length} generated recipes to week:`, currentWeekStartDate);
             const existingForWeek = prevWeekly[currentWeekStartDate] || [];
             // Filter out generated recipes that exactly match an existing one for the same day/meal/name
             const newFiltered = generatedToAdd.filter(newR =>
                 !existingForWeek.some(oldR => oldR.dayOfWeek === newR.dayOfWeek && oldR.mealType === newR.mealType && oldR.name === newR.name)
             );
             const updatedWeek = [...existingForWeek, ...newFiltered]; // Append new, non-duplicate recipes
             const newState = { ...prevWeekly, [currentWeekStartDate]: updatedWeek };
             console.log("New weeklyRecipes state after generation:", newState);
             return newState;
          });

           toast({
              title: "食谱已生成并添加",
              description: `已添加 ${generatedToAdd.length} 个新的餐点建议，并估算了营养。您可以进一步编辑它们。`,
              duration: 5000,
           });
           if (result.notes) {
               console.log("Generation notes:", result.notes);
              toast({
                 title: "生成备注",
                 description: result.notes,
                 duration: 6000,
              });
           }
           setNutritionalAnalysis(null);
           setEstimatedPrice(null);
      } else {
           console.log("AI generation returned 0 suggested recipes.");
           toast({
             title: "未生成建议",
             description: "AI 无法根据当前计划和偏好生成建议。",
           });
      }

    } catch (error) {
       console.error("在 actualGenerateWeeklyRecipesLogic 调用 generateWeeklyRecipes 时出错:", error);
       const errorMessage = error instanceof Error ? error.message : "食谱生成期间发生未知错误。";
        const isApiKeyError = errorMessage.includes("无效的 Google AI API 密钥") || errorMessage.includes("API 密钥错误") || errorMessage.includes("API Key issue");
        const isSchemaError = errorMessage.includes("模式验证失败") || errorMessage.includes("AI 返回的数据格式无效");


       toast({
         title: "生成失败",
         description: (
             <>
               {isApiKeyError ? (
                  <>
                    <AlertTriangle className="inline h-4 w-4 mr-1" />
                     API 密钥错误。请检查 `.env` 中的 GOOGLE_API_KEY 并重启服务器。
                  </>
               ) : isSchemaError ? (
                   <>
                       <AlertTriangle className="inline h-4 w-4 mr-1" />
                       {errorMessage}
                   </>
               ) : (
                  errorMessage
               )}
               <br /> 检查浏览器控制台和服务器日志以获取更多详细信息。
             </>
          ),
         variant: "destructive",
         duration: 8000,
       });
    } finally {
       console.log("Weekly generation process finished.");
      setIsLoadingGeneration(false);
    }
  }, [currentWeekStartDate, weeklyRecipes, toast, isClient]);


  const openGeneratePreferencesDialog = () => {
    if (!isClient) return;
    setGenerateDialogPreferences({ dietaryNeeds: "", preferences: "中餐 (Chinese food)" });
    setIsGeneratePreferencesDialogOpen(true);
  };

  const handleGenerateWithPreferences = () => {
    if (!isClient) return;
    actualGenerateWeeklyRecipesLogic(generateDialogPreferences);
    setIsGeneratePreferencesDialogOpen(false);
    toast({
        title: "正在生成食谱...",
        description: "正在使用您输入的偏好生成餐点建议。",
    });
  };

  const SidebarToggle = () => (
    <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsSidebarSheetOpen(!isSidebarSheetOpen)}
        className="fixed top-2 left-2 z-50 bg-card/80 hover:bg-card text-foreground md:hidden"
        aria-label={isSidebarSheetOpen ? "收起操作面板" : "展开操作面板"}
    >
        {isSidebarSheetOpen ? <PanelLeftOpen /> : <PanelRightOpen />}
    </Button>
  );
   
  console.log("Rendering HomePageContent. isClient:", isClient, "isMobile:", isMobile);

  const sidebarActions = (
    <SidebarMenu>
        <SidebarMenuItem>
            <Dialog open={isAddRecipeDialogOpen} onOpenChange={(open) => { setIsAddRecipeDialogOpen(open); if (!open && isMobile) setIsSidebarSheetOpen(false); }}>
                <DialogTrigger asChild>
                    <SidebarMenuButton
                        variant="default"
                        tooltip="手动添加餐点"
                        aria-label="手动添加餐点"
                        disabled={!isClient}
                        className={isMobile ? "w-full justify-start" : ""}
                    >
                        <PlusSquare />
                        {isMobile && <span className="ml-2">手动添加餐点</span>}
                    </SidebarMenuButton>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px] md:max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>添加新餐点</DialogTitle>
                        <DialogDescription>在此窗口中添加多个餐点。添加后，表单将清空以供下次输入。</DialogDescription>
                    </DialogHeader>
                    <RecipeInputForm
                        onAddRecipe={(data) => { handleAddRecipe(data); /* if (isMobile) setIsSidebarSheetOpen(false); */ }}
                        onCloseDialog={() => { setIsAddRecipeDialogOpen(false); if (isMobile) setIsSidebarSheetOpen(false);}}
                        currentWeekStartDate={currentWeekStartDate}
                        daysOfWeek={daysOfWeek}
                        mealTypes={mealTypes}
                        addMealTitle="添加餐点，为"
                        recipeNameLabel="食谱/餐点名称 *"
                        recipeNamePlaceholder="例如，炒鸡蛋，鸡肉沙拉"
                        dayOfWeekLabel="星期 *"
                        dayOfWeekPlaceholder="选择日期"
                        mealTypeLabel="餐别 *"
                        mealTypePlaceholder="选择餐别"
                        descriptionLabel="描述（可选）"
                        descriptionPlaceholder="例如，快速简单的早餐..."
                        ingredientsLabel="成分（用于营养估算，可选）"
                        ingredientNamePlaceholder="成分名称"
                        quantityPlaceholder="数量 (克)"
                        addIngredientLabel="添加成分行"
                        submitButtonLabel="添加餐点"
                        autoFillDetailsLabel="智能填充详情"
                    />
                </DialogContent>
            </Dialog>
        </SidebarMenuItem>

        <SidebarMenuItem>
            <SidebarMenuButton
                onClick={() => { triggerAnalysis(); if (isMobile) setIsSidebarSheetOpen(false); }}
                disabled={!isClient || isLoadingAnalysis || currentWeekRecipes.length === 0}
                variant="default"
                tooltip="分析营养"
                aria-label="分析营养"
                className={isMobile ? "w-full justify-start" : ""}
            >
                {isLoadingAnalysis ? <RefreshCw className="animate-spin" /> : <ListChecks />}
                {isMobile && <span className="ml-2">分析营养</span>}
            </SidebarMenuButton>
        </SidebarMenuItem>

        <SidebarMenuItem>
            <SidebarMenuButton
                onClick={() => { openGeneratePreferencesDialog(); /* Don't close sheet yet for mobile */ }}
                disabled={!isClient || isLoadingGeneration}
                variant="default"
                tooltip="生成餐点建议"
                aria-label="生成餐点建议"
                className={isMobile ? "w-full justify-start" : ""}
            >
                {isLoadingGeneration ? <RefreshCw className="animate-spin" /> : <ChefHat />}
                {isMobile && <span className="ml-2">生成餐点建议</span>}
            </SidebarMenuButton>
        </SidebarMenuItem>

        <SidebarMenuItem>
            <AlertDialog open={isClearWeekDialogOpen} onOpenChange={(open) => { setIsClearWeekDialogOpen(open); if (!open && isMobile && !isAddRecipeDialogOpen && !isGeneratePreferencesDialogOpen) setIsSidebarSheetOpen(false);}}>
                <AlertDialogTrigger asChild>
                    <SidebarMenuButton
                        variant="destructive"
                        disabled={!isClient || currentWeekRecipes.length === 0}
                        tooltip="移除所有餐点"
                        aria-label="移除所有餐点"
                        className={isMobile ? "w-full justify-start" : ""}
                    >
                        <Trash2 />
                        {isMobile && <span className="ml-2">移除所有餐点</span>}
                    </SidebarMenuButton>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>您确定吗？</AlertDialogTitle>
                        <AlertDialogDescription>
                            此操作无法撤销。这将永久删除从 {isClient ? format(parseISO(currentWeekStartDate), 'MMM d', { locale: zhCN }) : '本周'} 开始的一周的所有已计划餐点。
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => { setIsClearWeekDialogOpen(false); if (isMobile) setIsSidebarSheetOpen(false);}}>取消</AlertDialogCancel>
                        <AlertDialogAction onClick={() => { handleRemoveAllRecipes(); if (isMobile) setIsSidebarSheetOpen(false);}}>
                            继续
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </SidebarMenuItem>
    </SidebarMenu>
  );


  return (
    <>
      {isClient && isMobile && <SidebarToggle />}
       <div className="flex min-h-screen w-full">
         {isClient && !isMobile && (
             <Sidebar 
                variant="sidebar" 
                side="left" 
                className="group md:sticky top-0 z-20"
              > 
                <SidebarHeader>
                    <div className="p-2 h-8 flex items-center justify-center"> 
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                </SidebarHeader>
                <SidebarContent>
                    {sidebarActions}
                </SidebarContent>
                <SidebarFooter>
                  {/* Footer can be empty or for other elements if needed */}
                </SidebarFooter>
            </Sidebar>
         )}

        <Dialog open={isGeneratePreferencesDialogOpen} onOpenChange={(open) => { setIsGeneratePreferencesDialogOpen(open); if (!open && isMobile) setIsSidebarSheetOpen(false); }}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>餐点生成偏好</DialogTitle>
                    <DialogDescription>
                        输入您的饮食需求和食物偏好（可选），以帮助我们生成更合适的餐点。
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div>
                        <Label htmlFor="dialogDietaryNeeds" className="block text-sm font-medium mb-1">饮食需求 (可选)</Label>
                        <Textarea
                            id="dialogDietaryNeeds"
                            placeholder="例如，素食，无麸质，低碳水"
                            value={generateDialogPreferences.dietaryNeeds || ""}
                            onChange={(e) => setGenerateDialogPreferences(prev => ({ ...prev, dietaryNeeds: e.target.value }))}
                            className="w-full min-h-[60px]"
                        />
                    </div>
                    <div>
                        <Label htmlFor="dialogPreferences" className="block text-sm font-medium mb-1">食物偏好 (可选)</Label>
                        <Textarea
                            id="dialogPreferences"
                            placeholder="例如，喜欢辣的食物，偏爱中餐，不喜欢蘑菇"
                            value={generateDialogPreferences.preferences || ""}
                            onChange={(e) => setGenerateDialogPreferences(prev => ({ ...prev, preferences: e.target.value }))}
                            className="w-full min-h-[60px]"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button type="button" variant="outline" onClick={() => { setIsGeneratePreferencesDialogOpen(false); if (isMobile) setIsSidebarSheetOpen(false); }}>取消</Button>
                    </DialogClose>
                    <Button type="button" onClick={handleGenerateWithPreferences}>
                        <Check className="mr-2 h-4 w-4" /> 确认并生成
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>


        <SidebarInset> 
             <main className="flex-1 py-4 px-2 md:px-4 lg:px-6 overflow-y-auto w-full flex flex-col items-center">
                <ClientErrorBoundary fallback={<p className="text-red-500">页面标题加载失败。</p>}>
                  <div className="flex items-center justify-center mb-6 w-full relative max-w-5xl">
                    <div className="flex items-center justify-center flex-grow">
                      <Button variant="ghost" size="icon" onClick={goToPreviousWeek} aria-label="上一周 (Previous Week)" disabled={!isClient}>
                        <ArrowLeft className="h-5 w-5" />
                      </Button>
                      <h1 className="text-2xl md:text-3xl font-bold text-primary flex items-center gap-2 mx-4 text-center">
                        <Calendar className="w-6 h-6 md:w-7 md:h-7 text-primary shrink-0" />
                        <span className="whitespace-nowrap">
                          {isClient ? formatWeekDisplay(currentWeekStartDate) : '加载周...'}
                        </span>
                      </h1>
                      <Button variant="ghost" size="icon" onClick={goToNextWeek} aria-label="下一周 (Next Week)" disabled={!isClient}>
                        <ArrowRight className="h-5 w-5" />
                      </Button>
                     </div>
                  </div>
                </ClientErrorBoundary>

                <div className="w-full space-y-8 max-w-5xl"> 
                  <ClientErrorBoundary fallback={<p className="text-red-500">周计划表加载失败。</p>}>
                    {isClient ? (
                      <WeeklyPlanner
                        recipes={currentWeekRecipes}
                        onDeleteRecipe={handleDeleteRecipe}
                        daysOfWeek={daysOfWeek}
                        mealTypes={mealTypes}
                        deleteLabel="删除"
                        detailsLabel="详细信息"
                        emptyLabel="空"
                        nutritionLabel="营养"
                        ingredientsLabel="成分"
                        descriptionLabel="描述"
                        caloriesLabel="卡路里"
                        proteinLabel="蛋白质"
                        fatLabel="脂肪"
                        carbsLabel="碳水化合物"
                      />
                    ) : (
                      <div className="w-full h-64 bg-muted rounded-md animate-pulse flex items-center justify-center">
                        加载计划表...
                      </div>
                    )}
                  </ClientErrorBoundary>

                  <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mt-8 w-full">
                    <div className="lg:col-span-3">
                      <ClientErrorBoundary fallback={<p className="text-red-500">营养分析部分加载失败。</p>}>
                        {isClient ? (
                          <NutritionalAnalysis
                            analysis={nutritionalAnalysis}
                            isLoading={isLoadingAnalysis}
                            weekStartDate={currentWeekStartDate}
                            title="每周营养分析"
                            descriptionPrefix="从"
                            descriptionSuffix="开始的一周的见解（基于带成分的餐点）"
                            overallBalanceLabel="整体平衡"
                            macroRatioLabel="宏量营养素比例"
                            suggestionsLabel="改进建议"
                            breakdownLabel="已分析餐点细分"
                            noAnalysisTitle="营养分析"
                            noAnalysisDescription="添加带成分的餐点，然后点击“分析营养”以查看见解。"
                            noAnalysisData="无可用分析数据。"
                            analysisFailed="无法生成营养见解。"
                            noMealsAnalyzed="没有带有成分的餐点被分析以在图表中显示。"
                          />
                        ) : (
                          <div className="w-full h-40 bg-muted rounded-md animate-pulse flex items-center justify-center">
                            加载分析中...
                          </div>
                        )}
                      </ClientErrorBoundary>
                    </div>
                    <div className="lg:col-span-2">
                       <ClientErrorBoundary fallback={<p className="text-red-500">每周概要加载失败。</p>}>
                          {isClient && (
                              <WeeklySummary
                                  aggregatedIngredients={aggregatedIngredientsForCurrentWeek}
                                  estimatedPrice={estimatedPrice}
                                  isLoadingPrice={isLoadingPrice}
                                  weekStartDate={currentWeekStartDate}
                                  title="本周食材汇总"
                                  totalEstimatedPriceLabel="预估总价"
                                  ingredientsListLabel="食材清单"
                                  noIngredientsMessage="本周计划中没有食材。"
                                  priceLoadingMessage="正在估算价格..."
                                  priceErrorMessage="无法估算价格。"
                                  quantityLabel="克"
                                  currencySymbol="¥"
                              />
                          )}
                      </ClientErrorBoundary>
                    </div>
                  </div>
                </div>
            </main>
        </SidebarInset>
       </div>
        {isClient && isMobile && (
             <Sheet open={isSidebarSheetOpen} onOpenChange={setIsSidebarSheetOpen}>
                {/* SheetTrigger is handled by the floating SidebarToggle button */}
                <SheetContent side="left" className="p-0 w-[280px] bg-sidebar text-sidebar-foreground flex flex-col">
                    <SheetHeader className="p-2 border-b border-sidebar-border">
                        <div className="flex items-center justify-between">
                            <SheetTitle className="text-lg font-semibold flex items-center">
                                <FileText className="h-5 w-5 text-primary mr-2" />
                                操作面板
                            </SheetTitle>
                            <SheetClose asChild>
                                <Button variant="ghost" size="icon" className="text-sidebar-foreground hover:bg-sidebar-accent">
                                    <X className="h-5 w-5" />
                                </Button>
                            </SheetClose>
                        </div>
                    </SheetHeader>
                    <ScrollArea className="flex-grow">
                        <SidebarContent className="pt-2">
                           {sidebarActions}
                        </SidebarContent>
                    </ScrollArea>
                </SheetContent>
            </Sheet>
        )}
    </>
  );
}


export default function Home() {
  return (
    <SidebarProvider> 
      <HomePageContent />
    </SidebarProvider>
  );
}
