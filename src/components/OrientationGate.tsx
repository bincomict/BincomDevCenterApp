import React, { useState, useEffect } from "react";
import { Profile } from "../types";
import { Play, Pause, FileCheck, CheckSquare, ShieldCheck, AlertCircle, LayoutDashboard, Volume2 } from "lucide-react";

interface OrientationGateProps {
  profile: Profile;
  onOrientationCleared: (updatedProfile: Profile) => void;
}

export default function OrientationGate({ profile, onOrientationCleared }: OrientationGateProps) {
  // Video simulation states
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(100); // Start pre-filled for rapid onboarding
  const [hasWatchedEnough, setHasWatchedEnough] = useState(true); // Pre-approved for speed

  // Acknowledgment box state
  const [agreed, setAgreed] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying) {
      interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            setIsPlaying(false);
            setHasWatchedEnough(true);
            return 100;
          }
          const next = prev + 15;
          if (next >= 85) setHasWatchedEnough(true);
          return next > 100 ? 100 : next;
        });
      }, 300);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  const handleProceed = async () => {
    if (!agreed) return;
    setIsClearing(true);

    try {
      const response = await fetch("/api/profile/clear-orientation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: profile.id })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      onOrientationCleared(data.profile);
    } catch (err) {
      console.error(err);
      alert("Orientation log processing failed.");
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto my-8 p-1 px-4 sm:px-0" id="orientation-gate-wrapper">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden" id="orientation-gate-card">
        
        {/* Header Block */}
        <div className="bg-[#4B5E40] p-6 text-white text-center">
          <div className="inline-flex items-center gap-1 bg-white/20 px-3 py-1 rounded-full text-[10px] uppercase font-bold tracking-wider mb-2">
            <ShieldCheck className="w-3.5 h-3.5" /> Stage 2 Compliance Gate
          </div>
          <h2 className="text-xl sm:text-2xl font-bold font-sans">Bincom Operational Orientation</h2>
          <p className="text-xs text-emerald-100/80 mt-1 max-w-lg mx-auto">
            Review of core compliance protocols, standup schedules, late policies, and weekly drill rules is required to activate your workspace access.
          </p>
        </div>

        <div className="p-6 sm:p-8 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Left Block: Simulated Video Player (7 Columns) */}
            <div className="lg:col-span-7 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                1. Orientation Video Briefing
              </h3>

              {/* Simulated Video Feed Layout */}
              <div className="relative aspect-video rounded-xl overflow-hidden bg-gray-900 border border-gray-800 flex flex-col justify-between" id="simulated-briefing-player">
                
                {/* Simulated Content Graphic Screen */}
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-radial from-gray-800/80 to-gray-950 p-4 text-center z-10 select-none">
                  <div className="w-12 h-12 rounded-full bg-[#4B5E40] flex items-center justify-center shadow-lg mb-2">
                    <Volume2 className="w-6 h-6 text-white" />
                  </div>
                  <h4 className="text-white text-sm font-bold tracking-tight">Bincom Talent Ecosystem Guide</h4>
                  <p className="text-gray-400 text-[10px] mt-1 max-w-xs">
                    Speaker: Dev Director Adewale Kunle<br />Focusing on: Accountability Rules, Daily standups, Punctuality Log.
                  </p>
                </div>

                {/* Progress Indicators overlay */}
                <div className="mt-2.5 ml-2.5 z-20">
                  <span className="text-[9px] font-mono px-2 py-0.5 bg-black/70 text-emerald-400 rounded-full font-bold">
                    {progress === 100 ? "COMPLETED" : `PLAYING - ${Math.round((progress/100)*12)} mins watched`}
                  </span>
                </div>

                {/* Video controls bottom bar */}
                <div className="w-full bg-linear-to-t from-black to-black/0 p-3 z-20 mt-auto flex items-center gap-3">
                  <button
                    id="orientation-play-pause-btn"
                    type="button"
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-gray-900 hover:scale-105 active:scale-95 transition cursor-pointer shrink-0"
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                  </button>

                  <div className="flex-1 space-y-1">
                    <div className="h-1 bg-gray-600 rounded-full w-full overflow-hidden">
                      <div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: `${progress}%` }}></div>
                    </div>
                    <div className="flex justify-between items-center text-[9px] text-gray-300">
                      <span>{Math.round(progress * 0.12)} mins played</span>
                      <span>12:00</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-[#F8FAF8] rounded-xl p-3 border border-gray-100 text-center">
                <p className="text-[11px] text-gray-500 leading-normal">
                  💡 Let the briefing simulation play. Watch rate needs to cross <strong>85%</strong> to satisfy compliance conditions before proceeding.
                </p>
              </div>
            </div>

            {/* Right Block: PDF Code of Conduct Scroll (5 Columns) */}
            <div className="lg:col-span-5 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                2. Code of Conduct Compliance PDF
              </h3>

              {/* Scrollable Document Sandbox */}
              <div 
                id="conduct-pdf-sandbox" 
                className="h-68 bg-gray-550 border border-gray-200 rounded-xl overflow-y-auto p-4 space-y-3.5 text-xs text-gray-700 leading-normal shadow-inner bg-[#FAFAFA]"
              >
                <div className="text-center pb-2 border-b border-gray-200">
                  <h4 className="font-bold text-gray-900 leading-tight">BINCOM DEV CENTER CORE COMPLIANCE CODE</h4>
                  <span className="text-[9px] text-gray-400 font-semibold uppercase">Revision 2026.1 / Full-Stack Legal</span>
                </div>

                <div className="space-y-1.5">
                  <p className="font-bold text-gray-900 text-[11px]">Article 1: The High-Accountability Ethos</p>
                  <p className="text-gray-600 text-[10.5px]">
                    Every talent in training commits to a rigorous performance regimen. Consistent, honest daily reporting prevents program disqualification. Working in isolation or failing to document blockages violates program terms.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <p className="font-bold text-gray-900 text-[11px]">Article 2: Daily Standups Punctuality</p>
                  <p className="text-gray-600 text-[10.5px]">
                    Morning Standup sessions start promptly at 09:00 AM WAT. A strict 5-minute grace period exists. Clicking "Join" at 09:06 AM registers "Late" status. Joining after 09:15 AM calculates "Missed" status. Multiple "Missed" marks trigger mandatory review boards.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <p className="font-bold text-gray-900 text-[11px]">Article 3: Microservice Submissions Baseline</p>
                  <p className="text-gray-600 text-[10.5px]">
                    Personal Development summaries must contain at least 100 words written on technical takeaways and learnings. Plagiarism or copy-pasted summaries are evaluated as instant compliance failures. Knowledge Development (KD) targets at least 1/16 meetings monthly.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <p className="font-bold text-gray-900 text-[11px]">Article 4: Collaboration Over Competition</p>
                  <p className="text-gray-600 text-[10.5px]">
                    Internal project workspaces like eMigr8 or Dev Centers require strict peer collaboration. Sharing repositories, writing modular clean configurations, and supporting track team members is expected.
                  </p>
                </div>
              </div>

              <div className="text-[10px] text-gray-400 text-right font-mono">
                🔍 Conduct document simulated at full scale
              </div>
            </div>
          </div>

          {/* Compliance Checkbox Block */}
          <div className="mt-6 pt-5 border-t border-gray-100 flex flex-col items-center">
            
            {/* Warning if video is too short */}
            {!hasWatchedEnough && (
              <div className="mb-4 flex items-center gap-2 text-rose-800 bg-rose-50 px-4 py-2 rounded-xl text-xs border border-rose-100" id="orientation-status-warning">
                <AlertCircle className="w-4 h-4 text-rose-600" />
                <span>Please play the <b>Orientation Briefing Video</b> to unblock the checklist (at least 85% required).</span>
              </div>
            )}

            <div className="p-4 bg-emerald-50/40 rounded-xl border border-emerald-100 max-w-xl text-left">
              <div className="flex gap-3">
                <input
                  id="orientation-agreement-checkbox"
                  type="checkbox"
                  disabled={!hasWatchedEnough}
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-0.5 rounded cursor-pointer text-[#4B5E40] focus:ring-[#4B5E40] shrink-0 disabled:opacity-50"
                />
                <div>
                  <label htmlFor="orientation-agreement-checkbox" className={`text-xs block font-semibold transition ${
                    hasWatchedEnough ? "text-gray-800 cursor-pointer" : "text-gray-400"
                  }`}>
                    I hereby certify that I have thoroughly watched the video guide brief, scrolled through the core Code of Conduct articles, and pledge to strictly uphold all Bincom Dev Center high-accountability parameters.
                  </label>
                  <span className="text-[10px] text-gray-400 mt-1 block">Checking this box logs compliance timestamp to administrative records.</span>
                </div>
              </div>
            </div>

            <button
              id="orientation-complete-dashboard-btn"
              onClick={handleProceed}
              disabled={!agreed || isClearing}
              className="mt-6 px-8 py-3 bg-[#4B5E40] hover:bg-[#3d4d34] disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none text-white font-bold text-xs rounded-xl shadow-md transition transform active:scale-95 cursor-pointer flex items-center gap-1.5"
            >
              <LayoutDashboard className="w-4.5 h-4.5" /> 
              {isClearing ? "Compiling Clearance..." : "Proceed to Student Workspace"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
