import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  where,
  writeBatch
} from "firebase/firestore";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  onAuthStateChanged
} from "firebase/auth";
import { db, auth } from "./firebase";
import { Profile, Meeting, AttendanceRecord, WeeklyDrill, WeeklyDrillSubmission, MeetingAssignment, MeetingHistoryRecord } from "./types";

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errMsg = error instanceof Error ? error.message : String(error);
  const isPermissionError = errMsg.toLowerCase().includes("permission") || errMsg.toLowerCase().includes("insufficient");

  const errInfo: FirestoreErrorInfo = {
    error: errMsg,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };

  console.error('Firestore Error: ', JSON.stringify(errInfo));

  if (isPermissionError) {
    throw new Error(JSON.stringify(errInfo));
  } else {
    console.warn('Gracefully handled non-permission Firestore transport/offline error:', errMsg);
  }
}

// --- Timezone and Time Filtering Helpers (copied from server.ts) ---
export const getLagosDateString = (date: Date): string => {
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

export const getLagosDayOfWeek = (date: Date): string => {
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

export const parseMeetingTimeToMinutes = (timeStr: string): number => {
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

export const getLagosMinutesPastMidnight = (date: Date): number => {
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

export const formatMinutesToTimeString = (minsPastMidnight: number): string => {
  let hours = Math.floor(minsPastMidnight / 60) % 24;
  const minutes = minsPastMidnight % 60;
  const ampm = hours >= 12 ? "PM" : "AM";
  let displayHours = hours % 12;
  if (displayHours === 0) displayHours = 12;
  const displayMinutes = String(minutes).padStart(2, "0");
  return `${String(displayHours).padStart(2, "0")}:${displayMinutes} ${ampm}`;
};

// --- Authentication Service ---
export const listenToAuthChanges = (onUserLoaded: (profile: Profile | null) => void) => {
  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      try {
        // Fetch Firestore user profile
        let userDoc = await getDoc(doc(db, "profiles", user.uid));
        let profileData: Profile | null = null;

        if (userDoc.exists()) {
          profileData = userDoc.data() as Profile;
        } else {
          // Check if there is an existing seeded/mock profile with this email under a different ID
          const email = user.email || "";
          if (email) {
            const q = query(collection(db, "profiles"), where("email", "==", email.trim().toLowerCase()));
            const snapshot = await getDocs(q);
            if (!snapshot.empty) {
              const oldDoc = snapshot.docs[0];
              const oldData = oldDoc.data() as Profile;
              profileData = {
                ...oldData,
                id: user.uid
              };
              await setDoc(doc(db, "profiles", user.uid), profileData);
              if (oldDoc.id !== user.uid) {
                try {
                  await deleteDoc(doc(db, "profiles", oldDoc.id));
                } catch (e) {
                  console.warn("Could not delete old profile doc during migration:", e);
                }
              }
            }
          }
        }

        if (profileData) {
          const lowercaseEmail = (profileData.email || "").trim().toLowerCase();
          if (["stuncharles@gmail.com", "hadekunleabdulwally@gmail.com", "oluwatosinayinde.bincom@gmail.com"].includes(lowercaseEmail)) {
            if (profileData.role !== "admin" || profileData.status !== "admin") {
              profileData.role = "admin";
              profileData.status = "admin";
              await setDoc(doc(db, "profiles", user.uid), profileData);
            }
          }
          onUserLoaded(profileData);
        } else {
          // Fallback or create minimal profile
          const isEmailAdmin = ["stuncharles@gmail.com", "hadekunleabdulwally@gmail.com", "oluwatosinayinde.bincom@gmail.com"].includes((user.email || "").trim().toLowerCase());
          const newProfile: Profile = {
            id: user.uid,
            email: user.email || "",
            username: (user.email || "").split("@")[0].toLowerCase(),
            fullName: user.displayName || (user.email || "").split("@")[0],
            education: "",
            occupation: "",
            techExperience: "Beginner",
            track: "All",
            role: isEmailAdmin ? "admin" : "user",
            status: isEmailAdmin ? "admin" : "onboarding",
            joinedAt: new Date().toISOString()
          };
          await setDoc(doc(db, "profiles", user.uid), newProfile);
          onUserLoaded(newProfile);
        }
      } catch (err: any) {
        console.warn("Firestore error in listenToAuthChanges, loading offline fallback profile:", err);
        const isEmailAdmin = ["stuncharles@gmail.com", "hadekunleabdulwally@gmail.com", "oluwatosinayinde.bincom@gmail.com"].includes((user.email || "").trim().toLowerCase());
        const fallbackProfile: Profile = {
          id: user.uid,
          email: user.email || "",
          username: (user.email || "").split("@")[0].toLowerCase(),
          fullName: user.displayName || (user.email || "").split("@")[0],
          education: "",
          occupation: "",
          techExperience: "Beginner",
          track: "All",
          role: isEmailAdmin ? "admin" : "user",
          status: isEmailAdmin ? "admin" : "dashboard",
          joinedAt: new Date().toISOString()
        };
        onUserLoaded(fallbackProfile);
      }
    } else {
      onUserLoaded(null);
    }
  });
};

// --- Realtime Database Sync Engine ---
export const isUserEligibleForMeetingInBackend = (user: any, meeting: any, assignments: any[]): boolean => {
  if (user.role === "admin") return false;

  // 1. Explicitly assigned
  const isAssigned = assignments.some(
    (ma: any) => ma.meetingId === meeting.id && ma.userId === user.id
  );
  if (isAssigned) return true;

  // 2. User Level & Track Eligibility
  const userLevelValue = user.learningLevel || user.techExperience || "Apprentice level 1";
  const userTrackValue = user.track || "";

  const targetTracks = meeting.targetTeamTrackEligibility || [];
  const isGlobalTrack = !targetTracks || targetTracks.length === 0 || targetTracks.includes("All") || targetTracks.includes("All Tracks Eligibility");
  const rawLevels = meeting.userLevels || meeting.trackId || [];
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
    const levelsArr = Array.isArray(rawLevels) ? rawLevels : [rawLevels];
    return levelsArr.some((l: string) => {
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

export const formatMinutesToMeetingTime = (totalMinutes: number): string => {
  let hours = Math.floor(totalMinutes / 60) % 24;
  const minutes = totalMinutes % 60;
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  if (hours === 0) hours = 12;
  const mmStr = String(minutes).padStart(2, "0");
  return `${hours}:${mmStr} ${ampm}`;
};

export const autoArchiveCompletedMeetings = async (
  meetings: any[],
  profiles: any[] = [],
  attendance: any[] = [],
  assignments: any[] = [],
  meetingHistory: any[] = []
): Promise<void> => {
  if (!meetings || meetings.length === 0) return;
  if (!profiles || profiles.length === 0) return; // Wait until profiles have resolved to prevent marking everyone missed prematurely

  const now = new Date();
  const todayStr = getLagosDateString(now);
  const currentMinutes = getLagosMinutesPastMidnight(now);

  // We check which meetings are considered "overdue" (passed scheduled time)
  const overdueMeetings = meetings.filter((m) => {
    const statusLower = String(m.status || "").trim().toLowerCase();
    if (statusLower === "completed" || statusLower === "archived") return false;

    const dates: string[] = [];
    if (m.occurrenceDate) {
      dates.push(m.occurrenceDate);
    }
    if (m.meetingDates && Array.isArray(m.meetingDates)) {
      m.meetingDates.forEach((d: string) => {
        if (d && !dates.includes(d)) dates.push(d);
      });
    }

    if (dates.length > 0) {
      const latestDate = dates.reduce((latest, current) => current > latest ? current : latest, dates[0]);
      if (latestDate < todayStr) {
        return true;
      }
      if (latestDate === todayStr) {
        const scheduledTimeStr = m.timeString || m.time || "09:00 AM";
        const scheduledMinutes = parseMeetingTimeToMinutes(scheduledTimeStr);
        const durationStr = m.duration || "30 minutes";
        const matchDuration = durationStr.match(/(\d+)/);
        const durationMinutes = matchDuration ? parseInt(matchDuration[1], 10) : 30;
        const endTimeMinutes = scheduledMinutes + durationMinutes;
        if (currentMinutes >= endTimeMinutes) {
          return true;
        }
      }
    }
    return false;
  });

  const completedOrArchived = meetings.filter(m => {
    const s = String(m.status || "").trim().toLowerCase();
    return s === "completed" || s === "archived";
  });

  if (overdueMeetings.length === 0 && completedOrArchived.length === 0) {
    return;
  }

  const existingHistIds = new Set(meetingHistory.map(h => h.id));

  const meetingsToProcess: any[] = [];

  overdueMeetings.forEach(m => {
    meetingsToProcess.push({ meeting: m, shouldUpdateStatus: true });
  });

  completedOrArchived.forEach(m => {
    const occurrenceDate = m.occurrenceDate || (m.meetingDates && m.meetingDates[0]) || todayStr;
    const historyId = `m-hist-${m.id}-${occurrenceDate}`;
    if (!existingHistIds.has(historyId)) {
      meetingsToProcess.push({ meeting: m, shouldUpdateStatus: false });
    }
  });

  if (meetingsToProcess.length === 0) {
    return;
  }

  console.log(`Processing ${meetingsToProcess.length} completed/archived meetings for history/attendance preservation...`);

  const batch = writeBatch(db);

  meetingsToProcess.forEach(({ meeting: m, shouldUpdateStatus }) => {
    if (shouldUpdateStatus) {
      const docRef = doc(db, "meetings", m.id);
      batch.update(docRef, { status: "Completed" });
    }

    const occurrenceDate = m.occurrenceDate || (m.meetingDates && m.meetingDates[0]) || todayStr;
    const historyId = `m-hist-${m.id}-${occurrenceDate}`;

    const scheduledTimeStr = m.timeString || m.time || "09:00 AM";
    const scheduledMinutes = parseMeetingTimeToMinutes(scheduledTimeStr);
    const durationStr = m.duration || "30 minutes";
    const matchDuration = durationStr.match(/(\d+)/);
    const durationMinutes = matchDuration ? parseInt(matchDuration[1], 10) : 30;
    const endTimeMinutes = scheduledMinutes + durationMinutes;
    const scheduledEndTimeStr = formatMinutesToMeetingTime(endTimeMinutes);

    const historyData: MeetingHistoryRecord = {
      id: historyId,
      meetingId: m.id,
      title: m.title,
      type: m.type,
      date: occurrenceDate,
      scheduledStartTime: scheduledTimeStr,
      scheduledEndTime: scheduledEndTimeStr,
      duration: durationStr,
      organizer: m.organizer || "Admin Team",
      userLevels: m.userLevels || m.trackId || [],
      targetTeamTrackEligibility: m.targetTeamTrackEligibility || []
    };

    batch.set(doc(db, "meetingHistory", historyId), historyData, { merge: true });

    const eligibleUsers = profiles.filter(u => isUserEligibleForMeetingInBackend(u, m, assignments));
    
    eligibleUsers.forEach(user => {
      const hasAttendance = attendance.some(a => {
        const isSameMeeting = a.meetingId === m.id;
        const recordDate = a.timestamp ? a.timestamp.substring(0, 10) : "";
        const isSameDate = recordDate === occurrenceDate || a.meetingDate === occurrenceDate;
        return isSameMeeting && isSameDate && a.userId === user.id;
      });

      if (!hasAttendance) {
        const missedRecordId = `att_missed_${m.id}_${user.id}_${occurrenceDate}`;
        const missedRecord = {
          id: missedRecordId,
          userId: user.id,
          username: user.username || "",
          fullName: user.fullName || "",
          meetingId: m.id,
          meetingTitle: m.title,
          meetingType: m.type,
          timestamp: new Date(`${occurrenceDate}T12:00:00Z`).toISOString(),
          status: "Missed",
          track: user.track || "General",
          meetingDate: occurrenceDate
        };
        batch.set(doc(db, "attendance", missedRecordId), missedRecord, { merge: true });
      }
    });
  });

  await batch.commit();
};

export const synchronizeMeetings = async (): Promise<{ added: string[]; updated: string[] }> => {
  const { EXTERNAL_MEETINGS_POOL } = await import("./data/externalMeetings");
  const added: string[] = [];
  const updated: string[] = [];

  for (const m of EXTERNAL_MEETINGS_POOL) {
    const docRef = doc(db, "meetings", m.id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      updated.push(m.title);
    } else {
      added.push(m.title);
    }
    const todayStr = getLagosDateString(new Date());
    const todayDayName = getLagosDayOfWeek(new Date());
    const hasTodayDate = m.meetingDates && m.meetingDates.includes(todayStr);
    const hasTodayDay = m.scheduleDays && m.scheduleDays.includes(todayDayName);
    const isActive = hasTodayDate || hasTodayDay;

    await setDoc(docRef, { ...m, isActive }, { merge: true });
  }

  await syncMeetingAssignmentsForMeetings(EXTERNAL_MEETINGS_POOL);

  return { added, updated };
};

export const subscribeToAllState = (
  userId: string, 
  userProfile: Profile | null, 
  onStateUpdated: (state: any) => void
) => {
  const loadedCollections = new Set<string>();
  const state: any = {
    profiles: [],
    meetings: [],
    attendance: [],
    standups: [],
    personalDevelopment: [],
    techUpdates: [],
    weeklyDrills: [],
    drillSubmissions: [],
    socialLogs: [],
    projects: [],
    dailyReports: [],
    kdCounts: {},
    reminders: [],
    microserviceOwners: {},
    meetingTypes: [],
    meetingAssignments: [],
    meetingHistory: [],
    attendanceAuditLogs: [],
    tasks: [],
    microservices: [],
    careerPathways: null,
    autoMidnightSyncEnabled: false
  };

  const collectionsToListen = [
    "profiles",
    "meetings",
    "attendance",
    "standups",
    "personalDevelopment",
    "techUpdates",
    "weeklyDrills",
    "drillSubmissions",
    "socialLogs",
    "projects",
    "dailyReports",
    "reminders",
    "meetingAssignments",
    "meetingHistory",
    "attendanceAuditLogs",
    "metadata"
  ];

  const unsubscribes = collectionsToListen.map(colName => {
    const isAdmin = userProfile?.role === "admin";
    let queryRef: any;

    if (colName === "attendanceAuditLogs") {
      if (!isAdmin) {
        // Non-admins have no read permission for audit logs, bypass query
        return () => {};
      }
      queryRef = collection(db, "attendanceAuditLogs");
    } else if (colName === "attendance") {
      if (isAdmin) {
        queryRef = collection(db, "attendance");
      } else {
        queryRef = query(collection(db, "attendance"), where("userId", "==", userId));
      }
    } else if (colName === "reminders") {
      if (isAdmin) {
        queryRef = collection(db, "reminders");
      } else {
        queryRef = query(collection(db, "reminders"), where("userId", "==", userId));
      }
    } else {
      queryRef = collection(db, colName);
    }

    return onSnapshot(queryRef, (snapshot) => {
      loadedCollections.add(colName);
      const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      
      if (colName === "metadata") {
        const appConfig = docs.find(d => d.id === "app_config") as any;
        if (appConfig) {
          state.meetingTypes = appConfig.meetingTypes || [];
          state.kdCounts = appConfig.kdCounts || {};
          state.microserviceOwners = appConfig.microserviceOwners || {};
          state.tasks = appConfig.tasks || [];
          state.microservices = appConfig.microservices || [];
          state.careerPathways = appConfig.careerPathways || null;
          state.autoMidnightSyncEnabled = appConfig.autoMidnightSyncEnabled !== undefined ? appConfig.autoMidnightSyncEnabled : false;
        }
      } else {
        state[colName] = docs;
      }

      // Re-compile, filter, and dispatch state
      dispatchCompiledState();
    }, (error) => {
      console.error(`Error in onSnapshot listener for ${colName}:`, error);
      handleFirestoreError(error, OperationType.LIST, colName);
    });
  });

  const dispatchCompiledState = () => {
    if (!userProfile) return;

    const isAdmin = userProfile.role === "admin";
    const now = new Date();
    const todayStr = getLagosDateString(now);
    const todayDayName = getLagosDayOfWeek(now);

    // Apply cutoff filter to meetings
    let filteredMeetings = [...state.meetings];
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

    // Apply eligibility filters for trainee users
    if (!isAdmin) {
      filteredMeetings = filteredMeetings.filter((m: any) => {
        if (m.status && (m.status.trim().toLowerCase() === "archived" || m.status.trim().toLowerCase() === "completed")) {
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

        // Check assigned
        const isAssigned = (state.meetingAssignments || []).some(
          (ma: any) => ma.meetingId === m.id && ma.userId === userId
        );

        // Check user levels and tracks
        const userLevelValue = userProfile.learningLevel || userProfile.techExperience || "Apprentice level 1";
        const userTrackValue = userProfile.track || "";

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

    // Filter attendance and history for users
    let returnedAttendance = [...state.attendance];
    let returnedProfiles = [...state.profiles];
    let returnedHistory = [...state.meetingHistory];
    let returnedAuditLogs = [] as any[];

    if (!isAdmin) {
      returnedAttendance = returnedAttendance.filter(a => a.userId === userId);
      
      const userLevelValue = userProfile.learningLevel || userProfile.techExperience || "Apprentice level 1";
      const userTrackValue = userProfile.track || "";
      
      returnedHistory = returnedHistory.filter((h: any) => {
        const isAssigned = (state.meetingAssignments || []).some(
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
      returnedAuditLogs = [...state.attendanceAuditLogs];
    }

    const compiled = {
      ...state,
      profiles: returnedProfiles,
      meetings: filteredMeetings,
      attendance: returnedAttendance,
      reminders: state.reminders.filter((r: any) => r.userId === userId),
      meetingHistory: returnedHistory,
      attendanceAuditLogs: returnedAuditLogs
    };

    onStateUpdated(compiled);
  };

  let lastSyncDateString = "";
  const checkInterval = setInterval(() => {
    const isAdmin = userProfile?.role === "admin";
    const required = ["meetings", "profiles", "attendance", "meetingAssignments", "meetingHistory"];
    const allLoaded = required.every(col => loadedCollections.has(col));

    if (isAdmin && allLoaded && state.meetings && state.meetings.length > 0) {
      autoArchiveCompletedMeetings(
        state.meetings,
        state.profiles,
        state.attendance,
        state.meetingAssignments,
        state.meetingHistory
      ).catch((e) => console.error("Periodic auto-archive error:", e));
    }

    if (state.autoMidnightSyncEnabled) {
      const now = new Date();
      try {
        const currentLagosTime = new Intl.DateTimeFormat("en-US", {
          timeZone: "Africa/Lagos",
          hour: "numeric",
          minute: "numeric",
          hour12: false
        }).format(now);

        const todayStr = getLagosDateString(now);

        if ((currentLagosTime === "00:00" || currentLagosTime === "00:01") && lastSyncDateString !== todayStr) {
          lastSyncDateString = todayStr;
          console.log("⏱️ Automatic midnight sync triggered!");
          synchronizeMeetings().catch(e => console.error("Error running auto-sync meetings:", e));
        }
      } catch (e) {
        console.error("Error in automated midnight sync interval check:", e);
      }
    }
  }, 30000);

  return () => {
    clearInterval(checkInterval);
    unsubscribes.forEach(unsub => unsub());
  };
};

// --- DB Mutations Service Operations ---

export const getProfileById = async (id: string): Promise<Profile | null> => {
  const d = await getDoc(doc(db, "profiles", id));
  return d.exists() ? (d.data() as Profile) : null;
};

export const updateProfile = async (id: string, updates: Partial<Profile>): Promise<Profile> => {
  await updateDoc(doc(db, "profiles", id), updates);
  const updated = await getProfileById(id);
  if (!updated) throw new Error("Updated profile not found");
  return updated;
};

export const resetProfileToOnboarding = async (id: string): Promise<Profile> => {
  return updateProfile(id, {
    status: "onboarding",
    score: undefined
  });
};

export const submitAssessment = async (id: string, score: number, status: string): Promise<Profile> => {
  return updateProfile(id, {
    score,
    status: status as any
  });
};

export const retakeAssessment = async (id: string): Promise<Profile> => {
  return updateProfile(id, {
    status: "assessment_failed",
    score: undefined
  });
};

export const clearOrientation = async (id: string): Promise<Profile> => {
  return updateProfile(id, {
    status: "dashboard"
  });
};

export const completeTask = async (userId: string, taskId: string): Promise<void> => {
  const profileDoc = await getDoc(doc(db, "profiles", userId));
  if (!profileDoc.exists()) return;
  const profile = profileDoc.data() as Profile;
  const tasks = profile.assignedTasks || [];
  const updatedTasks = tasks.map(t => t.id === taskId ? { ...t, status: "Completed" as const } : t);
  await updateDoc(doc(db, "profiles", userId), { assignedTasks: updatedTasks });
};

export const saveMeetingType = async (typeName: string, oldName?: string): Promise<void> => {
  const docRef = doc(db, "metadata", "app_config");
  const d = await getDoc(docRef);
  
  if (oldName) {
    if (d.exists()) {
      const existing = d.data().meetingTypes || [];
      const updated = existing.map((t: string) => t === oldName ? typeName : t);
      await updateDoc(docRef, { meetingTypes: updated });
    }
    
    const q = query(collection(db, "meetings"), where("type", "==", oldName));
    const snapshot = await getDocs(q);
    const batch = writeBatch(db);
    snapshot.docs.forEach(docSnap => {
      batch.update(docSnap.ref, { type: typeName });
    });
    await batch.commit();
  } else {
    if (d.exists()) {
      const existing = d.data().meetingTypes || [];
      if (!existing.includes(typeName)) {
        await updateDoc(docRef, { meetingTypes: [...existing, typeName] });
      }
    } else {
      await setDoc(docRef, { meetingTypes: [typeName], kdCounts: {}, microserviceOwners: {} });
    }
  }
};

export const assignMicroserviceOwner = async (microserviceId: string, ownerId: string): Promise<void> => {
  const docRef = doc(db, "metadata", "app_config");
  const d = await getDoc(docRef);
  if (d.exists()) {
    const owners = d.data().microserviceOwners || {};
    owners[microserviceId] = ownerId || "";
    await updateDoc(docRef, { microserviceOwners: owners });
  } else {
    await setDoc(docRef, { meetingTypes: [], kdCounts: {}, microserviceOwners: { [microserviceId]: ownerId || "" } });
  }
};

export const assignKDCount = async (userId: string, count: number): Promise<void> => {
  const docRef = doc(db, "metadata", "app_config");
  const d = await getDoc(docRef);
  if (d.exists()) {
    const counts = d.data().kdCounts || {};
    counts[userId] = count;
    await updateDoc(docRef, { kdCounts: counts });
  } else {
    await setDoc(docRef, { meetingTypes: [], kdCounts: { [userId]: count }, microserviceOwners: {} });
  }
};

export const deleteMeetingType = async (typeName: string): Promise<void> => {
  const docRef = doc(db, "metadata", "app_config");
  const d = await getDoc(docRef);
  if (d.exists()) {
    const existing = d.data().meetingTypes || [];
    await updateDoc(docRef, { meetingTypes: existing.filter((t: string) => t !== typeName) });
  }
};

export const reviewStudent = async (userId: string, status: string): Promise<void> => {
  await updateDoc(doc(db, "profiles", userId), { status });
};

export const changeLevel = async (userId: string, level: string): Promise<void> => {
  await updateDoc(doc(db, "profiles", userId), { learningLevel: level });
};

export const assignTask = async (
  userId: string, 
  title: string, 
  description: string, 
  dueDate: string, 
  priority: "High" | "Medium" | "Low"
): Promise<void> => {
  const profileDoc = await getDoc(doc(db, "profiles", userId));
  if (!profileDoc.exists()) return;
  const profile = profileDoc.data() as Profile;
  const tasks = profile.assignedTasks || [];
  const newTask = {
    id: `task_${Date.now()}`,
    title,
    description,
    dueDate,
    priority,
    status: "Pending" as const,
    assignedAt: new Date().toISOString()
  };
  await updateDoc(doc(db, "profiles", userId), { assignedTasks: [...tasks, newTask] });
};

export const addDrill = async (title: string, description: string, link: string): Promise<void> => {
  const newDrill = {
    title,
    description,
    link,
    postedAt: new Date().toISOString()
  };
  await addDoc(collection(db, "weeklyDrills"), newDrill);
};

export const gradeDrillSubmission = async (
  submissionId: string, 
  score: number, 
  remarks: string, 
  status: string
): Promise<void> => {
  await updateDoc(doc(db, "drillSubmissions", submissionId), {
    score,
    remarks,
    status,
    gradedAt: new Date().toISOString()
  });
};

export const sendReminder = async (userId: string, message: string): Promise<void> => {
  const newReminder = {
    userId,
    message,
    timestamp: new Date().toISOString(),
    read: false
  };
  await addDoc(collection(db, "reminders"), newReminder);
};

export const dismissReminder = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, "reminders", id));
};

export const dismissAllReminders = async (userId: string): Promise<void> => {
  const q = query(collection(db, "reminders"), where("userId", "==", userId));
  const snapshot = await getDocs(q);
  const batch = writeBatch(db);
  snapshot.docs.forEach(d => {
    batch.delete(doc(db, "reminders", d.id));
  });
  await batch.commit();
};

export const deleteMeetingAssignmentsForMeetings = async (meetingIds: string[]): Promise<void> => {
  if (!meetingIds || meetingIds.length === 0) return;

  const chunkSize = 30;
  const chunks = [];
  for (let i = 0; i < meetingIds.length; i += chunkSize) {
    chunks.push(meetingIds.slice(i, i + chunkSize));
  }

  for (const chunk of chunks) {
    const q = query(
      collection(db, "meetingAssignments"),
      where("meetingId", "in", chunk)
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      let batch = writeBatch(db);
      let count = 0;
      for (const docSnap of snap.docs) {
        batch.delete(docSnap.ref);
        count++;
        if (count >= 400) {
          await batch.commit();
          batch = writeBatch(db);
          count = 0;
        }
      }
      if (count > 0) {
        await batch.commit();
      }
    }
  }
};

export const syncMeetingAssignmentsForMeetings = async (meetingsToSync: any[]): Promise<void> => {
  if (!meetingsToSync || meetingsToSync.length === 0) return;

  const meetingIds = meetingsToSync.map(m => m.id);
  await deleteMeetingAssignmentsForMeetings(meetingIds);

  const profilesSnap = await getDocs(collection(db, "profiles"));
  const activeProfiles = profilesSnap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() })) as Profile[];

  let batch = writeBatch(db);
  let batchCount = 0;
  const writeBatchSize = 400;

  for (const meeting of meetingsToSync) {
    for (const profile of activeProfiles) {
      const targetTracks = meeting.targetTeamTrackEligibility;
      const isGlobalTrack = !targetTracks || (Array.isArray(targetTracks) && targetTracks.length === 0);
      const userTrack = profile.track || "";
      const isTrackMatch = profile.role === "admin" || isGlobalTrack || (Array.isArray(targetTracks) && targetTracks.some(
        (t: string) => t.trim().toLowerCase() === userTrack.trim().toLowerCase() || userTrack.trim().toLowerCase() === "all"
      ));

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

      const teamTrackSpecified = !isGlobalTrack;
      const userLevelSpecified = !isGlobalLevel;

      let eligible = false;
      const hasDirectAssignments = meeting.assignedUserIds && Array.isArray(meeting.assignedUserIds) && meeting.assignedUserIds.length > 0;

      const isDirectAssigned = hasDirectAssignments && meeting.assignedUserIds.includes(profile.id);

      if (hasDirectAssignments) {
        eligible = isDirectAssigned;
      } else {
        if (teamTrackSpecified && userLevelSpecified) {
          eligible = isTrackMatch && isLevelMatch;
        } else if (teamTrackSpecified) {
          eligible = isTrackMatch;
        } else if (userLevelSpecified) {
          eligible = isLevelMatch;
        } else {
          eligible = true;
        }
      }

      if (eligible) {
        const assignmentId = `asg_${meeting.id}_${profile.id}`;
        batch.set(doc(db, "meetingAssignments", assignmentId), {
          id: assignmentId,
          meetingId: meeting.id,
          userId: profile.id,
          username: profile.username || "",
          fullName: profile.fullName || "",
          assignedAt: new Date().toISOString()
        });

        batchCount++;
        if (batchCount >= writeBatchSize) {
          await batch.commit();
          batch = writeBatch(db);
          batchCount = 0;
        }
      }
    }
  }

  if (batchCount > 0) {
    await batch.commit();
  }
};

export const syncMeetingAssignments = async (): Promise<void> => {
  const profilesSnap = await getDocs(collection(db, "profiles"));
  const meetingsSnap = await getDocs(collection(db, "meetings"));
  
  const activeProfiles = profilesSnap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() })) as Profile[];
  const activeMeetings = meetingsSnap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() })) as any[];

  const existingSnap = await getDocs(collection(db, "meetingAssignments"));
  const clearBatch = writeBatch(db);
  existingSnap.docs.forEach(docSnap => {
    clearBatch.delete(docSnap.ref);
  });
  await clearBatch.commit();

  const writeBatchSize = 400;
  let batch = writeBatch(db);
  let batchCount = 0;

  for (const meeting of activeMeetings) {
    for (const profile of activeProfiles) {
      const targetTracks = meeting.targetTeamTrackEligibility;
      const isGlobalTrack = !targetTracks || (Array.isArray(targetTracks) && targetTracks.length === 0);
      const userTrack = profile.track || "";
      const isTrackMatch = profile.role === "admin" || isGlobalTrack || (Array.isArray(targetTracks) && targetTracks.some(
        (t) => t.trim().toLowerCase() === userTrack.trim().toLowerCase() || userTrack.trim().toLowerCase() === "all"
      ));

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

      const teamTrackSpecified = !isGlobalTrack;
      const userLevelSpecified = !isGlobalLevel;

      let eligible = false;
      const hasDirectAssignments = meeting.assignedUserIds && Array.isArray(meeting.assignedUserIds) && meeting.assignedUserIds.length > 0;

      const isDirectAssigned = hasDirectAssignments && meeting.assignedUserIds.includes(profile.id);

      if (hasDirectAssignments) {
        eligible = isDirectAssigned;
      } else {
        if (teamTrackSpecified && userLevelSpecified) {
          eligible = isTrackMatch && isLevelMatch;
        } else if (teamTrackSpecified) {
          eligible = isTrackMatch;
        } else if (userLevelSpecified) {
          eligible = isLevelMatch;
        } else {
          eligible = true;
        }
      }

      if (eligible) {
        const assignmentId = `asg_${meeting.id}_${profile.id}`;
        batch.set(doc(db, "meetingAssignments", assignmentId), {
          id: assignmentId,
          meetingId: meeting.id,
          userId: profile.id,
          username: profile.username,
          fullName: profile.fullName,
          assignedAt: new Date().toISOString()
        });

        batchCount++;
        if (batchCount >= writeBatchSize) {
          await batch.commit();
          batch = writeBatch(db);
          batchCount = 0;
        }
      }
    }
  }

  if (batchCount > 0) {
    await batch.commit();
  }
};

