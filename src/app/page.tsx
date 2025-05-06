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
import { ChefHat, ListChecks, RefreshCw, Calendar, ArrowLeft, ArrowRight, PlusSquare, AlertTriangle } from "lucide-react";
import { startOfWeek, endOfWeek, addWeeks, subWeeks, format, parseISO } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { getNutrition } from "@/services/nutrition"; // Import nutrition service

interface UserPreferences {
  dietaryNeeds?: string;
  preferences?: string;
}

const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const mealTypes = ["Breakfast", "Lunch", "Dinner", "Snack"];

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
        console.warn(`Recipe "${recipe.name}" has no ingredients for nutrition estimation.`);
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
             console.warn(`Could not get nutrition for ingredient "${ingredient.name}" during recipe estimation:`, error);
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


export default function Home() {
  const [weeklyRecipes, setWeeklyRecipes] = useState<{ [weekStartDate: string]: Recipe[] }>({});
  const [currentWeekStartDate, setCurrentWeekStartDate] = useState<string>(getWeekStartDate(new Date()));
  const [nutritionalAnalysis, setNutritionalAnalysis] = useState<AnalyzeNutritionalBalanceOutput | null>(null);
  const [userPreferences, setUserPreferences] = useState<UserPreferences>({ dietaryNeeds: "", preferences: "" });
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);
  const [isLoadingGeneration, setIsLoadingGeneration] = useState(false);
  const [isAddRecipeDialogOpen, setIsAddRecipeDialogOpen] = useState(false); // State for dialog
  const [isClient, setIsClient] = useState(false); // Track client-side rendering
  const { toast } = useToast();

  // Track client-side rendering to avoid hydration mismatches with localStorage
  useEffect(() => {
    setIsClient(true);
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
         if (storedPreferences) {
           setUserPreferences(JSON.parse(storedPreferences));
         }
       } catch (error) {
         console.error("Error loading data from localStorage:", error);
         toast({
           title: "Error Loading Data",
           description: "Could not load saved plans or preferences.",
           variant: "destructive",
         });
       }
       // Set current week based on today's date only on client
       setCurrentWeekStartDate(getWeekStartDate(new Date()));
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
          console.error("Error saving weekly recipes to localStorage:", error);
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
             console.error("Error saving preferences to localStorage:", error);
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
      setCurrentWeekStartDate(prev => getWeekStartDate(subWeeks(parseISO(prev), 1)));
   };

   const goToNextWeek = () => {
      setCurrentWeekStartDate(prev => getWeekStartDate(addWeeks(parseISO(prev), 1)));
   };

   const formatWeekDisplay = (startDate: string): string => {
      try {
        const start = parseISO(startDate);
        const end = endOfWeek(start, { weekStartsOn: 1 });
        return `${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`;
      } catch (error) {
          console.error("Error formatting week display:", error);
          return "Invalid Date"; // Fallback for invalid date string
      }
   }

   // --- Recipe Management ---
   const handleAddRecipe = useCallback(async (newRecipeData: RecipeFormData) => {
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
        console.log(`Estimating nutrition for ${newRecipe.name}...`);
        newRecipe = await estimateRecipeNutrition(newRecipe);
        console.log(`Nutrition estimated for ${newRecipe.name}:`, {calories: newRecipe.calories, protein: newRecipe.protein, fat: newRecipe.fat, carbs: newRecipe.carbohydrates});
      } catch (error) {
        console.error("Error estimating nutrition during recipe add:", error);
        toast({
           title: "Nutrition Estimation Failed",
           description: "Could not estimate nutrition for the added meal.",
           variant: "destructive",
        });
      }
    } else {
        console.log(`Recipe "${newRecipe.name}" added without ingredients, skipping nutrition estimation.`);
    }

    setWeeklyRecipes((prevWeekly => {
      const updatedWeek = [...(prevWeekly[currentWeekStartDate] || []), newRecipe];
      return { ...prevWeekly, [currentWeekStartDate]: updatedWeek };
    }));

     setNutritionalAnalysis(null); // Clear analysis when a recipe is added
     setIsAddRecipeDialogOpen(false); // Close dialog
    toast({
      title: "Meal Added",
      description: `${newRecipe.name} for ${newRecipe.dayOfWeek} ${newRecipe.mealType} has been added.`,
    });
  }, [currentWeekStartDate, toast]); // Add toast dependency

  const handleDeleteRecipe = (recipeId: string) => {
     let deletedRecipeName = "Meal"; // Default name
     setWeeklyRecipes((prevWeekly) => {
        const weekRecipes = prevWeekly[currentWeekStartDate] || [];
        const recipeToDelete = weekRecipes.find(r => r.id === recipeId);
        if (recipeToDelete) {
            deletedRecipeName = recipeToDelete.name;
        }
        const updatedWeek = weekRecipes.filter(recipe => recipe.id !== recipeId);
         // Check if the entire weeklyRecipes object should become empty
         if (updatedWeek.length === 0 && Object.keys(prevWeekly).length === 1 && prevWeekly[currentWeekStartDate]) {
             return {}; // Reset to empty object
         } else if (updatedWeek.length === 0) {
              // Remove just the current week's key if it becomes empty
              const { [currentWeekStartDate]: _, ...rest } = prevWeekly;
              return rest;
         }
        // Otherwise, update the specific week
        return { ...prevWeekly, [currentWeekStartDate]: updatedWeek };
     });
      // Clear previous analysis/recommendations when a recipe is deleted from the current week
     setNutritionalAnalysis(null);
      toast({
        title: "Meal Removed",
        description: `"${deletedRecipeName}" has been removed from this week's plan.`,
        variant: "destructive",
      });
  };

  // --- Preferences ---
  const handleUpdatePreferences = (data: UserPreferences) => {
    setUserPreferences(data);
    toast({
      title: "Preferences Updated",
      description: "Your dietary needs and preferences have been saved.",
    });
  };

  // --- AI Features ---
  const triggerAnalysis = useCallback(async () => {
    if (currentWeekRecipes.length === 0) {
      toast({
        title: "No Meals",
        description: "Please add some meals for this week before analyzing.",
        variant: "destructive",
      });
      return;
    }

    // Ensure all recipes have ingredients for analysis
    const recipesWithIngredients = currentWeekRecipes.filter(r => r.ingredients && r.ingredients.length > 0 && r.ingredients.some(i => i.quantity > 0));
    if (recipesWithIngredients.length === 0) {
        toast({
            title: "No Ingredients",
            description: "Analysis requires meals with ingredients and quantities. Please add details to your meals.",
            variant: "destructive",
        });
        return;
    }
     if (recipesWithIngredients.length < currentWeekRecipes.length) {
        toast({
            title: "Partial Analysis",
            description: "Some meals without ingredients (or with zero quantity) will be excluded from the analysis.",
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
               title: "No Valid Ingredients for Analysis",
               description: "None of the meals had ingredients with valid names and quantities greater than zero.",
               variant: "destructive",
           });
           setIsLoadingAnalysis(false);
           return;
       }

       console.log("Calling analyzeNutritionalBalance flow with input:", analysisInput);
       const result = await analyzeNutritionalBalance(analysisInput);
       console.log("Received analysis result:", result);

        if (!result || !result.nutritionalInsights) {
             console.error("Analysis completed but returned invalid data structure:", result);
             throw new Error("Analysis completed but returned invalid data.");
         }

       setNutritionalAnalysis(result);
       toast({
         title: "Analysis Complete",
         description: "Nutritional insights generated for this week.",
       });
    } catch (error) {
       console.error("Error in triggerAnalysis calling analyzeNutritionalBalance:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred during analysis.";
        // Check for specific API key error (example, adjust based on actual error message)
        const isApiKeyError = errorMessage.includes("API key not valid") || errorMessage.includes("API_KEY_INVALID") || errorMessage.includes("GOOGLE_API_KEY");

       toast({
         title: "Analysis Failed",
         description: (
             <>
                {isApiKeyError ? (
                    <>
                        <AlertTriangle className="inline h-4 w-4 mr-1" />
                        API key error. Please check your GOOGLE_API_KEY in `.env` and restart the server.
                    </>
                ) : (
                    errorMessage
                )}
                <br /> Check browser console and server logs for more details.
             </>
         ),
         variant: "destructive",
         duration: 8000,
       });
        setNutritionalAnalysis(null); // Ensure it stays null on error
    } finally {
       setIsLoadingAnalysis(false);
    }
  }, [currentWeekRecipes, toast]); // Added toast dependency


  const triggerWeeklyGeneration = useCallback(async () => {
    setIsLoadingGeneration(true);

    let previousWeekRecipesString: string | undefined = undefined;
    try {
        // Find previous week's recipes
        const previousWeekStartDate = getWeekStartDate(subWeeks(parseISO(currentWeekStartDate), 1));
        const previousWeekRecipes = weeklyRecipes[previousWeekStartDate] || [];
        previousWeekRecipesString = previousWeekRecipes.length > 0
            ? previousWeekRecipes.map(recipe =>
                 `Day: ${recipe.dayOfWeek}, Meal: ${recipe.mealType}, Recipe: ${recipe.name}\n${recipe.ingredients && recipe.ingredients.length > 0 ? `Ingredients:\n${recipe.ingredients.filter(i=>i.name && i.quantity>0).map(ing => `- ${ing.name} (${ing.quantity}g)`).join('\n')}` : '(No ingredients listed)'}`
               ).join('\n\n')
            : undefined; // Pass undefined if no recipes last week
    } catch (error) {
        console.error("Error processing previous week's recipes:", error);
        // Decide if you want to proceed without previous week context or show an error
        // toast({ title: "Warning", description: "Could not process previous week's recipes.", variant: "default" });
    }

    let existingCurrentWeekRecipesString: string | undefined = undefined;
    try {
        // Get existing recipes for the current week
        const existingRecipes = weeklyRecipes[currentWeekStartDate] || [];
        existingCurrentWeekRecipesString = existingRecipes.length > 0
            ? existingRecipes.map(recipe =>
                `Day: ${recipe.dayOfWeek}, Meal: ${recipe.mealType}, Recipe: ${recipe.name}`
              ).join('\n')
            : undefined;
    } catch (error) {
         console.error("Error processing current week's recipes:", error);
    }

    try {
       const generationInput: GenerateWeeklyRecipesInput = {
         weekStartDate: currentWeekStartDate,
         dietaryNeeds: userPreferences.dietaryNeeds || "None specified",
         preferences: userPreferences.preferences || "None specified",
         previousWeekRecipes: previousWeekRecipesString,
         existingCurrentWeekRecipes: existingCurrentWeekRecipesString, // Add existing recipes
         numberOfSuggestions: 7, // Or make this dynamic
       };

       console.log("Calling generateWeeklyRecipes flow with input:", generationInput);
       const result = await generateWeeklyRecipes(generationInput);
       console.log("Received generation result:", result);

       if (!result || !result.suggestedRecipes) {
          console.error("Recipe generation returned invalid data structure:", result);
          throw new Error("Recipe generation returned invalid data.");
       }


      // Add generated recipes to the current week's plan
      if (result.suggestedRecipes.length > 0) {
         const generatedToAddPromises: Promise<Recipe>[] = result.suggestedRecipes.map(async (genRecipe, index) => {
           const recipeId = `recipe-gen-${Date.now()}-${index}-${Math.random().toString(16).slice(2)}`;

            // Basic validation for day/meal from AI
           const validDay = daysOfWeek.includes(genRecipe.dayOfWeek) ? genRecipe.dayOfWeek : daysOfWeek[0]; // Default to Monday
           const validMeal = mealTypes.includes(genRecipe.mealType) ? genRecipe.mealType : mealTypes[1]; // Default to Lunch

           let recipe: Recipe = {
             id: recipeId,
             name: genRecipe.name || "Generated Meal",
             description: genRecipe.description || "AI suggested meal.",
             // Use ingredients from the AI response, ensuring they have valid structure and assign IDs
             ingredients: (genRecipe.ingredients || [])
                            .filter(ing => ing.name && ing.quantity > 0)
                            .map((ing, ingIndex) => ({
                                id: `ingredient-gen-${recipeId}-${ingIndex}`,
                                name: ing.name,
                                quantity: Number(ing.quantity) || 0, // Ensure quantity is number
                            })),
             weekStartDate: currentWeekStartDate,
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
                   console.log(`Estimating nutrition for generated meal: ${recipe.name}`);
                   recipe = await estimateRecipeNutrition(recipe);
                   console.log(`Nutrition estimated for generated ${recipe.name}:`, {calories: recipe.calories, protein: recipe.protein, fat: recipe.fat, carbs: recipe.carbohydrates});
               } catch (error) {
                   console.error(`Error estimating nutrition for generated meal "${recipe.name}":`, error);
                   toast({
                       title: "Nutrition Estimation Failed",
                       description: `Could not estimate nutrition for the generated meal: ${recipe.name}.`,
                       variant: "destructive",
                   });
               }
           } else {
              console.log(`Generated recipe "${recipe.name}" has no valid ingredients, skipping nutrition estimation.`);
           }

           return recipe;
         });

         const generatedToAdd = await Promise.all(generatedToAddPromises);

          setWeeklyRecipes((prevWeekly) => {
             const updatedWeek = [...(prevWeekly[currentWeekStartDate] || []), ...generatedToAdd];
             return { ...prevWeekly, [currentWeekStartDate]: updatedWeek };
          });

           toast({
              title: "Recipes Generated & Added",
              description: `${generatedToAdd.length} new meal ideas added with estimated nutrition. You can edit them further.`,
              duration: 5000, // Longer duration
           });
           // Also show any notes from the generation
           if (result.notes) {
              toast({
                 title: "Generation Notes",
                 description: result.notes,
                 duration: 6000,
              });
           }
      } else {
           toast({
             title: "No Suggestions Generated",
             description: "The AI couldn't generate suggestions based on the current plan and preferences.",
           });
      }

    } catch (error) {
       console.error("Error in triggerWeeklyGeneration calling generateWeeklyRecipes:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred during recipe generation.";
        const isApiKeyError = errorMessage.includes("API key not valid") || errorMessage.includes("API_KEY_INVALID") || errorMessage.includes("GOOGLE_API_KEY");

       toast({
         title: "Generation Failed",
         description: (
             <>
               {isApiKeyError ? (
                  <>
                    <AlertTriangle className="inline h-4 w-4 mr-1" />
                    API key error. Please check your GOOGLE_API_KEY in `.env` and restart the server.
                  </>
               ) : (
                  errorMessage
               )}
               <br /> Check browser console and server logs for more details.
             </>
          ),
         variant: "destructive",
         duration: 8000,
       });
    } finally {
      setIsLoadingGeneration(false);
    }
  }, [currentWeekStartDate, userPreferences, weeklyRecipes, toast]); // Added toast dependency


  return (
    <main className="container mx-auto p-4 md:p-8 flex flex-col items-center min-h-screen bg-background">
      {/* Header and Week Navigation */}
      <div className="flex items-center justify-center mb-6 w-full max-w-7xl"> {/* Increased max-width */}
        <Button variant="ghost" size="icon" onClick={goToPreviousWeek} aria-label="Previous Week" disabled={!isClient}>
           <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl md:text-3xl font-bold text-primary flex items-center gap-2 mx-4 flex-1 justify-center">
           <Calendar className="w-6 h-6 md:w-7 md:h-7 text-primary" />
            <span className="whitespace-nowrap">
                {isClient ? formatWeekDisplay(currentWeekStartDate) : 'Loading week...'}
            </span>
        </h1>
        <Button variant="ghost" size="icon" onClick={goToNextWeek} aria-label="Next Week" disabled={!isClient}>
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
            />
         ) : (
            <div className="w-full h-64 bg-muted rounded-md animate-pulse flex items-center justify-center">
                Loading Planner...
            </div> // Placeholder while client loads
         )}


         {/* Action Buttons */}
         <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mt-6">
            <Dialog open={isAddRecipeDialogOpen} onOpenChange={setIsAddRecipeDialogOpen}>
              <DialogTrigger asChild>
                 <Button variant="outline" className="w-full justify-center" disabled={!isClient}>
                    <PlusSquare className="mr-2 h-4 w-4" /> Add Meal Manually
                 </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px] md:max-w-lg max-h-[90vh] overflow-y-auto">
                 <DialogHeader>
                   <DialogTitle>Add a New Meal</DialogTitle>
                 </DialogHeader>
                 {/* Pass the callback and week start date */}
                 <RecipeInputForm onAddRecipe={handleAddRecipe} currentWeekStartDate={currentWeekStartDate} />
               </DialogContent>
             </Dialog>

              <Button
                 onClick={triggerAnalysis}
                 disabled={!isClient || isLoadingAnalysis || currentWeekRecipes.length === 0}
                 className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
               >
                 {isLoadingAnalysis ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <ListChecks className="mr-2 h-4 w-4" />}
                 Analyze Nutrition
              </Button>
               <Button
                 onClick={triggerWeeklyGeneration}
                 disabled={!isClient || isLoadingGeneration}
                 className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
               >
                  {isLoadingGeneration ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <ChefHat className="mr-2 h-4 w-4" />}
                 Generate Meal Ideas
               </Button>
           </div>


        {/* Collapsible Sections for Analysis and Preferences */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
           {/* Nutritional Analysis */}
           {isClient ? (
                <NutritionalAnalysis analysis={nutritionalAnalysis} isLoading={isLoadingAnalysis} weekStartDate={currentWeekStartDate} />
            ) : (
                 <div className="w-full h-40 bg-muted rounded-md animate-pulse flex items-center justify-center">
                     Loading Analysis...
                 </div>
            )}

           {/* Preferences Form */}
           {isClient ? (
                <PreferencesForm onSubmitPreferences={handleUpdatePreferences} defaultValues={userPreferences} />
            ) : (
                 <div className="w-full h-40 bg-muted rounded-md animate-pulse flex items-center justify-center">
                     Loading Preferences...
                 </div>
            )}
        </div>

      </div>
    </main>
  );
}

