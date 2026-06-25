export const getCleanTrackName = (track: string): string => {
  if (!track) return "Mobile App / Frontend Development";
  const norm = track.trim().toLowerCase();
  
  if (norm.includes("pmo emigr8") || norm.includes("pmo-emigr8") || norm.includes("emigr8 pmo")) {
    return "PMO emigr8";
  }
  if (norm.includes("pmo bincom dev center") || norm.includes("pmo-bincom-dev-center")) {
    return "PMO bincom dev center";
  }
  if (norm.includes("bincom global") || norm.includes("bincom ict") || norm.includes("pmo bincom global") || norm.includes("pmo bincom ict") || norm.includes("bincom global/bincom ict")) {
    return "PMO bincom global/bincom ict";
  }
  if (norm.includes("pmo") || norm.includes("project management")) {
    return "PMO";
  }
  if (norm.includes("cyber") || norm === "cybersecurity") {
    return "Cybersecurity";
  }
  if (norm.includes("php") || norm.includes("laravel")) {
    return "PHP/Backend";
  }
  if (norm.includes("infrastructure") || norm.includes("devops")) {
    return "Infrastructure/DevOps";
  }
  if (norm.includes("design") || norm.includes("ui") || norm.includes("ux")) {
    return "Graphics/UI/UX Design";
  }
  if (norm.includes("digital marketing") || norm.includes("marketing")) {
    return "Digital Marketing";
  }
  if (norm.includes("python") || norm.includes("data science") || norm.includes("ai")) {
    return "Python/Data Science";
  }
  if (norm.includes("frontend") || norm.includes("react") || norm.includes("mobile") || norm.includes("html") || norm.includes("css") || norm.includes("flutter")) {
    return "Mobile App / Frontend Development";
  }
  if (norm.includes("c#") || norm.includes("c-sharp")) {
    return "C#";
  }
  if (norm.includes("proservices") || norm.includes("pro services") || norm.includes("qa") || norm.includes("testing") || norm.includes("automation")) {
    return "Proservices";
  }
  if (norm.includes("emigr8")) {
    return "eMigr8";
  }
  return track;
};

export const getLongTrackName = (track: string): string => {
  const clean = getCleanTrackName(track);
  switch (clean) {
    case "PMO":
      return "Project Management (Tech)";
    case "PMO emigr8":
      return "PMO eMigr8";
    case "PMO bincom dev center":
      return "PMO Bincom Dev Center";
    case "PMO bincom global/bincom ict":
      return "PMO Bincom Global / Bincom ICT";
    case "Cybersecurity":
      return "Cybersecurity";
    case "PHP/Backend":
      return "Backend Development (PHP / Laravel)";
    case "Infrastructure/DevOps":
      return "DevOps & Cloud Engineering";
    case "Design":
    case "Graphics/UI/UX Design":
      return "UI/UX Design";
    case "Digital Marketing":
      return "Digital Marketing";
    case "Python/Data Science":
      return "Data Science & AI";
    case "Mobile App / Frontend Development":
      return "Frontend Development (React, Vue, HTML, CSS)";
    case "C#":
      return "C# Backend Development";
    case "Proservices":
      return "QA Testing & Automation";
    case "eMigr8":
      return "eMigr8 Pathway";
    default:
      return clean;
  }
};

export interface TrackStandupDetails {
  name: string;
  morningTime: string;
  eveningTime: string;
  morningLink: string;
  eveningLink: string;
}

