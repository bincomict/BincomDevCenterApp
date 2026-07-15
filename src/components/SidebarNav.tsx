import React, { useState, useEffect } from "react";
import { Profile } from "../types";
import { 
  Users, 
  Video, 
  Layers, 
  LayoutDashboard, 
  LineChart, 
  Award,
  ChevronDown,
  X
} from "lucide-react";

interface SidebarNavProps {
  profile: Profile;
  activeTab: "dashboard" | "hub" | "microservices" | "projects" | "leaderboard" | "pathway" | "admin";
  setActiveTab: (tab: "dashboard" | "hub" | "microservices" | "projects" | "leaderboard" | "pathway" | "admin") => void;
  isOpen?: boolean;
  onClose?: () => void;
  adminTab?: string;
  setAdminTab?: (tab: any) => void;
  hubTab?: "meetings" | "history";
  setHubTab?: (tab: "meetings" | "history") => void;
  activeSubTab?: "kd" | "standups" | "daily-report" | "pd" | "tech" | "drills" | "social";
  setActiveSubTab?: (tab: "kd" | "standups" | "daily-report" | "pd" | "tech" | "drills" | "social") => void;
}

const adminSubTabs = [
  { id: "funnel", label: "Operations Funnel" },
  { id: "reviews", label: "Student Reviews" },
  { id: "drills", label: "Weekly Drills" },
  { id: "meetings", label: "Meetings Management" },
  { id: "kd_desk", label: "KD Desk" },
  { id: "pd_desk", label: "PD Desk" },
  { id: "standup_desk", label: "Standup Desk" },
  { id: "attendance_history", label: "Attendance Ledger" },
  { id: "levels", label: "Levels Promotion Desk" },
  { id: "reminders", label: "Warning Dispatches" },
  { id: "cron", label: "00:00 WAT Cron Sync" },
  { id: "export", label: "Export Ledger CSV" },
  { id: "owners", label: "Module Owners" },
  { id: "tasks_config", label: "Default Tasks Config" },
  { id: "microservices_config", label: "Microservices Config" },
  { id: "pathways_config", label: "Career Pathways Config" },
];

const hubSubTabs = [
  { id: "meetings", label: "Active Sessions" },
  { id: "history", label: "Attendance History" },
];

const microservicesSubTabs = [
  { id: "kd", label: "📚 KD Check" },
  { id: "standups", label: "☀️ Standup Log" },
  { id: "daily-report", label: "📈 Daily Reports" },
  { id: "pd", label: "💡 PD Log" },
  { id: "tech", label: "🛡️ Tech Stack" },
  { id: "drills", label: "🎯 Weekly Drills" },
  { id: "social", label: "👥 Social Share" },
];

