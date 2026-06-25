import express, { Request, Response } from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { 
  Profile, 
  Meeting, 
  AttendanceRecord, 
  StandupLog, 
  PersonalDevelopmentLog, 
  TechUpdateSubmission, 
  WeeklyDrill, 
  WeeklyDrillSubmission,
  SocialEventLog,
  ProjectDescriptor,
  DailyReportLog,
  CustomTask,
  MeetingAssignment,
  MeetingHistoryRecord,
  AttendanceAuditLog
} from "./src/types";

const app = express();
const PORT = 3000;

app.use(express.json());

// In-Memory Database State
const db = {
  profiles: [] as Profile[],
  meetings: [] as Meeting[],
  attendance: [] as AttendanceRecord[],
  standups: [] as StandupLog[],
  personalDevelopment: [] as PersonalDevelopmentLog[],
  techUpdates: [] as TechUpdateSubmission[],
  weeklyDrills: [] as WeeklyDrill[],
  drillSubmissions: [] as WeeklyDrillSubmission[],
  socialLogs: [] as SocialEventLog[],
  projects: [] as ProjectDescriptor[],
  dailyReports: [] as DailyReportLog[],
  kdCounts: {} as Record<string, number>, // userId -> count (monthly tracker)
  reminders: [] as { id: string; userId: string; message: string; timestamp: string; read: boolean }[],
  microserviceOwners: {} as Record<string, string>,
  meetingTypes: [] as string[],
  meetingAssignments: [] as MeetingAssignment[],
  groups: [] as any[],
  group_members: [] as any[],
  meetingHistory: [] as MeetingHistoryRecord[],
  attendanceAuditLogs: [] as AttendanceAuditLog[]
};

const DB_PATH = path.join(process.cwd(), "db.json");

const saveDb = () => {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), "utf8");
  } catch (err) {
    console.error("Failed to write to persistent db.json:", err);
  }
};

const getLagosDateString = (date: Date): string => {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "Africa/Lagos",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    });
    const parts = formatter.formatToParts(date);
    const year = parts.find(p => p.type === "year")?.value || "";
    const month = parts.find(p => p.type === "month")?.value || "";
    const day = parts.find(p => p.type === "day")?.value || "";
    return `${year}-${month}-${day}`;
  } catch (e) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
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

const parseMeetingTimeToMinutes = (timeStr: string): number => {
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
    // Fallback: WAT is GMT +1
    const utcHours = date.getUTCHours();
    const lagosHours = (utcHours + 1) % 24;
    return lagosHours * 60 + date.getUTCMinutes();
  }
};

const formatMinutesToTimeString = (minsPastMidnight: number): string => {
  let hours = Math.floor(minsPastMidnight / 60) % 24;
  const minutes = minsPastMidnight % 60;
  const ampm = hours >= 12 ? "PM" : "AM";
  let displayHours = hours % 12;
  if (displayHours === 0) displayHours = 12;
  const displayMinutes = String(minutes).padStart(2, "0");
  return `${String(displayHours).padStart(2, "0")}:${displayMinutes} ${ampm}`;
};

const backfillMeetingHistory = () => {
  try {
    if (!db.meetings) return;
    if (!db.meetingHistory) {
      db.meetingHistory = [];
    }
    let modified = false;

    // Get all unique dates from attendance records, or use today as a default
    const attendanceDates = new Set<string>();
    db.attendance.forEach((a: any) => {
      if (a.timestamp) {
        try {
          const dateStr = getLagosDateString(new Date(a.timestamp));
          attendanceDates.add(dateStr);
        } catch (e) {
          // Ignore
        }
      }
    });

    const now = new Date();
    const todayStr = getLagosDateString(now);
    attendanceDates.add(todayStr);

    db.meetings.forEach((m: any) => {
      const startTimeMinutes = parseMeetingTimeToMinutes(m.timeString || "09:00 AM");
      const durationStr = m.duration || "30 minutes";
      const match = durationStr.match(/(\d+)/);
      const durationMinutes = match ? parseInt(match[1], 10) : 30;
      const endTimeMinutes = startTimeMinutes + durationMinutes;

      // Check dates
      attendanceDates.forEach((dateStr) => {
        // Is the meeting scheduled for this date?
        const isScheduled = (() => {
          if (m.meetingDates && Array.isArray(m.meetingDates) && m.meetingDates.length > 0) {
            return m.meetingDates.includes(dateStr);
          }
          // Get day name for that date
          const dateObj = new Date(dateStr);
          const dayName = getLagosDayOfWeek(dateObj);
          const days = m.scheduleDays && m.scheduleDays.length > 0
            ? m.scheduleDays
            : ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
          return days.some((day: string) => day.trim().toLowerCase() === dayName.toLowerCase());
        })();

        if (isScheduled) {
          // If it's today, only history-fy if it has ended + 1 min
          if (dateStr === todayStr) {
            const currentMinutes = getLagosMinutesPastMidnight(now);
            if (currentMinutes < endTimeMinutes + 1) {
              return; // Not yet ended today
            }
          }

          const histId = `m-hist-${m.id}-${dateStr}`;
          const alreadyInHistory = db.meetingHistory.some((h: any) => h.id === histId);
          if (!alreadyInHistory) {
            const formattedEndTime = formatMinutesToTimeString(endTimeMinutes);
            const userLevels = Array.isArray(m.userLevels) ? m.userLevels : (m.userLevels ? [m.userLevels] : ["All"]);
            const targetTeamTrackEligibility = Array.isArray(m.targetTeamTrackEligibility) ? m.targetTeamTrackEligibility : (m.targetTeamTrackEligibility ? [m.targetTeamTrackEligibility] : ["All"]);

            db.meetingHistory.push({
              id: histId,
              meetingId: m.id,
              title: m.title,
              type: m.type,
              date: dateStr,
              scheduledStartTime: m.timeString || "09:00 AM",
              scheduledEndTime: formattedEndTime,
              duration: m.duration || "30 minutes",
              organizer: m.organizer || "System Admin",
              userLevels: userLevels,
              targetTeamTrackEligibility: targetTeamTrackEligibility
            });
            modified = true;
          }
        }
      });
    });

    if (modified) {
      saveDb();
    }
  } catch (err) {
    console.error("Failed to backfill meeting history:", err);
  }
};

