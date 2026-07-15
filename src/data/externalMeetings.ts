import { getLagosDateString } from "../utils/trackUtils";

export interface ExternalMeeting {
  id: string;
  title: string;
  type: string;
  timeString: string;
  jitsiUrl: string;
  targetTeamTrackEligibility: string[];
  trackId?: string[];
  userLevels?: string[];
  scheduleDays: string[];
  meetingDates: string[];
  duration: string;
  organizer: string;
  status: string;
  description: string;
}

export const EXTERNAL_MEETINGS_POOL: ExternalMeeting[] = [
  // Updated version of existing meet_1
  {
    id: "meet_1",
    title: "PMO Morning Alignment Stand-up (UPDATED)",
    type: "Knowledge Track",
    timeString: "08:45 AM WAT",
    jitsiUrl: "https://meet.jit.si/pmo-bincomdevcenter-updated",
    targetTeamTrackEligibility: ["PMO Bincom Dev Center"],
    trackId: ["PMO"],
    userLevels: ["All"],
    scheduleDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    meetingDates: [getLagosDateString(new Date())],
    duration: "60 minutes",
    organizer: "Admin Team",
    status: "Active",
    description: "Daily morning sync and compliance alignment review (UPDATED with new timing)."
  },
  // Updated version of existing meet_2
  {
    id: "meet_2",
    title: "Python Advanced OOP & Metaprogramming (UPDATED)",
    type: "Knowledge Track",
    timeString: "10:30 AM WAT",
    jitsiUrl: "https://meet.jit.si/BincomDevCenterPythonTeam-updated",
    targetTeamTrackEligibility: ["Python"],
    trackId: ["Python"],
    userLevels: ["All"],
    scheduleDays: ["Monday", "Wednesday", "Friday"],
    meetingDates: [getLagosDateString(new Date())],
    duration: "90 minutes",
    organizer: "Admin Team",
    status: "Active",
    description: "Deep dive into object-oriented programming design patterns & metaprogramming in Python."
  },
  // Newly created meeting 1
  {
    id: "meet_external_1",
    title: "Cloud Native Microservices & Docker",
    type: "Microservices",
    timeString: "02:00 PM WAT",
    jitsiUrl: "https://meet.jit.si/BincomDevCenter_CloudNative",
    targetTeamTrackEligibility: ["All Tracks"],
    trackId: ["All"],
    userLevels: ["All"],
    scheduleDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    meetingDates: [getLagosDateString(new Date())],
    duration: "60 minutes",
    organizer: "Platform Team",
    status: "Active",
    description: "Hands-on session on Docker containerisation and microservice deployments."
  },
  // Newly created meeting 2
  {
    id: "meet_external_2",
    title: "UI/UX Figma Design Sprint",
    type: "Knowledge Track",
    timeString: "03:30 PM WAT",
    jitsiUrl: "https://meet.jit.si/BincomDevCenter_UIUXDesignSprint",
    targetTeamTrackEligibility: ["UIUX Design"],
    trackId: ["Design"],
    userLevels: ["All"],
    scheduleDays: ["Tuesday", "Thursday"],
    meetingDates: [getLagosDateString(new Date())],
    duration: "60 minutes",
    organizer: "Design Mentor",
    status: "Active",
    description: "Sprint wireframing and interactive prototyping feedback session."
  }
];
