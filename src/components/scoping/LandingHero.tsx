"use client";

import { useState } from "react";

const EXAMPLES = [
  "A SaaS dashboard for managing freelance projects and invoicing clients",
  "An e-commerce store for handmade ceramics with custom ordering",
  "A mobile app for booking personal training sessions",
  "A community platform where designers share and critique work",
];

interface LandingHeroProps {
  onSend: (message: string) => void;
}

export default function LandingHero({ onSend }: LandingHeroProps) {
  const [input, setInput] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      onSend(input);
      setInput("");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full px-4 -mt-14">
      <div className="max-w-2xl w-full text-center">
        <div className="text-5xl mb-6">🚀</div>
        <h1 className="text-4xl md:text-5xl font-bold mb-4">
          What do you want to <span className="text-emerald-500">build</span>?
        </h1>
        <p className="text-gray-400 text-lg mb-10">
          Describe your project idea and we&apos;ll create a detailed brief together.
        </p>

        <form onSubmit={handleSubmit} className="mb-8">
          <div className="relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Describe your project idea..."
              className="w-full px-6 py-4 bg-gray-900 border border-gray-700 rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-lg transition-colors"
              autoFocus
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-700 disabled:text-gray-500 rounded-xl text-white transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
              </svg>
            </button>
          </div>
        </form>

        <div className="space-y-2">
          <p className="text-sm text-gray-500 mb-3">Try an example:</p>
          <div className="flex flex-wrap justify-center gap-2">
            {EXAMPLES.map((example, i) => (
              <button
                key={i}
                onClick={() => onSend(example)}
                className="px-4 py-2 text-sm bg-gray-900 border border-gray-800 rounded-xl text-gray-300 hover:border-emerald-500/50 hover:text-white transition-colors text-left"
              >
                {example.length > 50 ? example.substring(0, 50) + "..." : example}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