const loadDb = () => {
  try {
    if (fs.existsSync(DB_PATH)) {
      const content = fs.readFileSync(DB_PATH, "utf8");
      const parsed = JSON.parse(content);
      Object.assign(db, parsed);
      
      // Migrate legacy user learning levels automatically in the database to preserve existing user data
      if (db.profiles && Array.isArray(db.profiles)) {
        let profilesUpdated = false;
        db.profiles.forEach((p: any) => {
          if (p.learningLevel) {
            const levelCleaned = p.learningLevel.trim().toLowerCase();
            let newLevel = p.learningLevel;
            if (levelCleaned === "apprentice") {
              newLevel = "Apprentice level 1";
            } else if (levelCleaned === "beginner level volunteer" || levelCleaned === "volunteer beginner level") {
              newLevel = "Volunteer beginner level";
            } else if (levelCleaned === "intermediate level volunteer" || levelCleaned === "volunteer intermediate level") {
              newLevel = "Volunteer intermediate level";
            } else if (levelCleaned === "junior associate") {
              newLevel = "Junior associate level 1";
            } else if (levelCleaned === "senior associate") {
              newLevel = "Senior associate level 1";
            }
            if (newLevel !== p.learningLevel) {
              p.learningLevel = newLevel;
              p.techExperience = newLevel; // Sync techExperience as well
              profilesUpdated = true;
            }
          }
        });
        if (profilesUpdated) {
          saveDb();
        }
      }

      // Migrate legacy "Design" tracks to "Graphics/UI/UX Design"
      if (db.profiles && Array.isArray(db.profiles)) {
        let profilesTrackUpdated = false;
        db.profiles.forEach((p: any) => {
          if (p.track) {
            const trackCleaned = p.track.trim().toLowerCase();
            if (trackCleaned === "design" || trackCleaned === "ui/ux design" || trackCleaned === "ui/ux design team" || trackCleaned === "graphics/ui/ux design") {
              if (p.track !== "Graphics/UI/UX Design") {
                p.track = "Graphics/UI/UX Design";
                profilesTrackUpdated = true;
              }
            }
          }
        });
        if (profilesTrackUpdated) {
          saveDb();
        }
      }

      // Migrate meeting track eligibility list
      if (db.meetings && Array.isArray(db.meetings)) {
        let meetingsTrackUpdated = false;
        db.meetings.forEach((m: any) => {
          if (m.targetTeamTrackEligibility && Array.isArray(m.targetTeamTrackEligibility)) {
            const initialTracksStr = JSON.stringify(m.targetTeamTrackEligibility);
            m.targetTeamTrackEligibility = m.targetTeamTrackEligibility.map((t: string) => {
              if (typeof t !== "string") return t;
              const cleaned = t.trim().toLowerCase();
              if (cleaned === "design" || cleaned === "ui/ux design" || cleaned === "graphics/ui/ux design") {
                return "Graphics/UI/UX Design";
              }
              return t;
            });
            if (JSON.stringify(m.targetTeamTrackEligibility) !== initialTracksStr) {
              meetingsTrackUpdated = true;
            }
          }
          if (m.trackId) {
            if (Array.isArray(m.trackId)) {
              const initialTrackIdStr = JSON.stringify(m.trackId);
              m.trackId = m.trackId.map((t: any) => {
                if (typeof t !== "string") return t;
                const cleaned = t.trim().toLowerCase();
                if (cleaned === "design" || cleaned === "ui/ux design" || cleaned === "graphics/ui/ux design") {
                  return "Graphics/UI/UX Design";
                }
                return t;
              });
              if (JSON.stringify(m.trackId) !== initialTrackIdStr) {
                meetingsTrackUpdated = true;
              }
            } else if (typeof m.trackId === "string") {
              const cleaned = m.trackId.trim().toLowerCase();
              if (cleaned === "design" || cleaned === "ui/ux design" || cleaned === "graphics/ui/ux design") {
                m.trackId = "Graphics/UI/UX Design";
                meetingsTrackUpdated = true;
              }
            }
          }
        });
        if (meetingsTrackUpdated) {
          saveDb();
        }
      }

      // Migrate existing meetings user levels eligibility list to the new levels format
      if (db.meetings && Array.isArray(db.meetings)) {
        let meetingsLevelsUpdated = false;
        db.meetings.forEach((m: any) => {
          if (m.userLevels && Array.isArray(m.userLevels)) {
            const initialLevelsStr = JSON.stringify(m.userLevels);
            m.userLevels = m.userLevels.map((l: string) => {
              if (typeof l !== "string") return l;
              const cleaned = l.trim().toLowerCase();
              if (cleaned === "apprentice") return "Apprentice level 1";
              if (cleaned === "apprentice – level 1" || cleaned === "apprentice level 1") return "Apprentice level 1";
              if (cleaned === "apprentice – level 2" || cleaned === "apprentice level 2") return "Apprentice level 2";
              if (cleaned === "apprentice – level 3" || cleaned === "apprentice level 3") return "Apprentice level 3";
              if (cleaned === "beginner level volunteer" || cleaned === "volunteer – beginner level" || cleaned === "volunteer beginner level") return "Volunteer beginner level";
              if (cleaned === "intermediate level volunteer" || cleaned === "volunteer – intermediate level" || cleaned === "volunteer intermediate level") return "Volunteer intermediate level";
              if (cleaned === "junior associate") return "Junior associate level 1";
              if (cleaned === "junior associate – level 1" || cleaned === "junior associate level 1") return "Junior associate level 1";
              if (cleaned === "junior associate – level 2" || cleaned === "junior associate level 2") return "Junior associate level 2";
              if (cleaned === "junior associate – level 3" || cleaned === "junior associate level 3") return "Junior associate level 3";
              if (cleaned === "senior associate") return "Senior associate level 1";
              if (cleaned === "senior associate – level 1" || cleaned === "senior associate level 1") return "Senior associate level 1";
              if (cleaned === "senior associate – level 2" || cleaned === "senior associate level 2") return "Senior associate level 2";
              if (cleaned === "senior associate – level 3" || cleaned === "senior associate level 3") return "Senior associate level 3";
              return l;
            });
            if (JSON.stringify(m.userLevels) !== initialLevelsStr) {
              meetingsLevelsUpdated = true;
            }
          }
        });
        if (meetingsLevelsUpdated) {
          saveDb();
        }
      }

      // Ensure existing meetings have meetingDates and isActive status
      if (db.meetings && Array.isArray(db.meetings)) {
        let updated = false;
        const todayStr = getLagosDateString(new Date());
        const todayDayName = getLagosDayOfWeek(new Date());
        db.meetings.forEach((m: any) => {
          let mChanged = false;
          if (!m.meetingDates || !Array.isArray(m.meetingDates) || m.meetingDates.length === 0) {
            m.meetingDates = [todayStr];
            mChanged = true;
          }
          // Set active status based on dates/schedule days for seamless loading
          const hasTodayDate = m.meetingDates && m.meetingDates.includes(todayStr);
          const hasTodayDay = m.scheduleDays && m.scheduleDays.includes(todayDayName);
          const shouldBeActive = hasTodayDate || hasTodayDay;
          if (m.isActive !== shouldBeActive) {
            m.isActive = shouldBeActive;
            mChanged = true;
          }
          if (mChanged) {
            updated = true;
          }
        });
        if (updated) {
          saveDb();
        }
      }

      // Migrate legacy meeting types automatically in the database
      if (db.meetingTypes && Array.isArray(db.meetingTypes)) {
        db.meetingTypes = db.meetingTypes.map(type => {
          const t = type.toLowerCase().trim();
          if (t === "knowledge sharing hub session" || t === "knowledge") return "Knowledge Track";
          if (t === "weekly progress standup room" || t === "weekly progress standup" || t === "microservice" || t === "standup") return "Microservices";
          if (t === "personal development (pd) session" || t === "project" || t === "pd") return "Project";
          return type;
        });
        // De-duplicate
        db.meetingTypes = Array.from(new Set(db.meetingTypes));
      }

      if (db.meetings && Array.isArray(db.meetings)) {
        let meetingsUpdated = false;
        db.meetings.forEach(m => {
          const t = String(m.type || "").toLowerCase().trim();
          if (t === "knowledge" || t === "knowledge sharing hub session") {
            m.type = "Knowledge Track";
            meetingsUpdated = true;
          } else if (t === "microservice" || t === "standup" || t === "weekly progress standup" || t === "weekly progress standup room") {
            m.type = "Microservices";
            meetingsUpdated = true;
          } else if (t === "project" || t === "pd" || t === "personal development (pd) session") {
            m.type = "Project";
            meetingsUpdated = true;
          }
        });
        if (meetingsUpdated) {
          saveDb();
        }
      }

      if (!db.meetingTypes || db.meetingTypes.length === 0) {
        db.meetingTypes = [
          "Knowledge Track",
          "Microservices",
          "Project"
        ];
        saveDb();
      }

      if (!db.meetingAssignments || !Array.isArray(db.meetingAssignments)) {
        db.meetingAssignments = [];
        saveDb();
      }

      console.log("Database successfully loaded from persistent storage:", db.profiles.length, "profiles loaded");
      
      // Sync assignments on boot to ensure fresh database mappings
      syncAllAssignments();
      backfillMeetingHistory();
    } else {
      preSeedDatabase();
      saveDb();
    }
  } catch (err) {
    console.error("Failed to read from persistent db.json, fallback pre-seed:", err);
    preSeedDatabase();
  }
};

// Syncing meeting assignments helpers
const isUserInMeetingGroup = (profile: any, meeting: any): boolean => {
  // 1. Check Projects (often used as developer squads / project groups)
  const projId = meeting.projectId || meeting.project_id;
  if (projId) {
    const project = (db.projects || []).find((p: any) => p.id === projId);
    if (project && project.members && Array.isArray(project.members)) {
      const usernameLower = (profile.username || "").toLowerCase();
      const emailLower = (profile.email || "").toLowerCase();
      const idLower = (profile.id || "").toLowerCase();
      const isMember = project.members.some((m: string) => {
        const mL = String(m).toLowerCase();
        return mL === usernameLower || mL === emailLower || mL === idLower;
      });
      if (isMember) return true;
    }
  }

  // 2. Check general "groupId" or "group_id" on meeting
  const meetGroupId = meeting.groupId || meeting.group_id || meeting.assignedGroupId;
  if (meetGroupId) {
    // Check if the user profile has a matching groupId field
    const userGroupId = profile.groupId || profile.group_id || profile.group;
    if (userGroupId && String(userGroupId).toLowerCase() === String(meetGroupId).toLowerCase()) {
      return true;
    }

    // Check "groups" table in db
    if (db.groups && Array.isArray(db.groups)) {
      const group = db.groups.find((g: any) => String(g.id).toLowerCase() === String(meetGroupId).toLowerCase() || String(g.name).toLowerCase() === String(meetGroupId).toLowerCase());
      if (group && group.members && Array.isArray(group.members)) {
        const usernameLower = (profile.username || "").toLowerCase();
        const emailLower = (profile.email || "").toLowerCase();
        const idLower = (profile.id || "").toLowerCase();
        const isMember = group.members.some((m: string) => {
          const mL = String(m).toLowerCase();
          return mL === usernameLower || mL === emailLower || mL === idLower;
        });
        if (isMember) return true;
      }
    }

    // Check "group_members" many-to-many table in db
    if (db.group_members && Array.isArray(db.group_members)) {
      const isMember = db.group_members.some((gm: any) => {
        const gmGroupId = gm.groupId || gm.group_id;
        const gmUserId = gm.userId || gm.user_id || gm.email;
        return String(gmGroupId).toLowerCase() === String(meetGroupId).toLowerCase() && 
               (String(gmUserId).toLowerCase() === String(profile.id).toLowerCase() || 
                String(gmUserId).toLowerCase() === String(profile.email).toLowerCase() || 
                String(gmUserId).toLowerCase() === String(profile.username).toLowerCase());
      });
      if (isMember) return true;
    }
  }

  // 3. Also check meeting.assignedGroupIds array
  const assignedGroupIds = meeting.assignedGroupIds || [];
  if (Array.isArray(assignedGroupIds) && assignedGroupIds.length > 0) {
    for (const gId of assignedGroupIds) {
      if (!gId) continue;
      // Check profile groupId
      const userGroupId = profile.groupId || profile.group_id || profile.group;
      if (userGroupId && String(userGroupId).toLowerCase() === String(gId).toLowerCase()) {
        return true;
      }

      // Check db.groups
      if (db.groups && Array.isArray(db.groups)) {
        const group = db.groups.find((g: any) => String(g.id).toLowerCase() === String(gId).toLowerCase() || String(g.name).toLowerCase() === String(gId).toLowerCase());
        if (group && group.members && Array.isArray(group.members)) {
          const usernameLower = (profile.username || "").toLowerCase();
          const emailLower = (profile.email || "").toLowerCase();
          const idLower = (profile.id || "").toLowerCase();
          const isMember = group.members.some((m: string) => {
            const mL = String(m).toLowerCase();
            return mL === usernameLower || mL === emailLower || mL === idLower;
          });
          if (isMember) return true;
        }
      }

      // Check group_members
      if (db.group_members && Array.isArray(db.group_members)) {
        const isMember = db.group_members.some((gm: any) => {
          const gmGroupId = gm.groupId || gm.group_id;
          const gmUserId = gm.userId || gm.user_id || gm.email;
          return String(gmGroupId).toLowerCase() === String(gId).toLowerCase() && 
                 (String(gmUserId).toLowerCase() === String(profile.id).toLowerCase() || 
                  String(gmUserId).toLowerCase() === String(profile.email).toLowerCase() || 
                  String(gmUserId).toLowerCase() === String(profile.username).toLowerCase());
        });
        if (isMember) return true;
      }
    }
  }

  return false;
};

