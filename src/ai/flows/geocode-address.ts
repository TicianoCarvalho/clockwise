'use server';
/**
 * @fileOverview A flow for converting a physical address into geographic coordinates.
 *
 * - geocodeAddress - A function that handles the geocoding process.
 * - GeocodeAddressInput - The input type for the geocodeAddress function.
 * - GeocodeAddressOutput - The return type for the geocodeAddress function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GeocodeAddressInputSchema = z.object({
  address: z.string().describe('The physical address to geocode.'),
});
export type GeocodeAddressInput = z.infer<typeof GeocodeAddressInputSchema>;

const GeocodeAddressOutputSchema = z.object({
  latitude: z.number().describe('The latitude of the address.'),
  longitude: z.number().describe('The longitude of the address.'),
});
export type GeocodeAddressOutput = z.infer<typeof GeocodeAddressOutputSchema>;

export async function geocodeAddress(input: GeocodeAddressInput): Promise<GeocodeAddressOutput> {
  if (!process.env.GEMINI_API_KEY && !process.env.GOOGLE_API_KEY) {
    console.warn("A chave de API do Gemini não está configurada. Usando coordenadas de fallback.");
    return { latitude: -3.73186, longitude: -38.5267 }; // Default to Fortaleza
  }
  return geocodeAddressFlow(input);
}

const prompt = ai.definePrompt({
  name: 'geocodeAddressPrompt',
  input: {schema: GeocodeAddressInputSchema},
  output: {schema: GeocodeAddressOutputSchema, format: 'json'},
  prompt: `You are a helpful geocoding assistant. Given the following address, provide its approximate geographic coordinates (latitude and longitude).

  Address: {{{address}}}

  Return ONLY the latitude and longitude in the specified JSON format. Provide numbers, not strings.`,
});

const geocodeAddressFlow = ai.defineFlow(
  {
    name: 'geocodeAddressFlow',
    inputSchema: GeocodeAddressInputSchema,
    outputSchema: GeocodeAddressOutputSchema,
  },
  async input => {
    try {
        const {output} = await prompt(input);
        return output!;
    } catch(e) {
        console.error("Geocoding flow failed, returning fallback coordinates.", e);
        return { latitude: -3.73186, longitude: -38.5267 }; // Default to Fortaleza on error
    }
  }
);