export function generateRecurrenceDates(params: {
  frequency: string;
  startDate: string;
  endDate?: string;
  customInterval?: number;
}): string[] {
  const dates: string[] = [];
  const start = new Date(params.startDate);
  
  let end: Date;
  if (params.endDate && params.endDate !== "No End Date") {
    end = new Date(params.endDate);
  } else {
    // Default to 90 days if no end date
    end = new Date(start.getTime() + 90 * 24 * 60 * 60 * 1000);
  }

  if (end < start) return [params.startDate];

  const current = new Date(start);
  while (current <= end) {
    const yyyy = current.getFullYear();
    const mm = String(current.getMonth() + 1).padStart(2, '0');
    const dd = String(current.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;

    if (params.frequency === "daily") {
      dates.push(dateStr);
      current.setDate(current.getDate() + 1);
    } else if (params.frequency === "weekdays") {
      const day = current.getDay();
      if (day !== 0 && day !== 6) {
        dates.push(dateStr);
      }
      current.setDate(current.getDate() + 1);
    } else if (params.frequency === "weekly") {
      dates.push(dateStr);
      current.setDate(current.getDate() + 7);
    } else if (params.frequency === "monthly") {
      dates.push(dateStr);
      current.setMonth(current.getMonth() + 1);
    } else if (params.frequency === "custom") {
      dates.push(dateStr);
      const interval = params.customInterval || 1;
      current.setDate(current.getDate() + interval);
    } else {
      // one-time
      dates.push(dateStr);
      break;
    }
  }
  return dates;
}

export const saveMeeting = async (meetingData: any): Promise<void> => {
  const cleanData = { ...meetingData };
  // Sanitize undefined fields to prevent Firestore setDoc/updateDoc errors
  Object.keys(cleanData).forEach(key => {
    if (cleanData[key] === undefined) {
      delete cleanData[key];
    }
  });
  const editMode = cleanData.recurrenceEditMode || "single";
  delete cleanData.recurrenceEditMode;

  const todayStr = getLagosDateString(new Date());
  const todayDayName = getLagosDayOfWeek(new Date());

  // Check if it's a recurring meeting being newly scheduled
  if (cleanData.isRecurring && !cleanData.id) {
    const seriesId = `series-${Date.now()}`;
    const frequency = cleanData.recurrenceFrequency || "one-time";
    const startDate = cleanData.recurrenceStartDate || todayStr;
    const endDate = cleanData.recurrenceEndDate || "";
    const customInterval = cleanData.recurrenceCustomInterval || 1;

    const dates = generateRecurrenceDates({
      frequency,
      startDate,
      endDate: endDate === "No End Date" ? "" : endDate,
      customInterval
    });

    const batch = writeBatch(db);
    const occurrencesToSync: any[] = [];
    dates.forEach((dateStr) => {
      const occurrenceId = `meet-${seriesId}-${dateStr}`;
      const hasTodayDate = dateStr === todayStr;
      const hasTodayDay = cleanData.scheduleDays && cleanData.scheduleDays.includes(todayDayName);
      
      const occurrenceData = {
        ...cleanData,
        id: occurrenceId,
        seriesId,
        occurrenceDate: dateStr,
        meetingDates: [dateStr],
        isActive: hasTodayDate || hasTodayDay,
        recurrenceFrequency: frequency,
        recurrenceStartDate: startDate,
        recurrenceEndDate: endDate,
        recurrenceCustomInterval: customInterval
      };
      
      batch.set(doc(db, "meetings", occurrenceId), occurrenceData, { merge: true });
      occurrencesToSync.push(occurrenceData);
    });

    await batch.commit();
    await syncMeetingAssignmentsForMeetings(occurrencesToSync);
    return;
  }

  // Check if editing an existing series
  if (cleanData.id && cleanData.seriesId) {
    const currentId = cleanData.id;
    const currentSeriesId = cleanData.seriesId;
    const currentOccurrenceDate = cleanData.occurrenceDate || todayStr;

    delete cleanData.id; // remove id to prevent overwriting other docs' ids

    if (editMode === "single") {
      // Update only this specific occurrence
      cleanData.isActive = (cleanData.meetingDates || []).includes(todayStr) || (cleanData.scheduleDays || []).includes(todayDayName);
      const updatedData = {
        ...cleanData,
        id: currentId
      };
      await setDoc(doc(db, "meetings", currentId), updatedData, { merge: true });
      await syncMeetingAssignmentsForMeetings([updatedData]);
    } else {
      // Find occurrences to update
      const q = query(
        collection(db, "meetings"),
        where("seriesId", "==", currentSeriesId)
      );

      const snapshot = await getDocs(q);
      const docsToUpdate = editMode === "future"
        ? snapshot.docs.filter((d) => {
            const dData = d.data() as any;
            const dateStr = dData.occurrenceDate || todayStr;
            return dateStr >= currentOccurrenceDate;
          })
        : snapshot.docs;

      const batch = writeBatch(db);
      const occurrencesToSync: any[] = [];

      docsToUpdate.forEach((d) => {
        const dData = d.data() as any;
        const dateStr = dData.occurrenceDate || todayStr;
        const hasTodayDate = dateStr === todayStr;
        const hasTodayDay = cleanData.scheduleDays && cleanData.scheduleDays.includes(todayDayName);

        const updatedData = {
          ...cleanData,
          id: d.id,
          seriesId: currentSeriesId,
          occurrenceDate: dateStr,
          meetingDates: [dateStr],
          isActive: hasTodayDate || hasTodayDay
        };

        batch.set(d.ref, updatedData, { merge: true });
        occurrencesToSync.push(updatedData);
      });

      await batch.commit();
      await syncMeetingAssignmentsForMeetings(occurrencesToSync);
    }

    return;
  }

  // Default behavior (normal one-time meeting create/edit)
  delete cleanData.id;
  const meetingId = meetingData.id || `meet-${Date.now()}`;
  const finalMeetingDates = cleanData.meetingDates || [todayStr];
  const finalScheduleDays = cleanData.scheduleDays || ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
  cleanData.isActive = finalMeetingDates.includes(todayStr) || finalScheduleDays.includes(todayDayName);

  const updatedData = {
    ...cleanData,
    id: meetingId
  };
  await setDoc(doc(db, "meetings", meetingId), updatedData, { merge: true });

  await syncMeetingAssignmentsForMeetings([updatedData]);
};

export const deleteMeeting = async (meetingId: string, deleteMode: "single" | "future" | "all" = "single"): Promise<void> => {
  const deletedIds: string[] = [];
  if (deleteMode === "single") {
    await deleteDoc(doc(db, "meetings", meetingId));
    deletedIds.push(meetingId);
  } else {
    // Fetch the meeting to get seriesId and occurrenceDate
    const meetDoc = await getDoc(doc(db, "meetings", meetingId));
    if (meetDoc.exists()) {
      const meetData = meetDoc.data() as any;
      const seriesId = meetData.seriesId;
      const occurrenceDate = meetData.occurrenceDate;
      if (seriesId) {
        const q = query(
          collection(db, "meetings"),
          where("seriesId", "==", seriesId)
        );
        const snapshot = await getDocs(q);
        const docsToDelete = deleteMode === "future"
          ? snapshot.docs.filter((d) => {
              const dData = d.data() as any;
              const dateStr = dData.occurrenceDate || "";
              return dateStr >= occurrenceDate;
            })
          : snapshot.docs;

        const batch = writeBatch(db);
        docsToDelete.forEach((d) => {
          batch.delete(d.ref);
          deletedIds.push(d.id);
        });
        await batch.commit();
      } else {
        await deleteDoc(doc(db, "meetings", meetingId));
        deletedIds.push(meetingId);
      }
    }
  }
  await deleteMeetingAssignmentsForMeetings(deletedIds);
};

export const submitStandup = async (standupData: any): Promise<void> => {
  await addDoc(collection(db, "standups"), {
    ...standupData,
    timestamp: new Date().toISOString()
  });
};

export const submitDailyReport = async (reportData: any): Promise<void> => {
  await addDoc(collection(db, "dailyReports"), {
    ...reportData,
    timestamp: new Date().toISOString()
  });
};

export const submitMicroserviceSummary = async (data: any): Promise<void> => {
  await addDoc(collection(db, "personalDevelopment"), {
    ...data,
    timestamp: new Date().toISOString()
  });
};

export const submitMicroserviceUpdate = async (data: any): Promise<void> => {
  await addDoc(collection(db, "techUpdates"), {
    ...data,
    timestamp: new Date().toISOString()
  });
};

export const submitDrillSubmission = async (data: any): Promise<void> => {
  await addDoc(collection(db, "drillSubmissions"), {
    ...data,
    timestamp: new Date().toISOString(),
    status: "Submitted"
  });
};

export const joinKD = async (userId: string, userFullName: string): Promise<number> => {
  const docRef = doc(db, "metadata", "app_config");
  const d = await getDoc(docRef);
  let count = 1;
  if (d.exists()) {
    const counts = d.data().kdCounts || {};
    counts[userId] = (counts[userId] || 0) + 1;
    count = counts[userId];
    await updateDoc(docRef, { kdCounts: counts });
  } else {
    await setDoc(docRef, { kdCounts: { [userId]: 1 } });
  }
  return count;
};

export const submitSocialLog = async (data: any): Promise<void> => {
  await addDoc(collection(db, "socialLogs"), {
    ...data,
    timestamp: new Date().toISOString()
  });
};

export const updateAttendance = async (recordId: string, status: string): Promise<void> => {
  await updateDoc(doc(db, "attendance", recordId), { status });
};

export const joinMeetingAttendance = async (userId: string, meetingId: string): Promise<string> => {
  // First fetch the meeting
  let meeting: Meeting | null = null;
  const meetingDoc = await getDoc(doc(db, "meetings", meetingId));
  
  if (meetingDoc.exists()) {
    meeting = meetingDoc.data() as Meeting;
  } else {
    // Check if it's a project team sync meeting in the "projects" collection
    const projectsSnap = await getDocs(collection(db, "projects"));
    for (const pDoc of projectsSnap.docs) {
      const pData = pDoc.data();
      if (pData.meetings && Array.isArray(pData.meetings)) {
        const found = pData.meetings.find((m: any) => m.id === meetingId);
        if (found) {
          meeting = {
            id: found.id,
            title: found.title,
            type: "project",
            timeString: found.time || "02:00 PM",
            trackId: pData.trackId || "All",
            jitsiUrl: found.jitsiUrl || found.link || "",
            projectId: pDoc.id,
            scheduleDays: found.scheduleDays || ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
            duration: found.duration || "45 minutes",
            organizer: found.organizer || "Project Manager",
            status: found.status || "Upcoming",
            description: found.description || found.title
          } as Meeting;
          break;
        }
      }
    }
  }

  if (!meeting) throw new Error("Meeting not found");

  const profileDoc = await getDoc(doc(db, "profiles", userId));
  if (!profileDoc.exists()) throw new Error("User profile not found");
  const profile = profileDoc.data() as Profile;

  // Determine punctuality status
  const now = new Date();
  const todayStr = getLagosDateString(now);
  const scheduledTimeStr = meeting.timeString || "09:00 AM";
  const scheduledMinutes = parseMeetingTimeToMinutes(scheduledTimeStr);
  const currentMinutes = getLagosMinutesPastMidnight(now);

  let status: "Attended" | "Late" | "Missed" = "Attended";
  if (currentMinutes > scheduledMinutes + 5) {
    status = "Late";
  }

  const record: AttendanceRecord = {
    id: `att_${meetingId}_${userId}_${todayStr}`,
    userId,
    username: profile.username,
    fullName: profile.fullName,
    meetingId,
    meetingTitle: meeting.title,
    meetingType: meeting.type,
    timestamp: now.toISOString(),
    status,
    track: profile.track,
    meetingDate: todayStr
  };

  await setDoc(doc(db, "attendance", record.id), record);

  // Add standard audit log entry if admin
  if (profile.role === "admin") {
    const auditRecord = {
      id: `audit_${Date.now()}`,
      userId,
      username: profile.username,
      meetingId,
      action: "Admin Joined Session",
      timestamp: now.toISOString()
    };
    await setDoc(doc(db, "attendanceAuditLogs", auditRecord.id), auditRecord);
  }

  return status;
};

export const adminUpdateAttendance = async (
  adminUserId: string,
  targetUserId: string,
  meetingId: string,
  meetingDate: string,
  newStatus: "Attended" | "Late" | "Missed"
): Promise<void> => {
  const adminDoc = await getDoc(doc(db, "profiles", adminUserId));
  if (!adminDoc.exists() || adminDoc.data().role !== "admin") {
    throw new Error("Access denied. Only administrators can perform this action.");
  }

  const targetDoc = await getDoc(doc(db, "profiles", targetUserId));
  if (!targetDoc.exists()) {
    throw new Error("Target student profile not found.");
  }
  const targetUser = targetDoc.data() as Profile;

  const meetingDoc = await getDoc(doc(db, "meetings", meetingId));
  const meeting = meetingDoc.exists() ? (meetingDoc.data() as Meeting) : null;

  const q = query(
    collection(db, "attendance"),
    where("userId", "==", targetUserId),
    where("meetingId", "==", meetingId),
    where("meetingDate", "==", meetingDate)
  );
  const snapshot = await getDocs(q);

  let recordId = `att_${meetingId}_${targetUserId}_${meetingDate}`;
  let recordData: any;

  if (!snapshot.empty) {
    const docSnap = snapshot.docs[0];
    recordId = docSnap.id;
    recordData = {
      ...docSnap.data(),
      status: newStatus
    };
  } else {
    recordData = {
      id: recordId,
      userId: targetUserId,
      username: targetUser.username,
      fullName: targetUser.fullName,
      meetingId: meetingId,
      meetingTitle: meeting?.title || "Special Session",
      meetingType: meeting?.type || "Alignment Session",
      timestamp: new Date().toISOString(),
      status: newStatus,
      track: targetUser.track,
      meetingDate: meetingDate
    };
  }

  await setDoc(doc(db, "attendance", recordId), recordData);

  const auditId = `audit_${Date.now()}`;
  const auditData = {
    id: auditId,
    adminUserId,
    adminUsername: adminDoc.data().username,
    targetUserId,
    targetUsername: targetUser.username,
    meetingId,
    meetingDate,
    previousStatus: !snapshot.empty ? snapshot.docs[0].data().status : "None",
    newStatus,
    timestamp: new Date().toISOString()
  };
  await setDoc(doc(db, "attendanceAuditLogs", auditId), auditData);
};

export const triggerSimulatedCron = async (): Promise<{ meetings: any[] }> => {
  const todayStr = getLagosDateString(new Date());
  const todayDayName = getLagosDayOfWeek(new Date());

  const meetingsSnapshot = await getDocs(collection(db, "meetings"));
  const batch = writeBatch(db);
  const activeMeetings: any[] = [];

  meetingsSnapshot.docs.forEach(docSnap => {
    const m = docSnap.data();
    const hasTodayDate = m.meetingDates && m.meetingDates.includes(todayStr);
    const hasTodayDay = m.scheduleDays && m.scheduleDays.includes(todayDayName);
    const shouldBeActive = hasTodayDate || hasTodayDay;

    batch.update(docSnap.ref, { isActive: shouldBeActive });
    if (shouldBeActive) {
      activeMeetings.push({ id: docSnap.id, ...m, isActive: true });
    }
  });

  await batch.commit();
  return { meetings: activeMeetings };
};

export const loginUser = async (identifier: string, passwordStr: string): Promise<Profile> => {
  let email = identifier;
  if (!identifier.includes("@")) {
    const q = query(collection(db, "profiles"), where("username", "==", identifier.trim().toLowerCase()));
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      throw new Error("Failed to find this staff or student profile on our registry.");
    }
    const userDoc = snapshot.docs[0];
    email = userDoc.data().email;
  }
  
  let userCredential;
  try {
    userCredential = await signInWithEmailAndPassword(auth, email, passwordStr);
  } catch (error: any) {
    if (error.code === "auth/operation-not-allowed" || (error.message && error.message.includes("operation-not-allowed"))) {
      throw new Error("Firebase Authentication 'Email/Password' provider is not enabled in your Firebase console. Please go to your Firebase Console -> Authentication -> Sign-in method, click 'Add new provider', and enable the 'Email/Password' provider.");
    }
    throw error;
  }
  const user = userCredential.user;
  
  // Try to find / migrate profile
  let userDoc = await getDoc(doc(db, "profiles", user.uid));
  let profileData: Profile | null = null;
  
  if (userDoc.exists()) {
    profileData = userDoc.data() as Profile;
  } else {
    // Check if there's an existing profile with this email under a different ID
    const q = query(collection(db, "profiles"), where("email", "==", user.email?.trim().toLowerCase() || ""));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const oldDoc = snapshot.docs[0];
      const oldData = oldDoc.data() as Profile;
      profileData = {
        ...oldData,
        id: user.uid
      };
      await setDoc(doc(db, "profiles", user.uid), profileData);
      if (oldDoc.id !== user.uid) {
        try {
          await deleteDoc(doc(db, "profiles", oldDoc.id));
        } catch (e) {
          console.warn("Could not delete old profile doc:", e);
        }
      }
    }
  }
  
  if (!profileData) {
    // Fallback: create profile if not found
    const isEmailAdmin = ["stuncharles@gmail.com", "hadekunleabdulwally@gmail.com", "oluwatosinayinde.bincom@gmail.com"].includes((user.email || "").trim().toLowerCase());
    profileData = {
      id: user.uid,
      email: user.email || "",
      username: (user.email || "").split("@")[0].toLowerCase(),
      fullName: user.displayName || (user.email || "").split("@")[0],
      education: "",
      occupation: "",
      techExperience: "Beginner",
      track: "All",
      role: isEmailAdmin ? "admin" : "user",
      status: isEmailAdmin ? "admin" : "onboarding",
      joinedAt: new Date().toISOString()
    };
    await setDoc(doc(db, "profiles", user.uid), profileData);
  } else {
    const lowercaseEmail = (profileData.email || "").trim().toLowerCase();
    if (["stuncharles@gmail.com", "hadekunleabdulwally@gmail.com", "oluwatosinayinde.bincom@gmail.com"].includes(lowercaseEmail)) {
      if (profileData.role !== "admin" || profileData.status !== "admin") {
        profileData.role = "admin";
        profileData.status = "admin";
        await setDoc(doc(db, "profiles", user.uid), profileData);
      }
    }
  }
  
  return profileData;
};

