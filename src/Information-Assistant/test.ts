import {
  createNewConversation,
  updateConversationTitle,
} from "./services.ts/conversations.js";

console.log("Creating new conversation ");
const newConversation = await createNewConversation();
console.log("New Conversation Created. : ", newConversation);
console.log("Updating Conversation Id ");
const updatedTitle = await updateConversationTitle(
  newConversation!.id,
  "updated title",
);
console.log("Title Updated : ", updatedTitle);
