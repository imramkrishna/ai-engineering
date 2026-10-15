import model from "../model.js";
import type { TriageState } from "../types.js";

export async function classifyTicket(state: typeof TriageState.State) {
  const response = await model.invoke([
    {
      role: "system",
      content:
        'Classify the message as "bug" or "billing" or "question" or "unknown".',
    },
    {
      role: "user",
      content: state.ticket,
    },
  ]);
  const category =
    response.content === "bug"
      ? "bug"
      : response.content === "billing"
        ? "billing"
        : response.content === "question"
          ? "question"
          : "unknown";
  return {
    category,
  };
}
