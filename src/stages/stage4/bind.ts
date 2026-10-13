import { HumanMessage } from "langchain";
import { getChatModel } from "../../packages/models/models.js";
import { searchDocuments } from "./tools/search-docs.js";

const model=getChatModel().bindTools([searchDocuments]);

const ai=await model.invoke("Search the documents from the database.")

console.log(ai.tool_calls)


