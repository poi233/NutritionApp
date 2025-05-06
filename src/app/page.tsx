"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import type { Recipe, Ingredient } from "@/types/recipe";
import { RecipeInputForm, type RecipeFormData } from "@/components/recipe-input-form";
import { WeeklyPlanner } from "@/components/weekly-planner";
import { NutritionalAnalysis } from "@/components/nutritional-analysis";
import { PreferencesForm } from "@/components/preferences-form";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { analyzeNutritionalBalance, type AnalyzeNutritionalBalanceOutput, type AnalyzeNutritionalBalanceInput } from "@/ai/flows/analyze-nutritional-balance";
import { generateWeeklyRecipes, type GenerateWeeklyRecipesOutput, type GenerateWeeklyRecipesInput } from "@/ai/flows/generate-weekly-recipes";
import { ChefHat, ListChecks, RefreshCw, Calendar, ArrowLeft, ArrowRight, PlusSquare, AlertTriangle, Trash2 } from "lucide-react";
import { startOfWeek, endOfWeek, addWeeks, subWeeks, format, parseISO } from 'date-fns';
import { zhCN } from 'date-fns/locale'; // Import Chinese locale for date formatting
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
} from "@/components/ui/alert-dialog"
import { getNutrition } from "@/services/nutrition"; // Import nutrition service

interface UserPreferences {
  dietaryNeeds?: string;
  preferences?: string;
}

// Translated days and meal types
const daysOfWeek = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];
// Removed "点心" (Snack)
const mealTypes = ["早餐", "午餐", "晚餐"];

// Helper to get the start of the week (assuming Monday start)
const getWeekStartDate = (date: Date): string => {
  return format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd');
};

