import { ChatPanel } from "@/components/chat-panel";

export default function ChatPage() {
  return (
    <div className="flex h-full min-h-0 flex-col bg-muted/20 p-3 md:p-5">
      <ChatPanel
        className="h-full"
        title="就活AIチャット"
        description="あなたの就活データを横断して回答します。"
      />
    </div>
  );
}
