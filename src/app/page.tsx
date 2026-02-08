"use client";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import Link from "next/link";

export default function Dashboard() {
  const conversations = useQuery(api.conversations.list, { status: "open" });

  const grouped = (conversations || []).reduce((acc: Record<string, any[]>, c) => {
    (acc[c.siteId] = acc[c.siteId] || []).push(c);
    return acc;
  }, {});

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-2">🛸 OrionChat Admin</h1>
      <p className="text-gray-400 mb-8">Open conversations</p>
      {!conversations ? (
        <p className="text-gray-500">Loading...</p>
      ) : Object.keys(grouped).length === 0 ? (
        <p className="text-gray-500">No open conversations</p>
      ) : (
        Object.entries(grouped).map(([siteId, convos]) => (
          <div key={siteId} className="mb-8">
            <h2 className="text-lg font-semibold text-emerald-400 mb-3">{siteId}</h2>
            <div className="space-y-2">
              {convos
                .sort((a: any, b: any) => b.updatedAt - a.updatedAt)
                .map((c: any) => (
                  <Link
                    key={c._id}
                    href={`/chat/${c._id}`}
                    className="block bg-gray-900 border border-gray-800 rounded-lg p-4 hover:border-emerald-500 transition"
                  >
                    <div className="flex justify-between">
                      <span className="font-medium">{c.visitorName || c.sessionId.slice(0, 8)}</span>
                      <span className="text-gray-500 text-sm">
                        {new Date(c.updatedAt).toLocaleString()}
                      </span>
                    </div>
                    {c.pageUrl && <p className="text-gray-500 text-sm mt-1">{c.pageUrl}</p>}
                  </Link>
                ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
