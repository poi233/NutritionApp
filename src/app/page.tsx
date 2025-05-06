"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import type { Recipe, Ingredient } from "@/types/recipe";
import { RecipeInputForm } from "@/components/recipe-input-form";
import { RecipeList } from "@/components/recipe-list";
import { NutritionalAnalysis } from "@/components/nutritional-analysis";
import { RecipeRecommendations } from "@/components/recipe-recommendations"; // Keep for generated recipes
import { PreferencesForm } from "@/components/preferences-form";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { analyzeNutritionalBalance, type AnalyzeNutritionalBalanceOutput, type AnalyzeNutritionalBalanceInput } from "@/ai/flows/analyze-nutritional-balance";
import { generateWeeklyRecipes, type GenerateWeeklyRecipesOutput, type GenerateWeeklyRecipesInput, type GeneratedRecipeSchema } from "@/ai/flows/generate-weekly-recipes";
import { ChefHat, ListChecks, RefreshCw, Calendar, ArrowLeft, ArrowRight } from "lucide-react";
import { startOfWeek, endOfWeek, addWeeks, subWeeks, format, parseISO } from 'date-fns';

interface UserPreferences {
  dietaryNeeds?: string;
  preferences?: string;
}

// Helper to get the start of the week (assuming Monday start)
const getWeekStartDate = (date: Date): string => {
  return format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd');
};

