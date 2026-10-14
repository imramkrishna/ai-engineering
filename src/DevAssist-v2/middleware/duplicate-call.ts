import { ToolMessage } from "@langchain/core/messages";
import { createMiddleware } from "langchain";

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }

  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
        .map(([key, nestedValue]) => [key, canonicalize(nestedValue)]),
    );
  }

  return value;
}

function getNormalizedKey(toolName: string, args: unknown) {
  const canonicalArgs = JSON.stringify(canonicalize(args));

  if (canonicalArgs === undefined) {
    throw new Error(`Arguments for tool "${toolName}" are not JSON-serializable.`);
  }

  return `${toolName}:${canonicalArgs}`;
}

const executedCalls = new Set<string>();

export const duplicateCallMiddleware = createMiddleware({
  name: "duplicate_call_middleware",
  wrapToolCall: async (request, handler) => {
    const normalizedKey = getNormalizedKey(
      request.toolCall.name,
      request.toolCall.args,
    );
    if (executedCalls.has(normalizedKey)) {
      return new ToolMessage({
        tool_call_id: request.toolCall.id as string,
        content: JSON.stringify({
          ok: false,
          code: "DUPLICATE CALL",
          messages: "This exact tool call was already executed.",
        }),
      });
    }
    const result = await handler(request);
    executedCalls.add(normalizedKey);
    return result;
  },
});
