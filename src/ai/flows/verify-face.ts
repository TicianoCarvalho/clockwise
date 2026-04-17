'use server';
/**
 * @fileOverview A face verification AI agent.
 *
 * - verifyFace - A function that handles the face verification process.
 * - VerifyFaceInput - The input type for the verifyFace function.
 * - VerifyFaceOutput - The return type for the verifyFace function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ReferencePhotoSchema = z.object({
    id: z.string(),
    name: z.string(),
    dataUri: z.string().describe("A data URI of the reference photo."),
});

const VerifyFaceInputSchema = z.object({
  capturedPhotoDataUri: z
    .string()
    .describe(
      "A photo of a person to verify, as a data URI that must include a MIME type and use Base64 encoding."
    ),
  referencePhotos: z.array(ReferencePhotoSchema).describe("An array of reference photos to compare against."),
});
export type VerifyFaceInput = z.infer<typeof VerifyFaceInputSchema>;

const VerifyFaceOutputSchema = z.object({
  match: z.boolean().describe("Whether a match was found."),
  matchId: z.string().nullable().describe("The ID of the matched reference photo, or null if no match."),
  reason: z.string().optional().describe("The reason for no match (e.g., NO_FACE_DETECTED, NO_MATCH_FOUND)."),
});
export type VerifyFaceOutput = z.infer<typeof VerifyFaceOutputSchema>;

export async function verifyFace(input: VerifyFaceInput): Promise<VerifyFaceOutput> {
  if (input.referencePhotos.length === 0) {
    return { match: false, matchId: null, reason: 'NO_REFERENCE_PHOTOS' };
  }
  return verifyFaceFlow(input);
}

const prompt = ai.definePrompt({
  name: 'verifyFacePrompt',
  input: {schema: VerifyFaceInputSchema},
  output: {schema: VerifyFaceOutputSchema, format: 'json'},
  prompt: `You are an expert in face verification. Your task is to identify if the person in the captured photo matches any of the people from the provided reference photos.

Captured Photo to verify:
{{media url=capturedPhotoDataUri}}

Here are the reference photos of known individuals:
{{#each referencePhotos}}
- ID: {{id}}, Name: {{name}}
  {{media url=dataUri}}
{{/each}}

Analyze the captured photo.
1. First, determine if there is a clear, single human face in the "Captured Photo".
2. If a face is present, compare it against all reference photos.
3. Respond with the 'id' of the single best match from the reference list.

Your response must be in JSON format and adhere to the following rules:
- If a confident match is found, set 'match' to true and 'matchId' to the corresponding ID of the best match.
- If no clear face is detected in the captured photo, set 'match' to false, 'matchId' to null, and 'reason' to 'NO_FACE_DETECTED'.
- If a face is detected but it does not match any reference photo with high confidence, set 'match' to false, 'matchId' to null, and 'reason' to 'NO_MATCH_FOUND'.
`,
});

const verifyFaceFlow = ai.defineFlow(
  {
    name: 'verifyFaceFlow',
    inputSchema: VerifyFaceInputSchema,
    outputSchema: VerifyFaceOutputSchema,
  },
  async input => {
    try {
        const {output} = await prompt(input);
        return output!;
    } catch(e) {
        console.error("Face verification flow failed", e);
        return { match: false, matchId: null, reason: 'FLOW_ERROR' };
    }
  }
);
