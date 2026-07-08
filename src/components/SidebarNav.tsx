import React from "react";
import { Profile } from "../types";
import { 
  Users, 
  Video, 
  Layers, 
  LayoutDashboard, 
  LineChart, 
  Award 
} from "lucide-react";

interface SidebarNavProps {
  profile: Profile;
  activeTab: "dashboard" | "hub" | "microservices" | "projects" | "leaderboard" | "pathway" | "admin";
  setActiveTab: (tab: "dashboard" | "hub" | "microservices" | "projects" | "leaderboard" | "pathway" | "admin") => void;
}

export default function SidebarNav({ profile, activeTab, setActiveTab }: SidebarNavProps) {
  // Extract user initials
  const initials = profile.fullName
    ? profile.fullName
        .split(" ")
        .filter(Boolean)
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : "?";

  return (
    <aside 
      className="w-64 bg-[#4B5E40] text-white flex flex-col h-full p-4 space-y-4 shadow-sm shrink-0 border-r border-[#4B5E40]/20" 
      id="nav-rail-aside"
    >
      {/* User Profiling Widget with High Density custom dark green layout */}
      <div className="p-3 bg-[#3b4b32] rounded-xl border border-white/10 text-center space-y-2 shrink-0">
        <div className="w-11 h-11 rounded-full bg-white text-[#4B5E40] flex items-center justify-center font-extrabold text-sm mx-auto shadow-sm">
          {initials}
        </div>
        <div>
          <h4 className="font-bold text-white text-xs sm:text-sm leading-tight truncate" title={profile.fullName}>
            {profile.fullName}
          </h4>
          <span className="text-[10px] text-white/60 font-mono block truncate">@{profile.username}</span>
        </div>

        <div className="pt-2 border-t border-white/10 flex flex-col gap-1 items-center">
          <span className="text-[9px] text-white/50 font-bold uppercase tracking-wider block">Assessment clearing rating</span>
          <span className="text-[10.5px] font-extrabold text-[#4B5E40] font-mono bg-white px-2 py-0.5 rounded border border-white/10">
            {profile.score !== undefined ? `${profile.score}% Correct` : "N/A"}
          </span>
        </div>
      </div>

      {/* Navigation buttons links in high contrast high density layout */}
      <nav className="flex-1 overflow-y-auto space-y-1.5 pr-1 font-medium scrollbar-thin scrollbar-thumb-white/10" id="sidebar-navigations">
        {/* Admin Mode triggers selection widget */}
        {profile.role === "admin" && (
          <button
            id="nav-admin-btn"
            onClick={() => setActiveTab("admin")}
            className={`nav-link flex items-center gap-2.5 px-3 py-2 text-xs rounded-xl transition cursor-pointer text-left w-full ${
              activeTab === "admin" 
                ? "bg-white text-[#4B5E40] shadow font-bold" 
                : "text-white/75 hover:bg-white/10 hover:text-white"
            }`}
          >
            <LayoutDashboard className="w-4 h-4 shrink-0" /> Admins Dashboard
          </button>
        )}

        <button
          id="nav-dashboard-btn"
          onClick={() => setActiveTab("dashboard")}
          className={`nav-link flex items-center gap-2.5 px-3 py-2 text-xs rounded-xl transition cursor-pointer text-left w-full ${
            activeTab === "dashboard" 
              ? "bg-white text-[#4B5E40] shadow font-bold" 
              : "text-white/75 hover:bg-white/10 hover:text-white"
          }`}
        >
          <LayoutDashboard className="w-4 h-4 shrink-0" /> Trainee Dashboard
        </button>

        <button
          id="nav-meetings-btn"
          onClick={() => setActiveTab("hub")}
          className={`nav-link flex items-center gap-2.5 px-3 py-2 text-xs rounded-xl transition cursor-pointer text-left w-full ${
            activeTab === "hub" 
              ? "bg-white text-[#4B5E40] shadow font-bold" 
              : "text-white/75 hover:bg-white/10 hover:text-white"
          }`}
        >
          <Video className="w-4 h-4 shrink-0" /> Meetings
        </button>

        <button
          id="nav-microservices-btn"
          onClick={() => setActiveTab("microservices")}
          className={`nav-link flex items-center gap-2.5 px-3 py-2 text-xs rounded-xl transition cursor-pointer text-left w-full ${
            activeTab === "microservices" 
              ? "bg-white text-[#4B5E40] shadow font-bold" 
              : "text-white/75 hover:bg-white/10 hover:text-white"
          }`}
        >
          <Layers className="w-4 h-4 shrink-0" /> Microservice Modules
        </button>

        <button
          id="nav-projects-btn"
          onClick={() => setActiveTab("projects")}
          className={`nav-link flex items-center gap-2.5 px-3 py-2 text-xs rounded-xl transition cursor-pointer text-left w-full ${
            activeTab === "projects" 
              ? "bg-white text-[#4B5E40] shadow font-bold" 
              : "text-white/75 hover:bg-white/10 hover:text-white"
          }`}
        >
          <Users className="w-4 h-4 shrink-0" /> Project repository
        </button>

        <button
          id="nav-leaderboard-btn"
          onClick={() => setActiveTab("leaderboard")}
          className={`nav-link flex items-center gap-2.5 px-3 py-2 text-xs rounded-xl transition cursor-pointer text-left w-full ${
            activeTab === "leaderboard" 
              ? "bg-white text-[#4B5E40] shadow font-bold" 
              : "text-white/75 hover:bg-white/10 hover:text-white"
          }`}
        >
          <LineChart className="w-4 h-4 shrink-0" /> Punctuality Leaderboard
        </button>

        <button
          id="nav-pathway-btn"
          onClick={() => setActiveTab("pathway")}
          className={`nav-link flex items-center gap-2.5 px-3 py-2 text-xs rounded-xl transition cursor-pointer text-left w-full ${
            activeTab === "pathway" 
              ? "bg-white text-[#4B5E40] shadow font-bold" 
              : "text-white/75 hover:bg-white/10 hover:text-white"
          }`}
        >
          <Award className="w-4 h-4 shrink-0" /> Career Pathways Setup
        </button>
      </nav>

      {/* Administrative bypass warning helper */}
      {profile.role === "admin" && (
        <div className="shrink-0 bg-[#3b4b32]/80 p-3 rounded-lg border border-amber-500/30 text-[10.5px] text-amber-200 leading-normal">
          💡 <b>Staff Access active:</b> You are in administrative audit mode. Feel free to browse student views!
        </div>
      )}
    </aside>
  );
}