export default function Home() {
  const [weeklyRecipes, setWeeklyRecipes] = useState<{ [weekStartDate: string]: Recipe[] }>({});
  const [currentWeekStartDate, setCurrentWeekStartDate] = useState<string>(getWeekStartDate(new Date()));
  const [nutritionalAnalysis, setNutritionalAnalysis] = useState<AnalyzeNutritionalBalanceOutput | null>(null);
  const [generatedRecipes, setGeneratedRecipes] = useState<GenerateWeeklyRecipesOutput | null>(null);
  const [userPreferences, setUserPreferences] = useState<UserPreferences>({ dietaryNeeds: "", preferences: "" });
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);
  const [isLoadingGeneration, setIsLoadingGeneration] = useState(false);
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

   // Clear analysis and generated recipes when week changes
   useEffect(() => {
     setNutritionalAnalysis(null);
     setGeneratedRecipes(null);
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
   const handleAddRecipe = (newRecipeData: Omit<Recipe, 'id' | 'weekStartDate'>) => {
    const recipeId = `recipe-${Date.now()}-${Math.random().toString(16).slice(2)}`; // More robust ID
    const newRecipe: Recipe = {
        ...newRecipeData,
        id: recipeId,
        weekStartDate: currentWeekStartDate,
        ingredients: newRecipeData.ingredients.map((ing, index) => ({
            ...ing,
            id: `ingredient-${recipeId}-${index}`
        }))
    };

    setWeeklyRecipes((prevWeekly => {
      const updatedWeek = [...(prevWeekly[currentWeekStartDate] || []), newRecipe];
      return { ...prevWeekly, [currentWeekStartDate]: updatedWeek };
    }));

     // Clear previous analysis/recommendations when a recipe is added to the current week
     setNutritionalAnalysis(null);
     setGeneratedRecipes(null); // Clear generated suggestions as well
    toast({
      title: "Recipe Added",
      description: `${newRecipe.name} has been added for the week of ${format(parseISO(currentWeekStartDate), 'MMM d')}.`,
    });
  };

  const handleDeleteRecipe = (recipeId: string) => {
     setWeeklyRecipes((prevWeekly) => {
        const weekRecipes = prevWeekly[currentWeekStartDate] || [];
        const updatedWeek = weekRecipes.filter(recipe => recipe.id !== recipeId);
         if (updatedWeek.length === 0) {
             const { [currentWeekStartDate]: _, ...rest } = prevWeekly; // Remove week if empty
             return rest;
         }
        return { ...prevWeekly, [currentWeekStartDate]: updatedWeek };
     });
      // Clear previous analysis/recommendations when a recipe is deleted from the current week
     setNutritionalAnalysis(null);
     setGeneratedRecipes(null);
      toast({
        title: "Recipe Removed",
        description: `The recipe has been removed from this week's list.`,
        variant: "destructive",
      });
  };

  // --- Preferences ---
  const handleUpdatePreferences = (data: UserPreferences) => {
    setUserPreferences(data);
    // Clear generated recipes when preferences change, prompt user to re-generate
    setGeneratedRecipes(null);
    toast({
      title: "Preferences Updated",
      description: "Your dietary needs and preferences have been saved.",
    });
  };

  // --- AI Features ---
  const triggerAnalysis = useCallback(async () => {
    if (currentWeekRecipes.length === 0) {
      toast({
        title: "No Recipes",
        description: "Please add some recipes for this week before analyzing.",
        variant: "destructive",
      });
      return;
    }

    setIsLoadingAnalysis(true);
    setNutritionalAnalysis(null); // Clear previous analysis

    try {
       const analysisInput: AnalyzeNutritionalBalanceInput = {
         recipes: currentWeekRecipes.map(r => ({
           name: r.name,
           ingredients: r.ingredients.map(i => ({ name: i.name, quantity: i.quantity })),
         })),
       };
       const result = await analyzeNutritionalBalance(analysisInput);
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
    setGeneratedRecipes(null); // Clear previous suggestions

    // Find previous week's recipes
    const previousWeekStartDate = getWeekStartDate(subWeeks(parseISO(currentWeekStartDate), 1));
    const previousWeekRecipes = weeklyRecipes[previousWeekStartDate] || [];
    const previousWeekRecipesString = previousWeekRecipes.length > 0
        ? previousWeekRecipes.map(recipe =>
             `Recipe: ${recipe.name}\nIngredients:\n${recipe.ingredients.map(ing => `- ${ing.name} (${ing.quantity}g)`).join('\n')}`
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
      setGeneratedRecipes(result);
      toast({
        title: "Recipe Suggestions Ready",
        description: `New ideas generated for the week of ${format(parseISO(currentWeekStartDate), 'MMM d')}!`,
      });
    } catch (error) {
      console.error("Error generating weekly recipes:", error);
      toast({
        title: "Generation Failed",
        description: "Could not generate weekly recipe suggestions. Please try again.",
        variant: "destructive",
      });
      setGeneratedRecipes(null); // Ensure it stays null on error
    } finally {
      setIsLoadingGeneration(false);
    }
  }, [currentWeekStartDate, userPreferences, weeklyRecipes, toast]);


  return (
    <main className="container mx-auto p-4 md:p-8 flex flex-col items-center min-h-screen bg-background">
       <div className="flex items-center justify-center mb-4 text-center w-full max-w-4xl">
         <Button variant="ghost" size="icon" onClick={goToPreviousWeek} aria-label="Previous Week">
            <ArrowLeft className="h-5 w-5" />
         </Button>
         <h1 className="text-3xl md:text-4xl font-bold text-primary flex items-center gap-2 mx-4 flex-1 justify-center">
            <Calendar className="w-7 h-7 md:w-8 md:h-8 text-primary" />
             <span className="whitespace-nowrap">{formatWeekDisplay(currentWeekStartDate)}</span>
         </h1>
         <Button variant="ghost" size="icon" onClick={goToNextWeek} aria-label="Next Week">
            <ArrowRight className="h-5 w-5" />
         </Button>
       </div>
       <p className="text-muted-foreground mb-8">Manage and analyze your recipes week by week.</p>


      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left Column: Input and List */}
        <div className="space-y-8">
          <RecipeInputForm onAddRecipe={handleAddRecipe} currentWeekStartDate={currentWeekStartDate} />
          <RecipeList recipes={currentWeekRecipes} onDeleteRecipe={handleDeleteRecipe} weekStartDate={currentWeekStartDate} />
        </div>

        {/* Right Column: Preferences, Actions, Analysis, Recommendations */}
        <div className="space-y-8">
           <PreferencesForm onSubmitPreferences={handleUpdatePreferences} defaultValues={userPreferences} />

            {/* Action Buttons */}
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Button
                 onClick={triggerAnalysis}
                 disabled={isLoadingAnalysis || currentWeekRecipes.length === 0}
                 className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
               >
                 {isLoadingAnalysis ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <ListChecks className="mr-2 h-4 w-4" />}
                 Analyze This Week
              </Button>
               <Button
                 onClick={triggerWeeklyGeneration}
                 disabled={isLoadingGeneration}
                 className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
               >
                  {isLoadingGeneration ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <ChefHat className="mr-2 h-4 w-4" />}
                 Generate Weekly Recipes
               </Button>
           </div>

          <NutritionalAnalysis analysis={nutritionalAnalysis} isLoading={isLoadingAnalysis} weekStartDate={currentWeekStartDate} />
          {/* Use RecipeRecommendations to display the generated recipes */}
          <RecipeRecommendations
             recommendations={generatedRecipes?.suggestedRecipes.map(r => `${r.name}: ${r.description}`) ?? null}
             notes={generatedRecipes?.notes}
             isLoading={isLoadingGeneration}
             title="Weekly Recipe Suggestions"
             description={`AI-generated ideas for the week of ${format(parseISO(currentWeekStartDate), 'MMM d')}.`}
           />
        </div>
      </div>
    </main>
  );
}
