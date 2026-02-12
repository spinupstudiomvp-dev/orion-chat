"use client";

interface BriefData {
  project_name?: string | null;
  project_type?: string | null;
  description?: string | null;
  problem?: string | null;
  target_users?: string | null;
  core_features?: string[];
  nice_to_have?: string[];
  design_notes?: string | null;
  tech_requirements?: string | null;
  integrations?: string[];
  timeline?: string | null;
  existing_assets?: string | null;
  complexity?: string | null;
  status?: "gathering" | "ready";
}

interface BriefPanelProps {
  briefData: BriefData;
  isReady: boolean;
  onSubmit: () => void;
}

function BriefSection({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-gray-900/50 border border-gray-800/50 rounded-xl p-4 transition-all duration-300">
      <div className="flex items-center gap-2 mb-2">
        <span>{icon}</span>
        <h3 className="text-sm font-semibold text-gray-300">{title}</h3>
      </div>
      <div className="text-sm text-gray-400">{children}</div>
    </div>
  );
}

function formatType(t: string | null | undefined): string {
  if (!t) return "—";
  return t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function ComplexityBadge({ complexity }: { complexity: string }) {
  const colors: Record<string, string> = {
    easy: "bg-green-500/20 text-green-400 border-green-500/30",
    medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    hard: "bg-red-500/20 text-red-400 border-red-500/30",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs border ${colors[complexity] || colors.medium}`}>
      {complexity.charAt(0).toUpperCase() + complexity.slice(1)}
    </span>
  );
}

export default function BriefPanel({ briefData, isReady, onSubmit }: BriefPanelProps) {
  const hasAnyData = Object.values(briefData).some(
    (v) => v !== null && v !== undefined && v !== "gathering" && (Array.isArray(v) ? v.length > 0 : true)
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-800/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">📋</span>
          <h2 className="font-semibold text-white">Project Brief</h2>
        </div>
        <div className="flex items-center gap-2">
          {briefData.complexity && <ComplexityBadge complexity={briefData.complexity} />}
          <span className={`px-2 py-0.5 rounded-full text-xs border ${
            isReady
              ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
              : "bg-gray-800 text-gray-500 border-gray-700"
          }`}>
            {isReady ? "Ready" : "Building..."}
          </span>
        </div>
      </div>

      {/* Brief content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {!hasAnyData ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
            <div className="text-4xl mb-4">💬</div>
            <p className="text-sm">Your project brief will build here as you chat.</p>
            <p className="text-xs mt-2 text-gray-600">Tell Orián about your project idea to get started.</p>
          </div>
        ) : (
          <>
            {(briefData.project_name || briefData.project_type) && (
              <BriefSection icon="🚀" title="Project Overview">
                {briefData.project_name && (
                  <div className="text-white font-medium mb-1">{briefData.project_name}</div>
                )}
                {briefData.project_type && (
                  <div>Type: {formatType(briefData.project_type)}</div>
                )}
                {briefData.description && <div className="mt-1">{briefData.description}</div>}
              </BriefSection>
            )}

            {briefData.problem && (
              <BriefSection icon="🎯" title="Problem & Solution">
                {briefData.problem}
              </BriefSection>
            )}

            {briefData.target_users && (
              <BriefSection icon="👥" title="Target Users">
                {briefData.target_users}
              </BriefSection>
            )}

            {briefData.core_features && briefData.core_features.length > 0 && (
              <BriefSection icon="⚡" title="Core Features">
                <ul className="space-y-1">
                  {briefData.core_features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-emerald-500 mt-0.5">•</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </BriefSection>
            )}

            {briefData.nice_to_have && briefData.nice_to_have.length > 0 && (
              <BriefSection icon="✨" title="Nice to Have">
                <ul className="space-y-1">
                  {briefData.nice_to_have.map((f, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-gray-500 mt-0.5">•</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </BriefSection>
            )}

            {briefData.design_notes && (
              <BriefSection icon="🎨" title="Design Notes">
                {briefData.design_notes}
              </BriefSection>
            )}

            {briefData.tech_requirements && (
              <BriefSection icon="🔧" title="Technical Requirements">
                {briefData.tech_requirements}
              </BriefSection>
            )}

            {briefData.integrations && briefData.integrations.length > 0 && (
              <BriefSection icon="🔗" title="Integrations">
                <div className="flex flex-wrap gap-2">
                  {briefData.integrations.map((int, i) => (
                    <span key={i} className="px-2 py-1 bg-gray-800 rounded-lg text-xs">
                      {int}
                    </span>
                  ))}
                </div>
              </BriefSection>
            )}

            {briefData.timeline && (
              <BriefSection icon="⏱️" title="Timeline">
                {briefData.timeline}
              </BriefSection>
            )}

            {briefData.existing_assets && (
              <BriefSection icon="📦" title="Existing Assets">
                {briefData.existing_assets}
              </BriefSection>
            )}
          </>
        )}
      </div>

      {/* Submit button */}
      <div className="px-4 py-4 border-t border-gray-800/50">
        <button
          onClick={onSubmit}
          disabled={!isReady}
          className={`w-full py-3 rounded-xl font-medium text-sm transition-all duration-200 ${
            isReady
              ? "bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20"
              : "bg-gray-800 text-gray-500 cursor-not-allowed"
          }`}
        >
          {isReady ? "Submit Brief →" : "Complete the chat to submit"}
        </button>
      </div>
    </div>
  );
}
