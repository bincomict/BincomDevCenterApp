/**
 * Types for Bincom Dev Center Platform
 */

export type UserRole = "user" | "admin";

export type OnboardingStatus =
  | "onboarding"
  | "assessment_failed"
  | "assessment_passed"
  | "oriented"
  | "dashboard"
  | "admin";

export interface CustomTask {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  priority: "High" | "Medium" | "Low";
  status: "Pending" | "Completed";
  assignedAt: string;
}

export interface Profile {
  id: string;
  email: string;
  username: string;
  fullName: string;
  password?: string;
  education: string;
  occupation: string;
  techExperience: string; // e.g. "Beginner", "Intermediate", "Advanced"
  track: string; // Selected tech track
  role: UserRole;
  status: OnboardingStatus;
  score?: number; // Score from assessment questions
  joinedAt: string;
  learningLevel?: string;
  previousCourseCompleted?: boolean;
  assignedTasks?: CustomTask[];
}

export type MeetingType = "knowledge" | "microservice" | "project";

export interface Meeting {
  id: string;
  title: string;
  type: MeetingType | string;
  timeString: string; // e.g. "09:00 AM" or "04:00 PM"
  trackId: string | string[]; // Backed track name, or "All"
  jitsiUrl: string;
  projectId?: string; // Optional linked project
  project_id?: string;
  groupId?: string;
  group_id?: string;
  assignedGroupId?: string;
  assignedGroupIds?: string[];
  scheduleDays?: string[];
  meetingDates?: string[];
  isActive?: boolean;
  targetTeamTrackEligibility?: string[] | null;
  userLevels?: string[] | null;
  assignedUserIds?: string[];
  duration?: string;
  organizer?: string;
  status?: string;
  description?: string;
}

export interface AttendanceRecord {
  id: string;
  userId: string;
  username: string;
  fullName: string;
  meetingId: string;
  meetingTitle: string;
  meetingType: MeetingType | string;
  timestamp: string; // UTC ISO String
  status: "Attended" | "Late" | "Missed";
  track: string;
  meetingDate?: string; // Optional: to link to a specific date instance
}

export interface MeetingHistoryRecord {
  id: string; // m-hist-<meetingId>-<date>
  meetingId: string;
  title: string;
  type: string;
  date: string; // YYYY-MM-DD
  scheduledStartTime: string;
  scheduledEndTime: string;
  duration: string;
  organizer: string;
  userLevels: string[];
  targetTeamTrackEligibility: string[];
}

export interface AttendanceAuditLog {
  id: string;
  timestamp: string; // UTC ISO String
  adminId: string;
  adminUsername: string;
  action: string;
  meetingId: string;
  meetingDate: string;
  targetUserId: string;
  previousStatus: string;
  newStatus: string;
}

export interface StandupLog {
  id: string;
  userId: string;
  fullName: string;
  track: string;
  date: string; // "YYYY-MM-DD"
  morningGoals?: string;
  eveningAchievements?: string;
  morningTime?: string;
  eveningTime?: string;
}

export interface PersonalDevelopmentLog {
  id: string;
  userId: string;
  fullName: string;
  track: string;
  date: string;
  summary: string; // 100-word daily overview
  timestamp: string;
}

export interface TechUpdateSubmission {
  id: string;
  userId: string;
  fullName: string;
  track: string;
  title: string;
  url: string;
  summary: string;
  timestamp: string;
}

export interface WeeklyDrill {
  id: string;
  title: string;
  description: string;
  link: string; // e.g. github challenge or reading
  postedAt: string;
}

export interface WeeklyDrillSubmission {
  id: string;
  drillId: string;
  drillTitle: string;
  userId: string;
  fullName: string;
  track: string;
  solutionUrl: string;
  feedback?: string;
  status: "Pending" | "Approved" | "Rejected";
  timestamp: string;
}

export interface SocialEventLog {
  id: string;
  userId: string;
  fullName: string;
  track: string;
  title: string;
  link: string;
  type: "blog" | "hackathon" | "public-artifact";
  timestamp: string;
}

export interface ProjectDescriptor {
  id: string;
  name: string;
  description: string;
  status: "Active" | "Hold";
  members: string[]; // usernames or primary developer IDs
  githubUrl?: string;
  meetings: Array<{ id: string; title: string; time: string; jitsiUrl: string }>;
}

export interface AssessmentQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswerIndex: number;
  isSoftSkill?: boolean;
}

export interface DailyReportLog {
  id: string;
  userId: string;
  fullName: string;
  track: string;
  date: string; // "YYYY-MM-DD"
  accomplishments: string;
  hoursSpent: number;
  roadblocks: string;
  takeaways: string;
  timestamp: string;
}

export interface MeetingAssignment {
  meetingId: string;
  userId: string;
}

