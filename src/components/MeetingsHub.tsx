import React, { useState, useEffect, useRef } from "react";
import { Meeting, AttendanceRecord, Profile } from "../types";
import { Video, Clock, CheckCircle, Play, Users, Landmark, Key, Shield, XCircle, History, ChevronDown } from "lucide-react";
import { getStandupDetails, getCleanTrackName, shouldShowMeetingOnDashboard, getLagosDateString, formatMeetingDates } from "../utils/trackUtils";
import AttendanceHistoryTab from "./AttendanceHistoryTab";

interface MeetingsHubProps {
  profile: Profile;
  meetings: Meeting[];
  attendance: AttendanceRecord[];
  onJoinMeeting: (meetingId: string) => void;
  meetingAssignments?: any[];
  state?: any;
  onStateUpdate?: () => void;
  hubTab: "meetings" | "history";
  setHubTab: (tab: "meetings" | "history") => void;
}

// Track/team links mapping dictionary for dynamic Zoom/Jitsi configuration
export const TEAM_MEETING_LINKS: Record<string, { name: string; morning: string; evening: string }> = {
  "Frontend Development (React, Vue, HTML, CSS)": {
    name: "Frontend Development Team",
    morning: "https://meet.jit.si/BincomDevCenter_MobileAppTeam",
    evening: "https://meet.jit.si/BincomDevCenter_MobileAppTeam"
  },
  "Backend Development (PHP / Laravel)": {
    name: "Backend PHP Team",
    morning: "https://meet.jit.si/BincomDevCenter_PHPteam",
    evening: "https://meet.jit.si/BincomDevCenter_PHPteam"
  },
  "Backend Development (Python / Django)": {
    name: "Backend Python Team",
    morning: "https://meet.jit.si/BincomDevCenterPythonTeam",
    evening: "https://meet.jit.si/BincomDevCenterPythonTeam"
  },
  "Backend Development (Node.js / Express)": {
    name: "Backend Node Team",
    morning: "https://meet.jit.si/BincomDevCenterPythonTeam",
    evening: "https://meet.jit.si/BincomDevCenterPythonTeam"
  },
  "Mobile App Development (React Native / Flutter)": {
    name: "Mobile App Team",
    morning: "https://meet.jit.si/BincomDevCenter_MobileAppTeam",
    evening: "https://meet.jit.si/BincomDevCenter_MobileAppTeam"
  },
  "DevOps & Cloud Engineering": {
    name: "DevOps & Cloud Team",
    morning: "https://meet.jit.si/BincomDevCenter_InfrastructureTeam",
    evening: "https://meet.jit.si/BincomDevCenter_InfrastructureTeam"
  },
  "Data Science & AI": {
    name: "Data Science & AI Team",
    morning: "https://meet.jit.si/BincomDevCenterPythonTeam",
    evening: "https://meet.jit.si/BincomDevCenterPythonTeam"
  },
  "UI/UX Design": {
    name: "UI/UX Design Team",
    morning: "https://meet.jit.si/bincomdevcenterdesignteam",
    evening: "https://meet.jit.si/bincomdevcenterdesignteam"
  },
  "Project Management (Tech)": {
    name: "Project Management Team",
    morning: "https://meet.jit.si/pmo-bincomdevcenter",
    evening: "https://meet.jit.si/pmo-bincomdevcenter"
  },
  "QA Testing & Automation": {
    name: "QA Testing Team",
    morning: "https://meet.jit.si/BincomDevCenter_ProservicesTeamStandup",
    evening: "https://meet.jit.si/BincomDevCenter_ProservicesTeamStandup"
  },
  "Cybersecurity": {
    name: "Cybersecurity Team",
    morning: "https://meet.jit.si/BincomDevCenter_cybersecurityTeam",
    evening: "https://meet.jit.si/BincomDevCenter_cybersecurityTeam"
  },
  "Digital Marketing": {
    name: "Digital Marketing Team",
    morning: "https://meet.jit.si/BincomDevCenter_MarketingTeam",
    evening: "https://meet.jit.si/BincomDevCenter_MarketingTeam"
  },
  "C# Backend Development": {
    name: "C# Backend Team",
    morning: "https://meet.jit.si/BincomDevCenter_PHPteam",
    evening: "https://meet.jit.si/BincomDevCenter_PHPteam"
  }
};

const HOUR_OPTIONS = [
  "06:00 AM", "07:00 AM", "08:00 AM", "09:00 AM", "10:00 AM", "11:00 AM",
  "12:00 PM", "01:00 PM", "02:00 PM", "03:00 PM", "04:00 PM", "05:00 PM",
  "06:00 PM", "07:00 PM", "08:00 PM", "09:00 PM", "10:00 PM"
];

