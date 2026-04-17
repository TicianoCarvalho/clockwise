'use server';

/**
 * @fileOverview A flow for generating a summarized report of potential clock-in discrepancies identified by AI.
 *
 * - generateAnomalyReport - A function that generates the anomaly report.
 * - GenerateAnomalyReportInput - The input type for the generateAnomalyReport function.
 * - GenerateAnomalyReportOutput - The return type for the generateAnomalyReport function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateAnomalyReportInputSchema = z.object({
  anomalyDescription: z.string().describe('A descrição da anomalia de ponto a ser analisada, fornecida pelo usuário.'),
  managerName: z.string().describe('O nome do gestor ou analista que solicitou o relatório.'),
});
export type GenerateAnomalyReportInput = z.infer<typeof GenerateAnomalyReportInputSchema>;

const GenerateAnomalyReportOutputSchema = z.object({
  report: z.string().describe('Um relatório detalhado formatado em Markdown, analisando a anomalia.'),
});
export type GenerateAnomalyReportOutput = z.infer<typeof GenerateAnomalyReportOutputSchema>;

export async function generateAnomalyReport(input: GenerateAnomalyReportInput): Promise<GenerateAnomalyReportOutput> {
  return generateAnomalyReportFlow(input);
}

const generateAnomalyReportFlow = ai.defineFlow(
  {
    name: 'generateAnomalyReportFlow',
    inputSchema: GenerateAnomalyReportInputSchema,
    outputSchema: GenerateAnomalyReportOutputSchema,
  },
  async (input) => {
    // Return a static report to guarantee stability and prevent build/runtime errors.
    return {
      report: `### Relatório Temporariamente Indisponível\n\n- **Anomalia Descrita:** ${input.anomalyDescription}\n- **Status:** A funcionalidade de geração de relatórios com IA está em manutenção. Um erro impediu a análise.`,
    };
  }
);
