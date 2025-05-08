
# NutriJournal - Weekly Meal Planner & Analyzer

This is a Next.js application built with Firebase IDX that helps you plan your weekly meals, track recipes, and analyze their nutritional balance using AI.

![Weekly Meal Planner Interface](https://picsum.photos/600/300?image=10)
<p align="center" data-ai-hint="weekly planner"><em>Figure 1: The weekly meal planner interface, showing meals for each day.</em></p>

## Features

*   **Weekly Planner:** Visualize your meals for the week (Monday-Sunday, Breakfast-Dinner).
    ![Planner Detail](https://picsum.photos/300/200?image=20)
    <p align="center" data-ai-hint="meal grid"><em>Figure 2: Meal card detail in the planner with nutritional info.</em></p>
*   **Recipe Management:** Add, view, and delete meals with ingredients and quantities.
    ![Add Recipe Form](https://picsum.photos/400/250?image=30)
    <p align="center" data-ai-hint="recipe form"><em>Figure 3: Adding a new meal via the form.</em></p>
*   **Nutritional Estimation:** Automatically estimates calories, protein, fat, and carbs for recipes with ingredients (using a basic placeholder service).
*   **AI-Powered Nutritional Analysis:** Get insights into the overall balance and macronutrient ratio of your weekly meals.
    ![Nutritional Analysis Chart](https://picsum.photos/400/250?image=40)
    <p align="center" data-ai-hint="nutrition chart"><em>Figure 4: AI-generated nutritional analysis and breakdown.</em></p>
*   **AI-Powered Meal Generation:** Generate diverse meal ideas based on your dietary needs and preferences, considering previous meals.
*   **Preference Management:** Save your dietary needs and food preferences.
    ![Preferences Form](https://picsum.photos/300/200?image=50)
    <p align="center" data-ai-hint="user preferences"><em>Figure 5: User preferences input form.</em></p>
*   **Weekly Ingredient Summary & Price Estimation:** Get a summary of all ingredients needed for the week and an estimated total cost.
    ![Weekly Summary and Price](https://picsum.photos/400/250?image=60)
    <p align="center" data-ai-hint="ingredient summary"><em>Figure 6: Weekly ingredient summary and estimated price.</em></p>
*   **Local Storage:** Your meal plans and preferences are saved in your browser.

## Getting Started

### Prerequisites

*   Node.js (v18 or later recommended)
*   npm or yarn

### Setup

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd <repository-directory>
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    # or
    yarn install
    ```

3.  **Set up Environment Variables:**
    *   Create a `.env` file in the root directory (or copy `.env.example` if it exists).
    *   Open the `.env` file in your editor.
    *   **Obtain a Google AI API Key:** Go to [Google AI Studio](https://aistudio.google.com/app/apikey) and create an API key.
    *   **Add the API Key to `.env`:** Replace `YOUR_API_KEY_HERE` with your actual Google AI API key:
        ```env
        GOOGLE_API_KEY=YOUR_API_KEY_HERE
        ```
    *   **Important:** Keep your API key secret. Do not commit the `.env` file to version control. Make sure there are no extra spaces or characters around the key.

### Running the Development Servers

You need to run **two** development servers concurrently in separate terminals:

1.  **Next.js Development Server (App Frontend & Backend):**
    ```bash
    npm run dev
    ```
    This usually starts the app on `http://localhost:9002`.

2.  **Genkit Development Server (for AI flow inspection - Optional but Recommended):**
    ```bash
    npm run genkit:dev
    ```
    This starts the Genkit development UI, typically on `http://localhost:4000`, allowing you to inspect and test your AI flows separately.

    *Note:* The Next.js app calls the AI flows directly as Server Actions. The `genkit:dev` server is primarily for debugging and observing the flows during development. The main application will function even without it running, but you won't have the Genkit inspection UI.

**Troubleshooting Authentication:** If you encounter errors related to API keys or authentication when using AI features:
*   **Double-check your `.env` file:** Ensure the `GOOGLE_API_KEY` is present, correct, and has no extra spaces or characters.
*   **Restart both servers:** After modifying `.env`, stop both the Next.js (`npm run dev`) and Genkit (`npm run genkit:dev`) servers and restart them completely. Changes to `.env` are often not picked up automatically.

### Accessing the App

Open your browser and navigate to `http://localhost:9002` (or the port specified in your terminal).

## Project Structure

*   `src/app/`: Next.js App Router pages and layouts.
    *   `page.tsx`: Main application page component.
    *   `layout.tsx`: Root layout.
    *   `globals.css`: Global styles and Tailwind CSS setup.
*   `src/components/`: Reusable React components.
    *   `ui/`: UI components from ShadCN.
    *   `weekly-planner.tsx`: Component for the meal grid.
    *   `recipe-input-form.tsx`: Form for adding new recipes.
    *   `nutritional-analysis.tsx`: Component to display AI analysis.
    *   `preferences-form.tsx`: Form for user preferences.
    *   `weekly-summary.tsx`: Component for weekly ingredient summary and price.
*   `src/ai/`: Genkit AI configuration and flows.
    *   `genkit.ts`: Genkit initialization and configuration.
    *   `flows/`: Directory containing Genkit flow definitions.
        *   `analyze-nutritional-balance.ts`: Flow for analyzing weekly nutrition.
        *   `generate-weekly-recipes.ts`: Flow for generating recipe suggestions.
*   `src/services/`: Application-specific services.
    *   `nutrition.ts`: Placeholder service for fetching nutritional data.
    *   `pricing.ts`: Placeholder service for estimating ingredient prices.
*   `src/types/`: TypeScript type definitions.
    *   `recipe.ts`: Defines `Recipe` and `Ingredient` types.
*   `src/hooks/`: Custom React hooks.
*   `src/lib/`: Utility functions.
*   `public/`: Static assets.
*   `tailwind.config.ts`: Tailwind CSS configuration.
*   `next.config.ts`: Next.js configuration.
*   `tsconfig.json`: TypeScript configuration.
*   `components.json`: ShadCN UI configuration.

## Key Technologies

*   Next.js (App Router)
*   React
*   TypeScript
*   Tailwind CSS
*   ShadCN UI
*   Genkit (for AI integration)
*   Google AI (via Genkit)
*   Zod (for schema validation)
*   React Hook Form
*   date-fns
*   Recharts (for charts)

```