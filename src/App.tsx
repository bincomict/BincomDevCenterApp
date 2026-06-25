import React, { useState, useEffect } from "react";
import { Profile, Meeting, AttendanceRecord, WeeklyDrill, WeeklyDrillSubmission, MeetingAssignment } from "./types";

// Component imports
import AuthPage from "./components/AuthPage";
import OnboardingForm from "./components/OnboardingForm";
import TrackAssessment from "./components/TrackAssessment";
import OrientationGate from "./components/OrientationGate";
import Dashboard from "./components/Dashboard";
import MeetingsHub from "./components/MeetingsHub";
import MicroservicesModule from "./components/MicroservicesModule";
import ProjectsTracker from "./components/ProjectsTracker";
import LeaderboardPodium from "./components/LeaderboardPodium";
import CareerPathway from "./components/CareerPathway";
import AdminPanel from "./components/AdminPanel";

// Icon imports
import { 
  Users, 
  Video, 
  MapPin, 
  GraduationCap, 
  LogOut, 
  Bell, 
  Compass, 
  Settings, 
  Layers, 
  LayoutDashboard, 
  LineChart, 
  ShieldAlert, 
  Sparkles,
  Award,
  X
} from "lucide-react";

export default function App() {
  const [profile, setProfile] = useState<Profile | null>(null);
  
  // Entire server-synced database states
  const [state, setState] = useState({
    profiles: [] as Profile[],
    meetings: [] as Meeting[],
    attendance: [] as AttendanceRecord[],
    standups: [] as any[],
    personalDevelopment: [] as any[],
    techUpdates: [] as any[],
    weeklyDrills: [] as WeeklyDrill[],
    drillSubmissions: [] as WeeklyDrillSubmission[],
    socialLogs: [] as any[],
    projects: [] as any[],
    dailyReports: [] as any[],
    kdCounts: {} as Record<string, number>,
    reminders: [] as { id: string; userId: string; message: string; timestamp: string; read: boolean }[],
    microserviceOwners: {} as Record<string, string>,
    meetingAssignments: [] as MeetingAssignment[]
  });

  const [activeTab, setActiveTab] = useState<"dashboard" | "hub" | "microservices" | "projects" | "leaderboard" | "pathway" | "admin">("dashboard");
  const [activeSubTab, setActiveSubTab] = useState<"kd" | "standups" | "daily-report" | "pd" | "tech" | "drills" | "social">("kd");
  
  // Loading & error cues
  const [fetching, setFetching] = useState(false);

  // Check for cached browser session key on bootup
  useEffect(() => {
    const cached = localStorage.getItem("bincom_user_session");
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as Profile;
        setProfile(parsed);
      } catch (e) {
        console.error("Cache parsing error", e);
      }
    }
  }, []);

  // Sync details from server whenever profile changes or is updated
  const fetchLatestState = async (userKey?: string) => {
    if (!profile && !userKey) return;
    setFetching(true);
    
    const key = userKey || profile?.id;
    try {
      const res = await fetch(`/api/state?userId=${key}`);
      if (res.ok) {
        const data = await res.json();
        setState(data);
        
        // Sync custom profile changes in case admin tweaked things
        if (profile) {
          const matchedProfile = data.profiles.find((p: Profile) => p.id === profile.id);
          if (matchedProfile) {
            setProfile(matchedProfile);
            localStorage.setItem("bincom_user_session", JSON.stringify(matchedProfile));
          } else {
            // User session is stale/wiped on the server registry, log out safely
            console.warn("Local session is stale/missing on server registry. Clearing...");
            handleLogout();
          }
        }
      }
    } catch (err) {
      console.error("Failed to sync backend ledger statistics:", err);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    if (profile) {
      fetchLatestState();
      // Set default tab accordingly
      if (profile.role === "admin") {
        setActiveTab("admin");
      } else {
        setActiveTab("dashboard");
      }
    }
  }, [profile?.id]);

  useEffect(() => {
    if (!profile) return;
    const intervalId = setInterval(() => {
      fetchLatestState();
    }, 10000);
    return () => clearInterval(intervalId);
  }, [profile?.id]);

  const handleAuthSuccess = (newProfile: Profile) => {
    setProfile(newProfile);
    localStorage.setItem("bincom_user_session", JSON.stringify(newProfile));
  };

  const handleLogout = () => {
    setProfile(null);
    localStorage.removeItem("bincom_user_session");
  };

  const handleProfileSynced = (updatedProfile: Profile) => {
    setProfile(updatedProfile);
    localStorage.setItem("bincom_user_session", JSON.stringify(updatedProfile));
    fetchLatestState(updatedProfile.id);
  };

  // Mark attendance log request
  const handleMarkAttendance = async (meetingId: string) => {
    if (!profile) return;
    try {
      const res = await fetch("/api/meetings/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: profile.id, meetingId })
      });
      if (res.ok) {
        fetchLatestState();
      }
    } catch (error) {
      console.error(error);
    }
  };

  // Dismiss a single user reminder/notification
  const handleDismissReminder = async (id: string) => {
    try {
      const res = await fetch("/api/reminders/dismiss", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
      });
      if (res.ok) {
        // Optimistically update reminders state to instantly reflect in UI
        setState(prev => ({
          ...prev,
          reminders: prev.reminders.filter(r => r.id !== id)
        }));
      }
    } catch (e) {
      console.error("Error dismissing reminder:", e);
    }
  };

  // Dismiss all reminders/notifications for current user
  const handleDismissAllReminders = async () => {
    if (!profile) return;
    try {
      const res = await fetch("/api/reminders/dismiss", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: profile.id })
      });
      if (res.ok) {
        setState(prev => ({
          ...prev,
          reminders: []
        }));
      }
    } catch (e) {
      console.error("Error dismissing all reminders:", e);
    }
  };

  // Smart Routing Gating Nodes based on Student status (Section 3)
  if (!profile) {
    return <AuthPage onAuthSuccess={handleAuthSuccess} profiles={state.profiles} />;
  }

  // STANDARD STUDENT ONBOARDING STEPS WORKFLOW
  const showOnboardingForm = profile.role === "user" && profile.status === "onboarding";
  const showAssessmentGrid = profile.role === "user" && ["assessment_failed", "assessment_passed"].includes(profile.status);
  const showOrientationGate = profile.role === "user" && profile.status === "oriented";

  return (
    <div className="min-h-screen bg-[#F8FAF8] text-gray-800 font-sans flex flex-col" id="app-viewport-root">
      
      {/* 1. TOP HUB BANNER BAR */}
      <header className="bg-white border-b border-gray-100 py-3.5 px-4 sm:px-6 sticky top-0 z-30 shadow-2xs" id="central-hub-header">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          
          {/* Brand Logo and Active track badges */}
          <div className="flex items-center gap-3">
            <div className="font-extrabold tracking-tight text-gray-900 text-lg">
              Bincom <span className="text-[#4B5E40] font-sans">Dev Center</span>
            </div>
            
            {profile.track && profile.track !== "All" && (
              <span className="hidden md:inline-flex items-center gap-1 text-[10.5px] font-bold bg-[#4B5E40]/10 text-[#4B5E40] py-0.5 px-2.5 rounded-full border border-[#4B5E40]/10">
                <Compass className="w-3.5 h-3.5" /> Assigned Track: {profile.track.split(" ")[0]}
              </span>
            )}

            {profile.role === "admin" && (
              <span className="hidden md:inline-flex items-center gap-1 text-[10.5px] font-bold bg-indigo-50 text-indigo-700 py-0.5 px-2.5 rounded-full border border-indigo-150">
                <ShieldAlert className="w-3.5 h-3.5" /> Mentor / Board Auditor
              </span>
            )}
          </div>

          {/* Action Tools & User Panel info */}
          <div className="flex items-center gap-4">
            {(profile.role === "admin" || (!showOnboardingForm && !showAssessmentGrid && !showOrientationGate)) && (
              <span className="text-xs text-gray-500 hidden sm:inline">
                Welcome, <strong className="text-gray-900">{profile.fullName}</strong>
              </span>
            )}

            <button
              id="platform-logout-btn"
              onClick={handleLogout}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-550 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-100 transition duration-150 cursor-pointer text-center"
            >
              <LogOut className="w-3.5 h-3.5" /> Logout
            </button>
          </div>
        </div>
      </header>

      {/* 2. WARNING ALERT BANNER DISPATCH FEEDS FROM ADMINTAB */}
      {profile.role === "user" && state.reminders.length > 0 && (
        <div className="bg-rose-50 border-b border-rose-150/50 py-3 px-4 sm:px-6" id="dashboard-reminders-panel">
          <div className="max-w-7xl mx-auto flex items-start justify-between gap-4 text-rose-900 text-xs font-medium">
            <div className="flex items-start gap-2.5 flex-1 min-w-0">
              <Bell className="w-4.5 h-4.5 text-rose-600 shrink-0 mt-0.5 animate-bounce" />
              <div className="flex-1 space-y-1 min-w-0">
                <span className="font-bold uppercase tracking-wider text-[9px] text-rose-700">Official Mentor Notifications</span>
                <div className="space-y-1.5 pt-0.5" id="alert-items-box">
                  {state.reminders.map((rem) => (
                    <div key={rem.id} className="flex items-start justify-between gap-3 bg-white/45 hover:bg-white/70 p-1.5 px-2.5 rounded-lg border border-rose-200/40 transition">
                      <p 
                        onClick={() => {
                          if (rem.message.toLowerCase().includes("meeting") || rem.message.toLowerCase().includes("assign") || rem.message.toLowerCase().includes("update")) {
                            setActiveTab("dashboard");
                          }
                        }}
                        className="leading-snug flex-1 cursor-pointer hover:underline"
                        title="Click to view on your Trainee Dashboard"
                      >
                        ⚠️ {rem.message}
                      </p>
                      <button
                        onClick={() => handleDismissReminder(rem.id)}
                        className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-100/55 rounded-md transition cursor-pointer shrink-0"
                        title="Dismiss"
                        aria-label="Dismiss notification"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <button
              onClick={handleDismissAllReminders}
              className="px-2.5 py-1 text-[10px] uppercase tracking-wider font-extrabold text-rose-750 bg-rose-100 hover:bg-rose-200/80 rounded-md border border-rose-200 transition cursor-pointer shrink-0"
            >
              Clear All
            </button>
          </div>
        </div>
      )}

      {/* 3. CENTRAL GATEWAY ROUTER CONTROL (Onboarding, Assessments, and Orientation screens) */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6" id="central-application-canvas">
        
        {/* Onboarding Stage 1 form: demographics update */}
        {showOnboardingForm && (
          <OnboardingForm 
            profile={profile} 
            onUpdateSuccess={handleProfileSynced} 
            onNavigateToAssessment={() => handleProfileSynced({ ...profile, status: "assessment_failed" })} // trigger failure view where they can take/retake
          />
        )}

        {/* Onboarding Stage 2: Track assessment checklist */}
        {showAssessmentGrid && (
          <TrackAssessment 
            profile={profile} 
            onAssessmentCompleted={(updated) => handleProfileSynced(updated)} 
            onPivotTrack={(updated) => handleProfileSynced(updated)}
          />
        )}

        {/* Onboard Stage 3 compliance briefing video watch & PDF scroll checking */}
        {showOrientationGate && (
          <OrientationGate 
            profile={profile} 
            onOrientationCleared={handleProfileSynced} 
          />
        )}

        {/* MAIN USER WORKSPACE DASHBOARD (When student status is "dashboard" or user is logged as Admin) */}
        {!showOnboardingForm && !showAssessmentGrid && !showOrientationGate && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start" id="active-workspace-panel">
            
            {/* LEFT BAR NAV RAIL (3 Columns) - Packed/density forest theme */}
            <aside className="lg:col-span-3 bg-[#4B5E40] text-white rounded-2xl p-4.5 space-y-4 shadow-sm" id="nav-rail-aside">
              
              {/* User Profiling Widget with High Density custom dark green layout */}
              <div className="p-3 bg-[#3b4b32] rounded-xl border border-white/10 text-center space-y-2">
                <div className="w-11 h-11 rounded-full bg-white text-[#4B5E40] flex items-center justify-center font-extrabold text-sm mx-auto shadow-sm">
                  {profile.fullName.split(" ").map(n => n[0]).join("")}
                </div>
                <div>
                  <h4 className="font-bold text-white text-xs sm:text-sm leading-tight">{profile.fullName}</h4>
                  <span className="text-[10px] text-white/60 font-mono">@{profile.username}</span>
                </div>

                <div className="pt-2 border-t border-white/10 flex flex-col gap-1 items-center">
                  <span className="text-[9px] text-white/50 font-bold uppercase tracking-wider block">Assessment clearing rating</span>
                  <span className="text-[10.5px] font-extrabold text-[#4B5E40] font-mono bg-white px-2 py-0.5 rounded border border-white/10">
                    {profile.score !== undefined ? `${profile.score}% Correct` : "N/A"}
                  </span>
                </div>
              </div>

              {/* Navigation buttons links in high contrast high density layout */}
              <nav className="space-y-1.5 flex flex-col font-medium" id="sidebar-navigations">
                
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
                <div className="bg-[#3b4b32]/80 p-3 rounded-lg border border-amber-500/30 text-[10.5px] text-amber-200 leading-normal">
                  💡 <b>Staff Access active:</b> You are in administrative audit mode. Feel free to browse through student tab views!
                </div>
              )}
            </aside>

            {/* TAB VIEWPORTS DISPLAY (9 Columns) */}
            <section className={`lg:col-span-9 min-h-[480px] ${
              activeTab === "dashboard" 
                ? "bg-transparent border-0 p-0 shadow-none space-y-6" 
                : "bg-white border border-gray-150 rounded-2xl p-5 sm:p-6 shadow-2xs"
            }`} id="tab-canvas-panel">
              
              {activeTab === "dashboard" && (
                <Dashboard 
                  profile={profile}
                  state={state}
                  onJoinMeeting={handleMarkAttendance}
                  setActiveTab={setActiveTab}
                  setActiveSubTab={setActiveSubTab}
                  onStateUpdate={fetchLatestState}
                />
              )}

              {activeTab === "hub" && (
                <MeetingsHub 
                  profile={profile} 
                  meetings={state.meetings} 
                  attendance={state.attendance} 
                  onJoinMeeting={handleMarkAttendance} 
                  meetingAssignments={state.meetingAssignments}
                  state={state}
                  onStateUpdate={fetchLatestState}
                />
              )}

              {activeTab === "microservices" && (
                <MicroservicesModule 
                  profile={profile} 
                  state={state} 
                  onStateUpdate={fetchLatestState}
                  activeSubTab={activeSubTab}
                  onActiveSubTabChange={setActiveSubTab}
                />
              )}

              {activeTab === "projects" && (
                <ProjectsTracker 
                  projects={state.projects} 
                  profiles={state.profiles} 
                  onJoinMeeting={handleMarkAttendance} 
                />
              )}

              {activeTab === "leaderboard" && (
                <LeaderboardPodium 
                  profiles={state.profiles} 
                  attendance={state.attendance} 
                />
              )}

              {activeTab === "pathway" && (
                <CareerPathway />
              )}

              {activeTab === "admin" && (
                <AdminPanel 
                  adminProfile={profile}
                  state={state} 
                  onStateUpdate={fetchLatestState} 
                />
              )}

            </section>
          </div>
        )}
      </main>

      {/* FOOTER METRICS INFO */}
      <footer className="bg-white border-t border-gray-100 py-4 px-4 text-center text-xs text-gray-500 font-sans mt-auto" id="operational-footer">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <span>Bincom Dev Center Platform &copy; 2026. All rights and metrics reserved.</span>
          <span className="font-mono text-[10px] text-gray-400">Powered by high-accountability microservices tracker algorithms.</span>
        </div>
      </footer>
    </div>
  );
}
