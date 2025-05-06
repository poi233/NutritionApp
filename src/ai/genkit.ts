import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import { defineDotprompt } from "@genkit-ai/dotprompt";
import path from "path";

// Check if GOOGLE_API_KEY is set
if (!process.env.GOOGLE_API_KEY) {
  console.warn(
    '\nWARNING: GOOGLE_API_KEY environment variable not set.\n' +
    'Generative AI features will not work. Please set the key in your .env file.\n' +
    'Get a key from Google AI Studio: https://aistudio.google.com/app/apikey\n'
  );
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
