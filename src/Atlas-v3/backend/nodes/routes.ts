import type { AtlasState } from "../state.js";

export const routeAfterRetrieval = (
  s: typeof AtlasState.State,
): "generate" | "rewriteQuery" => {
  if (s.documents.length >= 2) return "generate";
  if (s.retrievalAttempt < 3) return "rewriteQuery";
  return s.documents.length === 1 ? "generate" : "rewriteQuery";
};

export const routeAfterValidation = (s: typeof AtlasState.State) => {
  if (s.issues.length === 0) {
    return "finalize";
  }
  if (s.generationAttempt < 2) {
    return "regenerate";
  }
  return "insufficientContext";
};
