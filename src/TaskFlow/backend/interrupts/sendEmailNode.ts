import { interrupt, type GraphNode } from "@langchain/langgraph";
import { TaskFlowState } from "../utils/types.js";

export const sendEmailNode: GraphNode<typeof TaskFlowState> = async (state) => {
  const humanAnswer = interrupt("Do you approve sending this email ?(yes/no)");
  if (humanAnswer === "yes") {
    console.log("User Approved.Email Sent Successfully.");
  } else {
    console.log("User Denied Sending email.");
  }
  return {};
};
