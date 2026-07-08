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
import { Profile, Meeting, AttendanceRecord, WeeklyDrill, WeeklyDrillSubmission, MeetingAssignment } from "./types";

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
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
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
  throw new Error(JSON.stringify(errInfo));
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
    } else {
      onUserLoaded(null);
    }
  });
};

// --- Realtime Database Sync Engine ---
export const subscribeToAllState = (
  userId: string, 
  userProfile: Profile | null, 
  onStateUpdated: (state: any) => void
) => {
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
    careerPathways: null
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

  return () => {
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

export const saveMeeting = async (meetingData: any): Promise<void> => {
  const cleanData = { ...meetingData };
  delete cleanData.id;
  const meetingId = meetingData.id || `meet-${Date.now()}`;
  
  const todayStr = getLagosDateString(new Date());
  const todayDayName = getLagosDayOfWeek(new Date());
  const finalMeetingDates = cleanData.meetingDates || [todayStr];
  const finalScheduleDays = cleanData.scheduleDays || ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
  cleanData.isActive = finalMeetingDates.includes(todayStr) || finalScheduleDays.includes(todayDayName);

  await setDoc(doc(db, "meetings", meetingId), {
    ...cleanData,
    id: meetingId
  }, { merge: true });

  await syncMeetingAssignments();
};

export const deleteMeeting = async (meetingId: string): Promise<void> => {
  await deleteDoc(doc(db, "meetings", meetingId));
  await syncMeetingAssignments();
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
  const meetingDoc = await getDoc(doc(db, "meetings", meetingId));
  if (!meetingDoc.exists()) throw new Error("Meeting not found");
  const meeting = meetingDoc.data() as Meeting;

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

