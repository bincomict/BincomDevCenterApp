import { doc, writeBatch, collection, getDocs, getDoc } from "firebase/firestore";
import { db } from "./firebase";
import { getLagosDateString } from "./utils/trackUtils";

const SEED_DATA = {
  profiles: [],
  meetings: [
    {
      id: "meet_1",
      title: "PMO Morning Alignment Stand-up",
      type: "Knowledge Track",
      timeString: "08:30 AM WAT",
      jitsiUrl: "https://meet.jit.si/pmo-bincomdevcenter",
      targetTeamTrackEligibility: ["PMO Bincom Dev Center"],
      trackId: ["PMO"],
      scheduleDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      meetingDates: [getLagosDateString(new Date())],
      duration: "60",
      organizer: "Admin Team",
      status: "Active",
      description: "Daily morning sync and compliance alignment review for all Dev Center members.",
      isActive: true
    },
    {
      id: "meet_2",
      title: "Python Advanced OOP Concepts",
      type: "Knowledge Track",
      timeString: "10:00 AM WAT",
      jitsiUrl: "https://meet.jit.si/BincomDevCenterPythonTeam",
      targetTeamTrackEligibility: ["Python"],
      trackId: ["Python"],
      scheduleDays: ["Monday", "Wednesday", "Friday"],
      meetingDates: [getLagosDateString(new Date())],
      duration: "90",
      organizer: "Admin Team",
      status: "Active",
      description: "Deep dive into object-oriented programming design patterns in Python.",
      isActive: true
    },
    {
      id: "meet_3",
      title: "PHP MVC Architecture & Laravel Setup",
      type: "Knowledge Track",
      timeString: "11:30 AM WAT",
      jitsiUrl: "https://meet.jit.si/BincomDevCenter_PHPteam",
      targetTeamTrackEligibility: ["PHP"],
      trackId: ["PHP"],
      scheduleDays: ["Tuesday", "Thursday"],
      meetingDates: [getLagosDateString(new Date())],
      duration: "90",
      organizer: "Admin Team",
      status: "Active",
      description: "Understanding Model-View-Controller patterns and building robust web routes with Laravel.",
      isActive: true
    },
    {
      id: "meet_4",
      title: "React Native State Management & Hooks",
      type: "Knowledge Track",
      timeString: "01:00 PM WAT",
      jitsiUrl: "https://meet.jit.si/BincomDevCenter_MobileAppTeam",
      targetTeamTrackEligibility: ["Mobile App Team"],
      trackId: ["Mobile App"],
      scheduleDays: ["Monday", "Wednesday", "Friday"],
      meetingDates: [getLagosDateString(new Date())],
      duration: "60",
      organizer: "Admin Team",
      status: "Active",
      description: "Advanced local state, Context API, and state synchronization across screens.",
      isActive: true
    },
    {
      id: "meet_5",
      title: "Weekly Drills & Homework Review",
      type: "Microservices",
      timeString: "04:00 PM WAT",
      jitsiUrl: "https://meet.jit.si/BincomDailyMorningStandup",
      targetTeamTrackEligibility: ["All Tracks"],
      scheduleDays: ["Friday"],
      meetingDates: [getLagosDateString(new Date())],
      duration: "60",
      organizer: "Admin Team",
      status: "Active",
      description: "Collective review of submitted weekly coding homework, GitHub PR evaluation, and grading guidelines.",
      isActive: true
    }
  ],
  weeklyDrills: [
    {
      id: "drill_1",
      title: "Drill #1: REST API with CRUD Operations",
      description: "Build a fully functioning REST API in your track language (Node, Python, PHP, or Java) implementing database storage, user validation, and comprehensive routing endpoints. Submit a public GitHub repository link.",
      link: "https://github.com/bincomdev/weekly-drill-rest-api",
      postedAt: "2026-07-01T08:00:00.000Z"
    },
    {
      id: "drill_2",
      title: "Drill #2: Advanced SQL Joins and Aggregations",
      description: "Write complex relational database queries to produce analytics reports, utilizing subqueries, window functions, and multiple table JOIN operations. Submit a text file containing the SQL scripts on GitHub.",
      link: "https://github.com/bincomdev/weekly-drill-sql-joins",
      postedAt: "2026-07-08T08:00:00.000Z"
    },
    {
      id: "drill_3",
      title: "Drill #3: Single Page Application Route Transitions",
      description: "Build a clean, responsive client-side routing layout using React Router and Framer Motion for rich page-to-page visual transitions. Submit the live URL and GitHub link.",
      link: "https://github.com/bincomdev/weekly-drill-spa-routing",
      postedAt: "2026-07-15T08:00:00.000Z"
    }
  ],
  projects: [
    {
      id: "proj_1",
      name: "Bincom Dev Master Tracker",
      description: "Centralised hub to coordinate student sprint backlogs, task reviews, and standup compliance logs.",
      status: "Active" as const,
      members: ["admin", "stuncharles", "hadekunleabdulwally", "oluwatosinayinde.bincom"],
      githubUrl: "https://github.com/bincomdev/dev-master-tracker",
      meetings: [
        { id: "m_p1", title: "Dev Master Progress Sync", time: "02:00 PM WAT", jitsiUrl: "https://meet.jit.si/BincomDevMasterSync" }
      ]
    },
    {
      id: "proj_2",
      name: "eMigr8 Visa Pathway Portal",
      description: "Platform providing immigration pathways, documentation guides, and visa processing tools.",
      status: "Active" as const,
      members: ["admin", "stuncharles", "hadekunleabdulwally", "oluwatosinayinde.bincom"],
      githubUrl: "https://github.com/bincomdev/emigr8-portal",
      meetings: [
        { id: "m_p2", title: "eMigr8 Architecture Refinement", time: "03:00 PM WAT", jitsiUrl: "https://meet.jit.si/BincomEMigr8Refinement" }
      ]
    }
  ],
  meetingAssignments: [],
  meetingHistory: [],
  metadata: [
    {
      id: "app_config",
      meetingTypes: ["Knowledge Track", "Microservices", "Project"],
      kdCounts: {},
      microserviceOwners: {},
      tasks: [
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
          due: "Daily Morning",
          priority: "High"
        },
        {
          id: "tsk_evening",
          title: "Evening Stand-up Live Session",
          description: "Connect to Jitsi team stand-up in the evening for progress review.",
          due: "Daily Evening",
          priority: "High"
        },
        {
          id: "tsk_report",
          title: "Daily Report Submission",
          description: "Log your daily accomplishments, personal development hours, and roadblocks on your Slack/Module channel.",
          due: "Daily by 05:00 PM (WAT)",
          priority: "High"
        }
      ],
      microservices: [
        {
          id: "ms_kd",
          title: "Knowledge Development",
          description: "Learning and development platform.",
          linkText: "Open KD",
          tab: "hub",
          icon: "BookOpen"
        },
        {
          id: "ms_pd",
          title: "Personal Development",
          description: "Submit your daily learning summary.",
          linkText: "Write Summary",
          tab: "microservices",
          subTab: "pd",
          icon: "Award"
        },
        {
          id: "ms_drills",
          title: "Weekly Drills",
          description: "Programming challenges to improve your skills.",
          linkText: "Learn Skills",
          tab: "microservices",
          subTab: "drills",
          icon: "Sparkles"
        },
        {
          id: "ms_tech",
          title: "Tech Updates",
          description: "Share & discuss hot technical links.",
          linkText: "Share Links",
          tab: "microservices",
          subTab: "tech",
          icon: "Laptop"
        },
        {
          id: "ms_kd_exchange",
          title: "Knowledge Exchange",
          description: "Collaborate on core technical concepts.",
          linkText: "Click to Enter",
          tab: "microservices",
          subTab: "social",
          icon: "Compass"
        },
        {
          id: "ms_social",
          title: "Social Engagement",
          description: "Engage with track peer updates.",
          linkText: "Click to Enter",
          tab: "microservices",
          subTab: "social",
          icon: "Users"
        },
        {
          id: "ms_influence",
          title: "Social Influence",
          description: "Promote tech insights on public forums.",
          linkText: "Click to Enter",
          tab: "microservices",
          subTab: "social",
          icon: "Target"
        },
        {
          id: "ms_events",
          title: "External Events",
          description: "Hackathons, webinars and open meetups.",
          linkText: "Click to Enter",
          tab: "microservices",
          subTab: "social",
          icon: "Calendar"
        }
      ],
      careerPathways: {
        foundation: [
          { title: "Onboarding Profiling", description: "Capturing education demographics and choosing tech fields." },
          { title: "Track Assessment Check", description: "Scoring >= 50% on hard/soft skill checks to proceed." },
          { title: "Compliance Briefing", description: "Watching orientation stream files and signing agreement sheets." }
        ],
        trackSplit: [
          { title: "8-Module Microservices", description: "Managing KD checkins, sharing news, writing 100-word daily briefs." },
          { title: "Weekly Drills Homework", description: "Submitting real-world homework solutions on public GitHub repos." },
          { title: "Team sync scrums", description: "Assigned to client projects (e.g. eMigr8) with Jitsi integration." }
        ],
        lateralRoles: [
          { title: "Public Artifact Loggers", description: "Authoring Medium articles, and organizing tech hackathons." },
          { title: "Career Mentoring", description: "Personalised mock evaluations and interview rehearsals." },
          { title: "Global Client Placement", description: "Attracting high-paying remote roles in the UK, Europe, or USA." }
        ]
      }
    }
  ]
};

