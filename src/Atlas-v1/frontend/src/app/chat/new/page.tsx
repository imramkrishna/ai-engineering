"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { conversationsApi } from "@/lib/api/client";
import { ChatInput } from "@/components/chat";
import { EmptyState } from "@/components/ui";
import { MessageSquare } from "lucide-react";

export default function NewChatPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async (content: string) => {
    if (!content.trim()) return;
    
    setIsLoading(true);
    try {
      // Backend returns: { success: true, data: { conversationId, message, sources } }
      const response = await conversationsApi.newChat({ content: content.trim() });
      const conversationId = response.data?.conversationId;
      if (!conversationId) {
        throw new Error("No conversation ID returned from backend");
      }
      router.push(`/chat/${conversationId}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to start conversation");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-full flex items-center justify-center bg-background">
      <div className="w-full max-w-2xl px-6">
        <EmptyState
          icon={<MessageSquare size={32} />}
          title="Start a new conversation"
          description="Ask anything about your documents to begin a new chat."
          action={
            <div className="w-full max-w-lg mx-auto">
              <ChatInput
                onSend={handleSend}
                isLoading={isLoading}
                placeholder="Ask a question about your documents..."
                disabled={isLoading}
              />
            </div>
          }
        />
      </div>
    </div>
  );
}