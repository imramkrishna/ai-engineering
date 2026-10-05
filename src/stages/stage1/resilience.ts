import { getBackupChatModel, getChatModel } from "../../packages/models/models.js";

const primary = getChatModel();
const backup = getBackupChatModel();

const robustModel = primary
  .withRetry({ stopAfterAttempt: 3 })
  .withFallbacks([backup]);
const messages = ["Hey!!! Explain Agentic AI."];
//This is error handler file that handles retries and backup model in case the primary models fails
const response = await robustModel.invoke(messages);