// Helper to estimate nutrition for a single recipe
const estimateRecipeNutrition = async (recipe: Recipe): Promise<Recipe> => {
    let totalCalories = 0;
    let totalProtein = 0;
    let totalFat = 0;
    let totalCarbohydrates = 0;

    // Ensure recipe has ingredients before attempting calculation
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
          // Use a default quantity if missing (though the form requires it)
          const quantity = ingredient.quantity || 0;
          if (quantity <= 0) continue; // Skip if quantity is zero or less

          const nutrition = await getNutrition(ingredient.name);
          const factor = quantity / 100; // Assuming nutrition data is per 100g

          totalCalories += (nutrition.calories || 0) * factor;
          totalProtein += (nutrition.protein || 0) * factor;
          totalFat += (nutrition.fat || 0) * factor;
          totalCarbohydrates += (nutrition.carbohydrates || 0) * factor;
        } catch (error) {
             console.warn(`估算食谱时无法获取成分 "${ingredient.name}" 的营养信息：`, error);
             // Optionally assign default/zero values or handle differently
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

// Mapping for translating English day/meal from AI to Chinese for UI
const daysOfWeekChineseMapReverse: { [key: string]: string } = {
  Monday: "周一", Tuesday: "周二", Wednesday: "周三", Thursday: "周四", Friday: "周五", Saturday: "周六", Sunday: "周日"
};
const mealTypesChineseMapReverse: { [key: string]: string } = {
  Breakfast: "早餐", Lunch: "午餐", Dinner: "晚餐"
};


export default function Home() {
  const [weeklyRecipes, setWeeklyRecipes] = useState<{ [weekStartDate: string]: Recipe[] }>({});
  const [currentWeekStartDate, setCurrentWeekStartDate] = useState<string>(() => getWeekStartDate(new Date())); // Initialize directly
  const [nutritionalAnalysis, setNutritionalAnalysis] = useState<AnalyzeNutritionalBalanceOutput | null>(null);
  // Set default preference to Chinese food
  const [userPreferences, setUserPreferences] = useState<UserPreferences>({ dietaryNeeds: "", preferences: "中餐 (Chinese food)" });
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);
  const [isLoadingGeneration, setIsLoadingGeneration] = useState(false);
  const [isAddRecipeDialogOpen, setIsAddRecipeDialogOpen] = useState(false); // State for dialog
  const [isClearWeekDialogOpen, setIsClearWeekDialogOpen] = useState(false); // State for clear week confirmation
  const [isClient, setIsClient] = useState(false); // Track client-side rendering
  const { toast } = useToast();

  // Track client-side rendering to avoid hydration mismatches with localStorage
  useEffect(() => {
    setIsClient(true);
    // Set initial week start date on client mount
    setCurrentWeekStartDate(getWeekStartDate(new Date()));
  }, []);

  // Derived state for recipes of the current week
  const currentWeekRecipes = useMemo(() => {
       if (!isClient) return []; // Return empty array on server
      return weeklyRecipes[currentWeekStartDate] || [];
  }, [weeklyRecipes, currentWeekStartDate, isClient]);

  // Load data from localStorage on initial client-side render
   useEffect(() => {
     if (isClient) {
       try {
         const storedWeeklyRecipes = localStorage.getItem("nutrijournal_weekly_recipes");
         const storedPreferences = localStorage.getItem("nutrijournal_preferences");
         if (storedWeeklyRecipes) {
           setWeeklyRecipes(JSON.parse(storedWeeklyRecipes));
         }
         // Load preferences only if they haven't been set to the new default yet
         if (storedPreferences && JSON.stringify(JSON.parse(storedPreferences)) !== JSON.stringify({ dietaryNeeds: "", preferences: "中餐 (Chinese food)" })) {
           setUserPreferences(JSON.parse(storedPreferences));
         } else if (!storedPreferences) {
            // If no stored preferences, save the new default
            localStorage.setItem("nutrijournal_preferences", JSON.stringify({ dietaryNeeds: "", preferences: "中餐 (Chinese food)" }));
         }
       } catch (error) {
         console.error("从 localStorage 加载数据时出错:", error);
         toast({
           title: "加载数据出错",
           description: "无法加载已保存的计划或偏好。",
           variant: "destructive",
         });
       }
     }
   }, [isClient, toast]); // Add toast dependency


  // Save weekly recipes to localStorage whenever they change (only on client)
  useEffect(() => {
     if (isClient) {
       try {
          if (Object.keys(weeklyRecipes).length > 0) {
             localStorage.setItem("nutrijournal_weekly_recipes", JSON.stringify(weeklyRecipes));
           } else {
              localStorage.removeItem("nutrijournal_weekly_recipes"); // Clear if empty
           }
       } catch (error) {
          console.error("将每周食谱保存到 localStorage 时出错:", error);
          // Optional: Show a toast, but might be too noisy
       }
     }
  }, [weeklyRecipes, isClient]);

   // Save preferences to localStorage whenever they change (only on client)
   useEffect(() => {
     if (isClient) {
        try {
             localStorage.setItem("nutrijournal_preferences", JSON.stringify(userPreferences));
        } catch (error) {
             console.error("将偏好保存到 localStorage 时出错:", error);
              // Optional: Show a toast
        }
     }
   }, [userPreferences, isClient]);

   // Clear analysis when week changes
   useEffect(() => {
     setNutritionalAnalysis(null);
   }, [currentWeekStartDate]);

   // --- Week Navigation ---
   const goToPreviousWeek = () => {
      if (!isClient) return; // Prevent server-side execution
      setCurrentWeekStartDate(prev => getWeekStartDate(subWeeks(parseISO(prev), 1)));
   };

   const goToNextWeek = () => {
      if (!isClient) return; // Prevent server-side execution
      setCurrentWeekStartDate(prev => getWeekStartDate(addWeeks(parseISO(prev), 1)));
   };

   const formatWeekDisplay = (startDate: string): string => {
      try {
        const start = parseISO(startDate);
        const end = endOfWeek(start, { weekStartsOn: 1 });
        // Use Chinese locale for formatting
        return `${format(start, 'MMM d', { locale: zhCN })} - ${format(end, 'MMM d, yyyy', { locale: zhCN })}`;
      } catch (error) {
          console.error("格式化周显示时出错:", error);
          return "无效日期"; // Fallback for invalid date string
      }
   }

   // --- Recipe Management ---
   const handleAddRecipe = useCallback(async (newRecipeData: RecipeFormData) => {
    if (!isClient) return;
    const recipeId = `recipe-${Date.now()}-${Math.random().toString(16).slice(2)}`; // More robust ID
    let newRecipe: Recipe = {
        ...newRecipeData,
        id: recipeId,
        weekStartDate: currentWeekStartDate,
        ingredients: newRecipeData.ingredients
          .filter(ing => ing.name && ing.quantity > 0) // Filter out empty/invalid ingredients before processing
          .map((ing, index) => ({
            id: `ingredient-${recipeId}-${index}`, // Assign final ingredient ID here
            name: ing.name,
            quantity: Number(ing.quantity) || 0, // Ensure quantity is a number
          })),
        // Initialize nutrition fields
        calories: undefined,
        protein: undefined,
        fat: undefined,
        carbohydrates: undefined,
        description: newRecipeData.description || "", // Ensure description exists
    };

    // Estimate nutrition only if valid ingredients are present
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
      const updatedWeek = [...(prevWeekly[currentWeekStartDate] || []), newRecipe];
      return { ...prevWeekly, [currentWeekStartDate]: updatedWeek };
    }));

     setNutritionalAnalysis(null); // Clear analysis when a recipe is added
     setIsAddRecipeDialogOpen(false); // Close dialog
    toast({
      title: "餐点已添加",
      description: `${newRecipe.dayOfWeek} ${newRecipe.mealType} 的 ${newRecipe.name} 已添加。`,
    });
  }, [currentWeekStartDate, toast, isClient]); // Added toast dependency

  const handleDeleteRecipe = (recipeId: string) => {
     if (!isClient) return;
     let deletedRecipeName = "餐点"; // Default name
     setWeeklyRecipes((prevWeekly) => {
        const weekRecipes = prevWeekly[currentWeekStartDate] || [];
        const recipeToDelete = weekRecipes.find(r => r.id === recipeId);
        if (recipeToDelete) {
            deletedRecipeName = recipeToDelete.name;
        }
        const updatedWeek = weekRecipes.filter(recipe => recipe.id !== recipeId);
         // Check if the entire weeklyRecipes object should become empty after removing the week's key
         if (updatedWeek.length === 0) {
              // Remove just the current week's key if it becomes empty
              const { [currentWeekStartDate]: _, ...rest } = prevWeekly;
              // If removing the week makes the whole object empty
              if (Object.keys(rest).length === 0) {
                  return {}; // Reset to empty object
              }
              return rest;
         }
        // Otherwise, update the specific week
        return { ...prevWeekly, [currentWeekStartDate]: updatedWeek };
     });
      // Clear previous analysis/recommendations when a recipe is deleted from the current week
     setNutritionalAnalysis(null);
      toast({
        title: "餐点已移除",
        description: `"${deletedRecipeName}" 已从此周计划中移除。`,
        variant: "destructive",
      });
  };

  const handleRemoveAllRecipes = useCallback(() => {
       if (!isClient) return;
        setWeeklyRecipes((prevWeekly) => {
            const { [currentWeekStartDate]: _, ...rest } = prevWeekly;
            // If removing the week makes the whole object empty
             if (Object.keys(rest).length === 0) {
                return {}; // Reset to empty object
             }
            return rest;
        });
        setNutritionalAnalysis(null); // Clear analysis as well
        setIsClearWeekDialogOpen(false); // Close dialog
        toast({
            title: "本周已清空",
            description: `从 ${format(parseISO(currentWeekStartDate), 'MMM d', { locale: zhCN })} 开始的一周的所有餐点都已被移除。`,
            variant: "destructive",
        });
   }, [currentWeekStartDate, toast, isClient]); // Add dependencies

  // --- Preferences ---
  const handleUpdatePreferences = (data: UserPreferences) => {
    if (!isClient) return;
    setUserPreferences(data);
    toast({
      title: "偏好已更新",
      description: "您的饮食需求和偏好已保存。",
    });
  };

  // --- AI Features ---
  const triggerAnalysis = useCallback(async () => {
    if (!isClient) return;
    if (currentWeekRecipes.length === 0) {
      toast({
        title: "没有餐点",
        description: "请先添加本周的一些餐点再进行分析。",
        variant: "destructive",
      });
      return;
    }

    // Ensure all recipes have ingredients for analysis
    const recipesWithIngredients = currentWeekRecipes.filter(r => r.ingredients && r.ingredients.length > 0 && r.ingredients.some(i => i.quantity > 0));
    if (recipesWithIngredients.length === 0) {
        toast({
            title: "没有成分",
            description: "分析需要带有成分和数量的餐点。请为您的餐点添加详细信息。",
            variant: "destructive",
        });
        return;
    }
     if (recipesWithIngredients.length < currentWeekRecipes.length) {
        toast({
            title: "部分分析",
            description: "一些没有成分（或数量为零）的餐点将从分析中排除。",
            variant: "default", // Use default variant for informational messages
        });
    }


    setIsLoadingAnalysis(true);
    setNutritionalAnalysis(null); // Clear previous analysis

    try {
       // Prepare input for the AI flow
       const analysisInput: AnalyzeNutritionalBalanceInput = {
         recipes: recipesWithIngredients.map(r => ({
           name: `${r.name} (${r.dayOfWeek} ${r.mealType})`, // Add context to name
           ingredients: r.ingredients
                        .filter(i => i.name && i.quantity > 0) // Ensure valid ingredients
                        .map(i => ({ name: i.name, quantity: i.quantity })),
         })).filter(r => r.ingredients.length > 0), // Ensure recipe has valid ingredients after filtering
       };

       // Check if there are still recipes to analyze after filtering
       if (analysisInput.recipes.length === 0) {
           toast({
               title: "没有用于分析的有效成分",
               description: "没有一个餐点含有名称和数量大于零的有效成分。",
               variant: "destructive",
           });
           setIsLoadingAnalysis(false);
           return;
       }

       console.log("调用 analyzeNutritionalBalance 流程，输入：", analysisInput);
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
        // Error messages are now translated in the flow itself
        const errorMessage = error instanceof Error ? error.message : "分析期间发生未知错误。";

       toast({
         title: "分析失败",
         description: (
             <>
                {/* Check for API key error using the translated message */}
                {errorMessage.includes("无效的 Google AI API 密钥") ? (
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
        setNutritionalAnalysis(null); // Ensure it stays null on error
    } finally {
       setIsLoadingAnalysis(false);
    }
  }, [currentWeekRecipes, toast, isClient]); // Added toast dependency


  const triggerWeeklyGeneration = useCallback(async () => {
    if (!isClient) return;
    setIsLoadingGeneration(true);

    let previousWeekRecipesString: string | undefined = undefined;
    try {
        // Find previous week's recipes
        const previousWeekStartDate = getWeekStartDate(subWeeks(parseISO(currentWeekStartDate), 1));
        const previousWeekRecipes = weeklyRecipes[previousWeekStartDate] || [];
        previousWeekRecipesString = previousWeekRecipes.length > 0
            ? previousWeekRecipes.map(recipe =>
                 // Use the Chinese display name format for the prompt
                 `日期: ${recipe.dayOfWeek}, 餐别: ${recipe.mealType}, 食谱: ${recipe.name}\n${recipe.ingredients && recipe.ingredients.length > 0 ? `成分:\n${recipe.ingredients.filter(i=>i.name && i.quantity>0).map(ing => `- ${ing.name} (${ing.quantity}克)`).join('\n')}` : '(未列出成分)'}`
               ).join('\n\n')
            : undefined; // Pass undefined if no recipes last week
    } catch (error) {
        console.error("处理上周食谱时出错:", error);
        // Decide if you want to proceed without previous week context or show an error
        // toast({ title: "警告", description: "无法处理上周的食谱。", variant: "default" });
    }

    let existingCurrentWeekRecipesString: string | undefined = undefined;
    try {
        // Get existing recipes for the current week
        const existingRecipes = weeklyRecipes[currentWeekStartDate] || [];
        existingCurrentWeekRecipesString = existingRecipes.length > 0
            ? existingRecipes.map(recipe =>
                // Use the Chinese display name format for the prompt
                `日期: ${recipe.dayOfWeek}, 餐别: ${recipe.mealType}, 食谱: ${recipe.name}`
              ).join('\n')
            : undefined;
    } catch (error) {
         console.error("处理本周食谱时出错:", error);
    }

    try {
       const generationInput: GenerateWeeklyRecipesInput = {
         weekStartDate: currentWeekStartDate,
         dietaryNeeds: userPreferences.dietaryNeeds || "未指定",
         preferences: userPreferences.preferences || "未指定",
         previousWeekRecipes: previousWeekRecipesString,
         existingCurrentWeekRecipes: existingCurrentWeekRecipesString, // Add existing recipes
         // numberOfSuggestions removed as prompt now aims for 21
       };

       console.log("调用 generateWeeklyRecipes 流程，输入：", generationInput);
       const result = await generateWeeklyRecipes(generationInput);
       console.log("收到生成结果：", result);

       if (!result || !result.suggestedRecipes) {
          console.error("食谱生成返回无效的数据结构:", result);
           throw new Error("食谱生成返回无效的数据。");
       }


      // Add generated recipes to the current week's plan
      if (result.suggestedRecipes.length > 0) {
         const generatedToAddPromises: Promise<Recipe>[] = result.suggestedRecipes.map(async (genRecipe, index) => {
           const recipeId = `recipe-gen-${Date.now()}-${index}-${Math.random().toString(16).slice(2)}`;

            // Translate English day/meal from AI to Chinese for storage and display
           const displayDay = daysOfWeekChineseMapReverse[genRecipe.dayOfWeek] || daysOfWeek[0]; // Default to 周一 if map fails
           const displayMeal = mealTypesChineseMapReverse[genRecipe.mealType] || mealTypes[0]; // Default to 早餐 if map fails

           // Validate against allowed Chinese values
           const validDay = daysOfWeek.includes(displayDay) ? displayDay : daysOfWeek[0];
           const validMeal = mealTypes.includes(displayMeal) ? displayMeal : mealTypes[0];

           let recipe: Recipe = {
             id: recipeId,
             name: genRecipe.name || "生成的餐点",
             description: genRecipe.description || "AI 建议的餐点。",
             // Use ingredients from the AI response, ensuring they have valid structure and assign IDs
             ingredients: (genRecipe.ingredients || [])
                            .filter(ing => ing.name && ing.quantity > 0)
                            .map((ing, ingIndex) => ({
                                id: `ingredient-gen-${recipeId}-${ingIndex}`,
                                name: ing.name,
                                quantity: Number(ing.quantity) || 0, // Ensure quantity is number
                            })),
             weekStartDate: currentWeekStartDate,
             // Store the validated CHINESE names
             dayOfWeek: validDay,
             mealType: validMeal,
             calories: undefined, // Initialize nutrition fields
             protein: undefined,
             fat: undefined,
             carbohydrates: undefined,
           };

           // Now, estimate nutrition using the generated ingredients
           if (recipe.ingredients.length > 0) {
               try {
                   console.log(`正在为生成的餐点估算营养：${recipe.name}`);
                   recipe = await estimateRecipeNutrition(recipe);
                   console.log(`为生成的 ${recipe.name} 估算的营养:`, {calories: recipe.calories, protein: recipe.protein, fat: recipe.fat, carbs: recipe.carbohydrates});
               } catch (error) {
                   console.error(`为生成的餐点 "${recipe.name}" 估算营养时出错：`, error);
                   toast({
                       title: "营养估算失败",
                       description: `无法为生成的餐点估算营养：${recipe.name}。`,
                       variant: "destructive",
                   });
               }
           } else {
              console.log(`生成的食谱 "${recipe.name}" 没有有效成分，跳过营养估算。`);
           }

           return recipe;
         });

         const generatedToAdd = await Promise.all(generatedToAddPromises);

          setWeeklyRecipes((prevWeekly) => {
             // Make sure to replace existing meals for the same day/slot if needed, or just add
             // For simplicity, this adds to the existing list. Consider replacing logic if needed.
             const updatedWeek = [...(prevWeekly[currentWeekStartDate] || []), ...generatedToAdd];
             return { ...prevWeekly, [currentWeekStartDate]: updatedWeek };
          });

           toast({
              title: "食谱已生成并添加",
              description: `已添加 ${generatedToAdd.length} 个新的餐点建议，并估算了营养。您可以进一步编辑它们。`,
              duration: 5000, // Longer duration
           });
           // Also show any notes from the generation
           if (result.notes) {
              toast({
                 title: "生成备注",
                 description: result.notes,
                 duration: 6000,
              });
           }
           // Clear analysis after generating new meals
           setNutritionalAnalysis(null);
      } else {
           toast({
             title: "未生成建议",
             description: "AI 无法根据当前计划和偏好生成建议。",
           });
      }

    } catch (error) {
       console.error("在 triggerWeeklyGeneration 调用 generateWeeklyRecipes 时出错:", error);
       // Error messages are translated in the flow itself
       const errorMessage = error instanceof Error ? error.message : "食谱生成期间发生未知错误。";
        const isApiKeyError = errorMessage.includes("无效的 Google AI API 密钥");
        const isSchemaError = errorMessage.includes("模式验证错误") || errorMessage.includes("AI 返回的数据格式无效");


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
                       {errorMessage} (AI 未能返回预期的 21 个食谱)
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
      setIsLoadingGeneration(false);
    }
  }, [currentWeekStartDate, userPreferences, weeklyRecipes, toast, isClient]); // Added toast dependency


  return (
    <main className="container mx-auto p-4 md:p-8 flex flex-col items-center min-h-screen bg-background">
      {/* Header and Week Navigation */}
      <div className="flex items-center justify-center mb-6 w-full max-w-7xl"> {/* Increased max-width */}
        <Button variant="ghost" size="icon" onClick={goToPreviousWeek} aria-label="上一周 (Previous Week)" disabled={!isClient}>
           <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl md:text-3xl font-bold text-primary flex items-center gap-2 mx-4 flex-1 justify-center">
           <Calendar className="w-6 h-6 md:w-7 md:h-7 text-primary" />
            <span className="whitespace-nowrap">
                {isClient ? formatWeekDisplay(currentWeekStartDate) : '加载周...'}
            </span>
        </h1>
        <Button variant="ghost" size="icon" onClick={goToNextWeek} aria-label="下一周 (Next Week)" disabled={!isClient}>
           <ArrowRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Main Content Area */}
      <div className="w-full max-w-7xl space-y-8"> {/* Increased max-width */}

        {/* Weekly Planner Table */}
         {isClient ? (
            <WeeklyPlanner
                recipes={currentWeekRecipes}
                onDeleteRecipe={handleDeleteRecipe}
                daysOfWeek={daysOfWeek}
                mealTypes={mealTypes}
                deleteLabel="删除 (Delete)"
                detailsLabel="详细信息 (Details)"
                emptyLabel="空 (Empty)"
                nutritionLabel="营养 (Nutrition)"
                ingredientsLabel="成分 (Ingredients)"
                descriptionLabel="描述 (Description)"
                caloriesLabel="卡路里 (Calories)"
                proteinLabel="蛋白质 (Protein)"
                fatLabel="脂肪 (Fat)"
                carbsLabel="碳水化合物 (Carbs)"
            />
         ) : (
            <div className="w-full h-64 bg-muted rounded-md animate-pulse flex items-center justify-center">
                加载计划表...
            </div> // Placeholder while client loads
         )}


         {/* Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mt-6">
             {/* Add Meal Dialog */}
             <Dialog open={isAddRecipeDialogOpen} onOpenChange={setIsAddRecipeDialogOpen}>
               <DialogTrigger asChild>
                  <Button variant="outline" className="w-full justify-center" disabled={!isClient}>
                     <PlusSquare className="mr-2 h-4 w-4" /> 手动添加餐点
                  </Button>
               </DialogTrigger>
               <DialogContent className="sm:max-w-[425px] md:max-w-lg max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>添加新餐点</DialogTitle>
                  </DialogHeader>
                  <RecipeInputForm
                    onAddRecipe={handleAddRecipe}
                    currentWeekStartDate={currentWeekStartDate}
                    daysOfWeek={daysOfWeek} // Pass translated days
                    mealTypes={mealTypes} // Pass translated meal types
                    addMealTitle="添加餐点，为" // Translate prop
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
                    submitButtonLabel="将餐点添加到本周"
                  />
                </DialogContent>
              </Dialog>

              {/* Analyze Nutrition Button */}
              <Button
                 onClick={triggerAnalysis}
                 disabled={!isClient || isLoadingAnalysis || currentWeekRecipes.length === 0}
                 className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
               >
                 {isLoadingAnalysis ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <ListChecks className="mr-2 h-4 w-4" />}
                 分析营养
              </Button>

              {/* Generate Meal Ideas Button */}
               <Button
                 onClick={triggerWeeklyGeneration}
                 disabled={!isClient || isLoadingGeneration}
                 className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
               >
                  {isLoadingGeneration ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <ChefHat className="mr-2 h-4 w-4" />}
                 生成餐点建议
               </Button>

                {/* Remove All Recipes Button */}
                <AlertDialog open={isClearWeekDialogOpen} onOpenChange={setIsClearWeekDialogOpen}>
                  <AlertDialogTrigger asChild>
                     <Button
                       variant="destructive"
                       className="w-full justify-center"
                       disabled={!isClient || currentWeekRecipes.length === 0} // Disable if no recipes to remove
                      >
                        <Trash2 className="mr-2 h-4 w-4" /> 移除所有餐点
                     </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>您确定吗？</AlertDialogTitle>
                      <AlertDialogDescription>
                        此操作无法撤销。这将永久删除从 {isClient ? format(parseISO(currentWeekStartDate), 'MMM d', { locale: zhCN }) : '本周'} 开始的一周的所有已计划餐点。
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel onClick={() => setIsClearWeekDialogOpen(false)}>取消</AlertDialogCancel>
                      {/* Confirmation action calls the handler */}
                      <AlertDialogAction onClick={handleRemoveAllRecipes}>
                         继续
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                 </AlertDialog>
           </div>


        {/* Collapsible Sections for Analysis and Preferences */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
           {/* Nutritional Analysis */}
           {isClient ? (
                <NutritionalAnalysis
                   analysis={nutritionalAnalysis}
                   isLoading={isLoadingAnalysis}
                   weekStartDate={currentWeekStartDate}
                   title="每周营养分析" // Translate prop
                   descriptionPrefix="从" // Translate prop
                   descriptionSuffix="开始的一周的见解（基于带成分的餐点）" // Translate prop
                   overallBalanceLabel="整体平衡" // Translate prop
                   macroRatioLabel="宏量营养素比例" // Translate prop
                   suggestionsLabel="改进建议" // Translate prop
                   breakdownLabel="已分析餐点细分" // Translate prop
                   noAnalysisTitle="营养分析" // Translate prop
                   noAnalysisDescription="添加带成分的餐点，然后点击“分析营养”以查看见解。" // Translate prop
                   noAnalysisData="无可用分析数据。" // Translate prop
                   analysisFailed="无法生成营养见解。" // Translate prop
                   noMealsAnalyzed="没有带有成分的餐点被分析以在图表中显示。" // Translate prop
                />
            ) : (
                 <div className="w-full h-40 bg-muted rounded-md animate-pulse flex items-center justify-center">
                     加载分析中...
                 </div>
            )}

           {/* Preferences Form */}
           {isClient ? (
                <PreferencesForm
                  onSubmitPreferences={handleUpdatePreferences}
                  defaultValues={userPreferences}
                  title="您的偏好" // Translate prop
                  description="帮助我们推荐您会喜欢的食谱。" // Translate prop
                  dietaryNeedsLabel="饮食需求" // Translate prop
                  dietaryNeedsPlaceholder="例如，素食，无麸质，低碳水" // Translate prop
                  preferencesLabel="食物偏好" // Translate prop
                  preferencesPlaceholder="例如，喜欢辣的食物，偏爱中餐，不喜欢蘑菇" // Translate prop
                  submitButtonLabel="更新偏好" // Translate prop
                 />
            ) : (
                 <div className="w-full h-40 bg-muted rounded-md animate-pulse flex items-center justify-center">
                     加载偏好中...
                 </div>
            )}
        </div>

      </div>
    </main>
  );
}