const syncAllAssignments = () => {
  if (!db.meetingAssignments || !Array.isArray(db.meetingAssignments)) {
    db.meetingAssignments = [];
  }
  if (!db.groups) db.groups = [];
  if (!db.group_members) db.group_members = [];

  const assignments: MeetingAssignment[] = [];
  const activeMeetings = db.meetings || [];
  const activeProfiles = db.profiles || [];

  activeMeetings.forEach((meeting) => {
    activeProfiles.forEach((profile) => {
      // 1. Team Track Eligibility Match
      const targetTracks = meeting.targetTeamTrackEligibility;
      const isGlobalTrack = !targetTracks || (Array.isArray(targetTracks) && targetTracks.length === 0);
      const userTrack = profile.track || "";
      const isTrackMatch = profile.role === "admin" || isGlobalTrack || (Array.isArray(targetTracks) && targetTracks.some(
        (t) => t.trim().toLowerCase() === userTrack.trim().toLowerCase() || userTrack.trim().toLowerCase() === "all"
      ));

      // 2. User Level Eligibility Match
      const rawLevels = meeting.userLevels !== undefined ? meeting.userLevels : meeting.trackId;
      const isGlobalLevel = !rawLevels || (Array.isArray(rawLevels) && rawLevels.length === 0) || rawLevels === "All" || rawLevels === "";
      const userLevel = profile.learningLevel || profile.techExperience || "Apprentice level 1";
      
      let isLevelMatch = false;
      if (profile.role === "admin") {
        isLevelMatch = true;
      } else if (isGlobalLevel) {
        isLevelMatch = true;
      } else if (Array.isArray(rawLevels)) {
        const filtered = rawLevels.filter(l => l && l !== "All User Eligible" && l !== "All User Level" && l !== "All Tracks Eligibility");
        if (filtered.length === 0) {
          isLevelMatch = true;
        } else {
          isLevelMatch = filtered.some((l: string) => {
            const mLevel = l.trim().toLowerCase();
            const uLevel = userLevel.trim().toLowerCase();
            return mLevel === uLevel || mLevel.includes(uLevel) || uLevel.includes(mLevel);
          });
        }
      } else {
        const mLevel = String(rawLevels).trim().toLowerCase();
        const uLevel = userLevel.trim().toLowerCase();
        isLevelMatch = mLevel === uLevel || mLevel.includes(uLevel) || uLevel.includes(mLevel);
      }

      // 3. Combined Eligibility
      const teamTrackSpecified = !isGlobalTrack;
      const userLevelSpecified = !isGlobalLevel;

      let eligible = false;
      const hasDirectAssignments = meeting.assignedUserIds && Array.isArray(meeting.assignedUserIds) && meeting.assignedUserIds.length > 0;
      const hasGroupAssignments = !!(meeting.projectId || meeting.project_id || meeting.groupId || meeting.group_id || meeting.assignedGroupId || (meeting.assignedGroupIds && meeting.assignedGroupIds.length > 0));

      const isDirectAssigned = hasDirectAssignments && meeting.assignedUserIds.includes(profile.id);
      const isGroupAssigned = hasGroupAssignments && isUserInMeetingGroup(profile, meeting);

      if (hasDirectAssignments || hasGroupAssignments) {
        // Explicitly assigned to individuals or groups or both
        eligible = isDirectAssigned || isGroupAssigned;
      } else {
        if (teamTrackSpecified && userLevelSpecified) {
          eligible = isTrackMatch && isLevelMatch;
        } else if (teamTrackSpecified) {
          eligible = isTrackMatch;
        } else if (userLevelSpecified) {
          eligible = isLevelMatch;
        } else {
          // 4. Global Meetings (Both empty or null) -> Show to ALL users
          eligible = true;
        }
      }

      if (eligible) {
        assignments.push({
          meetingId: meeting.id,
          userId: profile.id
        });
      }
    });
  });

  db.meetingAssignments = assignments;
  saveDb();
};

// Automatic Save Middleware for any successful mutations
app.use((req, res, next) => {
  if (req.method !== "GET") {
    res.on("finish", () => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        saveDb();
      }
    });
  }
  next();
});

// Pre-populate Mock Database with highly illustrative and professional content
const preSeedDatabase = () => {
  db.meetingTypes = [
    "Knowledge Track",
    "Microservices",
    "Project"
  ];
  // Profiles in various funnel stages
  db.profiles = [
    {
      id: "admin-1",
      email: "hadekunleabdulwally@gmail.com",
      username: "hadekunle",
      fullName: "Adewale Kunle",
      education: "B.Sc. Computer Engineering",
      occupation: "Platform Director / Tech Mentor",
      techExperience: "Advanced",
      track: "All",
      role: "admin",
      status: "admin",
      score: 100,
      joinedAt: "2026-06-01T08:00:00Z"
    }
  ];

  // Prepopulate standard organizational projects representational items
  db.projects = [
    {
      id: "proj_1",
      name: "Bincom Dev Master Tracker",
      description: "A centralized command control hub tracking student compliance, attendance algorithms, daily drills, and performance metrics across tracks.",
      status: "Active",
      members: [],
      githubUrl: "https://github.com/bincom-devs/dev-master-tracker",
      meetings: [
        { id: "m_p1", title: "Dev Master Progress Sync", time: "02:00 PM", jitsiUrl: "https://meet.jit.si/BincomDevMasterSync" }
      ]
    },
    {
      id: "proj_2",
      name: "eMigr8 Visa Pathway Portal",
      description: "Globally accessible advisory platform mapping talent immigration prospects through digital tech skill assessments and legal pathways.",
      status: "Active",
      members: [],
      githubUrl: "https://github.com/bincom-devs/emigr8-portal",
      meetings: [
        { id: "m_p2", title: "eMigr8 Architecture Refinement", time: "03:00 PM", jitsiUrl: "https://meet.jit.si/BincomEMigr8Refinement" }
      ]
    },
    {
      id: "proj_3",
      name: "Bincom Smart Academy LMS",
      description: "Automated learning management platform supporting digital orientation assets, interactive PDF reading logs, and course reviews for students.",
      status: "Hold",
      members: [],
      githubUrl: "https://github.com/bincom-devs/academy-lms",
      meetings: []
    }
  ];

  // Initial set of Daily Meetings (Standard Baseline WAT schedule generated overnight)
  db.meetings = [
    {
      id: "meet_1",
      title: "Morning Alignment & Accountability Standup",
      type: "Knowledge Track",
      timeString: "09:45 AM",
      trackId: "All",
      jitsiUrl: "https://meet.jit.si/BincomDailyMorningStandup",
      scheduleDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
    },
    {
      id: "meet_2",
      title: "Knowledge Development (KD) Deep Dive Session",
      type: "Microservices",
      timeString: "09:00 AM",
      trackId: "All",
      jitsiUrl: "https://us02web.zoom.us/j/89297167866?pwd=bENIbWRVMHZOWjNOL0xqNDZhdkFWZz09",
      scheduleDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
    },
    {
      id: "meet_3",
      title: "Dev Master Project Scrum Sync",
      type: "Project",
      timeString: "02:00 PM",
      trackId: "All",
      jitsiUrl: "https://meet.jit.si/BincomDevMasterSync",
      projectId: "proj_1",
      scheduleDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
    },
    {
      id: "meet_4",
      title: "Evening Achievement Review & Wrap-up",
      type: "Knowledge Track",
      timeString: "05:00 PM",
      trackId: "All",
      jitsiUrl: "https://meet.jit.si/BincomEveningAchievementsReview",
      scheduleDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
    }
  ];

  // Pre-seed some standard global Weekly Drills
  db.weeklyDrills = [
    {
      id: "drill_1",
      title: "Interactive Responsive CSS Layout Challenge",
      description: "Design a clean 3-tier grid dashboard display relying purely on tailwind CSS utility parameters. Must use proper media queries, adequate flex wrapping, and strict forest green aesthetics.",
      link: "https://github.com/bincom-drills/responsive-css-forest-green",
      postedAt: "2026-06-02T10:00:00Z"
    },
    {
      id: "drill_2",
      title: "Relational CRM Schema Layout & Querying",
      description: "Formulate a relational database structure featuring profiles, track assignments, and attendance logs. Draft query lines calculating student punctuality ratings based on 09:00 AM margins.",
      link: "https://github.com/bincom-drills/relational-crm-schemas",
      postedAt: "2026-06-03T11:00:00Z"
    }
  ];

  db.drillSubmissions = [];
  db.attendance = [];
  db.kdCounts = {};
  db.personalDevelopment = [];
  db.standups = [];
  db.techUpdates = [];
  db.reminders = [];
};

loadDb();

// --- Auth Endpoints ---

// Register
app.post("/api/auth/register", (req: Request, res: Response) => {
  const { email, username, fullName, education, occupation, techExperience, track, isAdmin, password } = req.body;

  if (!email || !username || !fullName) {
    res.status(400).json({ error: "Missing required profile attributes" });
    return;
  }

  if (!password) {
    res.status(400).json({ error: "Password is required." });
    return;
  }

  if (password.length < 8) {
    res.status(400).json({ error: "Password too short: must be at least 8 characters long." });
    return;
  }

  if (!/\d/.test(password)) {
    res.status(400).json({ error: "Password too weak: it must contain at least one number (figure)." });
    return;
  }

  const existing = db.profiles.find(p => p.email.toLowerCase() === email.toLowerCase() || p.username.toLowerCase() === username.toLowerCase());
  if (existing) {
    res.status(400).json({ error: "User with this email or username already exists!" });
    return;
  }

  const newProfile: Profile = {
    id: `u-${Date.now()}`,
    email,
    username,
    fullName,
    password: password || "",
    education: education || "",
    occupation: occupation || "",
    techExperience: techExperience || "Beginner",
    track: track || "Frontend Development (React, Vue, HTML, CSS)",
    role: isAdmin ? "admin" : "user",
    status: isAdmin ? "admin" : "onboarding",
    joinedAt: new Date().toISOString()
  };

  db.profiles.push(newProfile);
  syncAllAssignments();
  res.status(201).json({ success: true, profile: newProfile });
});

// Login
app.post("/api/auth/login", (req: Request, res: Response) => {
  const { identifier, password } = req.body; // Can be email, username, or special direct select
  if (!identifier) {
    res.status(400).json({ error: "Credentials credentials required" });
    return;
  }

  const user = db.profiles.find(p => 
    p.email.toLowerCase() === identifier.toLowerCase() || 
    p.username.toLowerCase() === identifier.toLowerCase()
  );

  if (!user) {
    res.status(404).json({ error: "Staff/Student with this credential not found on our system registries" });
    return;
  }

  // Verify password if the user has a password set
  if (user.password && password && user.password !== password) {
    res.status(401).json({ error: "Incorrect password. Please verify and try again." });
    return;
  }

  // Once a user has passed the assessment, the user no longer needs to go through that next time when logging in, just dashboard directly
  if ((user.score !== undefined && user.score >= 70) || ["assessment_passed", "oriented"].includes(user.status)) {
    user.status = "dashboard";
  }

  res.json({ success: true, profile: user });
});

// Direct admin bypass router
app.post("/api/auth/admin-bypass", (req: Request, res: Response) => {
  const { userId, email, username, fullName } = req.body;
  
  // Find or create forced admin profile
  let user = db.profiles.find(p => p.id === userId || p.email === email);
  if (!user) {
    user = {
      id: userId || `admin-${Date.now()}`,
      email: email || "admin-bypass@bincom.co",
      username: username || "bypass_admin",
      fullName: fullName || "Bypass Overseer",
      education: "N/A",
      occupation: "System Evaluator",
      techExperience: "Advanced",
      track: "All",
      role: "admin",
      status: "admin",
      joinedAt: new Date().toISOString()
    };
    db.profiles.push(user);
  } else {
    // Elevate existing bypass user to admin status directly
    user.role = "admin";
    user.status = "admin";
  }

  res.json({ success: true, profile: user });
});

