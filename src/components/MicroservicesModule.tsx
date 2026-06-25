import React, { useState } from "react";
import { getStandupDetails } from "../utils/trackUtils";
import { 
  Profile, 
  StandupLog, 
  PersonalDevelopmentLog, 
  TechUpdateSubmission, 
  WeeklyDrill, 
  WeeklyDrillSubmission,
  SocialEventLog,
  DailyReportLog
} from "../types";
import { 
  BookOpen, 
  CalendarDays, 
  FileEdit, 
  Rss, 
  Award, 
  Share2, 
  AlertCircle, 
  CheckCircle,
  FileText,
  MousePointerClick,
  ExternalLink,
  Plus,
  Video
} from "lucide-react";

interface MicroservicesModuleProps {
  profile: Profile;
  state: {
    standups: StandupLog[];
    personalDevelopment: PersonalDevelopmentLog[];
    techUpdates: TechUpdateSubmission[];
    weeklyDrills: WeeklyDrill[];
    drillSubmissions: WeeklyDrillSubmission[];
    socialLogs: SocialEventLog[];
    dailyReports?: DailyReportLog[]; // made optional to avoid breakages
    kdCounts: Record<string, number>;
  };
  onStateUpdate: () => void;
  activeSubTab?: "kd" | "standups" | "daily-report" | "pd" | "tech" | "drills" | "social";
  onActiveSubTabChange?: (tab: "kd" | "standups" | "daily-report" | "pd" | "tech" | "drills" | "social") => void;
}

