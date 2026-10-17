import type { AtlasState } from "../state.js";

export const routeAfterRetrieval = (
  s: typeof AtlasState.State,
): "generate" | "rewriteQuery" | "insufficientContext" => {
  if (s.documents.length >= 2) return "generate";
  if (s.retrievalAttempt < 3) return "rewriteQuery";
  return s.documents.length === 1 ? "generate" : "insufficientContext";
};

export const routeAfterValidation = (
  s: typeof AtlasState.State,
): "finalize" | "generate" | "insufficientContext" => {
  if (s.issues.length === 0) {
    return "finalize";
  }
  if (s.generationAttempt < 2) {
    return "generate";
  }
  return "insufficientContext";
};
