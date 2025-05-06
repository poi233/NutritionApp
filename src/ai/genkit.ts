import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import { defineDotprompt } from "@genkit-ai/dotprompt";
import path from "path";

let googleApiKey: string | undefined = undefined;

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
     // Store the key for explicit passing and log success
     googleApiKey = process.env.GOOGLE_API_KEY;
     console.log("[Genkit Init] GOOGLE_API_KEY found and will be used (ending with '..." + googleApiKey.slice(-4) + "').");
}

let googleAIPlugin;

try {
  googleAIPlugin = googleAI({
    // Explicitly pass the API key if it was found.
    // The plugin typically reads this implicitly, but being explicit can help debugging.
    apiKey: googleApiKey,
  });
} catch (error) {
  console.error("[Genkit Init Error] Error initializing Google AI plugin:", error);
}

export const ai = genkit({
  plugins: [
    googleAIPlugin,
     // defineDotprompt({ dir: path.join(__dirname, "../prompts") }), // Example if using .prompt files
  ],
  // Removed default model here, specify it in the prompt/generate call
  logLevel: 'debug', // Enable detailed logging for development
  enableTracing: true, // Enable tracing for debugging flows
});

// Add an extra check after initialization to see if the key was truly picked up (optional)
if (googleApiKey) {
    console.log("[Genkit Init] Google AI Plugin configured with API key.");
} else {
    console.warn("[Genkit Init] Google AI Plugin configured WITHOUT an API key. AI features will likely fail.");
}

// List available models - ensure `ai` is initialized first
if (ai && typeof ai.getAvailableModels === 'function') {
  ai.getAvailableModels().then(models => {
    console.log('[Genkit Init] Available Models:', models);
  }).catch(err => {
    console.error('[Genkit Init] Error getting available models:', err);
  });
} else {
  console.warn('[Genkit Init] Could not retrieve available models because Genkit AI object was not properly initialized or getAvailableModels function is missing.');
}
