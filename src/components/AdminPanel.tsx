import React, { useState, useRef, useEffect } from "react";
import {
  Profile,
  AttendanceRecord,
  WeeklyDrillSubmission,
  WeeklyDrill,
} from "../types";
import { getCleanTrackName, getLagosDateString } from "../utils/trackUtils";
import {
  saveMeetingType,
  deleteMeetingType,
  reviewStudent,
  addDrill,
  gradeDrillSubmission,
  sendReminder,
  changeLevel,
  assignTask,
  saveMeeting,
  deleteMeeting,
  triggerSimulatedCron,
  assignMicroserviceOwner,
  assignKDCount,
  updateAppConfigField
} from "../firebaseService";
import { toast } from "./Toast";
import {
  Users,
  BarChart4,
  ShieldCheck,
  Plus,
  Send,
  FileDown,
  Cpu,
  Calendar,
  CheckCircle,
  AlertOctagon,
  Award,
  Search,
  Filter,
  BookOpen,
  FileEdit,
  Check,
  X,
  ChevronDown,
  Trash2,
  Edit2,
  History,
  Settings,
  Layers,
  GraduationCap,
  Laptop,
  Compass,
  Sparkles
} from "lucide-react";
import AttendanceHistoryTab from "./AttendanceHistoryTab";

const LEVELS_OPTIONS = [
  "Apprentice level 1",
  "Apprentice level 2",
  "Apprentice level 3",
  "Volunteer beginner level",
  "Volunteer intermediate level",
  "Junior associate level 1",
  "Junior associate level 2",
  "Junior associate level 3",
  "Senior associate level 1",
  "Senior associate level 2",
  "Senior associate level 3",
  "Mentor",
  "Admin",
  "Intern",
  "Trainee Level 1",
  "Trainee Level 2",
  "Trainee Level 3",
  "Global Techie 0",
  "Global Techie 1",
  "Global Techie 2",
  "Global Techie 3",
];

const ELIGIBILITY_TRACK_GROUPS = [
  {
    category: "Global",
    options: ["All User Eligible"],
  },
  {
    category: "Apprentice",
    options: [
      "Apprentice level 1",
      "Apprentice level 2",
      "Apprentice level 3",
    ],
  },
  {
    category: "Intern",
    options: ["Intern"],
  },
  {
    category: "Trainee",
    options: ["Trainee – Level 1", "Trainee – Level 2", "Trainee – Level 3"],
  },
  {
    category: "Volunteer",
    options: [
      "Volunteer beginner level",
      "Volunteer intermediate level",
      "Volunteer – Expert Level",
    ],
  },
  {
    category: "Junior Assoc",
    options: [
      "Junior associate level 1",
      "Junior associate level 2",
      "Junior associate level 3",
    ],
  },
  {
    category: "Senior Assoc",
    options: [
      "Senior associate level 1",
      "Senior associate level 2",
      "Senior associate level 3",
    ],
  },
  {
    category: "Mentor",
    options: ["Mentor"],
  },
  {
    category: "Global Techie",
    options: [
      "Global Techie – Level 1",
      "Global Techie – Level 2",
      "Global Techie – Level 3",
    ],
  },
];

const FLATTENED_ELIGIBILITY_OPTIONS = ELIGIBILITY_TRACK_GROUPS.reduce<string[]>(
  (acc, group) => {
    return [...acc, ...group.options];
  },
  [],
);

const TEAM_TRACK_OPTIONS = [
  "PMO Bincom Dev Center",
  "PMO eMigr8",
  "PMO Bincom Global/Bincom ICT",
  "Cybersecurity",
  "PHP/Backend",
  "Infrastructure/DevOps",
  "Python/Data Science",
  "Mobile App/Advanced Frontend",
  "Graphics/UI/UX Design",
  "Proservice",
  "C#",
  "Digital Marketing",
  "eMigr8 AI Product",
];

const getUserLevelsDisplay = (trackId: any, userLevels?: any): string => {
  const levels = userLevels !== undefined ? userLevels : trackId;
  if (
    !levels ||
    (Array.isArray(levels) && levels.length === 0) ||
    levels === "All" ||
    levels === ""
  ) {
    return "All User Levels";
  }
  if (Array.isArray(levels)) {
    const filtered = levels.filter(
      (l) =>
        l &&
        l !== "All User Eligible" &&
        l !== "All User Level" &&
        l !== "All Tracks Eligibility",
    );
    if (filtered.length === 0) {
      return "All User Levels";
    }
    return filtered.join(", ");
  }
  if (
    levels === "All User Eligible" ||
    levels === "All User Level" ||
    levels === "All Tracks Eligibility"
  ) {
    return "All User Levels";
  }
  return String(levels);
};

const getTeamTracksDisplay = (targetTeamTrackEligibility?: any): string => {
  if (
    !targetTeamTrackEligibility ||
    (Array.isArray(targetTeamTrackEligibility) &&
      targetTeamTrackEligibility.length === 0)
  ) {
    return "All Team Tracks";
  }
  if (Array.isArray(targetTeamTrackEligibility)) {
    return targetTeamTrackEligibility.join(", ");
  }
  return String(targetTeamTrackEligibility);
};

const getMeetingTypeLabel = (type: string): string => {
  if (!type) return "";
  const t = type.toLowerCase().trim();
  if (t === "knowledge" || t === "knowledge sharing hub session") return "Knowledge Track";
  if (t === "microservice" || t === "standup" || t === "weekly progress standup" || t === "weekly progress standup room") return "Microservices";
  if (t === "project" || t === "pd" || t === "personal development (pd) session") return "Project";
  return type;
};

const ALL_DAYS_OF_WEEK = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

interface AdminPanelProps {
  adminProfile?: Profile;
  state: any;
  onStateUpdate: () => void;
}

