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
import { ChefHat, ListChecks, RefreshCw, Calendar, ArrowLeft, ArrowRight, PlusSquare } from "lucide-react";
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

    for (const ingredient of recipe.ingredients) {
        try {
          const nutrition = await getNutrition(ingredient.name);
          const factor = ingredient.quantity / 100; // Assuming nutrition data is per 100g

          totalCalories += (nutrition.calories || 0) * factor;
          totalProtein += (nutrition.protein || 0) * factor;
          totalFat += (nutrition.fat || 0) * factor;
          totalCarbohydrates += (nutrition.carbohydrates || 0) * factor;
        } catch (error) {
             console.warn(`Could not get nutrition for ingredient "${ingredient.name}":`, error);
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
  // Removed generatedRecipes state, will add directly to weeklyRecipes
  const [userPreferences, setUserPreferences] = useState<UserPreferences>({ dietaryNeeds: "", preferences: "" });
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);
  const [isLoadingGeneration, setIsLoadingGeneration] = useState(false);
  const [isAddRecipeDialogOpen, setIsAddRecipeDialogOpen] = useState(false); // State for dialog
  const { toast } = useToast();

  // Derived state for recipes of the current week
  const currentWeekRecipes = useMemo(() => {
      return weeklyRecipes[currentWeekStartDate] || [];
  }, [weeklyRecipes, currentWeekStartDate]);

  // Load data from localStorage on initial render
  useEffect(() => {
    const storedWeeklyRecipes = localStorage.getItem("nutrijournal_weekly_recipes");
    const storedPreferences = localStorage.getItem("nutrijournal_preferences");
    if (storedWeeklyRecipes) {
      setWeeklyRecipes(JSON.parse(storedWeeklyRecipes));
    }
     if (storedPreferences) {
      setUserPreferences(JSON.parse(storedPreferences));
    }
    // Set current week based on today's date
    setCurrentWeekStartDate(getWeekStartDate(new Date()));
  }, []);

  // Save weekly recipes to localStorage whenever they change
  useEffect(() => {
    if (Object.keys(weeklyRecipes).length > 0) {
      localStorage.setItem("nutrijournal_weekly_recipes", JSON.stringify(weeklyRecipes));
    } else {
       localStorage.removeItem("nutrijournal_weekly_recipes"); // Clear if empty
    }
  }, [weeklyRecipes]);

   // Save preferences to localStorage whenever they change
   useEffect(() => {
    localStorage.setItem("nutrijournal_preferences", JSON.stringify(userPreferences));
   }, [userPreferences]);

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
      const start = parseISO(startDate);
      const end = endOfWeek(start, { weekStartsOn: 1 });
      return `${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`;
   }

   // --- Recipe Management ---
   const handleAddRecipe = useCallback(async (newRecipeData: RecipeFormData) => {
    const recipeId = `recipe-${Date.now()}-${Math.random().toString(16).slice(2)}`; // More robust ID
    let newRecipe: Recipe = {
        ...newRecipeData,
        id: recipeId,
        weekStartDate: currentWeekStartDate,
        ingredients: newRecipeData.ingredients.map((ing, index) => ({
            ...ing,
            id: `ingredient-${recipeId}-${index}`
        }))
    };

    // Estimate nutrition if ingredients are present
    if (newRecipe.ingredients.length > 0) {
        newRecipe = await estimateRecipeNutrition(newRecipe);
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
  }, [currentWeekStartDate, toast]);

  const handleDeleteRecipe = (recipeId: string) => {
     let deletedRecipeName = "Meal"; // Default name
     setWeeklyRecipes((prevWeekly) => {
        const weekRecipes = prevWeekly[currentWeekStartDate] || [];
        const recipeToDelete = weekRecipes.find(r => r.id === recipeId);
        if (recipeToDelete) {
            deletedRecipeName = recipeToDelete.name;
        }
        const updatedWeek = weekRecipes.filter(recipe => recipe.id !== recipeId);
         if (updatedWeek.length === 0 && Object.keys(prevWeekly).length === 1 && prevWeekly[currentWeekStartDate]) {
             // If this was the only week and it's now empty, return empty object
             return {};
         } else if (updatedWeek.length === 0) {
              const { [currentWeekStartDate]: _, ...rest } = prevWeekly; // Remove week if empty
              return rest;
         }
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
    const recipesWithIngredients = currentWeekRecipes.filter(r => r.ingredients && r.ingredients.length > 0);
    if (recipesWithIngredients.length === 0) {
        toast({
            title: "No Ingredients",
            description: "Analysis requires recipes with ingredients. Please add ingredients to your meals.",
            variant: "destructive",
        });
        return;
    }
     if (recipesWithIngredients.length < currentWeekRecipes.length) {
        toast({
            title: "Partial Analysis",
            description: "Some meals without ingredients will be excluded from the analysis.",
            variant: "default", // Use default variant for informational messages
        });
    }


    setIsLoadingAnalysis(true);
    setNutritionalAnalysis(null); // Clear previous analysis

    try {
       // Use only recipes with ingredients for the AI input
       const analysisInput: AnalyzeNutritionalBalanceInput = {
         recipes: recipesWithIngredients.map(r => ({
           name: `${r.name} (${r.dayOfWeek} ${r.mealType})`, // Add context to name
           ingredients: r.ingredients.map(i => ({ name: i.name, quantity: i.quantity })),
         })),
       };
       const result = await analyzeNutritionalBalance(analysisInput);

       // Optionally, update the main recipes state with calculated nutrition if not already present
       // This requires matching the analysis output back to the original recipes
       // For simplicity now, just display the analysis separately.

       setNutritionalAnalysis(result);
       toast({
         title: "Analysis Complete",
         description: "Nutritional insights generated for this week.",
       });
    } catch (error) {
       console.error("Error analyzing nutrition:", error);
       toast({
         title: "Analysis Failed",
         description: "Could not generate nutritional analysis. Please try again.",
         variant: "destructive",
       });
        setNutritionalAnalysis(null); // Ensure it stays null on error
    } finally {
       setIsLoadingAnalysis(false);
    }
  }, [currentWeekRecipes, toast]);


  const triggerWeeklyGeneration = useCallback(async () => {
    setIsLoadingGeneration(true);

    // Find previous week's recipes
    const previousWeekStartDate = getWeekStartDate(subWeeks(parseISO(currentWeekStartDate), 1));
    const previousWeekRecipes = weeklyRecipes[previousWeekStartDate] || [];
    const previousWeekRecipesString = previousWeekRecipes.length > 0
        ? previousWeekRecipes.map(recipe =>
             `Day: ${recipe.dayOfWeek}, Meal: ${recipe.mealType}, Recipe: ${recipe.name}\n${recipe.ingredients.length > 0 ? `Ingredients:\n${recipe.ingredients.map(ing => `- ${ing.name} (${ing.quantity}g)`).join('\n')}` : '(No ingredients listed)'}`
           ).join('\n\n')
        : undefined; // Pass undefined if no recipes last week

    try {
       const generationInput: GenerateWeeklyRecipesInput = {
         weekStartDate: currentWeekStartDate,
         dietaryNeeds: userPreferences.dietaryNeeds || "None specified",
         preferences: userPreferences.preferences || "None specified",
         previousWeekRecipes: previousWeekRecipesString,
       };

      const result = await generateWeeklyRecipes(generationInput);

      // Add generated recipes to the current week's plan
      if (result && result.suggestedRecipes.length > 0) {
         const generatedToAdd: Recipe[] = result.suggestedRecipes.map(genRecipe => {
           const recipeId = `recipe-gen-${Date.now()}-${Math.random().toString(16).slice(2)}`;
           // Attempt to parse day/meal or assign defaults
           // Basic parsing - might need refinement based on AI output format
           let dayOfWeek = daysOfWeek[Math.floor(Math.random() * daysOfWeek.length)]; // Random day as fallback
           let mealType = mealTypes[Math.floor(Math.random() * mealTypes.length)]; // Random meal as fallback
           let name = genRecipe.name;

            // Example: Check if name contains day/meal clues
            const nameLower = name.toLowerCase();
            daysOfWeek.forEach(day => { if (nameLower.includes(day.toLowerCase())) dayOfWeek = day; });
            mealTypes.forEach(meal => { if (nameLower.includes(meal.toLowerCase())) mealType = meal; });

           return {
             id: recipeId,
             name: name,
             description: genRecipe.description,
             ingredients: [], // Generated recipes initially have no ingredients defined
             weekStartDate: currentWeekStartDate,
             dayOfWeek: dayOfWeek,
             mealType: mealType,
           };
         });

          setWeeklyRecipes((prevWeekly) => {
             const updatedWeek = [...(prevWeekly[currentWeekStartDate] || []), ...generatedToAdd];
             return { ...prevWeekly, [currentWeekStartDate]: updatedWeek };
          });

           toast({
              title: "Recipes Generated & Added",
              description: `${generatedToAdd.length} new meal ideas added to your planner for this week! You can edit or remove them.`,
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
             description: "The AI couldn't generate suggestions based on the input. Try adjusting preferences.",
           });
      }

    } catch (error) {
      console.error("Error generating weekly recipes:", error);
      toast({
        title: "Generation Failed",
        description: "Could not generate weekly recipe suggestions. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingGeneration(false);
    }
  }, [currentWeekStartDate, userPreferences, weeklyRecipes, toast]);


  return (
    <main className="container mx-auto p-4 md:p-8 flex flex-col items-center min-h-screen bg-background">
      {/* Header and Week Navigation */}
      <div className="flex items-center justify-center mb-6 w-full max-w-6xl">
        <Button variant="ghost" size="icon" onClick={goToPreviousWeek} aria-label="Previous Week">
           <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl md:text-3xl font-bold text-primary flex items-center gap-2 mx-4 flex-1 justify-center">
           <Calendar className="w-6 h-6 md:w-7 md:h-7 text-primary" />
            <span className="whitespace-nowrap">{formatWeekDisplay(currentWeekStartDate)}</span>
        </h1>
        <Button variant="ghost" size="icon" onClick={goToNextWeek} aria-label="Next Week">
           <ArrowRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Main Content Area */}
      <div className="w-full max-w-6xl space-y-8">

        {/* Weekly Planner Grid */}
        <WeeklyPlanner
            recipes={currentWeekRecipes}
            onDeleteRecipe={handleDeleteRecipe}
            daysOfWeek={daysOfWeek}
            mealTypes={mealTypes}
         />

         {/* Action Buttons */}
         <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mt-6">
            <Dialog open={isAddRecipeDialogOpen} onOpenChange={setIsAddRecipeDialogOpen}>
              <DialogTrigger asChild>
                 <Button variant="outline" className="w-full justify-center">
                    <PlusSquare className="mr-2 h-4 w-4" /> Add Meal Manually
                 </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px] md:max-w-lg">
                 <DialogHeader>
                   <DialogTitle>Add a New Meal</DialogTitle>
                 </DialogHeader>
                 {/* Pass the callback and week start date */}
                 <RecipeInputForm onAddRecipe={handleAddRecipe} currentWeekStartDate={currentWeekStartDate} />
               </DialogContent>
             </Dialog>

              <Button
                 onClick={triggerAnalysis}
                 disabled={isLoadingAnalysis || currentWeekRecipes.length === 0}
                 className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
               >
                 {isLoadingAnalysis ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <ListChecks className="mr-2 h-4 w-4" />}
                 Analyze Nutrition
              </Button>
               <Button
                 onClick={triggerWeeklyGeneration}
                 disabled={isLoadingGeneration}
                 className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
               >
                  {isLoadingGeneration ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <ChefHat className="mr-2 h-4 w-4" />}
                 Generate Meal Ideas
               </Button>
           </div>


        {/* Collapsible Sections for Analysis and Preferences */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
           {/* Nutritional Analysis */}
           <NutritionalAnalysis analysis={nutritionalAnalysis} isLoading={isLoadingAnalysis} weekStartDate={currentWeekStartDate} />

           {/* Preferences Form */}
           <PreferencesForm onSubmitPreferences={handleUpdatePreferences} defaultValues={userPreferences} />
        </div>

      </div>
    </main>
  );
}