export default function MeetingsHub({ 
  profile, 
  meetings, 
  attendance, 
  onJoinMeeting, 
  meetingAssignments = [],
  state,
  onStateUpdate,
  hubTab,
  setHubTab,
}: MeetingsHubProps) {
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [timeFilter, setTimeFilter] = useState<string>("all");
  const [customStart, setCustomStart] = useState<string>("09:00 AM");
  const [customEnd, setCustomEnd] = useState<string>("05:00 PM");
  const [sortOption, setSortOption] = useState<"time" | "title">("time");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  const isAdmin = profile.role === "admin";

  const parseFlexibleTimeToMinutes = (timeStr: string): number => {
    if (!timeStr) return 0;
    let clean = timeStr.replace(/\s*WAT\s*$/i, "").trim().toUpperCase();
    const match = clean.match(/^(\d+)(?:[:.](\d+))?\s*(AM|PM)?/i);
    if (!match) return 0;
    let hours = parseInt(match[1], 10);
    const minutes = match[2] ? parseInt(match[2], 10) : 0;
    const ampm = match[3];
    if (ampm) {
      if (ampm === "PM" && hours < 12) hours += 12;
      if (ampm === "AM" && hours === 12) hours = 0;
    } else {
      if (hours < 8) hours += 12;
    }
    return hours * 60 + minutes;
  };

  const getMinutesInLagos = (date: Date): number => {
    try {
      const formatted = new Intl.DateTimeFormat("en-US", {
        timeZone: "Africa/Lagos",
        hour: "numeric",
        minute: "numeric",
        hour12: false
      }).format(date);
      const parts = formatted.split(":");
      return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
    } catch (e) {
      const utcHours = date.getUTCHours();
      const lagosHours = (utcHours + 1) % 24;
      return lagosHours * 60 + date.getUTCMinutes();
    }
  };

  const parseDurationInMinutes = (durationStr: string): number => {
    if (!durationStr) return 30;
    const match = durationStr.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 30;
  };

  const isMeetingMissedOrPastCutoff = (m: any) => {
    const record = getAttendanceForMeeting(m.id);
    if (record) {
      return record.status === "Missed";
    }
    const timeStr = m.timeString || m.time || "09:00 AM";
    const startTimeMinutes = parseFlexibleTimeToMinutes(timeStr);
    const durationMinutes = parseDurationInMinutes(m.duration);
    const endTimeMinutes = startTimeMinutes + durationMinutes;
    const cutoffMinutes = endTimeMinutes - 2;
    const currentLagosMinutes = getMinutesInLagos(currentTime);
    
    if (!isMeetingToday(m)) {
      return false;
    }
    
    return currentLagosMinutes >= cutoffMinutes;
  };

  const isMeetingExpired = (m: any): boolean => {
    const timeStr = m.timeString || m.time || "09:00 AM";
    const startTimeMinutes = parseFlexibleTimeToMinutes(timeStr);
    const durationMinutes = parseDurationInMinutes(m.duration);
    const endTimeMinutes = startTimeMinutes + durationMinutes;
    const cutoffMinutes = endTimeMinutes + 1;
    const currentLagosMinutes = getMinutesInLagos(currentTime);
    
    if (!isMeetingToday(m)) {
      return false;
    }
    
    return currentLagosMinutes >= cutoffMinutes;
  };

  const matchesTimeFilter = (m: any): boolean => {
    if (!isMeetingToday(m)) {
      return false;
    }
    if (isMeetingExpired(m)) {
      return false;
    }
    if (timeFilter === "all") {
      return true;
    }
    const timeStr = m.timeString || m.time || "";
    const minutes = parseFlexibleTimeToMinutes(timeStr);
    if (timeFilter === "morning") {
      return minutes >= 360 && minutes < 720;
    }
    if (timeFilter === "afternoon") {
      return minutes >= 720 && minutes < 1020;
    }
    if (timeFilter === "evening") {
      return minutes >= 1020 && minutes <= 1320;
    }
    if (timeFilter === "custom") {
      const startMinutes = parseFlexibleTimeToMinutes(customStart);
      const endMinutes = parseFlexibleTimeToMinutes(customEnd);
      return minutes >= startMinutes && minutes <= endMinutes;
    }
    const targetHourMinutes = parseFlexibleTimeToMinutes(timeFilter);
    return minutes >= targetHourMinutes && minutes < (targetHourMinutes + 60);
  };

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

  // Real-time precise WAT Clock loop
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Helper to check if meeting matches the current day in West Africa Time zone text representation
  const isMeetingToday = (m: any) => {
    try {
      if (m.meetingDates && Array.isArray(m.meetingDates) && m.meetingDates.length > 0) {
        const todayStr = getLagosDateString(new Date());
        return m.meetingDates.includes(todayStr);
      }

      const watDay = new Intl.DateTimeFormat("en-US", {
        timeZone: "Africa/Lagos",
        weekday: "long"
      }).format(new Date());

      const days = m.scheduleDays || ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
      return Array.isArray(days) && days.some((d: string) => d.trim().toLowerCase() === watDay.toLowerCase());
    } catch (e) {
      return true;
    }
  };

  // Turn time formats like "09:00 AM WAT" into minutes for reliable comparison
  const parseTimeString = (timeStr: string) => {
    if (!timeStr) return 0;
    const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!match) return 0;
    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const ampm = match[3].toUpperCase();
    if (ampm === "PM" && hours < 12) hours += 12;
    if (ampm === "AM" && hours === 12) hours = 0;
    return hours * 60 + minutes;
  };

  // General list rendering sorter
  const sortMeetings = (list: any[]) => {
    return [...list].sort((a, b) => {
      if (sortOption === "title") {
        return (a.title || "").localeCompare(b.title || "");
      } else {
        const t1 = parseTimeString(a.time || a.timeString || "");
        const t2 = parseTimeString(b.time || b.timeString || "");
        return t1 - t2;
      }
    });
  };

  // Format real West Africa Time (WAT) dynamically using native locale zone Africa/Lagos
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
      // Safe fallback if LAGOS timezone fails on rare environments
      return date.toLocaleTimeString() + " WAT";
    }
  };

  const standupDetails = getStandupDetails(profile.track);

  const getAttendanceForMeeting = (meetingId: string) => {
    return attendance.find((a) => a.userId === profile.id && a.meetingId === meetingId);
  };

  const handleJoinMeetingAction = (meetingId: string, linkUrl: string) => {
    window.open(linkUrl, "_blank", "noopener,noreferrer");
    onJoinMeeting(meetingId);
  };

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

  // Filter dynamic database-driven meetings from meetings prop matching user alignment
  const eligibleMeetings = (meetings || []).filter((m) => {
    // Centralized rule: ONLY admin-scheduled meetings can ever appear on any dashboard, and automatically hide after scheduled duration has passed
    if (!shouldShowMeetingOnDashboard(m, lagosToday, lagosCurrentMinutes, true)) {
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

  // 1. Knowledge Track Meetings Definition - Cleared static un-scheduled meetings to ensure only admin-scheduled meetings appear
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
    .filter((m) => getMeetingCategoryType(m) === "knowledge")
    .map((m) => ({
      ...m,
      id: m.id,
      title: m.title,
      time: m.timeString.includes("WAT") ? m.timeString : `${m.timeString} WAT`,
      description: m.description || `Session for Level: ${getLevelsText(m.trackId, m.userLevels)} • ${m.targetTeamTrackEligibility && m.targetTeamTrackEligibility.length > 0 ? m.targetTeamTrackEligibility.join(", ") : "All Tracks"}`,
      link: m.jitsiUrl,
      trackName: getCleanTrackName(Array.isArray(m.trackId) ? m.trackId[0] : m.trackId) || profile.track || "Dev Center",
    }));

  const rawKnowledgeTrackMeetings = [
    ...baseKnowledgeMeetings.map(m => ({
      ...m,
      duration: "30 minutes",
      organizer: "Admin Team",
      status: "Upcoming",
      scheduleDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
    })), 
    ...dynamicKnowledgeMeetings
  ];

  const filteredKnowledgeTrackMeetings = rawKnowledgeTrackMeetings.filter(matchesTimeFilter);

  const knowledgeTrackMeetings = sortMeetings(filteredKnowledgeTrackMeetings);

  // 2. Microservice Meetings Definition - Cleared static un-scheduled meetings to ensure only admin-scheduled meetings appear
  const baseMicroserviceMeetings: any[] = [];

  const dynamicMicroserviceMeetings = eligibleMeetings
    .filter((m) => getMeetingCategoryType(m) === "microservice")
    .map((m) => ({
      ...m,
      id: m.id,
      title: m.title,
      time: m.timeString.includes("WAT") ? m.timeString : `${m.timeString} WAT`,
      description: m.description || `Session for Level: ${getLevelsText(m.trackId, m.userLevels)} • ${m.targetTeamTrackEligibility && m.targetTeamTrackEligibility.length > 0 ? m.targetTeamTrackEligibility.join(", ") : "All Tracks"}.`,
      link: m.jitsiUrl,
    }));

  const rawMicroserviceMeetings = [
    ...baseMicroserviceMeetings.map(m => ({
      ...m,
      duration: "60 minutes",
      organizer: "Admin Team",
      status: "Upcoming",
      scheduleDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
    })), 
    ...dynamicMicroserviceMeetings
  ];

  const filteredMicroserviceMeetings = rawMicroserviceMeetings.filter(matchesTimeFilter);

  const microserviceMeetings = sortMeetings(filteredMicroserviceMeetings);

  // 3. Project Meetings Setup (Linked to projects the current user belongs to)
  const dynamicProjectMeetings = eligibleMeetings
    .filter((m) => getMeetingCategoryType(m) === "project")
    .map((m) => ({
      ...m,
      id: m.id,
      title: m.title,
      time: m.timeString.includes("WAT") ? m.timeString : `${m.timeString} WAT`,
      jitsiUrl: m.jitsiUrl,
    }));

  // Fetch real, live projects from state.projects instead of hardcoded ones.
  const liveUserProjects = (state?.projects || []).filter((proj: any) => {
    // Hide archived or hold projects
    if (proj.status === "Hold" || proj.status === "Archived") {
      return false;
    }
    // Admins see all active projects to monitor them
    if (profile.status === "admin" || profile.role === "admin") {
      return true;
    }
    // Standard users see projects they are members of
    return proj.members?.some(
      (m: string) => m.toLowerCase() === profile.username.toLowerCase()
    );
  });

  const rawUserProjects = [...liveUserProjects];
  if (dynamicProjectMeetings.length > 0) {
    rawUserProjects.push({
      id: "dynamic_proj",
      name: "Assigned Dynamic Sprints",
      members: [profile.username],
      meetings: dynamicProjectMeetings
    });
  } 

  const userProjects = rawUserProjects.map(proj => {
    const projMeetingsWithDaysAndDefaults = proj.meetings.map((m: any) => ({
      ...m,
      scheduleDays: m.scheduleDays || ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      duration: m.duration || "45 minutes",
      organizer: m.organizer || "Project Manager",
      status: m.status || "Upcoming"
    }));

    const filteredProjMeetings = projMeetingsWithDaysAndDefaults.filter(matchesTimeFilter);

    return {
      ...proj,
      meetings: sortMeetings(filteredProjMeetings)
    };
  }).filter(proj => proj.meetings.length > 0); 

  const todayMeetingsForStats = eligibleMeetings.filter(isMeetingToday);

  let dynamicOnTimeCount = 0;
  let dynamicLateCount = 0;
  let dynamicMissedCount = 0;

  todayMeetingsForStats.forEach((m) => {
    const record = attendance.find(a => a.userId === profile.id && a.meetingId === m.id);
    const startTimeMinutes = parseFlexibleTimeToMinutes(m.timeString);
    const durationMinutes = parseDurationInMinutes(m.duration);
    const endTimeMinutes = startTimeMinutes + durationMinutes;
    const currentLagosMinutes = getMinutesInLagos(currentTime);

    if (record) {
      if (record.status === "Missed") {
        dynamicMissedCount++;
      } else {
        const checkInMinutes = getMinutesInLagos(new Date(record.timestamp));
        if (checkInMinutes <= startTimeMinutes + 5) {
          dynamicOnTimeCount++;
        } else {
          dynamicLateCount++;
        }
      }
    } else {
      const cutoffMinutes = endTimeMinutes - 2;
      if (currentLagosMinutes >= cutoffMinutes) {
        dynamicMissedCount++;
      }
    }
  });

  return (
    <div className="space-y-6 animate-fade-in" id="meetings-hub-root">
      
      {/* Dynamic Header Frame */}
      <div className="bg-[#4B5E40] rounded-2xl p-6 text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Centralized Meetings Dashboard</h2>
          <p className="text-xs text-white/80 mt-1 max-w-lg leading-relaxed">
            Stay aligned with daily live checkpoints, microservices development sessions, and assigned project sprints. Join standups to update compliance metrics and exportable performance charts.
          </p>
        </div>
        
        {/* Precise West Africa Time (WAT) Clock */}
        <div className="bg-white/10 backdrop-blur-xs px-5 py-2.5 rounded-xl text-center border border-white/10 shrink-0 font-mono select-none">
          <span className="block text-[9px] uppercase font-black tracking-wider text-[#A2B895]">Real WAT clock</span>
          <span className="text-sm font-extrabold tracking-widest text-white whitespace-nowrap">
            {getWATTimeStr(currentTime)}
          </span>
        </div>
      </div>

      {/* Sub-tab Dropdown for Personal Attendance History */}
      <div className="relative inline-block text-left select-none max-w-xs w-full mb-2" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="w-full flex items-center justify-between gap-3 px-4 py-2.5 bg-gray-100 hover:bg-gray-150 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 transition cursor-pointer shadow-3xs focus:outline-none"
          id="meetings-hub-dropdown-trigger"
        >
          <span className="flex items-center gap-2">
            {hubTab === "meetings" ? (
              <>
                <span className="text-[#4B5E40]">📅</span> Active Sessions
              </>
            ) : (
              <>
                <span className="text-indigo-600">📋</span> Attendance History
              </>
            )}
          </span>
          <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${isDropdownOpen ? "rotate-180" : ""}`} />
        </button>

        {isDropdownOpen && (
          <div 
            className="absolute left-0 mt-2 w-full bg-white rounded-xl border border-gray-200 shadow-lg z-30 py-1 divide-y divide-gray-100 animate-slide-in"
            id="meetings-hub-dropdown-menu"
          >
            <button
              type="button"
              onClick={() => {
                setHubTab("meetings");
                setIsDropdownOpen(false);
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition text-left cursor-pointer ${
                hubTab === "meetings" 
                  ? "bg-[#4B5E40] text-white font-bold" 
                  : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              <span className="text-xs">📅</span>
              <span>Active Sessions</span>
              {hubTab === "meetings" && <span className="ml-auto text-xs">✓</span>}
            </button>
            <button
              type="button"
              onClick={() => {
                setHubTab("history");
                setIsDropdownOpen(false);
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition text-left cursor-pointer ${
                hubTab === "history" 
                  ? "bg-indigo-600 text-white font-bold" 
                  : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              <span className="text-xs">📋</span>
              <span>Attendance History</span>
              {hubTab === "history" && <span className="ml-auto text-xs">✓</span>}
            </button>
          </div>
        )}
      </div>

      {hubTab === "history" ? (
        <AttendanceHistoryTab
          isAdmin={false}
          currentUserId={profile.id}
          state={state || {
            profiles: [profile],
            attendance: attendance,
            meetingHistory: [],
            meetingAssignments: meetingAssignments
          }}
          onStateUpdate={onStateUpdate || (() => {})}
        />
      ) : (
        <>
           {/* Filtering and Sorting Control Panel */}
          <div className="bg-white p-4 rounded-xl border border-gray-205 shadow-2xs flex flex-col md:flex-row md:items-center md:justify-between gap-4" id="meetings-filter-sort-bar">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider select-none shrink-0">Filter By Time:</span>
                <select
                  id="meetings-time-filter"
                  value={timeFilter}
                  onChange={(e) => setTimeFilter(e.target.value)}
                  className="bg-gray-55 border border-gray-200 text-xs font-bold text-gray-700 py-1.5 px-3 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#4B5E40]/25 focus:border-[#4B5E40] cursor-pointer"
                >
                  <option value="all">⏰ All Times (Today)</option>
                  <optgroup label="General Ranges">
                    <option value="morning">🌅 Morning (06:00 AM - 12:00 PM)</option>
                    <option value="afternoon">☀️ Afternoon (12:00 PM - 05:00 PM)</option>
                    <option value="evening">🌙 Evening (05:00 PM - 10:00 PM)</option>
                  </optgroup>
                  <optgroup label="Specific Hours">
                    {HOUR_OPTIONS.map((hour) => (
                      <option key={`opt-${hour}`} value={hour}>
                        ⏱️ {hour}
                      </option>
                    ))}
                  </optgroup>
                  <option value="custom">⚙️ Custom Range...</option>
                </select>
              </div>

              {timeFilter === "custom" && (
                <div className="flex items-center gap-2 animate-fade-in bg-gray-50 px-3 py-1 rounded-lg border border-gray-150">
                  <select
                    id="custom-start-time"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                    className="bg-transparent border-none text-xs font-bold text-gray-700 focus:outline-none cursor-pointer"
                  >
                    {HOUR_OPTIONS.map((hour) => (
                      <option key={`start-${hour}`} value={hour}>
                        {hour}
                      </option>
                    ))}
                  </select>
                  <span className="text-gray-400 text-xs font-medium">to</span>
                  <select
                    id="custom-end-time"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    className="bg-transparent border-none text-xs font-bold text-gray-700 focus:outline-none cursor-pointer"
                  >
                    {HOUR_OPTIONS.map((hour) => (
                      <option key={`end-${hour}`} value={hour}>
                        {hour}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider select-none shrink-0 font-sans">Sort By:</span>
          <select
            value={sortOption}
            onChange={(e: any) => setSortOption(e.target.value)}
            className="bg-gray-55 border border-gray-200 text-xs font-bold text-gray-700 py-1 px-2.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#4B5E40]/25 focus:border-[#4B5E40] cursor-pointer"
          >
            <option value="time">⏰ Scheduled Time</option>
            <option value="title">🔤 Alphabetical (Title)</option>
          </select>
        </div>
      </div>

      {isAdmin && (
        <div className="bg-amber-50 text-amber-800 p-3.5 rounded-xl border border-amber-200 text-xs flex items-center gap-2.5 shadow-2xs">
          <Shield className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            <b>Administrative view:</b> As an administrator, you are allowed to view active meeting links for debugging. Other team members only see immediate <b>Join Meeting</b> links.
          </span>
        </div>
      )}

      {/* 1. KNOWLEDGE TRACK MEETINGS */}
      <div className="space-y-3" id="knowledge-track-meetings-section">
        <h3 className="font-extrabold text-sm text-gray-950 uppercase tracking-wider flex items-center gap-2 border-b border-gray-150 pb-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#4B5E40] inline-block"></span>
          Knowledge Track Meetings
        </h3>
        
        {knowledgeTrackMeetings.length === 0 ? (
          <div className="p-6 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200 text-xs font-semibold text-gray-500">
            No knowledge track meetings found matching your filter selection.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {knowledgeTrackMeetings.map((p) => {
              const index = getAttendanceForMeeting(p.id);
              return (
                <div 
                  key={p.id}
                  id={`priority-card-${p.id}`}
                  className="bg-white rounded-xl border border-gray-150 p-4 shadow-2xs hover:border-[#4B5E40]/30 transition flex flex-col justify-between min-h-[220px]"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2 py-0.5 bg-gray-50 border border-gray-250 text-[10px] font-mono font-bold text-[#4B5E40] rounded-lg">
                        {p.time}
                      </span>
                      <span className="text-[10px] text-gray-400 font-medium truncate max-w-[150px]" title={p.trackName}>
                        {p.trackName}
                      </span>
                    </div>

                    <h4 className="font-extrabold text-xs text-gray-900 leading-snug">{p.title}</h4>
                    <p className="text-[11px] text-gray-500 leading-normal">{p.description}</p>

                    {/* Micro Info Frame */}
                    <div className="bg-gray-50/50 rounded-lg p-2.5 border border-gray-150 text-[10.5px] space-y-1.2 mt-2">
                      <div className="grid grid-cols-2 gap-2 text-gray-500 font-medium pb-1.5 border-b border-gray-100">
                        <div>
                          <span className="text-[8.5px] uppercase tracking-wider text-gray-400 block">Organizer</span>
                          <span className="text-gray-800 font-bold block">{p.organizer || "Admin Team"}</span>
                        </div>
                        <div>
                          <span className="text-[8.5px] uppercase tracking-wider text-gray-400 block">Duration</span>
                          <span className="text-[#4B5E40] font-bold block">{p.duration || "30 minutes"}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-1 pt-1">
                        <span className="text-gray-400 font-medium">Meeting Date(s):</span>
                        <span className="text-gray-650 font-bold text-right">
                          {formatMeetingDates(p)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-gray-50 space-y-2">
                    {isAdmin && (
                      <div className="text-[9.5px] font-mono bg-amber-50/50 border border-amber-100 p-1 rounded text-orange-850 select-all truncate">
                        Admin link: {p.link}
                      </div>
                    )}

                    {!index ? (
                      isMeetingMissedOrPastCutoff(p) ? (
                        <div className="flex items-center justify-between w-full">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-extrabold bg-red-50 text-red-800 border border-red-100">
                            <XCircle className="w-3.5 h-3.5 text-red-600" />
                            Missed (Locked)
                          </span>
                          <span className="text-[10px] text-gray-400 font-mono">
                            Ended
                          </span>
                        </div>
                      ) : (
                        <button
                          id={`join-btn-${p.id}`}
                          onClick={() => handleJoinMeetingAction(p.id, p.link)}
                          className="w-full py-2 bg-[#4B5E40] hover:bg-[#3d4d34] text-white text-[11px] font-black rounded-lg shadow-2xs transition active:scale-97 cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <Play className="w-2.5 h-2.5 fill-white" /> Join Stand-up
                        </button>
                      )
                    ) : (
                      <div className="flex items-center justify-between w-full">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-extrabold ${
                          index.status === "Missed" 
                            ? "bg-red-50 text-red-800 border border-red-100" 
                            : "bg-emerald-50 text-emerald-800 border border-emerald-100"
                        }`}>
                          {index.status === "Missed" ? (
                            <XCircle className="w-3.5 h-3.5 text-red-600" />
                          ) : (
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                          )}
                          {index.status === "Missed" ? "Missed" : "Checked In"}
                        </span>
                        <span className="text-[10px] text-gray-400 font-mono">
                          {index.status === "Missed" ? "Locked" : new Date(index.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. MICROSERVICE MEETINGS */}
      <div className="space-y-3 pt-2" id="microservice-meetings-section">
        <h3 className="font-extrabold text-sm text-gray-950 uppercase tracking-wider flex items-center gap-2 border-b border-gray-150 pb-2">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block"></span>
          Microservice Meetings
        </h3>
        
        {microserviceMeetings.length === 0 ? (
          <div className="p-6 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200 text-xs font-semibold text-gray-500">
            No microservice meetings found matching your filter selection.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {microserviceMeetings.map((p) => {
              const index = getAttendanceForMeeting(p.id);
              return (
                <div 
                  key={p.id}
                  id={`priority-card-${p.id}`}
                  className="bg-white rounded-xl border border-gray-150 p-4 shadow-2xs hover:border-blue-200 transition flex flex-col justify-between min-h-[220px]"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2 py-0.5 bg-gray-50 border border-gray-250 text-[10px] font-mono font-bold text-blue-600 rounded-lg">
                        {p.time}
                      </span>
                      <span className="text-[10px] text-gray-400 font-medium">Academy Commons</span>
                    </div>

                    <h4 className="font-extrabold text-xs text-gray-900 leading-snug">{p.title}</h4>
                    <p className="text-[11px] text-gray-500 leading-normal">{p.description}</p>

                    {/* Micro Info Frame */}
                    <div className="bg-gray-50/50 rounded-lg p-2.5 border border-gray-150 text-[10.5px] space-y-1.2 mt-2">
                      <div className="grid grid-cols-2 gap-2 text-gray-500 font-medium pb-1.5 border-b border-gray-100">
                        <div>
                          <span className="text-[8.5px] uppercase tracking-wider text-gray-400 block">Organizer</span>
                          <span className="text-gray-800 font-bold block">{p.organizer || "Admin Team"}</span>
                        </div>
                        <div>
                          <span className="text-[8.5px] uppercase tracking-wider text-gray-400 block">Duration</span>
                          <span className="text-[#4B5E40] font-bold block">{p.duration || "60 minutes"}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-1 pt-1">
                        <span className="text-gray-400 font-medium">Meeting Date(s):</span>
                        <span className="text-gray-650 font-bold text-right">
                          {formatMeetingDates(p)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-gray-50 space-y-2">
                    {isAdmin && (
                      <div className="text-[9.5px] font-mono bg-amber-50/50 border border-amber-100 p-1 rounded text-orange-850 select-all truncate">
                        Admin link: {p.link}
                      </div>
                    )}

                    {!index ? (
                      isMeetingMissedOrPastCutoff(p) ? (
                        <div className="flex items-center justify-between w-full">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-extrabold bg-red-50 text-red-800 border border-red-100">
                            <XCircle className="w-3.5 h-3.5 text-red-600" />
                            Missed (Locked)
                          </span>
                          <span className="text-[10px] text-gray-400 font-mono">
                            Ended
                          </span>
                        </div>
                      ) : (
                        <button
                          id={`join-btn-${p.id}`}
                          onClick={() => handleJoinMeetingAction(p.id, p.link)}
                          className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-black rounded-lg shadow-2xs transition active:scale-97 cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <Play className="w-2.5 h-2.5 fill-white" /> Join Session
                        </button>
                      )
                    ) : (
                      <div className="flex items-center justify-between w-full">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-extrabold ${
                          index.status === "Missed" 
                            ? "bg-red-50 text-red-800 border border-red-100" 
                            : "bg-blue-50 text-blue-800 border border-blue-100"
                        }`}>
                          {index.status === "Missed" ? (
                            <XCircle className="w-3.5 h-3.5 text-red-600" />
                          ) : (
                            <CheckCircle className="w-3.5 h-3.5 text-blue-600" />
                          )}
                          {index.status === "Missed" ? "Missed" : "Checked In"}
                        </span>
                        <span className="text-[10px] text-gray-400 font-mono">
                          {index.status === "Missed" ? "Locked" : new Date(index.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. PROJECT MEETINGS */}
      <div className="space-y-3 pt-2" id="project-meetings-section">
        <h3 className="font-extrabold text-sm text-gray-950 uppercase tracking-wider flex items-center gap-2 border-b border-gray-150 pb-2">
          <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 inline-block"></span>
          Project Meetings
        </h3>

        {userProjects.length === 0 ? (
          <div className="p-5 text-center bg-gray-50 rounded-xl border border-dashed border-gray-250 text-xs text-gray-500 leading-relaxed font-sans">
            <Users className="w-6 h-6 text-gray-400 mx-auto mb-2" />
            <p className="font-bold text-gray-800">No active project teams assigned to your current profile</p>
            <p className="mt-0.5">Please join standard sprints or active repositories via the <b>Project Repository</b> tab above to unlock dynamic standup scrums.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {userProjects.map((proj) => (
              <div key={proj.id} className="space-y-2 col-span-1 md:col-span-2">
                <p className="text-[10.5px] font-mono uppercase font-black text-indigo-700">{proj.name}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {proj.meetings.map((meet) => {
                    const index = getAttendanceForMeeting(meet.id);
                    return (
                      <div 
                        key={meet.id}
                        className="bg-white rounded-xl border border-gray-150 p-4 shadow-2xs hover:border-indigo-200 transition flex flex-col justify-between"
                      >
                        <div className="space-y-1.5">
                          <span className="px-2 py-0.5 bg-gray-50 border border-gray-250 text-[10px] font-mono font-bold text-indigo-600 inline-block rounded-md">
                            {meet.time} WAT
                          </span>
                          <h4 className="font-extrabold text-xs text-gray-900 leading-snug">{meet.title}</h4>
                        </div>

                        <div className="mt-4 pt-3 border-t border-gray-50 space-y-2">
                          {isAdmin && (
                            <div className="text-[9.5px] font-mono bg-amber-50/50 border border-amber-100 p-1 rounded text-orange-850 select-all truncate">
                              Admin link: {meet.jitsiUrl}
                            </div>
                          )}

                          {!index ? (
                            isMeetingMissedOrPastCutoff(meet) ? (
                              <div className="flex items-center justify-between w-full">
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-extrabold bg-red-50 text-red-800 border border-red-100">
                                  <XCircle className="w-3.5 h-3.5 text-red-600" />
                                  Missed (Locked)
                                </span>
                                <span className="text-[10px] text-gray-400 font-mono">
                                  Ended
                                </span>
                              </div>
                            ) : (
                              <button
                                id={`join-btn-project-${meet.id}`}
                                onClick={() => handleJoinMeetingAction(meet.id, meet.jitsiUrl)}
                                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-black rounded-lg shadow-2xs transition active:scale-97 cursor-pointer flex items-center justify-center gap-1.5"
                              >
                                <Play className="w-2.5 h-2.5 fill-white" /> Join Project Scrum
                              </button>
                            )
                          ) : (
                            <div className="flex items-center justify-between w-full">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-extrabold ${
                                index.status === "Missed" 
                                  ? "bg-red-50 text-red-800 border border-red-100" 
                                  : "bg-indigo-50 text-indigo-800 border border-indigo-100"
                              }`}>
                                {index.status === "Missed" ? (
                                  <XCircle className="w-3.5 h-3.5 text-red-600" />
                                ) : (
                                  <CheckCircle className="w-3.5 h-3.5 text-indigo-600" />
                                )}
                                {index.status === "Missed" ? "Missed" : "Checked In"}
                              </span>
                              <span className="text-[10px] text-gray-400 font-mono">
                                {index.status === "Missed" ? "Locked" : new Date(index.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Attendance summary statistics widget */}
      <div className="bg-[#F8FAF8] rounded-xl p-4 border border-gray-200" id="meetings-punctuality-panel">
        <h3 className="font-bold text-gray-800 text-xs uppercase mb-3">Your Daily Sync Attendance Progress</h3>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="bg-white p-3 rounded-xl border border-gray-150">
            <span className="block text-xl font-bold text-emerald-600">
              {dynamicOnTimeCount}
            </span>
            <span className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">On-Time</span>
          </div>
          <div className="bg-white p-3 rounded-xl border border-gray-150">
            <span className="block text-xl font-bold text-amber-500">
              {dynamicLateCount}
            </span>
            <span className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Late (&gt;5m)</span>
          </div>
          <div className="bg-white p-3 rounded-xl border border-gray-150">
            <span className="block text-xl font-bold text-rose-500">
              {dynamicMissedCount}
            </span>
            <span className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Missed</span>
          </div>
        </div>
      </div>
        </>
      )}
    </div>
  );
}
