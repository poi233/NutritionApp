import { config } from 'dotenv';
config();

import '@/ai/flows/analyze-nutritional-balance.ts';
import '@/ai/flows/recommend-new-recipes.ts'; // Keep old one for now, maybe remove later
import '@/ai/flows/generate-weekly-recipes.ts';
import '@/ai/flows/suggest-recipe-details.ts'; // Added new flow
