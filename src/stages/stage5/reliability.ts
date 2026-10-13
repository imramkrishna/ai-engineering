import { createMiddleware, toolRetryMiddleware, ToolMessage } from "langchain";

const toolErrorAsMessages = createMiddleware({
  name: "ToolErrorsAsMessages",
  wrapToolCall: async (request, handler) => {
    try {
      return await handler(request);
    } catch (error) {
      return new ToolMessage({
        content: `Tool failed: ${error}. Try different arguments or another tool.`,
        tool_call_id: request.toolCall.id!,
      });
    }
  },
});

export default toolErrorAsMessages