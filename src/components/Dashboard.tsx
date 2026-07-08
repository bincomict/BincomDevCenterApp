import React, { useState, useEffect } from "react";
import { Profile, AttendanceRecord, Meeting } from "../types";
import { completeTask } from "../firebaseService";
import { 
  Compass, 
  Sparkles, 
  Milestone, 
  ArrowRight, 
  User, 
  Mail, 
  Award, 
  CheckSquare, 
  Trophy, 
  Layers, 
  Calendar, 
  Clock, 
  ChevronRight, 
  Play, 
  CheckCircle,
  Users,
  Video,
  Shield,
  Laptop,
  Code,
  Database,
  TrendingUp,
  Briefcase,
  ExternalLink,
  Target,
  BookOpen
} from "lucide-react";
import { 
  getCleanTrackName, 
  getStandupDetails,
  shouldShowMeetingOnDashboard,
  parseDurationToMinutes,
  parseMeetingTimeToMinutes,
  getLagosDateString,
  formatMeetingDates
} from "../utils/trackUtils";

interface DashboardProps {
  profile: Profile;
  state: any; // Entire synced state
  onJoinMeeting: (meetingId: string) => void;
  setActiveTab: (tab: "dashboard" | "hub" | "microservices" | "projects" | "leaderboard" | "pathway" | "admin") => void;
  setActiveSubTab: (subTab: "kd" | "standups" | "pd" | "tech" | "drills" | "social") => void;
  onStateUpdate?: () => void;
}

const getMicroserviceIcon = (iconName: string) => {
  switch (iconName) {
    case "BookOpen": return <BookOpen className="w-5 h-5 text-[#4B5E40] mb-2" />;
    case "Award": return <Award className="w-5 h-5 text-emerald-600 mb-2" />;
    case "Sparkles": return <Sparkles className="w-5 h-5 text-indigo-600 mb-2" />;
    case "Laptop": return <Laptop className="w-5 h-5 text-rose-500 mb-2" />;
    case "Compass": return <Compass className="w-5 h-5 text-sky-500 mb-2" />;
    case "Users": return <Users className="w-5 h-5 text-purple-600 mb-2" />;
    case "Target": return <Target className="w-5 h-5 text-teal-600 mb-2" />;
    case "Calendar": return <Calendar className="w-5 h-5 text-orange-500 mb-2" />;
    default: return <Layers className="w-5 h-5 text-gray-500 mb-2" />;
  }
};

const getMicroserviceHoverClass = (iconName: string) => {
  switch (iconName) {
    case "BookOpen": return "hover:text-[#4B5E40]";
    case "Award": return "hover:text-emerald-700";
    case "Sparkles": return "hover:text-indigo-700";
    case "Laptop": return "hover:text-rose-700";
    case "Compass": return "hover:text-sky-700";
    case "Users": return "hover:text-purple-700";
    case "Target": return "hover:text-teal-700";
    case "Calendar": return "hover:text-orange-700";
    default: return "hover:text-[#4B5E40]";
  }
};