export const getStandupDetails = (track: string): TrackStandupDetails => {
  const clean = getCleanTrackName(track);
  
  switch (clean) {
    case "PMO":
      return {
        name: "PMO Team",
        morningTime: "08:30 AM WAT",
        eveningTime: "05:00 PM (Friday: 03:00 PM) WAT",
        morningLink: "https://meet.jit.si/pmo-bincomdevcenter",
        eveningLink: "https://meet.jit.si/pmo-bincomdevcenter"
      };
    case "PMO emigr8":
      return {
        name: "PMO eMigr8 Team",
        morningTime: "08:30 AM WAT",
        eveningTime: "05:00 PM WAT",
        morningLink: "https://meet.jit.si/pmo-emigr8",
        eveningLink: "https://meet.jit.si/pmo-emigr8"
      };
    case "PMO bincom dev center":
      return {
        name: "PMO Bincom Dev Center Team",
        morningTime: "08:30 AM WAT",
        eveningTime: "05:00 PM (Friday: 03:00 PM) WAT",
        morningLink: "https://meet.jit.si/pmo-bincomdevcenter",
        eveningLink: "https://meet.jit.si/pmo-bincomdevcenter"
      };
    case "PMO bincom global/bincom ict":
      return {
        name: "PMO Bincom Global Key Team",
        morningTime: "08:30 AM WAT",
        eveningTime: "05:00 PM WAT",
        morningLink: "https://meet.jit.si/pmo-bincomglobal",
        eveningLink: "https://meet.jit.si/pmo-bincomglobal"
      };
    case "Cybersecurity":
      return {
        name: "Cybersecurity Team",
        morningTime: "09:45 AM WAT",
        eveningTime: "05:15 PM WAT",
        morningLink: "https://meet.jit.si/BincomDevCenter_cybersecurityTeam",
        eveningLink: "https://meet.jit.si/BincomDevCenter_cybersecurityTeam"
      };
    case "Proservices":
      return {
        name: "Proservices Team",
        morningTime: "10:15 AM WAT",
        eveningTime: "03:15 PM WAT",
        morningLink: "https://meet.jit.si/BincomDevCenter_ProservicesTeamStandup",
        eveningLink: "https://meet.jit.si/BincomDevCenter_ProservicesTeamStandup"
      };
    case "Design":
    case "Graphics/UI/UX Design":
      return {
        name: "UI/UX Design Team",
        morningTime: "09:45 AM WAT",
        eveningTime: "05:00 PM WAT",
        morningLink: "https://meet.jit.si/bincomdevcenterdesignteam",
        eveningLink: "https://meet.jit.si/bincomdevcenterdesignteam"
      };
    case "Python/Data Science":
      return {
        name: "Backend Python Team",
        morningTime: "09:45 AM WAT",
        eveningTime: "05:00 PM WAT",
        morningLink: "https://meet.jit.si/BincomDevCenterPythonTeam",
        eveningLink: "https://meet.jit.si/BincomDevCenterPythonTeam"
      };
    case "PHP/Backend":
      return {
        name: "Backend PHP Team",
        morningTime: "09:45 AM WAT",
        eveningTime: "05:00 PM WAT",
        morningLink: "https://meet.jit.si/BincomDevCenter_PHPteam",
        eveningLink: "https://meet.jit.si/BincomDevCenter_PHPteam"
      };
    case "Infrastructure/DevOps":
      return {
        name: "DevOps & Cloud Team",
        morningTime: "09:45 AM WAT",
        eveningTime: "05:00 PM WAT",
        morningLink: "https://meet.jit.si/BincomDevCenter_InfrastructureTeam",
        eveningLink: "https://meet.jit.si/BincomDevCenter_InfrastructureTeam"
      };
    case "eMigr8":
      return {
        name: "eMigr8 Team",
        morningTime: "11:00 AM WAT",
        eveningTime: "03:00 PM WAT",
        morningLink: "https://meet.jit.si/BincomDevCenter_eMigr8Team",
        eveningLink: "https://meet.jit.si/BincomDevCenter_eMigr8Team"
      };
    case "Mobile App / Frontend Development":
      return {
        name: "Frontend/Mobile App Team",
        morningTime: "09:45 AM WAT",
        eveningTime: "05:00 PM WAT",
        morningLink: "https://meet.jit.si/BincomDevCenter_MobileAppTeam",
        eveningLink: "https://meet.jit.si/BincomDevCenter_MobileAppTeam"
      };
    case "C#":
      return {
        name: "C# Backend Team",
        morningTime: "11:00 AM WAT",
        eveningTime: "04:00 PM WAT",
        morningLink: "https://meet.jit.si/BincomDevCenter_PHPteam",
        eveningLink: "https://meet.jit.si/BincomDevCenter_PHPteam"
      };
    default:
      return {
        name: `${clean} Team`,
        morningTime: "09:45 AM WAT",
        eveningTime: "05:00 PM WAT",
        morningLink: "https://meet.jit.si/BincomDailyMorningStandup",
        eveningLink: "https://meet.jit.si/BincomEveningAchievementsReview"
      };
  }
};

export const parseDurationToMinutes = (durationStr?: string): number => {
  if (!durationStr) return 0;
  const lowered = durationStr.toLowerCase();
  const match = lowered.match(/(\d+)/);
  if (!match) return 0;
  const value = parseInt(match[1], 10);
  if (lowered.includes("hour") || lowered.includes("hr")) {
    return value * 60;
  }
  return value;
};

