"use client";

import { useState, useEffect, useCallback } from "react";
import type { Recipe } from "@/types/recipe";
import { RecipeInputForm } from "@/components/recipe-input-form";
import { RecipeList } from "@/components/recipe-list";
import { NutritionalAnalysis } from "@/components/nutritional-analysis";
import { RecipeRecommendations } from "@/components/recipe-recommendations";
import { PreferencesForm } from "@/components/preferences-form";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { analyzeNutritionalBalance, type AnalyzeNutritionalBalanceOutput, type AnalyzeNutritionalBalanceInput } from "@/ai/flows/analyze-nutritional-balance";
import { recommendNewRecipes, type RecommendNewRecipesOutput, type RecommendNewRecipesInput } from "@/ai/flows/recommend-new-recipes";
import { ChefHat, ListChecks, RefreshCw } from "lucide-react";


interface UserPreferences {
  dietaryNeeds?: string;
  preferences?: string;
}

export default function Home() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [nutritionalAnalysis, setNutritionalAnalysis] = useState<AnalyzeNutritionalBalanceOutput | null>(null);
  const [recommendations, setRecommendations] = useState<string[] | null>(null);
  const [userPreferences, setUserPreferences] = useState<UserPreferences>({ dietaryNeeds: "", preferences: "" });
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false);
  const { toast } = useToast();

  // Load data from localStorage on initial render
  useEffect(() => {
    const storedRecipes = localStorage.getItem("nutrijournal_recipes");
    const storedPreferences = localStorage.getItem("nutrijournal_preferences");
    if (storedRecipes) {
      setRecipes(JSON.parse(storedRecipes));
    }
     if (storedPreferences) {
      setUserPreferences(JSON.parse(storedPreferences));
    }
  }, []);

  // Save recipes to localStorage whenever they change
  useEffect(() => {
    if (recipes.length > 0) {
      localStorage.setItem("nutrijournal_recipes", JSON.stringify(recipes));
    } else {
       localStorage.removeItem("nutrijournal_recipes"); // Clear if empty
    }
  }, [recipes]);

   // Save preferences to localStorage whenever they change
   useEffect(() => {
    localStorage.setItem("nutrijournal_preferences", JSON.stringify(userPreferences));
   }, [userPreferences]);

  const handleAddRecipe = (newRecipe: Recipe) => {
    setRecipes((prevRecipes) => [...prevRecipes, newRecipe]);
     // Clear previous analysis/recommendations when a recipe is added
     setNutritionalAnalysis(null);
     setRecommendations(null);
    toast({
      title: "Recipe Added",
      description: `${newRecipe.name} has been added to your list.`,
    });
  };

  const handleDeleteRecipe = (recipeId: string) => {
     setRecipes((prevRecipes) => prevRecipes.filter(recipe => recipe.id !== recipeId));
      // Clear previous analysis/recommendations when a recipe is deleted
     setNutritionalAnalysis(null);
     setRecommendations(null);
      toast({
        title: "Recipe Removed",
        description: `The recipe has been removed from your list.`,
        variant: "destructive",
      });
  };

  const handleUpdatePreferences = (data: UserPreferences) => {
    setUserPreferences(data);
    // Clear recommendations when preferences change, prompt user to re-generate
    setRecommendations(null);
    toast({
      title: "Preferences Updated",
      description: "Your dietary needs and preferences have been saved.",
    });
  };

  const triggerAnalysis = useCallback(async () => {
    if (recipes.length === 0) {
      toast({
        title: "No Recipes",
        description: "Please add some recipes before analyzing.",
        variant: "destructive",
      });
      return;
    }

    setIsLoadingAnalysis(true);
    setNutritionalAnalysis(null); // Clear previous analysis

    try {
       const analysisInput: AnalyzeNutritionalBalanceInput = {
         recipes: recipes.map(r => ({
           name: r.name,
           ingredients: r.ingredients.map(i => ({ name: i.name, quantity: i.quantity })),
         })),
       };
       const result = await analyzeNutritionalBalance(analysisInput);
       setNutritionalAnalysis(result);
       toast({
         title: "Analysis Complete",
         description: "Nutritional insights generated successfully.",
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
  }, [recipes, toast]);


  const triggerRecommendations = useCallback(async () => {
     if (recipes.length === 0) {
       toast({
         title: "No Recipes",
         description: "Add some recipes first to get relevant recommendations.",
         variant: "destructive",
       });
       return;
     }

    setIsLoadingRecommendations(true);
    setRecommendations(null); // Clear previous recommendations


    try {
       // Prepare weekly recipes string
       const weeklyRecipesString = recipes.map(recipe =>
         `Recipe: ${recipe.name}\nIngredients:\n${recipe.ingredients.map(ing => `- ${ing.name} (${ing.quantity}g)`).join('\n')}`
       ).join('\n\n');

       const recommendationInput: RecommendNewRecipesInput = {
         dietaryNeeds: userPreferences.dietaryNeeds || "None specified",
         preferences: userPreferences.preferences || "None specified",
         weeklyRecipes: weeklyRecipesString,
       };

      const result = await recommendNewRecipes(recommendationInput);
      setRecommendations(result.recipes);
      toast({
        title: "Recommendations Ready",
        description: "New recipe ideas have been generated for you!",
      });
    } catch (error) {
      console.error("Error recommending recipes:", error);
      toast({
        title: "Recommendation Failed",
        description: "Could not generate recipe recommendations. Please try again.",
        variant: "destructive",
      });
      setRecommendations(null); // Ensure it stays null on error
    } finally {
      setIsLoadingRecommendations(false);
    }
  }, [recipes, userPreferences, toast]);


  return (
    <main className="container mx-auto p-4 md:p-8 flex flex-col items-center min-h-screen bg-background">
      <h1 className="text-4xl font-bold mb-8 text-primary flex items-center gap-2">
         <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-primary">
          <path d="M12.75 10.326a1.5 1.5 0 1 1-1.5 1.5a1.5 1.5 0 0 1 1.5-1.5Z" />
          <path fillRule="evenodd" d="M6 3.75a5.25 5.25 0 0 1 5.25-1.5h1.5a5.25 5.25 0 0 1 5.25 1.5v16.5a1.5 1.5 0 0 1-1.5 1.5h-10.5a1.5 1.5 0 0 1-1.5-1.5V3.75Zm1.5 15.75a1.5 1.5 0 0 1 1.5-1.5h7.5a1.5 1.5 0 0 1 1.5 1.5v.75a.75.75 0 0 1-.75.75H8.25a.75.75 0 0 1-.75-.75v-.75Zm.75-12a.75.75 0 0 0-.75.75v6a.75.75 0 0 0 .75.75h9a.75.75 0 0 0 .75-.75v-6a.75.75 0 0 0-.75-.75h-9Z" clipRule="evenodd" />
        </svg>
        NutriJournal
      </h1>

      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left Column: Input and List */}
        <div className="space-y-8">
          <RecipeInputForm onAddRecipe={handleAddRecipe} />
          <RecipeList recipes={recipes} onDeleteRecipe={handleDeleteRecipe} />
        </div>

        {/* Right Column: Preferences, Actions, Analysis, Recommendations */}
        <div className="space-y-8">
           <PreferencesForm onSubmitPreferences={handleUpdatePreferences} defaultValues={userPreferences} />

            {/* Action Buttons */}
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Button
                 onClick={triggerAnalysis}
                 disabled={isLoadingAnalysis || recipes.length === 0}
                 className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
               >
                 {isLoadingAnalysis ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <ListChecks className="mr-2 h-4 w-4" />}
                 Analyze Nutrition
              </Button>
               <Button
                 onClick={triggerRecommendations}
                 disabled={isLoadingRecommendations || recipes.length === 0}
                 className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
               >
                  {isLoadingRecommendations ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <ChefHat className="mr-2 h-4 w-4" />}
                 Recommend Recipes
               </Button>
           </div>

          <NutritionalAnalysis analysis={nutritionalAnalysis} isLoading={isLoadingAnalysis} />
          <RecipeRecommendations recommendations={recommendations} isLoading={isLoadingRecommendations} />
        </div>
      </div>
    </main>
  );
}

