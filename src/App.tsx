import React, { useState, useEffect } from "react";
import { Profile, Meeting, AttendanceRecord, WeeklyDrill, WeeklyDrillSubmission, MeetingAssignment } from "./types";
import { auth } from "./firebase";
import { signOut } from "firebase/auth";
import { 
  listenToAuthChanges, 
  subscribeToAllState, 
  joinMeetingAttendance, 
  dismissReminder, 
  dismissAllReminders 
} from "./firebaseService";

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
import TopNav from "./components/TopNav";
import SidebarNav from "./components/SidebarNav";
import { ToastContainer, toast } from "./components/Toast";

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
  const [adminTab, setAdminTab] = useState<
    | "funnel"
    | "reviews"
    | "drills"
    | "meetings"
    | "reminders"
    | "cron"
    | "export"
    | "owners"
    | "levels"
    | "kd_desk"
    | "pd_desk"
    | "standup_desk"
    | "attendance_history"
    | "tasks_config"
    | "microservices_config"
    | "pathways_config"
  >("funnel");
  const [hubTab, setHubTab] = useState<"meetings" | "history">("meetings");
  
  // Loading & error cues
  const [fetching, setFetching] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // 1. Listen to Auth changes + seed DB if empty
  useEffect(() => {
    const unsubscribe = listenToAuthChanges((userProfile) => {
      setProfile(userProfile);
      if (userProfile) {
        if (userProfile.role === "admin") {
          setActiveTab("admin");
          // Attempt automatic seed if admin is signed in (safe, skips if already seeded)
          import("./seed").then(({ seedDatabase }) => {
            seedDatabase().catch(err => console.error("Auto seeding failed:", err));
          });
        } else {
          setActiveTab("dashboard");
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // 2. Real-time Firebase State synchronization
  useEffect(() => {
    if (!profile) return;
    setFetching(true);

    const unsubscribe = subscribeToAllState(profile.id, profile, (compiledState) => {
      setState(compiledState);
      setFetching(false);

      // Instantly apply state updates if Admin tweaks current user profile on the server
      const matchedProfile = compiledState.profiles.find((p: Profile) => p.id === profile.id);
      if (matchedProfile) {
        if (JSON.stringify(matchedProfile) !== JSON.stringify(profile)) {
          setProfile(matchedProfile);
        }
      }
    });

    return () => unsubscribe();
  }, [profile?.id]);

  // 3. Scroll to top on navigation/status changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [profile?.status, activeTab, activeSubTab]);

  const fetchLatestState = async () => {
    // No-op placeholder to prevent compile breaking in other tabs, since it's now fully real-time synced!
  };

  const handleAuthSuccess = (newProfile: Profile) => {
    setProfile(newProfile);
    toast.success(`Welcome back, ${newProfile.fullName || newProfile.username || 'User'}!`);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setProfile(null);
      toast.success("Logged out successfully.");
    } catch (err: any) {
      console.error("Sign out error", err);
      toast.error("Logout failed: " + err.message);
    }
  };

  const handleProfileSynced = (updatedProfile: Profile) => {
    setProfile(updatedProfile);
  };

  // Mark attendance log request
  const handleMarkAttendance = async (meetingId: string) => {
    if (!profile) return;
    try {
      const status = await joinMeetingAttendance(profile.id, meetingId);
      toast.success(`Successfully checked in! Punctuality status: ${status}`);
    } catch (error: any) {
      console.error("Failed to mark attendance", error);
      toast.error("Check-in failed: " + error.message);
    }
  };

  // Dismiss a single user reminder/notification
  const handleDismissReminder = async (id: string) => {
    try {
      await dismissReminder(id);
    } catch (e) {
      console.error("Error dismissing reminder:", e);
    }
  };

  // Dismiss all reminders/notifications for current user
  const handleDismissAllReminders = async () => {
    if (!profile) return;
    try {
      await dismissAllReminders(profile.id);
    } catch (e) {
      console.error("Error dismissing all reminders:", e);
    }
  };

  // Smart Routing Gating Nodes based on Student status (Section 3)
  if (!profile) {
    return (
      <>
        <AuthPage onAuthSuccess={handleAuthSuccess} profiles={state.profiles} />
        <ToastContainer />
      </>
    );
  }

  // STANDARD STUDENT ONBOARDING STEPS WORKFLOW
  const showOnboardingForm = profile.role === "user" && profile.status === "onboarding";
  const showAssessmentGrid = profile.role === "user" && ["assessment_failed", "assessment_passed"].includes(profile.status);
  const showOrientationGate = profile.role === "user" && profile.status === "oriented";

  if (showOnboardingForm || showAssessmentGrid || showOrientationGate) {
    return (
      <div className="h-screen bg-[#F8FAF8] text-gray-800 font-sans flex flex-col overflow-hidden" id="app-viewport-root">
        {/* 1. TOP HUB BANNER BAR COMPONENT */}
        <TopNav 
          profile={profile} 
          onLogout={handleLogout}
          showOnboardingForm={showOnboardingForm}
          showAssessmentGrid={showAssessmentGrid}
          showOrientationGate={showOrientationGate}
        />

        <div className="flex-1 overflow-y-auto p-4 sm:p-6" id="central-onboarding-canvas">
          <div className="max-w-4xl mx-auto w-full py-4">
            {showOnboardingForm && (
              <OnboardingForm 
                profile={profile} 
                onUpdateSuccess={handleProfileSynced} 
                onNavigateToAssessment={() => handleProfileSynced({ ...profile, status: "assessment_failed" })} 
              />
            )}

            {showAssessmentGrid && (
              <TrackAssessment 
                profile={profile} 
                onAssessmentCompleted={(updated) => handleProfileSynced(updated)} 
                onPivotTrack={(updated) => handleProfileSynced(updated)}
              />
            )}

            {showOrientationGate && (
              <OrientationGate 
                profile={profile} 
                onOrientationCleared={handleProfileSynced} 
              />
            )}
          </div>
        </div>
        <ToastContainer />
      </div>
    );
  }

  // STANDARD WORKSPACE LAYOUT (SaaS Style, Full-Height Sidebar, independent scrolling pages)
  return (
    <div className="h-screen w-screen bg-[#F8FAF8] text-gray-800 font-sans flex overflow-hidden" id="app-viewport-root">
      
      {/* Left SidebarNav: Spans full height of the viewport */}
      <SidebarNav 
        profile={profile} 
        activeTab={activeTab} 
        setActiveTab={setActiveTab}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        adminTab={adminTab}
        setAdminTab={setAdminTab}
        hubTab={hubTab}
        setHubTab={setHubTab}
        activeSubTab={activeSubTab}
        setActiveSubTab={setActiveSubTab}
      />

      {/* Right Column: TopNav & independent scrolling workspace page */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden" id="app-right-column">
        
        {/* TopNav */}
        <TopNav 
          profile={profile} 
          onLogout={handleLogout}
          showOnboardingForm={false}
          showAssessmentGrid={false}
          showOrientationGate={false}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        />

        {/* Reminders banner (under TopNav, on the right side only!) */}
        {profile.role === "user" && state.reminders.length > 0 && (
          <div className="bg-rose-50 border-b border-rose-150/50 py-2.5 px-4 sm:px-6 shrink-0" id="dashboard-reminders-panel">
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

        {/* Content Container (Independently scrolling) */}
        <main className="flex-1 overflow-y-auto bg-[#F8FAF8] p-5 sm:p-6 flex flex-col" id="central-application-canvas">
          <div className="flex-1">
            <div className={`mx-auto max-w-7xl ${
              activeTab === "dashboard" 
                ? "space-y-6" 
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
                  hubTab={hubTab}
                  setHubTab={setHubTab}
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
                <CareerPathway careerPathways={state.careerPathways} />
              )}

              {activeTab === "admin" && (
                <AdminPanel 
                  adminProfile={profile}
                  state={state} 
                  onStateUpdate={fetchLatestState} 
                  adminTab={adminTab}
                  setAdminTab={setAdminTab}
                />
              )}

            </div>
          </div>

          {/* FOOTER METRICS INFO INSIDE THE SCROLLABLE WRAPPER */}
          <footer className="py-6 text-center text-xs text-gray-500 font-sans mt-8 border-t border-gray-100 shrink-0" id="operational-footer">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5">
              <span>Bincom Dev Center Platform &copy; 2026. All rights and metrics reserved.</span>
              <span className="font-mono text-[10px] text-gray-400">Powered by high-accountability microservices tracker algorithms.</span>
            </div>
          </footer>
        </main>
      </div>
      <ToastContainer />
    </div>
  );
}