export default function AdminPanel({
  adminProfile,
  state,
  onStateUpdate,
}: AdminPanelProps) {
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

  const [loading, setLoading] = useState(false);
  const [purgingDb, setPurgingDb] = useState(false);
  const [seedingDb, setSeedingDb] = useState(false);
  const [meetingToDeleteId, setMeetingToDeleteId] = useState<string | null>(
    null,
  );
  const [isDeletingMeeting, setIsDeletingMeeting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Default Tasks Editor States
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [taskEditorTitle, setTaskEditorTitle] = useState("");
  const [taskEditorDesc, setTaskEditorDesc] = useState("");
  const [taskEditorDue, setTaskEditorDue] = useState("");
  const [taskEditorPriority, setTaskEditorPriority] = useState<"High" | "Medium" | "Low">("Medium");

  // Dashboard Microservices Editor States
  const [editingMicroserviceId, setEditingMicroserviceId] = useState<string | null>(null);
  const [msEditorTitle, setMsEditorTitle] = useState("");
  const [msEditorDesc, setMsEditorDesc] = useState("");
  const [msEditorLinkText, setMsEditorLinkText] = useState("");
  const [msEditorTab, setMsEditorTab] = useState("");
  const [msEditorSubTab, setMsEditorSubTab] = useState("");
  const [msEditorIcon, setMsEditorIcon] = useState("");

  // Career Pathways Editor States
  const [editingPathwaySection, setEditingPathwaySection] = useState<"foundation" | "trackSplit" | "lateralRoles" | null>(null);
  const [editingPathwayIndex, setEditingPathwayIndex] = useState<number | null>(null);
  const [pathwayEditorTitle, setPathwayEditorTitle] = useState("");
  const [pathwayEditorDesc, setPathwayEditorDesc] = useState("");

  // Custom iframe-safe dialog confirmation state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    isDanger?: boolean;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  const showConfirm = (options: {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    isDanger?: boolean;
    onConfirm: () => void;
  }) => {
    setConfirmDialog({
      isOpen: true,
      title: options.title,
      message: options.message,
      confirmText: options.confirmText,
      cancelText: options.cancelText,
      isDanger: options.isDanger,
      onConfirm: () => {
        options.onConfirm();
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  // Sub-tabs states
  const [selectedOwners, setSelectedOwners] = useState<Record<string, string>>(
    {},
  );
  const [selectedUserLevels, setSelectedUserLevels] = useState<
    Record<string, string>
  >({});
  const [levelSearch, setLevelSearch] = useState("");

  // KD, PD, and Standup desk dashboards states
  const [kdSearch, setKdSearch] = useState("");
  const [kdTrackFilter, setKdTrackFilter] = useState("all");
  const [kdEdits, setKdEdits] = useState<Record<string, string>>({});

  const [pdSearch, setPdSearch] = useState("");
  const [pdTrackFilter, setPdTrackFilter] = useState("all");

  const [standupSearch, setStandupSearch] = useState("");
  const [standupTrackFilter, setStandupTrackFilter] = useState("all");

  // Search & Filter state variables
  const [reviewSearch, setReviewSearch] = useState("");
  const [reviewStatusFilter, setReviewStatusFilter] = useState("all");
  const [reviewTrackFilter, setReviewTrackFilter] = useState("all");

  const [drillTrackFilter, setDrillTrackFilter] = useState("all");
  const [drillStatusFilter, setDrillStatusFilter] = useState("all");

  const [funnelTrackFilter, setFunnelTrackFilter] = useState("all");
  const [dispatchTrackFilter, setDispatchTrackFilter] = useState("all");

  // Owner form states
  const [drillTitle, setDrillTitle] = useState("");
  const [drillDesc, setDrillDesc] = useState("");
  const [drillLink, setDrillLink] = useState("");

  // Reminder alert states
  const [targetStudentId, setTargetStudentId] = useState("");
  const [reminderMsg, setReminderMsg] = useState("");

  // Grade Drill states
  const [gradingSubId, setGradingSubId] = useState("");
  const [gradingStatus, setGradingStatus] = useState<"Approved" | "Rejected">(
    "Approved",
  );
  const [gradingFeedback, setGradingFeedback] = useState("");

  // Custom Assigned Task States
  const [assigningTaskId, setAssigningTaskId] = useState<string | null>(null);
  const [customTaskTitle, setCustomTaskTitle] = useState("");
  const [customTaskDesc, setCustomTaskDesc] = useState("");
  const [customTaskDue, setCustomTaskDue] = useState(
    "Every Sunday 11:59 PM WAT",
  );
  const [customTaskPriority, setCustomTaskPriority] = useState<
    "High" | "Medium" | "Low"
  >("Medium");

  // Meetings management form states
  const [editingMeetingId, setEditingMeetingId] = useState<string | null>(null);
  const [meetingTitle, setMeetingTitle] = useState("");
  const [meetingTime, setMeetingTime] = useState("");
  const [meetingUrl, setMeetingUrl] = useState("");
  const [meetingType, setMeetingType] = useState("Knowledge Track");
  const [meetingTrack, setMeetingTrack] = useState<string[]>([]);
  const [meetingTeamTracks, setMeetingTeamTracks] = useState<string[]>([]);
  const [meetingScheduleDays, setMeetingScheduleDays] = useState<string[]>([
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
  ]);
  const [meetingDates, setMeetingDates] = useState<string[]>([]);
  const [currentPickedDate, setCurrentPickedDate] = useState("");
  const [allowPastDates, setAllowPastDates] = useState(false);
  const [isAddingMeeting, setIsAddingMeeting] = useState(false);

  // Custom Meeting specifications states
  const [meetingDuration, setMeetingDuration] = useState("60 minutes");
  const [meetingOrganizer, setMeetingOrganizer] = useState("Admin Team");
  const [meetingStatus, setMeetingStatus] = useState("Upcoming");
  const [meetingDescription, setMeetingDescription] = useState("");
  const [meetingAssignedUsers, setMeetingAssignedUsers] = useState<string[]>([]);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [userSearchText, setUserSearchText] = useState("");
  const assignedUsersRef = useRef<HTMLDivElement>(null);

  // Combobox dropdown state managers
  const [comboboxOpen, setComboboxOpen] = useState(false);
  const [comboboxSearch, setComboboxSearch] = useState("");
  const [comboboxFocusIndex, setComboboxFocusIndex] = useState(-1);
  const comboboxRef = useRef<HTMLDivElement>(null);

  // Target Team Track Eligibility dropdown state managers
  const [teamTracksSearch, setTeamTracksSearch] = useState("");
  const [teamTracksOpen, setTeamTracksOpen] = useState(false);
  const [teamTracksFocusIndex, setTeamTracksFocusIndex] = useState(-1);
  const teamTracksRef = useRef<HTMLDivElement>(null);

  // Dynamic Meeting Type Management state vars
  const [meetingTypeSearch, setMeetingTypeSearch] = useState("");
  const [meetingTypeDropdownOpen, setMeetingTypeDropdownOpen] = useState(false);
  const [isAddingNewTypeInline, setIsAddingNewTypeInline] = useState(false);
  const [newTypeInputValue, setNewTypeInputValue] = useState("");
  const [editingTypeName, setEditingTypeName] = useState<string | null>(null);
  const [editingTypeValue, setEditingTypeValue] = useState("");
  const [allowDeleteSystemTypes, setAllowDeleteSystemTypes] = useState(false);
  const meetingTypeRef = useRef<HTMLDivElement>(null);

  // Dynamic current date/time coordinator for active meetings
  const [currentDateState, setCurrentDateState] = useState<Date>(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentDateState(new Date());
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const todayDateStr = getLagosDateString(currentDateState);
  const todayDayName = (() => {
    try {
      return new Intl.DateTimeFormat("en-US", {
        timeZone: "Africa/Lagos",
        weekday: "long"
      }).format(currentDateState);
    } catch (e) {
      const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      return days[currentDateState.getDay()];
    }
  })();
  const formattedTodayDate = (() => {
    try {
      return new Intl.DateTimeFormat("en-US", {
        timeZone: "Africa/Lagos",
        month: "long",
        day: "numeric",
        year: "numeric"
      }).format(currentDateState);
    } catch (e) {
      return currentDateState.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric"
      });
    }
  })();

  const isMeetingScheduledForToday = (meeting: any): boolean => {
    if (meeting.status && meeting.status.trim().toLowerCase() === "archived") {
      return false;
    }
    if (meeting.meetingDates && Array.isArray(meeting.meetingDates) && meeting.meetingDates.length > 0) {
      return meeting.meetingDates.includes(todayDateStr);
    }
    const days = meeting.scheduleDays && meeting.scheduleDays.length > 0
      ? meeting.scheduleDays
      : ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
      
    return days.some((day: string) => day.trim().toLowerCase() === todayDayName.toLowerCase());
  };

  const getAdminMeetingDateLabel = (meeting: any): string => {
    const isToday = isMeetingScheduledForToday(meeting);
    if (isToday) {
      return `Today (${formattedTodayDate})`;
    }
    if (meeting.meetingDates && Array.isArray(meeting.meetingDates) && meeting.meetingDates.length > 0) {
      const firstDateStr = meeting.meetingDates[0];
      try {
        const parts = firstDateStr.split("-");
        if (parts.length === 3) {
          const year = parseInt(parts[0], 10);
          const month = parseInt(parts[1], 10) - 1;
          const day = parseInt(parts[2], 10);
          const d = new Date(year, month, day);
          return new Intl.DateTimeFormat("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric"
          }).format(d);
        }
      } catch (e) {}
      return firstDateStr;
    }
    const days = meeting.scheduleDays && meeting.scheduleDays.length > 0
      ? meeting.scheduleDays.join(", ")
      : "Monday, Tuesday, Wednesday, Thursday, Friday";
    return `Upcoming: ${days}`;
  };

  // Click outside to close dropdown ref handler
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        comboboxRef.current &&
        !comboboxRef.current.contains(event.target as Node)
      ) {
        setComboboxOpen(false);
      }
      if (
        teamTracksRef.current &&
        !teamTracksRef.current.contains(event.target as Node)
      ) {
        setTeamTracksOpen(false);
      }
      if (
        meetingTypeRef.current &&
        !meetingTypeRef.current.contains(event.target as Node)
      ) {
        setMeetingTypeDropdownOpen(false);
      }
      if (
        assignedUsersRef.current &&
        !assignedUsersRef.current.contains(event.target as Node)
      ) {
        setUserDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleCreateMeetingType = async (
    typeName: string,
    oldName?: string,
  ) => {
    const cleanName = typeName.trim();
    if (!cleanName) {
      triggerError("Meeting type name cannot be empty.");
      return;
    }
    setLoading(true);
    try {
      await saveMeetingType(cleanName, oldName);

      onStateUpdate();
      triggerSuccess(
        oldName
          ? "Meeting type title updated!"
          : "New meeting type registered successfully!",
      );
      setNewTypeInputValue("");
      setIsAddingNewTypeInline(false);
      setEditingTypeName(null);
      setMeetingType(cleanName);
    } catch (err: any) {
      triggerError("Failed to save meeting type: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Delete Meeting Type Modal States
  const [meetingTypeToDelete, setMeetingTypeToDelete] = useState<string | null>(
    null,
  );
  const [isDeletingMeetingType, setIsDeletingMeetingType] = useState(false);
  const [showRelatedMeetings, setShowRelatedMeetings] = useState(false);

  const handleDeleteMeetingType = (typeName: string) => {
    const isSystemDefault = [
      "knowledge sharing hub session",
      "weekly progress standup",
      "weekly progress standup room",
      "personal development (pd) session",
    ].includes(typeName.toLowerCase());

    if (isSystemDefault && !allowDeleteSystemTypes) {
      triggerError(
        "Default system meeting types cannot be deleted unless super administrator override is enabled.",
      );
      return;
    }

    setMeetingTypeToDelete(typeName);
    setShowRelatedMeetings(false);
  };

  const handleConfirmDeleteMeetingType = async () => {
    if (!meetingTypeToDelete) return;
    setIsDeletingMeetingType(true);
    try {
      await deleteMeetingType(meetingTypeToDelete);

      onStateUpdate();
      triggerSuccess(
        `Meeting type "${meetingTypeToDelete}" deleted successfully.`,
      );
      if (meetingType === meetingTypeToDelete) {
        setMeetingType("Knowledge Track");
      }
      setMeetingTypeToDelete(null);
    } catch (err: any) {
      triggerError("Failed to delete meeting type: " + err.message);
    } finally {
      setIsDeletingMeetingType(false);
    }
  };

  // Attendance tracking state
  const [expandedAttendanceMeetingId, setExpandedAttendanceMeetingId] = useState<string | null>(null);
  const [attendanceFilterTab, setAttendanceFilterTab] = useState<"all" | "attended" | "absent">("all");

  // Combobox list modifiers and search processors
  const handleSelectTrack = (track: string) => {
    if (track === "All User Eligible") {
      setMeetingTrack(["All User Eligible"]);
    } else {
      setMeetingTrack((prev) => {
        const removedAll = prev.filter((t) => t !== "All User Eligible");
        if (removedAll.includes(track)) {
          return removedAll.filter((t) => t !== track);
        } else {
          return [...removedAll, track];
        }
      });
    }
  };

  const handleRemoveTrack = (track: string) => {
    setMeetingTrack((prev) => prev.filter((t) => t !== track));
  };

  const handleClearAllTracks = () => {
    setMeetingTrack([]);
  };

  const getGroupedFilteredOptions = () => {
    const term = comboboxSearch.trim().toLowerCase();
    if (!term) return ELIGIBILITY_TRACK_GROUPS;

    return ELIGIBILITY_TRACK_GROUPS.map((group) => {
      const matchedOptions = group.options.filter((opt) =>
        opt.toLowerCase().includes(term),
      );
      return { ...group, options: matchedOptions };
    }).filter((group) => group.options.length > 0);
  };

  const groupedFilteredOptions = getGroupedFilteredOptions();
  const flatVisibleOptions = groupedFilteredOptions.reduce<string[]>(
    (acc, grp) => [...acc, ...grp.options],
    [],
  );

  // Multi-Selection helper functions for Target Team Track Eligibility
  const handleSelectTeamTrack = (track: string) => {
    setMeetingTeamTracks((prev) => {
      if (prev.includes(track)) {
        return prev.filter((t) => t !== track);
      } else {
        return [...prev, track];
      }
    });
  };

  const handleRemoveTeamTrack = (track: string) => {
    setMeetingTeamTracks((prev) => prev.filter((t) => t !== track));
  };

  const handleClearAllTeamTracks = () => {
    setMeetingTeamTracks([]);
  };

  const handleSelectAllTeamTracks = () => {
    setMeetingTeamTracks([...TEAM_TRACK_OPTIONS]);
  };

  const getFilteredTeamTrackOptions = () => {
    const term = teamTracksSearch.trim().toLowerCase();
    if (!term) return TEAM_TRACK_OPTIONS;
    return TEAM_TRACK_OPTIONS.filter((opt) => opt.toLowerCase().includes(term));
  };

  const filteredTeamTrackOptions = getFilteredTeamTrackOptions();

  // Cron logs simulation state
  const [cronLogs, setCronLogs] = useState<string[]>([]);
  const [cronRunning, setCronRunning] = useState(false);

  // CSV table toggle/preview
  const [csvPreview, setCsvPreview] = useState(false);

  const triggerSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setErrorMsg("");
    toast.success(msg);
    setTimeout(() => setSuccessMsg(""), 3500);
  };

  const triggerError = (msg: string) => {
    setErrorMsg(msg);
    setSuccessMsg("");
    toast.error(msg);
  };

  // --- 1. COMPUTING METRICS ---
  const adminIsTrackScoped = !!(
    adminProfile &&
    adminProfile.track &&
    adminProfile.track !== "All"
  );
  const adminTrackName = adminProfile
    ? getCleanTrackName(adminProfile.track)
    : "";

  const totalProfiles = state.profiles.length;
  const allStandardUsers = state.profiles.filter((p) => p.role === "user");
  const standardUsers = adminIsTrackScoped
    ? allStandardUsers.filter(
        (u) => getCleanTrackName(u.track) === adminTrackName,
      )
    : allStandardUsers;

  const totalSignupsCount = standardUsers.length;

  const uniqueTracksForDropdown = Array.from(
    new Set(allStandardUsers.map((u) => getCleanTrackName(u.track))),
  )
    .filter((track: any) => track && typeof track === "string" && track.toLowerCase() !== "all")
    .sort();

  // Filter funnel metrics by track if scoped
  const filteredUsersForFunnel =
    funnelTrackFilter === "all"
      ? standardUsers
      : standardUsers.filter(
          (u) => getCleanTrackName(u.track) === funnelTrackFilter,
        );

  // Funnel calculations based on user status (OnboardingStatus)
  const stepOnboarding = filteredUsersForFunnel.length; // Everyone starts here
  const stepAssessmentPassed = filteredUsersForFunnel.filter(
    (p) =>
      ["assessment_passed", "oriented", "dashboard"].includes(p.status) ||
      (p.score !== undefined && p.score >= 50),
  ).length;
  const stepOriented = filteredUsersForFunnel.filter((p) =>
    ["oriented", "dashboard"].includes(p.status),
  ).length;
  const stepDashboardActive = filteredUsersForFunnel.filter(
    (p) => p.status === "dashboard",
  ).length;

  const passedScores = filteredUsersForFunnel
    .filter((p) => p.score !== undefined)
    .map((p) => p.score as number);
  const averageAssessmentScore =
    passedScores.length > 0
      ? Math.round(
          passedScores.reduce((acc, curr) => acc + curr, 0) /
            passedScores.length,
        )
      : 0;

  const passedCount = filteredUsersForFunnel.filter(
    (p) => p.score !== undefined && p.score >= 50,
  ).length;
  const passRate =
    passedScores.length > 0
      ? Math.round(((passedCount / passedScores.length) * 105) / 1.05) // normal round
      : 0;

  // Filter standard users for the Reviews tab
  const filteredUsersForReviews = standardUsers.filter((u) => {
    const matchesSearch =
      !reviewSearch ||
      u.fullName.toLowerCase().includes(reviewSearch.toLowerCase()) ||
      u.username.toLowerCase().includes(reviewSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(reviewSearch.toLowerCase());

    const matchesStatus =
      reviewStatusFilter === "all" || u.status === reviewStatusFilter;
    const matchesTrack =
      reviewTrackFilter === "all" ||
      getCleanTrackName(u.track) === reviewTrackFilter;

    return matchesSearch && matchesStatus && matchesTrack;
  });

  // Filter homework drill submissions for the Grading desk
  const allowedSubmissions = adminIsTrackScoped
    ? state.drillSubmissions.filter(
        (sub) => getCleanTrackName(sub.track) === adminTrackName,
      )
    : state.drillSubmissions;

  const filteredSubmissions = allowedSubmissions.filter((sub) => {
    const matchesTrack =
      drillTrackFilter === "all" ||
      getCleanTrackName(sub.track) === drillTrackFilter;
    const matchesStatus =
      drillStatusFilter === "all" || sub.status === drillStatusFilter;
    return matchesTrack && matchesStatus;
  });

  // --- 2. CONTROLLERS ---

  // Onboard review trigger
  const handleStudentAction = async (studentId: string, action: string) => {
    setLoading(true);
    try {
      await reviewStudent(studentId, action);

      triggerSuccess(
        `Student status updated successfully via action: ${action}`,
      );
      onStateUpdate();
    } catch (e: any) {
      triggerError("Placement failed: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  // Create Drill
  const handleCreateDrill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!drillTitle || !drillDesc || !drillLink) return;

    setLoading(true);
    try {
      await addDrill(drillTitle, drillDesc, drillLink);

      setDrillTitle("");
      setDrillDesc("");
      setDrillLink("");
      triggerSuccess(
        "New Weekly challenge posted & alert warnings broadcasted to student workspaces!",
      );
      onStateUpdate();
    } catch (e: any) {
      triggerError("Failed to add drill: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  // Grade Drill Submission
  const handleGradeDrill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gradingSubId) return;

    setLoading(true);
    try {
      const score = 100; // default/placeholder or computed if any
      await gradeDrillSubmission(gradingSubId, score, gradingFeedback, gradingStatus);

      setGradingSubId("");
      setGradingFeedback("");
      triggerSuccess(
        "Homework submission graded & dispatch user alerts updated!",
      );
      onStateUpdate();
    } catch (e: any) {
      triggerError("Grading assignment failed: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  // Send Alert Warning Reminder
  const handleSendReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetStudentId || !reminderMsg) return;

    setLoading(true);
    try {
      await sendReminder(targetStudentId, reminderMsg);

      setReminderMsg("");
      setTargetStudentId("");
      triggerSuccess(
        "Mentorship warning successfully dispatched to student alert feeds.",
      );
      onStateUpdate();
    } catch (e: any) {
      triggerError("Failed to deliver alert reminder: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  // Change student level in real-time
  const handleChangeLevel = async (studentId: string, level: string) => {
    setLoading(true);
    try {
      await changeLevel(studentId, level);

      triggerSuccess(`Student level updated successfully to: ${level}`);
      onStateUpdate();
    } catch (e: any) {
      triggerError("Level change failed: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  // Assign custom task to student
  const handleAssignTask = async (studentId: string) => {
    if (!customTaskTitle.trim()) {
      triggerError("Task Title is required.");
      return;
    }
    setLoading(true);
    try {
      await assignTask(studentId, customTaskTitle, customTaskDesc, customTaskDue, customTaskPriority as any);

      triggerSuccess(
        `Task "${customTaskTitle}" custom-assigned successfully to student.`,
      );
      setAssigningTaskId(null);
      setCustomTaskTitle("");
      setCustomTaskDesc("");
      setCustomTaskDue("Every Sunday 11:59 PM WAT");
      setCustomTaskPriority("Medium");
      onStateUpdate();
    } catch (e: any) {
      triggerError("Task assignment failed: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  // Save/Edit/Create Meeting
  const handleSaveMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!meetingTitle.trim() || !meetingTime.trim() || !meetingUrl.trim()) {
      triggerError(
        "Meeting Title, Meeting Time, and Meeting Link are required.",
      );
      return;
    }
    if (!meetingType) {
      triggerError("Meeting Type is required.");
      return;
    }
    if (!meetingDates || meetingDates.length === 0) {
      triggerError("Please select at least one calendar date for the meeting.");
      return;
    }
    if (!allowPastDates) {
      const todayStr = getLagosDateString(new Date());
      const hasPastDate = meetingDates.some(dateStr => dateStr < todayStr);
      if (hasPastDate) {
        triggerError("Cannot select past dates unless 'Allow Past Dates' is explicitly enabled in system settings.");
        return;
      }
    }
    setLoading(true);
    try {
      await saveMeeting({
        id: editingMeetingId || undefined,
        title: meetingTitle,
        type: meetingType,
        timeString: meetingTime,
        jitsiUrl: meetingUrl,
        trackId: meetingTrack.length > 0 ? meetingTrack : null,
        userLevels: meetingTrack.length > 0 ? meetingTrack : null,
        targetTeamTrackEligibility:
          meetingTeamTracks.length > 0 ? meetingTeamTracks : null,
        scheduleDays: meetingScheduleDays,
        meetingDates,
        assignedUserIds: meetingAssignedUsers,
        duration: meetingDuration,
        organizer: meetingOrganizer,
        status: meetingStatus,
        description: meetingDescription,
      });

      triggerSuccess(
        editingMeetingId
          ? "Meeting updated successfully!"
          : "New meeting scheduled successfully!",
      );
      setEditingMeetingId(null);
      setMeetingTitle("");
      setMeetingTime("");
      setMeetingUrl("");
      setMeetingType("Knowledge Track");
      setMeetingTrack([]);
      setMeetingTeamTracks([]);
      setMeetingScheduleDays([
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
      ]);
      setMeetingDates([]);
      setCurrentPickedDate("");
      setAllowPastDates(false);
      setMeetingDuration("60 minutes");
      setMeetingOrganizer("Admin Team");
      setMeetingStatus("Upcoming");
      setMeetingDescription("");
      setMeetingAssignedUsers([]);
      setUserSearchText("");
      setIsAddingMeeting(false);
      onStateUpdate();
    } catch (e: any) {
      triggerError("Saving meeting failed: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  // Delete scheduled Meeting
  const handleDeleteMeeting = async (meetingId: string) => {
    setIsDeletingMeeting(true);
    console.log(`Initiating delete for meeting ID: ${meetingId}`);
    try {
      await deleteMeeting(meetingId);

      triggerSuccess("Meeting deleted successfully.");
      if (meetingId === editingMeetingId) {
        setEditingMeetingId(null);
      }
      setMeetingToDeleteId(null); // close the confirm modal
      onStateUpdate();
    } catch (e: any) {
      console.error("Failed to delete meeting:", e);
      triggerError("Meeting deletion failed: " + e.message);
    } finally {
      setIsDeletingMeeting(false);
    }
  };

  // Simulated 00:00 WAT Cron script trigger
  const handleTriggerSimulatedCron = async () => {
    setCronRunning(true);
    setCronLogs([
      "⏱️ 00:00 WAT Scheduler triggered: starting nightly workspace cron job...",
      "🔍 Checking user_daily_meetings profiles alignment mappings...",
      "📂 Scanning 10 available track curriculum rules and project assigns...",
    ]);

    setTimeout(async () => {
      try {
        const data = await triggerSimulatedCron();

        setCronLogs((prev) => [
          ...prev,
          "⚡ Scanning finished. Target projects verified: Bincom Dev applet, eMigr8 pathway.",
          "✔️ Regenerating Jitsi coordinates & standup links baseline database entities...",
          `📅 Cron Success Code: Generated ${data.meetings.length} brand new customized day meetings.`,
          "💻 State synced! Workspace rejuvenated for the next 24-hour cycle.",
        ]);
        onStateUpdate();
      } catch (e: any) {
        setCronLogs((prev) => [
          ...prev,
          "❌ CRITICAL: overnight cron process failed: " + e.message,
        ]);
      } finally {
        setCronRunning(false);
      }
    }, 1200);
  };

  // Purge Seed Data & Fresh Start Trigger
  const handlePurgeDatabase = () => {
    showConfirm({
      title: "Purge All Mock & Seed Data",
      message: "Are you absolutely sure you want to purge all mock and transaction data? This will clear all meetings, drills, projects, standups, and student profiles from Firestore. This action is IRREVERSIBLE.",
      confirmText: "🗑️ Yes, Purge Everything",
      isDanger: true,
      onConfirm: async () => {
        setPurgingDb(true);
        setErrorMsg("");
        setSuccessMsg("");
        try {
          const { purgeDatabase } = await import("../seed");
          await purgeDatabase(adminProfile?.id);
          triggerSuccess("Database successfully purged! All seed data has been deleted and you have a completely fresh workspace.");
          onStateUpdate();
        } catch (err: any) {
          triggerError("Failed to purge database: " + err.message);
        } finally {
          setPurgingDb(false);
        }
      }
    });
  };

  // Seed Database Trigger
  const handleSeedDatabase = () => {
    showConfirm({
      title: "Seed Default Configurations",
      message: "Are you sure you want to seed default configurations (tasks, microservices, pathways) into the database?",
      confirmText: "🌱 Yes, Seed Database",
      isDanger: false,
      onConfirm: async () => {
        setSeedingDb(true);
        setErrorMsg("");
        setSuccessMsg("");
        try {
          const { seedDatabase } = await import("../seed");
          await seedDatabase(true); // force = true to override
          triggerSuccess("Database successfully configured with default tasks, microservices, and pathways.");
          onStateUpdate();
        } catch (err: any) {
          triggerError("Failed to seed database: " + err.message);
        } finally {
          setSeedingDb(false);
        }
      }
    });
  };

  // --- CONFIGURATIONS DIRECT CRUDS (Tasks, Microservices, Career Pathways) ---
  
  // Default Tasks
  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskEditorTitle.trim()) {
      triggerError("Task title is required.");
      return;
    }
    const currentTasks = [...(state.tasks || [])];
    if (editingTaskId === "new") {
      const newTask = {
        id: "tsk_" + Math.random().toString(36).substring(2, 9),
        title: taskEditorTitle.trim(),
        description: taskEditorDesc.trim(),
        due: taskEditorDue.trim() || "Daily by 05:00 PM (WAT)",
        priority: taskEditorPriority,
      };
      const updated = [...currentTasks, newTask];
      try {
        await updateAppConfigField("tasks", updated);
        triggerSuccess("New default task added successfully!");
        setEditingTaskId(null);
        onStateUpdate();
      } catch (err: any) {
        triggerError("Failed to add task: " + err.message);
      }
    } else if (editingTaskId) {
      const updated = currentTasks.map(t => t.id === editingTaskId ? {
        ...t,
        title: taskEditorTitle.trim(),
        description: taskEditorDesc.trim(),
        due: taskEditorDue.trim(),
        priority: taskEditorPriority,
      } : t);
      try {
        await updateAppConfigField("tasks", updated);
        triggerSuccess("Default task updated successfully!");
        setEditingTaskId(null);
        onStateUpdate();
      } catch (err: any) {
        triggerError("Failed to update task: " + err.message);
      }
    }
  };

  const handleDeleteTask = (id: string) => {
    showConfirm({
      title: "Delete Default Task",
      message: "Are you sure you want to delete this default task?",
      confirmText: "🗑️ Delete Task",
      isDanger: true,
      onConfirm: async () => {
        const currentTasks = [...(state.tasks || [])];
        const updated = currentTasks.filter(t => t.id !== id);
        try {
          await updateAppConfigField("tasks", updated);
          triggerSuccess("Default task deleted successfully!");
          onStateUpdate();
        } catch (err: any) {
          triggerError("Failed to delete task: " + err.message);
        }
      }
    });
  };

  const startEditTask = (task: any) => {
    setEditingTaskId(task.id);
    setTaskEditorTitle(task.title);
    setTaskEditorDesc(task.description || "");
    setTaskEditorDue(task.due || "");
    setTaskEditorPriority(task.priority || "Medium");
  };

  const startAddTask = () => {
    setEditingTaskId("new");
    setTaskEditorTitle("");
    setTaskEditorDesc("");
    setTaskEditorDue("Daily by 05:00 PM (WAT)");
    setTaskEditorPriority("Medium");
  };

  // Dashboard Microservices
  const handleSaveMicroservice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!msEditorTitle.trim()) {
      triggerError("Microservice title is required.");
      return;
    }
    const currentMs = [...(state.microservices || [])];
    if (editingMicroserviceId === "new") {
      const newMs = {
        id: "ms_" + Math.random().toString(36).substring(2, 9),
        title: msEditorTitle.trim(),
        description: msEditorDesc.trim(),
        linkText: msEditorLinkText.trim() || "Click to Enter",
        tab: msEditorTab.trim() || "microservices",
        subTab: msEditorSubTab.trim() || "kd",
        icon: msEditorIcon.trim() || "Award",
      };
      const updated = [...currentMs, newMs];
      try {
        await updateAppConfigField("microservices", updated);
        triggerSuccess("New dashboard microservice added successfully!");
        setEditingMicroserviceId(null);
        onStateUpdate();
      } catch (err: any) {
        triggerError("Failed to add microservice: " + err.message);
      }
    } else if (editingMicroserviceId) {
      const updated = currentMs.map(ms => ms.id === editingMicroserviceId ? {
        ...ms,
        title: msEditorTitle.trim(),
        description: msEditorDesc.trim(),
        linkText: msEditorLinkText.trim(),
        tab: msEditorTab.trim(),
        subTab: msEditorSubTab.trim(),
        icon: msEditorIcon.trim(),
      } : ms);
      try {
        await updateAppConfigField("microservices", updated);
        triggerSuccess("Dashboard microservice updated successfully!");
        setEditingMicroserviceId(null);
        onStateUpdate();
      } catch (err: any) {
        triggerError("Failed to update microservice: " + err.message);
      }
    }
  };

  const handleDeleteMicroservice = (id: string) => {
    showConfirm({
      title: "Delete Microservice",
      message: "Are you sure you want to delete this microservice from the dashboard?",
      confirmText: "🗑️ Delete Microservice",
      isDanger: true,
      onConfirm: async () => {
        const currentMs = [...(state.microservices || [])];
        const updated = currentMs.filter(ms => ms.id !== id);
        try {
          await updateAppConfigField("microservices", updated);
          triggerSuccess("Microservice deleted successfully!");
          onStateUpdate();
        } catch (err: any) {
          triggerError("Failed to delete microservice: " + err.message);
        }
      }
    });
  };

  const startEditMs = (ms: any) => {
    setEditingMicroserviceId(ms.id);
    setMsEditorTitle(ms.title);
    setMsEditorDesc(ms.description || "");
    setMsEditorLinkText(ms.linkText || "Click to Enter");
    setMsEditorTab(ms.tab || "microservices");
    setMsEditorSubTab(ms.subTab || "");
    setMsEditorIcon(ms.icon || "Award");
  };

  const startAddMs = () => {
    setEditingMicroserviceId("new");
    setMsEditorTitle("");
    setMsEditorDesc("");
    setMsEditorLinkText("Click to Enter");
    setMsEditorTab("microservices");
    setMsEditorSubTab("kd");
    setMsEditorIcon("Award");
  };

  // Career Pathways
  const handleSavePathwayStep = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pathwayEditorTitle.trim()) {
      triggerError("Step title is required.");
      return;
    }
    const pathways = state.careerPathways ? { ...state.careerPathways } : { foundation: [], trackSplit: [], lateralRoles: [] };
    const section = editingPathwaySection!;
    const index = editingPathwayIndex;

    const list = [...(pathways[section] || [])];
    const stepObj = {
      title: pathwayEditorTitle.trim(),
      description: pathwayEditorDesc.trim(),
    };

    if (index === -1) {
      list.push(stepObj);
    } else if (index !== null) {
      list[index] = stepObj;
    }

    const updatedPathways = {
      ...pathways,
      [section]: list,
    };

    try {
      await updateAppConfigField("careerPathways", updatedPathways);
      triggerSuccess(`Pathway step saved under ${section} successfully!`);
      setEditingPathwaySection(null);
      setEditingPathwayIndex(null);
      onStateUpdate();
    } catch (err: any) {
      triggerError("Failed to save step: " + err.message);
    }
  };

  const handleDeletePathwayStep = (section: "foundation" | "trackSplit" | "lateralRoles", index: number) => {
    showConfirm({
      title: "Delete Pathway Step",
      message: `Are you sure you want to delete this step from the ${section} section?`,
      confirmText: "🗑️ Delete Step",
      isDanger: true,
      onConfirm: async () => {
        const pathways = state.careerPathways ? { ...state.careerPathways } : { foundation: [], trackSplit: [], lateralRoles: [] };
        const list = [...(pathways[section] || [])];
        list.splice(index, 1);
        
        const updatedPathways = {
          ...pathways,
          [section]: list,
        };

        try {
          await updateAppConfigField("careerPathways", updatedPathways);
          triggerSuccess(`Step removed from ${section} pathway section.`);
          onStateUpdate();
        } catch (err: any) {
          triggerError("Failed to delete step: " + err.message);
        }
      }
    });
  };

  const startEditPathway = (section: "foundation" | "trackSplit" | "lateralRoles", index: number, step?: any) => {
    setEditingPathwaySection(section);
    setEditingPathwayIndex(index);
    if (step) {
      setPathwayEditorTitle(step.title);
      setPathwayEditorDesc(step.description || "");
    } else {
      setPathwayEditorTitle("");
      setPathwayEditorDesc("");
    }
  };

  // Simulate CSV download
  const handleDownloadCSV = () => {
    // Generate simple comma-separated columns
    const headers =
      "AttendanceRecordID,StudentEmail,StudentName,TrackGroup,MeetingName,CheckInTime,PunctualityRating\n";
    const rows = state.attendance
      .map(
        (a) =>
          `"${a.id}","${a.username}@bincom.co","${a.fullName}","${a.track}","${a.meetingTitle}","${a.timestamp}","${a.status}"`,
      )
      .join("\n");

    const csvContent =
      "data:text/csv;charset=utf-8," + encodeURIComponent(headers + rows);
    const link = document.createElement("a");
    link.setAttribute("href", csvContent);
    link.setAttribute(
      "download",
      `Bincom_Attendance_Audit_${new Date().toISOString().split("T")[0]}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerSuccess(
      "Simulated student attendance ledger successfully structured & downloaded.",
    );
  };

  return (
    <div className="space-y-6" id="admin-module-root">
      {/* Sub Tabs */}
      <div className="flex flex-wrap gap-2 bg-[#F8FAF8] p-2.5 rounded-xl border border-gray-100 select-none">
        <button
          onClick={() => {
            setAdminTab("funnel");
            setErrorMsg("");
            setSuccessMsg("");
          }}
          className={`flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
            adminTab === "funnel"
              ? "bg-[#4B5E40] text-white shadow-xs"
              : "text-gray-600 hover:bg-gray-150"
          }`}
        >
          <BarChart4 className="w-4 h-4" /> Operations Funnel
        </button>
        <button
          onClick={() => {
            setAdminTab("reviews");
            setErrorMsg("");
            setSuccessMsg("");
          }}
          className={`flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
            adminTab === "reviews"
              ? "bg-[#4B5E40] text-white shadow-xs"
              : "text-gray-600 hover:bg-gray-150"
          }`}
        >
          <Users className="w-4 h-4" /> Student Reviews (
          {standardUsers.filter((u) => u.status !== "dashboard").length})
        </button>
        <button
          onClick={() => {
            setAdminTab("drills");
            setErrorMsg("");
            setSuccessMsg("");
          }}
          className={`flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
            adminTab === "drills"
              ? "bg-[#4B5E40] text-white shadow-xs"
              : "text-gray-600 hover:bg-gray-150"
          }`}
        >
          <Award className="w-4 h-4" /> Weekly Drills (
          {state.drillSubmissions.filter((s) => s.status === "Pending").length})
        </button>
        <button
          onClick={() => {
            setAdminTab("meetings");
            setErrorMsg("");
            setSuccessMsg("");
          }}
          className={`flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
            adminTab === "meetings"
              ? "bg-[#4B5E40] text-white shadow-xs"
              : "text-gray-600 hover:bg-gray-150"
          }`}
        >
          <Calendar className="w-4 h-4" /> Meetings Management (
          {state.meetings.length})
        </button>
        <button
          onClick={() => {
            setAdminTab("reminders");
            setErrorMsg("");
            setSuccessMsg("");
          }}
          className={`flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
            adminTab === "reminders"
              ? "bg-[#4B5E40] text-white shadow-xs"
              : "text-gray-600 hover:bg-gray-150"
          }`}
        >
          <Send className="w-4 h-4" /> Warning Dispatches
        </button>
        <button
          onClick={() => {
            setAdminTab("cron");
            setErrorMsg("");
            setSuccessMsg("");
          }}
          className={`flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
            adminTab === "cron"
              ? "bg-[#4B5E40] text-white shadow-xs"
              : "text-gray-600 hover:bg-gray-150"
          }`}
        >
          <Cpu className="w-4 h-4" /> 00:00 WAT Cron Sync
        </button>
        <button
          onClick={() => {
            setAdminTab("export");
            setErrorMsg("");
            setSuccessMsg("");
          }}
          className={`flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
            adminTab === "export"
              ? "bg-[#4B5E40] text-white shadow-xs"
              : "text-gray-600 hover:bg-gray-150"
          }`}
        >
          <FileDown className="w-4 h-4" /> Export Ledger
        </button>
        <button
          id="admin-tab-owners"
          onClick={() => {
            setAdminTab("owners");
            setErrorMsg("");
            setSuccessMsg("");
          }}
          className={`flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
            adminTab === "owners"
              ? "bg-[#4B5E40] text-white shadow-xs"
              : "text-gray-600 hover:bg-gray-150"
          }`}
        >
          <ShieldCheck className="w-4 h-4" /> 👥 Owners
        </button>
        <button
          id="admin-tab-levels"
          onClick={() => {
            setAdminTab("levels");
            setErrorMsg("");
            setSuccessMsg("");
          }}
          className={`flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
            adminTab === "levels"
              ? "bg-[#4B5E40] text-white shadow-xs"
              : "text-gray-600 hover:bg-gray-150"
          }`}
        >
          <Users className="w-4 h-4" /> 📈 Levels
        </button>
        <button
          id="admin-tab-kd-desk"
          onClick={() => {
            setAdminTab("kd_desk");
            setErrorMsg("");
            setSuccessMsg("");
          }}
          className={`flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
            adminTab === "kd_desk"
              ? "bg-[#4B5E40] text-white shadow-xs"
              : "text-gray-600 hover:bg-gray-150"
          }`}
        >
          <BookOpen className="w-4 h-4" /> 📚 KD Desk
        </button>
        <button
          id="admin-tab-pd-desk"
          onClick={() => {
            setAdminTab("pd_desk");
            setErrorMsg("");
            setSuccessMsg("");
          }}
          className={`flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
            adminTab === "pd_desk"
              ? "bg-[#4B5E40] text-white shadow-xs"
              : "text-gray-600 hover:bg-gray-150"
          }`}
        >
          <FileEdit className="w-4 h-4" /> 💡 PD Desk
        </button>
        <button
          id="admin-tab-standup-desk"
          onClick={() => {
            setAdminTab("standup_desk");
            setErrorMsg("");
            setSuccessMsg("");
          }}
          className={`flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
            adminTab === "standup_desk"
              ? "bg-[#4B5E40] text-white shadow-xs"
              : "text-gray-600 hover:bg-gray-150"
          }`}
        >
          <Calendar className="w-4 h-4" /> ☀️ Standup Desk
        </button>
        <button
          id="admin-tab-attendance-history"
          onClick={() => {
            setAdminTab("attendance_history");
            setErrorMsg("");
            setSuccessMsg("");
          }}
          className={`flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
            adminTab === "attendance_history"
              ? "bg-[#4B5E40] text-white shadow-xs"
              : "text-gray-600 hover:bg-gray-150"
          }`}
        >
          <History className="w-4 h-4" /> 📋 Attendance Ledger
        </button>

        <button
          id="admin-tab-tasks-config"
          onClick={() => {
            setAdminTab("tasks_config");
            setErrorMsg("");
            setSuccessMsg("");
            setEditingTaskId(null);
          }}
          className={`flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
            adminTab === "tasks_config"
              ? "bg-[#4B5E40] text-white shadow-xs"
              : "text-gray-600 hover:bg-gray-150"
          }`}
        >
          <Settings className="w-4 h-4" /> ⚙️ Default Tasks
        </button>

        <button
          id="admin-tab-microservices-config"
          onClick={() => {
            setAdminTab("microservices_config");
            setErrorMsg("");
            setSuccessMsg("");
            setEditingMicroserviceId(null);
          }}
          className={`flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
            adminTab === "microservices_config"
              ? "bg-[#4B5E40] text-white shadow-xs"
              : "text-gray-600 hover:bg-gray-150"
          }`}
        >
          <Layers className="w-4 h-4" /> 🔌 Microservices Config
        </button>

        <button
          id="admin-tab-pathways-config"
          onClick={() => {
            setAdminTab("pathways_config");
            setErrorMsg("");
            setSuccessMsg("");
            setEditingPathwaySection(null);
            setEditingPathwayIndex(null);
          }}
          className={`flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
            adminTab === "pathways_config"
              ? "bg-[#4B5E40] text-white shadow-xs"
              : "text-gray-600 hover:bg-gray-150"
          }`}
        >
          <GraduationCap className="w-4 h-4" /> 🎓 Career Pathways Config
        </button>
      </div>

      {errorMsg && (
        <div
          className="flex items-start gap-2.5 p-3.5 bg-rose-50 text-rose-800 text-xs rounded-xl border border-rose-100"
          id="admin-alert-err"
        >
          <AlertOctagon className="w-4.5 h-4.5 shrink-0 text-rose-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div
          className="flex items-start gap-2.5 p-3.5 bg-emerald-50 text-emerald-800 text-xs rounded-xl border border-emerald-100"
          id="admin-alert-suc"
        >
          <CheckCircle className="w-4.5 h-4.5 shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* --- MENU VIEWPORTS --- */}

      {adminTab === "attendance_history" && (
        <AttendanceHistoryTab
          isAdmin={true}
          currentUserId={adminProfile?.id || ""}
          state={state}
          onStateUpdate={onStateUpdate}
        />
      )}

      {adminTab === "tasks_config" && (
        <div className="space-y-6 animate-fade-in" id="tasks-config-tab-root">
          <div className="bg-white p-5 rounded-xl border border-gray-150 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-extrabold text-sm text-gray-950 flex items-center gap-1.5">
                ⚙️ Default Ongoing Tasks Configurations
              </h3>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Configure default ongoing tasks assigned to students. Changes propagate instantly to all student dashboards.
              </p>
            </div>
            {editingTaskId === null && (
              <button
                onClick={startAddTask}
                className="px-4 py-2 bg-[#4B5E40] hover:bg-[#3d4d34] text-white text-xs font-bold rounded-xl shadow transition cursor-pointer flex items-center gap-1.5 self-start sm:self-auto"
              >
                <Plus className="w-3.5 h-3.5" /> Add New Default Task
              </button>
            )}
          </div>

          {editingTaskId !== null ? (
            <form onSubmit={handleSaveTask} className="bg-white p-6 rounded-xl border border-gray-150 space-y-4 max-w-2xl mx-auto animate-fade-in">
              <h4 className="font-extrabold text-xs uppercase tracking-wide text-gray-500">
                {editingTaskId === "new" ? "➕ Create New Default Task" : "✏️ Edit Default Task"}
              </h4>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-700">Task Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Daily Report Submission"
                  value={taskEditorTitle}
                  onChange={(e) => setTaskEditorTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-250 rounded-xl text-xs focus:ring-1 focus:ring-[#4B5E40] focus:outline-none bg-white text-gray-800"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-700">Task Description</label>
                <textarea
                  placeholder="Describe task expectations clearly..."
                  value={taskEditorDesc}
                  onChange={(e) => setTaskEditorDesc(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-250 rounded-xl text-xs focus:ring-1 focus:ring-[#4B5E40] focus:outline-none bg-white text-gray-800"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-gray-700">Due String / Frequency</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Daily by 05:00 PM (WAT)"
                    value={taskEditorDue}
                    onChange={(e) => setTaskEditorDue(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-250 rounded-xl text-xs focus:ring-1 focus:ring-[#4B5E40] focus:outline-none bg-white text-gray-800"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-gray-700">Priority Level</label>
                  <select
                    value={taskEditorPriority}
                    onChange={(e) => setTaskEditorPriority(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-250 rounded-xl text-xs focus:ring-1 focus:ring-[#4B5E40] focus:outline-none bg-white text-gray-800"
                  >
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2.5 justify-end pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setEditingTaskId(null)}
                  className="px-4 py-2 border border-gray-250 text-gray-600 hover:bg-gray-50 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#4B5E40] hover:bg-[#3d4d34] text-white text-xs font-bold rounded-xl shadow cursor-pointer"
                >
                  Save Configuration
                </button>
              </div>
            </form>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(state.tasks || []).map((t) => (
                <div key={t.id} className="bg-white p-5 rounded-xl border border-gray-150 hover:border-gray-300 transition shadow-xs flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-extrabold text-xs sm:text-sm text-gray-950 leading-tight">
                        {t.title}
                      </h4>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold shrink-0 border ${
                        t.priority === "High"
                          ? "bg-rose-50 text-rose-700 border-rose-100"
                          : t.priority === "Medium"
                          ? "bg-amber-50 text-amber-700 border-amber-100"
                          : "bg-blue-50 text-blue-700 border-blue-100"
                      }`}>
                        {t.priority}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-600 leading-relaxed font-medium">
                      {t.description || "No description provided."}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-gray-100 text-[11px] font-medium text-gray-500">
                    <span className="flex items-center gap-1">
                      ⏰ {t.due || "No specific deadline"}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => startEditTask(t)}
                        className="p-1.5 hover:bg-gray-100 text-[#4B5E40] rounded-lg transition"
                        title="Edit Task"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteTask(t.id)}
                        className="p-1.5 hover:bg-rose-50 text-rose-600 rounded-lg transition"
                        title="Delete Task"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {(state.tasks || []).length === 0 && (
                <div className="col-span-full bg-white p-12 text-center rounded-xl border border-dashed border-gray-250 text-gray-400">
                  No default tasks found. Click "Add New Default Task" to create one.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {adminTab === "microservices_config" && (
        <div className="space-y-6 animate-fade-in" id="microservices-config-tab-root">
          <div className="bg-white p-5 rounded-xl border border-gray-150 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-extrabold text-sm text-gray-950 flex items-center gap-1.5">
                🔌 Dashboard Microservices Configurations
              </h3>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Manage the active modules and links rendered on student hub grids.
              </p>
            </div>
            {editingMicroserviceId === null && (
              <button
                onClick={startAddMs}
                className="px-4 py-2 bg-[#4B5E40] hover:bg-[#3d4d34] text-white text-xs font-bold rounded-xl shadow transition cursor-pointer flex items-center gap-1.5 self-start sm:self-auto"
              >
                <Plus className="w-3.5 h-3.5" /> Add New Microservice
              </button>
            )}
          </div>

          {editingMicroserviceId !== null ? (
            <form onSubmit={handleSaveMicroservice} className="bg-white p-6 rounded-xl border border-gray-150 space-y-4 max-w-2xl mx-auto animate-fade-in">
              <h4 className="font-extrabold text-xs uppercase tracking-wide text-gray-500">
                {editingMicroserviceId === "new" ? "➕ Create Dashboard Microservice" : "✏️ Edit Dashboard Microservice"}
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-gray-700">Microservice Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Weekly Drills"
                    value={msEditorTitle}
                    onChange={(e) => setMsEditorTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-250 rounded-xl text-xs focus:ring-1 focus:ring-[#4B5E40] focus:outline-none bg-white text-gray-800"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-gray-700">Link Text Action</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Learn Skills"
                    value={msEditorLinkText}
                    onChange={(e) => setMsEditorLinkText(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-250 rounded-xl text-xs focus:ring-1 focus:ring-[#4B5E40] focus:outline-none bg-white text-gray-800"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-700">Short Description</label>
                <textarea
                  placeholder="Explain microservice scope..."
                  value={msEditorDesc}
                  onChange={(e) => setMsEditorDesc(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-250 rounded-xl text-xs focus:ring-1 focus:ring-[#4B5E40] focus:outline-none bg-white text-gray-800"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-gray-700">Target Tab</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. microservices"
                    value={msEditorTab}
                    onChange={(e) => setMsEditorTab(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-250 rounded-xl text-xs focus:ring-1 focus:ring-[#4B5E40] focus:outline-none bg-white text-gray-800"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-gray-700">Target Sub-Tab (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. drills"
                    value={msEditorSubTab}
                    onChange={(e) => setMsEditorSubTab(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-250 rounded-xl text-xs focus:ring-1 focus:ring-[#4B5E40] focus:outline-none bg-white text-gray-800"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-gray-700">Lucide Icon name</label>
                  <select
                    value={msEditorIcon}
                    onChange={(e) => setMsEditorIcon(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-250 rounded-xl text-xs focus:ring-1 focus:ring-[#4B5E40] focus:outline-none bg-white text-gray-800"
                  >
                    <option value="Award">Award</option>
                    <option value="BookOpen">BookOpen</option>
                    <option value="Users">Users</option>
                    <option value="Calendar">Calendar</option>
                    <option value="Laptop">Laptop</option>
                    <option value="Compass">Compass</option>
                    <option value="Sparkles">Sparkles</option>
                    <option value="Settings">Settings</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2.5 justify-end pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setEditingMicroserviceId(null)}
                  className="px-4 py-2 border border-gray-250 text-gray-600 hover:bg-gray-50 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#4B5E40] hover:bg-[#3d4d34] text-white text-xs font-bold rounded-xl shadow cursor-pointer"
                >
                  Save Configuration
                </button>
              </div>
            </form>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(state.microservices || []).map((ms) => (
                <div key={ms.id} className="bg-white p-5 rounded-xl border border-gray-150 flex flex-col justify-between space-y-4 shadow-2xs">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
                        {ms.icon === "BookOpen" && <BookOpen className="w-4 h-4" />}
                        {ms.icon === "Award" && <Award className="w-4 h-4" />}
                        {ms.icon === "Users" && <Users className="w-4 h-4" />}
                        {ms.icon === "Calendar" && <Calendar className="w-4 h-4" />}
                        {ms.icon === "Laptop" && <Laptop className="w-4 h-4" />}
                        {ms.icon === "Compass" && <Compass className="w-4 h-4" />}
                        {ms.icon === "Sparkles" && <Sparkles className="w-4 h-4" />}
                        {ms.icon === "Settings" && <Settings className="w-4 h-4" />}
                        {!["BookOpen", "Award", "Users", "Calendar", "Laptop", "Compass", "Sparkles", "Settings"].includes(ms.icon) && <Settings className="w-4 h-4" />}
                      </div>
                      <h4 className="font-extrabold text-xs sm:text-sm text-gray-950 font-sans">
                        {ms.title}
                      </h4>
                    </div>
                    <p className="text-[11px] text-gray-650 leading-relaxed font-medium">
                      {ms.description}
                    </p>
                    <div className="flex flex-wrap gap-1 pt-1 text-[9px] font-bold uppercase tracking-wider text-gray-400">
                      <span>Tab: {ms.tab}</span>
                      {ms.subTab && (
                        <>
                          <span>•</span>
                          <span>Sub: {ms.subTab}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-gray-100 text-[11px] font-bold">
                    <span className="text-[#4B5E40] hover:underline">
                      {ms.linkText || "Click to Enter"} &rarr;
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => startEditMs(ms)}
                        className="p-1.5 hover:bg-gray-100 text-[#4B5E40] rounded-lg transition"
                        title="Edit Microservice"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteMicroservice(ms.id)}
                        className="p-1.5 hover:bg-rose-50 text-rose-600 rounded-lg transition"
                        title="Delete Microservice"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {(state.microservices || []).length === 0 && (
                <div className="col-span-full bg-white p-12 text-center rounded-xl border border-dashed border-gray-250 text-gray-400">
                  No dashboard microservices configured. Click "Add New Microservice" to create one.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {adminTab === "pathways_config" && (
        <div className="space-y-6 animate-fade-in" id="pathways-config-tab-root">
          <div className="bg-white p-5 rounded-xl border border-gray-150">
            <h3 className="font-extrabold text-sm text-gray-950 flex items-center gap-1.5">
              🎓 Career Pathways Step Configurations
            </h3>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Edit the three structured career pathways presented to students on their pathway milestones page.
            </p>
          </div>

          {editingPathwaySection !== null ? (
            <form onSubmit={handleSavePathwayStep} className="bg-white p-6 rounded-xl border border-gray-150 space-y-4 max-w-2xl mx-auto animate-fade-in">
              <h4 className="font-extrabold text-xs uppercase tracking-wide text-[#4B5E40]">
                {editingPathwayIndex === -1 ? `➕ Add Step to: ${editingPathwaySection}` : `✏️ Edit Step in: ${editingPathwaySection}`}
              </h4>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-700">Step Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. High-Accountability Mock Interviews"
                  value={pathwayEditorTitle}
                  onChange={(e) => setPathwayEditorTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-250 rounded-xl text-xs focus:ring-1 focus:ring-[#4B5E40] focus:outline-none bg-white text-gray-800"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-700">Step Description</label>
                <textarea
                  placeholder="Describe step requirements and value delivered..."
                  value={pathwayEditorDesc}
                  onChange={(e) => setPathwayEditorDesc(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-250 rounded-xl text-xs focus:ring-1 focus:ring-[#4B5E40] focus:outline-none bg-white text-gray-800"
                />
              </div>

              <div className="flex gap-2.5 justify-end pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setEditingPathwaySection(null);
                    setEditingPathwayIndex(null);
                  }}
                  className="px-4 py-2 border border-gray-250 text-gray-600 hover:bg-gray-50 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#4B5E40] hover:bg-[#3d4d34] text-white text-xs font-bold rounded-xl shadow cursor-pointer"
                >
                  Save Pathway Step
                </button>
              </div>
            </form>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Foundation Section */}
              <div className="bg-white p-5 rounded-xl border border-gray-150 space-y-4">
                <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                  <h4 className="font-extrabold text-xs sm:text-sm text-[#4B5E40] uppercase tracking-wider">
                    🌱 Foundation Section
                  </h4>
                  <button
                    onClick={() => startEditPathway("foundation", -1)}
                    className="p-1 hover:bg-emerald-50 text-emerald-600 rounded-md transition"
                    title="Add Step"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                  {((state.careerPathways?.foundation) || []).map((step: any, idx: number) => (
                    <div key={idx} className="bg-gray-50 p-3 rounded-lg border border-gray-200 space-y-1 relative group">
                      <div className="text-xs font-extrabold text-gray-900 pr-10">{step.title}</div>
                      <div className="text-[10px] text-gray-500 leading-normal">{step.description}</div>
                      <div className="absolute right-2 top-2 hidden group-hover:flex items-center gap-0.5 bg-white rounded-md border border-gray-200 shadow-sm p-0.5">
                        <button
                          onClick={() => startEditPathway("foundation", idx, step)}
                          className="p-1 hover:bg-gray-100 text-[#4B5E40] rounded"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleDeletePathwayStep("foundation", idx)}
                          className="p-1 hover:bg-rose-50 text-rose-600 rounded"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {((state.careerPathways?.foundation) || []).length === 0 && (
                    <div className="text-center py-6 text-[10px] text-gray-400">
                      No foundation steps. Click (+) to add.
                    </div>
                  )}
                </div>
              </div>

              {/* Technical Split Section */}
              <div className="bg-white p-5 rounded-xl border border-gray-150 space-y-4">
                <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                  <h4 className="font-extrabold text-xs sm:text-sm text-[#4B5E40] uppercase tracking-wider">
                    ⚙️ Technical Split
                  </h4>
                  <button
                    onClick={() => startEditPathway("trackSplit", -1)}
                    className="p-1 hover:bg-emerald-50 text-emerald-600 rounded-md transition"
                    title="Add Step"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                  {((state.careerPathways?.trackSplit) || []).map((step: any, idx: number) => (
                    <div key={idx} className="bg-gray-50 p-3 rounded-lg border border-gray-200 space-y-1 relative group">
                      <div className="text-xs font-extrabold text-gray-900 pr-10">{step.title}</div>
                      <div className="text-[10px] text-gray-500 leading-normal">{step.description}</div>
                      <div className="absolute right-2 top-2 hidden group-hover:flex items-center gap-0.5 bg-white rounded-md border border-gray-200 shadow-sm p-0.5">
                        <button
                          onClick={() => startEditPathway("trackSplit", idx, step)}
                          className="p-1 hover:bg-gray-100 text-[#4B5E40] rounded"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleDeletePathwayStep("trackSplit", idx)}
                          className="p-1 hover:bg-rose-50 text-rose-600 rounded"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {((state.careerPathways?.trackSplit) || []).length === 0 && (
                    <div className="text-center py-6 text-[10px] text-gray-400">
                      No technical steps. Click (+) to add.
                    </div>
                  )}
                </div>
              </div>

              {/* Lateral Roles Section */}
              <div className="bg-white p-5 rounded-xl border border-gray-150 space-y-4">
                <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                  <h4 className="font-extrabold text-xs sm:text-sm text-[#4B5E40] uppercase tracking-wider">
                    🚀 Lateral Roles
                  </h4>
                  <button
                    onClick={() => startEditPathway("lateralRoles", -1)}
                    className="p-1 hover:bg-emerald-50 text-emerald-600 rounded-md transition"
                    title="Add Step"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                  {((state.careerPathways?.lateralRoles) || []).map((step: any, idx: number) => (
                    <div key={idx} className="bg-gray-50 p-3 rounded-lg border border-gray-200 space-y-1 relative group">
                      <div className="text-xs font-extrabold text-gray-900 pr-10">{step.title}</div>
                      <div className="text-[10px] text-gray-500 leading-normal">{step.description}</div>
                      <div className="absolute right-2 top-2 hidden group-hover:flex items-center gap-0.5 bg-white rounded-md border border-gray-200 shadow-sm p-0.5">
                        <button
                          onClick={() => startEditPathway("lateralRoles", idx, step)}
                          className="p-1 hover:bg-gray-100 text-[#4B5E40] rounded"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleDeletePathwayStep("lateralRoles", idx)}
                          className="p-1 hover:bg-rose-50 text-rose-600 rounded"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {((state.careerPathways?.lateralRoles) || []).length === 0 && (
                    <div className="text-center py-6 text-[10px] text-gray-400">
                      No lateral/other roles steps. Click (+) to add.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 1. MICROSERVICE OWNERS TAB */}
      {adminTab === "owners" && (
        <div className="space-y-6 animate-fade-in" id="owners-tab-root">
          <div className="bg-white p-5 rounded-xl border border-gray-150">
            <h3 className="font-extrabold text-sm text-gray-950 flex items-center gap-1.5">
              👥 Microservice Owners
            </h3>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Assign an owner to each microservice. Owners get specialized
              dashboard visibility and management controls.
            </p>
          </div>

          <div className="bg-white rounded-xl border border-gray-150 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-150 text-[10px] uppercase tracking-wider font-extrabold text-gray-400">
                    <th className="p-3.5 pl-5">Microservice</th>
                    <th className="p-3.5">Assigned Owner</th>
                    <th className="p-3.5">New Assignment</th>
                    <th className="p-3.5 pr-5 text-right font-medium">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs">
                  {[
                    { id: "kd", name: "Knowledge Development" },
                    { id: "pd", name: "Personal Development" },
                    { id: "wd", name: "Weekly Drills" },
                    { id: "standups", name: "Daily Standups" },
                    { id: "tech_update", name: "Tech Update" },
                    { id: "ke", name: "Knowledge Exchange" },
                    { id: "social_influence", name: "Social Influence" },
                    { id: "social_engagement", name: "Social Engagement" },
                    { id: "external_events", name: "External Events" },
                  ].map((service) => {
                    const currentOwnerId =
                      state.microserviceOwners?.[service.id];
                    const currentOwner = state.profiles.find(
                      (p) => p.id === currentOwnerId,
                    );
                    const selectedValue =
                      selectedOwners[service.id] || currentOwnerId || "";

                    return (
                      <tr key={service.id} className="hover:bg-gray-50/50">
                        <td className="p-3.5 pl-5 font-bold text-gray-900">
                          {service.name}
                        </td>
                        <td className="p-3.5">
                          {currentOwner ? (
                            <span className="p-1 px-2.5 bg-emerald-100 text-emerald-800 font-bold rounded-full text-[10px]/none">
                              {currentOwner.fullName}
                            </span>
                          ) : (
                            <span className="text-gray-400 italic font-medium">
                              Not Assigned
                            </span>
                          )}
                        </td>
                        <td className="p-3.5">
                          <select
                            value={selectedValue}
                            onChange={(e) =>
                              setSelectedOwners((prev) => ({
                                ...prev,
                                [service.id]: e.target.value,
                              }))
                            }
                            className="p-1.5 text-xs bg-gray-50 rounded-lg border border-gray-200 text-gray-700 min-w-[220px] outline-none cursor-pointer"
                          >
                            <option value="">Select owner...</option>
                            {state.profiles
                              .filter(
                                (p) =>
                                  p.role === "admin" ||
                                  p.learningLevel?.toLowerCase() === "admin" ||
                                  p.learningLevel?.toLowerCase() === "mentor" ||
                                  p.learningLevel?.toLowerCase() ===
                                    "administrative mentor",
                              )
                              .map((admin) => (
                                <option key={admin.id} value={admin.id}>
                                  {admin.fullName} ({admin.email})
                                </option>
                              ))}
                          </select>
                        </td>
                        <td className="p-3.5 pr-5 text-right">
                          <button
                            onClick={async () => {
                              const targetOwner =
                                selectedOwners[service.id] || "";
                              try {
                                await assignMicroserviceOwner(service.id, targetOwner);

                                triggerSuccess(
                                  `Assigned owner to "${service.name}" successfully!`,
                                );
                                onStateUpdate();
                              } catch (e: any) {
                                triggerError(
                                  "Error routing assignment: " + e.message,
                                );
                              }
                            }}
                            className="p-1 px-2.5 bg-[#4B5E40] hover:bg-[#3d4d34] text-white font-bold rounded text-[10px] uppercase transition cursor-pointer"
                          >
                            Assign
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 2. USER LEVEL MANAGEMENT TAB */}
      {adminTab === "levels" && (
        <div className="space-y-6 animate-fade-in" id="levels-tab-root">
          <div className="bg-white p-5 rounded-xl border border-gray-150">
            <h3 className="font-extrabold text-sm text-gray-950 flex items-center gap-1.5">
              📈 User Level Management
            </h3>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Change user learning levels. Users will be notified on their
              dashboard and appropriate features will adjust automatically.
            </p>

            <div className="mt-4 flex items-center gap-2 bg-gray-50 p-2.5 rounded-lg border border-gray-150">
              <Search className="w-4 h-4 text-gray-400 shrink-0" />
              <input
                type="text"
                placeholder="Search by name, email, or track..."
                value={levelSearch}
                onChange={(e) => setLevelSearch(e.target.value)}
                className="bg-transparent border-none text-xs text-gray-800 outline-none w-full"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {state.profiles
              .filter((p) => {
                const q = levelSearch.toLowerCase();
                return (
                  p.fullName.toLowerCase().includes(q) ||
                  p.email.toLowerCase().includes(q) ||
                  p.track.toLowerCase().includes(q)
                );
              })
              .map((p) => {
                const selectedLevel =
                  selectedUserLevels[p.id] || p.learningLevel || "Apprentice level 1";
                return (
                  <div
                    key={p.id}
                    className="bg-white p-4 rounded-xl border border-gray-150 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <p className="font-extrabold text-xs text-gray-900">
                        {p.fullName}
                      </p>
                      <p className="text-[10px] text-gray-555 whitespace-nowrap">
                        {p.email}
                      </p>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        <span className="p-0.5 px-1.5 bg-gray-100 text-gray-600 font-bold rounded-full text-[9px]/tight uppercase">
                          {p.role}
                        </span>
                        <span className="p-0.5 px-1.5 bg-indigo-50 text-indigo-700 font-bold rounded-full text-[9px]/tight">
                          {p.track}
                        </span>
                        <span className="p-0.5 px-1.5 bg-amber-50 text-amber-700 font-bold rounded-full text-[9px]/tight">
                          {p.learningLevel || "Apprentice level 1"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        value={selectedLevel}
                        onChange={(e) =>
                          setSelectedUserLevels((prev) => ({
                            ...prev,
                            [p.id]: e.target.value,
                          }))
                        }
                        className="p-1 px-2 text-xs bg-gray-50 rounded-lg border border-gray-200 text-gray-700 outline-none cursor-pointer"
                      >
                        {LEVELS_OPTIONS.map((lvl) => (
                          <option key={lvl} value={lvl}>
                            {lvl}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => handleChangeLevel(p.id, selectedLevel)}
                        className="p-1 px-2.5 bg-[#4B5E40] hover:bg-[#3d4d34] text-white font-bold rounded text-[10px] uppercase transition cursor-pointer"
                      >
                        Update
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* 3. KD ALIGNMENT ASSIGNMENT DESK */}
      {adminTab === "kd_desk" && (
        <div className="space-y-6 animate-fade-in" id="kd-desk-tab-root">
          <div className="bg-white p-5 rounded-xl border border-gray-150">
            <h3 className="font-extrabold text-sm text-gray-950 flex items-center gap-1.5 animate-fade-in">
              <BookOpen className="w-4 h-4 text-[#4B5E40]" /> KD Alignment
              Assignment Desk
            </h3>
            <p className="text-[11px] text-gray-500 mt-0.5 animate-fade-in">
              Manually set or adjust students' monthly Knowledge Development
              (KD) sync attendance logs. Submissions update student dashboards
              instantly.
            </p>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 pb-1">
              <div className="flex items-center gap-2 bg-gray-55 p-2 rounded-lg border border-gray-150">
                <Search className="w-4 h-4 text-gray-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Search student name..."
                  value={kdSearch || ""}
                  onChange={(e) => setKdSearch(e.target.value)}
                  className="bg-transparent border-none text-xs text-gray-800 outline-none w-full"
                />
              </div>

              <select
                value={kdTrackFilter}
                onChange={(e) => setKdTrackFilter(e.target.value)}
                className="p-2 text-xs bg-gray-55 rounded-lg border border-gray-150 text-gray-700 outline-none cursor-pointer font-medium"
              >
                <option value="all">All Tracks</option>
                {Array.from(new Set(state.profiles.map((p: any) => p.track)))
                  .filter(Boolean)
                  .map((trackName: any) => (
                    <option key={trackName} value={trackName}>
                      {trackName}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-150 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-55 border-b border-gray-150 text-[10px] uppercase tracking-wider font-extrabold text-gray-400">
                    <th className="p-3.5 pl-5">Student</th>
                    <th className="p-3.5">Assigned Track & Level</th>
                    <th className="p-3.5 text-center">Active KD Count</th>
                    <th className="p-3.5">New KD Count Assignment</th>
                    <th className="p-3.5 pr-5 text-right font-medium">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs text-gray-800">
                  {state.profiles
                    .filter((p: any) => {
                      const q = kdSearch.toLowerCase();
                      const matchSearch =
                        p.fullName.toLowerCase().includes(q) ||
                        p.email.toLowerCase().includes(q) ||
                        p.username.toLowerCase().includes(q);
                      const matchTrack =
                        kdTrackFilter === "all" || p.track === kdTrackFilter;
                      return matchSearch && matchTrack && p.role !== "admin";
                    })
                    .map((p: any) => {
                      const currentCount = state.kdCounts?.[p.id] || 0;
                      const selectedCountVal =
                        kdEdits[p.id] !== undefined
                          ? kdEdits[p.id]
                          : String(currentCount);

                      return (
                        <tr key={p.id} className="hover:bg-gray-50/50">
                          <td className="p-3.5 pl-5">
                            <p className="font-extrabold text-[#4B5E40]">
                              {p.fullName}
                            </p>
                            <p className="text-[10px] text-gray-400">
                              {p.email}
                            </p>
                          </td>
                          <td className="p-3.5">
                            <span className="p-0.5 px-2 bg-indigo-50 text-indigo-700 font-bold rounded text-[10px]/none mr-1">
                              {p.track?.split(" ")[0]}
                            </span>
                            <span className="p-0.5 px-2 bg-amber-50 text-amber-700 font-bold rounded text-[10px]/none">
                              {p.learningLevel || "Apprentice level 1"}
                            </span>
                          </td>
                          <td className="p-3.5 text-center">
                            <span
                              className={`p-1 px-3 rounded-full font-bold text-xs ${
                                currentCount >= 16
                                  ? "bg-emerald-100 text-emerald-850 border border-emerald-250 animate-pulse"
                                  : "bg-gray-100 text-gray-750"
                              }`}
                            >
                              {currentCount} / 16
                            </span>
                          </td>
                          <td className="p-3.5">
                            <div className="flex items-center gap-1.5">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                value={selectedCountVal}
                                onChange={(e) =>
                                  setKdEdits((prev) => ({
                                    ...prev,
                                    [p.id]: e.target.value,
                                  }))
                                }
                                className="w-16 p-1 text-center bg-gray-50 rounded border border-gray-200 text-xs text-gray-800 font-bold outline-none"
                              />
                              <span className="text-[10px] text-gray-400 shrink-0">
                                sessions
                              </span>
                            </div>
                          </td>
                          <td className="p-3.5 pr-5 text-right">
                            <button
                              disabled={loading}
                              onClick={async () => {
                                const targetCount = parseInt(
                                  selectedCountVal,
                                  10,
                                );
                                if (isNaN(targetCount) || targetCount < 0) {
                                  setErrorMsg(
                                    "Invalid KD count value entered.",
                                  );
                                  return;
                                }
                                try {
                                  setLoading(true);
                                  setErrorMsg("");
                                  setSuccessMsg("");
                                  await assignKDCount(p.id, targetCount);

                                  setSuccessMsg(
                                    `Successfully assigned ${targetCount} Knowledge Development logs to "${p.fullName}"!`,
                                  );
                                  onStateUpdate();
                                } catch (e: any) {
                                  setErrorMsg(
                                    "Error assigning KD sync count: " +
                                      e.message,
                                  );
                                } finally {
                                  setLoading(false);
                                }
                              }}
                              className="p-1 px-2.5 bg-[#4B5E40] hover:bg-[#3d4d34] disabled:bg-gray-300 text-white font-bold rounded text-[10px] uppercase transition cursor-pointer"
                            >
                              Assign KD
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 4. PERSONAL DEVELOPMENT OWNER DASHBOARD */}
      {adminTab === "pd_desk" && (
        <div className="space-y-6 animate-fade-in" id="pd-desk-tab-root">
          <div className="bg-white p-5 rounded-xl border border-gray-150">
            <h3 className="font-extrabold text-sm text-gray-950 flex items-center gap-1.5">
              <FileEdit className="w-4 h-4 text-[#4B5E40]" /> Personal
              Development Summaries Ledger
            </h3>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Review daily personal development log submissions. By default
              lists students under your pathway track.
            </p>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 pb-1">
              <div className="flex items-center gap-2 bg-gray-55 p-2 rounded-lg border border-gray-150">
                <Search className="w-4 h-4 text-gray-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Search student or keywords..."
                  value={pdSearch || ""}
                  onChange={(e) => setPdSearch(e.target.value)}
                  className="bg-transparent border-none text-xs text-gray-800 outline-none w-full"
                />
              </div>

              <select
                value={pdTrackFilter}
                onChange={(e) => setPdTrackFilter(e.target.value)}
                className="p-2 text-xs bg-gray-55 rounded-lg border border-gray-150 text-gray-700 outline-none cursor-pointer font-medium"
              >
                <option value="all">All Pathways (Show All)</option>
                {Array.from(new Set(state.profiles.map((p: any) => p.track)))
                  .filter(Boolean)
                  .map((trackName: any) => (
                    <option key={trackName} value={trackName}>
                      {trackName}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-150 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-55 border-b border-gray-150 text-[10px] uppercase tracking-wider font-extrabold text-gray-400">
                    <th className="p-3.5 pl-5 w-1/4">Student & Track</th>
                    <th className="p-3.5 w-1/6">Date</th>
                    <th className="p-3.5 w-1/2">take-away Learning Summary</th>
                    <th className="p-3.5 pr-5 text-right w-1/12 font-medium">
                      Verify
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs text-gray-800">
                  {(state.personalDevelopment || [])
                    .filter((pd: any) => {
                      const q = pdSearch.toLowerCase();
                      const matchSearch =
                        pd.fullName.toLowerCase().includes(q) ||
                        pd.summary.toLowerCase().includes(q);

                      const adminTrack = adminProfile?.track || "All";
                      const effectiveTrackFilter =
                        pdTrackFilter !== "all"
                          ? pdTrackFilter
                          : adminTrack !== "All"
                            ? adminTrack
                            : "all";
                      const matchTrack =
                        effectiveTrackFilter === "all" ||
                        pd.track === effectiveTrackFilter;

                      return matchSearch && matchTrack;
                    })
                    .sort(
                      (a: any, b: any) =>
                        new Date(b.timestamp).getTime() -
                        new Date(a.timestamp).getTime(),
                    )
                    .map((pd: any) => (
                      <tr key={pd.id} className="hover:bg-gray-50/50 align-top">
                        <td className="p-3.5 pl-5">
                          <p className="font-extrabold text-gray-900">
                            {pd.fullName}
                          </p>
                          <p className="text-[10px] text-indigo-700 font-bold bg-indigo-50 px-1.5 py-0.5 rounded-md inline-block mt-1">
                            {pd.track?.split(" ")[0]}
                          </p>
                        </td>
                        <td className="p-3.5">
                          <p className="font-bold text-gray-750">{pd.date}</p>
                          <p className="text-[10px] text-gray-400 font-mono mt-0.5">
                            {new Date(pd.timestamp).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </td>
                        <td className="p-3.5 text-gray-700 italic leading-relaxed pr-6 whitespace-pre-line font-medium">
                          {pd.summary}
                          <div className="mt-1.5 flex items-center gap-1.5">
                            <span className="text-[9px]/none font-black text-emerald-800 bg-emerald-100/75 p-1 px-2 rounded-full font-mono">
                              Word Count:{" "}
                              {pd.summary.trim().split(/\s+/).length} words
                            </span>
                          </div>
                        </td>
                        <td className="p-3.5 pr-5 text-right font-bold text-emerald-700 text-[10px] uppercase">
                          Authenticated
                        </td>
                      </tr>
                    ))}
                  {(!state.personalDevelopment ||
                    state.personalDevelopment.length === 0) && (
                    <tr>
                      <td
                        colSpan={4}
                        className="p-8 text-center text-xs text-gray-400 font-medium italic"
                      >
                        No Personal Development summaries matching current
                        filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 5. DAILY STANDUPS MONITOR TAB */}
      {adminTab === "standup_desk" && (
        <div className="space-y-6 animate-fade-in" id="standup-desk-tab-root">
          <div className="bg-white p-5 rounded-xl border border-gray-150">
            <h3 className="font-extrabold text-sm text-gray-950 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-[#4B5E40]" /> Student
              Accountability Standups Desk
            </h3>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Monitor daily morning goals and evening achievements submitted by
              students. Verifies live accountability progress and
              synchronization.
            </p>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 pb-1">
              <div className="flex items-center gap-2 bg-gray-55 p-2 rounded-lg border border-gray-150">
                <Search className="w-4 h-4 text-gray-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Search student or standup notes..."
                  value={standupSearch || ""}
                  onChange={(e) => setStandupSearch(e.target.value)}
                  className="bg-transparent border-none text-xs text-gray-800 outline-none w-full"
                />
              </div>

              <select
                value={standupTrackFilter}
                onChange={(e) => setStandupTrackFilter(e.target.value)}
                className="p-2 text-xs bg-gray-55 rounded-lg border border-gray-150 text-gray-700 outline-none cursor-pointer font-medium"
              >
                <option value="all">All Pathways (Show All)</option>
                {Array.from(new Set(state.profiles.map((p: any) => p.track)))
                  .filter(Boolean)
                  .map((trackName: any) => (
                    <option key={trackName} value={trackName}>
                      {trackName}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-150 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-55 border-b border-gray-150 text-[10px] uppercase tracking-wider font-extrabold text-gray-400">
                    <th className="p-3.5 pl-5">Student name & Track</th>
                    <th className="p-3.5">Date Submitted</th>
                    <th className="p-3.5">
                      ☀️ Morning Accountability Goals (09:45)
                    </th>
                    <th className="p-3.5">
                      🌙 Evening Achievements summary (17:00)
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs text-gray-800">
                  {(state.standups || [])
                    .filter((st: any) => {
                      const q = standupSearch.toLowerCase();
                      const matchSearch =
                        st.fullName.toLowerCase().includes(q) ||
                        (st.morningGoals || "").toLowerCase().includes(q) ||
                        (st.eveningAchievements || "")
                          .toLowerCase()
                          .includes(q);

                      const adminTrack = adminProfile?.track || "All";
                      const effectiveTrackFilter =
                        standupTrackFilter !== "all"
                          ? standupTrackFilter
                          : adminTrack !== "All"
                            ? adminTrack
                            : "all";
                      const matchTrack =
                        effectiveTrackFilter === "all" ||
                        st.track === effectiveTrackFilter;

                      return matchSearch && matchTrack;
                    })
                    .sort((a: any, b: any) => b.date.localeCompare(a.date))
                    .map((st: any) => (
                      <tr key={st.id} className="hover:bg-gray-50/50 align-top">
                        <td className="p-3.5 pl-5">
                          <p className="font-extrabold text-[#4B5E40]">
                            {st.fullName}
                          </p>
                          <p className="text-[10px] text-indigo-700 font-bold bg-indigo-50 px-1.5 py-0.5 rounded-md inline-block mt-1">
                            {st.track?.split(" ")[0]}
                          </p>
                        </td>
                        <td className="p-3.5 font-bold text-gray-750">
                          {st.date}
                        </td>
                        <td className="p-3.5 max-w-sm">
                          {st.morningGoals ? (
                            <div className="space-y-1">
                              <p className="text-gray-750 leading-relaxed italic">
                                {st.morningGoals}
                              </p>
                              {st.morningTime && (
                                <p className="text-[10px] text-emerald-800 font-mono">
                                  Logged: {st.morningTime}
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400 italic">
                              Not submitted
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 max-w-sm">
                          {st.eveningAchievements ? (
                            <div className="space-y-1">
                              <p className="text-gray-750 leading-relaxed italic">
                                {st.eveningAchievements}
                              </p>
                              {st.eveningTime && (
                                <p className="text-[10px] text-amber-800 font-mono">
                                  Logged: {st.eveningTime}
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-450 italic">
                              Not submitted
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  {(!state.standups || state.standups.length === 0) && (
                    <tr>
                      <td
                        colSpan={4}
                        className="p-8 text-center text-xs text-gray-400 font-medium italic"
                      >
                        No Daily Standups submitted matching current filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* --- MENU VIEWPORTS --- */}

      {/* A. OPERATIONS FUNNEL & ANALYTICS MONITORING (Section 4.1) */}
      {adminTab === "funnel" && (
        <div className="space-y-6 animate-fade-in" id="funnel-tab-root">
          {/* Funnel Filtering Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 rounded-xl border border-gray-150">
            <div>
              <h3 className="font-extrabold text-sm text-gray-950 flex items-center gap-1.5">
                <BarChart4 className="w-4 h-4 text-[#4B5E40]" /> Operations
                Dashboard Metrics
              </h3>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Filter key metrics and placement tracking by knowledge pathway.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                <Filter className="w-3.5 h-3.5 text-gray-400" /> Pathway:
              </span>
              <select
                id="funnel-track-select"
                value={funnelTrackFilter}
                onChange={(e) => setFunnelTrackFilter(e.target.value)}
                className="p-1.5 px-3 text-xs font-semibold bg-gray-50 rounded-lg border border-gray-200 text-gray-700 min-w-[200px] outline-none focus:border-[#4B5E40] cursor-pointer"
              >
                <option value="all">All Tracks Combined</option>
                {uniqueTracksForDropdown.map((track) => (
                  <option key={track} value={track}>
                    {track}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Key Analytics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-gray-150 text-center">
              <span className="block text-2xl font-black text-gray-900">
                {stepOnboarding}
              </span>
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mt-1">
                Total Student Sign-ups
              </span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-gray-150 text-center">
              <span className="block text-2xl font-black text-[#4B5E40]">
                {passRate}%
              </span>
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mt-1">
                Assessment Pass Rate
              </span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-gray-150 text-center">
              <span className="block text-2xl font-black text-indigo-600">
                {averageAssessmentScore}%
              </span>
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mt-1">
                Average Evaluation Score
              </span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-gray-150 text-center">
              <span className="block text-2xl font-black text-emerald-600">
                {stepDashboardActive}
              </span>
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mt-1">
                Fully Active in Dashboard
              </span>
            </div>
          </div>

          {/* Graphical Conversion Funnel Progress Bars (Section 4.1) */}
          <div
            className="bg-white rounded-2xl border border-gray-150 p-6 space-y-6"
            id="conversion-funnel-card"
          >
            <div>
              <h3 className="font-extrabold text-sm text-gray-950 sm:text-base leading-snug">
                Student Operations Progression Funnel
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Tracks student transitions from initial Sign In records to fully
                compliant daily tracker operation dashboard.
              </p>
            </div>

            <div className="space-y-4">
              {/* Funnel Stage 1: Registered */}
              <div>
                <div className="flex justify-between text-xs text-gray-700 font-semibold mb-1">
                  <span>Stage 1: Signed In & Profiled</span>
                  <span>
                    {stepOnboarding} Candidates (
                    {stepOnboarding > 0 ? "100" : "0"}%)
                  </span>
                </div>
                <div className="h-3 bg-gray-100 rounded-lg select-none border">
                  <div
                    className="h-full bg-slate-550 bg-[#4B5E40] rounded-lg transition-all"
                    style={{ width: stepOnboarding > 0 ? "100%" : "0%" }}
                  ></div>
                </div>
              </div>

              {/* Funnel Stage 2: Passed Assessments */}
              <div>
                <div className="flex justify-between text-xs text-gray-700 font-semibold mb-1">
                  <span>Stage 2: Technical Assessment Passed</span>
                  <span>
                    {stepAssessmentPassed} Students (
                    {stepOnboarding > 0
                      ? Math.round(
                          (stepAssessmentPassed / stepOnboarding) * 100,
                        )
                      : 0}
                    %)
                  </span>
                </div>
                <div className="h-3 bg-gray-100 rounded-lg select-none border">
                  <div
                    className="h-full bg-emerald-550 bg-emerald-600 rounded-lg transition-all"
                    style={{
                      width:
                        stepOnboarding > 0
                          ? `${(stepAssessmentPassed / stepOnboarding) * 100}%`
                          : "0%",
                    }}
                  ></div>
                </div>
              </div>

              {/* Funnel Stage 3: Oriented */}
              <div>
                <div className="flex justify-between text-xs text-gray-700 font-semibold mb-1">
                  <span>Stage 3: Orientation Briefing Cleared</span>
                  <span>
                    {stepOriented} Students (
                    {stepOnboarding > 0
                      ? Math.round((stepOriented / stepOnboarding) * 100)
                      : 0}
                    %)
                  </span>
                </div>
                <div className="h-3 bg-gray-100 rounded-lg select-none border">
                  <div
                    className="h-full bg-indigo-550 bg-indigo-600 rounded-lg transition-all"
                    style={{
                      width:
                        stepOnboarding > 0
                          ? `${(stepOriented / stepOnboarding) * 100}%`
                          : "0%",
                    }}
                  ></div>
                </div>
              </div>

              {/* Funnel Stage 4: Dashboard Active */}
              <div>
                <div className="flex justify-between text-xs text-gray-700 font-semibold mb-1">
                  <span>Stage 4: Workspace Dashboard Active</span>
                  <span>
                    {stepDashboardActive} Students (
                    {stepOnboarding > 0
                      ? Math.round((stepDashboardActive / stepOnboarding) * 100)
                      : 0}
                    %)
                  </span>
                </div>
                <div className="h-3 bg-gray-100 rounded-lg select-none border">
                  <div
                    className="h-full bg-pink-550 bg-pink-600 rounded-lg transition-all"
                    style={{
                      width:
                        stepOnboarding > 0
                          ? `${(stepDashboardActive / stepOnboarding) * 100}%`
                          : "0%",
                    }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* B. STUDENT PLACEMENT REVIEWS AUDITTING (Section 4.1) */}
      {adminTab === "reviews" && (
        <div
          className="bg-white rounded-2xl border border-gray-150 p-5 space-y-4 animate-fade-in"
          id="reviews-tab-root"
        >
          <div className="border-b border-gray-100 pb-2">
            <h3 className="font-extrabold text-sm text-gray-900 leading-normal">
              Onboarding Placement Reviews Auditor
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Audit students pending assessment completions, approve track
              placement clearances, or reset pivot paths manually.
            </p>
          </div>

          {/* Filters Bar */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-gray-50 p-3 rounded-xl border border-gray-150">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
              <input
                type="text"
                placeholder="Search candidates Name/@user/Email..."
                value={reviewSearch}
                onChange={(e) => setReviewSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white rounded-lg border border-gray-200 outline-none focus:border-[#4B5E40]"
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider shrink-0">
                Status:
              </span>
              <select
                value={reviewStatusFilter}
                onChange={(e) => setReviewStatusFilter(e.target.value)}
                className="w-full p-1.5 text-xs bg-white rounded-lg border border-gray-200 outline-none focus:border-[#4B5E40] cursor-pointer font-semibold text-gray-750"
              >
                <option value="all">All States</option>
                <option value="onboarding">
                  Stage 1: Onboarding / Profiling
                </option>
                <option value="assessment_passed">
                  Stage 2: Passed (Unlock Orientation)
                </option>
                <option value="assessment_failed">
                  Stage 2: Failed (Requires Pivot)
                </option>
                <option value="oriented">
                  Stage 3: Oriented (Ready for Active)
                </option>
                <option value="dashboard">Stage 4: Active in Dashboard</option>
              </select>
            </div>

            {/* Track Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider shrink-0">
                Track:
              </span>
              <select
                value={reviewTrackFilter}
                onChange={(e) => setReviewTrackFilter(e.target.value)}
                className="w-full p-1.5 text-xs bg-white rounded-lg border border-gray-200 outline-none focus:border-[#4B5E40] cursor-pointer font-semibold text-gray-750"
              >
                <option value="all">All Tracks</option>
                {uniqueTracksForDropdown.map((track) => (
                  <option key={track} value={track}>
                    {track}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {filteredUsersForReviews.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-xs font-semibold bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
              No students match your current search queries or selectors.
            </div>
          ) : (
            <div className="space-y-3 max-h-[450px] overflow-y-auto pr-1">
              {filteredUsersForReviews.map((student) => (
                <div
                  key={student.id}
                  className="p-4 bg-[#F8FAF8] border border-gray-100 rounded-xl text-xs space-y-3"
                  id={`audit-card-${student.id}`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
                    <div>
                      <h4 className="font-bold text-gray-900 text-xs sm:text-sm leading-tight">
                        {student.fullName} (@{student.username})
                      </h4>
                      <div className="text-[10px] text-gray-400 font-mono mt-0.5">
                        Email: {student.email} | Joined:{" "}
                        {new Date(student.joinedAt).toLocaleDateString()}
                      </div>
                    </div>

                    <span className="px-2.5 py-0.5 rounded-full font-mono font-bold text-[9px] uppercase tracking-wider self-start sm:self-auto bg-slate-100 text-slate-700 border">
                      {student.status.replace("_", " ")}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-white p-3 rounded-lg border border-gray-100">
                    <div>
                      <span className="block text-[9px] text-gray-400 font-bold">
                        EDUCATION:
                      </span>
                      <span className="font-semibold block truncate leading-relaxed">
                        {student.education || "None"}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[9px] text-gray-400 font-bold">
                        OCCUPATION:
                      </span>
                      <span className="font-semibold block truncate leading-relaxed">
                        {student.occupation || "None"}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[9px] text-gray-400 font-bold">
                        CHOSEN TRACK:
                      </span>
                      <span
                        className="font-semibold block truncate text-[#4B5E40] leading-relaxed"
                        title={student.track}
                      >
                        {getCleanTrackName(student.track)}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[9px] text-gray-400 font-bold">
                        TEST SCORE:
                      </span>
                      <span className="font-semibold block leading-relaxed">
                        {student.score !== undefined
                          ? `${student.score}%`
                          : "Not Taken"}
                      </span>
                    </div>
                  </div>

                  <div className="bg-white p-3 rounded-lg border border-gray-100 space-y-2 mt-2">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                          Learning Level:
                        </span>
                        <span className="font-extrabold text-xs text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded uppercase">
                          {student.learningLevel || "Apprentice level 1"}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 font-sans">
                        <span className="text-[10px] text-gray-555 font-bold">
                          Change level:
                        </span>
                        <select
                          value={student.learningLevel || "Apprentice level 1"}
                          onChange={(e) =>
                            handleChangeLevel(student.id, e.target.value)
                          }
                          className="bg-[#F8FAF8] border border-gray-200 text-[11px] rounded-lg px-2 py-1 outline-none text-gray-800 font-semibold cursor-pointer"
                        >
                          {LEVELS_OPTIONS.map((lvl) => (
                            <option key={lvl} value={lvl}>
                              {lvl}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="border-t border-dashed border-gray-100 pt-2 flex justify-between items-center text-xs">
                      <span className="text-gray-500 font-medium font-mono text-[11px]">
                        🎯 {student.assignedTasks?.length || 0} Custom Assigned
                        Tasks
                      </span>
                      <button
                        onClick={() => {
                          if (assigningTaskId === student.id) {
                            setAssigningTaskId(null);
                          } else {
                            setAssigningTaskId(student.id);
                          }
                        }}
                        className={`text-[10.5px] font-black px-3 py-1 rounded-lg border transition cursor-pointer ${
                          assigningTaskId === student.id
                            ? "bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100"
                            : "bg-teal-50 text-teal-700 border-teal-250 hover:bg-teal-100"
                        }`}
                      >
                        {assigningTaskId === student.id
                          ? "Cancel Assign"
                          : "Assign Custom Task 🎯"}
                      </button>
                    </div>

                    {assigningTaskId === student.id && (
                      <div className="animate-fade-in bg-teal-55 bg-opacity-5 rounded-xl border border-teal-100 p-3.5 space-y-3 mt-2">
                        <h5 className="font-extrabold text-[11px] text-teal-900 uppercase">
                          Assign Custom Task to {student.fullName}
                        </h5>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <span className="block text-[9.5px] font-bold text-gray-405 text-gray-400 uppercase mb-1">
                              Task Title
                            </span>
                            <input
                              type="text"
                              placeholder="e.g. Implement Dockerization Flow"
                              value={customTaskTitle}
                              onChange={(e) =>
                                setCustomTaskTitle(e.target.value)
                              }
                              className="w-full bg-white border border-gray-250 rounded-lg px-2.5 py-1.5 outline-none focus:border-teal-550 text-xs font-semibold"
                            />
                          </div>
                          <div>
                            <span className="block text-[9.5px] font-bold text-gray-405 text-gray-400 uppercase mb-1">
                              Due Deadline Window
                            </span>
                            <input
                              type="text"
                              placeholder="e.g. Wednesday by 4:00 PM WAT"
                              value={customTaskDue}
                              onChange={(e) => setCustomTaskDue(e.target.value)}
                              className="w-full bg-white border border-gray-255 border-gray-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-teal-550 text-xs font-semibold"
                            />
                          </div>
                        </div>
                        <div>
                          <span className="block text-[9.5px] font-bold text-gray-405 text-gray-400 uppercase mb-1">
                            Detailed Description
                          </span>
                          <textarea
                            placeholder="Detail the deliverable assets, files, or testing benchmarks expected..."
                            value={customTaskDesc}
                            onChange={(e) => setCustomTaskDesc(e.target.value)}
                            className="w-full bg-white border border-gray-250 rounded-lg px-2.5 py-1.5 outline-none focus:border-teal-550 text-xs font-medium h-14 resize-none"
                          />
                        </div>
                        <div className="flex justify-between items-center bg-white p-2 rounded-lg border">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-gray-500 font-bold">
                              Priority:
                            </span>
                            {["High", "Medium", "Low"].map((p) => (
                              <button
                                key={p}
                                type="button"
                                onClick={() => setCustomTaskPriority(p as any)}
                                className={`px-2 py-0.5 rounded-md text-[9px] font-bold border transition cursor-pointer ${
                                  customTaskPriority === p
                                    ? "bg-[#4B5E40] text-white border-[#4B5E40]"
                                    : "bg-gray-50 text-gray-650 border-gray-200 hover:bg-gray-100"
                                }`}
                              >
                                {p}
                              </button>
                            ))}
                          </div>

                          <button
                            type="button"
                            onClick={() => handleAssignTask(student.id)}
                            className="px-4 py-1.5 bg-[#4B5E40] hover:bg-[#3d4d34] text-white font-extrabold text-[11px] rounded-lg cursor-pointer flex items-center gap-1 shadow-2xs"
                          >
                            Assign Task ✔
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions Row */}
                  <div className="flex flex-wrap gap-2.5 pt-1 justify-end">
                    {student.status === "assessment_passed" && (
                      <button
                        id={`auth-approve-btn-${student.id}`}
                        onClick={() =>
                          handleStudentAction(student.id, "Approve-Orientation")
                        }
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] rounded-lg cursor-pointer"
                      >
                        Approve Assessment & Unlock Video Compliance
                      </button>
                    )}

                    {student.status === "oriented" && (
                      <button
                        id={`auth-promote-btn-${student.id}`}
                        onClick={() =>
                          handleStudentAction(student.id, "Promote-Dashboard")
                        }
                        className="px-3.5 py-1.5 bg-indigo-650 hover:bg-indigo-700 bg-indigo-600 text-white font-bold text-[11px] rounded-lg cursor-pointer"
                      >
                        Promote to Workspace Dashboard
                      </button>
                    )}

                    {student.status === "assessment_failed" && (
                      <button
                        id={`auth-reset-btn-${student.id}`}
                        onClick={() =>
                          handleStudentAction(student.id, "Pivot-Track")
                        }
                        className="px-3.5 py-1.5 bg-orange-600 hover:bg-orange-700 text-white font-bold text-[11px] rounded-lg cursor-pointer animate-pulse"
                      >
                        Manually Pivot Onboarding State
                      </button>
                    )}

                    <button
                      id={`auth-onboard-btn-${student.id}`}
                      onClick={() =>
                        handleStudentAction(student.id, "Set-Onboarding")
                      }
                      disabled={student.status === "onboarding"}
                      className="px-3 py-1.5 border border-gray-200 text-gray-600 hover:bg-gray-150 rounded-lg text-[11px] disabled:opacity-40 shrink-0 cursor-pointer"
                    >
                      Reset back onto Profiling Step
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MEETINGS MANAGEMENT TAB */}
      {adminTab === "meetings" && (
        <div className="space-y-6 animate-fade-in" id="meetings-tab-root">
          <div className="bg-white rounded-2xl border border-gray-150 p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-gray-100 pb-2.5 gap-2">
              <div>
                <h3 className="font-extrabold text-sm text-gray-900 leading-normal">
                  Interactive Meetings & Time Coordinator
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  Directly schedule, update timings, edit Jitsi coordinate
                  links, or cancel sessions across tracks.
                </p>
              </div>
              <button
                onClick={() => {
                  setEditingMeetingId(null);
                  setMeetingTitle("");
                  setMeetingTime("");
                  setMeetingUrl(
                    `https://meet.jit.si/Bincom-Core-Session-${Math.floor(1000 + Math.random() * 9000)}`,
                  );
                  setMeetingType("Knowledge Track");
                  setMeetingTrack([]);
                  setMeetingTeamTracks([]);
                  setMeetingScheduleDays([
                    "Monday",
                    "Tuesday",
                    "Wednesday",
                    "Thursday",
                    "Friday",
                  ]);
                  setMeetingDuration("60 minutes");
                  setMeetingOrganizer("Admin Team");
                  setMeetingStatus("Upcoming");
                  setMeetingDescription("");
                  setMeetingAssignedUsers([]);
                  setUserSearchText("");
                  setIsAddingMeeting(!isAddingMeeting);
                }}
                className="px-3.5 py-1.5 bg-[#4B5E40] hover:bg-[#3d4d34] text-white text-[11px] font-black rounded-lg cursor-pointer flex items-center gap-1 shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />{" "}
                {isAddingMeeting ? "Close Scheduler" : "Schedule New Meeting"}
              </button>
            </div>

            {/* Scheduler Form */}
            {(isAddingMeeting || editingMeetingId) && (
              <form
                onSubmit={handleSaveMeeting}
                className="bg-gray-50/50 p-4 rounded-xl border border-gray-200 animate-zoom-in space-y-4"
              >
                <h4 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider">
                  {editingMeetingId
                    ? "✏️ Edit Scheduled Meeting Properties"
                    : "📅 Classify & Schedule New Interactive Sync"}
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                      Meeting Title
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Frontend Knowledge Track Session"
                      value={meetingTitle}
                      onChange={(e) => setMeetingTitle(e.target.value)}
                      className="w-full bg-white border border-gray-250 rounded-lg px-2.5 py-1.5 outline-none focus:border-[#4B5E40] text-xs font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                      Meeting Time
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Every Wednesday 4:00 PM WAT"
                      value={meetingTime}
                      onChange={(e) => setMeetingTime(e.target.value)}
                      className="w-full bg-white border border-gray-250 rounded-lg px-2.5 py-1.5 outline-none focus:border-[#4B5E40] text-xs font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                      Meeting Link
                    </label>
                    <input
                      type="url"
                      required
                      placeholder="https://meet.jit.si/..."
                      value={meetingUrl}
                      onChange={(e) => setMeetingUrl(e.target.value)}
                      className="w-full bg-white border border-gray-250 rounded-lg px-2.5 py-1.5 outline-none focus:border-[#4B5E40] text-xs font-semibold"
                    />
                  </div>
                </div>

                {/* Additional Meeting Properties Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-white p-3.5 rounded-xl border border-gray-150">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                      Meeting Duration
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 60 minutes or 1.5 hours"
                      value={meetingDuration}
                      onChange={(e) => setMeetingDuration(e.target.value)}
                      className="w-full bg-slate-50 border border-gray-250 rounded-lg px-2.5 py-1.5 outline-none focus:bg-white focus:border-[#4B5E40] text-xs font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                      Organizer/Admin Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Admin Team, Mentor Joy"
                      value={meetingOrganizer}
                      onChange={(e) => setMeetingOrganizer(e.target.value)}
                      className="w-full bg-slate-50 border border-gray-250 rounded-lg px-2.5 py-1.5 outline-none focus:bg-white focus:border-[#4B5E40] text-xs font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                      Brief Description/Notes
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Discussing project milestones"
                      value={meetingDescription}
                      onChange={(e) => setMeetingDescription(e.target.value)}
                      className="w-full bg-slate-50 border border-gray-250 rounded-lg px-2.5 py-1.5 outline-none focus:bg-white focus:border-[#4B5E40] text-xs font-semibold"
                    />
                  </div>
                </div>

                {/* Meeting Date Selection Section */}
                <div
                  className="bg-white p-4 rounded-xl border border-gray-200 space-y-4"
                  id="meeting-dates-section"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <h5 className="font-extrabold text-[11px] uppercase tracking-wider text-slate-700">
                        Meeting Date(s) <span className="text-rose-500">*</span>
                      </h5>
                      <p className="text-[10px] text-gray-400 font-medium">
                        Select one or multiple calendar dates for this meeting
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setMeetingDates([])}
                        className="px-2.5 py-1 text-[10px] font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-md border border-rose-150 transition cursor-pointer select-none"
                      >
                        Clear All Dates
                      </button>
                    </div>
                  </div>

                  {/* Add Date Controls */}
                  <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center bg-gray-50/50 p-3 rounded-lg border border-gray-150">
                    <div className="w-full sm:w-auto">
                      <label className="block text-[9px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                        Select Calendar Date
                      </label>
                      <input
                        type="date"
                        value={currentPickedDate}
                        onChange={(e) => setCurrentPickedDate(e.target.value)}
                        className="bg-white border border-gray-250 rounded-lg px-2.5 py-1 text-xs font-semibold text-gray-700 outline-none focus:border-[#4B5E40]"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (!currentPickedDate) {
                          triggerError("Please choose a valid calendar date first.");
                          return;
                        }
                        if (meetingDates.includes(currentPickedDate)) {
                          triggerError("This meeting date is already added.");
                          return;
                        }
                        const todayStr = getLagosDateString(new Date());
                        if (!allowPastDates && currentPickedDate < todayStr) {
                          triggerError("Selection of past dates is disabled. Enable past dates below if explicitly required.");
                          return;
                        }
                        setMeetingDates((prev) => [...prev, currentPickedDate].sort());
                        setCurrentPickedDate("");
                      }}
                      className="w-full sm:w-auto sm:self-end px-3 py-1.5 text-xs font-bold text-white bg-[#4B5E40] hover:bg-[#3D4C33] rounded-lg shadow-sm transition cursor-pointer text-center"
                    >
                      + Add Date
                    </button>

                    <div className="flex items-center gap-2 sm:self-end sm:ml-auto h-8 pt-2 sm:pt-0">
                      <input
                        type="checkbox"
                        id="allow-past-dates-toggle"
                        checked={allowPastDates}
                        onChange={(e) => setAllowPastDates(e.target.checked)}
                        className="rounded border-gray-300 text-[#4B5E40] focus:ring-[#4B5E40] h-3.5 w-3.5 cursor-pointer"
                      />
                      <label
                        htmlFor="allow-past-dates-toggle"
                        className="text-[10px] font-bold text-gray-600 select-none cursor-pointer"
                      >
                        Allow Past Dates
                      </label>
                    </div>
                  </div>

                  {/* Selected Dates Display */}
                  {meetingDates.length > 0 ? (
                    <div className="space-y-2">
                      <span className="font-bold text-gray-400 uppercase text-[9px] tracking-wider block">
                        Selected Dates:
                      </span>
                      <div className="flex flex-wrap gap-1.5" id="selected-meeting-dates-list">
                        {meetingDates.map((dateStr) => (
                          <div
                            key={dateStr}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#4B5E40]/10 text-[#4B5E40] border border-[#4B5E40]/20 rounded-full text-[11px] font-bold"
                          >
                            <span>
                              {(() => {
                                try {
                                  const d = new Date(dateStr);
                                  const utcDate = new Date(d.getTime() + d.getTimezoneOffset() * 60000);
                                  return utcDate.toLocaleDateString("en-US", {
                                    month: "long",
                                    day: "numeric",
                                    year: "numeric"
                                  });
                                } catch (e) {
                                  return dateStr;
                                }
                              })()}
                            </span>
                            <button
                              type="button"
                              onClick={() => setMeetingDates((prev) => prev.filter((d) => d !== dateStr))}
                              className="text-rose-600 hover:text-rose-800 font-black cursor-pointer ml-0.5 select-none"
                              title="Remove date"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="mt-1 pt-2 text-rose-600 text-[10px] font-bold animate-pulse flex items-center gap-1">
                      ⚠️ No date selected! A meeting cannot be created or updated until at least one meeting date is chosen.
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div
                    className="relative animate-fade-in"
                    ref={meetingTypeRef}
                  >
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                      Meeting Type
                    </label>
                    <div
                      onClick={() =>
                        setMeetingTypeDropdownOpen(!meetingTypeDropdownOpen)
                      }
                      className="w-full bg-white border border-gray-250 rounded-lg px-2.5 py-2 flex items-center justify-between outline-none focus-within:border-[#4B5E40] text-xs font-semibold text-gray-800 cursor-pointer"
                    >
                      <span className="truncate">
                        {getMeetingTypeLabel(meetingType) ||
                          "Select Meeting Type..."}
                      </span>
                      <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
                    </div>

                    {meetingTypeDropdownOpen && (
                      <div className="absolute z-50 left-0 right-0 mt-1 max-h-80 overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-lg p-2 text-xs font-medium">
                        {/* Search field */}
                        <div className="relative mb-2">
                          <Search className="absolute left-2 top-2 w-3.5 h-3.5 text-gray-400" />
                          <input
                            type="text"
                            placeholder="Search existing meeting types..."
                            value={meetingTypeSearch}
                            onChange={(e) =>
                              setMeetingTypeSearch(e.target.value)
                            }
                            onClick={(e) => e.stopPropagation()}
                            className="w-full bg-white border border-gray-250 rounded-lg pl-7 pr-2.5 py-1.5 outline-none focus:border-[#4B5E40] text-xs"
                          />
                        </div>

                        {/* Meeting list */}
                        <div className="space-y-0.5 max-h-48 overflow-y-auto pr-1">
                          {(state.meetingTypes && state.meetingTypes.length > 0
                            ? state.meetingTypes
                            : [
                                "Knowledge Track",
                                "Microservices",
                                "Project",
                              ]
                          ).filter((type: string) =>
                            type
                              .toLowerCase()
                              .includes(meetingTypeSearch.toLowerCase()),
                          ).length === 0 ? (
                            <div className="p-3 text-center text-gray-400 italic">
                              No matching meeting types.
                            </div>
                          ) : (
                            (state.meetingTypes && state.meetingTypes.length > 0
                              ? state.meetingTypes
                              : [
                                  "Knowledge Track",
                                  "Microservices",
                                  "Project",
                                ]
                            )
                              .filter((type: string) =>
                                type
                                  .toLowerCase()
                                  .includes(meetingTypeSearch.toLowerCase()),
                              )
                              .map((type: string) => {
                                const isSelected = meetingType === type;
                                const isSystemDefault = [
                                  "knowledge track",
                                  "microservices",
                                  "project",
                                ].includes(type.toLowerCase());
                                return (
                                  <div
                                    key={type}
                                    onClick={() => {
                                      setMeetingType(type);
                                      setMeetingTypeDropdownOpen(false);
                                    }}
                                    className={`flex items-center justify-between px-2.5 py-2 rounded-lg cursor-pointer select-none transition ${
                                      isSelected
                                        ? "bg-[#4B5E40]/10 text-[#4B5E40] font-bold"
                                        : "hover:bg-gray-50 text-gray-700"
                                    }`}
                                  >
                                    <span className="truncate">
                                      {getMeetingTypeLabel(type)}
                                    </span>
                                    <div
                                      className="flex items-center gap-1"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <button
                                        type="button"
                                        title="Edit meeting type name"
                                        onClick={() => {
                                          setEditingTypeName(type);
                                          setEditingTypeValue(type);
                                        }}
                                        className="p-1 hover:bg-gray-200/50 rounded text-gray-500 hover:text-slate-800 transition"
                                      >
                                        <Search
                                          className="w-3 h-3 text-transparent bg-slate-400 [mask-image:url('data:image/svg+xml;utf8,<svg viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22currentColor%22 stroke-width=%222%22><path d=%22M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7%22/><path d=%22M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4z%22/></svg>')] shrink-0 bg-no-repeat bg-contain"
                                          style={{ maskSize: "contain" }}
                                          onClick={() => {
                                            setEditingTypeName(type);
                                            setEditingTypeValue(type);
                                          }}
                                        />
                                      </button>

                                      {(!isSystemDefault ||
                                        allowDeleteSystemTypes) && (
                                        <button
                                          type="button"
                                          title="Delete meeting type"
                                          onClick={() =>
                                            handleDeleteMeetingType(type)
                                          }
                                          className="p-1 rounded transition hover:bg-rose-50 text-rose-500 hover:text-rose-700"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })
                          )}
                        </div>

                        {/* Trigger Adding inline */}
                        {!isAddingNewTypeInline && !editingTypeName && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsAddingNewTypeInline(true);
                            }}
                            className="w-full mt-2 py-1.5 border border-dashed border-[#4B5E40]/30 hover:border-[#4B5E40] text-[#4B5E40] text-xs font-bold rounded-lg transition hover:bg-[#4B5E40]/5 flex items-center justify-center gap-1"
                          >
                            <Plus className="w-3.5 h-3.5" /> + Add New Meeting
                            Type
                          </button>
                        )}

                        {/* Inline Adding form */}
                        {isAddingNewTypeInline && (
                          <div
                            className="mt-2 p-2 bg-gray-50 rounded-lg border border-gray-150 space-y-2 animate-fade-in"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                              Add New Type
                            </div>
                            <div className="flex gap-1.5">
                              <input
                                type="text"
                                placeholder="Enter meeting type name..."
                                value={newTypeInputValue}
                                onChange={(e) =>
                                  setNewTypeInputValue(e.target.value)
                                }
                                className="flex-1 bg-white border border-gray-250 rounded-lg px-2 py-1 text-xs outline-none focus:border-[#4B5E40]"
                              />
                            </div>
                            <div className="flex justify-end gap-1.5 pt-0.5">
                              <button
                                type="button"
                                onClick={() => setIsAddingNewTypeInline(false)}
                                className="px-2 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 text-[10.5px] font-bold rounded-md"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  handleCreateMeetingType(newTypeInputValue)
                                }
                                className="px-3 py-1 bg-[#4B5E40] hover:bg-[#3d4d34] text-white text-[10.5px] font-black rounded-md"
                              >
                                Save Entry
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Inline Editing form */}
                        {editingTypeName && (
                          <div
                            className="mt-2 p-2 bg-[#4B5E40]/5 rounded-lg border border-[#4B5E40]/20 space-y-2 animate-fade-in"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="text-[10px] font-bold text-[#4B5E40] uppercase tracking-wider">
                              Rename: {editingTypeName}
                            </div>
                            <div className="flex gap-1.5">
                              <input
                                type="text"
                                value={editingTypeValue}
                                onChange={(e) =>
                                  setEditingTypeValue(e.target.value)
                                }
                                className="flex-1 bg-white border border-[#4B5E40]/25 rounded-lg px-2 py-1 text-xs outline-none focus:border-[#4B5E40]"
                              />
                            </div>
                            <div className="flex justify-end gap-1.5 pt-0.5">
                              <button
                                type="button"
                                onClick={() => setEditingTypeName(null)}
                                className="px-2 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 text-[10.5px] font-bold rounded-md"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  handleCreateMeetingType(
                                    editingTypeValue,
                                    editingTypeName,
                                  )
                                }
                                className="px-3 py-1 bg-[#4B5E40] hover:bg-[#3d4d34] text-white text-[10.5px] font-black rounded-md"
                              >
                                Apply Changes
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Super admin toggle option at bottom */}
                        <div
                          className="mt-2.5 pt-2 border-t border-gray-100 flex items-center gap-2 select-none"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            id="allow-system-defaults-delete"
                            checked={allowDeleteSystemTypes}
                            onChange={(e) =>
                              setAllowDeleteSystemTypes(e.target.checked)
                            }
                            className="rounded text-[#4B5E40] focus:ring-[#4B5E40]"
                          />
                          <label
                            htmlFor="allow-system-defaults-delete"
                            className="text-[9.5px] font-bold text-gray-400 hover:text-gray-600 cursor-pointer uppercase tracking-wider"
                          >
                            Super Admin: Unlock Default Types
                          </label>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="relative" ref={comboboxRef}>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                      User Level(optional)
                    </label>

                    <div className="w-full bg-white border border-gray-250 rounded-lg p-1.5 flex flex-col gap-1.5 focus-within:border-[#4B5E40]">
                      <div className="flex items-center gap-1.5 flex-1 select-none">
                        <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <input
                          type="text"
                          placeholder={
                            meetingTrack.length > 0
                              ? "Search more user level..."
                              : "Select user level..."
                          }
                          value={comboboxSearch}
                          onChange={(e) => {
                            setComboboxSearch(e.target.value);
                            setComboboxOpen(true);
                            setComboboxFocusIndex(0);
                          }}
                          onFocus={() => setComboboxOpen(true)}
                          onKeyDown={(e) => {
                            if (e.key === "ArrowDown") {
                              e.preventDefault();
                              setComboboxOpen(true);
                              setComboboxFocusIndex((prev) =>
                                Math.min(
                                  flatVisibleOptions.length - 1,
                                  prev + 1,
                                ),
                              );
                            } else if (e.key === "ArrowUp") {
                              e.preventDefault();
                              setComboboxOpen(true);
                              setComboboxFocusIndex((prev) =>
                                Math.max(0, prev - 1),
                              );
                            } else if (e.key === "Enter") {
                              e.preventDefault();
                              if (
                                comboboxOpen &&
                                comboboxFocusIndex >= 0 &&
                                comboboxFocusIndex < flatVisibleOptions.length
                              ) {
                                handleSelectTrack(
                                  flatVisibleOptions[comboboxFocusIndex],
                                );
                              } else {
                                setComboboxOpen(true);
                              }
                            } else if (e.key === "Escape") {
                              e.preventDefault();
                              setComboboxOpen(false);
                            }
                          }}
                          className="w-full bg-transparent border-0 outline-none text-xs font-semibold text-gray-850 placeholder-gray-400"
                        />

                        {meetingTrack.length > 0 && (
                          <button
                            type="button"
                            onClick={handleClearAllTracks}
                            className="p-1 text-[10px] font-bold text-gray-500 hover:text-rose-600 transition bg-gray-50 hover:bg-rose-50 rounded"
                            title="Clear all selections"
                          >
                            Clear All
                          </button>
                        )}
                        <ChevronDown
                          className="w-4 h-4 text-gray-400 cursor-pointer shrink-0 hover:text-gray-600"
                          onClick={() => setComboboxOpen(!comboboxOpen)}
                        />
                      </div>
                    </div>

                    {/* Display selected tracks as chips/tags */}
                    {meetingTrack.length > 0 && (
                      <div
                        className="flex flex-wrap gap-1.5 mt-2"
                        id="selected-tracks-chips"
                      >
                        {meetingTrack.map((track) => (
                          <span
                            key={track}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold rounded-lg border transition ${
                              track === "All User Eligible"
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : "bg-[#4B5E40]/10 text-[#4B5E40] border-[#4B5E40]/25"
                            }`}
                          >
                            <span>{track}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveTrack(track)}
                              className="w-3.5 h-3.5 rounded-full hover:bg-black/10 flex items-center justify-center font-bold text-[10px] text-gray-500 hover:text-gray-850"
                            >
                              &times;
                            </button>
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Combobox Dropdown Menu */}
                    {comboboxOpen && (
                      <div className="absolute z-50 left-0 right-0 mt-1 max-h-64 overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-lg py-1 text-xs font-medium">
                        {groupedFilteredOptions.length === 0 ? (
                          <div className="p-3.5 text-center text-gray-400 italic">
                            No track options match your search.
                          </div>
                        ) : (
                          (() => {
                            let itemFlatIdx = 0;
                            return groupedFilteredOptions.map((group) => (
                              <div
                                key={group.category}
                                className="border-b last:border-b-0 border-gray-100 pb-1 last:pb-0"
                              >
                                <div className="px-3 py-1 bg-gray-50/75 text-[9px] text-gray-400 tracking-wider uppercase font-extrabold select-none">
                                  {group.category}
                                </div>
                                <div className="space-y-0.5 mt-0.5 font-sans">
                                  {group.options.map((option) => {
                                    const optionIdx = itemFlatIdx++;
                                    const isSelected =
                                      meetingTrack.includes(option);
                                    const isFocused =
                                      optionIdx === comboboxFocusIndex;
                                    return (
                                      <div
                                        key={option}
                                        onClick={() => {
                                          handleSelectTrack(option);
                                          setComboboxSearch(""); // clear search on select
                                        }}
                                        onMouseEnter={() =>
                                          setComboboxFocusIndex(optionIdx)
                                        }
                                        className={`flex items-center justify-between px-3.5 py-2 cursor-pointer select-none transition ${
                                          isFocused
                                            ? "bg-[#4B5E40]/10 text-[#4B5E40] font-extrabold"
                                            : isSelected
                                              ? "bg-gray-50 text-gray-800 font-bold"
                                              : "hover:bg-gray-55 text-gray-700 font-medium"
                                        }`}
                                      >
                                        <span className="flex items-center gap-2">
                                          {isSelected ? (
                                            <span className="w-4 h-4 rounded bg-[#4B5E40] text-white flex items-center justify-center text-[10px] font-black">
                                              ✓
                                            </span>
                                          ) : (
                                            <span className="w-4 h-4 rounded border border-gray-300 bg-white"></span>
                                          )}
                                          <span>{option}</span>
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            ));
                          })()
                        )}
                      </div>
                    )}
                  </div>

                  <div className="relative animate-fade-in" ref={teamTracksRef}>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                      Target Team Track Eligibility (optional)
                    </label>

                    <div className="w-full bg-white border border-gray-250 rounded-lg p-1.5 flex flex-col gap-1.5 focus-within:border-[#4B5E40] min-h-[38px] justify-center">
                      <div className="flex items-center gap-1.5 flex-1 select-none">
                        <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <input
                          type="text"
                          placeholder={
                            meetingTeamTracks.length > 0
                              ? "Search target team tracks..."
                              : "Select target team tracks..."
                          }
                          value={teamTracksSearch}
                          onChange={(e) => {
                            setTeamTracksSearch(e.target.value);
                            setTeamTracksOpen(true);
                            setTeamTracksFocusIndex(0);
                          }}
                          onFocus={() => setTeamTracksOpen(true)}
                          onKeyDown={(e) => {
                            if (e.key === "ArrowDown") {
                              e.preventDefault();
                              setTeamTracksOpen(true);
                              setTeamTracksFocusIndex((prev) =>
                                Math.min(
                                  filteredTeamTrackOptions.length - 1,
                                  prev + 1,
                                ),
                              );
                            } else if (e.key === "ArrowUp") {
                              e.preventDefault();
                              setTeamTracksOpen(true);
                              setTeamTracksFocusIndex((prev) =>
                                Math.max(0, prev - 1),
                              );
                            } else if (e.key === "Enter") {
                              e.preventDefault();
                              if (
                                teamTracksOpen &&
                                teamTracksFocusIndex >= 0 &&
                                teamTracksFocusIndex <
                                  filteredTeamTrackOptions.length
                              ) {
                                handleSelectTeamTrack(
                                  filteredTeamTrackOptions[
                                    teamTracksFocusIndex
                                  ],
                                );
                                setTeamTracksSearch("");
                              } else {
                                setTeamTracksOpen(true);
                              }
                            } else if (e.key === "Escape") {
                              e.preventDefault();
                              setTeamTracksOpen(false);
                            }
                          }}
                          className="w-full bg-transparent border-0 outline-none text-xs font-semibold text-gray-850 placeholder-gray-400"
                        />

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={handleSelectAllTeamTracks}
                            className="px-1.5 py-0.5 text-[9px] font-black bg-gray-100 hover:bg-[#4B5E40]/10 text-gray-650 hover:text-[#4B5E40] transition rounded uppercase cursor-pointer"
                            title="Select all"
                          >
                            All
                          </button>
                          {meetingTeamTracks.length > 0 && (
                            <button
                              type="button"
                              onClick={handleClearAllTeamTracks}
                              className="px-1.5 py-0.5 text-[9px] font-black bg-rose-50 hover:bg-rose-100 text-rose-600 transition rounded uppercase animate-fade-in cursor-pointer"
                              title="Clear all"
                            >
                              Clear
                            </button>
                          )}
                        </div>
                        <ChevronDown
                          className="w-4 h-4 text-gray-400 cursor-pointer shrink-0 hover:text-gray-600"
                          onClick={() => setTeamTracksOpen(!teamTracksOpen)}
                        />
                      </div>
                    </div>

                    {/* Removable chips/tags */}
                    {meetingTeamTracks.length > 0 && (
                      <div
                        className="flex flex-wrap gap-1.5 mt-2"
                        id="selected-team-tracks-chips"
                      >
                        {meetingTeamTracks.map((track) => (
                          <span
                            key={track}
                            className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-bold rounded-lg border bg-[#4B5E40]/10 text-[#4B5E40] border-[#4B5E40]/25 animate-zoom-in"
                          >
                            <span>{track}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveTeamTrack(track)}
                              className="w-3.5 h-3.5 rounded-full hover:bg-black/10 flex items-center justify-center font-bold text-[10px] text-gray-500 hover:text-gray-850 cursor-pointer"
                            >
                              &times;
                            </button>
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Dropdown Menu */}
                    {teamTracksOpen && (
                      <div className="absolute top-[100%] left-0 right-0 z-50 mt-1 max-h-60 overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-lg py-1 text-xs font-medium">
                        {filteredTeamTrackOptions.length === 0 ? (
                          <div className="p-3.5 text-center text-gray-400 italic">
                            No track options match your search.
                          </div>
                        ) : (
                          filteredTeamTrackOptions.map((option, index) => {
                            const isSelected =
                              meetingTeamTracks.includes(option);
                            const isFocused = index === teamTracksFocusIndex;
                            return (
                              <div
                                key={option}
                                onClick={() => {
                                  handleSelectTeamTrack(option);
                                  setTeamTracksSearch("");
                                }}
                                onMouseEnter={() =>
                                  setTeamTracksFocusIndex(index)
                                }
                                className={`flex items-center justify-between px-3.5 py-2 cursor-pointer select-none transition ${
                                  isFocused
                                    ? "bg-[#4B5E40]/10 text-[#4B5E40] font-extrabold"
                                    : isSelected
                                      ? "bg-gray-50 text-gray-800 font-bold"
                                      : "hover:bg-gray-55 text-gray-700 font-medium"
                                }`}
                              >
                                <span className="flex items-center gap-2">
                                  {isSelected ? (
                                    <span className="w-4 h-4 rounded bg-[#4B5E40] text-white flex items-center justify-center text-[10px] font-black">
                                      ✓
                                    </span>
                                  ) : (
                                    <span className="w-4 h-4 rounded border border-gray-300 bg-white"></span>
                                  )}
                                  <span>{option}</span>
                                </span>
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Direct User Assignments Panel */}
                <div 
                  className="bg-white p-4 rounded-xl border border-gray-200 space-y-3 relative"
                  ref={assignedUsersRef}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <h5 className="font-extrabold text-[11px] uppercase tracking-wider text-slate-700 flex items-center gap-1">
                        👥 Direct User Assignments (Optional)
                      </h5>
                      <p className="text-[10px] text-gray-400 font-medium">
                        Directly assign this meeting to specific participants. When specified, only these users can see this meeting on their dashboard.
                      </p>
                    </div>
                    <div className="flex gap-1.5 shrink-0 select-none">
                      <button
                        type="button"
                        onClick={() => {
                          const nonAdmins = (state.profiles || []).filter((p: any) => p.role !== "admin");
                          setMeetingAssignedUsers(nonAdmins.map((p: any) => p.id));
                        }}
                        className="px-2.5 py-1 text-[10px] font-bold text-[#4B5E40] bg-[#4B5E40]/5 hover:bg-[#4B5E40]/10 rounded-md border border-[#4B5E40]/15 transition cursor-pointer"
                      >
                        Assign All
                      </button>
                      <button
                        type="button"
                        onClick={() => setMeetingAssignedUsers([])}
                        className="px-2.5 py-1 text-[10px] font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-md border border-rose-150 transition cursor-pointer"
                      >
                        Clear All
                      </button>
                    </div>
                  </div>

                  <div className="relative">
                    <div className="w-full bg-white border border-gray-250 rounded-lg p-1.5 flex flex-col gap-1.5 focus-within:border-[#4B5E40] min-h-[38px] justify-center">
                      <div className="flex items-center gap-1.5 flex-1 select-none">
                        <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <input
                          type="text"
                          placeholder={
                            meetingAssignedUsers.length > 0
                              ? "Search/Assign more users..."
                              : "Search/Click to Assign users directly..."
                          }
                          value={userSearchText}
                          onChange={(e) => {
                            setUserSearchText(e.target.value);
                            setUserDropdownOpen(true);
                          }}
                          onFocus={() => setUserDropdownOpen(true)}
                          className="w-full bg-transparent border-0 outline-none text-xs font-semibold text-gray-850 placeholder-gray-400"
                        />
                        <ChevronDown
                          className="w-4 h-4 text-gray-400 cursor-pointer shrink-0 hover:text-gray-600"
                          onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                        />
                      </div>
                    </div>

                    {/* Selected Users Chips */}
                    {meetingAssignedUsers.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2" id="selected-assigned-users-chips">
                        {meetingAssignedUsers.map((uId) => {
                          const userProfile = (state.profiles || []).find((p: any) => p.id === uId);
                          if (!userProfile) return null;
                          return (
                            <span
                              key={uId}
                              className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold rounded-lg border bg-[#4B5E40]/10 text-[#4B5E40] border-[#4B5E40]/25 animate-zoom-in"
                            >
                              <span>{userProfile.fullName} ({userProfile.username})</span>
                              <button
                                type="button"
                                onClick={() => setMeetingAssignedUsers((prev) => prev.filter((id) => id !== uId))}
                                className="w-3.5 h-3.5 rounded-full hover:bg-black/10 flex items-center justify-center font-bold text-[10px] text-gray-500 hover:text-gray-850 cursor-pointer"
                              >
                                &times;
                              </button>
                            </span>
                          );
                        })}
                      </div>
                    )}

                    {/* Dropdown list */}
                    {userDropdownOpen && (() => {
                      const nonAdminProfiles = (state.profiles || []).filter((p: any) => p.role !== "admin");
                      const filteredUsers = nonAdminProfiles.filter((p: any) => {
                        const word = userSearchText.toLowerCase().trim();
                        if (!word) return true;
                        return (p.fullName || "").toLowerCase().includes(word) || 
                               (p.username || "").toLowerCase().includes(word) ||
                               (p.track || "").toLowerCase().includes(word) ||
                               (p.learningLevel || "").toLowerCase().includes(word);
                      });

                      return (
                        <div className="absolute top-[100%] left-0 right-0 z-50 mt-1 max-h-60 overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-lg py-1 text-xs font-medium">
                          {filteredUsers.length === 0 ? (
                            <div className="p-3.5 text-center text-gray-400 italic">
                              No matching students found.
                            </div>
                          ) : (
                            filteredUsers.map((p: any) => {
                              const isSelected = meetingAssignedUsers.includes(p.id);
                              return (
                                <div
                                  key={p.id}
                                  onClick={() => {
                                    if (isSelected) {
                                      setMeetingAssignedUsers((prev) => prev.filter((id) => id !== p.id));
                                    } else {
                                      setMeetingAssignedUsers((prev) => [...prev, p.id]);
                                    }
                                    setUserSearchText("");
                                  }}
                                  className={`flex items-center justify-between px-3.5 py-2 cursor-pointer select-none transition ${
                                    isSelected
                                      ? "bg-[#4B5E40]/10 text-[#4B5E40] font-extrabold"
                                      : "hover:bg-gray-50 text-gray-750 font-medium"
                                  }`}
                                >
                                  <div className="flex items-center gap-2">
                                    {isSelected ? (
                                      <span className="w-4 h-4 rounded bg-[#4B5E40] text-white flex items-center justify-center text-[10px] font-black">
                                        ✓
                                      </span>
                                    ) : (
                                      <span className="w-4 h-4 rounded border border-gray-300 bg-white"></span>
                                    )}
                                    <div className="flex flex-col">
                                      <span className="font-bold text-gray-900">{p.fullName}</span>
                                      <span className="text-[9.5px] text-gray-400">
                                        @{p.username} • {p.track ? p.track.replace("– Beginner Level", "") : "No Track"} • {p.learningLevel || "Apprentice level 1"}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingMeetingId(null);
                      setIsAddingMeeting(false);
                    }}
                    className="px-3 py-1.5 border border-gray-250 hover:bg-gray-100 rounded-lg text-xs font-bold text-gray-650 cursor-pointer"
                  >
                    Discard Changes
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-[#4B5E40] hover:bg-[#3d4d34] text-white text-xs font-black rounded-lg cursor-pointer"
                  >
                    {editingMeetingId
                      ? "Update Session ✔"
                      : "Schedule Meeting ✔"}
                  </button>
                </div>
              </form>
            )}

            {/* List of Meetings */}
            <div className="space-y-2.5">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                Currently Programmed & Scheduled Meetings
              </h4>

              {state.meetings.filter((m: any) => !m.status || m.status.trim().toLowerCase() !== "archived").length === 0 ? (
                <div className="py-8 text-center text-gray-450 text-xs font-medium bg-gray-50/50 rounded-xl border border-dashed">
                  No synchronized meeting tracks configured.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {state.meetings.filter((m: any) => !m.status || m.status.trim().toLowerCase() !== "archived").map((meeting) => (
                    <div
                      key={meeting.id}
                      className="p-3.5 bg-[#F8FAF8] rounded-xl border border-gray-150 flex flex-col justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="flex justify-between items-start gap-1">
                          <span className="text-[9.5px] font-bold uppercase text-gray-400 font-mono tracking-wider">
                            ID: {meeting.id}
                          </span>
                          <span
                            className={`px-2 py-0.5 text-[8.5px] font-extrabold rounded-md border tracking-wide ${
                              meeting.type === "knowledge" ||
                              meeting.type.toLowerCase().includes("knowledge")
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : meeting.type === "standup" ||
                                    meeting.type === "microservice" ||
                                    meeting.type
                                      .toLowerCase()
                                      .includes("standup")
                                  ? "bg-teal-50 text-teal-700 border-teal-200"
                                  : "bg-purple-50 text-purple-700 border-purple-200"
                            }`}
                          >
                            {getMeetingTypeLabel(meeting.type)}
                          </span>
                        </div>
                        <h5 className="font-extrabold text-slate-900 mt-1.5 text-xs sm:text-sm leading-snug">
                          {meeting.title}
                        </h5>

                        <div className="grid grid-cols-1 gap-1 mt-2 text-[11px] text-gray-500 font-medium">
                          <div className="flex items-center gap-1.5">
                            <span className="text-gray-400">🗓️</span>
                            <span className="font-bold text-gray-700">
                              {meeting.timeString}
                            </span>
                          </div>
                          <div className="flex items-start gap-1.5">
                            <span className="text-gray-400 mt-0.5">📅</span>
                            <span className="leading-tight">
                              Scheduled for:{" "}
                              <strong className="text-indigo-800">
                                {getAdminMeetingDateLabel(meeting)}
                              </strong>
                            </span>
                          </div>
                          <div className="flex flex-col gap-1 text-[11px] text-gray-500">
                            <div
                              className="flex items-start gap-1.5"
                              id={`meeting-user-levels-eligibility-${meeting.id}`}
                            >
                              <span className="text-gray-400 mt-0.5">🛡️</span>
                              <span className="leading-tight">
                                User Level Eligibility:{" "}
                                <strong className="text-[#4B5E40] uppercase">
                                  {getUserLevelsDisplay(
                                    meeting.trackId,
                                    meeting.userLevels,
                                  )}
                                </strong>
                              </span>
                            </div>
                            <div
                              className="flex items-start gap-1.5"
                              id={`meeting-team-tracks-eligibility-${meeting.id}`}
                            >
                              <span className="text-gray-400 mt-0.5">👥</span>
                              <span className="leading-tight">
                                Team Track Eligibility:{" "}
                                <strong className="text-[#4B5E40] uppercase">
                                  {getTeamTracksDisplay(
                                    meeting.targetTeamTrackEligibility,
                                  )}
                                </strong>
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 font-mono text-[10px] break-all text-indigo-700 bg-indigo-50/40 p-1 rounded border border-indigo-100">
                            <strong>Link:</strong> {meeting.jitsiUrl}
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-1 border-t border-dashed border-gray-150 justify-end items-center">
                        <button
                          type="button"
                          onClick={() => {
                            if (expandedAttendanceMeetingId === meeting.id) {
                              setExpandedAttendanceMeetingId(null);
                            } else {
                              setExpandedAttendanceMeetingId(meeting.id);
                              setAttendanceFilterTab("all");
                            }
                          }}
                          className={`px-2.5 py-1 text-[10.5px] font-bold rounded-lg transition mr-auto cursor-pointer ${
                            expandedAttendanceMeetingId === meeting.id
                              ? "bg-emerald-600 text-white hover:bg-emerald-700 font-extrabold shadow-sm"
                              : "bg-emerald-50 text-emerald-700 border border-emerald-100 hover:bg-emerald-100"
                          }`}
                        >
                          {expandedAttendanceMeetingId === meeting.id
                            ? "Close Attendance 📊"
                            : "Track Attendance 📊"}
                        </button>
                        <button
                          onClick={() => {
                            setEditingMeetingId(meeting.id);
                            setMeetingTitle(meeting.title);
                            setMeetingTime(meeting.timeString);
                            setMeetingUrl(meeting.jitsiUrl);
                            setMeetingType(meeting.type);
                            // Preload selections correctly
                            const rawLevels =
                              meeting.userLevels !== undefined
                                ? meeting.userLevels
                                : meeting.trackId;
                            setMeetingTrack(
                              Array.isArray(rawLevels)
                                ? rawLevels
                                : rawLevels === "All" || !rawLevels
                                  ? []
                                  : [rawLevels],
                            );
                            setMeetingTeamTracks(
                              meeting.targetTeamTrackEligibility || [],
                            );
                            setMeetingScheduleDays(
                              meeting.scheduleDays &&
                                meeting.scheduleDays.length > 0
                                ? meeting.scheduleDays
                                : [
                                    "Monday",
                                    "Tuesday",
                                    "Wednesday",
                                    "Thursday",
                                    "Friday",
                                  ],
                            );
                            setMeetingDates(meeting.meetingDates || []);
                            
                            // Edit custom properties initialization
                            setMeetingDuration(meeting.duration || "60 minutes");
                            setMeetingOrganizer(meeting.organizer || "Admin Team");
                            setMeetingStatus(meeting.status || "Upcoming");
                            setMeetingDescription(meeting.description || "");
                            setMeetingAssignedUsers(meeting.assignedUserIds || []);
                            setUserSearchText("");
                            
                            setIsAddingMeeting(false);
                          }}
                          className="px-2.5 py-1 text-[10.5px] font-bold text-slate-700 bg-white border border-gray-250 rounded-lg hover:bg-gray-50 transition cursor-pointer"
                        >
                          Edit properties ✏️
                        </button>
                        <button
                          onClick={() => setMeetingToDeleteId(meeting.id)}
                          className="px-2.5 py-1 text-[10.5px] font-bold text-rose-600 bg-rose-50 border border-rose-100 rounded-lg hover:bg-rose-100 transition cursor-pointer"
                        >
                          Delete scheduled 🗑️
                        </button>
                      </div>

                      {/* Attendance Tracker expanded drawer */}
                      {expandedAttendanceMeetingId === meeting.id && (() => {
                        const eligibleAssignments = (state.meetingAssignments || []).filter(
                          (a: any) => a.meetingId === meeting.id
                        );
                        const eligibleUserIds = eligibleAssignments.map((a: any) => a.userId);
                        
                        const eligibleProfiles = (state.profiles || []).filter(
                          (p: any) => p.role !== "admin" && eligibleUserIds.includes(p.id)
                        );
                        
                        const attendanceLogs = (state.attendance || []).filter(
                          (a: any) => a.meetingId === meeting.id
                        );
                        
                        const attendedUserIds = attendanceLogs.map((log: any) => log.userId);
                        
                        // Map users status list
                        const list = eligibleProfiles.map((p: any) => {
                          const log = attendanceLogs.find((l: any) => l.userId === p.id);
                          return {
                            id: p.id,
                            fullName: p.fullName,
                            username: p.username,
                            learningLevel: p.learningLevel || p.techExperience || "Apprentice level 1",
                            track: p.track || "General",
                            attended: !!log,
                            status: log ? log.status : "Absent",
                            timestamp: log ? log.timestamp : null
                          };
                        });

                        // Filter based on selected tab
                        const attendedList = list.filter((item: any) => item.attended);
                        const absentList = list.filter((item: any) => !item.attended);
                        
                        const displayedList = 
                          attendanceFilterTab === "attended" 
                            ? attendedList 
                            : attendanceFilterTab === "absent" 
                              ? absentList 
                              : list;

                        const attendanceRate = list.length > 0 
                          ? Math.round((attendedList.length / list.length) * 100) 
                          : 0;

                        return (
                          <div 
                            className="mt-3 p-3 bg-white border border-gray-200 rounded-xl space-y-3 animate-fade-in text-left col-span-1 md:col-span-2"
                            id={`attendance-tracker-panel-${meeting.id}`}
                          >
                            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                              <div className="flex items-center gap-1.5 text-[#4B5E40] font-extrabold text-xs">
                                <Users className="w-4 h-4" />
                                <span>Attendance Summary</span>
                              </div>
                              <span className="text-[10px] font-extrabold px-1.5 py-0.5 bg-gray-100 text-gray-700 rounded-full">
                                {attendedList.length} / {list.length} Joined
                              </span>
                            </div>

                            {/* Small quick metrics bar */}
                            <div className="grid grid-cols-3 gap-2 text-center">
                              <div className="bg-[#4B5E40]/5 p-1.5 rounded-lg border border-[#4B5E40]/10">
                                <div className="text-[8px] uppercase font-bold text-gray-400">Rate</div>
                                <div className="text-xs font-black text-[#4B5E40]">{attendanceRate}%</div>
                              </div>
                              <div className="bg-emerald-50 p-1.5 rounded-lg border border-emerald-100">
                                <div className="text-[8px] uppercase font-bold text-[#4B5E40]">Joined</div>
                                <div className="text-xs font-black text-emerald-700">{attendedList.length}</div>
                              </div>
                              <div className="bg-rose-50 p-1.5 rounded-lg border border-rose-100">
                                <div className="text-[8px] uppercase font-bold text-rose-500">Absent</div>
                                <div className="text-xs font-black text-rose-700">{absentList.length}</div>
                              </div>
                            </div>

                            {/* Attendance filter tabs */}
                            <div className="flex gap-1 bg-gray-150/60 p-0.5 rounded-lg text-[10px] font-bold">
                              <button
                                type="button"
                                onClick={() => setAttendanceFilterTab("all")}
                                className={`flex-1 py-1 rounded-md text-center transition ${
                                  attendanceFilterTab === "all"
                                    ? "bg-white text-gray-800 shadow-2xs font-extrabold"
                                    : "text-gray-500 hover:text-gray-950"
                                }`}
                              >
                                All ({list.length})
                              </button>
                              <button
                                type="button"
                                onClick={() => setAttendanceFilterTab("attended")}
                                className={`flex-1 py-1 rounded-md text-center transition ${
                                  attendanceFilterTab === "attended"
                                    ? "bg-white text-emerald-700 shadow-2xs font-extrabold"
                                    : "text-gray-500 hover:text-gray-950"
                                }`}
                              >
                                Attended ({attendedList.length})
                              </button>
                              <button
                                type="button"
                                onClick={() => setAttendanceFilterTab("absent")}
                                className={`flex-1 py-1 rounded-md text-center transition ${
                                  attendanceFilterTab === "absent"
                                    ? "bg-white text-rose-600 shadow-2xs font-extrabold"
                                    : "text-gray-500 hover:text-gray-950"
                                }`}
                              >
                                Absent ({absentList.length})
                              </button>
                            </div>

                            {/* Core lists display */}
                            <div className="space-y-1.5 max-h-[170px] overflow-y-auto pr-1">
                              {displayedList.length === 0 ? (
                                <div className="text-center py-4 text-gray-400 text-[10px] font-medium italic">
                                  No records match this filter.
                                </div>
                              ) : (
                                displayedList.map((item: any) => {
                                  const initials = (item.fullName || item.username || "U")
                                    .split(" ")
                                    .map((n: string) => n[0])
                                    .join("")
                                    .substring(0, 2)
                                    .toUpperCase();

                                  return (
                                    <div 
                                      key={item.id}
                                      className="flex items-center justify-between p-1.5 hover:bg-gray-50 rounded-lg border border-gray-100 bg-white transition gap-2"
                                    >
                                      <div className="flex items-center gap-1.5 min-w-0">
                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-black shrink-0 ${
                                          item.attended 
                                            ? "bg-[#4B5E40] text-white" 
                                            : "bg-gray-200 text-gray-600"
                                        }`}>
                                          {initials}
                                        </div>
                                        <div className="min-w-0">
                                          <div className="font-extrabold text-[11px] text-gray-800 truncate">
                                            {item.fullName}
                                          </div>
                                          <div className="text-[9px] text-gray-400 truncate">
                                            @{item.username} • {item.track}
                                          </div>
                                        </div>
                                      </div>

                                      <div className="flex flex-col items-end shrink-0 gap-0.5">
                                        <span className={`px-1.5 py-0.5 text-[8.5px] font-extrabold rounded-md border tracking-wide uppercase ${
                                          item.status === "Attended" || item.status === "on time"
                                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                            : item.status === "Late"
                                              ? "bg-amber-50 text-amber-700 border-amber-200"
                                              : "bg-rose-50 text-rose-700 border-rose-200"
                                        }`}>
                                          {item.status}
                                        </span>
                                        {item.attended && item.timestamp && (
                                          <span className="text-[8.5px] text-gray-400">
                                            {(() => {
                                              try {
                                                const d = new Date(item.timestamp);
                                                return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                              } catch (_) {
                                                return "";
                                              }
                                            })()}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* C. DRILLS PUBLISHING & GRADING BOARD */}
      {adminTab === "drills" && (
        <div
          className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in"
          id="drills-tab-root"
        >
          {/* Post Drill Form (5 cols) */}
          <form
            onSubmit={handleCreateDrill}
            className="lg:col-span-5 bg-white rounded-2xl border border-gray-150 p-5 space-y-4"
            id="admin-drill-form"
          >
            <h3 className="font-extrabold text-sm text-gray-900 leading-normal">
              Post New Weekly Challenge Drill
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                  Drill Title / Challenge Heading
                </label>
                <input
                  id="admin-drill-title"
                  type="text"
                  required
                  placeholder="e.g., Construct SQL models CRM relationships"
                  value={drillTitle}
                  onChange={(e) => setDrillTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-gray-50 rounded-lg border border-gray-200 focus:outline-[#4B5E40]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                  Challenge Instructions description
                </label>
                <textarea
                  id="admin-drill-desc"
                  required
                  placeholder="Detailed guidelines on database migrations..."
                  rows={4}
                  value={drillDesc}
                  onChange={(e) => setDrillDesc(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-gray-50 rounded-lg border border-gray-200 focus:outline-[#4B5E40] resize-y font-sans leading-normal"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                  External Resource reference link
                </label>
                <input
                  id="admin-drill-link"
                  type="url"
                  required
                  placeholder="https://github.com/bincom-acad/specs"
                  value={drillLink}
                  onChange={(e) => setDrillLink(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-gray-50 rounded-lg border border-gray-200 focus:outline-[#4B5E40]"
                />
              </div>
            </div>

            <button
              id="admin-post-drill-btn"
              type="submit"
              disabled={loading || !drillTitle}
              className="w-full py-2 bg-[#4B5E40] hover:bg-[#3d4d34] disabled:opacity-40 text-white font-bold text-xs rounded-lg transition cursor-pointer"
            >
              Publish Drill to Workspaces 🚀
            </button>
          </form>

          {/* Submission grading queues (7 cols) */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-gray-150 p-5 space-y-4">
            <h3 className="font-extrabold text-sm text-gray-950 flex items-center gap-1">
              <Award className="w-4.5 h-4.5 text-[#4B5E40]" /> Weekly Drills
              Grade Desk
            </h3>

            {/* Filters bar for Grading Queue */}
            <div className="grid grid-cols-2 gap-2 bg-gray-50 p-2.5 rounded-xl border border-gray-150">
              {/* Track select */}
              <div className="flex flex-col gap-0.5">
                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">
                  Filter Track:
                </span>
                <select
                  value={drillTrackFilter}
                  onChange={(e) => setDrillTrackFilter(e.target.value)}
                  className="p-1 px-2 text-xs bg-white border border-gray-200 rounded-lg outline-none focus:border-[#4B5E40] cursor-pointer text-gray-700 font-medium"
                >
                  <option value="all">All Tracks</option>
                  {uniqueTracksForDropdown.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status select */}
              <div className="flex flex-col gap-0.5">
                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">
                  Filter Status:
                </span>
                <select
                  value={drillStatusFilter}
                  onChange={(e) => setDrillStatusFilter(e.target.value)}
                  className="p-1 px-2 text-xs bg-white border border-gray-200 rounded-lg outline-none focus:border-[#4B5E40] cursor-pointer text-gray-700 font-medium"
                >
                  <option value="all">All Statuses</option>
                  <option value="Pending">Pending Review</option>
                  <option value="Approved">Approved Pass</option>
                  <option value="Rejected">Rejected Fail</option>
                </select>
              </div>
            </div>

            {state.drillSubmissions.length === 0 ? (
              <p className="text-xs text-gray-400 italic text-center py-8">
                No student solutions submitted in this session yet.
              </p>
            ) : filteredSubmissions.length === 0 ? (
              <p className="text-xs text-gray-400 italic text-center py-8">
                No submissions match the chosen track or status filters.
              </p>
            ) : (
              <div className="space-y-4 max-h-[460px] overflow-y-auto pr-1">
                {filteredSubmissions.map((sub) => (
                  <div
                    key={sub.id}
                    className="p-4 bg-[#F8FAF8] border border-gray-150 rounded-xl text-xs space-y-3"
                    id={`grade-card-${sub.id}`}
                  >
                    <div className="flex items-start justify-between flex-col sm:flex-row gap-2">
                      <div>
                        <span className="font-bold text-gray-900 block text-xs">
                          {sub.fullName}
                        </span>
                        <span className="text-[10px] text-gray-500 font-mono mt-0.5">
                          {sub.drillTitle} | Track: {sub.track}
                        </span>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono leading-none font-bold ${
                          sub.status === "Approved"
                            ? "bg-emerald-50 text-emerald-800"
                            : sub.status === "Rejected"
                              ? "bg-red-50 text-red-800"
                              : "bg-orange-50 text-orange-850"
                        }`}
                      >
                        {sub.status}
                      </span>
                    </div>

                    <p className="font-semibold block whitespace-pre-line truncate leading-normal">
                      Solution URL:{" "}
                      <a
                        id={`link-sub-${sub.id}`}
                        href={sub.solutionUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#4B5E40] hover:underline font-mono text-[11px] font-bold block"
                      >
                        {sub.solutionUrl}
                      </a>
                    </p>

                    {sub.feedback && (
                      <p className="bg-white p-2 border-l-2 border-slate-300 text-gray-600 font-sans italic text-[11px]">
                        <b>Current Feedback:</b> "{sub.feedback}"
                      </p>
                    )}

                    {/* Review Forms */}
                    {gradingSubId === sub.id ? (
                      <form
                        onSubmit={handleGradeDrill}
                        className="bg-white p-3 rounded-lg border border-gray-200 mt-2.5 space-y-3"
                        id={`gradeform-${sub.id}`}
                      >
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <button
                            type="button"
                            id="grade-approve-toggle"
                            onClick={() => setGradingStatus("Approved")}
                            className={`py-1.5 text-center rounded-md font-bold cursor-pointer ${
                              gradingStatus === "Approved"
                                ? "bg-emerald-600 text-white"
                                : "bg-gray-100 text-gray-650"
                            }`}
                          >
                            Approve Pass
                          </button>
                          <button
                            type="button"
                            id="grade-reject-toggle"
                            onClick={() => setGradingStatus("Rejected")}
                            className={`py-1.5 text-center rounded-md font-bold cursor-pointer ${
                              gradingStatus === "Rejected"
                                ? "bg-rose-600 text-white"
                                : "bg-gray-100 text-gray-650"
                            }`}
                          >
                            Reject Fail
                          </button>
                        </div>

                        <div>
                          <input
                            id="admin-grade-feedback"
                            type="text"
                            required
                            placeholder="Mentor feedback rubric comments..."
                            value={gradingFeedback}
                            onChange={(e) => setGradingFeedback(e.target.value)}
                            className="w-full p-2 bg-gray-50 text-xs border border-gray-200 rounded-md"
                          />
                        </div>

                        <div className="flex gap-1.5 justify-end">
                          <button
                            id="cancel-grading-btn"
                            type="button"
                            onClick={() => setGradingSubId("")}
                            className="px-3 py-1 text-[10px] border rounded-md text-gray-600 cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            id="submit-grade-btn"
                            type="submit"
                            className="px-3 py-1 bg-[#4B5E40] text-white rounded-md text-[10px] font-bold cursor-pointer"
                          >
                            Submit Evaluation
                          </button>
                        </div>
                      </form>
                    ) : (
                      <div className="flex justify-end pt-1">
                        <button
                          id={`grade-trigger-btn-${sub.id}`}
                          onClick={() => {
                            setGradingSubId(sub.id);
                            setGradingFeedback(sub.feedback || "");
                          }}
                          className="px-4 py-1.5 bg-[#4B5E40] hover:bg-[#3d4d34] text-white font-bold text-[11px] rounded-lg cursor-pointer"
                        >
                          Grade / Modify Evaluation
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* D. WARNING ALERTS DISPATCH COCKPIT (Section 4.1) */}
      {adminTab === "reminders" && (
        <form
          onSubmit={handleSendReminder}
          className="bg-white rounded-2xl border border-gray-150 p-6 max-w-xl mx-auto space-y-4 animate-fade-in"
          id="reminders-tab-root"
        >
          <div className="border-b border-gray-105 pb-2">
            <h3 className="font-extrabold text-sm text-gray-950">
              One-Click Warning Alerts Dispatcher
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Select lagging or non-compliant users to dispatch push alert
              notifications directly to their alert banners.
            </p>
          </div>

          <div className="space-y-3.5 animate-fade-in">
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-1.5">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500">
                  Target Student Profile
                </label>

                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                    Fast-Filter:
                  </span>
                  <select
                    id="dispatch-track-filter"
                    value={dispatchTrackFilter}
                    onChange={(e) => {
                      setDispatchTrackFilter(e.target.value);
                      setTargetStudentId(""); // reset selected target on filter change
                    }}
                    className="p-1 px-1.5 text-[10px] font-bold bg-gray-50 border rounded text-gray-600 focus:outline-[#4B5E40] cursor-pointer"
                  >
                    <option value="all">All Tracks Combined</option>
                    {uniqueTracksForDropdown.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <select
                id="reminder-target-select"
                required
                value={targetStudentId}
                onChange={(e) => setTargetStudentId(e.target.value)}
                className="w-full p-2.5 bg-gray-50 text-xs border rounded-lg focus:outline-[#4B5E40] font-semibold text-gray-700"
              >
                <option value="">
                  -- Choose student target (
                  {
                    (dispatchTrackFilter === "all"
                      ? standardUsers
                      : standardUsers.filter(
                          (u) =>
                            getCleanTrackName(u.track) === dispatchTrackFilter,
                        )
                    ).length
                  }{" "}
                  matching candidates) --
                </option>
                {(dispatchTrackFilter === "all"
                  ? standardUsers
                  : standardUsers.filter(
                      (u) => getCleanTrackName(u.track) === dispatchTrackFilter,
                    )
                ).map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.fullName} ({getCleanTrackName(u.track)})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                Reminder Alert Message Context
              </label>
              <textarea
                id="reminder-text-input"
                required
                rows={3}
                placeholder="Alert: You missed consecutive Morning Standups. High accountability rules trigger evaluation panels if missed log is recorded again..."
                value={reminderMsg}
                onChange={(e) => setReminderMsg(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 text-xs border rounded-lg focus:outline-[#4B5E40] font-sans"
              />
            </div>
          </div>

          <button
            id="admin-send-reminder-btn"
            type="submit"
            disabled={loading || !targetStudentId || !reminderMsg}
            className="w-full py-2.5 bg-[#4B5E40] hover:bg-[#3d4d34] disabled:opacity-40 text-white font-bold text-xs rounded-xl transition cursor-pointer"
          >
            Dispatch Warning Banner Alert 🎯
          </button>
        </form>
      )}

      {/* E. AUTOMATED 00:00 WAT CRON ENGINE (Section 4.3) */}
      {adminTab === "cron" && (
        <div className="space-y-6">
          <div
            className="bg-white rounded-2xl border border-gray-150 p-6 max-w-xl mx-auto space-y-5 animate-fade-in"
            id="cron-tab-root"
          >
            <div className="text-center space-y-1">
              <div className="w-12 h-12 rounded-xl bg-orange-50 border border-orange-250 flex items-center justify-center mx-auto text-amber-600 shadow-2xs">
                <Cpu className="w-6.5 h-6.5 text-[#4B5E40]" />
              </div>
              <h3 className="font-extrabold text-sm sm:text-base text-gray-950">
                Automated overnight Cron Engine (00:00 WAT WAT)
              </h3>
              <p className="text-xs text-gray-500 max-w-sm mx-auto leading-relaxed">
                Every midnight WAT, the cron scan parses profile assignments and
                populates all 24-hour schedules automatically.
              </p>
            </div>

            <div className="text-center bg-[#F8FAF8] p-4 rounded-xl border border-dashed border-gray-250">
              <button
                id="admin-trigger-cron-btn"
                onClick={handleTriggerSimulatedCron}
                disabled={cronRunning}
                className="px-6 py-2.5 bg-[#4B5E40] hover:bg-[#3d4d34] disabled:bg-gray-200 disabled:text-gray-400 text-white font-extrabold text-xs rounded-xl shadow transition animate-pulse cursor-pointer inline-flex items-center gap-1.5"
              >
                {cronRunning
                  ? "Executing scan..."
                  : "🚀 Manually Trigger Overnight 00:00 WAT Cron Sync"}
              </button>
            </div>

            {/* PRE-ACTIVATION AUDIT PANEL */}
            <div className="border-t border-gray-100 pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  📋 Pre-Activation Audit (Today's Slated Meetings)
                </h4>
                <button
                  type="button"
                  onClick={() => setAdminTab("meetings")}
                  className="text-[11px] text-[#4B5E40] hover:underline font-bold flex items-center gap-0.5 cursor-pointer"
                >
                  Edit List ⚙️
                </button>
              </div>

              {(() => {
                const slatedToday = (state.meetings || []).filter(
                  (m: any) =>
                    (!m.status || m.status.trim().toLowerCase() !== "archived") &&
                    isMeetingScheduledForToday(m)
                );

                if (slatedToday.length === 0) {
                  return (
                    <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-200/60 text-center space-y-1">
                      <p className="text-xs text-amber-800 font-bold">
                        No dynamic meetings are scheduled for today ({todayDateStr}).
                      </p>
                      <p className="text-[10.5px] text-gray-500 font-medium">
                        Running the overnight sync will clear active states on existing meetings to keep schedules accurate.
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    <p className="text-[11px] text-gray-500 font-medium leading-relaxed">
                      The following <strong>{slatedToday.length}</strong> meeting(s) will be automatically marked as <strong>Active</strong> and populated on eligible user calendars today:
                    </p>
                    <div className="space-y-2">
                      {slatedToday.map((meeting: any) => (
                        <div
                          key={meeting.id}
                          className="p-3 bg-[#F8FAF8] rounded-xl border border-gray-150 flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-slate-900 truncate">
                                {meeting.title}
                              </span>
                              <span className="px-1.5 py-0.5 text-[8.5px] font-extrabold rounded-md bg-white border border-gray-200 text-gray-500">
                                {meeting.timeString}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10.5px] text-gray-400 font-medium">
                              <span>📁 {getMeetingTypeLabel(meeting.type)}</span>
                              <span>•</span>
                              <span className="truncate">🎯 Tracks: {meeting.tracks?.join(", ") || "All"}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            <span className="text-[10px] font-bold text-emerald-700">Ready</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Simulated Cron Console logs */}
            {cronLogs.length > 0 && (
              <div className="p-4 bg-gray-900 rounded-xl border border-gray-800 text-left font-mono text-[10px] space-y-1.5 text-emerald-400 leading-normal max-h-56 overflow-y-auto block shadow-inner">
                <span className="text-gray-500 select-none">
                  // SYSTEM CONSOLE OVERNIGHT CRON MONITOR
                </span>
                {cronLogs.map((log, index) => (
                  <p key={index} className="block whitespace-pre-wrap">
                    {log}
                  </p>
                ))}
              </div>
            )}
          </div>

          <div
            className="bg-white rounded-2xl border border-rose-200 p-6 max-w-xl mx-auto space-y-5 animate-fade-in"
            id="danger-zone-root"
          >
            <div className="text-center space-y-1">
              <div className="w-12 h-12 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center mx-auto text-rose-600 shadow-2xs">
                <Trash2 className="w-6.5 h-6.5 text-rose-600" />
              </div>
              <h3 className="font-extrabold text-sm sm:text-base text-gray-950">
                Danger Zone: Database Fresh Start
              </h3>
              <p className="text-xs text-rose-600 max-w-sm mx-auto leading-relaxed">
                Delete all pre-seeded mock records (meetings, projects, drills, attendance logs, and student profiles) to start with a completely fresh, empty workspace. Your admin account will be preserved.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center bg-rose-50/50 p-4 rounded-xl border border-dashed border-rose-200">
              <button
                id="admin-purge-db-btn"
                onClick={handlePurgeDatabase}
                disabled={purgingDb || seedingDb}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-extrabold text-xs rounded-xl shadow transition cursor-pointer inline-flex items-center justify-center gap-1.5"
              >
                {purgingDb ? "Purging Seed Data..." : "🗑️ Purge Seed Data & Start Fresh"}
              </button>

              <button
                id="admin-seed-db-btn"
                onClick={handleSeedDatabase}
                disabled={purgingDb || seedingDb}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-extrabold text-xs rounded-xl shadow transition cursor-pointer inline-flex items-center justify-center gap-1.5"
              >
                {seedingDb ? "Seeding Database..." : "🌱 Seed Default Configurations"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* F. EXPORT CSV DATA REPORTING (Section 4.2) */}
      {adminTab === "export" && (
        <div
          className="bg-white rounded-2xl border border-gray-150 p-6 max-w-xl mx-auto space-y-5 animate-fade-in"
          id="export-tab-root"
        >
          <div className="border-b border-gray-105 pb-2.5 text-center">
            <h3 className="font-extrabold text-sm sm:text-base text-gray-950">
              Administrative Ledger Report Exporter
            </h3>
            <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
              Generate structured punctuality logs and attendance metrics
              audit-compliant with administrative reports formatting.
            </p>
          </div>

          <div className="flex gap-2.5 justify-center">
            <button
              id="admin-csv-download-btn"
              onClick={handleDownloadCSV}
              className="px-5 py-2.5 bg-[#4B5E40] hover:bg-[#3d4d34] text-white text-xs font-bold rounded-xl shadow transition cursor-pointer inline-flex items-center gap-1.5"
            >
              <FileDown className="w-4 h-4" /> Download Attendance Audit Sheet
              (CSV)
            </button>
            <button
              id="admin-preview-btn"
              type="button"
              onClick={() => setCsvPreview(!csvPreview)}
              className="px-4 py-2.5 border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-xl text-xs font-semibold cursor-pointer"
            >
              Toggle Ledger Preview
            </button>
          </div>

          {csvPreview && (
            <div className="bg-[#F8FAF8] p-4 rounded-xl border border-gray-200 text-left font-mono text-[9px] text-gray-650 max-h-56 overflow-y-auto block whitespace-pre shadow-inner">
              <span className="font-bold border-b border-gray-300 pb-1.5 mb-1.5 block">
                CSV Ledger Row Preview (Pre-download)
              </span>
              <div>
                {
                  "AttendanceRecordID,StudentEmail,StudentName,TrackGroup,MeetingName,CheckInTime,PunctualityRating\n"
                }
                {state.attendance.map(
                  (a) =>
                    `"${a.id}","${a.username}@bincom.co","${a.fullName}","${a.track}","${a.meetingTitle}","${a.timestamp}","${a.status}"\n`,
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* --- CONFIRM DELETE MEETING MODAL --- */}
      {meetingToDeleteId &&
        (() => {
          const meetingToDelete = state.meetings.find(
            (m: any) => m.id === meetingToDeleteId,
          );
          return (
            <div
              className="fixed inset-0 z-55 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
              id="delete-meeting-modal-overlay"
            >
              <div className="bg-white rounded-2xl border border-gray-150 p-6 max-w-sm w-full shadow-2xl space-y-4 relative transform scale-100 transition duration-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100">
                    <span className="text-lg">⚠️</span>
                  </div>
                  <h3 className="font-extrabold text-[#991b1b] text-sm sm:text-base leading-normal">
                    Delete Meeting
                  </h3>
                </div>

                <p className="text-xs text-gray-500 font-medium leading-relaxed">
                  Are you sure you want to permanently delete this scheduled
                  meeting? This action cannot be undone.
                </p>

                {meetingToDelete && (
                  <div className="bg-rose-50/50 p-3 rounded-xl border border-rose-100 space-y-1 text-left">
                    <div className="text-[9px] font-bold text-rose-500 uppercase tracking-wide">
                      Selected Meeting Details:
                    </div>
                    <div className="text-xs font-extrabold text-slate-800">
                      {meetingToDelete.title}
                    </div>
                    <div className="flex items-center gap-1.5 text-[10.5px] text-gray-500 mt-1">
                      <span>🗓️ {meetingToDelete.timeString}</span>
                      <span className="text-gray-300">•</span>
                      <span>ID: {meetingToDelete.id}</span>
                    </div>
                  </div>
                )}

                <div className="flex gap-2.5 justify-end pt-2 border-t border-gray-100">
                  <button
                    type="button"
                    id="cancel-delete-meeting-btn"
                    disabled={isDeletingMeeting}
                    onClick={() => setMeetingToDeleteId(null)}
                    className="px-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-bold rounded-xl border border-gray-250 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    id="confirm-delete-meeting-btn"
                    disabled={isDeletingMeeting}
                    onClick={() => handleDeleteMeeting(meetingToDeleteId)}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none transition flex items-center gap-1.5 justify-center"
                  >
                    {isDeletingMeeting ? (
                      <>
                        <span className="animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full shrink-0"></span>
                        <span>Deleting...</span>
                      </>
                    ) : (
                      <span>Confirm Delete</span>
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

      {/* --- CONFIRM DELETE MEETING TYPE MODAL --- */}
      {meetingTypeToDelete &&
        (() => {
          const relatedMeetings = (state.meetings || []).filter(
            (m: any) =>
              m.type &&
              m.type.trim().toLowerCase() ===
                meetingTypeToDelete.trim().toLowerCase()
          );
          const isMeetingTypeInUse = relatedMeetings.length > 0;

          return (
            <div
              className="fixed inset-0 z-55 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
              id="delete-meeting-type-modal-overlay"
            >
              <div className="bg-white rounded-2xl border border-gray-150 p-6 max-w-md w-full shadow-2xl space-y-4 relative transform scale-100 transition duration-200 animate-slide-up">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border ${
                      isMeetingTypeInUse
                        ? "bg-amber-50 text-amber-600 border-amber-100"
                        : "bg-rose-50 text-rose-600 border-rose-100"
                    }`}
                  >
                    <span className="text-lg">
                      {isMeetingTypeInUse ? "⚠️" : "🗑️"}
                    </span>
                  </div>
                  <h3
                    className={`font-extrabold text-sm sm:text-base leading-normal ${
                      isMeetingTypeInUse ? "text-amber-850" : "text-[#991b1b]"
                    }`}
                  >
                    Delete Meeting Type
                  </h3>
                </div>

                {isMeetingTypeInUse ? (
                  <>
                    <p
                      className="text-xs text-gray-750 font-semibold leading-relaxed"
                      id="meeting-type-in-use-warning"
                    >
                      This Meeting Type is currently assigned to one or more
                      scheduled meetings and cannot be deleted until those
                      meetings are updated or removed.
                    </p>

                    <div className="bg-amber-50/40 p-3 rounded-xl border border-amber-100 space-y-1 text-left">
                      <div className="text-[9px] font-bold text-amber-600 uppercase tracking-wide">
                        In-Use Meeting Type:
                      </div>
                      <div className="text-xs font-bold text-slate-800">
                        {meetingTypeToDelete}
                      </div>
                      <div className="text-[10px] text-gray-500">
                        {relatedMeetings.length} active scheduled meeting(s)
                        detected
                      </div>
                    </div>

                    {showRelatedMeetings && (
                      <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 max-h-48 overflow-y-auto space-y-2 text-left animate-fade-in">
                        <div className="text-[9px] font-bold text-gray-500 uppercase tracking-wide">
                          Related Meetings Details:
                        </div>
                        {relatedMeetings.map((m: any) => (
                          <div
                            key={m.id}
                            className="border-b border-gray-150 pb-1.5 last:border-0 last:pb-0 text-xs animate-fade-in"
                          >
                            <div className="font-extrabold text-gray-800">
                              {m.title}
                            </div>
                            <div className="text-[10px] text-gray-400 mt-0.5">
                              🗓️ {m.timeString || m.time || "N/A"}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex gap-2.5 justify-end pt-2 border-t border-gray-100">
                      <button
                        type="button"
                        onClick={() => setMeetingTypeToDelete(null)}
                        className="px-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-bold rounded-xl border border-gray-250 cursor-pointer select-none transition"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setShowRelatedMeetings(!showRelatedMeetings)
                        }
                        className="px-4 py-2 bg-[#4B5E40] hover:bg-[#3d4d34] text-white text-xs font-bold rounded-xl shadow cursor-pointer select-none transition"
                      >
                        {showRelatedMeetings
                          ? "Hide Related Meetings"
                          : "View Related Meetings"}
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-xs text-gray-500 font-medium leading-relaxed">
                      Are you sure you want to delete this Meeting Type?
                    </p>
                    <p className="text-xs text-rose-600 font-bold leading-relaxed">
                      This action cannot be undone.
                    </p>

                    <div className="bg-rose-50/50 p-3 rounded-xl border border-rose-100 space-y-1 text-left">
                      <div className="text-[9px] font-bold text-rose-500 uppercase tracking-wide font-mono">
                        Custom Meeting Type Name:
                      </div>
                      <div className="text-xs font-extrabold text-slate-800">
                        {meetingTypeToDelete}
                      </div>
                    </div>

                    <div className="flex gap-2.5 justify-end pt-2 border-t border-gray-100">
                      <button
                        type="button"
                        disabled={isDeletingMeetingType}
                        onClick={() => setMeetingTypeToDelete(null)}
                        className="px-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-bold rounded-xl border border-gray-250 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none transition"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        id="confirm-delete-meeting-type-btn"
                        disabled={isDeletingMeetingType}
                        onClick={handleConfirmDeleteMeetingType}
                        className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none transition flex items-center gap-1.5 justify-center"
                      >
                        {isDeletingMeetingType ? (
                          <>
                            <span className="animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full shrink-0"></span>
                            <span>Deleting...</span>
                          </>
                        ) : (
                          <span>Delete</span>
                        )}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })()}

      {confirmDialog.isOpen && (
        <div
          className="fixed inset-0 z-55 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
          id="custom-confirm-modal-overlay"
        >
          <div className="bg-white rounded-2xl border border-gray-150 p-6 max-w-sm w-full shadow-2xl space-y-4 relative transform scale-100 transition duration-200">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border ${
                confirmDialog.isDanger
                  ? "bg-rose-50 text-rose-600 border-rose-100"
                  : "bg-emerald-50 text-emerald-600 border-emerald-100"
              }`}>
                <span className="text-lg">{confirmDialog.isDanger ? "⚠️" : "💡"}</span>
              </div>
              <h3 className={`font-extrabold text-sm sm:text-base leading-normal ${
                confirmDialog.isDanger ? "text-[#991b1b]" : "text-[#4B5E40]"
              }`}>
                {confirmDialog.title}
              </h3>
            </div>

            <p className="text-xs text-gray-500 font-medium leading-relaxed">
              {confirmDialog.message}
            </p>

            <div className="flex gap-2.5 justify-end pt-2">
              <button
                type="button"
                id="custom-confirm-cancel-btn"
                onClick={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 border border-gray-250 text-gray-600 hover:bg-gray-50 rounded-xl text-xs font-semibold cursor-pointer select-none"
              >
                {confirmDialog.cancelText || "Cancel"}
              </button>
              <button
                type="button"
                id="custom-confirm-action-btn"
                onClick={confirmDialog.onConfirm}
                className={`px-4 py-2 text-white text-xs font-bold rounded-xl shadow cursor-pointer select-none transition ${
                  confirmDialog.isDanger
                    ? "bg-rose-600 hover:bg-rose-700"
                    : "bg-emerald-600 hover:bg-emerald-700"
                }`}
              >
                {confirmDialog.confirmText || "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
