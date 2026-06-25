import React from "react";
import { ProjectDescriptor, Profile } from "../types";
import { FolderGit, GitBranch, ShieldCheck, Users, Link, ExternalLink, Calendar } from "lucide-react";

interface ProjectsTrackerProps {
  projects: ProjectDescriptor[];
  profiles: Profile[];
  onJoinMeeting: (meetingId: string) => void;
}

export default function ProjectsTracker({ projects, profiles, onJoinMeeting }: ProjectsTrackerProps) {
  // Find profiles matching project members
  const getMemberDetails = (usernames: string[]) => {
    return profiles.filter((p) => usernames.map(u => u.toLowerCase()).includes(p.username.toLowerCase()));
  };

  return (
    <div className="space-y-6" id="projects-tracker-root">
      
      {/* Visual Title */}
      <div className="border-b border-gray-200 pb-3">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-1.5 leading-normal">
          <FolderGit className="w-5 h-5 text-[#4B5E40]" /> Organizational Projects repository
        </h2>
        <p className="text-xs text-gray-500 mt-1">
          Explore centralized product repositories and join assigned developer squads. Project align meetings populate daily sync calendars.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {projects.map((proj) => {
          const assignedDetails = getMemberDetails(proj.members);
          return (
            <div 
              key={proj.id} 
              id={`proj-card-${proj.id}`}
              className="bg-white rounded-2xl border border-gray-150 p-5 shadow-xs flex flex-col justify-between hover:border-[#4B5E40]/30 hover:shadow-sm transition"
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <h3 className="font-extrabold text-sm sm:text-base text-gray-900 leading-tight">{proj.name}</h3>
                    {proj.githubUrl && (
                      <a 
                        id={`proj-github-${proj.id}`}
                        href={proj.githubUrl} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="text-[10.5px] text-[#4B5E40] font-mono hover:underline inline-flex items-center gap-0.5"
                      >
                        <GitBranch className="w-3 h-3 text-[#4B5E40]" /> Github repo <ExternalLink className="w-2.5 h-2.5 text-[#4B5E40]" />
                      </a>
                    )}
                  </div>

                  <span className={`text-[9px] uppercase font-mono font-bold px-2.5 py-0.5 rounded-full ${
                    proj.status === "Active" 
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-100" 
                      : "bg-amber-50 text-amber-800 border border-amber-100"
                  }`}>
                    {proj.status === "Active" ? "Active build" : "On Hold"}
                  </span>
                </div>

                <p className="text-xs text-gray-500 leading-relaxed font-sans">{proj.description}</p>

                {/* Squad Members */}
                <div className="space-y-2">
                  <span className="block text-[10px] font-bold uppercase text-gray-400 flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-gray-400" /> assigned developer squad ({proj.members.length})
                  </span>
                  
                  <div className="flex flex-wrap gap-1.5" id={`squad-box-${proj.id}`}>
                    {assignedDetails.length === 0 ? (
                      <em className="text-[10px] text-gray-400">No students assigned.</em>
                    ) : (
                      assignedDetails.map((member) => (
                        <div 
                          key={member.id} 
                          className="inline-flex items-center gap-1 bg-[#F8FAF8] border border-gray-200 py-1 px-2 rounded-lg text-xs"
                          title={member.fullName}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-[#4B5E40]"></span>
                          <span className="font-semibold text-gray-800 font-mono text-[10px]">@{member.username}</span>
                          <span className="text-[9px] text-gray-400 font-sans">({member.track.split(" ")[0]})</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Sync Meetings within project */}
              <div className="mt-5 pt-4 border-t border-gray-100 space-y-2.5">
                <span className="block text-[10px] font-bold uppercase text-[#4B5E40] flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-[#4B5E40]" /> Synchronized Team sync calendars
                </span>

                {proj.meetings.length === 0 ? (
                  <p className="text-[11px] text-gray-400 italic">No custom scrum meetings currently locked for this project.</p>
                ) : (
                  <div className="space-y-2">
                    {proj.meetings.map((meet) => (
                      <div 
                        key={meet.id} 
                        className="p-2.5 bg-gray-50 rounded-lg border border-gray-150 flex items-center justify-between gap-3 text-xs"
                      >
                        <div>
                          <p className="font-bold text-gray-900 leading-none">{meet.title}</p>
                          <span className="text-[10px] text-gray-500 block font-mono mt-0.5">Schedules: {meet.time} WAT</span>
                        </div>
                        <button
                          id={`proj-join-sync-btn-${meet.id}`}
                          onClick={() => {
                            window.open(meet.jitsiUrl, "_blank", "noopener,noreferrer");
                            onJoinMeeting(meet.id);
                          }}
                          className="px-3 py-1 bg-[#4B5E40] hover:bg-[#3d4d34] text-white text-[10px] font-bold rounded-md cursor-pointer inline-flex items-center gap-0.5 shrink-0"
                        >
                          Join Sync <ExternalLink className="w-3 h-3 text-white" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