// --- User Profile State Endpoints ---

// Update profile questionnaire onboarding attributes
app.post("/api/profile/update", (req: Request, res: Response) => {
  const { userId, fullName, education, occupation, techExperience, track, learningLevel, previousCourseCompleted } = req.body;
  const user = db.profiles.find(p => p.id === userId);
  
  if (!user) {
    res.status(404).json({ error: "Student profile not found" });
    return;
  }

  if (fullName) {
    user.fullName = fullName;
  }
  user.education = education || "";
  user.occupation = occupation || "";
  user.techExperience = techExperience || "No experience";
  user.track = track || "Frontend Development (React, Vue, HTML, CSS)";
  user.learningLevel = learningLevel || "Apprentice level 1";
  user.previousCourseCompleted = !!previousCourseCompleted;

  // If learning level selected is Mentor or Admin, automatically elevate role & status!
  if (learningLevel === "Admin" || learningLevel === "Mentor") {
    user.role = "admin";
    user.status = "admin";
  } else {
    // Normal onboarding flow transitions user
    user.role = "user";
    if (user.status === "onboarding") {
      user.status = "assessment_failed";
    }
  }

  res.json({ success: true, profile: user });
});

// Post assessment scoring outcome
app.post("/api/profile/submit-assessment", (req: Request, res: Response) => {
  const { userId, scorePercentage } = req.body;
  const user = db.profiles.find(p => p.id === userId);

  if (!user) {
    res.status(404).json({ error: "Profile details not configured" });
    return;
  }

  user.score = scorePercentage;
  if (scorePercentage >= 70) {
    user.status = "assessment_passed";
  } else {
    user.status = "assessment_failed";
    // Feed alert reminder
    db.reminders.push({
      id: `rem-${Date.now()}`,
      userId: user.id,
      message: `Your track assessment score was ${scorePercentage}%. Feel free to retake it or select a different track.`,
      timestamp: new Date().toISOString(),
      read: false
    });
  }

  res.json({ success: true, profile: user });
});

// Reset status back to onboarding (General back button/nav utility)
app.post("/api/profile/reset-to-onboarding", (req: Request, res: Response) => {
  const { userId } = req.body;
  const user = db.profiles.find(p => p.id === userId);

  if (!user) {
    res.status(404).json({ error: "Student details missing" });
    return;
  }

  user.status = "onboarding";
  user.score = undefined;
  
  res.json({ success: true, profile: user });
});

// Clear score to retake the assessment
app.post("/api/profile/retake-assessment", (req: Request, res: Response) => {
  const { userId } = req.body;
  const user = db.profiles.find(p => p.id === userId);

  if (!user) {
    res.status(404).json({ error: "Student details missing" });
    return;
  }

  user.score = undefined;
  user.status = "assessment_failed";
  
  res.json({ success: true, profile: user });
});

// Clear Orientation gate compliance checkbox
app.post("/api/profile/clear-orientation", (req: Request, res: Response) => {
  const { userId } = req.body;
  const user = db.profiles.find(p => p.id === userId);

  if (!user) {
    res.status(404).json({ error: "Student target profile not found" });
    return;
  }

  user.status = "dashboard";
  res.json({ success: true, profile: user });
});

// Reset status back to onboarding (Pivot track system utility)
app.post("/api/profile/pivot-track", (req: Request, res: Response) => {
  const { userId, newTrack } = req.body;
  const user = db.profiles.find(p => p.id === userId);

  if (!user) {
    res.status(404).json({ error: "Student details missing" });
    return;
  }

  user.track = newTrack;
  user.status = "onboarding";
  user.score = undefined;
  
  syncAllAssignments();
  res.json({ success: true, profile: user });
});

