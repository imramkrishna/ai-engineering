import { getChatModel } from "../../packages/models/models.js";
import { TriageState } from "../types.js";

const model = getChatModel();

export async function draftReply(state: typeof TriageState.State) {
  const response = await model.invoke([
    {
      role: "system",
      content: "DRAFT THE REPLY FOR THIS TICKET.",
    },
    {
      role: "human",
      content: JSON.stringify(state),
    },
  ]);
  return {
    draft: response.content,
    revisions: state.revisions + 1,
  };
}
