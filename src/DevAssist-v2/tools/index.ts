import { webTools } from "./webTools.js";
import { databaseTools } from "./databaseTools.js";

type WebTool = (typeof webTools)[number];
type DatabaseTool = (typeof databaseTools)[number];

const allTools: (WebTool | DatabaseTool)[] = [...webTools, ...databaseTools];

export default allTools;
