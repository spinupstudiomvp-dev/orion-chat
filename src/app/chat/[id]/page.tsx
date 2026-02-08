"use client";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useParams } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Id } from "../../../../convex/_generated/dataModel";

export default function ChatPage() {
  const { id } = useParams();
  const convId = id as Id<"conversations">;
  const conversation = useQuery(api.conversations.get, { id: convId });
  const messages = useQuery(api.messages.list, { conversationId: convId });
  const sendMessage = useMutation(api.messages.send);
  const resolveConvo = useMutation(api.conversations.resolve);
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!text.trim()) return;
    await sendMessage({ conversationId: convId, sender: "agent", text: text.trim() });
    setText("");
  };

  return (
    <div className="max-w-3xl mx-auto p-8 flex flex-col h-screen">
      <div className="flex items-center justify-between mb-4">
        <Link href="/" className="text-gray-400 hover:text-white">← Back</Link>
        {conversation && (
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">{conversation.siteId} / {conversation.visitorName || conversation.sessionId.slice(0, 8)}</span>
            {conversation.status === "open" && (
              <button
                onClick={() => resolveConvo({ id: convId })}
                className="text-sm bg-gray-800 px-3 py-1 rounded hover:bg-gray-700"
              >
                Resolve
              </button>
            )}
          </div>
        )}
      </div>
      <div className="flex-1 overflow-y-auto space-y-3 mb-4">
        {(messages || []).map((m) => (
          <div key={m._id} className={`flex ${m.sender === "agent" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[70%] px-4 py-2 rounded-2xl text-sm ${
                m.sender === "agent"
                  ? "bg-emerald-600 text-white"
                  : "bg-gray-800 text-gray-100"
              }`}
            >
              {m.text}
              <div className="text-[10px] mt-1 opacity-50">
                {new Date(m.createdAt).toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Type a reply..."
          className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 focus:outline-none focus:border-emerald-500"
        />
        <button
          onClick={handleSend}
          className="bg-emerald-600 hover:bg-emerald-500 px-6 py-3 rounded-lg font-medium"
        >
          Send
        </button>
      </div>
    </div>
  );
}
