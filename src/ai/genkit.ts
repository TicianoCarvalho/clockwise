import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

/**
 * Inicializa a instância do Genkit imediatamente.
 * Exportar como 'ai' resolve o erro de importação nos arquivos de flows (ex: geocode-address.ts).
 */
export const ai = genkit({
  plugins: [googleAI()],
  model: 'googleai/gemini-2.0-flash', // Recomendo usar 2.0-flash para maior estabilidade no build
});

/**
 * Mantém a função getAI para compatibilidade com outros arquivos 
 * que possam estar chamando getAI() em vez de usar a constante diretamente.
 */
export function getAI() {
  return ai;
}