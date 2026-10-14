import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import researchAgent from "./research-agent.js";

const rl = readline.createInterface({ input, output });

const context = {
  userId: "fAM9GkvxnzQ74jIQMPNf2lhK0ioRGV07",
  role: "member" as const,
};

type StreamUpdate = Record<string, unknown>;

function getMessages(update: unknown): unknown[] {
  if (update === null || typeof update !== "object") {
    return [];
  }

  const messages = (update as { messages?: unknown }).messages;
  return Array.isArray(messages) ? messages : [];
}

function getToolNames(messages: unknown[]): string[] {
  return messages.flatMap((message) => {
    if (message === null || typeof message !== "object") {
      return [];
    }

    const toolCalls = (message as { tool_calls?: unknown }).tool_calls;
    if (!Array.isArray(toolCalls)) {
      return [];
    }

    return toolCalls.flatMap((toolCall) => {
      if (
        toolCall !== null &&
        typeof toolCall === "object" &&
        typeof (toolCall as { name?: unknown }).name === "string"
      ) {
        return [(toolCall as { name: string }).name];
      }

      return [];
    });
  });
}

function printProgress(update: StreamUpdate): void {
  for (const [nodeName, nodeUpdate] of Object.entries(update)) {
    if (nodeName === "model") {
      const toolNames = getToolNames(getMessages(nodeUpdate));
      console.log(
        toolNames.length > 0
          ? `[model] Planning research (${toolNames.join(", ")})`
          : "[model] Preparing report",
      );
      continue;
    }

    if (nodeName === "tools") {
      const messages = getMessages(nodeUpdate);
      const toolNames = messages.flatMap((message) => {
        if (
          message !== null &&
          typeof message === "object" &&
          typeof (message as { name?: unknown }).name === "string"
        ) {
          return [(message as { name: string }).name];
        }

        return [];
      });

      console.log(
        toolNames.length > 0
          ? `[tool] ${toolNames.join(", ")}`
          : "[tool] Executing tool",
      );
      continue;
    }

    console.log(`[${nodeName}] Progress update`);
  }
}

async function runAgent() {
  while (true) {
    const query = await rl.question("Query : ");
    if (query === "exit") {
      console.log("Session Terminated.");
      rl.close();
      return;
    }

    try {
      const stream = await researchAgent.stream(
        {
          messages: [{ role: "user", content: query }],
        },
        {
          context,
          recursionLimit: 50,
          streamMode: "updates",
        },
      );

      let structuredResponse: unknown;

      for await (const update of stream) {
        const streamUpdate = update as StreamUpdate;
        printProgress(streamUpdate);

        for (const nodeUpdate of Object.values(streamUpdate)) {
          if (
            nodeUpdate !== null &&
            typeof nodeUpdate === "object" &&
            "structuredResponse" in nodeUpdate
          ) {
            structuredResponse = (
              nodeUpdate as { structuredResponse: unknown }
            ).structuredResponse;
          }
        }
      }

      console.log("[done] Report generated");
      if (structuredResponse !== undefined) {
        console.dir(structuredResponse, { depth: null });
      }
    } catch (error) {
      console.error(
        "Error while processing your request:",
        error instanceof Error ? error.message : error,
      );
    }
  }
}

runAgent();
