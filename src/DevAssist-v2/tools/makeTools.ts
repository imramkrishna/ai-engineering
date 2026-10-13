import { makeDatabaseTools } from "./databaseTools.js";
import { makeWebTools } from "./webTools.js";
import type { SessionContext } from "./types.js";
import type { StructuredTool } from "langchain";

type DevAssistTool =
  | ReturnType<typeof makeWebTools>[number]
  | ReturnType<typeof makeDatabaseTools>[number];

export function makeTools(ctx: SessionContext): DevAssistTool[] {
  return [...makeWebTools(), ...makeDatabaseTools(ctx)];
}