export async function seedDatabase(force = false) {
  try {
    const batch = writeBatch(db);
    let needsCommit = false;

    if (force) {
      console.log("Forcing full seed of database...");
      for (const meta of SEED_DATA.metadata) {
        batch.set(doc(db, "metadata", meta.id), meta);
      }
      for (const proj of SEED_DATA.projects) {
        batch.set(doc(db, "projects", proj.id), proj);
      }
      for (const meet of SEED_DATA.meetings) {
        batch.set(doc(db, "meetings", meet.id), meet);
      }
      for (const drill of SEED_DATA.weeklyDrills) {
        batch.set(doc(db, "weeklyDrills", drill.id), drill);
      }
      needsCommit = true;
    } else {
      try {
        // Incremental checks to ensure empty databases are filled seamlessly without data loss
        const appConfigDoc = await getDoc(doc(db, "metadata", "app_config"));
        if (!appConfigDoc.exists()) {
          console.log("Seeding app_config metadata...");
          for (const meta of SEED_DATA.metadata) {
            batch.set(doc(db, "metadata", meta.id), meta);
          }
          needsCommit = true;
        }

        const projectsSnap = await getDocs(collection(db, "projects"));
        if (projectsSnap.empty) {
          console.log("Seeding default projects...");
          for (const proj of SEED_DATA.projects) {
            batch.set(doc(db, "projects", proj.id), proj);
          }
          needsCommit = true;
        }

        const meetingsSnap = await getDocs(collection(db, "meetings"));
        if (meetingsSnap.empty) {
          console.log("Seeding default meetings...");
          for (const meet of SEED_DATA.meetings) {
            batch.set(doc(db, "meetings", meet.id), meet);
          }
          needsCommit = true;
        }

        const drillsSnap = await getDocs(collection(db, "weeklyDrills"));
        if (drillsSnap.empty) {
          console.log("Seeding default weeklyDrills...");
          for (const drill of SEED_DATA.weeklyDrills) {
            batch.set(doc(db, "weeklyDrills", drill.id), drill);
          }
          needsCommit = true;
        }
      } catch (err: any) {
        const isOffline = err?.message?.toLowerCase().includes("offline") || err?.code === "unavailable";
        if (isOffline) {
          console.warn("Firestore is currently offline. Skipping auto-seeding until online connection is established: " + err.message);
          return false;
        }
        throw err;
      }
    }

    if (needsCommit) {
      await batch.commit();
      console.log("Database seed write complete.");
      return true;
    }

    console.log("All default data already seeded. Skipping...");
    return false;
  } catch (error: any) {
    const isOffline = error?.message?.toLowerCase().includes("offline") || error?.code === "unavailable";
    if (isOffline) {
      console.warn("Firestore is offline. Seeding skipped or postponed: " + error.message);
      return false;
    }
    console.error("Error seeding database:", error);
    throw error;
  }
}

