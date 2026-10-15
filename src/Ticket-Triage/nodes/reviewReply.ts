import { getChatModel } from "../../packages/models/models.js";
import type { TriageState } from "../types.js";

const model = getChatModel();

export async function reviewReply(state: typeof TriageState.State) {
  const result = await model.invoke([
    {
      role: "system",
      content: `Review the support reply.
Return exactly "pass" if it is clear and helpful.
Otherwise return brief feedback explaining what to improve.`,
    },
    {
      role: "user",
      content: `Ticket: ${state.ticket}
Draft: ${state.draft}`,
    },
  ]);
  const feedback = String(result.content).trim();

  return {
    reviewNotes: feedback.toLowerCase() === "pass" ? [] : [feedback],
  };
}