export default function Dashboard({ 
  profile, 
  state,
  onJoinMeeting,
  setActiveTab, 
  setActiveSubTab,
  onStateUpdate
}: DashboardProps) {
  
  const { profiles = [], attendance = [], meetings = [], meetingAssignments = [] } = state || {};

  const [showKPIModal, setShowKPIModal] = useState(false);
  const [selectedKPIMonth, setSelectedKPIMonth] = useState<1 | 2 | 3>(1);
  const [tasksTab, setTasksTab] = useState<"ongoing" | "assigned">("ongoing");
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  const getLagosDayOfWeek = (date: Date): string => {
    try {
      return new Intl.DateTimeFormat("en-US", {
        timeZone: "Africa/Lagos",
        weekday: "long"
      }).format(date);
    } catch (e) {
      const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      return days[date.getDay()];
    }
  };

  const getLagosMinutesPastMidnight = (date: Date): number => {
    try {
      const formatted = new Intl.DateTimeFormat("en-US", {
        timeZone: "Africa/Lagos",
        hour: "numeric",
        minute: "numeric",
        hour12: false
      }).format(date);
      
      const parts = formatted.split(":");
      const hours = parseInt(parts[0], 10);
      const minutes = parseInt(parts[1], 10);
      return hours * 60 + minutes;
    } catch (e) {
      const utcHours = date.getUTCHours();
      const lagosHours = (utcHours + 1) % 24;
      return lagosHours * 60 + date.getUTCMinutes();
    }
  };

  const lagosToday = getLagosDayOfWeek(currentTime);
  const lagosCurrentMinutes = getLagosMinutesPastMidnight(currentTime);

  const [leaderboardFilter, setLeaderboardFilter] = useState<"All" | "Volunteers" | "Trainees" | "Global Techies">("All");

  // Real-time precise WAT Clock loop
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Format real West Africa Time (WAT) dynamically
  const getWATTimeStr = (date: Date) => {
    try {
      return new Intl.DateTimeFormat("en-US", {
        timeZone: "Africa/Lagos",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true
      }).format(date) + " WAT";
    } catch (e) {
      return date.toLocaleTimeString() + " WAT";
    }
  };

  const standupDetails = getStandupDetails(profile.track);

  const getAttendanceForMeeting = (meetingId: string) => {
    return attendance.find((a: any) => a.userId === profile.id && a.meetingId === meetingId);
  };

  const handleJoinMeetingAction = (meetingId: string, linkUrl: string) => {
    window.open(linkUrl, "_blank", "noopener,noreferrer");
    onJoinMeeting(meetingId);
  };

  // Extract mentors who signed up on the SAME knowledge track
  const cleanTrack = getCleanTrackName(profile.track);
  const registeredMentors = profiles.filter((p: any) => {
    const isMentorOrAdmin = p.role === "admin" || p.learningLevel?.toLowerCase() === "mentor" || p.learningLevel?.toLowerCase() === "administrative mentor" || p.learningLevel?.toLowerCase() === "admin";
    const trackMatches = getCleanTrackName(p.track) === cleanTrack || p.track?.toLowerCase() === "all";
    return isMentorOrAdmin && trackMatches && p.username !== "bincom_admin";
  });
  const activeMentorName = registeredMentors.length > 0 ? registeredMentors.map(m => m.fullName).join(", ") : "Not Assigned";

  // Calculate dynamic levels and statistics for Leaderboard database
  const studentProfiles = profiles.filter((p: any) => p.role === "user");
  const processedLeaderboard = studentProfiles.map((p: any) => {
    const userAtt = attendance.filter((a: any) => a.userId === p.id);
    const onTimeCount = userAtt.filter((a: any) => a.status === "Attended").length;
    const totalCount = userAtt.length;
    
    let completionRate = 0;
    if (totalCount === 0) {
      completionRate = p.score !== undefined ? p.score : 60;
    } else {
      const attendancePercent = (onTimeCount / totalCount) * 100;
      completionRate = Math.round(((p.score || 60) + attendancePercent) / 2);
    }
    
    completionRate = Math.min(100, Math.max(0, completionRate));

    return {
      profile: p,
      score: completionRate,
      attended: onTimeCount,
      total: totalCount || 12 // Assume 12 total target points to keep metric realistic
    };
  }).sort((a, b) => b.score - a.score);

  // Dynamic filter lists for Level-based Rankings
  const filteredLeaderboard = processedLeaderboard.filter((item) => {
    const lvl = (item.profile.learningLevel || item.profile.techExperience || "").toLowerCase();
    if (leaderboardFilter === "Volunteers") {
      return lvl.includes("volunteer");
    }
    if (leaderboardFilter === "Trainees") {
      return lvl.includes("trainee") || lvl.includes("apprentice");
    }
    if (leaderboardFilter === "Global Techies") {
      return lvl.includes("global") || lvl.includes("associate") || lvl.includes("expert") || lvl.includes("mentor") || lvl.includes("intern");
    }
    return true; // "All"
  });

  // Microservice navigations trigger helper
  const handleMicroserviceClick = (
    tab: "dashboard" | "hub" | "microservices" | "projects" | "leaderboard" | "pathway",
    subTab?: "kd" | "standups" | "pd" | "tech" | "drills" | "social"
  ) => {
    setActiveTab(tab as any);
    if (subTab) {
      setActiveSubTab(subTab);
    }
  };

  // Dynamic tasks generation centered on automatically assigned ones & admin-uploaded drills
  const isMorningChecked = getAttendanceForMeeting("meet_1");
  const isEveningChecked = getAttendanceForMeeting("meet_4");
  const isKdChecked = getAttendanceForMeeting("meet_2");

  const ongoingTasksFromDb = state.tasks && state.tasks.length > 0 ? state.tasks : [
    {
      id: "tsk_kd",
      title: "KD (Knowledge Development) Session Participation",
      description: "Attend at least 2 sessions per week, answer LMS questions, and facilitate once a month.",
      due: "Every Tuesday & Thursday 09:00 AM WAT",
      priority: "High"
    },
    {
      id: "tsk_morning",
      title: "Morning Stand-up Live Session",
      description: "Connect to Jitsi team stand-up in the morning for task planning & alignment.",
      due: `Daily ${standupDetails.morningTime}`,
      priority: "High"
    },
    {
      id: "tsk_evening",
      title: "Evening Stand-up Live Session",
      description: "Connect to Jitsi team stand-up in the evening for progress review.",
      due: `Daily ${standupDetails.eveningTime}`,
      priority: "High"
    },
    {
      id: "tsk_report",
      title: "Daily Report Submission",
      description: "Log your daily accomplishments, personal development hours, and roadblocks on your Slack/Module channel.",
      due: "Daily by 05:00 PM (WAT)",
      priority: "High"
    }
  ];

  const hasSubmittedReportToday = (state.dailyReports || []).some(
    (r: any) => r.userId === profile.id && r.date === getLagosDateString(currentTime)
  );

  const ongoingTasks = ongoingTasksFromDb.map((task: any) => {
    let progress = "Ongoing";
    if (task.id === "tsk_kd") {
      progress = isKdChecked ? "Checked-In" : "Ongoing";
    } else if (task.id === "tsk_morning") {
      progress = isMorningChecked ? "Checked-In" : "Pending";
    } else if (task.id === "tsk_evening") {
      progress = isEveningChecked ? "Checked-In" : "Pending";
    } else if (task.id === "tsk_report") {
      progress = hasSubmittedReportToday ? "Checked-In" : "Ongoing";
    }
    return {
      ...task,
      progress
    };
  });

  // Complete assigned custom task
  const handleCompleteCustomTask = async (taskId: string) => {
    try {
      await completeTask(profile.id, taskId);
      if (onStateUpdate) {
        onStateUpdate();
      }
    } catch (e) {
      console.error("Failed to complete custom task", e);
    }
  };

  // Admin Uploaded Tasks (Weekly Drills)
  const adminUploadedDrills = state.weeklyDrills || [];
  const drillTasksMapped = adminUploadedDrills.map((drill: any) => {
    const submission = (state.drillSubmissions || []).find(
      (sub: any) => sub.drillId === drill.id && sub.userId === profile.id
    );
    return {
      id: drill.id,
      title: drill.title,
      description: drill.description,
      priority: "High",
      type: "drill",
      due: "Every Sunday 11:59 PM WAT",
      submission: submission
    };
  });

  const customTasksMapped = (profile.assignedTasks || []).map((task: any) => {
    return {
      id: task.id,
      title: task.title,
      description: task.description,
      priority: task.priority,
      type: "custom",
      due: task.dueDate,
      status: task.status
    };
  });

  const assignedTasks = [...customTasksMapped, ...drillTasksMapped];

  // Custom Career Pathway Blueprint Generator based strictly upon target pathways/tracks
  const getPathwayBlueprint = (track: string) => {
    const isFrontendOrDesign = track.includes("Frontend") || track.includes("Design") || track.includes("Mobile") || track.includes("Marketing");
    const isDataOrAI = track.includes("Data") || track.includes("Python");
    
    if (isFrontendOrDesign) {
      return {
        foundation: ["Frontend Developer", "Web Developer", "Mobile App Developer (e.g., React Native, Flutter, etc.)", "UI Developer", "JavaScript Program"],
        technical: ["Senior Front-end Developer", "Senior Back-end Developer / L2 (Laravel/Node)", "Principal Frontend Engineer", "Cloud Architecture Program"],
        other: [
          "UI/UX Designer", "Design Technologist", "Creative Technologist", "Head of Digital Experience",
          "Accessibility Specialist", "QA & Performance Program", "Technical Writer (Functional Roles)",
          "Developer Advocate / Evangelist", "Solution Architect", "Freelance Client Mobile/Web",
          "Independent Contract Architect", "E-commerce Specialist", "Data Analyst", "Growth Hacker"
        ]
      };
    } else if (isDataOrAI) {
      return {
        foundation: ["Data Science Trainee", "Python Scripting Apprentice", "Data Analyst Intern", "SQL Relational Assistant", "Math & Statistics Core"],
        technical: ["Senior Data Scientist", "Machine Learning Specialist", "AI Systems Engineer", "MloPs Platform Manager"],
        other: [
          "Data Solution Architect", "Business Intelligence Lead", "Quantitative Developer", "Big Data Coordinator",
          "Technical Analytics Writer", "AI Ethics Consultant", "Independent Kaggle Consultant", "Cloud Data Architect"
        ]
      };
    } else {
      // Backend/DevOps/Cybersecurity/PMO general blueprint
      return {
        foundation: ["Backend Foundations Junior", "API Development Trainee", "Infrastructure Apprentice", "Database Administration Cadet", "Command Line Shell Associate"],
        technical: ["Senior Backend Architect (PHP/Django/Node)", "DevOps & Cloud Engineer / L2", "Principal Systems Controller", "Information Security Officer"],
        other: [
          "DevSecOps Technologist", "SRE Platform Specialist", "Database Solutions Architect", "Scrum Master / PM Leader",
          "Project Delivery Consultant", "Product Success Specialist", "Solutions Architect", "Developer Advocate",
          "E-commerce Integrator", "Independent Solutions Consultant", "Vulnerability Auditor", "Technical PM"
        ]
      };
    }
  };

  const pathwayBlueprint = getPathwayBlueprint(profile.track || "");
  const dynamicPathway = state.careerPathways ? {
    foundation: (state.careerPathways.foundation || []).map((f: any) => f.title),
    technical: (state.careerPathways.trackSplit || []).map((t: any) => t.title),
    other: (state.careerPathways.lateralRoles || []).map((l: any) => l.title)
  } : pathwayBlueprint;
  
  // Helpers to check user level and team track eligibility for dynamic database meetings
  const getLevelsText = (trackId: any, userLevels?: any): string => {
    const levels = userLevels !== undefined ? userLevels : trackId;
    if (!levels || (Array.isArray(levels) && levels.length === 0) || levels === "All" || levels === "") {
      return "All User Levels";
    }
    if (Array.isArray(levels)) {
      const filtered = levels.filter(l => l && l !== "All User Eligible" && l !== "All User Level" && l !== "All Tracks Eligibility");
      if (filtered.length === 0) {
        return "All User Levels";
      }
      return filtered.join(", ");
    }
    if (levels === "All User Eligible" || levels === "All User Level" || levels === "All Tracks Eligibility") {
      return "All User Levels";
    }
    return String(levels);
  };

  const isUserLevelEligible = (userLevel: string, meetingLevels: any) => {
    if (profile.role === "admin") {
      return true;
    }
    const checkLevel = userLevel || "Apprentice level 1";
    const rawLevels = meetingLevels !== undefined ? meetingLevels : "All";
    if (!rawLevels || (Array.isArray(rawLevels) && rawLevels.length === 0) || rawLevels === "All" || rawLevels === "") {
      return true;
    }
    if (Array.isArray(rawLevels)) {
      const filtered = rawLevels.filter(l => l && l !== "All User Eligible" && l !== "All User Level" && l !== "All Tracks Eligibility");
      if (filtered.length === 0) {
        return true;
      }
      return filtered.some((l: string) => {
        const mLevel = l.trim().toLowerCase();
        const uLevel = checkLevel.trim().toLowerCase();
        return mLevel === uLevel || mLevel.includes(uLevel) || uLevel.includes(mLevel);
      });
    }
    if (rawLevels === "All User Eligible" || rawLevels === "All User Level" || rawLevels === "All Tracks Eligibility") {
      return true;
    }
    const mLevel = String(rawLevels).trim().toLowerCase();
    const uLevel = checkLevel.trim().toLowerCase();
    return mLevel === uLevel || mLevel.includes(uLevel) || uLevel.includes(mLevel);
  };

  const isTeamTrackEligible = (userTrack: string, targetTeamTrackEligibility: any) => {
    if (profile.role === "admin") {
      return true;
    }
    const checkTrack = userTrack || "";
    if (checkTrack.trim().toLowerCase() === "all") {
      return true;
    }
    if (!targetTeamTrackEligibility || (Array.isArray(targetTeamTrackEligibility) && targetTeamTrackEligibility.length === 0)) {
      return true;
    }
    if (Array.isArray(targetTeamTrackEligibility)) {
      return targetTeamTrackEligibility.some((t: string) => {
        const mTrack = t.trim().toLowerCase();
        const uTrack = checkTrack.trim().toLowerCase();
        return mTrack === uTrack || uTrack === "all";
      });
    }
    const mTrack = String(targetTeamTrackEligibility).trim().toLowerCase();
    const uTrack = checkTrack.trim().toLowerCase();
    return mTrack === uTrack || uTrack === "all";
  };

  const userLevelValue = profile.learningLevel || profile.techExperience || "Apprentice level 1";
  const userTrackValue = profile.track || "";

  // Helper to determine if meeting is newly created (within 48 hours)
  const isNewMeeting = (createdAt?: string) => {
    if (!createdAt) return false;
    const createdDate = new Date(createdAt);
    const diffTime = Math.abs(new Date().getTime() - createdDate.getTime());
    const diffHours = diffTime / (1000 * 60 * 60);
    return diffHours <= 48; // highlight up to 48 hours
  };

  // Helper to retrieve detailed meeting status based on attendance log records
  const getMeetingStatus = (meetingId: string) => {
    const record = attendance.find((a: any) => a.userId === profile.id && a.meetingId === meetingId);
    if (!record) {
      return { label: "Scheduled", color: "bg-blue-50 text-blue-700 border-blue-150" };
    }
    if (record.status === "Late") {
      return { label: "⚠️ Late", color: "bg-amber-50 text-amber-800 border-amber-200" };
    }
    if (record.status === "Missed") {
      return { label: "❌ Missed", color: "bg-rose-50 text-rose-800 border-rose-150" };
    }
    return { label: "✓ Attended", color: "bg-emerald-50 text-emerald-800 border-emerald-150" };
  };

  // Filter dynamic database-driven meetings from meetings prop matching user alignment
  const eligibleMeetings = (meetings || []).filter((m: any) => {
    // Enforce that ONLY admin-scheduled meetings can ever appear on any dashboard, with end-time disappearance automatically applied
    if (!shouldShowMeetingOnDashboard(m, lagosToday, lagosCurrentMinutes)) {
      return false;
    }

    // A meeting is assigned if there is an explicit backend assignment linking this userId and meetingId
    const isAssigned = (meetingAssignments || []).some(
      (ma: any) => ma.meetingId === m.id && ma.userId === profile.id
    );

    // Or check if the meeting is global (both tracks and levels eligibility criteria are empty)
    const targetTracks = m.targetTeamTrackEligibility;
    const isGlobalTrack = !targetTracks || (Array.isArray(targetTracks) && targetTracks.length === 0);
    const rawLevels = m.userLevels !== undefined ? m.userLevels : m.trackId;
    const isGlobalLevel = !rawLevels || (Array.isArray(rawLevels) && rawLevels.length === 0) || rawLevels === "All" || rawLevels === "";
    const isGlobal = isGlobalTrack && isGlobalLevel;

    // Direct match calculations for level & track
    const levelMatch = isUserLevelEligible(userLevelValue, rawLevels);
    const trackMatch = isTeamTrackEligible(userTrackValue, targetTracks);

    // If tracks are specified and levels are specified, both must match
    let isLiveEligible = false;
    if (isGlobal) {
      isLiveEligible = true;
    } else if (!isGlobalTrack && !isGlobalLevel) {
      isLiveEligible = trackMatch && levelMatch;
    } else if (!isGlobalTrack) {
      isLiveEligible = trackMatch;
    } else {
      isLiveEligible = levelMatch;
    }

    return isAssigned || isLiveEligible;
  });

  // Base list of un-scheduled static meetings has been cleared so they never display on any dashboard
  const baseKnowledgeMeetings: any[] = [];

  const getMeetingCategoryType = (meeting: any): "knowledge" | "microservice" | "project" => {
    const rawType = String(meeting.type || "").trim().toLowerCase();
    
    // Exact or explicit contains match for Project
    if (
      rawType === "project" || 
      rawType === "pd" || 
      rawType.includes("project") || 
      rawType.includes("sprint") || 
      rawType.includes("personal development (pd)")
    ) {
      return "project";
    }
    
    // Exact or explicit contains match for Microservices
    if (
      rawType === "microservices" || 
      rawType === "microservice" || 
      rawType.includes("microservice") || 
      rawType.includes("standup") || 
      rawType.includes("tech")
    ) {
      return "microservice";
    }
    
    // Exact or explicit contains match for Knowledge Track
    if (
      rawType === "knowledge track" || 
      rawType === "knowledge" || 
      rawType.includes("knowledge") || 
      rawType.includes("kd")
    ) {
      return "knowledge";
    }

    // Generic fallback keyword matching
    if (rawType.includes("personal development") || rawType.includes("pd")) {
      return "project";
    }
    
    return "knowledge"; // Default fallback
  };

  const dynamicKnowledgeMeetings = eligibleMeetings
    .filter((m: any) => getMeetingCategoryType(m) === "knowledge")
    .map((m: any) => ({
      id: m.id,
      title: m.title,
      time: m.timeString.includes("WAT") ? m.timeString : `${m.timeString} WAT`,
      description: `Session for Level: ${getLevelsText(m.trackId, m.userLevels)} • ${m.targetTeamTrackEligibility && m.targetTeamTrackEligibility.length > 0 ? m.targetTeamTrackEligibility.join(", ") : "All Tracks"}`,
      link: m.jitsiUrl,
      trackName: getCleanTrackName(Array.isArray(m.trackId) ? m.trackId[0] : m.trackId) || profile.track || "Dev Center",
    }));

  const knowledgeTrackMeetings = [...baseKnowledgeMeetings, ...dynamicKnowledgeMeetings];

  const baseMicroserviceMeetings: any[] = [];

  const dynamicMicroserviceMeetings = eligibleMeetings
    .filter((m: any) => getMeetingCategoryType(m) === "microservice")
    .map((m: any) => ({
      id: m.id,
      title: m.title,
      time: m.timeString.includes("WAT") ? m.timeString : `${m.timeString} WAT`,
      description: `Session for Level: ${getLevelsText(m.trackId, m.userLevels)} • ${m.targetTeamTrackEligibility && m.targetTeamTrackEligibility.length > 0 ? m.targetTeamTrackEligibility.join(", ") : "All Tracks"}.`,
      link: m.jitsiUrl,
    }));

  const microserviceMeetings = [...baseMicroserviceMeetings, ...dynamicMicroserviceMeetings];

  // Timezone-aware variables are initialized at the top of the component body

  const unfilteredUserAllMeetings = [
    // Static Knowledge Meetings
    ...baseKnowledgeMeetings.map(m => ({
      ...m,
      type: "knowledge",
      timeString: m.time,
      scheduleDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      trackId: "All",
      userLevels: [],
      targetTeamTrackEligibility: []
    })),
    // Static Microservices Meetings
    ...baseMicroserviceMeetings.map(m => ({
      ...m,
      type: "microservice",
      timeString: m.time,
      scheduleDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      trackId: "All",
      userLevels: [],
      targetTeamTrackEligibility: []
    })),
    // Dynamic eligible sync platform meetings
    ...(eligibleMeetings || []).map(m => ({
      ...m,
      type: getMeetingCategoryType(m),
      link: m.jitsiUrl,
      time: m.timeString.includes("WAT") ? m.timeString : `${m.timeString} WAT`,
    }))
  ];

  const userAllMeetings = unfilteredUserAllMeetings.filter(m => {
    // 1. Is scheduled for today?
    if (m.meetingDates && Array.isArray(m.meetingDates) && m.meetingDates.length > 0) {
      const todayStr = getLagosDateString(new Date());
      const isToday = m.meetingDates.includes(todayStr);
      if (!isToday) return false;
    } else {
      const days = m.scheduleDays && m.scheduleDays.length > 0 
        ? m.scheduleDays 
        : ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
      const isToday = days.some((day: string) => day.trim().toLowerCase() === lagosToday.toLowerCase());
      if (!isToday) return false;
    }

    // 2. Clear out if passed
    const startTimeStr = m.timeString || m.time || "";
    const startMins = parseMeetingTimeToMinutes(startTimeStr, lagosToday);
    const durationMins = parseDurationToMinutes(m.duration);
    const endMins = startMins + durationMins;

    if (lagosCurrentMinutes >= endMins + 1) {
      return false;
    }

    return true;
  });

  const renderMeetingCard = (p: any) => {
    const checkedIn = getAttendanceForMeeting(p.id);
    const status = getMeetingStatus(p.id);
    const isNew = isNewMeeting(p.createdAt);

    return (
      <div 
        key={p.id}
        className="bg-gray-50 rounded-xl border border-gray-205 p-5 transition flex flex-col justify-between hover:border-[#4B5E40]/30 hover:shadow-2xs space-y-4"
      >
        <div className="space-y-3">
          {/* Header line: Time and Type */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-2.5">
            <div className="flex items-center gap-1.5">
              <span className="px-2 py-0.7 bg-white border border-gray-200 text-[10px] font-mono font-bold text-[#4B5E40] rounded-md shadow-3xs uppercase shrink-0">
                {p.time || p.timeString}
              </span>
              {isNew && (
                <span className="bg-emerald-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-sm uppercase tracking-wide shrink-0 animate-pulse">
                  🆕 New
                </span>
              )}
            </div>
            
            <span className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded-md tracking-wider ${
              p.type === "knowledge" ? "bg-emerald-50 text-emerald-800 border border-emerald-100" :
              p.type === "microservice" ? "bg-blue-50 text-blue-800 border border-blue-100" :
              "bg-purple-50 text-purple-800 border border-purple-100"
            }`}>
              {p.type === "knowledge" ? "Knowledge Standup" :
               p.type === "microservice" ? "Microservice sync" :
               p.type === "project" ? "Project sync" :
               p.type || "Live Meeting"}
            </span>
          </div>

          {/* Title */}
          <div>
            <h5 className="font-extrabold text-xs text-gray-950 leading-snug">{p.title}</h5>
            <p className="text-[11px] text-gray-500 mt-1 leading-normal">{p.description || "Synchronized developers discussion and track accountability session."}</p>
          </div>

          {/* Details Section */}
          <div className="bg-white/80 rounded-lg p-3 border border-gray-150 text-[11px] space-y-1.5 shadow-3xs">
            {/* Organizer and Duration */}
            <div className="grid grid-cols-2 gap-2 border-b border-gray-100 pb-1.5 mb-1.5">
              <div>
                <span className="text-gray-400 font-medium block text-[9.5px] uppercase tracking-wider">Organizer</span>
                <span className="text-gray-800 font-black text-xs block mt-0.5">{p.organizer || "Admin Team"}</span>
              </div>
              <div>
                <span className="text-gray-400 font-medium block text-[9.5px] uppercase tracking-wider">Duration</span>
                <span className="text-[#4B5E40] font-black text-xs block mt-0.5">{p.duration || "60 minutes"}</span>
              </div>
            </div>

            {/* Meeting Date(s) */}
            <div className="flex items-start justify-between gap-2">
              <span className="text-gray-400 font-medium shrink-0">Meeting Date(s):</span>
              <span className="text-gray-700 font-semibold text-right text-[10.5px]">
                {formatMeetingDates(p)}
              </span>
            </div>

            {/* Team Track Eligibility */}
            <div className="flex items-start justify-between gap-2">
              <span className="text-gray-400 font-medium shrink-0">Team Track:</span>
              <span className="text-[#4B5E40] font-bold text-right truncate max-w-[180px]" title={Array.isArray(p.targetTeamTrackEligibility) && p.targetTeamTrackEligibility.length > 0 ? p.targetTeamTrackEligibility.join(", ") : "All Tracks"}>
                {Array.isArray(p.targetTeamTrackEligibility) && p.targetTeamTrackEligibility.length > 0 
                  ? p.targetTeamTrackEligibility.join(", ") 
                  : "All Tracks Eligibility"}
              </span>
            </div>

            {/* User Level Eligibility */}
            <div className="flex items-start justify-between gap-2">
              <span className="text-gray-400 font-medium shrink-0 font-sans">Level Eligibility:</span>
              <span className="text-gray-700 font-bold text-right text-[10.5px]">
                {getLevelsText(p.trackId, p.userLevels)}
              </span>
            </div>

            {/* Meeting Link label */}
            <div className="flex items-start justify-between gap-2 border-t border-gray-100 pt-1.5 mt-1.5">
              <span className="text-gray-400 font-medium shrink-0 font-mono text-[10px]">Platform URL:</span>
              <span className="text-gray-500 font-mono text-[10px] truncate max-w-[180px] hover:underline animate-fade-in" title={p.link}>
                {p.link ? new URL(p.link).hostname : "No active link"}
              </span>
            </div>
          </div>
        </div>

        {/* Actions / Status footer */}
        <div className="border-t border-gray-200/55 pt-3 flex items-center justify-between gap-3">
          <div className="flex flex-col">
            <span className="text-[9px] text-gray-400 uppercase font-bold tracking-wider">Status</span>
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${status.color}`}>
              {status.label}
            </span>
          </div>

          <button
            onClick={() => handleJoinMeetingAction(p.id, p.link)}
            className={`px-3.5 py-1.5 text-[10.5px] font-extrabold rounded-lg shadow-3xs transition active:scale-97 cursor-pointer flex items-center gap-1.5 ${
              checkedIn 
              ? "bg-gray-100 hover:bg-gray-200 text-gray-750" 
              : "bg-[#4B5E40] hover:bg-[#3d4d34] text-white"
            }`}
          >
            <Play className="w-2.5 h-2.5 fill-current shrink-0" />
            {checkedIn ? "Rejoin Session" : "Join Meeting"}
          </button>
        </div>
      </div>
    );
  };

  const knowledgeMeetings = userAllMeetings.filter(m => m.type === "knowledge");
  const microserviceMeetingsList = userAllMeetings.filter(m => m.type === "microservice");
  const projectMeetingsList = userAllMeetings.filter(m => m.type === "project");

  return (
    <div className="space-y-6 animate-fade-in" id="trainee-dashboard-view">
      
      {/* 1. TOP WELCOME TITLE & EMAIL */}
      <div id="welcome-dashboard-header" className="flex flex-col md:flex-row items-start md:items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-950 tracking-tight">Welcome to Your Dashboard</h2>
          <p className="text-xs text-gray-500 font-mono mt-0.5 select-all">{profile.email}</p>
        </div>
        
        {/* Live West Africa Time (WAT) Clock */}
        <div className="bg-[#4B5E40] text-white px-4 py-1.5 rounded-xl text-center shadow-2xs font-mono shrink-0 select-none border border-[#4B5E40]/20 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="text-[11px] font-extrabold tracking-wider">{getWATTimeStr(currentTime)}</span>
        </div>
      </div>

      {/* 2. DYNAMIC TRACK AND LEVEL HEADER BANNER */}
      <div className="bg-white rounded-2xl border border-gray-150 p-5 shadow-2xs" id="assigned-track-banner">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-[#4B5E40] text-xs font-black uppercase tracking-wider">
              <span className="w-5 h-5 rounded-full bg-[#primary]/10 text-[#4B5E40] border border-emerald-200 flex items-center justify-center font-bold text-[10px]">
                ✓
              </span>
              <span>Your Assigned Track</span>
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3.5 py-1.5 bg-[#4B5E40]/10 border border-[#4B5E40]/20 rounded-xl text-xs font-extrabold text-[#4B5E40]">
                {getCleanTrackName(profile.track)}
              </span>
              <span className="text-gray-300">|</span>
              <span className="text-xs font-semibold text-gray-600">
                Level: <strong className="text-gray-900 font-extrabold px-2 py-0.5 bg-gray-100 border border-gray-200 rounded-lg">{profile.learningLevel || "Apprentice level 1"}</strong>
              </span>
            </div>
          </div>

          <button
            id="quick-route-pathway-btn"
            onClick={() => setActiveTab("pathway")}
            className="px-3 py-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-600 rounded-xl text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
          >
            My Career Roadmap <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 3. MEETINGS COMPONENT INTEGRATION */}
      <div className="bg-white rounded-2xl border border-gray-150 p-6 shadow-xs space-y-6" id="meetings-integration-container">
        <div className="border-b border-gray-100 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <h3 className="font-extrabold text-sm text-gray-950 uppercase tracking-wider flex items-center gap-2" id="dashboard-my-meetings-heading">
              <Video className="w-5 h-5 text-[#4B5E40]" />
              My Meetings
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">Your synchronized access to assigned live sessions, pathway standups, and developer circles.</p>
          </div>
          <button
            onClick={() => setActiveTab("hub")}
            className="text-[11px] font-bold text-[#4B5E40] hover:underline cursor-pointer bg-[#4B5E40]/5 px-3 py-1.5 rounded-lg shrink-0"
          >
            Open Meetings Hub
          </button>
        </div>

        {userAllMeetings.length === 0 ? (
          <div className="text-center py-10 bg-gray-50 rounded-xl border border-dashed border-gray-200">
            <Video className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-xs font-semibold text-gray-500">No assigned meetings matching your track or experience level found.</p>
          </div>
        ) : (
          <div className="space-y-8" id="my-meetings-grouped-categories">
            {/* 1. Knowledge Track Meetings */}
            <div className="space-y-3" id="dashboard-knowledge-meetings-category">
              <h4 className="font-extrabold text-xs text-[#4B5E40] uppercase tracking-wider flex items-center gap-2 pb-1.5 border-b border-gray-100">
                <span className="w-2 h-2 rounded-full bg-[#4B5E40]"></span>
                Knowledge Track Meetings
              </h4>
              {knowledgeMeetings.length === 0 ? (
                <div className="p-4 text-center bg-gray-50/50 rounded-xl border border-dashed border-gray-200 text-[11px] text-gray-400 font-sans">
                  No Knowledge Track meetings scheduled for you today.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {knowledgeMeetings.map(p => renderMeetingCard(p))}
                </div>
              )}
            </div>

            {/* 2. Microservice Meetings */}
            <div className="space-y-3" id="dashboard-microservice-meetings-category">
              <h4 className="font-extrabold text-xs text-blue-700 uppercase tracking-wider flex items-center gap-2 pb-1.5 border-b border-gray-100">
                <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                Microservices Meetings
              </h4>
              {microserviceMeetingsList.length === 0 ? (
                <div className="p-4 text-center bg-gray-50/50 rounded-xl border border-dashed border-gray-200 text-[11px] text-gray-400 font-sans">
                  No Microservices meetings scheduled for you today.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {microserviceMeetingsList.map(p => renderMeetingCard(p))}
                </div>
              )}
            </div>

            {/* 3. Project Meetings */}
            <div className="space-y-3" id="dashboard-project-meetings-category">
              <h4 className="font-extrabold text-xs text-purple-700 uppercase tracking-wider flex items-center gap-2 pb-1.5 border-b border-gray-100">
                <span className="w-2 h-2 rounded-full bg-purple-600"></span>
                Project Meetings
              </h4>
              {projectMeetingsList.length === 0 ? (
                <div className="p-4 text-center bg-gray-50/50 rounded-xl border border-dashed border-gray-200 text-[11px] text-gray-400 font-sans">
                  No Project meetings scheduled for you today.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {projectMeetingsList.map(p => renderMeetingCard(p))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 4. AVAILABLE MICROSERVICES MODULE (Daily Standups excluded as it's in Meetings!) */}
      <div className="bg-white rounded-2xl border border-gray-150 p-5 shadow-2xs space-y-4" id="available-microservices-container">
        <div>
          <h3 className="font-extrabold text-sm text-gray-950 uppercase tracking-wider flex items-center gap-2">
            <Layers className="w-4.5 h-4.5 text-[#4B5E40]" /> Available Microservices
          </h3>
          <p className="text-xs text-gray-500 mt-1">Based on your tech learning level, you have full active permissions to use the following versions:</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {(state.microservices && state.microservices.length > 0 ? state.microservices : [
            { id: "ms_kd", title: "Knowledge Development", description: "Learning and development platform.", linkText: "Open KD", tab: "hub", icon: "BookOpen" },
            { id: "ms_pd", title: "Personal Development", description: "Submit your daily learning summary.", linkText: "Write Summary", tab: "microservices", subTab: "pd", icon: "Award" },
            { id: "ms_drills", title: "Weekly Drills", description: "Programming challenges to improve your skills.", linkText: "Learn Skills", tab: "microservices", subTab: "drills", icon: "Sparkles" },
            { id: "ms_tech", title: "Tech Updates", description: "Share & discuss hot technical links.", linkText: "Share Links", tab: "microservices", subTab: "tech", icon: "Laptop" },
            { id: "ms_kd_exchange", title: "Knowledge Exchange", description: "Collaborate on core technical concepts.", linkText: "Click to Enter", tab: "microservices", subTab: "social", icon: "Compass" },
            { id: "ms_social", title: "Social Engagement", description: "Engage with track peer updates.", linkText: "Click to Enter", tab: "microservices", subTab: "social", icon: "Users" },
            { id: "ms_influence", title: "Social Influence", description: "Promote tech insights on public forums.", linkText: "Click to Enter", tab: "microservices", subTab: "social", icon: "Target" },
            { id: "ms_events", title: "External Events", description: "Hackathons, webinars and open meetups.", linkText: "Click to Enter", tab: "microservices", subTab: "social", icon: "Calendar" }
          ]).map((ms: any) => (
            <div key={ms.id} className="bg-white rounded-xl border border-gray-150 p-4 hover:border-[#4B5E40]/40 transition hover:shadow-2xs flex flex-col justify-between animate-fade-in">
              <div>
                {getMicroserviceIcon(ms.icon)}
                <h4 className="font-extrabold text-xs text-gray-950">{ms.title}</h4>
                <p className="text-[11px] text-gray-400 mt-1 leading-normal">{ms.description}</p>
              </div>
              <button 
                onClick={() => handleMicroserviceClick(ms.tab, ms.subTab)}
                className={`mt-3.5 w-full py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-[10px] font-bold text-gray-600 ${getMicroserviceHoverClass(ms.icon)} transition flex items-center justify-center gap-1 cursor-pointer`}
              >
                {ms.linkText || "Click to Enter"} <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 5. MY TASKS - EXCLUSIVE FULL-WIDTH CONTAINER */}
      <div className="bg-white rounded-2xl border border-gray-150 p-5 shadow-2xs space-y-4" id="my-tasks-container">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-gray-100 pb-3 gap-3">
          <div>
            <h3 className="font-extrabold text-sm text-gray-950 uppercase tracking-wider flex items-center gap-2">
              <CheckSquare className="w-4.5 h-4.5 text-[#4B5E40]" />
              My Tasks
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">Track your ongoing responsibilities and assigned tasks dynamically curated for your level.</p>
          </div>

          <div className="flex bg-gray-100 p-0.5 rounded-xl text-[10.5px] font-extrabold select-none shrink-0" id="task-panel-tablist">
            <button 
              onClick={() => setTasksTab("ongoing")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${tasksTab === "ongoing" ? "bg-white text-gray-950 shadow-2xs" : "text-gray-500 hover:text-gray-800"}`}
            >
              Ongoing ({ongoingTasks.length})
            </button>
            <button 
              onClick={() => setTasksTab("assigned")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${tasksTab === "assigned" ? "bg-white text-gray-950 shadow-2xs" : "text-gray-500 hover:text-gray-800"}`}
            >
              Assigned ({assignedTasks.length})
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {tasksTab === "ongoing" ? (
            ongoingTasks.map((t) => (
              <div 
                key={t.id} 
                className="p-3.5 bg-[#F8FAF8] rounded-xl border border-gray-150 hover:border-emerald-250 transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.2 rounded text-[9px] font-bold uppercase ${t.priority === "High" ? "bg-rose-50 text-rose-700 border border-rose-100" : "bg-cyan-50 text-cyan-700 border border-cyan-100"}`}>
                      {t.priority}
                    </span>
                    <span className="text-[10px] text-gray-400 font-mono">ID: {t.id}</span>
                  </div>
                  <p className="font-extrabold text-gray-900 mt-1 leading-snug">{t.title}</p>
                  <p className="text-[11px] text-gray-500 mt-1">{t.description}</p>
                  <p className="text-[10.5px] text-gray-500 mt-1 leading-none font-mono">Due window: {t.due}</p>
                </div>

                <div className="flex items-center gap-2 text-right shrink-0">
                  <span className="px-2.5 py-1 bg-white border border-gray-200 text-gray-700 text-[10px] font-bold rounded-lg uppercase">
                    Status: {t.progress}
                  </span>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                </div>
              </div>
            ))
          ) : assignedTasks.length === 0 ? (
            <div className="py-8 text-center text-gray-400 text-xs font-medium">
              No tasks have been custom-assigned by the administrator yet.
            </div>
          ) : (
            assignedTasks.map((t) => (
              <div 
                key={t.id} 
                className="p-3.5 bg-[#F8FAF8] rounded-xl border border-gray-150 hover:border-emerald-250 transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    {t.type === "custom" ? (
                      <span className="px-1.5 py-0.2 bg-teal-50 text-teal-700 border border-teal-100 text-[9px] font-bold rounded uppercase">
                        Custom Team Task
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.2 bg-amber-50 text-amber-700 border border-amber-100 text-[9px] font-bold rounded uppercase">
                        Admin Assigned Drill
                      </span>
                    )}
                    <span className="text-[10px] text-gray-400 font-mono">ID: {t.id}</span>
                    {t.priority && (
                      <span className={`px-1 py-0.2 text-[8px] font-bold rounded uppercase ${
                        t.priority === "High" ? "bg-red-50 text-red-600 border border-red-100" :
                        t.priority === "Medium" ? "bg-orange-50 text-orange-600 border border-orange-100" :
                        "bg-gray-50 text-gray-600 border border-gray-150"
                      }`}>
                        {t.priority} Priority
                      </span>
                    )}
                  </div>
                  <p className="font-extrabold text-gray-900 mt-1 leading-snug">{t.title}</p>
                  <p className="text-[11px] text-gray-500 mt-1">{t.description}</p>
                  <p className="text-[10px] text-gray-400 mt-1 font-mono">Due window: {t.due}</p>
                </div>

                <div className="flex items-center gap-3">
                  {t.type === "custom" ? (
                    t.status === "Completed" ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10.5px] font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-100">
                        ✓ Completed Task
                      </span>
                    ) : (
                      <button 
                        onClick={() => handleCompleteCustomTask(t.id)}
                        className="px-3.5 py-1.5 bg-[#4B5E40] text-white text-[10.5px] font-black rounded-lg hover:bg-[#3d4d34] transition shrink-0 cursor-pointer shadow-2xs"
                      >
                        Mark as Completed ✓
                      </button>
                    )
                  ) : t.submission ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10.5px] font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-100">
                      Completed ({t.submission.status})
                    </span>
                  ) : (
                    <button 
                      onClick={() => handleMicroserviceClick("microservices", "drills")}
                      className="px-3.5 py-1.5 bg-[#4B5E40] text-white text-[10.5px] font-black rounded-lg hover:bg-[#3d4d34] transition shrink-0 cursor-pointer shadow-2xs"
                    >
                      Start Task
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 6. LEADERBOARD / TOP PERFORMERS EXCLUSIVE CONTAINER */}
      <div className="bg-white rounded-2xl border border-gray-150 p-5 shadow-2xs space-y-5" id="leaderboard-full-section">
        <div className="border-b border-gray-100 pb-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h3 className="font-extrabold text-sm text-gray-950 uppercase tracking-wider flex items-center gap-2">
              <Trophy className="w-4.5 h-4.5 text-amber-500" /> Leaderboard
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">Top performers ranked by raw task compliance points and check-ins.</p>
          </div>

          <div className="flex bg-gray-150 p-0.5 rounded-xl text-[10px] font-bold flex-wrap gap-0.5" id="leaderboard-level-tabs">
            {["All", "Volunteers", "Trainees", "Global Techies"].map((tabName) => (
              <button
                key={tabName}
                onClick={() => setLeaderboardFilter(tabName as any)}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${leaderboardFilter === tabName ? "bg-white text-gray-950 shadow-2xs font-extrabold" : "text-gray-500 hover:text-gray-800"}`}
              >
                {tabName}
              </button>
            ))}
          </div>
        </div>

        {/* Podium Displays */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          {processedLeaderboard.slice(0, 3).map((item, idx) => {
            const levelStr = item.profile.learningLevel || item.profile.techExperience || "Junior Associate";
            return (
              <div 
                key={item.profile.id}
                className="bg-gray-50 rounded-xl border border-gray-150 p-4 shadow-3xs flex flex-col justify-between text-center relative overflow-hidden"
              >
                {/* Badge Number */}
                <div className="absolute top-2.5 left-2.5 w-6 h-6 rounded-full bg-white border border-gray-200 flex items-center justify-center font-bold text-xs shadow-3xs">
                  {idx === 0 ? "🥇" : idx === 1 ? "🥈" : "🥉"}
                </div>

                <div className="pt-2 space-y-1">
                  <div className="w-10 h-10 rounded-full bg-[#4B5E40] text-white flex items-center justify-center font-black text-xs mx-auto shadow-2xs font-mono">
                    {item.profile.fullName.split(" ").map(n => n[0]).join("")}
                  </div>
                  <h4 className="font-extrabold text-xs text-gray-950 tracking-tight block mt-2">{item.profile.fullName}</h4>
                  <p className="text-[10px] text-gray-400 font-medium truncate max-w-full italic">{item.profile.track}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-200/60 flex items-center justify-between text-[11px]">
                  <span className="font-mono text-gray-500 font-semibold">{levelStr}</span>
                  <span className="font-extrabold text-[#4B5E40] bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded font-mono">
                    {item.score}% / {item.total} pts
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Detailed Leaderboard Table */}
        <div className="overflow-x-auto rounded-xl border border-gray-150 bg-white" id="rankings-table-panel">
          <table className="w-full text-left text-xs border-collapse font-sans">
            <thead>
              <tr className="bg-gray-50 font-black text-gray-700 uppercase border-b border-gray-150 text-[10px] tracking-wider">
                <th className="py-3 px-4">Rank</th>
                <th className="py-3 px-4">Name</th>
                <th className="py-3 px-4">Team</th>
                <th className="py-3 px-4">Level</th>
                <th className="py-3 px-4 text-center">Completed</th>
                <th className="py-3 px-4 text-emerald-800 text-right">Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-150">
              {filteredLeaderboard.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-400 italic">No registered users in this tier metric yet.</td>
                </tr>
              ) : (
                filteredLeaderboard.map((item, index) => {
                  const levelVal = item.profile.learningLevel || item.profile.techExperience || "Junior Associate";
                  return (
                    <tr key={item.profile.id} className="hover:bg-[#F8FAF8] transition duration-150 text-gray-800">
                      <td className="py-3 px-4 font-mono font-bold text-gray-500">#{index + 1}</td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-gray-950 block">{item.profile.fullName}</span>
                        <span className="text-[10px] text-gray-400 font-mono">@{item.profile.username}</span>
                      </td>
                      <td className="py-3 px-4 text-gray-650 max-w-[150px] truncate" title={item.profile.track}>{item.profile.track}</td>
                      <td className="py-3 px-4"><span className="px-2 py-0.5 bg-gray-100 border border-gray-200 text-gray-600 rounded-lg text-[10px] font-semibold">{levelVal}</span></td>
                      <td className="py-3 px-4 font-mono font-bold text-center text-gray-500">{item.attended} / {item.total}</td>
                      <td className="py-3 px-4 text-right font-mono font-black text-[#4B5E40]">{item.score}%</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 7. ROADMAP & KPI ACCORDION WIDGET */}
      <div className="bg-white rounded-2xl border border-gray-150 p-5 shadow-2xs space-y-4" id="roadmap-and-kpi-cta">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1">
            <h4 className="font-extrabold text-[#4B5E40] tracking-tight uppercase text-xs flex items-center gap-1.5">
              <Compass className="w-4 h-4" />
              Your Custom Learning Roadmap & KPI Tracking
            </h4>
            <p className="text-xs text-gray-600 leading-relaxed max-w-xl">
              Track your compliance checks to clear your monthly advisory thresholds. Passing reviews guarantees UK and European recommendation quotas.
            </p>
          </div>

          <button
            id="btn-trigger-kpi-modal"
            onClick={() => setShowKPIModal(true)}
            className="px-4 py-2 bg-[#4B5E40] hover:bg-[#3d4d34] text-white text-[11px] font-black rounded-xl shadow-xs transition duration-150 cursor-pointer shrink-0 inline-flex items-center gap-1.5"
          >
            <Compass className="w-3.5 h-3.5" /> View Roadmap & Track KPI
          </button>
        </div>
      </div>

      {/* 8. YOUR TECH CAREER PATHWAY BLUEPRINT CONTAINER (No word "projection") */}
      <div className="bg-white rounded-2xl border border-gray-150 p-5 shadow-2xs space-y-4" id="career-pathway-inline-section">
        <div className="border-b border-gray-100 pb-3 flex justify-between items-center">
          <div>
            <h4 className="font-extrabold text-xs text-gray-950 uppercase tracking-wider flex items-center gap-1.5">
              <Milestone className="w-4.5 h-4.5 text-[#4B5E40]" /> Your Tech Career Pathway
            </h4>
            <p className="text-xs text-gray-500 mt-1">Discover customized stages, core track requirements, and legal placement tracks based on your tech track ({profile.track}).</p>
          </div>
          <button 
            onClick={() => setActiveTab("pathway")}
            className="text-[11px] font-bold text-[#4B5E40] hover:underline flex items-center gap-0.5 cursor-pointer"
          >
            Deep dive diagram <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        {/* Blueprint Layout Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-xs font-sans">
          
          {/* Starting Career (Foundational Roles) */}
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-150 space-y-2">
            <div className="flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-lg bg-[#4B5E40]/15 text-[#4B5E40] flex items-center justify-center font-black text-[10.5px]">01</span>
              <p className="font-extrabold text-blue-950 uppercase tracking-wide text-[11px]">Starting Career (Foundational Roles)</p>
            </div>
            <div className="divide-y divide-gray-200/50 pt-1 space-y-1.5">
              {dynamicPathway.foundation.map((role, rIdx) => (
                <div key={rIdx} className="pt-1.5 text-gray-700 font-medium flex items-center gap-1.5">
                  <span className="text-[#4B5E40] font-black font-mono">▪</span>
                  <span>{role}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Technical Track Roles */}
          <div className="p-4 bg-[#F8FAF8] rounded-xl border border-emerald-100 space-y-2">
            <div className="flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-lg bg-emerald-100 text-[#4B5E40] flex items-center justify-center font-black text-[10.5px]">02</span>
              <p className="font-extrabold text-emerald-950 uppercase tracking-wide text-[11px]">Technical Track</p>
            </div>
            <div className="divide-y divide-gray-200/50 pt-1 space-y-1.5">
              {dynamicPathway.technical.map((role, rIdx) => (
                <div key={rIdx} className="pt-1.5 text-gray-700 font-bold flex items-center gap-1.5">
                  <span className="text-emerald-600 font-black font-mono">▪</span>
                  <span>{role}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Other Possible Roles */}
          <div className="p-4 bg-indigo-55/15 rounded-xl border border-indigo-100 space-y-2">
            <div className="flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-lg bg-indigo-100 text-indigo-800 flex items-center justify-center font-black text-[10.5px]">03</span>
              <p className="font-extrabold text-indigo-950 uppercase tracking-wide text-[11px]">Other Possible Roles</p>
            </div>
            <div className="max-h-[200px] overflow-y-auto pr-1 text-gray-650 space-y-1.5 pt-1">
              {dynamicPathway.other.map((role, rIdx) => (
                <div key={rIdx} className="text-[11px] font-medium flex items-center gap-1.5">
                  <span className="text-indigo-500 font-mono">▪</span>
                  <span>{role}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 9. TEAM INFORMATION CONTAINER */}
      <div className="bg-white rounded-2xl border border-gray-150 p-5 shadow-2xs space-y-4" id="team-coordination-section">
        <div>
          <h4 className="font-extrabold text-xs text-gray-950 uppercase tracking-wider flex items-center gap-1.5">
            <Users className="w-4.5 h-4.5 text-[#4B5E40]" /> Team Information
          </h4>
          <p className="text-xs text-gray-500 mt-0.5">Your assigned leadership tracks and technical accountability directors:</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-100 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#4B5E40]/15 text-[#4B5E40] flex items-center justify-center font-bold text-xs select-none">TL</div>
            <div>
              <p className="text-[9.5px] text-gray-400 font-bold uppercase tracking-wider leading-none">Team Lead</p>
              <p className="font-extrabold text-xs text-gray-900 mt-1">Not Assigned</p>
            </div>
          </div>

          {/* Dinamically calculated administrative mentor */}
          <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-100 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-800 flex items-center justify-center font-bold text-xs select-none">TM</div>
            <div>
              <p className="text-[9.5px] text-gray-400 font-bold uppercase tracking-wider leading-none">Administrative Mentors / Team Admins</p>
              <p className="font-extrabold text-xs text-indigo-950 mt-1">{activeMentorName}</p>
            </div>
          </div>
        </div>
      </div>


      {/* --- ROADMAP & KPI STATUS TRACKING MODAL --- */}
      {showKPIModal && (
        <div className="fixed inset-0 z-55 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4" id="kpi-roadmap-modal">
          <div className="bg-white rounded-2xl border border-gray-200 p-5 max-w-lg w-full shadow-xl space-y-4 relative animate-fade-in">
            <div className="flex items-center justify-between border-b border-gray-150 pb-3">
              <div>
                <h3 className="font-black text-sm text-gray-950">Roadmap & KPI Tracking - {profile.learningLevel || "Intern Level"}</h3>
                <p className="text-[11px] text-gray-400 font-medium">Select a month to view compliance checklists and track indicators</p>
              </div>
              <button 
                id="close-kpi-modal-btn"
                onClick={() => setShowKPIModal(false)}
                className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-900 border border-transparent hover:border-gray-200 transition cursor-pointer text-xs font-bold"
              >
                ✕
              </button>
            </div>

            {/* Month Pickers */}
            <div className="grid grid-cols-3 gap-2 text-center" id="kpi-month-selector">
              {[1, 2, 3].map((m) => (
                <button
                  key={m}
                  onClick={() => setSelectedKPIMonth(m as any)}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex flex-col items-center justify-center cursor-pointer ${
                    selectedKPIMonth === m 
                      ? "bg-[#4B5E40] border-[#4B5E40] text-white shadow-xs" 
                      : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <span className="text-[10px] uppercase font-bold text-white/60">Month</span>
                  <span className="text-sm font-black">0{m}</span>
                  <span className={`${selectedKPIMonth === m ? "text-emerald-100/90" : "text-gray-400"} text-[8px] tracking-wider block mt-0.5`}>
                    {m === 1 ? "100% Core" : "0% Sync"}
                  </span>
                </button>
              ))}
            </div>

            {/* Checklists for chosen Month */}
            <div className="bg-gray-50 rounded-xl p-3.5 border border-gray-150 space-y-2.5 max-h-[220px] overflow-y-auto" id="kpi-audit-items">
              {selectedKPIMonth === 1 ? (
                <>
                  <div className="flex items-start gap-2 text-[11.5px]">
                    <CheckCircle className="w-4.5 h-4.5 text-emerald-605 shrink-0 mt-0.5 text-emerald-600" />
                    <div>
                      <strong className="text-gray-900 font-bold block">1. Full Demographics Profiling Completed</strong>
                      <span className="text-gray-500 text-[10.5px]">Demo tracking profile has been populated correctly during onboarding.</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 text-[11.5px]">
                    <CheckCircle className="w-4.5 h-4.5 text-[#4B5E40] shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-gray-900 font-bold block">2. Track-Based Onboarding Assessment</strong>
                      <span className="text-gray-550 text-[10.5px]">Cleared with proper correction score feedback checks.</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 text-[11.5px]">
                    <CheckCircle className="w-4.5 h-4.5 text-[#4B5E40] shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-gray-900 font-bold block">3. Orientation Compliance Video Watch</strong>
                      <span className="text-gray-550 text-[10.5px]">Compliance watch logs certified by the automated orientation tracker.</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 text-[11.5px]">
                    <CheckCircle className="w-4.5 h-4.5 text-[#4B5E40] shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-gray-900 font-bold block">4. Active Workspace Centralization</strong>
                      <span className="text-gray-550 text-[10.5px]">Joined regular morning/evening team standups and logged summaries.</span>
                    </div>
                  </div>
                </>
              ) : selectedKPIMonth === 2 ? (
                <>
                  <div className="flex items-start gap-2 text-[11.5px] opacity-65">
                    <div className="w-4.5 h-4.5 rounded-full border border-gray-350 mt-1 shrink-0"></div>
                    <div>
                      <strong className="text-gray-900 font-bold block">1. Relational Database & ORM Mastery</strong>
                      <span className="text-gray-550 text-[10.5px]">Complete deep dives on migrations, relational constraints, and seeds.</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 text-[11.5px] opacity-65">
                    <div className="w-4.5 h-4.5 rounded-full border border-gray-350 mt-1 shrink-0"></div>
                    <div>
                      <strong className="text-gray-900 font-bold block">2. 4 Mock Drill Solutions on GitHub</strong>
                      <span className="text-gray-550 text-[10.5px]">Submit public pull-requests for automated verification pipelines.</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 text-[11.5px] opacity-65">
                    <div className="w-4.5 h-4.5 rounded-full border border-gray-350 mt-1 shrink-0"></div>
                    <div>
                      <strong className="text-gray-900 font-bold block">3. Personal Development Word Compliance</strong>
                      <span className="text-gray-550 text-[10.5px]">Clear a minimum of 20 summaries with strict 100-word validations.</span>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-start gap-2 text-[11.5px] opacity-65">
                    <div className="w-4.5 h-4.5 rounded-full border border-gray-350 mt-1 shrink-0"></div>
                    <div>
                      <strong className="text-gray-900 font-bold block">1. Multi-tier Microservice Interaction</strong>
                      <span className="text-gray-550 text-[10.5px]">Participate in joint track hackathons and knowledge sharing networks.</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 text-[11.5px] opacity-65">
                    <div className="w-4.5 h-4.5 rounded-full border border-gray-350 mt-1 shrink-0"></div>
                    <div>
                      <strong className="text-gray-900 font-bold block">2. Enterprise Software Project Deployment</strong>
                      <span className="text-gray-550 text-[10.5px]">Coordinate features with assigned PM Leads on production servers.</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 text-[11.5px] opacity-65">
                    <div className="w-4.5 h-4.5 rounded-full border border-gray-350 mt-1 shrink-0"></div>
                    <div>
                      <strong className="text-gray-900 font-bold block">3. Placement Portfolio Optimization</strong>
                      <span className="text-gray-550 text-[10.5px]">Re-format references, author technical papers, and pass final review tests.</span>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="pt-3 border-t border-gray-100 flex justify-between items-center text-[10.5px] font-mono text-gray-400">
              <span>Status: {selectedKPIMonth === 1 ? "IN PROGRESS" : "LOCKED"}</span>
              <button 
                id="btn-close-kpi-footer"
                onClick={() => setShowKPIModal(false)}
                className="px-3.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-lg transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