export async function purgeDatabase(currentAdminUid?: string) {
  const collectionsToClear = [
    "meetings",
    "weeklyDrills",
    "projects",
    "meetingAssignments",
    "meetingHistory",
    "attendance",
    "standups",
    "personalDevelopment",
    "techUpdates",
    "socialLogs",
    "dailyReports",
    "reminders",
    "attendanceAuditLogs",
    "drillSubmissions"
  ];

  try {
    console.log("Purging all mock and transaction data from Firestore...");
    
    // Clear all standard transaction/mock collections
    for (const colName of collectionsToClear) {
      const snapshot = await getDocs(collection(db, colName));
      if (!snapshot.empty) {
        let batch = writeBatch(db);
        let count = 0;
        for (const d of snapshot.docs) {
          batch.delete(doc(db, colName, d.id));
          count++;
          if (count === 400) {
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

    // Handle profiles specifically (delete all non-admin profiles)
    const profilesSnapshot = await getDocs(collection(db, "profiles"));
    if (!profilesSnapshot.empty) {
      let batch = writeBatch(db);
      let count = 0;
      for (const d of profilesSnapshot.docs) {
        const data = d.data();
        const isAdmin = data.role === "admin" || d.id === currentAdminUid || ["stuncharles@gmail.com", "hadekunleabdulwally@gmail.com", "oluwatosinayinde.bincom@gmail.com"].includes((data.email || "").trim().toLowerCase());
        if (!isAdmin) {
          batch.delete(doc(db, "profiles", d.id));
          count++;
          if (count === 400) {
            await batch.commit();
            batch = writeBatch(db);
            count = 0;
          }
        }
      }
      if (count > 0) {
        await batch.commit();
      }
    }

    // Re-seed system metadata configuration
    const batch = writeBatch(db);
    for (const meta of SEED_DATA.metadata) {
      batch.set(doc(db, "metadata", meta.id), meta);
    }
    await batch.commit();

    console.log("Database successfully purged of all seeded mock data!");
    return true;
  } catch (error) {
    console.error("Error purging database:", error);
    throw error;
  }
}