export const registerUser = async (
  email: string,
  username: string,
  fullName: string,
  passwordStr: string
): Promise<Profile> => {
  const q = query(collection(db, "profiles"), where("username", "==", username.trim().toLowerCase()));
  const snapshot = await getDocs(q);
  if (!snapshot.empty) {
    throw new Error("Username already taken. Please choose another.");
  }

  let userCredential;
  try {
    userCredential = await createUserWithEmailAndPassword(auth, email, passwordStr);
  } catch (error: any) {
    if (error.code === "auth/operation-not-allowed" || (error.message && error.message.includes("operation-not-allowed"))) {
      throw new Error("Firebase Authentication 'Email/Password' provider is not enabled in your Firebase console. Please go to your Firebase Console -> Authentication -> Sign-in method, click 'Add new provider', and enable the 'Email/Password' provider.");
    }
    throw error;
  }
  const uid = userCredential.user.uid;

  const isEmailAdmin = ["stuncharles@gmail.com", "hadekunleabdulwally@gmail.com", "oluwatosinayinde.bincom@gmail.com"].includes(email.trim().toLowerCase());

  const newProfile: Profile = {
    id: uid,
    email: email.trim().toLowerCase(),
    username: username.trim().toLowerCase(),
    fullName: fullName.trim(),
    education: "",
    occupation: "",
    techExperience: "Beginner",
    track: "All",
    role: isEmailAdmin ? "admin" : "user",
    status: isEmailAdmin ? "admin" : "onboarding",
    joinedAt: new Date().toISOString()
  };

  await setDoc(doc(db, "profiles", uid), newProfile);
  return newProfile;
};