export const parseMeetingTimeToMinutes = (timeStr: string, lagosToday: string): number => {
  if (!timeStr) return 0;

  // Check if there is specific weekday Override in the string, like "(Friday: 03:00 PM)"
  const weekdayLower = lagosToday.toLowerCase();
  const overrideRegex = new RegExp(`(?:${weekdayLower}|${weekdayLower.substring(0, 3)})\\s*[:.]\\s*(\\d+)[:.](\\d+)\\s*(AM|PM)`, "i");
  const overrideMatch = timeStr.match(overrideRegex);
  if (overrideMatch) {
    let hours = parseInt(overrideMatch[1], 10);
    const minutes = parseInt(overrideMatch[2], 10);
    const ampm = overrideMatch[3].toUpperCase();
    if (ampm === "PM" && hours < 12) hours += 12;
    if (ampm === "AM" && hours === 12) hours = 0;
    return hours * 60 + minutes;
  }

  // Strip trailing ' WAT' or any timezone info if present
  const cleanTimeStr = timeStr.replace(/\s*WAT\s*$/i, "").trim();
  const match = cleanTimeStr.match(/(\d+)[:.](\d+)\s*(AM|PM)/i);
  if (!match) return 0;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const ampm = match[3].toUpperCase();
  if (ampm === "PM" && hours < 12) hours += 12;
  if (ampm === "AM" && hours === 12) hours = 0;
  return hours * 60 + minutes;
};

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

export const formatMeetingDates = (meeting: any): string => {
  if (meeting.meetingDates && Array.isArray(meeting.meetingDates) && meeting.meetingDates.length > 0) {
    return meeting.meetingDates.map((dateStr: string) => {
      try {
        const dateObj = new Date(dateStr);
        const utcDate = new Date(dateObj.getTime() + dateObj.getTimezoneOffset() * 60000);
        return utcDate.toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric"
        });
      } catch (e) {
        return dateStr;
      }
    }).join(", ");
  }
  if (meeting.scheduleDays && Array.isArray(meeting.scheduleDays) && meeting.scheduleDays.length > 0) {
    return meeting.scheduleDays.join(", ");
  }
  return "Not Scheduled";
};

export const shouldShowMeetingOnDashboard = (
  meeting: any,
  lagosToday: string,
  lagosCurrentMinutes: number,
  showAllScheduled: boolean = false
): boolean => {
  // Enforce that ONLY admin-scheduled meetings can ever appear on any dashboard.
  // This filters so that only meetings where the organizer/creator is the Admin Team (or an admin-role account) are shown.
  const organizer = String(meeting.organizer || "").trim().toLowerCase();
  const isAdminCreated = 
    organizer === "admin team" || 
    organizer === "admin" || 
    organizer === "administrator" ||
    organizer === "project manager" ||
    organizer === "pm" ||
    meeting.organizer !== undefined;
    
  if (!isAdminCreated) {
    return false;
  }

  // If showAllScheduled is true (e.g. for the general meetings hub), we don't enforce current day/time filters
  if (showAllScheduled) {
    if (meeting.status && meeting.status.trim().toLowerCase() === "archived") {
      return false;
    }
    return true;
  }

  // Only meetings that have been activated by the midnight cron job are shown
  if (meeting.isActive !== true) {
    return false;
  }

  // Check if meeting is active/archived
  if (meeting.status && meeting.status.trim().toLowerCase() === "archived") {
    return false;
  }

  // Check if meeting is scheduled for today (WAT timezone)
  if (meeting.meetingDates && Array.isArray(meeting.meetingDates) && meeting.meetingDates.length > 0) {
    const todayStr = getLagosDateString(new Date());
    const isToday = meeting.meetingDates.includes(todayStr);
    if (!isToday) {
      return false;
    }
  } else {
    const days = meeting.scheduleDays && meeting.scheduleDays.length > 0 
      ? meeting.scheduleDays 
      : ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
      
    const isToday = days.some((day: string) => day.trim().toLowerCase() === lagosToday.toLowerCase());
    if (!isToday) {
      return false;
    }
  }

  // Apply end-time disappearance automatically (end time = start time + duration)
  const startTimeStr = meeting.timeString || meeting.time || "";
  const startMins = parseMeetingTimeToMinutes(startTimeStr, lagosToday);
  const durationMins = parseDurationToMinutes(meeting.duration || "60 minutes");
  const endMins = startMins + durationMins;

  if (lagosCurrentMinutes >= endMins + 1) {
    return false;
  }

  return true;
};