export default function MicroservicesModule({ 
  profile, 
  state, 
  onStateUpdate,
  activeSubTab: propActiveSubTab,
  onActiveSubTabChange
}: MicroservicesModuleProps) {
  const [localSubTab, setLocalSubTab] = useState<"kd" | "standups" | "daily-report" | "pd" | "tech" | "drills" | "social">("kd");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Standup states
  const [standupType, setStandupType] = useState<"morning" | "evening">("morning");
  const [standupText, setStandupText] = useState("");

  // Personal Development states (with word validation!)
  const [pdText, setPdText] = useState("");

  // Tech Update states
  const [techTitle, setTechTitle] = useState("");
  const [techUrl, setTechUrl] = useState("");
  const [techSummary, setTechSummary] = useState("");

  // Drill submission states
  const [selectedDrillId, setSelectedDrillId] = useState("");
  const [solutionUrl, setSolutionUrl] = useState("");

  // Social log states
  const [socialTitle, setSocialTitle] = useState("");
  const [socialLink, setSocialLink] = useState("");
  const [socialCategory, setSocialCategory] = useState<"blog" | "hackathon" | "public-artifact">("blog");

  // Daily Report states
  const [reportAccomplishments, setReportAccomplishments] = useState("");
  const [reportHoursSpent, setReportHoursSpent] = useState("8");
  const [reportRoadblocks, setReportRoadblocks] = useState("");
  const [reportTakeaways, setReportTakeaways] = useState("");

  const activeSubTab = propActiveSubTab || localSubTab;
  const setActiveSubTab = onActiveSubTabChange || setLocalSubTab;

  const standupDetails = getStandupDetails(profile.track);
  const meetingLinkToJoin = standupType === "morning" ? standupDetails.morningLink : standupDetails.eveningLink;

  // Filter student-specific records
  const studentStandups = state.standups.filter((s) => s.userId === profile.id);
  const studentDailyReports = (state.dailyReports || []).filter((r) => r.userId === profile.id);
  const studentPdLogs = state.personalDevelopment.filter((p) => p.userId === profile.id);
  const studentTechUpdates = state.techUpdates.filter((t) => t.userId === profile.id);
  const studentSubmissions = state.drillSubmissions.filter((ds) => ds.userId === profile.id);
  const studentSocials = state.socialLogs.filter((sl) => sl.userId === profile.id);
  
  const studentKDCount = state.kdCounts[profile.id] || 0;

  // Real-time word counter for Personal Development
  const countWords = (text: string) => {
    return text.trim().split(/\s+/).filter((w) => w.length > 0).length;
  };

  const pdWordCount = countWords(pdText);

  // Clear inputs
  const triggerSuccess = (msg: string) => {
    setSuccess(msg);
    setError("");
    setTimeout(() => setSuccess(""), 3500);
  };

  const triggerError = (msg: string) => {
    setError(msg);
    setSuccess("");
  };

  // 1. Submit Standup goals/achievements
  const handleStandupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!standupText.trim()) return;

    setLoading(true);
    try {
      const res = await fetch("/api/student/submit-standup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: profile.id,
          type: standupType,
          content: standupText
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setStandupText("");
      triggerSuccess(`Successfully recorded your ${standupType} standup summary log.`);
      onStateUpdate();
    } catch (err: any) {
      triggerError(err.message || "Standup submission failed");
    } finally {
      setLoading(false);
    }
  };

  // Submit Daily Report
  const handleDailyReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportAccomplishments.trim()) {
      triggerError("Accomplishments field is required.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/student/submit-daily-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: profile.id,
          accomplishments: reportAccomplishments,
          hoursSpent: Number(reportHoursSpent) || 0,
          roadblocks: reportRoadblocks,
          takeaways: reportTakeaways
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setReportAccomplishments("");
      setReportRoadblocks("");
      setReportTakeaways("");
      triggerSuccess("Your Daily Report has been logged successfully.");
      onStateUpdate();
    } catch (err: any) {
      triggerError(err.message || "Daily report submission failed");
    } finally {
      setLoading(false);
    }
  };

  // 2. Submit Personal Development Learning summary (Validates 100-words baseline target)
  const handlePdSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (pdWordCount < 80) { // Keep minimum validator helpful but strict (user alert warning)
      triggerError(`Personal Development summary is under the strict 100-word constraint (Current word count: ${pdWordCount} words). Please elaborate your learning takeaways to submit.`);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/student/submit-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: profile.id,
          summaryText: pdText
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setPdText("");
      triggerSuccess("Your 100-word learning summary has been validated, saved, and dispatched for audit!");
      onStateUpdate();
    } catch (err: any) {
      triggerError(err.message || "PD submission failed");
    } finally {
      setLoading(false);
    }
  };

  // 3. Submit Tech Update News Article
  const handleTechUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!techTitle || !techUrl || !techSummary) {
      triggerError("All Tech news inputs must be completed.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/student/submit-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: profile.id,
          title: techTitle,
          url: techUrl,
          summary: techSummary
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setTechTitle("");
      setTechUrl("");
      setTechSummary("");
      triggerSuccess("Tech News summary updated saved to the community feed.");
      onStateUpdate();
    } catch (err: any) {
      triggerError(err.message || "Tech news logging failed.");
    } finally {
      setLoading(false);
    }
  };

  // 4. Submit Drill Solutions
  const handleDrillSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDrillId || !solutionUrl) {
      triggerError("Identify target drill and valid solution repository link.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/student/submit-drill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: profile.id,
          drillId: selectedDrillId,
          solutionUrl
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSolutionUrl("");
      setSelectedDrillId("");
      triggerSuccess("Your weekly challenge solution repository is logged for mentor grades!");
      onStateUpdate();
    } catch (err: any) {
      triggerError(err.message || "Challenge submission failed.");
    } finally {
      setLoading(false);
    }
  };

  // 5. Join KD Click Alignment Tracker
  const handleJoinKD = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/student/join-kd", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: profile.id })
      });

      const data = await res.json();
      if (res.ok) {
        triggerSuccess(`Congratulations! Marking Knowledge Development attendance successfully. Account totals: ${data.count}/16 monthly checkins!`);
        onStateUpdate();
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      triggerError("KD marker error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // 6. Submit Social Public Artifact log
  const handleSocialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!socialTitle || !socialLink) {
      triggerError("Please populate both artifact Title and valid destination URL.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/social/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: profile.id,
          title: socialTitle,
          link: socialLink,
          type: socialCategory
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSocialTitle("");
      setSocialLink("");
      triggerSuccess("Social tech log entries dispatched successfully.");
      onStateUpdate();
    } catch (err: any) {
      triggerError(err.message || "Social log file failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6" id="microservice-ecosystem-root">
      
      {/* Mini Segment Tabs */}
      <div className="flex overflow-x-auto gap-2 bg-[#F8FAF8] p-2.5 rounded-xl border border-gray-100 select-none no-scrollbar">
        <button
          onClick={() => { setActiveSubTab("kd"); setError(""); setSuccess(""); }}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold shrink-0 transition cursor-pointer ${
            activeSubTab === "kd" ? "bg-[#4B5E40] text-white shadow-sm" : "text-gray-600 hover:bg-gray-150"
          }`}
        >
          <BookOpen className="w-4 h-4" /> KD Tracker ({studentKDCount}/16)
        </button>
        <button
          onClick={() => { setActiveSubTab("standups"); setError(""); setSuccess(""); }}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold shrink-0 transition cursor-pointer ${
            activeSubTab === "standups" ? "bg-[#4B5E40] text-white shadow-sm" : "text-gray-600 hover:bg-gray-150"
          }`}
        >
          <CalendarDays className="w-4 h-4" /> Daily Standups
        </button>
        <button
          onClick={() => { setActiveSubTab("daily-report"); setError(""); setSuccess(""); }}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold shrink-0 transition cursor-pointer ${
            activeSubTab === "daily-report" ? "bg-[#4B5E40] text-white shadow-sm" : "text-gray-600 hover:bg-gray-150"
          }`}
        >
          <FileText className="w-4 h-4" /> Daily Report (Once a Day)
        </button>
        <button
          onClick={() => { setActiveSubTab("pd"); setError(""); setSuccess(""); }}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold shrink-0 transition cursor-pointer ${
            activeSubTab === "pd" ? "bg-[#4B5E40] text-white shadow-sm" : "text-gray-600 hover:bg-gray-150"
          }`}
        >
          <FileEdit className="w-4 h-4" /> PD Logs (Min 100 Words)
        </button>
        <button
          onClick={() => { setActiveSubTab("tech"); setError(""); setSuccess(""); }}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold shrink-0 transition cursor-pointer ${
            activeSubTab === "tech" ? "bg-[#4B5E40] text-white shadow-sm" : "text-gray-600 hover:bg-gray-150"
          }`}
        >
          <Rss className="w-4 h-4" /> Tech Updates
        </button>
        <button
          onClick={() => { setActiveSubTab("drills"); setError(""); setSuccess(""); }}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold shrink-0 transition cursor-pointer ${
            activeSubTab === "drills" ? "bg-[#4B5E40] text-white shadow-sm" : "text-gray-600 hover:bg-gray-150"
          }`}
        >
          <Award className="w-4 h-4" /> Weekly Drills
        </button>
        <button
          onClick={() => { setActiveSubTab("social"); setError(""); setSuccess(""); }}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold shrink-0 transition cursor-pointer ${
            activeSubTab === "social" ? "bg-[#4B5E40] text-white shadow-sm" : "text-gray-600 hover:bg-gray-150"
          }`}
        >
          <Share2 className="w-4 h-4" /> Social Logs
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-2.5 p-3.5 bg-rose-50 text-rose-800 text-xs rounded-xl border border-rose-100" id="micro-alert-err">
          <AlertCircle className="w-4.5 h-4.5 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-start gap-2.5 p-3.5 bg-emerald-50 text-emerald-800 text-xs rounded-xl border border-emerald-100" id="micro-alert-suc">
          <CheckCircle className="w-4.5 h-4.5 shrink-0 text-emerald-600" />
          <span>{success}</span>
        </div>
      )}

      {/* SUB TAB CONTROLLERS CONTENT */}

      {/* 1. KNOWLEDGE DEVELOPMENT (KD) LOGS TRACKER */}
      {activeSubTab === "kd" && (
        <div className="bg-white rounded-2xl border border-gray-150 p-6 space-y-6" id="kd-module-container">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-1.5 leading-normal">
                <BookOpen className="w-5 h-5 text-[#4B5E40]" /> KD Attendance tracking Progress (Monthly)
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                To guarantee structured proficiency, standard learning policies stipulate attending at least <b>16 Knowledge Development sessions</b> per monthly track period.
              </p>
            </div>

            <button
              id="kd-join-now-btn"
              onClick={handleJoinKD}
              disabled={studentKDCount >= 16 || loading}
              className="px-5 py-2.5 bg-[#4B5E40] hover:bg-[#3d4d34] disabled:bg-gray-200 disabled:text-gray-400 text-white text-xs font-extrabold rounded-xl shadow-xs transition shrink-0 cursor-pointer text-center flex items-center gap-1 justify-center"
            >
              <MousePointerClick className="w-4 h-4" /> Log Today's KD Sync (Join KD)
            </button>
          </div>

          {/* Graphical custom percentage progress bar */}
          <div className="bg-[#F8FAF8] p-4 rounded-xl border border-gray-100 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-[#4B5E40]">Monthly Graduation Target progress:</span>
              <span className="font-mono font-bold text-gray-700 bg-white px-2 py-0.5 rounded border">{studentKDCount} of 16 sessions ({Math.round((studentKDCount / 16) * 100)}%)</span>
            </div>
            
            <div className="h-4 bg-gray-200 rounded-full w-full overflow-hidden shadow-xs border">
              <div 
                className="h-full bg-linear-to-r from-[#4B5E40] to-emerald-600 rounded-full transition-all duration-700 relative" 
                style={{ width: `${Math.min(100, (studentKDCount / 16) * 100)}%` }}
              >
                {studentKDCount > 0 && (
                  <span className="absolute right-2.5 top-0.5 text-[8px] font-bold text-white font-mono shrink-0">
                    {Math.round((studentKDCount / 16) * 100)}%
                  </span>
                )}
              </div>
            </div>

            {studentKDCount >= 16 ? (
              <p className="text-xs font-bold text-emerald-800 flex items-center gap-1 pt-1 justify-center">
                <CheckCircle className="w-4 h-4 text-emerald-600" /> Target achieved! Complete KD logs synced.
              </p>
            ) : (
              <p className="text-[11px] text-gray-500 text-center italic">
                Need to complete {16 - studentKDCount} more sessions to clear your monthly KD tracking checks!
              </p>
            )}
          </div>
        </div>
      )}

      {/* 2. DAILY STANDUPS MODULE */}
      {activeSubTab === "standups" && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6" id="standups-module-container">
          
          {/* Submission Panel (5 Columns) */}
          <form onSubmit={handleStandupSubmit} className="md:col-span-5 bg-white rounded-2xl border border-gray-150 p-5 space-y-4" id="standup-log-form">
            <h3 className="font-bold text-sm text-gray-900 leading-normal">Submit Today's Standup Workbook</h3>
            
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                A. Standup phase type
              </label>
              <div className="flex gap-2 font-medium">
                <button
                  type="button"
                  id="tab-standup-morning"
                  onClick={() => setStandupType("morning")}
                  className={`flex-1 py-1.5 text-center text-xs rounded-lg cursor-pointer transition ${
                    standupType === "morning"
                      ? "bg-[#4B5E40] text-white shadow-xs font-semibold"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  Morning Goals (09:45 AM)
                </button>
                <button
                  type="button"
                  id="tab-standup-evening"
                  onClick={() => setStandupType("evening")}
                  className={`flex-1 py-1.5 text-center text-xs rounded-lg cursor-pointer transition ${
                    standupType === "evening"
                      ? "bg-[#4B5E40] text-white shadow-xs font-semibold"
                      : "bg-gray-100 text-[#4B5E40] hover:bg-gray-200"
                  }`}
                >
                  Evening achievements (05:00 PM)
                </button>
              </div>
            </div>

            {/* Dynamic Standup Sync Join Button */}
            <div className="bg-emerald-50 border border-emerald-150 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-emerald-800 tracking-wider">Join Live Meeting Room</span>
                <span className="text-[9px] bg-emerald-100 font-bold px-1.5 py-0.5 rounded text-emerald-800">{standupDetails.name}</span>
              </div>
              <p className="text-[11px] text-gray-600 leading-snug">
                Participate in live team accountability checks. Tap below to navigate directly to your standup space.
              </p>
              <a
                href={meetingLinkToJoin}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-xs text-center cursor-pointer"
              >
                <Video className="w-3.5 h-3.5 shrink-0" /> Go to standup meeting
              </a>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                B. Goals / achievements description
              </label>
              <textarea
                id="standup-content-input"
                required
                rows={4}
                value={standupText}
                onChange={(e) => setStandupText(e.target.value)}
                placeholder={
                  standupType === "morning" 
                    ? "Specifically list the 3 concrete technical milestones you intend to achieve today on Jitsi/your repository." 
                    : "Review Morning Goals: List blocks cleared, tasks completed, metrics logged, and learning takeaways."
                }
                className="w-full p-2.5 text-xs bg-[#F8FAF8] rounded-lg border border-gray-200 focus:outline-[#4B5E40] resize-y min-h-24 whitespace-pre-line"
              />
            </div>

            <button
              id="standup-submit-btn"
              type="submit"
              disabled={loading || !standupText.trim()}
              className="w-full py-2 bg-[#4B5E40] hover:bg-[#3d4d34] disabled:opacity-50 text-white font-bold text-xs rounded-lg shadow-xs transition active:scale-95 cursor-pointer flex justify-center items-center gap-1"
            >
              <Plus className="w-4 h-4" /> Submit Task details
            </button>
          </form>

          {/* History Panel (7 Columns) */}
          <div className="md:col-span-7 bg-white rounded-2xl border border-gray-150 p-5 space-y-4">
            <h3 className="font-bold text-sm text-gray-900 leading-normal">Your Active Standup Ledger</h3>
            
            {studentStandups.length === 0 ? (
              <p className="text-xs text-gray-400 italic py-6 text-center">
                No goals or achievements logged for this account today. Send standups above!
              </p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {studentStandups.map((s) => (
                  <div key={s.id} className="p-3.5 bg-[#F8FAF8] rounded-xl border border-gray-100 text-xs space-y-2.5">
                    <div className="flex justify-between items-center text-[10px] text-gray-400 font-mono">
                      <span>Date: {s.date}</span>
                      <span>ID: {s.id}</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 divide-y sm:divide-y-0 sm:divide-x divide-gray-200">
                      <div>
                        <span className="block text-[10px] uppercase font-bold text-[#4B5E40] mb-0.5">☀️ Morning Goals:</span>
                        <p className="text-[#333] italic leading-normal text-[11px] whitespace-pre-wrap">{s.morningGoals || "Pending..."}</p>
                        {s.morningTime && <span className="block text-[9px] text-gray-400 mt-1">Logged: {s.morningTime}</span>}
                      </div>

                      <div className="pt-2 sm:pt-0 sm:pl-3">
                        <span className="block text-[10px] uppercase font-bold text-emerald-800 mb-0.5">🌙 Evening Achievements:</span>
                        <p className="text-[#333] italic leading-normal text-[11px] whitespace-pre-wrap">{s.eveningAchievements || "Pending Achievements submission"}</p>
                        {s.eveningTime && <span className="block text-[9px] text-gray-400 mt-1">Logged: {s.eveningTime}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* DAILY REPORTS MODULE (Filled once a day) */}
      {activeSubTab === "daily-report" && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6" id="daily-reports-module-container">
          
          {/* Submission Panel (5 Columns) */}
          <form onSubmit={handleDailyReportSubmit} className="md:col-span-12 lg:col-span-5 bg-white rounded-2xl border border-gray-150 p-5 space-y-4" id="daily-report-log-form">
            <div>
              <h3 className="font-bold text-sm text-gray-900 leading-normal">Submit Today's Daily Report</h3>
              <p className="text-xs text-gray-500 mt-1">This report is to be compiled and submitted once a day to report your overall progress, blockers, and time commitment.</p>
            </div>
            
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                1. Accomplishments & Technical Output (Required)
              </label>
              <textarea
                id="report-accomplishments-input"
                required
                rows={4}
                value={reportAccomplishments}
                onChange={(e) => setReportAccomplishments(e.target.value)}
                placeholder="What did you achieve today? Mention specific repositories, features coded, drafts, tests, or documentation written."
                className="w-full text-xs p-3 rounded-lg border border-gray-200 focus:outline-[#4B5E40] transition"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                2. Hours Spent Coding / Learning
              </label>
              <select
                id="report-hours-input"
                value={reportHoursSpent}
                onChange={(e) => setReportHoursSpent(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-gray-200 focus:outline-[#4B5E40] bg-white text-gray-800 font-medium cursor-pointer"
              >
                <option value="1">1 Hour</option>
                <option value="2">2 Hours</option>
                <option value="3">3 Hours</option>
                <option value="4">4 Hours</option>
                <option value="5">5 Hours</option>
                <option value="6">6 Hours</option>
                <option value="7">7 Hours</option>
                <option value="8">8 Hours (Full-time Target)</option>
                <option value="9">9 Hours</option>
                <option value="10">10+ Hours</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                3. Roadblocks & Challenges Faced (Optional)
              </label>
              <textarea
                id="report-roadblocks-input"
                rows={2}
                value={reportRoadblocks}
                onChange={(e) => setReportRoadblocks(e.target.value)}
                placeholder="Any blocking issues, package errors, design doubts, or environment setup constraints?"
                className="w-full text-xs p-3 rounded-lg border border-gray-200 focus:outline-[#4B5E40] transition"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                4. Key Technical Takeaways / Learnings (Optional)
              </label>
              <textarea
                id="report-takeaways-input"
                rows={2}
                value={reportTakeaways}
                onChange={(e) => setReportTakeaways(e.target.value)}
                placeholder="What new concept, standard, library, or error resolution did you pick up today?"
                className="w-full text-xs p-3 rounded-lg border border-gray-200 focus:outline-[#4B5E40] transition"
              />
            </div>

            <button
              id="report-submit-btn"
              type="submit"
              disabled={loading || !reportAccomplishments.trim()}
              className="w-full py-2.5 bg-[#4B5E40] hover:bg-[#3d4d34] disabled:bg-gray-100 disabled:text-gray-400 text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1"
            >
              {loading ? "Submitting Progress..." : "Submit Daily Progress Report"}
            </button>
          </form>

          {/* List Ledger (7 Columns) */}
          <div className="md:col-span-12 lg:col-span-7 bg-white rounded-2xl border border-gray-150 p-5 space-y-4" id="daily-reports-ledger-panel">
            <h3 className="font-bold text-sm text-gray-900 leading-normal">Your Recorded Daily Reports</h3>
            
            {studentDailyReports.length === 0 ? (
              <div className="text-center py-12 px-4 border border-dashed border-gray-200 rounded-xl text-xs text-gray-400 font-medium">
                No progress reports cataloged. Build up your consistency record by compiling your very first daily status report.
              </div>
            ) : (
              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1 no-scrollbar">
                {studentDailyReports.map((r) => (
                  <div key={r.id} className="p-4 bg-gray-50 rounded-xl border border-gray-150 space-y-3 shadow-2xs">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                      <span className="font-bold text-[11px] text-[#4B5E40] font-mono bg-white px-2 py-0.5 rounded border">
                        📅 {r.date}
                      </span>
                      <span className="text-[10px] text-gray-500 font-mono font-semibold">
                        ⏱️ {r.hoursSpent} Hours Logged
                      </span>
                    </div>

                    <div className="space-y-2.5 text-xs">
                      <div>
                        <span className="block text-[10px] font-bold uppercase text-[#4B5E40] tracking-wider mb-1">🎯 Accomplishments & Output:</span>
                        <p className="text-gray-800 leading-relaxed bg-white/70 p-2.5 rounded border border-gray-100 whitespace-pre-wrap">{r.accomplishments}</p>
                      </div>

                      {r.roadblocks && (
                        <div>
                          <span className="block text-[10px] font-bold uppercase text-amber-800 tracking-wider mb-1">⚠️ Roadblocks/Challenges:</span>
                          <p className="text-amber-900 leading-normal bg-amber-50/50 p-2 rounded border border-amber-100 font-medium whitespace-pre-wrap">{r.roadblocks}</p>
                        </div>
                      )}

                      {r.takeaways && (
                        <div>
                          <span className="block text-[10px] font-bold uppercase text-indigo-800 tracking-wider mb-1">💡 Learning & Takeaways:</span>
                          <p className="text-indigo-900 leading-normal bg-indigo-50/30 p-2 rounded border border-indigo-100 whitespace-pre-wrap">{r.takeaways}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. PERSONAL DEVELOPMENT (PD) LOGS Gated with 100-word constraint validation */}
      {activeSubTab === "pd" && (
        <div className="bg-white rounded-2xl border border-gray-150 p-6 space-y-6" id="pd-module-container">
          <div className="border-b border-gray-100 pb-3">
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-1.5 mb-1.5">
              <FileEdit className="w-5 h-5 text-[#4B5E40]" /> Personal Development (PD) learning summaries
            </h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              We enforce high quality reporting. Students must submit a daily summary documenting concepts, models, and errors resolved. 
              <br />🔴 <b>Strict Rule Policy:</b> Your PD log entry MUST contain <b>at least 80-100 words</b> to pass program compliance, otherwise the submission is rejected.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Editor form (7 columns) */}
            <form onSubmit={handlePdSubmit} className="lg:col-span-7 space-y-4" id="pd-submissions-form">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500">
                    Write learning taking summary
                  </label>
                  <span className={`text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-md ${
                    pdWordCount >= 85 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700 animate-pulse"
                  }`}>
                    {pdWordCount} words written (Min: 100 targets)
                  </span>
                </div>
                <textarea
                  id="pd-textarea"
                  value={pdText}
                  onChange={(e) => setPdText(e.target.value)}
                  placeholder="Mastered model layouts today. Explored how to bind custom server tsx routes onto port 3000 to construct API databases as an alternative to external services..."
                  rows={7}
                  className="w-full p-3 text-xs sm:text-sm bg-[#F8FAF8] rounded-xl border border-gray-200 focus:outline-[#4B5E40] resize-y min-h-36 placeholder:italic leading-relaxed focus:bg-white"
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[10px] text-gray-400">
                  Tip: Use rich technical terms describing components, API models, or workflow modules!
                </span>
                <button
                  id="pd-submit-btn"
                  type="submit"
                  disabled={loading || pdWordCount === 0}
                  className="px-5 py-2.5 bg-[#4B5E40] hover:bg-[#3d4d34] disabled:bg-gray-100 disabled:text-gray-400 disabled:shadow-none text-white text-xs font-bold rounded-xl shadow transition cursor-pointer"
                >
                  Grade & Submit PD Log 📋
                </button>
              </div>
            </form>

            {/* History files (5 columns) */}
            <div className="lg:col-span-5 bg-[#F8FAF8] p-4 rounded-xl border border-gray-150 space-y-3.5">
              <h4 className="font-bold text-xs uppercase text-gray-700 flex items-center gap-1">
                <FileText className="w-4 h-4 text-[#4B5E40]" /> Your Submitted PD Logs
              </h4>
              
              {studentPdLogs.length === 0 ? (
                <p className="text-xs text-gray-400 italic text-center py-5">No PD entries logged on this browser session yet.</p>
              ) : (
                <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                  {studentPdLogs.map((log) => (
                    <div key={log.id} className="p-3 bg-white rounded-lg border border-gray-100 space-y-2 shadow-xs">
                      <div className="flex justify-between items-center text-[9px] text-[#4B5E40] font-mono">
                        <span className="font-semibold">✓ Compliant Approved</span>
                        <span>{log.date}</span>
                      </div>
                      <p className="text-[#444] text-[11px] leading-relaxed whitespace-pre-wrap font-sans block max-h-36 overflow-y-auto pr-0.5">
                        {log.summary}
                      </p>
                      <div className="text-[9px] text-gray-400 font-mono text-right">
                        Word count: {countWords(log.summary)} words.
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4. TECH UPDATE SECTION */}
      {activeSubTab === "tech" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="tech-updates-container">
          
          {/* Form */}
          <form onSubmit={handleTechUpdateSubmit} className="lg:col-span-5 bg-white rounded-2xl border border-[#4B5E40]/10 p-5 space-y-4 shadow-sm" id="tech-update-form">
            <h3 className="font-bold text-sm text-gray-950 flex items-center gap-1">
              <Rss className="w-4.5 h-4.5 text-[#4B5E40]" /> Share Industry tech news
            </h3>
            
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                  Article / Innovations Title
                </label>
                <input
                  id="tech-title-input"
                  type="text"
                  required
                  placeholder="e.g. NextJS 16 Server Component specs"
                  value={techTitle}
                  onChange={(e) => setTechTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-gray-50 rounded-lg border border-gray-200 focus:outline-[#4B5E40]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                  Valid Article URL Link
                </label>
                <input
                  id="tech-link-input"
                  type="url"
                  required
                  placeholder="https://techcrunch.com/article"
                  value={techUrl}
                  onChange={(e) => setTechUrl(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-gray-50 rounded-lg border border-gray-200 focus:outline-[#4B5E40]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                  Your Insightful Abstract Summary
                </label>
                <textarea
                  id="tech-summary-input"
                  required
                  value={techSummary}
                  onChange={(e) => setTechSummary(e.target.value)}
                  placeholder="Offer a 2-3 sentence overview of this news item and how it affects developers in your track..."
                  rows={3}
                  className="w-full px-3 py-2 text-xs bg-gray-50 rounded-lg border border-gray-200 focus:outline-[#4B5E40] resize-y"
                />
              </div>
            </div>

            <button
              id="tech-submit-btn"
              type="submit"
              disabled={loading || !techTitle || !techUrl || !techSummary}
              className="w-full py-2 bg-[#4B5E40] hover:bg-[#3d4d34] disabled:opacity-40 text-white font-bold text-xs rounded-lg transition active:scale-95 cursor-pointer"
            >
              Post to News Stream 📣
            </button>
          </form>

          {/* Social News Feed */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-gray-150 p-5 space-y-4">
            <h3 className="font-bold text-sm text-gray-900 leading-normal">Community News Feed</h3>
            
            {studentTechUpdates.length === 0 ? (
              <p className="text-xs text-gray-400 italic text-center py-6">Your shared news will list here as submissions are completed.</p>
            ) : (
              <div className="space-y-3.5 max-h-96 overflow-y-auto pr-1">
                {studentTechUpdates.map((t) => (
                  <div key={t.id} className="p-3 bg-[#F8FAF8] rounded-xl border border-gray-100 text-xs text-slate-800 space-y-1.5 shadow-2xs">
                    <div className="flex sm:items-center sm:justify-between flex-col sm:flex-row gap-1">
                      <h4 className="font-bold text-gray-900 text-xs flex items-center gap-1 select-none leading-tight">{t.title}</h4>
                      <a 
                        id={`ex-link-${t.id}`}
                        href={t.url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-[10px] text-[#4B5E40] font-sans hover:underline inline-flex items-center gap-0.5"
                      >
                        Source URL <ExternalLink className="w-3 h-3 text-[#4B5E40]" />
                      </a>
                    </div>
                    <p className="text-gray-600 text-[11px] leading-relaxed whitespace-pre-wrap">Abstract: {t.summary}</p>
                    <div className="flex justify-between items-center text-[9px] text-gray-400 pt-1 border-t border-gray-100/50">
                      <span>Submitted by You</span>
                      <span>{new Date(t.timestamp).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. WEEKLY DRILLS WORKBOOK */}
      {activeSubTab === "drills" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="weekly-challenges-container">
          
          {/* Drills List (7 columns) */}
          <div className="lg:col-span-7 space-y-4">
            <h3 className="font-bold text-sm text-gray-900 leading-normal flex items-center gap-1">
              <Award className="w-4.5 h-4.5 text-[#4B5E40]" /> Active Weekly challenges
            </h3>

            {state.weeklyDrills.length === 0 ? (
              <p className="text-xs text-gray-400 italic">No weekly drills currently listed by administrative mentors.</p>
            ) : (
              <div className="space-y-4">
                {state.weeklyDrills.map((drill) => {
                  const studentSub = studentSubmissions.find((s) => s.drillId === drill.id);
                  return (
                    <div key={drill.id} className="bg-white rounded-xl border border-gray-200 p-4 space-y-3 shadow-xs hover:border-[#4B5E40]/30 transition" id={`drill-card-${drill.id}`}>
                      <div className="flex justify-between items-start gap-2 flex-col sm:flex-row">
                        <div>
                          <h4 className="font-bold text-gray-900 text-xs sm:text-sm leading-snug">{drill.title}</h4>
                          <span className="text-[10px] text-gray-400 block font-mono mt-0.5">Posted: {new Date(drill.postedAt).toLocaleDateString()}</span>
                        </div>

                        {/* Status tag */}
                        <div className="shrink-0 text-xs">
                          {!studentSub ? (
                            <span className="px-2.5 py-0.5 bg-rose-50 text-rose-700 rounded-full font-bold border border-rose-100 animate-pulse text-[10px]">
                              Tackle Needed
                            </span>
                          ) : studentSub.status === "Approved" ? (
                            <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-800 rounded-full font-bold border border-emerald-100 text-[10px]">
                              Approved ✓
                            </span>
                          ) : studentSub.status === "Rejected" ? (
                            <span className="px-2.5 py-0.5 bg-red-50 text-red-850 rounded-full font-bold border border-red-100 text-[10px]">
                              Fail / Rejected ⚠️
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 bg-orange-50 text-orange-850 rounded-full font-bold border border-orange-100 text-[10px]">
                              Pending Grade
                            </span>
                          )}
                        </div>
                      </div>

                      <p className="text-gray-600 text-xs leading-relaxed whitespace-pre-line bg-[#F8FAF8] p-3 rounded-lg border border-gray-100">{drill.description}</p>
                      
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                        <a 
                          id={`drills-link-${drill.id}`}
                          href={drill.link} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="text-xs text-[#4B5E40] font-sans hover:underline flex items-center gap-1.5 self-start sm:self-auto"
                        >
                          Inspect Specifications Rubric <ExternalLink className="w-3.5 h-3.5 text-[#4B5E40]" />
                        </a>

                        {!studentSub && (
                          <button
                            id={`submit-this-drill-btn-${drill.id}`}
                            onClick={() => setSelectedDrillId(drill.id)}
                            className="px-3.5 py-1.5 bg-[#4B5E40] hover:bg-[#3d4d34] text-white text-[11px] font-bold rounded-lg cursor-pointer flex items-center"
                          >
                            Enter Solution URL
                          </button>
                        )}
                      </div>

                      {studentSub && (
                        <div className="p-3 bg-[#4B5E40]/5 rounded-lg border border-gray-200/50 space-y-1.5 text-xs text-gray-700">
                          <p className="font-semibold block truncate">Your Solution: <a id={`link-sol-sub-${drill.id}`} href={studentSub.solutionUrl} target="_blank" rel="noopener noreferrer" className="text-[#4B5E40] hover:underline font-mono text-[10.5px] font-bold">{studentSub.solutionUrl}</a></p>
                          {studentSub.feedback && (
                            <p className="text-gray-600 pl-2.5 border-l-2 border-[#4B5E40] py-0.5">
                              <b>Mentor Feedback:</b> "{studentSub.feedback}"
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Submission card popup (5 columns) */}
          <div className="lg:col-span-5">
            {selectedDrillId ? (
              <form onSubmit={handleDrillSubmit} className="bg-white rounded-2xl border border-gray-250 p-5 space-y-4 shadow-md" id="drill-subform">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-sm text-gray-950 dark:text-gray-800">Submit Drill Workspace</h4>
                  <button 
                    id="close-drill-form-btn"
                    type="button" 
                    onClick={() => { setSelectedDrillId(""); setSolutionUrl(""); }}
                    className="text-xs text-gray-400 hover:text-gray-600"
                  >
                    Cancel
                  </button>
                </div>

                <div className="text-xs p-3 bg-[#F8FAF8] rounded-xl text-slate-700 border">
                  <span>Submitting solutions for:</span>
                  <p className="font-bold text-[#4B5E40] mt-1 text-xs block leading-tight">
                    {state.weeklyDrills.find(d => d.id === selectedDrillId)?.title}
                  </p>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                    GitHub / deployment Project link *
                  </label>
                  <input
                    id="drill-sol-input"
                    type="url"
                    required
                    placeholder="https://github.com/username/repository"
                    value={solutionUrl}
                    onChange={(e) => setSolutionUrl(e.target.value)}
                    className="w-full p-2 text-xs bg-gray-50 rounded-lg border border-gray-200 focus:outline-[#4B5E40]"
                  />
                  <span className="text-[9px] text-gray-400 block mt-1 leading-normal">
                    Provide a valid URL to the repository solution directory. Submissions are flagged pending grade review.
                  </span>
                </div>

                <button
                  id="submit-drill-solution-btn"
                  type="submit"
                  disabled={loading || !solutionUrl}
                  className="w-full py-2 bg-[#4B5E40] hover:bg-[#3d4d34] disabled:opacity-40 text-white font-bold text-xs rounded-lg transition cursor-pointer"
                >
                  Post Solution File
                </button>
              </form>
            ) : (
              <div className="bg-[#4B5E40]/5 rounded-2xl p-5 border border-dashed border-[#4B5E40]/20 text-center space-y-2">
                <Award className="w-8 h-8 text-[#4B5E40] mx-auto opacity-70" />
                <h4 className="text-xs font-bold text-gray-800">Submit Drill solution</h4>
                <p className="text-[11px] text-gray-600 leading-normal max-w-sm mx-auto">
                  Select <b>"Enter Solution URL"</b> on any listed technical challenge above to document completed solution repositories.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 6. SOCIAL EVENTS & PUBLIC ARTIFACTS LOGS */}
      {activeSubTab === "social" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="social-tabs-container">
          
          <form onSubmit={handleSocialSubmit} className="lg:col-span-4 bg-white rounded-2xl border border-gray-150 p-5 space-y-4 shadow-xs" id="social-log-subform">
            <h3 className="font-bold text-sm text-gray-900 leading-normal">Track Public Artifacts</h3>
            
            <div className="space-y-3.5">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                  Artifact Category
                </label>
                <select
                  id="social-cat-select"
                  value={socialCategory}
                  onChange={(e) => setSocialCategory(e.target.value as any)}
                  className="w-full p-2.5 text-xs bg-gray-50 rounded-lg border border-gray-200"
                >
                  <option value="blog">Medium/Dev.to Technical Blog Post</option>
                  <option value="hackathon">Github community Hackathon</option>
                  <option value="public-artifact">Youtube Code walkthrough / visual demo</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                  Activity title / Name
                </label>
                <input
                  id="social-title-input"
                  type="text"
                  required
                  placeholder="e.g. Mastered Tailwind styling at Bincom"
                  value={socialTitle}
                  onChange={(e) => setSocialTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-gray-50 rounded-lg border border-gray-200"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                  Public Destination link (URL) *
                </label>
                <input
                  id="social-link-input"
                  type="url"
                  required
                  placeholder="https://dev.to/username/article"
                  value={socialLink}
                  onChange={(e) => setSocialLink(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-gray-50 rounded-lg border border-gray-200"
                />
              </div>
            </div>

            <button
              id="social-submit-btn"
              type="submit"
              disabled={loading || !socialTitle || !socialLink}
              className="w-full py-2 bg-[#4B5E40] hover:bg-[#3d4d34] disabled:opacity-40 text-white font-bold text-xs rounded-lg transition active:scale-95 cursor-pointer"
            >
              Sync Artifact Activity ✨
            </button>
          </form>

          {/* Social Ledger */}
          <div className="lg:col-span-8 bg-white rounded-2xl border border-gray-150 p-5 space-y-4">
            <h3 className="font-bold text-sm text-gray-900 leading-normal">Your Track Sync Artifact Ledger</h3>
            
            {studentSocials.length === 0 ? (
              <p className="text-xs text-gray-400 italic text-center py-8">Logged blogs, community hackathons, and demo links will register here.</p>
            ) : (
              <div className="space-y-3.5 max-h-96 overflow-y-auto pr-1">
                {studentSocials.map((sl) => (
                  <div key={sl.id} className="p-3 bg-[#F8FAF8] rounded-xl border border-gray-100 flex items-center justify-between gap-3 text-xs shadow-3xs" id={`social-card-${sl.id}`}>
                    <div className="space-y-1">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-indigo-650 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 font-mono">
                        {sl.type}
                      </span>
                      <h4 className="font-bold text-gray-900 text-xs leading-snug">{sl.title}</h4>
                      <div className="text-[10px] text-gray-400 block truncate font-mono">Link: {sl.link}</div>
                    </div>

                    <a 
                      id={`ex-soc-link-${sl.id}`}
                      href={sl.link} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="p-1.5 rounded-lg bg-white border border-gray-200 hover:border-[#4B5E40] transition shrink-0 inline-flex items-center"
                    >
                      <ExternalLink className="w-4 h-4 text-[#4B5E40]" />
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
