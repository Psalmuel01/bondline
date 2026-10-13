"use client";

import { useState } from "react";

export function ChatPreview() {
  const [backed, setBacked] = useState(false);
  const [paused, setPaused] = useState(false);
  return (
    <div className="chat-stage relative" data-paused={paused}>
      <div className="chat-orbit" aria-hidden="true" />
      <div className="relative overflow-hidden rounded-3xl border border-line bg-panel/95 shadow-2xl shadow-black/40">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2" aria-hidden="true">
              {["S", "P", "D"].map((initial, i) => (
                <span
                  key={initial}
                  className={`flex h-8 w-8 items-center justify-center rounded-full border-2 border-panel text-xs ${i === 1 ? "bg-gold/20 text-gold" : "bg-panel-hi text-bone"}`}
                >
                  {initial}
                </span>
              ))}
            </div>
            <div>
              <h2 className="text-sm font-semibold">The group chat</h2>
              <p className="mt-0.5 text-[10px] text-faint">
                An interactive example
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setPaused(!paused)}
            aria-label={paused ? "Resume animation" : "Pause animation"}
            aria-pressed={paused}
            className="icon-button"
          >
            {paused ? "▷" : "Ⅱ"}
          </button>
        </div>
        <div
          className="flex h-[255px] flex-col items-start gap-3 px-5 py-5 text-sm"
          aria-label="Illustrative conversation"
        >
          <p className="chat-bubble chat-one max-w-[90%] rounded-2xl rounded-tl-sm bg-panel-hi px-4 py-3">
            finally shipping my project this week
          </p>
          <p className="chat-bubble chat-two self-end rounded-2xl rounded-tr-sm bg-gold/15 px-4 py-3 text-gold">
            let’s gooo 🤝
          </p>
          <p className="chat-bubble chat-three rounded-2xl rounded-tl-sm bg-panel-hi px-4 py-3">
            same, i’m locked in
          </p>
          <p className="chat-bubble chat-four rounded-2xl rounded-tl-sm border border-forfeit/20 bg-forfeit/10 px-4 py-3">
            so about that project…
          </p>
        </div>
        <div className="border-t border-line bg-bg/50 p-5">
          <p className="mb-3 text-[11px] text-gold">
            Give that promise some weight.
          </p>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">Ship by Friday</p>
              <p className="mt-1 text-xs text-muted">Sam · 1 MON staked</p>
            </div>
            <div className="relative">
              {backed && (
                <span className="back-burst" aria-hidden="true">
                  {Array.from({ length: 6 }, (_, i) => (
                    <i
                      key={i}
                      style={{ "--particle": i } as React.CSSProperties}
                    />
                  ))}
                </span>
              )}
              <button
                type="button"
                onClick={() => setBacked(!backed)}
                aria-pressed={backed}
                className={`secondary-button relative ${backed ? "border-confirm/40 text-confirm cosign-in" : "text-gold"}`}
              >
                {backed ? "Backed ✓" : "Back Sam ↗"}
              </button>
            </div>
          </div>
          <p className="mt-3 text-[10px] text-faint" role="status">
            {backed
              ? "You’re in his corner. Evidence review comes later."
              : "Try backing the goal. No account or money needed here."}
          </p>
        </div>
      </div>
    </div>
  );
}
