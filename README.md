# NutriJournal - Weekly Meal Planner & Analyzer

This is a Next.js application built with Firebase IDX that helps you plan your weekly meals, track recipes, and analyze their nutritional balance using AI.

## Features

*   **Weekly Planner:** Visualize your meals for the week (Monday-Sunday, Breakfast-Snack).
*   **Recipe Management:** Add, view, and delete meals with ingredients and quantities.
*   **Nutritional Estimation:** Automatically estimates calories, protein, fat, and carbs for recipes with ingredients (using a basic placeholder service).
*   **AI-Powered Nutritional Analysis:** Get insights into the overall balance and macronutrient ratio of your weekly meals.
*   **AI-Powered Meal Generation:** Generate diverse meal ideas based on your dietary needs and preferences, considering previous meals.
*   **Preference Management:** Save your dietary needs and food preferences.
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
    *   Copy the example environment file:
        ```bash
        cp .env.example .env
        ```
    *   Open the `.env` file in your editor.
    *   **Obtain a Google AI API Key:** Go to [Google AI Studio](https://aistudio.google.com/app/apikey) and create an API key.
    *   **Add the API Key to `.env`:** Replace `YOUR_API_KEY_HERE` with your actual Google AI API key:
        ```env
        GOOGLE_API_KEY=PASTE_YOUR_ACTUAL_API_KEY_HERE
        ```
    *   **Important:** Keep your API key secret. Do not commit the `.env` file to version control.

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
*   `src/ai/`: Genkit AI configuration and flows.
    *   `genkit.ts`: Genkit initialization and configuration.
    *   `flows/`: Directory containing Genkit flow definitions.
        *   `analyze-nutritional-balance.ts`: Flow for analyzing weekly nutrition.
        *   `generate-weekly-recipes.ts`: Flow for generating recipe suggestions.
*   `src/services/`: Application-specific services (e.g., nutrition data fetching).
    *   `nutrition.ts`: Placeholder service for fetching nutritional data.
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
