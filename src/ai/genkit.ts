import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import { defineDotprompt } from "@genkit-ai/dotprompt";
import path from "path";

// Check if GOOGLE_API_KEY is set
if (!process.env.GOOGLE_API_KEY) {
  console.error(
    '\n[Genkit Init Error] FATAL: GOOGLE_API_KEY environment variable is not set.\n' +
    'Generative AI features will NOT work.\n' +
    '1. Ensure you have a `.env` file in the root of your project.\n' +
    '2. Add the following line to your `.env` file:\n' +
    '   GOOGLE_API_KEY=YOUR_API_KEY_HERE\n' +
    '3. Replace `YOUR_API_KEY_HERE` with your actual key from Google AI Studio.\n' +
    '4. Get a key here: https://aistudio.google.com/app/apikey\n' +
    '5. Restart your development server (`npm run dev` and `npm run genkit:dev`).\n'
  );
   // Optional: Throw an error to prevent the app from potentially running
   // in a broken state if the key is absolutely essential.
   // throw new Error("Missing GOOGLE_API_KEY environment variable. AI features disabled.");
} else {
     // Optional: Log success or partial key for verification (DO NOT log the full key)
     console.log("[Genkit Init] GOOGLE_API_KEY found (ending with '..." + process.env.GOOGLE_API_KEY.slice(-4) + "').");
}

export const ai = genkit({
  plugins: [
    googleAI({
        // The API key is implicitly read from the GOOGLE_API_KEY environment variable
        // You can explicitly pass apiKey: process.env.GOOGLE_API_KEY if needed,
        // but it's typically handled automatically by the googleAI plugin.
    }),
     // defineDotprompt({ dir: path.join(__dirname, "../prompts") }), // Example if using .prompt files
  ],
  // Removed default model here, specify it in the prompt/generate call
  // model: 'googleai/gemini-1.5-flash-latest', // Ensure this model exists or use a valid one
  logLevel: 'debug', // Enable detailed logging for development
  enableTracing: true, // Enable tracing for debugging flows
});
