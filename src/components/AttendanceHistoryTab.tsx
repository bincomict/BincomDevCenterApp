import React, { useState, useMemo } from "react";
import {
  History,
  CheckCircle,
  Clock,
  AlertTriangle,
  Search,
  Filter,
  FileDown,
  Edit2,
  ChevronDown,
  ChevronRight,
  Shield,
  User,
  Calendar,
  Layers,
  ArrowRight,
  Check,
  X,
  FileText
} from "lucide-react";
import { Profile, AttendanceRecord, MeetingHistoryRecord, AttendanceAuditLog } from "../types";
import { getCleanTrackName } from "../utils/trackUtils";
import { adminUpdateAttendance } from "../firebaseService";

interface AttendanceHistoryTabProps {
  isAdmin: boolean;
  currentUserId: string;
  state: {
    profiles: Profile[];
    attendance: AttendanceRecord[];
    meetingHistory: MeetingHistoryRecord[];
    attendanceAuditLogs?: AttendanceAuditLog[];
    meetingAssignments: any[];
  };
  onStateUpdate: () => void;
}

export default function AttendanceHistoryTab({
  isAdmin,
  currentUserId,
  state,
  onStateUpdate
}: AttendanceHistoryTabProps) {
  // --- View States ---
  const [timeframe, setTimeframe] = useState<"daily" | "weekly" | "monthly">("daily");
  
  // Date values
  const todayStr = useMemo(() => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }, []);

  const currentMonthStr = useMemo(() => todayStr.substring(0, 7), [todayStr]);

  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [selectedWeekDate, setSelectedWeekDate] = useState<string>(todayStr);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedTrack, setSelectedTrack] = useState<string>("All");
  const [selectedType, setSelectedType] = useState<string>("All");
  
  // View Toggle: "meeting" or "user"
  const [viewMode, setViewMode] = useState<"meeting" | "user">("meeting");

  // Expanded items state
  const [expandedMeetingId, setExpandedMeetingId] = useState<string | null>(null);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);

  // Manual update inline dialog state
  const [editingRecord, setEditingRecord] = useState<{
    userId: string;
    meetingId: string;
    meetingDate: string;
    currentStatus: string;
  } | null>(null);
  const [newStatusValue, setNewStatusValue] = useState<"Attended" | "Late" | "Missed">("Attended");
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string>("");
  const [actionErrorMsg, setActionErrorMsg] = useState<string>("");

  // Get Monday and Sunday for the selected week date
  const weekBounds = useMemo(() => {
    const parts = selectedWeekDate.split("-");
    if (parts.length !== 3) return { mondayStr: todayStr, sundayStr: todayStr, label: "" };
    
    const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday is start
    
    const monday = new Date(d.setDate(diff));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const pad = (num: number) => String(num).padStart(2, "0");
    const mondayStr = `${monday.getFullYear()}-${pad(monday.getMonth() + 1)}-${pad(monday.getDate())}`;
    const sundayStr = `${sunday.getFullYear()}-${pad(sunday.getMonth() + 1)}-${pad(sunday.getDate())}`;

    const label = `${monday.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${sunday.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;

    return { mondayStr, sundayStr, label, mondayObj: monday, sundayObj: sunday };
  }, [selectedWeekDate, todayStr]);

  // --- List of Tracks ---
  const allTracks = useMemo(() => {
    const tracks = new Set<string>();
    state.profiles.forEach(p => {
      if (p.track) {
        const cleanName = getCleanTrackName(p.track);
        if (cleanName && cleanName.toLowerCase() !== "all") {
          tracks.add(cleanName);
        }
      }
    });
    return ["All", ...Array.from(tracks).sort()];
  }, [state.profiles]);

  // --- Helper to verify user eligibility ---
  const isUserEligibleForMeeting = (user: Profile, meeting: MeetingHistoryRecord): boolean => {
    if (user.role === "admin") return false;

    // 1. Explicitly assigned
    const isAssigned = (state.meetingAssignments || []).some(
      (ma: any) => ma.meetingId === meeting.meetingId && ma.userId === user.id
    );
    if (isAssigned) return true;

    // 2. User Level & Track Eligibility
    const userLevelValue = user.learningLevel || user.techExperience || "Apprentice level 1";
    const userTrackValue = user.track || "";

    const targetTracks = meeting.targetTeamTrackEligibility;
    const isGlobalTrack = !targetTracks || (Array.isArray(targetTracks) && targetTracks.length === 0) || targetTracks.includes("All") || targetTracks.includes("All Tracks Eligibility");
    const rawLevels = meeting.userLevels;
    const isGlobalLevel = !rawLevels || (Array.isArray(rawLevels) && rawLevels.length === 0) || rawLevels.includes("All") || rawLevels.includes("All User Eligible") || rawLevels.includes("All User Level");
    const isGlobal = isGlobalTrack && isGlobalLevel;

    if (isGlobal) return true;

    const trackMatch = (() => {
      if (userTrackValue.trim().toLowerCase() === "all") return true;
      if (!targetTracks || targetTracks.length === 0) return true;
      return targetTracks.some((t: string) => {
        const mt = t.trim().toLowerCase();
        const ut = userTrackValue.trim().toLowerCase();
        return mt === ut || mt === "all" || mt.includes(ut) || ut.includes(mt);
      });
    })();

    const levelMatch = (() => {
      if (!rawLevels || rawLevels.length === 0) return true;
      return rawLevels.some((l: string) => {
        const mLevel = l.trim().toLowerCase();
        const uL = userLevelValue.trim().toLowerCase();
        return mLevel === uL || mLevel.includes(uL) || uL.includes(mLevel);
      });
    })();

    if (!isGlobalTrack && !isGlobalLevel) {
      return trackMatch && levelMatch;
    } else if (!isGlobalTrack) {
      return trackMatch;
    } else {
      return levelMatch;
    }
  };

  // --- Filter Meeting Instances inside selected timeframe ---
  const filteredHistoryMeetings = useMemo(() => {
    let meetings = [...(state.meetingHistory || [])];

    // Synthesize any meeting history records from state.attendance that are missing
    const existingHistoryKeys = new Set(meetings.map(m => `${m.meetingId}_${m.date}`));

    (state.attendance || []).forEach(att => {
      const date = att.meetingDate || (att.timestamp ? att.timestamp.substring(0, 10) : "");
      if (!date) return;
      const key = `${att.meetingId}_${date}`;
      if (!existingHistoryKeys.has(key)) {
        existingHistoryKeys.add(key);
        meetings.push({
          id: `m-hist-${att.meetingId}-${date}`,
          meetingId: att.meetingId,
          title: att.meetingTitle,
          type: att.meetingType || "Alignment Session",
          date: date,
          scheduledStartTime: att.scheduledStartTime || "09:00 AM",
          scheduledEndTime: att.scheduledEndTime || "09:30 AM",
          duration: att.duration || "30 minutes",
          organizer: att.organizer || "Admin Team",
          userLevels: att.userLevels || [],
          targetTeamTrackEligibility: att.targetTeamTrackEligibility || []
        });
      }
    });

    // Apply timeframe bounds
    if (timeframe === "daily") {
      meetings = meetings.filter(m => m.date === selectedDate);
    } else if (timeframe === "weekly") {
      meetings = meetings.filter(m => m.date >= weekBounds.mondayStr && m.date <= weekBounds.sundayStr);
    } else if (timeframe === "monthly") {
      meetings = meetings.filter(m => m.date.startsWith(selectedMonth));
    }

    // Apply filters
    if (selectedType !== "All") {
      meetings = meetings.filter(m => m.type === selectedType);
    }

    if (selectedTrack !== "All") {
      meetings = meetings.filter(m => {
        const matchesTrack = m.targetTeamTrackEligibility && m.targetTeamTrackEligibility.some(
          t => getCleanTrackName(t) === selectedTrack
        );
        const isGlobal = !m.targetTeamTrackEligibility || m.targetTeamTrackEligibility.length === 0 || m.targetTeamTrackEligibility.includes("All") || m.targetTeamTrackEligibility.includes("All Tracks Eligibility");
        return matchesTrack || isGlobal;
      });
    }

    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase();
      meetings = meetings.filter(m => m.title.toLowerCase().includes(q));
    }

    return meetings.sort((a, b) => b.date.localeCompare(a.date) || a.scheduledStartTime.localeCompare(b.scheduledStartTime));
  }, [state.meetingHistory, timeframe, selectedDate, weekBounds, selectedMonth, selectedType, selectedTrack, searchQuery]);

  // --- Filter Profiles (Standard Users Only) ---
  const filteredUsers = useMemo(() => {
    let users = state.profiles.filter(p => p.role === "user");

    if (selectedTrack !== "All") {
      users = users.filter(u => getCleanTrackName(u.track) === selectedTrack);
    }

    if (!isAdmin) {
      // Regular user: only see themselves
      users = users.filter(u => u.id === currentUserId);
    } else if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase();
      users = users.filter(u => u.fullName.toLowerCase().includes(q) || u.username.toLowerCase().includes(q));
    }

    return users.sort((a, b) => a.fullName.localeCompare(b.fullName));
  }, [state.profiles, selectedTrack, searchQuery, isAdmin, currentUserId]);

  // --- Map and Calculate Detailed Attendance Breakdown for filtered meetings ---
  const meetingBreakdown = useMemo(() => {
    return filteredHistoryMeetings.map(m => {
      // Find all standard users eligible for this meeting
      const eligibleUsers = state.profiles.filter(u => isUserEligibleForMeeting(u, m));
      const eligibleIds = new Set(eligibleUsers.map(u => u.id));

      // Find all attendance records for this meeting and date
      const meetingAttendance = state.attendance.filter(a => {
        const isSameMeeting = a.meetingId === m.meetingId;
        const recordDate = a.timestamp ? a.timestamp.substring(0, 10) : "";
        const isSameDate = recordDate === m.date || a.meetingDate === m.date;
        return isSameMeeting && isSameDate;
      });

      const attendanceMap = new Map<string, AttendanceRecord>();
      meetingAttendance.forEach(a => {
        attendanceMap.set(a.userId, a);
      });

      const onTimeUsers: typeof eligibleUsers = [];
      const lateUsers: typeof eligibleUsers = [];
      const missedUsers: typeof eligibleUsers = [];

      eligibleUsers.forEach(u => {
        const record = attendanceMap.get(u.id);
        if (!record) {
          // No record means missed
          missedUsers.push(u);
        } else if (record.status === "Late") {
          lateUsers.push(u);
        } else if (record.status === "Attended") {
          onTimeUsers.push(u);
        } else if (record.status === "Missed") {
          missedUsers.push(u);
        }
      });

      const totalEligible = eligibleUsers.length;
      const onTimeCount = onTimeUsers.length;
      const lateCount = lateUsers.length;
      const missedCount = missedUsers.length;

      const onTimeRate = totalEligible > 0 ? (onTimeCount / totalEligible) * 100 : 0;
      const lateRate = totalEligible > 0 ? (lateCount / totalEligible) * 100 : 0;
      const missedRate = totalEligible > 0 ? (missedCount / totalEligible) * 100 : 0;

      return {
        meeting: m,
        eligibleUsers,
        onTimeUsers,
        lateUsers,
        missedUsers,
        stats: {
          total: totalEligible,
          onTime: onTimeCount,
          late: lateCount,
          missed: missedCount,
          onTimeRate,
          lateRate,
          missedRate
        }
      };
    });
  }, [filteredHistoryMeetings, state.profiles, state.attendance]);

  // --- Map and Calculate Detailed Attendance Breakdown for filtered Users ---
  const userBreakdown = useMemo(() => {
    return filteredUsers.map(u => {
      // Find all meetings this user was eligible for in the timeframe
      const eligibleMeetings = filteredHistoryMeetings.filter(m => isUserEligibleForMeeting(u, m));

      let onTimeCount = 0;
      let lateCount = 0;
      let missedCount = 0;

      const meetingRecords = eligibleMeetings.map(m => {
        const record = state.attendance.find(a => {
          const isSameMeeting = a.meetingId === m.meetingId;
          const recordDate = a.timestamp ? a.timestamp.substring(0, 10) : "";
          const isSameDate = recordDate === m.date || a.meetingDate === m.date;
          return isSameMeeting && isSameDate && a.userId === u.id;
        });

        const status = record ? record.status : "Missed";
        if (status === "Attended") onTimeCount++;
        else if (status === "Late") lateCount++;
        else missedCount++;

        return {
          meeting: m,
          status,
          checkInTime: record ? (record.timestamp ? new Date(record.timestamp).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : "N/A") : "N/A"
        };
      });

      const totalMeetings = eligibleMeetings.length;
      const onTimeRate = totalMeetings > 0 ? (onTimeCount / totalMeetings) * 100 : 0;
      const lateRate = totalMeetings > 0 ? (lateCount / totalMeetings) * 100 : 0;
      const missedRate = totalMeetings > 0 ? (missedCount / totalMeetings) * 100 : 0;

      return {
        user: u,
        records: meetingRecords,
        stats: {
          total: totalMeetings,
          onTime: onTimeCount,
          late: lateCount,
          missed: missedCount,
          onTimeRate,
          lateRate,
          missedRate
        }
      };
    });
  }, [filteredUsers, filteredHistoryMeetings, state.attendance]);

  // --- Overall Timeframe Summary Stats ---
  const globalSummaryStats = useMemo(() => {
    let totalEligibleOccurrences = 0;
    let totalOnTime = 0;
    let totalLate = 0;
    let totalMissed = 0;

    if (viewMode === "meeting") {
      meetingBreakdown.forEach(m => {
        totalEligibleOccurrences += m.stats.total;
        totalOnTime += m.stats.onTime;
        totalLate += m.stats.late;
        totalMissed += m.stats.missed;
      });
    } else {
      userBreakdown.forEach(u => {
        totalEligibleOccurrences += u.stats.total;
        totalOnTime += u.stats.onTime;
        totalLate += u.stats.late;
        totalMissed += u.stats.missed;
      });
    }

    const onTimePercent = totalEligibleOccurrences > 0 ? (totalOnTime / totalEligibleOccurrences) * 100 : 0;
    const latePercent = totalEligibleOccurrences > 0 ? (totalLate / totalEligibleOccurrences) * 100 : 0;
    const missedPercent = totalEligibleOccurrences > 0 ? (totalMissed / totalEligibleOccurrences) * 100 : 0;

    return {
      totalInstances: filteredHistoryMeetings.length,
      totalExpectedCheckIns: totalEligibleOccurrences,
      onTime: totalOnTime,
      late: totalLate,
      missed: totalMissed,
      onTimePercent,
      latePercent,
      missedPercent
    };
  }, [meetingBreakdown, userBreakdown, viewMode, filteredHistoryMeetings]);

  // --- Edit Submission Handler (Admin Manual Corrections) ---
  const handleUpdateStatus = async () => {
    if (!editingRecord) return;
    setActionErrorMsg("");
    setActionSuccessMsg("");

    try {
      await adminUpdateAttendance(
        currentUserId,
        editingRecord.userId,
        editingRecord.meetingId,
        editingRecord.meetingDate,
        newStatusValue as any
      );

      setActionSuccessMsg(`Successfully updated attendance to ${newStatusValue}!`);
      onStateUpdate(); // Refresh global application state
      setTimeout(() => {
        setEditingRecord(null);
        setActionSuccessMsg("");
      }, 1500);
    } catch (err: any) {
      setActionErrorMsg(err.message || "Failed to submit correction.");
    }
  };

  // --- Export Report to CSV file ---
  const handleExportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    
    if (viewMode === "meeting") {
      csvContent += "Meeting Title,Meeting Type,Date,Scheduled Start,Scheduled End,Duration,Organizer,Expected Check-ins,On-Time Rate %,Late Rate %,Missed Rate %\n";
      meetingBreakdown.forEach(b => {
        csvContent += `"${b.meeting.title.replace(/"/g, '""')}","${b.meeting.type}","${b.meeting.date}","${b.meeting.scheduledStartTime}","${b.meeting.scheduledEndTime}","${b.meeting.duration}","${b.meeting.organizer}",${b.stats.total},${b.stats.onTimeRate.toFixed(1)},${b.stats.lateRate.toFixed(1)},${b.stats.missedRate.toFixed(1)}\n`;
      });
    } else {
      csvContent += "Student Name,Username,Track,Learning Level,Total Meetings,On-Time Rate %,Late Rate %,Missed Rate %\n";
      userBreakdown.forEach(b => {
        csvContent += `"${b.user.fullName.replace(/"/g, '""')}","${b.user.username}","${b.user.track}","${b.user.learningLevel || 'Apprentice'}",${b.stats.total},${b.stats.onTimeRate.toFixed(1)},${b.stats.lateRate.toFixed(1)},${b.stats.missedRate.toFixed(1)}\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const dateLabel = timeframe === "daily" ? selectedDate : (timeframe === "weekly" ? `Week_${selectedWeekDate}` : selectedMonth);
    link.setAttribute("download", `Attendance_Ledger_${viewMode}_${dateLabel}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 select-none" id="attendance-history-root">
      {/* HEADER BAR */}
      <div className="bg-white p-5 rounded-xl border border-gray-150 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-extrabold text-gray-950 text-base md:text-lg flex items-center gap-2">
            <History className="w-5 h-5 text-[#4B5E40]" /> 
            {isAdmin ? "Attendance Ledger & Reports" : "My Attendance History"}
          </h2>
          <p className="text-[11px] text-gray-500 mt-0.5">
            {isAdmin 
              ? "Review official meeting history instances, audit attendance stats, and apply manual record edits." 
              : "Track your historical participation rates across all required Knowledge Track, Microservice, and Project meetings."}
          </p>
        </div>

        {/* TIMEFRAME SELECTORS */}
        <div className="flex bg-gray-100 p-1 rounded-lg self-start md:self-auto shrink-0 border border-gray-200">
          {(["daily", "weekly", "monthly"] as const).map(t => (
            <button
              key={t}
              onClick={() => {
                setTimeframe(t);
                setExpandedMeetingId(null);
                setExpandedUserId(null);
              }}
              className={`px-3 py-1 text-xs font-bold capitalize rounded-md transition ${
                timeframe === t 
                  ? "bg-[#4B5E40] text-white shadow-xs" 
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-200"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* FILTER CONTROL PANEL */}
      <div className="bg-white p-5 rounded-xl border border-gray-150 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
        
        {/* Timeframe picker input dynamically loaded */}
        <div>
          <label className="block text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-gray-400" /> Timeframe Period
          </label>
          {timeframe === "daily" && (
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full text-xs font-medium px-3.5 py-2 rounded-lg border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:border-[#4B5E40] transition"
            />
          )}
          {timeframe === "weekly" && (
            <div className="space-y-1">
              <input
                type="date"
                value={selectedWeekDate}
                onChange={(e) => setSelectedWeekDate(e.target.value)}
                className="w-full text-xs font-medium px-3.5 py-2 rounded-lg border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:border-[#4B5E40] transition"
              />
              <span className="block text-[10px] text-gray-500 font-medium pl-1">{weekBounds.label}</span>
            </div>
          )}
          {timeframe === "monthly" && (
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full text-xs font-medium px-3.5 py-2 rounded-lg border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:border-[#4B5E40] transition"
            />
          )}
        </div>

        {/* Meeting Type Filter */}
        <div>
          <label className="block text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-gray-400" /> Meeting Category
          </label>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="w-full text-xs font-medium px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:border-[#4B5E40] transition cursor-pointer"
          >
            <option value="All">All Categories</option>
            <option value="Knowledge Track">Knowledge Track</option>
            <option value="Microservices">Microservices</option>
            <option value="Project">Project</option>
          </select>
        </div>

        {/* Track Filter (Only shown if Admin or multiple tracks relevant) */}
        {isAdmin && (
          <div>
            <label className="block text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-gray-400" /> Tech Team Track
            </label>
            <select
              value={selectedTrack}
              onChange={(e) => setSelectedTrack(e.target.value)}
              className="w-full text-xs font-medium px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:border-[#4B5E40] transition cursor-pointer"
            >
              {allTracks.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        )}

        {/* Text Search queries */}
        <div className={isAdmin ? "" : "sm:col-span-2"}>
          <label className="block text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
            <Search className="w-3.5 h-3.5 text-gray-400" /> Search filter
          </label>
          <div className="relative">
            <input
              type="text"
              placeholder={viewMode === "meeting" ? "Search by meeting name..." : "Search by student name..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs font-medium pl-9 pr-3.5 py-2 rounded-lg border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:border-[#4B5E40] transition"
            />
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
          </div>
        </div>

      </div>

      {/* STATS OVERVIEW PANEL */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        
        {/* TOTAL INSTANCES */}
        <div className="bg-white p-4 rounded-xl border border-gray-150 shadow-2xs">
          <span className="block text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Scheduled Meetings</span>
          <span className="block text-xl font-extrabold text-gray-900 mt-1">{globalSummaryStats.totalInstances}</span>
          <span className="block text-[9px] text-gray-500 mt-0.5">Instances occurred</span>
        </div>

        {/* ON-TIME RATE */}
        <div className="bg-white p-4 rounded-xl border border-gray-150 shadow-2xs border-l-4 border-l-emerald-500">
          <span className="block text-[10px] font-extrabold text-[#059669] uppercase tracking-wider flex items-center gap-1">
            <CheckCircle className="w-3.5 h-3.5" /> On-Time Rate
          </span>
          <span className="block text-xl font-extrabold text-emerald-700 mt-1">
            {globalSummaryStats.onTimePercent.toFixed(1)}%
          </span>
          <span className="block text-[9px] text-gray-500 mt-0.5">
            {globalSummaryStats.onTime} of {globalSummaryStats.totalExpectedCheckIns} check-ins
          </span>
        </div>

        {/* LATE RATE */}
        <div className="bg-white p-4 rounded-xl border border-gray-150 shadow-2xs border-l-4 border-l-amber-500">
          <span className="block text-[10px] font-extrabold text-[#d97706] uppercase tracking-wider flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" /> Late Rate (&gt;5m)
          </span>
          <span className="block text-xl font-extrabold text-amber-700 mt-1">
            {globalSummaryStats.latePercent.toFixed(1)}%
          </span>
          <span className="block text-[9px] text-gray-500 mt-0.5">
            {globalSummaryStats.late} late check-ins logged
          </span>
        </div>

        {/* MISSED RATE */}
        <div className="bg-white p-4 rounded-xl border border-gray-150 shadow-2xs border-l-4 border-l-rose-500">
          <span className="block text-[10px] font-extrabold text-[#e11d48] uppercase tracking-wider flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" /> Missed Rate
          </span>
          <span className="block text-xl font-extrabold text-rose-700 mt-1">
            {globalSummaryStats.missedPercent.toFixed(1)}%
          </span>
          <span className="block text-[9px] text-gray-500 mt-0.5">
            {globalSummaryStats.missed} absences recorded
          </span>
        </div>

      </div>

      {/* DETAILED LEDGER CARD */}
      <div className="bg-white rounded-xl border border-gray-150 overflow-hidden shadow-2xs">
        
        {/* LEDGER BAR HEAD */}
        <div className="bg-gray-50 p-4 border-b border-gray-150 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          
          {/* Admin toggles between meeting and user breakdowns */}
          {isAdmin ? (
            <div className="flex bg-white p-0.5 rounded-lg border border-gray-200">
              <button
                onClick={() => setViewMode("meeting")}
                className={`px-3.5 py-1 text-xs font-bold rounded-md transition flex items-center gap-1.5 ${
                  viewMode === "meeting" ? "bg-gray-150 text-gray-900" : "text-gray-500 hover:text-gray-900"
                }`}
              >
                <Calendar className="w-3.5 h-3.5" /> Breakdown by Meeting
              </button>
              <button
                onClick={() => setViewMode("user")}
                className={`px-3.5 py-1 text-xs font-bold rounded-md transition flex items-center gap-1.5 ${
                  viewMode === "user" ? "bg-gray-150 text-gray-900" : "text-gray-500 hover:text-gray-900"
                }`}
              >
                <User className="w-3.5 h-3.5" /> Breakdown by Student
              </button>
            </div>
          ) : (
            <span className="text-xs font-extrabold text-gray-700 uppercase tracking-wider">
              My Personal Attendance Log
            </span>
          )}

          {/* Export Actions */}
          <button
            onClick={handleExportCSV}
            className="flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-700 hover:text-gray-950 hover:bg-gray-50 text-xs font-bold transition shadow-xs"
          >
            <FileDown className="w-3.5 h-3.5 text-gray-500" /> Export Ledger (CSV)
          </button>

        </div>

        {/* --- VIEW MODE: BY MEETING --- */}
        {viewMode === "meeting" && (
          <div className="divide-y divide-gray-100">
            {meetingBreakdown.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-xs font-medium">
                No meeting history instances found for the selected timeframe.
              </div>
            ) : (
              meetingBreakdown.map(({ meeting, stats, onTimeUsers, lateUsers, missedUsers }) => {
                const isExpanded = expandedMeetingId === meeting.id;
                
                return (
                  <div key={meeting.id} className="transition hover:bg-gray-50/50">
                    
                    {/* MEETING SUMMARY HEADER */}
                    <div 
                      onClick={() => setExpandedMeetingId(isExpanded ? null : meeting.id)}
                      className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-extrabold text-gray-900">{meeting.title}</span>
                          <span className="px-2 py-0.5 rounded text-[9px] font-extrabold bg-gray-100 text-gray-600">
                            {meeting.type}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-gray-400 font-semibold">
                          <span>📅 {meeting.date}</span>
                          <span>⏰ {meeting.scheduledStartTime} – {meeting.scheduledEndTime} ({meeting.duration})</span>
                          <span>👤 Organiser: {meeting.organizer}</span>
                        </div>
                      </div>

                      {/* STATS & TOGGLE */}
                      <div className="flex items-center justify-between md:justify-end gap-6 shrink-0">
                        
                        {/* Progress Indicators */}
                        <div className="flex items-center gap-3">
                          
                          {/* On-Time Rate mini indicator */}
                          <div className="text-right">
                            <span className="block text-[10px] font-extrabold text-emerald-600">
                              {stats.onTime} On-Time ({stats.onTimeRate.toFixed(0)}%)
                            </span>
                            <span className="block text-[8px] text-gray-400">Checked in &lt;= 5m</span>
                          </div>

                          {/* Late Rate mini indicator */}
                          <div className="text-right">
                            <span className="block text-[10px] font-extrabold text-amber-600">
                              {stats.late} Late ({stats.lateRate.toFixed(0)}%)
                            </span>
                            <span className="block text-[8px] text-gray-400">Checked in &gt; 5m</span>
                          </div>

                          {/* Missed Rate mini indicator */}
                          <div className="text-right">
                            <span className="block text-[10px] font-extrabold text-rose-600">
                              {stats.missed} Missed ({stats.missedRate.toFixed(0)}%)
                            </span>
                            <span className="block text-[8px] text-gray-400">No Check-in logged</span>
                          </div>

                        </div>

                        {/* Chevron Trigger */}
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
                        )}

                      </div>
                    </div>

                    {/* EXPANDED DETAILS */}
                    {isExpanded && (
                      <div className="bg-gray-50/50 p-5 border-t border-gray-100 space-y-4">
                        
                        {/* ELIGIBILITY STATS BOX */}
                        <div className="bg-white p-3.5 rounded-lg border border-gray-150 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                          <div>
                            <span className="block text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-0.5">Target Levels</span>
                            <span className="font-medium text-gray-700">
                              {meeting.userLevels && meeting.userLevels.length > 0 ? meeting.userLevels.join(", ") : "All User Levels Eligible"}
                            </span>
                          </div>
                          <div>
                            <span className="block text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-0.5">Target Tracks</span>
                            <span className="font-medium text-gray-700">
                              {meeting.targetTeamTrackEligibility && meeting.targetTeamTrackEligibility.length > 0 ? meeting.targetTeamTrackEligibility.join(", ") : "All Tracks Eligible"}
                            </span>
                          </div>
                        </div>

                        {/* COLUMNS: ON-TIME, LATE, MISSED */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          
                          {/* ON-TIME LIST */}
                          <div className="bg-white p-4 rounded-lg border border-gray-150 space-y-2.5">
                            <h4 className="text-[10px] font-extrabold text-emerald-700 uppercase tracking-wider flex items-center gap-1 border-b border-gray-100 pb-1.5">
                              <CheckCircle className="w-3.5 h-3.5" /> On-Time List ({onTimeUsers.length})
                            </h4>
                            {onTimeUsers.length === 0 ? (
                              <span className="block text-[10px] text-gray-400 font-medium py-1">No students checked in on-time.</span>
                            ) : (
                              <div className="divide-y divide-gray-100 max-h-56 overflow-y-auto">
                                {onTimeUsers.map(u => (
                                  <div key={u.id} className="py-2 flex items-center justify-between text-xs">
                                    <div>
                                      <span className="block font-bold text-gray-800">{u.fullName}</span>
                                      <span className="block text-[9px] text-gray-400">{u.track}</span>
                                    </div>
                                    {isAdmin && (
                                      <button 
                                        onClick={() => {
                                          setEditingRecord({ userId: u.id, meetingId: meeting.meetingId, meetingDate: meeting.date, currentStatus: "Attended" });
                                          setNewStatusValue("Attended");
                                        }}
                                        className="text-gray-400 hover:text-[#4B5E40] transition p-1"
                                        title="Correction Override"
                                      >
                                        <Edit2 className="w-3 h-3" />
                                      </button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* LATE LIST */}
                          <div className="bg-white p-4 rounded-lg border border-gray-150 space-y-2.5">
                            <h4 className="text-[10px] font-extrabold text-amber-700 uppercase tracking-wider flex items-center gap-1 border-b border-gray-100 pb-1.5">
                              <Clock className="w-3.5 h-3.5" /> Late List ({lateUsers.length})
                            </h4>
                            {lateUsers.length === 0 ? (
                              <span className="block text-[10px] text-gray-400 font-medium py-1">No students checked in late.</span>
                            ) : (
                              <div className="divide-y divide-gray-100 max-h-56 overflow-y-auto">
                                {lateUsers.map(u => (
                                  <div key={u.id} className="py-2 flex items-center justify-between text-xs">
                                    <div>
                                      <span className="block font-bold text-gray-800">{u.fullName}</span>
                                      <span className="block text-[9px] text-gray-400">{u.track}</span>
                                    </div>
                                    {isAdmin && (
                                      <button 
                                        onClick={() => {
                                          setEditingRecord({ userId: u.id, meetingId: meeting.meetingId, meetingDate: meeting.date, currentStatus: "Late" });
                                          setNewStatusValue("Late");
                                        }}
                                        className="text-gray-400 hover:text-[#4B5E40] transition p-1"
                                        title="Correction Override"
                                      >
                                        <Edit2 className="w-3 h-3" />
                                      </button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* MISSED LIST */}
                          <div className="bg-white p-4 rounded-lg border border-gray-150 space-y-2.5">
                            <h4 className="text-[10px] font-extrabold text-rose-700 uppercase tracking-wider flex items-center gap-1 border-b border-gray-100 pb-1.5">
                              <AlertTriangle className="w-3.5 h-3.5" /> Missed/Absent ({missedUsers.length})
                            </h4>
                            {missedUsers.length === 0 ? (
                              <span className="block text-[10px] text-gray-400 font-medium py-1">No missed records for this session.</span>
                            ) : (
                              <div className="divide-y divide-gray-100 max-h-56 overflow-y-auto">
                                {missedUsers.map(u => (
                                  <div key={u.id} className="py-2 flex items-center justify-between text-xs">
                                    <div>
                                      <span className="block font-bold text-rose-700">{u.fullName}</span>
                                      <span className="block text-[9px] text-gray-400">{u.track}</span>
                                    </div>
                                    {isAdmin && (
                                      <button 
                                        onClick={() => {
                                          setEditingRecord({ userId: u.id, meetingId: meeting.meetingId, meetingDate: meeting.date, currentStatus: "Missed" });
                                          setNewStatusValue("Missed");
                                        }}
                                        className="text-gray-400 hover:text-[#4B5E40] transition p-1"
                                        title="Correction Override"
                                      >
                                        <Edit2 className="w-3 h-3" />
                                      </button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                        </div>

                      </div>
                    )}

                  </div>
                );
              })
            )}
          </div>
        )}

        {/* --- VIEW MODE: BY USER --- */}
        {viewMode === "user" && (
          <div className="divide-y divide-gray-100">
            {userBreakdown.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-xs font-medium">
                No matching student records found.
              </div>
            ) : (
              userBreakdown.map(({ user, stats, records }) => {
                const isExpanded = expandedUserId === user.id;

                return (
                  <div key={user.id} className="transition hover:bg-gray-50/50">
                    
                    {/* USER SUMMARY HEADER */}
                    <div 
                      onClick={() => setExpandedUserId(isExpanded ? null : user.id)}
                      className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-extrabold text-gray-900">{user.fullName}</span>
                          <span className="text-[10px] text-gray-500 font-medium">@{user.username}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-gray-400 font-semibold">
                          <span>🏢 Track: {user.track}</span>
                          <span>📈 Level: {user.learningLevel || "Apprentice level 1"}</span>
                        </div>
                      </div>

                      {/* STATS & TOGGLE */}
                      <div className="flex items-center justify-between md:justify-end gap-6 shrink-0">
                        
                        {/* Attendance percentage badges */}
                        <div className="flex items-center gap-4 text-xs font-bold">
                          <div className="text-right">
                            <span className="block text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Required Sessions</span>
                            <span className="block text-gray-800 font-extrabold">{stats.total} total</span>
                          </div>

                          <div className="text-right">
                            <span className="block text-[10px] font-extrabold text-emerald-600 uppercase tracking-wider">On-Time</span>
                            <span className="block text-emerald-700 font-extrabold">{stats.onTime} ({stats.onTimeRate.toFixed(0)}%)</span>
                          </div>

                          <div className="text-right">
                            <span className="block text-[10px] font-extrabold text-amber-600 uppercase tracking-wider">Late</span>
                            <span className="block text-amber-700 font-extrabold">{stats.late} ({stats.lateRate.toFixed(0)}%)</span>
                          </div>

                          <div className="text-right">
                            <span className="block text-[10px] font-extrabold text-rose-600 uppercase tracking-wider">Missed</span>
                            <span className="block text-rose-700 font-extrabold">{stats.missed} ({stats.missedRate.toFixed(0)}%)</span>
                          </div>
                        </div>

                        {/* Chevron Trigger */}
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
                        )}

                      </div>
                    </div>

                    {/* EXPANDED DETAILS */}
                    {isExpanded && (
                      <div className="bg-gray-50/50 p-5 border-t border-gray-100">
                        <div className="bg-white rounded-lg border border-gray-150 overflow-x-auto">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="bg-gray-50 border-b border-gray-150 text-[9px] uppercase tracking-wider font-extrabold text-gray-400">
                                <th className="p-3 pl-4">Meeting Title</th>
                                <th className="p-3">Category</th>
                                <th className="p-3">Scheduled Date</th>
                                <th className="p-3">Scheduled Time</th>
                                <th className="p-3">Check-in Status</th>
                                {isAdmin && <th className="p-3 text-right pr-4">Override</th>}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 font-semibold text-gray-600">
                              {records.length === 0 ? (
                                <tr>
                                  <td colSpan={isAdmin ? 6 : 5} className="p-4 text-center text-gray-400 text-xs">
                                    No scheduled sessions recorded for this student in the current timeframe.
                                  </td>
                                </tr>
                              ) : (
                                records.map(({ meeting, status, checkInTime }) => (
                                  <tr key={meeting.id} className="hover:bg-gray-50/50 transition">
                                    <td className="p-3 pl-4 font-bold text-gray-900">{meeting.title}</td>
                                    <td className="p-3">
                                      <span className="px-2 py-0.5 rounded text-[9px] font-extrabold bg-gray-100 text-gray-500">
                                        {meeting.type}
                                      </span>
                                    </td>
                                    <td className="p-3 font-medium">{meeting.date}</td>
                                    <td className="p-3 font-medium">{meeting.scheduledStartTime}</td>
                                    <td className="p-3">
                                      {status === "Attended" ? (
                                        <span className="inline-flex items-center gap-1 text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md text-[10px]">
                                          <CheckCircle className="w-3 h-3" /> On-Time
                                        </span>
                                      ) : status === "Late" ? (
                                        <span className="inline-flex items-center gap-1 text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-md text-[10px]">
                                          <Clock className="w-3 h-3" /> Late (Logged {checkInTime})
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 text-rose-600 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-md text-[10px]">
                                          <AlertTriangle className="w-3 h-3" /> Missed
                                        </span>
                                      )}
                                    </td>
                                    {isAdmin && (
                                      <td className="p-3 text-right pr-4">
                                        <button 
                                          onClick={() => {
                                            setEditingRecord({ userId: user.id, meetingId: meeting.meetingId, meetingDate: meeting.date, currentStatus: status });
                                            setNewStatusValue(status === "Attended" ? "Attended" : (status === "Late" ? "Late" : "Missed"));
                                          }}
                                          className="text-gray-400 hover:text-[#4B5E40] transition p-1"
                                          title="Correction Override"
                                        >
                                          <Edit2 className="w-3.5 h-3.5" />
                                        </button>
                                      </td>
                                    )}
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                  </div>
                );
              })
            )}
          </div>
        )}

      </div>

      {/* RECENT CORRECTIONS AUDIT TRAIL FEED */}
      {isAdmin && state.attendanceAuditLogs && state.attendanceAuditLogs.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-150 overflow-hidden shadow-2xs">
          <div className="bg-gray-50 p-4 border-b border-gray-150 flex items-center justify-between">
            <h3 className="font-extrabold text-sm text-gray-950 flex items-center gap-1.5">
              <Shield className="w-4.5 h-4.5 text-[#4B5E40]" /> Administrative Audit Trails
            </h3>
            <span className="text-[10px] font-extrabold text-[#4B5E40] uppercase tracking-wider bg-emerald-50 px-2 py-0.5 rounded-md">
              Integrity Active
            </span>
          </div>
          <div className="divide-y divide-gray-100 max-h-72 overflow-y-auto">
            {state.attendanceAuditLogs.slice().reverse().map(log => (
              <div key={log.id} className="p-4 text-xs space-y-1 hover:bg-gray-50/55 transition">
                <div className="flex items-center justify-between text-gray-400">
                  <span className="font-semibold">🔑 Administrator: @{log.adminUsername}</span>
                  <span className="font-medium text-[10px]">
                    {new Date(log.timestamp).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                  </span>
                </div>
                <p className="font-bold text-gray-800 leading-normal">{log.action}</p>
                <div className="flex gap-4 text-[10px] text-gray-400">
                  <span>Meeting Date: {log.meetingDate || "N/A"}</span>
                  <span>Previous Status: {log.previousStatus}</span>
                  <span>New Status: {log.newStatus}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ADMINISTRATIVE OVERRIDE DIALOG / INLINE SHEET MODAL */}
      {editingRecord && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl border border-gray-150 w-full max-w-md overflow-hidden animate-fade-in text-xs">
            
            {/* Modal Head */}
            <div className="bg-gray-50 p-4 border-b border-gray-150 flex items-center justify-between">
              <span className="font-extrabold text-gray-900 flex items-center gap-1.5">
                <Shield className="w-4.5 h-4.5 text-amber-600" /> Manual Correction Ledger Override
              </span>
              <button 
                onClick={() => {
                  setEditingRecord(null);
                  setActionErrorMsg("");
                  setActionSuccessMsg("");
                }}
                className="text-gray-400 hover:text-gray-700 font-bold text-base cursor-pointer p-1"
              >
                &times;
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              
              {/* Messages alerts */}
              {actionErrorMsg && (
                <div className="p-3 bg-rose-50 text-rose-700 rounded-lg border border-rose-100 font-bold">
                  {actionErrorMsg}
                </div>
              )}

              {actionSuccessMsg && (
                <div className="p-3 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-100 font-bold">
                  {actionSuccessMsg}
                </div>
              )}

              {/* Status change Selector */}
              <div className="space-y-2">
                <label className="block text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">
                  Target Attendance Status
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(["Attended", "Late", "Missed"] as const).map(status => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setNewStatusValue(status)}
                      className={`py-2 px-3.5 rounded-lg border text-center transition font-bold ${
                        newStatusValue === status 
                          ? (status === "Attended" ? "bg-emerald-50 border-emerald-500 text-emerald-700" : (status === "Late" ? "bg-amber-50 border-amber-500 text-amber-700" : "bg-rose-50 border-rose-500 text-rose-700"))
                          : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      {status === "Attended" ? "On-Time" : status}
                    </button>
                  ))}
                </div>
              </div>

              {/* Warnings about immutable historical ledger */}
              <div className="bg-amber-50 p-3 rounded-lg border border-amber-100 text-[11px] text-amber-800 leading-normal font-medium">
                ⚠️ <b>Ledger Integrity Notice:</b> This meeting is currently locked in historical archives. Applying this correction will leave a permanent, immutable administrative audit trail in the ledger.
              </div>

            </div>

            {/* Modal Foot */}
            <div className="bg-gray-50 p-3.5 border-t border-gray-150 flex items-center justify-end gap-2.5">
              <button
                onClick={() => {
                  setEditingRecord(null);
                  setActionErrorMsg("");
                  setActionSuccessMsg("");
                }}
                className="px-3.5 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-700 hover:text-gray-900 text-xs font-bold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateStatus}
                className="px-4 py-1.5 rounded-lg bg-[#4B5E40] hover:bg-[#3D4C34] text-white text-xs font-bold shadow-xs transition cursor-pointer flex items-center gap-1.5"
              >
                Confirm override
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
