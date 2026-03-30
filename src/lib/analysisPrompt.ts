import { FULL_ANALYSIS_PROMPT } from "./fullPrompt";

export function buildAnalysisPrompt(rawData: string): string {
  return FULL_ANALYSIS_PROMPT.replace("{{DATA}}", rawData);
}