export default function SidebarNav({ 
  profile, 
  activeTab, 
  setActiveTab, 
  isOpen = false, 
  onClose,
  adminTab,
  setAdminTab,
  hubTab,
  setHubTab,
  activeSubTab,
  setActiveSubTab,
}: SidebarNavProps) {
  const [isAdminExpanded, setIsAdminExpanded] = useState(activeTab === "admin");
  const [isMeetingsExpanded, setIsMeetingsExpanded] = useState(activeTab === "hub");
  const [isMicroservicesExpanded, setIsMicroservicesExpanded] = useState(activeTab === "microservices");

  // Keep expanded states in sync if tab changes, but let the user override
  useEffect(() => {
    if (activeTab === "admin") {
      setIsAdminExpanded(true);
    } else if (activeTab === "hub") {
      setIsMeetingsExpanded(true);
    } else if (activeTab === "microservices") {
      setIsMicroservicesExpanded(true);
    }
  }, [activeTab]);

  // Extract user initials
  const initials = profile.fullName
    ? profile.fullName
        .split(" ")
        .filter(Boolean)
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : "?";

  const handleTabClick = (tab: "dashboard" | "hub" | "microservices" | "projects" | "leaderboard" | "pathway" | "admin") => {
    setActiveTab(tab);
    if (onClose) {
      onClose();
    }
  };

  return (
    <>
      {/* Drawer Overlay Backdrop on Mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity duration-300" 
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside 
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#4B5E40] text-white flex flex-col h-full p-4 space-y-4 shadow-xl shrink-0 border-r border-[#4B5E40]/20 transition-transform duration-300 ease-in-out md:static md:translate-x-0 md:shadow-sm ${
          isOpen ? "translate-x-0" : "-translate-x-full md:flex"
        }`} 
        id="nav-rail-aside"
      >
        {/* Mobile-only close button */}
        <div className="flex md:hidden justify-end">
          <button 
            onClick={onClose} 
            className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

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
        <nav className="flex-1 overflow-y-auto space-y-2 pr-1 font-medium scrollbar-thin scrollbar-thumb-white/10" id="sidebar-navigations">
          {activeTab === "admin" ? (
            /* Admin Mode: Show only Admin subtabs directly */
            <div className="space-y-1">
              <div className="text-[10px] uppercase text-white/50 tracking-wider px-3 mb-2 font-black">
                Admin Controls
              </div>
              <div className="space-y-1" id="admin-sidebar-sublist">
                {adminSubTabs.map((sub) => (
                  <button
                    key={sub.id}
                    onClick={() => setAdminTab?.(sub.id)}
                    className={`flex items-center gap-2.5 w-full text-xs text-left py-2 px-3 rounded-xl transition cursor-pointer ${
                      adminTab === sub.id
                        ? "bg-white text-[#4B5E40] shadow font-bold"
                        : "text-white/75 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <span className="shrink-0 font-mono">•</span>
                    <span className="truncate">{sub.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Trainee Mode: Show original Trainee navigation */
            <>
              <div className="space-y-1">
                <button
                  id="nav-dashboard-btn"
                  onClick={() => handleTabClick("dashboard")}
                  className={`nav-link flex items-center gap-2.5 px-3 py-2 text-xs rounded-xl transition cursor-pointer text-left w-full ${
                    activeTab === "dashboard" 
                      ? "bg-white text-[#4B5E40] shadow font-bold" 
                      : "text-white/75 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4 shrink-0" /> Trainee Dashboard
                </button>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between w-full gap-1">
                  <button
                    id="nav-meetings-btn"
                    onClick={() => handleTabClick("hub")}
                    className={`flex-1 flex items-center gap-2.5 px-3 py-2 text-xs rounded-xl transition cursor-pointer text-left ${
                      activeTab === "hub" 
                        ? "bg-white text-[#4B5E40] shadow font-bold" 
                        : "text-white/75 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <Video className="w-4 h-4 shrink-0" />
                    <span className="flex-1 truncate">Meetings</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsMeetingsExpanded(!isMeetingsExpanded)}
                    className={`p-2 rounded-xl transition cursor-pointer text-white/70 hover:text-white hover:bg-white/10 shrink-0`}
                    title={isMeetingsExpanded ? "Collapse Meetings Menu" : "Expand Meetings Menu"}
                  >
                    <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isMeetingsExpanded ? "rotate-180" : ""}`} />
                  </button>
                </div>
                {isMeetingsExpanded && (
                  <div className="ml-4 pl-2.5 border-l border-white/20 space-y-0.5 mt-1 animate-fade-in" id="hub-sidebar-sublist">
                    {hubSubTabs.map((sub) => (
                      <button
                        key={sub.id}
                        onClick={() => setHubTab?.(sub.id as any)}
                        className={`block w-full text-[10.5px] text-left py-1 px-2 rounded-lg transition cursor-pointer ${
                          hubTab === sub.id
                            ? "bg-white/15 text-white font-semibold shadow-3xs"
                            : "text-white/60 hover:text-white hover:bg-white/5"
                        }`}
                      >
                        › {sub.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between w-full gap-1">
                  <button
                    id="nav-microservices-btn"
                    onClick={() => handleTabClick("microservices")}
                    className={`flex-1 flex items-center gap-2.5 px-3 py-2 text-xs rounded-xl transition cursor-pointer text-left ${
                      activeTab === "microservices" 
                        ? "bg-white text-[#4B5E40] shadow font-bold" 
                        : "text-white/75 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <Layers className="w-4 h-4 shrink-0" />
                    <span className="flex-1 truncate">Microservice Modules</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsMicroservicesExpanded(!isMicroservicesExpanded)}
                    className={`p-2 rounded-xl transition cursor-pointer text-white/70 hover:text-white hover:bg-white/10 shrink-0`}
                    title={isMicroservicesExpanded ? "Collapse Microservices Menu" : "Expand Microservices Menu"}
                  >
                    <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isMicroservicesExpanded ? "rotate-180" : ""}`} />
                  </button>
                </div>
                {isMicroservicesExpanded && (
                  <div className="ml-4 pl-2.5 border-l border-white/20 space-y-0.5 mt-1 animate-fade-in" id="microservices-sidebar-sublist">
                    {microservicesSubTabs.map((sub) => (
                      <button
                        key={sub.id}
                        onClick={() => setActiveSubTab?.(sub.id as any)}
                        className={`block w-full text-[10.5px] text-left py-1 px-2 rounded-lg transition cursor-pointer ${
                          activeSubTab === sub.id
                            ? "bg-white/15 text-white font-semibold shadow-3xs"
                            : "text-white/60 hover:text-white hover:bg-white/5"
                        }`}
                      >
                        {sub.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <button
                  id="nav-projects-btn"
                  onClick={() => handleTabClick("projects")}
                  className={`nav-link flex items-center gap-2.5 px-3 py-2 text-xs rounded-xl transition cursor-pointer text-left w-full ${
                    activeTab === "projects" 
                      ? "bg-white text-[#4B5E40] shadow font-bold" 
                      : "text-white/75 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <Users className="w-4 h-4 shrink-0" /> Project repository
                </button>
              </div>

              <div className="space-y-1">
                <button
                  id="nav-leaderboard-btn"
                  onClick={() => handleTabClick("leaderboard")}
                  className={`nav-link flex items-center gap-2.5 px-3 py-2 text-xs rounded-xl transition cursor-pointer text-left w-full ${
                    activeTab === "leaderboard" 
                      ? "bg-white text-[#4B5E40] shadow font-bold" 
                      : "text-white/75 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <LineChart className="w-4 h-4 shrink-0" /> Punctuality Leaderboard
                </button>
              </div>

              <div className="space-y-1">
                <button
                  id="nav-pathway-btn"
                  onClick={() => handleTabClick("pathway")}
                  className={`nav-link flex items-center gap-2.5 px-3 py-2 text-xs rounded-xl transition cursor-pointer text-left w-full ${
                    activeTab === "pathway" 
                      ? "bg-white text-[#4B5E40] shadow font-bold" 
                      : "text-white/75 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <Award className="w-4 h-4 shrink-0" /> Career Pathways Setup
                </button>
              </div>
            </>
          )}
        </nav>

        {/* Switch Button at the bottom for admins */}
        {profile.role === "admin" && (
          <div className="shrink-0 pt-2 border-t border-white/10">
            {activeTab === "admin" ? (
              <button
                onClick={() => handleTabClick("dashboard")}
                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-white text-[#4B5E40] rounded-xl hover:bg-white/90 text-xs font-bold transition cursor-pointer shadow-sm"
              >
                🔄 Switch to User Dashboard
              </button>
            ) : (
              <button
                onClick={() => handleTabClick("admin")}
                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-[#3b4b32] text-white rounded-xl hover:bg-[#3b4b32]/90 text-xs font-bold transition cursor-pointer border border-white/20 shadow-sm"
              >
                🛡️ Switch to Admin View
              </button>
            )}
          </div>
        )}
      </aside>
    </>
  );
}
