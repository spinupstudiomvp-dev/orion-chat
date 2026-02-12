"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

interface BriefData {
  project_name?: string;
  project_type?: string;
  description?: string;
  problem?: string;
  target_users?: string;
  core_features?: string[];
  nice_to_have?: string[];
  design_notes?: string;
  tech_requirements?: string;
  integrations?: string[];
  timeline?: string;
  existing_assets?: string;
  complexity?: string;
}

export default function BriefViewPage() {
  const params = useParams();
  const [brief, setBrief] = useState<BriefData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchBrief = async () => {
      try {
        const convexUrl = process.env.NEXT_PUBLIC_CONVEX_SITE_URL || "https://hardy-mongoose-695.eu-west-1.convex.site";
        const res = await fetch(`${convexUrl}/api/scope/session?sessionId=${params.id}`);
        const data = await res.json();
        if (data.session?.briefData) {
          setBrief(JSON.parse(data.session.briefData));
        } else {
          setError("Brief not found.");
        }
      } catch {
        setError("Failed to load brief.");
      } finally {
        setLoading(false);
      }
    };
    fetchBrief();
  }, [params.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-400">
        Loading...
      </div>
    );
  }

  if (error || !brief) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-400">
        {error || "Brief not found."}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="flex items-center gap-2 mb-8">
          <span className="text-emerald-500 text-lg">●</span>
          <span className="font-bold">Orián</span>
          <span className="text-gray-600 mx-2">·</span>
          <span className="text-gray-400 text-sm">Project Brief</span>
        </div>

        <h1 className="text-3xl font-bold mb-2">{brief.project_name || "Untitled Project"}</h1>
        {brief.project_type && (
          <p className="text-emerald-500 mb-6">{brief.project_type.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</p>
        )}

        {brief.description && (
          <section className="mb-8">
            <h2 className="text-lg font-semibold mb-2 text-gray-300">Overview</h2>
            <p className="text-gray-400">{brief.description}</p>
          </section>
        )}

        {brief.problem && (
          <section className="mb-8">
            <h2 className="text-lg font-semibold mb-2 text-gray-300">Problem & Solution</h2>
            <p className="text-gray-400">{brief.problem}</p>
          </section>
        )}

        {brief.core_features && brief.core_features.length > 0 && (
          <section className="mb-8">
            <h2 className="text-lg font-semibold mb-2 text-gray-300">Core Features</h2>
            <ul className="space-y-1 text-gray-400">
              {brief.core_features.map((f, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-emerald-500">•</span> {f}
                </li>
              ))}
            </ul>
          </section>
        )}

        {brief.complexity && (
          <section className="mb-8">
            <h2 className="text-lg font-semibold mb-2 text-gray-300">Estimated Complexity</h2>
            <span className={`px-3 py-1 rounded-full text-sm ${
              brief.complexity === "easy" ? "bg-green-500/20 text-green-400" :
              brief.complexity === "hard" ? "bg-red-500/20 text-red-400" :
              "bg-yellow-500/20 text-yellow-400"
            }`}>
              {brief.complexity.charAt(0).toUpperCase() + brief.complexity.slice(1)}
            </span>
          </section>
        )}
      </div>
    </div>
  );
}
