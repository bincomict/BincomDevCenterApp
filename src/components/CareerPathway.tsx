import React from "react";
import { Compass, Sparkles, BookCheck, Milestone, ArrowRight } from "lucide-react";

interface CareerPathwayProps {
  careerPathways?: {
    foundation: Array<{ title: string; description: string }>;
    trackSplit: Array<{ title: string; description: string }>;
    lateralRoles: Array<{ title: string; description: string }>;
  } | null;
}

export default function CareerPathway({ careerPathways }: CareerPathwayProps) {
  const activePathways = careerPathways || {
    foundation: [
      { title: "Onboarding Profiling", description: "Capturing education demographics and choosing tech fields." },
      { title: "Track Assessment Check", description: "Scoring >= 50% on hard/soft skill checks to proceed." },
      { title: "Compliance Briefing", description: "Watching orientation stream files and signing agreement sheets." }
    ],
    trackSplit: [
      { title: "8-Module Microservices", description: "Managing KD checkins, sharing news, writing 100-word daily briefs." },
      { title: "Weekly Drills Homework", description: "Submitting real-world homework solutions on public GitHub repos." },
      { title: "Team sync scrums", description: "Assigned to client projects (e.g. eMigr8) with Jitsi integration." }
    ],
    lateralRoles: [
      { title: "Public Artifact Loggers", description: "Authoring Medium articles, and organizing tech hackathons." },
      { title: "Career Mentoring", description: "Personalised mock evaluations and interview rehearsals." },
      { title: "Global Client Placement", description: "Attracting high-paying remote roles in the UK, Europe, or USA." }
    ]
  };

  return (
    <div className="space-y-6" id="career-pathway-root">
      
      {/* Title */}
      <div className="border-b border-gray-200 pb-3">
        <h2 className="text-lg font-bold text-gray-900 flex items-[#4B5E40] items-center gap-1.5 leading-normal">
          <Milestone className="w-5 h-5 text-[#4B5E40]" /> Dynamic Career Pathway mapping
        </h2>
        <p className="text-xs text-gray-500 mt-1">
          Trace your career progression from initial onboarding compliance, through track split microservice workshops, to global client placements.
        </p>
      </div>

      {/* 3-Column Interactive Diagram */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative" id="three-column-pathway">
        
        {/* Column 1: Foundation */}
        <div className="bg-white rounded-2xl border border-gray-150 p-5 space-y-4 shadow-3xs relative" id="path-col-1">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-2.5">
            <span className="w-7 h-7 rounded-lg bg-[#4B5E40]/10 text-[#4B5E40] flex items-center justify-center font-bold text-xs">1</span>
            <div>
              <h3 className="font-extrabold text-sm text-gray-950 block">Foundation Stage</h3>
              <span className="text-[10px] text-gray-400 font-bold uppercase">Orientation & Setup</span>
            </div>
          </div>

          <p className="text-xs text-gray-500 leading-relaxed font-sans">
            Your first 1 to 4 weeks. Grasping core accountability mechanics, version controllers, and clearing orientation compliance gates.
          </p>

          <div className="space-y-2.5 pt-1">
            {activePathways.foundation.map((item, index) => (
              <div key={index} className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-xs animate-fade-in">
                <p className="font-bold text-gray-800">{index + 1}. {item.title}</p>
                <p className="text-gray-500 text-[11px] mt-0.5">{item.description}</p>
              </div>
            ))}
          </div>
          
          <div className="hidden md:flex absolute top-1/2 -right-3.5 transform -translate-y-1/2 w-7 h-7 rounded-full bg-white border border-gray-200 text-[#4B5E40] items-center justify-center z-10 shadow-xs select-none">
            <ArrowRight className="w-4 h-4" />
          </div>
        </div>

        {/* Column 2: Track Split */}
        <div className="bg-white rounded-2xl border border-gray-150 p-5 space-y-4 shadow-3xs relative" id="path-col-2">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-2.5">
            <span className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">2</span>
            <div>
              <h3 className="font-extrabold text-sm text-gray-950 block">Track Split Workshops</h3>
              <span className="text-[10px] text-[#4B5E40] font-bold uppercase">Microservices & Builds</span>
            </div>
          </div>

          <p className="text-xs text-gray-500 leading-relaxed font-sans">
            Week 5 to 24. Immersive curriculum routines. Submitting standups, writing daily summaries, and coding on corporate portfolios.
          </p>

          <div className="space-y-2.5 pt-1">
            {activePathways.trackSplit.map((item, index) => (
              <div key={index} className="p-3 bg-[#F8FAF8] rounded-xl border border-gray-100 text-xs animate-fade-in">
                <p className="font-bold text-[#4B5E40]">{index + 1}. {item.title}</p>
                <p className="text-gray-500 text-[11px] mt-0.5">{item.description}</p>
              </div>
            ))}
          </div>

          <div className="hidden md:flex absolute top-1/2 -right-3.5 transform -translate-y-1/2 w-7 h-7 rounded-full bg-white border border-gray-200 text-[#4B5E40] items-center justify-center z-10 shadow-xs select-none">
            <ArrowRight className="w-4 h-4" />
          </div>
        </div>

        {/* Column 3: Lateral Roles */}
        <div className="bg-white rounded-2xl border border-gray-150 p-5 space-y-4 shadow-3xs" id="path-col-3">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-2.5">
            <span className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-800 flex items-center justify-center font-bold text-xs">3</span>
            <div>
              <h3 className="font-extrabold text-sm text-gray-950 block">Lateral Roles</h3>
              <span className="text-[10px] text-indigo-600 font-bold uppercase">Exposure & Placement</span>
            </div>
          </div>

          <p className="text-xs text-gray-500 leading-relaxed font-sans">
            Post Week 24. Launching into industry pipelines as polished software engineers. Documenting public artifacts and securing placements.
          </p>

          <div className="space-y-2.5 pt-1">
            {activePathways.lateralRoles.map((item, index) => {
              const isLast = index === activePathways.lateralRoles.length - 1;
              return (
                <div 
                  key={index} 
                  className={`p-3 rounded-xl border text-xs animate-fade-in ${
                    isLast 
                      ? "bg-indigo-50/30 border-indigo-100" 
                      : "bg-indigo-50/20 border-orange-100"
                  }`}
                >
                  <p className={`font-bold flex items-center gap-1 ${isLast ? "text-indigo-950" : "text-indigo-900"}`}>
                    {isLast && <Sparkles className="w-3.5 h-3.5 text-indigo-600 animate-pulse" />}
                    {index + 1}. {item.title}
                  </p>
                  <p className="text-gray-500 text-[11px] mt-0.5">{item.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Pathway Summary Info */}
      <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100 text-center" id="pathway-summary-block">
        <p className="text-xs text-emerald-900 leading-normal max-w-xl mx-auto font-medium">
          🌟 <b>The Talent Accelerator Formula:</b> High Accountability + Relational Project Team Cooperation + Transparent Multi-track Microservice Modules = A globally competitive digital talent.
        </p>
      </div>
    </div>
  );
}
