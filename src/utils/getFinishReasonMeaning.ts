function getFinishReasonMeaning(finishReason: string): string {
  switch (finishReason) {
    case "stop":
      return "The model finished generating normally.";

    case "length":
      return "The model stopped because it reached the maximum token limit.";

    case "tool_calls":
      return "The model stopped because it requested a tool call.";

    case "content_filter":
      return "The model stopped because the content was filtered by a safety system.";

    case "function_call":
      return "The model stopped because it requested a function call.";

    case "error":
      return "The model stopped because an error occurred.";

    default:
      return `Unknown finish reason: ${finishReason}`;
  }
}

export default getFinishReasonMeaning;