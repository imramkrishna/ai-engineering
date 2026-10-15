import { END } from "@langchain/langgraph";
import type { TriageState } from "../types.js";

export async function routeAfterReview(state: typeof TriageState.State) {
  if (state.reviewNotes.length === 0) {
    return END;
  }

  if (state.revisions >= 3) {
    return END;
  }

  return "draftReply";
}