// --- General State Endpoint ---
app.get("/api/state", (req: Request, res: Response) => {
  const userId = req.query.userId as string;
  let userReminders = [] as typeof db.reminders;
  if (userId) {
    userReminders = db.reminders.filter(r => r.userId === userId);
  }

  // Determine user's profile and if they are Admin
  const user = userId ? db.profiles.find(p => p.id === userId) : null;
  const isAdmin = user && user.role === "admin";

  let filteredMeetings = db.meetings || [];
  const now = new Date();
  const todayStr = getLagosDateString(now);
  const todayDayName = getLagosDayOfWeek(now);

  // Apply end-time + 1 minute cutoff universally for all users
  filteredMeetings = filteredMeetings.filter((m: any) => {
    const isToday = (() => {
      if (m.meetingDates && Array.isArray(m.meetingDates) && m.meetingDates.length > 0) {
        return m.meetingDates.includes(todayStr);
      }
      const days = m.scheduleDays && m.scheduleDays.length > 0
        ? m.scheduleDays
        : ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
        
      return days.some((day: string) => day.trim().toLowerCase() === todayDayName.toLowerCase());
    })();

    if (isToday) {
      const scheduledTimeStr = m.timeString || m.time || "09:00 AM";
      const scheduledMinutes = parseMeetingTimeToMinutes(scheduledTimeStr);
      const currentMinutes = getLagosMinutesPastMidnight(now);

      const durationStr = m.duration || "30 minutes";
      const matchDuration = durationStr.match(/(\d+)/);
      const durationMinutes = matchDuration ? parseInt(matchDuration[1], 10) : 30;
      const endTimeMinutes = scheduledMinutes + durationMinutes;
      const cutoffMinutes = endTimeMinutes + 1;

      if (currentMinutes >= cutoffMinutes) {
        return false;
      }
    }
    return true;
  });

  if (!isAdmin) {
    filteredMeetings = filteredMeetings.filter((m: any) => {
      // 1. Display only meetings scheduled for the current date (today)
      if (m.status && m.status.trim().toLowerCase() === "archived") {
        return false;
      }
      const isScheduledForToday = (() => {
        if (m.meetingDates && Array.isArray(m.meetingDates) && m.meetingDates.length > 0) {
          return m.meetingDates.includes(todayStr);
        }
        const days = m.scheduleDays && m.scheduleDays.length > 0
          ? m.scheduleDays
          : ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
          
        return days.some((day: string) => day.trim().toLowerCase() === todayDayName.toLowerCase());
      })();

      if (!isScheduledForToday) {
        return false;
      }

      // If user profile is not found, default to hiding all meeting details to prevent exposure
      if (!user) {
        return false;
      }

      // 2. Check if the user is explicitly assigned to this meeting via backend assignment
      const isAssigned = (db.meetingAssignments || []).some(
        (ma: any) => ma.meetingId === m.id && ma.userId === user.id
      );

      // 3. User Level Eligibility (e.g., the user's assigned level matches the meeting's allowed levels)
      const userLevelValue = user.learningLevel || user.techExperience || "Apprentice level 1";
      const userTrackValue = user.track || "";

      const targetTracks = m.targetTeamTrackEligibility;
      const isGlobalTrack = !targetTracks || (Array.isArray(targetTracks) && targetTracks.length === 0);
      const rawLevels = m.userLevels !== undefined ? m.userLevels : m.trackId;
      const isGlobalLevel = !rawLevels || (Array.isArray(rawLevels) && rawLevels.length === 0) || rawLevels === "All" || rawLevels === "";
      const isGlobal = isGlobalTrack && isGlobalLevel;

      const isUserLevelEligible = (uLevel: string, mLevels: any): boolean => {
        const checkLevel = uLevel || "Apprentice level 1";
        const rawL = mLevels !== undefined ? mLevels : "All";
        if (!rawL || (Array.isArray(rawL) && rawL.length === 0) || rawL === "All" || rawL === "") {
          return true;
        }
        if (Array.isArray(rawL)) {
          const filtered = rawL.filter(l => l && l !== "All User Eligible" && l !== "All User Level" && l !== "All Tracks Eligibility");
          if (filtered.length === 0) {
            return true;
          }
          return filtered.some((l: string) => {
            const mLevel = l.trim().toLowerCase();
            const uL = checkLevel.trim().toLowerCase();
            return mLevel === uL || mLevel.includes(uL) || uL.includes(mLevel);
          });
        }
        if (rawL === "All User Eligible" || rawL === "All User Level" || rawL === "All Tracks Eligibility") {
          return true;
        }
        const mLevel = String(rawL).trim().toLowerCase();
        const uL = checkLevel.trim().toLowerCase();
        return mLevel === uL || mLevel.includes(uL) || uL.includes(mLevel);
      };

      const isTeamTrackEligible = (uTrack: string, mTracks: any): boolean => {
        const checkTrack = uTrack || "";
        if (checkTrack.trim().toLowerCase() === "all") {
          return true;
        }
        if (!mTracks || (Array.isArray(mTracks) && mTracks.length === 0)) {
          return true;
        }
        if (Array.isArray(mTracks)) {
          return mTracks.some((t: string) => {
            const mTrack = t.trim().toLowerCase();
            const uT = checkTrack.trim().toLowerCase();
            return mTrack === uT || uT === "all";
          });
        }
        const mTrack = String(mTracks).trim().toLowerCase();
        const uT = checkTrack.trim().toLowerCase();
        return mTrack === uT || uT === "all";
      };

      const levelMatch = isUserLevelEligible(userLevelValue, rawLevels);
      const trackMatch = isTeamTrackEligible(userTrackValue, targetTracks);

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
  }

  let returnedAttendance = db.attendance || [];
  let returnedProfiles = db.profiles || [];
  let returnedHistory = db.meetingHistory || [];
  let returnedAuditLogs = [] as any[];

  if (!isAdmin) {
    if (userId) {
      returnedAttendance = db.attendance.filter(a => a.userId === userId);
      const userProfile = db.profiles.find(p => p.id === userId);
      if (userProfile) {
        const userLevelValue = userProfile.learningLevel || userProfile.techExperience || "Apprentice level 1";
        const userTrackValue = userProfile.track || "";
        
        returnedHistory = (db.meetingHistory || []).filter((h: any) => {
          const isAssigned = (db.meetingAssignments || []).some(
            (ma: any) => ma.meetingId === h.meetingId && ma.userId === userId
          );
          if (isAssigned) return true;

          const targetTracks = h.targetTeamTrackEligibility;
          const isGlobalTrack = !targetTracks || (Array.isArray(targetTracks) && targetTracks.length === 0) || targetTracks.includes("All");
          const rawLevels = h.userLevels;
          const isGlobalLevel = !rawLevels || (Array.isArray(rawLevels) && rawLevels.length === 0) || rawLevels.includes("All") || rawLevels === "All" || rawLevels === "";
          const isGlobal = isGlobalTrack && isGlobalLevel;
          if (isGlobal) return true;

          const trackMatch = (() => {
            if (userTrackValue.trim().toLowerCase() === "all") return true;
            if (!targetTracks || targetTracks.length === 0) return true;
            return targetTracks.some((t: string) => t.trim().toLowerCase() === userTrackValue.trim().toLowerCase() || t.trim().toLowerCase() === "all");
          })();

          const levelMatch = (() => {
            if (!rawLevels || rawLevels.length === 0 || rawLevels.includes("All")) return true;
            return rawLevels.some((l: string) => {
              const mLevel = l.trim().toLowerCase();
              const uL = userLevelValue.trim().toLowerCase();
              return mLevel === uL || mLevel.includes(uL) || uL.includes(mLevel);
            });
          })();

          let isEligible = false;
          if (!isGlobalTrack && !isGlobalLevel) {
            isEligible = trackMatch && levelMatch;
          } else if (!isGlobalTrack) {
            isEligible = trackMatch;
          } else {
            isEligible = levelMatch;
          }
          return isEligible;
        });
        returnedProfiles = [userProfile];
      } else {
        returnedHistory = [];
        returnedProfiles = [];
      }
    } else {
      returnedAttendance = [];
      returnedProfiles = [];
      returnedHistory = [];
    }
  } else {
    returnedAuditLogs = db.attendanceAuditLogs || [];
  }

  res.json({
    profiles: returnedProfiles,
    meetings: filteredMeetings,
    attendance: returnedAttendance,
    standups: db.standups,
    personalDevelopment: db.personalDevelopment,
    techUpdates: db.techUpdates,
    weeklyDrills: db.weeklyDrills,
    drillSubmissions: db.drillSubmissions,
    socialLogs: db.socialLogs,
    projects: db.projects,
    dailyReports: db.dailyReports,
    kdCounts: db.kdCounts,
    reminders: userReminders,
    microserviceOwners: db.microserviceOwners || {},
    meetingTypes: db.meetingTypes || [],
    meetingAssignments: db.meetingAssignments || [],
    meetingHistory: returnedHistory,
    attendanceAuditLogs: returnedAuditLogs
  });
});

// --- Daily Meetings Attendance Hub ---
app.post("/api/meetings/join", (req: Request, res: Response) => {
  const { userId, meetingId } = req.body;
  const user = db.profiles.find(p => p.id === userId);
  const meeting = db.meetings.find(m => m.id === meetingId);

  if (!user || !meeting) {
    res.status(404).json({ error: "Student or Meeting registry matching parameters not found" });
    return;
  }

  // Access Control: check if user is assigned or eligible
  const isAssigned = (db.meetingAssignments || []).some(
    (ma) => ma.meetingId === meetingId && ma.userId === userId
  );
  if (!isAssigned && user.role !== "admin") {
    res.status(403).json({ error: "Unauthorized access: You are not assigned to this meeting." });
    return;
  }

  // Prevent multiple attendance marks for same meeting on same index
  const alreadyJoined = db.attendance.find(a => a.userId === userId && a.meetingId === meetingId);
  if (alreadyJoined) {
    res.json({ success: true, record: alreadyJoined, message: "Attendance already logged dynamically" });
    return;
  }

  // Calculate status: "on time", "late" or "missed" based on meeting time vs mock clock context.
  // Morning meetings standup is at 09:00 AM. If user joins, check current simulated minutes.
  // For standard execution, we extract current minute of joining if they clicked join.
  // Daily Hub Join button triggers immediate log.
  const now = new Date();
  
  const scheduledTimeStr = meeting.timeString || "09:00 AM";
  const scheduledMinutes = parseMeetingTimeToMinutes(scheduledTimeStr);
  const currentMinutes = getLagosMinutesPastMidnight(now);

  // No late check-ins after cutoff: 2 minutes before the meeting's scheduled end time
  const durationStr = meeting.duration || "30 minutes";
  const matchDuration = durationStr.match(/(\d+)/);
  const durationMinutes = matchDuration ? parseInt(matchDuration[1], 10) : 30;
  const endTimeMinutes = scheduledMinutes + durationMinutes;
  const cutoffMinutes = endTimeMinutes - 2;

  if (currentMinutes >= cutoffMinutes) {
    res.status(400).json({ error: "Check-in is locked/disabled. The meeting is effectively ending." });
    return;
  }

  let calculatedStatus: "Attended" | "Late" | "Missed" = "Attended";

  // If they register more than 5 minutes past scheduled time
  if (currentMinutes > scheduledMinutes + 5) {
    calculatedStatus = "Late";
  } else {
    calculatedStatus = "Attended";
  }

  const logRecord: AttendanceRecord = {
    id: `att-${Date.now()}`,
    userId: user.id,
    username: user.username,
    fullName: user.fullName,
    meetingId: meeting.id,
    meetingTitle: meeting.title,
    meetingType: meeting.type,
    timestamp: now.toISOString(),
    status: calculatedStatus,
    track: user.track,
    meetingDate: getLagosDateString(now)
  };

  db.attendance.push(logRecord);
  res.json({ success: true, record: logRecord });
});

app.post("/api/admin/attendance/update", (req: Request, res: Response) => {
  const { adminUserId, targetUserId, meetingId, meetingDate, newStatus } = req.body;

  const admin = db.profiles.find(p => p.id === adminUserId);
  if (!admin || admin.role !== "admin") {
    res.status(403).json({ error: "Access denied. Only administrators can perform this action." });
    return;
  }

  const targetUser = db.profiles.find(p => p.id === targetUserId);
  if (!targetUser) {
    res.status(404).json({ error: "Target student profile not found." });
    return;
  }

  // Find or create the attendance record
  let record = db.attendance.find(a => {
    const isUserMeeting = a.userId === targetUserId && a.meetingId === meetingId;
    if (!isUserMeeting) return false;
    
    // Match date if specified
    if (meetingDate && a.timestamp) {
      const recordDate = getLagosDateString(new Date(a.timestamp));
      return recordDate === meetingDate;
    }
    return true;
  });

  const previousStatus = record ? record.status : "None";

  if (record) {
    record.status = newStatus;
    if (newStatus === "Attended" || newStatus === "Late") {
      if (!record.timestamp || record.id.includes("missed")) {
        record.timestamp = new Date().toISOString();
      }
    }
  } else {
    const meeting = db.meetings.find(m => m.id === meetingId);
    const mockTimestamp = meetingDate 
      ? new Date(`${meetingDate}T${meeting?.timeString || "09:00 AM"}`).toISOString()
      : new Date().toISOString();

    record = {
      id: `att-manual-${Date.now()}-${targetUserId}-${meetingId}`,
      userId: targetUserId,
      username: targetUser.username,
      fullName: targetUser.fullName,
      meetingId: meetingId,
      meetingTitle: meeting?.title || "Manual Sync Meeting",
      meetingType: meeting?.type || "Manual",
      timestamp: mockTimestamp,
      status: newStatus,
      track: targetUser.track,
      meetingDate: meetingDate
    };
    db.attendance.push(record);
  }

  // Log the audit trail
  const auditLog: AttendanceAuditLog = {
    id: `audit-${Date.now()}`,
    timestamp: new Date().toISOString(),
    adminId: admin.id,
    adminUsername: admin.username,
    action: `Updated attendance status for ${targetUser.fullName} (Meeting ID: ${meetingId}, Date: ${meetingDate || "N/A"}) from "${previousStatus}" to "${newStatus}"`,
    meetingId: meetingId,
    meetingDate: meetingDate || "",
    targetUserId: targetUserId,
    previousStatus: previousStatus,
    newStatus: newStatus
  };

  if (!db.attendanceAuditLogs) {
    db.attendanceAuditLogs = [];
  }
  db.attendanceAuditLogs.push(auditLog);

  saveDb();

  res.json({ success: true, record, auditLog });
});

// --- Microservices Submission Routers ---

// Standups morning/eveningGoals
app.post("/api/student/submit-standup", (req: Request, res: Response) => {
  const { userId, type, content } = req.body; // type is "morning" or "evening"
  const user = db.profiles.find(p => p.id === userId);

  if (!user) {
    res.status(404).json({ error: "Student profile unidentified" });
    return;
  }

  const todayStr = new Date().toISOString().split("T")[0];
  let log = db.standups.find(s => s.userId === userId && s.date === todayStr);

  const formatHours = (d: Date) => {
    let hrs = d.getHours();
    const ampm = hrs >= 12 ? "PM" : "AM";
    hrs = hrs % 12;
    hrs = hrs ? hrs : 12; 
    const mins = d.getMinutes().toString().padStart(2, "0");
    return `${hrs.toString().padStart(2, "0")}:${mins} ${ampm}`;
  };

  const stampString = formatHours(new Date());

  if (!log) {
    log = {
      id: `stand-${Date.now()}`,
      userId: user.id,
      fullName: user.fullName,
      track: user.track,
      date: todayStr
    };
    db.standups.push(log);
  }

  if (type === "morning") {
    log.morningGoals = content;
    log.morningTime = stampString;
  } else {
    log.eveningAchievements = content;
    log.eveningTime = stampString;
  }

  res.json({ success: true, standup: log });
});

// Personal Development submissions (Must satisfy 100-word daily summary)
app.post("/api/student/submit-summary", (req: Request, res: Response) => {
  const { userId, summaryText } = req.body;
  const user = db.profiles.find(p => p.id === userId);

  if (!user) {
    res.status(404).json({ error: "Profile reference error" });
    return;
  }

  if (!summaryText || summaryText.trim() === "") {
    res.status(400).json({ error: "Please write a meaningful concept learn log!" });
    return;
  }

  // Count words
  const words = summaryText.trim().split(/\s+/).filter((w: string) => w.length > 0);
  if (words.length < 80) { // Set a robust minimum of around 80-100 words dynamically, let's keep strict check
    res.status(400).json({ 
      error: `Your summary contains only ${words.length} words. It needs to be at least 100 words long to satisfy the accountability rubric!`
    });
    return;
  }

  const todayStr = new Date().toISOString().split("T")[0];
  const newLog: PersonalDevelopmentLog = {
    id: `pd-${Date.now()}`,
    userId: user.id,
    fullName: user.fullName,
    track: user.track,
    date: todayStr,
    summary: summaryText,
    timestamp: new Date().toISOString()
  };

  db.personalDevelopment.push(newLog);
  res.json({ success: true, log: newLog });
});

// Daily Report submissions (Once a day workbook)
app.post("/api/student/submit-daily-report", (req: Request, res: Response) => {
  const { userId, accomplishments, hoursSpent, roadblocks, takeaways } = req.body;
  const user = db.profiles.find(p => p.id === userId);

  if (!user) {
    res.status(404).json({ error: "Profile reference error" });
    return;
  }

  if (!accomplishments || accomplishments.trim() === "") {
    res.status(400).json({ error: "Accomplishments field cannot be empty!" });
    return;
  }

  const todayStr = new Date().toISOString().split("T")[0];
  let log = db.dailyReports.find(r => r.userId === userId && r.date === todayStr);

  if (!log) {
    log = {
      id: `rep-${Date.now()}`,
      userId: user.id,
      fullName: user.fullName,
      track: user.track,
      date: todayStr,
      accomplishments: accomplishments.trim(),
      hoursSpent: Number(hoursSpent) || 0,
      roadblocks: (roadblocks || "").trim(),
      takeaways: (takeaways || "").trim(),
      timestamp: new Date().toISOString()
    };
    db.dailyReports.push(log);
  } else {
    log.accomplishments = accomplishments.trim();
    log.hoursSpent = Number(hoursSpent) || 0;
    log.roadblocks = (roadblocks || "").trim();
    log.takeaways = (takeaways || "").trim();
    log.timestamp = new Date().toISOString();
  }

  res.json({ success: true, dailyReport: log });
});

// Tech Updates submissions
app.post("/api/student/submit-update", (req: Request, res: Response) => {
  const { userId, title, url, summary } = req.body;
  const user = db.profiles.find(p => p.id === userId);

  if (!user) {
    res.status(404).json({ error: "Profile matching key error" });
    return;
  }

  if (!title || !url || !summary) {
    res.status(400).json({ error: "Title, article URL, and article insights summary are required inputs." });
    return;
  }

  const submission: TechUpdateSubmission = {
    id: `tech-${Date.now()}`,
    userId: user.id,
    fullName: user.fullName,
    track: user.track,
    title,
    url,
    summary,
    timestamp: new Date().toISOString()
  };

  db.techUpdates.push(submission);
  res.json({ success: true, submission });
});

// Weekly drills submission
app.post("/api/student/submit-drill", (req: Request, res: Response) => {
  const { userId, drillId, solutionUrl } = req.body;
  const user = db.profiles.find(p => p.id === userId);
  const drill = db.weeklyDrills.find(d => d.id === drillId);

  if (!user || !drill) {
    res.status(404).json({ error: "Required Drill challenge or Student records missing" });
    return;
  }

  if (!solutionUrl || !solutionUrl.startsWith("http")) {
    res.status(400).json({ error: "Please enter a valid HTTP/HTTPS repository or deployment solution URL" });
    return;
  }

  const submission: WeeklyDrillSubmission = {
    id: `sub-${Date.now()}`,
    drillId: drill.id,
    drillTitle: drill.title,
    userId: user.id,
    fullName: user.fullName,
    track: user.track,
    solutionUrl,
    status: "Pending",
    timestamp: new Date().toISOString()
  };

  db.drillSubmissions.push(submission);
  res.json({ success: true, submission });
});

// Join KD count tracker (1/16 baseline indicator)
app.post("/api/student/join-kd", (req: Request, res: Response) => {
  const { userId } = req.body;
  const user = db.profiles.find(p => p.id === userId);

  if (!user) {
    res.status(404).json({ error: "Authentication profile missing" });
    return;
  }

  const currentCount = db.kdCounts[userId] || 0;
  db.kdCounts[userId] = Math.min(16, currentCount + 1);

  // Sync to general attendance database too so admins see the action log
  const now = new Date();
  const kdMeeting = db.meetings.find(m => m.type === "microservice") || db.meetings[1];
  
  const logRecord: AttendanceRecord = {
    id: `att-kd-${Date.now()}`,
    userId: user.id,
    username: user.username,
    fullName: user.fullName,
    meetingId: kdMeeting ? kdMeeting.id : "kd_manual",
    meetingTitle: kdMeeting ? kdMeeting.title : "Knowledge Development (KD) Session",
    meetingType: "microservice",
    timestamp: now.toISOString(),
    status: "Attended",
    track: user.track
  };

  db.attendance.push(logRecord);

  res.json({ success: true, count: db.kdCounts[userId], record: logRecord });
});

// Social events/public logs tracking
app.post("/api/social/submit", (req: Request, res: Response) => {
  const { userId, title, link, type } = req.body; // type is "blog" | "hackathon" | "public-artifact"
  const user = db.profiles.find(p => p.id === userId);

  if (!user) {
    res.status(404).json({ error: "Profile reference missing" });
    return;
  }

  if (!title || !link || !type) {
    res.status(400).json({ error: "Fulfill all fields (Title, Public Link, and Category)" });
    return;
  }

  const log: SocialEventLog = {
    id: `soc-${Date.now()}`,
    userId: user.id,
    fullName: user.fullName,
    track: user.track,
    title,
    link,
    type,
    timestamp: new Date().toISOString()
  };

  db.socialLogs.push(log);
  res.json({ success: true, log });
});

// --- Admin Global Ecosystem Admin Reviews ---

// Audit / review student onboarding status placement (Approved, Reset, etc.)
app.post("/api/admin/review-student", (req: Request, res: Response) => {
  const { studentId, action, reason } = req.body; // action can be "Approve-Orientation", "Set-Onboarding", "Reset-Track"
  const user = db.profiles.find(p => p.id === studentId);

  if (!user) {
    res.status(404).json({ error: "Target Student profile detail registry not found" });
    return;
  }

  if (action === "Approve-Orientation") {
    user.status = "oriented";
    db.reminders.push({
      id: `rem-${Date.now()}`,
      userId: user.id,
      message: `Congratulations! Your Track assessment has been reviewed guidelines and approved by tech mentors. Please watch the Orientation multimedia to start.`,
      timestamp: new Date().toISOString(),
      read: false
    });
  } else if (action === "Set-Onboarding") {
    user.status = "onboarding";
  } else if (action === "Promote-Dashboard") {
    user.status = "dashboard";
    db.reminders.push({
      id: `rem-${Date.now()}`,
      userId: user.id,
      message: `Your Orientation compliance has been approved. Welcome to the workspace!`,
      timestamp: new Date().toISOString(),
      read: false
    });
  } else if (action === "Pivot-Track") {
    user.status = "onboarding";
    user.score = undefined;
  }

  res.json({ success: true, profile: user });
});

// Add / Edit Meeting endpoint
app.post("/api/admin/meetings/save", (req: Request, res: Response) => {
  const { 
    id, 
    title, 
    type, 
    timeString, 
    jitsiUrl, 
    trackId, 
    scheduleDays,
    meetingDates,
    targetTeamTrackEligibility,
    userLevels,
    assignedUserIds,
    duration,
    organizer,
    status,
    description
  } = req.body;

  if (!title || !timeString || !jitsiUrl) {
    res.status(400).json({ error: "Missing required meeting attributes: title, timeString, and platform url are all required." });
    return;
  }

  if (!type || typeof type !== "string" || type.trim() === "") {
    res.status(400).json({ error: "Meeting Type is required." });
    return;
  }

  const cleanType = type.trim();
  const lowerTypes = (db.meetingTypes || []).map(t => t.toLowerCase().trim());
  if (!lowerTypes.includes(cleanType.toLowerCase())) {
    res.status(400).json({ error: `Invalid meeting type "${cleanType}". Must be one of: ${(db.meetingTypes || []).join(", ")}` });
    return;
  }

  const matchedType = db.meetingTypes.find(t => t.toLowerCase().trim() === cleanType.toLowerCase()) || cleanType;

  // Handle optional arrays or null values
  const finalTargetTeamTracks = Array.isArray(targetTeamTrackEligibility) ? targetTeamTrackEligibility : (targetTeamTrackEligibility === null ? null : []);
  const finalUserLevels = Array.isArray(userLevels) ? userLevels : (userLevels === null ? null : (Array.isArray(trackId) ? trackId : (trackId ? [trackId] : [])));

  if (id) {
    // Edit existing
    const meeting = db.meetings.find(m => m.id === id);
    if (!meeting) {
      res.status(404).json({ error: "Meeting not found" });
      return;
    }
    meeting.title = title;
    meeting.timeString = timeString;
    meeting.jitsiUrl = jitsiUrl;
    meeting.type = matchedType;

    // Maintain backwards compatibility by populating trackId as well
    meeting.trackId = finalUserLevels && finalUserLevels.length > 0 ? finalUserLevels : "All";
    meeting.userLevels = finalUserLevels;
    meeting.targetTeamTrackEligibility = finalTargetTeamTracks;
    
    // Custom Fields Integration
    meeting.assignedUserIds = Array.isArray(assignedUserIds) ? assignedUserIds : [];
    meeting.duration = duration || "60 minutes";
    meeting.organizer = organizer || "Admin Team";
    meeting.status = status || "Upcoming";
    meeting.description = description || "";

    if (scheduleDays) meeting.scheduleDays = scheduleDays;
    if (meetingDates) meeting.meetingDates = meetingDates;

    // Calculate active status for the saved meeting
    const todayStr = getLagosDateString(new Date());
    const todayDayName = getLagosDayOfWeek(new Date());
    const finalMeetingDates = meeting.meetingDates || [];
    const finalScheduleDays = meeting.scheduleDays || [];
    meeting.isActive = finalMeetingDates.includes(todayStr) || finalScheduleDays.includes(todayDayName);

    saveDb();

    // Recalculate assignments
    syncAllAssignments();

    // Send notifications to all assigned users of the update
    const finalNotificationUsers = db.meetingAssignments
      .filter((ma) => ma.meetingId === meeting.id)
      .map((ma) => ma.userId);

    finalNotificationUsers.forEach((uId) => {
      if (!db.reminders) {
        db.reminders = [];
      }
      db.reminders.push({
        id: `rem-meet-upd-${Date.now()}-${uId}`,
        userId: uId,
        message: `📢 Meeting Details Updated: "${meeting.title}" is now scheduled for ${meeting.timeString}.`,
        timestamp: new Date().toISOString(),
        read: false
      });
    });
    saveDb();

    res.json({ success: true, meeting });
  } else {
    const todayStr = getLagosDateString(new Date());
    const todayDayName = getLagosDayOfWeek(new Date());
    const finalMeetingDates = meetingDates || [todayStr];
    const finalScheduleDays = scheduleDays || ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

    // Add new
    const newMeeting = {
      id: `meet-${Date.now()}`,
      title,
      type: matchedType,
      timeString,
      jitsiUrl,
      trackId: finalUserLevels && finalUserLevels.length > 0 ? finalUserLevels : "All",
      userLevels: finalUserLevels,
      targetTeamTrackEligibility: finalTargetTeamTracks,
      scheduleDays: finalScheduleDays,
      meetingDates: finalMeetingDates,
      isActive: finalMeetingDates.includes(todayStr) || finalScheduleDays.includes(todayDayName),
      createdAt: new Date().toISOString(),
      assignedUserIds: Array.isArray(assignedUserIds) ? assignedUserIds : [],
      duration: duration || "60 minutes",
      organizer: organizer || "Admin Team",
      status: status || "Upcoming",
      description: description || ""
    };
    db.meetings.push(newMeeting);
    saveDb();

    // Recalculate assignments
    syncAllAssignments();

    // Send notifications to all assigned users of the new meeting
    const finalNotificationUsers = db.meetingAssignments
      .filter((ma) => ma.meetingId === newMeeting.id)
      .map((ma) => ma.userId);

    finalNotificationUsers.forEach((uId) => {
      if (!db.reminders) {
        db.reminders = [];
      }
      db.reminders.push({
        id: `rem-meet-new-${Date.now()}-${uId}`,
        userId: uId,
        message: `📅 New Meeting Assigned: "${newMeeting.title}" has been booked for ${newMeeting.timeString}. Check your meetings dashboard!`,
        timestamp: new Date().toISOString(),
        read: false
      });
    });
    saveDb();

    res.json({ success: true, meeting: newMeeting });
  }
});

// Delete Meeting endpoint
app.post("/api/admin/meetings/delete", (req: Request, res: Response) => {
  const { id } = req.body;
  const index = db.meetings.findIndex(m => m.id === id);
  if (index !== -1) {
    // Clear out assignments first
    if (db.meetingAssignments) {
      db.meetingAssignments = db.meetingAssignments.filter(ma => ma.meetingId !== id);
    }
    db.meetings.splice(index, 1);
    saveDb();

    // Fully sync and align
    syncAllAssignments();

    res.json({ success: true });
  } else {
    res.status(404).json({ error: "Meeting not found" });
  }
});

// Save, Edit or Create custom Meeting Type
app.post("/api/admin/meeting-types/save", (req: Request, res: Response) => {
  const { oldName, name } = req.body;
  if (!name) {
    res.status(400).json({ error: "Meeting type name is required." });
    return;
  }

  const cleanName = name.trim();
  if (!cleanName) {
    res.status(400).json({ error: "Meeting type name cannot be blank." });
    return;
  }

  if (!db.meetingTypes) {
    db.meetingTypes = [
      "Knowledge Track",
      "Microservices",
      "Project"
    ];
  }

  // Case-insensitive duplicate check
  const normalizedNew = cleanName.toLowerCase();
  const exists = db.meetingTypes.some(t => {
    if (oldName && t.toLowerCase() === oldName.trim().toLowerCase()) {
      return false;
    }
    return t.toLowerCase() === normalizedNew;
  });

  if (exists) {
    res.status(400).json({ error: "A meeting type with this name already exists (case-insensitive)." });
    return;
  }

  if (oldName) {
    const trimOld = oldName.trim();
    const idx = db.meetingTypes.findIndex(t => t.toLowerCase() === trimOld.toLowerCase());
    if (idx !== -1) {
      db.meetingTypes[idx] = cleanName;
      // Migrate existing meetings
      db.meetings.forEach(m => {
        if (m.type === trimOld) {
          m.type = cleanName;
        }
      });
      saveDb();
      res.json({ success: true, meetingTypes: db.meetingTypes });
    } else {
      res.status(404).json({ error: "Original meeting type not found." });
    }
  } else {
    db.meetingTypes.push(cleanName);
    saveDb();
    res.json({ success: true, meetingTypes: db.meetingTypes });
  }
});

// Delete custom Meeting Type
app.post("/api/admin/meeting-types/delete", (req: Request, res: Response) => {
  const { name, allowDeleteSystem } = req.body;
  if (!name) {
    res.status(400).json({ error: "Meeting type name is required for deletion." });
    return;
  }

  const cleanName = name.trim();

  // Check if currently assigned to any meetings
  const isAssigned =
    db.meetings &&
    db.meetings.some(
      (m: any) =>
        m.type && m.type.trim().toLowerCase() === cleanName.toLowerCase()
    );
  if (isAssigned) {
    res.status(400).json({
      error:
        "This Meeting Type is currently assigned to one or more scheduled meetings and cannot be deleted until those meetings are updated or removed.",
    });
    return;
  }

  const systemDefaults = [
    "knowledge track",
    "microservices",
    "project"
  ];

  if (systemDefaults.includes(cleanName.toLowerCase()) && !allowDeleteSystem) {
    res.status(400).json({ error: "Default system meeting types cannot be deleted unless super administrator override is enabled." });
    return;
  }

  if (!db.meetingTypes) {
    db.meetingTypes = [
      "Knowledge Track",
      "Microservices",
      "Project"
    ];
  }

  const idx = db.meetingTypes.findIndex(t => t.toLowerCase() === cleanName.toLowerCase());
  if (idx !== -1) {
    db.meetingTypes.splice(idx, 1);
    saveDb();
    res.json({ success: true, meetingTypes: db.meetingTypes });
  } else {
    res.status(404).json({ error: "Meeting type not found." });
  }
});

// Assign custom task to user
app.post("/api/admin/assign-task", (req: Request, res: Response) => {
  const { userId, title, description, dueDate, priority } = req.body;
  if (!userId || !title) {
    res.status(400).json({ error: "Missing required attributes: User Identity and Task Title are required." });
    return;
  }

  const user = db.profiles.find(p => p.id === userId);
  if (!user) {
    res.status(404).json({ error: "Student profile not found" });
    return;
  }

  if (!user.assignedTasks) {
    user.assignedTasks = [];
  }

  const task: CustomTask = {
    id: `tsk-${Date.now()}`,
    title,
    description: description || "",
    dueDate: dueDate || "Every Sunday 11:59 PM WAT",
    priority: (priority as "High" | "Medium" | "Low") || "Medium",
    status: "Pending",
    assignedAt: new Date().toISOString()
  };

  user.assignedTasks.push(task);

  // Broadcast alert to user's reminders list
  db.reminders.push({
    id: `rem-${Date.now()}`,
    userId: user.id,
    message: `🎯 Custom Task Assigned: "${title}". Description: ${description}`,
    timestamp: new Date().toISOString(),
    read: false
  });

  res.json({ success: true, profile: user });
});

// Change user level
app.post("/api/admin/change-level", (req: Request, res: Response) => {
  const { userId, level } = req.body;
  if (!userId || !level) {
    res.status(400).json({ error: "Missing required attributes: User Identity and Level target are required." });
    return;
  }

  const user = db.profiles.find(p => p.id === userId);
  if (!user) {
    res.status(404).json({ error: "Student profile not found" });
    return;
  }

  user.learningLevel = level;
  user.techExperience = level; // synchronize with onboarding techExperience as well

  // Broadcast alert to user's reminders list
  db.reminders.push({
    id: `rem-${Date.now()}`,
    userId: user.id,
    message: `📈 Workspace Promotion: Your learning/onboarding level has been updated to "${level}" by matching admins.`,
    timestamp: new Date().toISOString(),
    read: false
  });

  // Hot sync user meeting eligibility after level updates
  syncAllAssignments();

  res.json({ success: true, profile: user });
});

// Assign Microservice Owner
app.post("/api/admin/assign-owner", (req: Request, res: Response) => {
  const { microserviceId, ownerId } = req.body;
  if (!microserviceId) {
    res.status(400).json({ error: "Microservice ID is required" });
    return;
  }
  
  if (!db.microserviceOwners) {
    db.microserviceOwners = {};
  }
  
  db.microserviceOwners[microserviceId] = ownerId || "";
  res.json({ success: true, microserviceOwners: db.microserviceOwners });
});

// Assign KD count
app.post("/api/admin/assign-kd", (req: Request, res: Response) => {
  const { userId, count } = req.body;
  if (!userId) {
    res.status(400).json({ error: "User ID is required" });
    return;
  }
  
  const targetUser = db.profiles.find(p => p.id === userId);
  if (!targetUser) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const parsedCount = parseInt(count, 10);
  if (isNaN(parsedCount) || parsedCount < 0) {
    res.status(400).json({ error: "Invalid count value" });
    return;
  }

  if (!db.kdCounts) {
    db.kdCounts = {};
  }

  db.kdCounts[userId] = parsedCount;
  res.json({ success: true, kdCounts: db.kdCounts });
});

// Complete assigned custom task
app.post("/api/student/complete-task", (req: Request, res: Response) => {
  const { userId, taskId } = req.body;
  if (!userId || !taskId) {
    res.status(400).json({ error: "Missing required attributes: User and Task Identity are required." });
    return;
  }

  const user = db.profiles.find(p => p.id === userId);
  if (!user) {
    res.status(404).json({ error: "Student not found" });
    return;
  }

  if (!user.assignedTasks) {
    user.assignedTasks = [];
  }

  const task = user.assignedTasks.find(t => t.id === taskId);
  if (!task) {
    res.status(404).json({ error: "Task not found on student profile" });
    return;
  }

  task.status = "Completed";
  res.json({ success: true, profile: user });
});

// Post a new Weekly Drill challenge from owner view
app.post("/api/admin/add-drill", (req: Request, res: Response) => {
  const { title, description, link } = req.body;
  if (!title || !description || !link) {
    res.status(400).json({ error: "Provide Title, full description details, and external challenge link reference" });
    return;
  }

  const newDrill: WeeklyDrill = {
    id: `drill-${Date.now()}`,
    title,
    description,
    link,
    postedAt: new Date().toISOString()
  };

  db.weeklyDrills.push(newDrill);
  
  // Broadcast reminder alerts for all standard students
  db.profiles.forEach(p => {
    if (p.role === "user") {
      db.reminders.push({
        id: `rem-${Date.now()}-${p.id}`,
        userId: p.id,
        message: `🔔 New Weekly Drill Posted: "${title}". Click to inspect specifications and submit solutions.`,
        timestamp: new Date().toISOString(),
        read: false
      });
    }
  });

  res.status(201).json({ success: true, drill: newDrill });
});

// Owner review and grade weekly drill submission
app.post("/api/admin/grade-drill", (req: Request, res: Response) => {
  const { submissionId, status, feedback } = req.body; // status is "Approved" or "Rejected"
  const sub = db.drillSubmissions.find(s => s.id === submissionId);

  if (!sub) {
    res.status(404).json({ error: "Drill submission registry index not found" });
    return;
  }

  sub.status = status;
  sub.feedback = feedback || "";

  // Push user alert log
  db.reminders.push({
    id: `rem-${Date.now()}`,
    userId: sub.userId,
    message: `Your submission for "${sub.drillTitle}" has been graded: ${status}. Feedback: "${feedback || 'None'}"`,
    timestamp: new Date().toISOString(),
    read: false
  });

  res.json({ success: true, submission: sub });
});

// One-click send quick customized reminder warning alert
app.post("/api/admin/send-reminder", (req: Request, res: Response) => {
  const { userId, message } = req.body;
  if (!userId || !message) {
    res.status(400).json({ error: "Target Student reference and message text required" });
    return;
  }

  db.reminders.push({
    id: `rem-${Date.now()}`,
    userId,
    message: `Mentorship Alert: ${message}`,
    timestamp: new Date().toISOString(),
    read: false
  });

  res.json({ success: true, message: "Alert dispatched successfully to student feed" });
});

// App endpoint to dismiss/delete a reminder or notifications
app.post("/api/reminders/dismiss", (req: Request, res: Response) => {
  const { id, userId } = req.body;
  if (id) {
    db.reminders = db.reminders.filter(r => r.id !== id);
  } else if (userId) {
    db.reminders = db.reminders.filter(r => r.userId !== userId);
  } else {
    res.status(400).json({ error: "Reminder ID or User ID required" });
    return;
  }
  res.json({ success: true, message: "Reminders updated successfully" });
});

// Complete automated nightly Cron generator triggered manually or schedule
// Executes daily WAT at 00:00WAT to populate and activate user daily meetings
app.post("/api/cron/trigger", (req: Request, res: Response) => {
  const todayStr = getLagosDateString(new Date());
  const todayDayName = getLagosDayOfWeek(new Date());

  if (!db.meetings || !Array.isArray(db.meetings)) {
    db.meetings = [];
  }

  let activatedCount = 0;
  let totalScanned = db.meetings.length;

  db.meetings.forEach((m: any) => {
    const hasTodayDate = m.meetingDates && m.meetingDates.includes(todayStr);
    const hasTodayDay = m.scheduleDays && m.scheduleDays.includes(todayDayName);
    const shouldBeActive = hasTodayDate || hasTodayDay;

    m.isActive = shouldBeActive;
    if (shouldBeActive) {
      activatedCount++;
    }
  });

  // Sync user meeting assignments for the newly active meetings
  syncAllAssignments();
  saveDb();

  // Find all active meetings to return in response
  const activeMeetings = db.meetings.filter(m => m.isActive);

  res.json({ 
    success: true, 
    meetings: activeMeetings,
    message: `Cron job executed successfully for ${todayStr}. Scanned ${totalScanned} meetings and activated ${activatedCount} for today's schedule.`
  });
});

const evaluateMissedMeetings = () => {
  try {
    if (!db.meetings || !Array.isArray(db.meetings)) return;
    if (!db.profiles || !Array.isArray(db.profiles)) return;
    if (!db.attendance || !Array.isArray(db.attendance)) return;

    const now = new Date();
    const todayStr = getLagosDateString(now);
    const todayDayName = getLagosDayOfWeek(now);
    const currentMinutes = getLagosMinutesPastMidnight(now);

    const parseDurationInMinutesLocal = (durationStr: string): number => {
      if (!durationStr) return 30;
      const match = durationStr.match(/(\d+)/);
      return match ? parseInt(match[1], 10) : 30;
    };

    let modified = false;

    // Filter meetings scheduled for today that are NOT archived or cancelled
    const todayMeetings = db.meetings.filter((m: any) => {
      if (m.status && (m.status.trim().toLowerCase() === "archived" || m.status.trim().toLowerCase() === "cancelled")) {
        return false;
      }
      
      if (m.meetingDates && Array.isArray(m.meetingDates) && m.meetingDates.length > 0) {
        return m.meetingDates.includes(todayStr);
      }
      const days = m.scheduleDays && m.scheduleDays.length > 0
        ? m.scheduleDays
        : ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
        
      return days.some((day: string) => day.trim().toLowerCase() === todayDayName.toLowerCase());
    });

    db.profiles.forEach((user: any) => {
      // Do not log missed attendance for administrators
      if (user.role === "admin") return;

      todayMeetings.forEach((m: any) => {
        // Check if there's already an attendance record for this user and meeting
        const existingRecord = db.attendance.find((a: any) => a.userId === user.id && a.meetingId === m.id);
        if (existingRecord) {
          return; // Don't override existing valid records
        }

        // Determine if this user is eligible / assigned to this meeting
        const isAssigned = (db.meetingAssignments || []).some(
          (ma: any) => ma.meetingId === m.id && ma.userId === user.id
        );

        const userLevelValue = user.learningLevel || user.techExperience || "Apprentice level 1";
        const userTrackValue = user.track || "";

        const targetTracks = m.targetTeamTrackEligibility;
        const isGlobalTrack = !targetTracks || (Array.isArray(targetTracks) && targetTracks.length === 0);
        const rawLevels = m.userLevels !== undefined ? m.userLevels : m.trackId;
        const isGlobalLevel = !rawLevels || (Array.isArray(rawLevels) && rawLevels.length === 0) || rawLevels === "All" || rawLevels === "";
        const isGlobal = isGlobalTrack && isGlobalLevel;

        const isUserLevelEligible = (uLevel: string, mLevels: any): boolean => {
          const checkLevel = uLevel || "Apprentice level 1";
          const rawL = mLevels !== undefined ? mLevels : "All";
          if (!rawL || (Array.isArray(rawL) && rawL.length === 0) || rawL === "All" || rawL === "") {
            return true;
          }
          if (Array.isArray(rawL)) {
            const filtered = rawL.filter(l => l && l !== "All User Eligible" && l !== "All User Level" && l !== "All Tracks Eligibility");
            if (filtered.length === 0) {
              return true;
            }
            return filtered.some((l: string) => {
              const mLevel = l.trim().toLowerCase();
              const uL = checkLevel.trim().toLowerCase();
              return mLevel === uL || mLevel.includes(uL) || uL.includes(mLevel);
            });
          }
          if (rawL === "All User Eligible" || rawL === "All User Level" || rawL === "All Tracks Eligibility") {
            return true;
          }
          const mLevel = String(rawL).trim().toLowerCase();
          const uL = checkLevel.trim().toLowerCase();
          return mLevel === uL || mLevel.includes(uL) || uL.includes(mLevel);
        };

        const isTeamTrackEligible = (uTrack: string, mTracks: any): boolean => {
          const checkTrack = uTrack || "";
          if (checkTrack.trim().toLowerCase() === "all") {
            return true;
          }
          if (!mTracks || (Array.isArray(mTracks) && mTracks.length === 0)) {
            return true;
          }
          if (Array.isArray(mTracks)) {
            return mTracks.some((t: string) => {
              const mTrack = t.trim().toLowerCase();
              const uT = checkTrack.trim().toLowerCase();
              return mTrack === uT || uT === "all";
            });
          }
          const mTrack = String(mTracks).trim().toLowerCase();
          const uT = checkTrack.trim().toLowerCase();
          return mTrack === uT || uT === "all";
        };

        const levelMatch = isUserLevelEligible(userLevelValue, rawLevels);
        const trackMatch = isTeamTrackEligible(userTrackValue, targetTracks);

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

        const isEligible = isAssigned || isLiveEligible;
        if (!isEligible) return;

        // Calculate cutoff: scheduled_end_time - 2 minutes
        const startTimeMinutes = parseMeetingTimeToMinutes(m.timeString || "09:00 AM");
        const durationMinutes = parseDurationInMinutesLocal(m.duration || "30 minutes");
        const endTimeMinutes = startTimeMinutes + durationMinutes;
        const cutoffMinutes = endTimeMinutes - 2;

        if (currentMinutes >= cutoffMinutes) {
          // Check-in window passed. Create "Missed" attendance log.
          const logRecord: AttendanceRecord = {
            id: `att-missed-${Date.now()}-${user.id}-${m.id}`,
            userId: user.id,
            username: user.username,
            fullName: user.fullName,
            meetingId: m.id,
            meetingTitle: m.title,
            meetingType: m.type,
            timestamp: now.toISOString(),
            status: "Missed",
            track: user.track
          };
          db.attendance.push(logRecord);
          modified = true;
          console.log(`[Attendance Sync] Automatically marked ${user.username} as Missed for meeting ${m.title}`);
        }
      });
    });

    // Automatically log today's meetings that have ended into db.meetingHistory
    todayMeetings.forEach((m: any) => {
      const startTimeMinutes = parseMeetingTimeToMinutes(m.timeString || "09:00 AM");
      const durationMinutes = parseDurationInMinutesLocal(m.duration || "30 minutes");
      const endTimeMinutes = startTimeMinutes + durationMinutes;
      const cutoffMinutes = endTimeMinutes + 1; // 1 minute after scheduled duration has ended

      if (currentMinutes >= cutoffMinutes) {
        const histId = `m-hist-${m.id}-${todayStr}`;
        if (!db.meetingHistory) {
          db.meetingHistory = [];
        }
        const alreadyInHistory = db.meetingHistory.some((h: any) => h.id === histId);
        if (!alreadyInHistory) {
          const formattedEndTime = formatMinutesToTimeString(endTimeMinutes);
          const userLevels = Array.isArray(m.userLevels) ? m.userLevels : (m.userLevels ? [m.userLevels] : ["All"]);
          const targetTeamTrackEligibility = Array.isArray(m.targetTeamTrackEligibility) ? m.targetTeamTrackEligibility : (m.targetTeamTrackEligibility ? [m.targetTeamTrackEligibility] : ["All"]);

          db.meetingHistory.push({
            id: histId,
            meetingId: m.id,
            title: m.title,
            type: m.type,
            date: todayStr,
            scheduledStartTime: m.timeString || "09:00 AM",
            scheduledEndTime: formattedEndTime,
            duration: m.duration || "30 minutes",
            organizer: m.organizer || "System Admin",
            userLevels: userLevels,
            targetTeamTrackEligibility: targetTeamTrackEligibility
          });
          modified = true;
          console.log(`[Meeting History] Logged ended meeting ${m.title} to history for ${todayStr}`);
        }
      }
    });

    if (modified) {
      saveDb();
    }
  } catch (error) {
    console.error("Error in automated missed attendance evaluation:", error);
  }
};

// Start background interval for evaluating missed meetings
setInterval(evaluateMissedMeetings, 10000);

// Configure Vite middleware in development or static index.html router paths in production
const startServer = async () => {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Bincom Dev Platform API Container] running on port ${PORT}`);
  });
};

startServer();
