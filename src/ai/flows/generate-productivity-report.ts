'use server';
/**
 * @fileOverview A flow for generating a detailed productivity loss report by sector.
 *
 * - generateProductivityReport - A function that generates the productivity report.
 * - GenerateProductivityReportInput - The input type for the generateProductivityReport function.
 * - GenerateProductivityReportOutput - The return type for the generateProductivityReport function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateProductivityReportInputSchema = z.object({
  employees: z.string().describe("A JSON string array of all employees, including their 'sector' and 'scheduleId'."),
  schedules: z.string().describe("A JSON string array of all available work schedules."),
  punches: z.string().describe("A JSON string array of all clock punches for the period."),
  period: z.string().describe('The reporting period, e.g., "01/07/2024 a 31/07/2024".'),
});
export type GenerateProductivityReportInput = z.infer<typeof GenerateProductivityReportInputSchema>;

const GenerateProductivityReportOutputSchema = z.object({
  report: z.string().describe('A detailed productivity loss report formatted in Markdown.'),
});
export type GenerateProductivityReportOutput = z.infer<typeof GenerateProductivityReportOutputSchema>;

export async function generateProductivityReport(input: GenerateProductivityReportInput): Promise<GenerateProductivityReportOutput> {
  return generateProductivityReportFlow(input);
}

// The flow is simplified to return a static report, avoiding any actual AI calls.
const generateProductivityReportFlow = ai.defineFlow(
  {
    name: 'generateProductivityReportFlow',
    inputSchema: GenerateProductivityReportInputSchema,
    outputSchema: GenerateProductivityReportOutputSchema,
  },
  async (input) => {
    return {
      report: `### Relatório Indisponível\n\n- **Período:** ${input.period}\n- **Status:** A funcionalidade de geração de relatórios de produtividade está temporariamente desativada para manutenção.`,
    };
  }
);