export const adminBypassLogin = async (): Promise<Profile> => {
  const email = "hadekunleabdulwally@gmail.com";
  const password = "AdminPassword123!";
  
  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (error: any) {
    if (error.code === "auth/operation-not-allowed" || (error.message && error.message.includes("operation-not-allowed"))) {
      throw new Error("Firebase Authentication 'Email/Password' provider is not enabled in your Firebase console. Please go to your Firebase Console -> Authentication -> Sign-in method, click 'Add new provider', and enable the 'Email/Password' provider.");
    }
    if (error.code === "auth/user-not-found" || error.code === "auth/invalid-credential" || error.code === "auth/invalid-email") {
      try {
        await createUserWithEmailAndPassword(auth, email, password);
      } catch (signUpError: any) {
        if (signUpError.code === "auth/operation-not-allowed" || (signUpError.message && signUpError.message.includes("operation-not-allowed"))) {
          throw new Error("Firebase Authentication 'Email/Password' provider is not enabled in your Firebase console. Please go to your Firebase Console -> Authentication -> Sign-in method, click 'Add new provider', and enable the 'Email/Password' provider.");
        }
        // If already exists or other error, ignore and try signin again
        try {
          await signInWithEmailAndPassword(auth, email, password);
        } catch (retryErr) {
          throw signUpError;
        }
      }
    } else {
      throw error;
    }
  }

  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("No user authenticated");
  
  const userDoc = await getDoc(doc(db, "profiles", uid));
  let profile: Profile;
  if (!userDoc.exists()) {
    profile = {
      id: uid,
      email,
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
    };
    await setDoc(doc(db, "profiles", uid), profile);
  } else {
    profile = userDoc.data() as Profile;
    if (profile.role !== "admin") {
      profile.role = "admin";
      profile.status = "admin";
      await setDoc(doc(db, "profiles", uid), profile);
    }
  }
  return profile;
};

export const updateAppConfigField = async (fieldName: string, value: any): Promise<void> => {
  const docRef = doc(db, "metadata", "app_config");
  const d = await getDoc(docRef);
  if (d.exists()) {
    await updateDoc(docRef, { [fieldName]: value });
  } else {
    await setDoc(docRef, { [fieldName]: value, meetingTypes: ["Knowledge Track", "Microservices", "Project"], kdCounts: {}, microserviceOwners: {} });
  }
};

