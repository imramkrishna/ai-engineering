import { getBackupChatModel } from "../packages/models.js";

const model = getBackupChatModel();
const response = await model.invoke("Which AI Model are you ?");

console.log(response.content);