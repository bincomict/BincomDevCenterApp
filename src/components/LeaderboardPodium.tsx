import React from "react";
import { Profile, AttendanceRecord } from "../types";
import { Trophy, Medal, Star, ShieldCheck, Award } from "lucide-react";

interface LeaderboardPodiumProps {
  profiles: Profile[];
  attendance: AttendanceRecord[];
}

export default function LeaderboardPodium({ profiles, attendance }: LeaderboardPodiumProps) {
  // We calculate standard user completion rates.
  // The rate can be calculated as: (Number of Attended on time / Total attempts) * 100
  // Or since we have a preseed score, we can use a dynamic blend of:
  // (Preseed score + (Attended_count * 5) and cap it at 100%) to represent dynamic student interaction.
  // This makes the board highly reactive when they mark attendance!
  
  const studentProfiles = profiles.filter((p) => p.role === "user");

  const leaderboardData = studentProfiles.map((p) => {
    const userAtt = attendance.filter((a) => a.userId === p.id);
    const onTimeCount = userAtt.filter((a) => a.status === "Attended").length;
    const totalCount = userAtt.length;
    
    // Calculate Punctuality completion rate
    let completionRate = 0;
    if (totalCount === 0) {
      completionRate = p.score !== undefined ? p.score : 0;
    } else {
      const attendancePercent = (onTimeCount / totalCount) * 100;
      completionRate = Math.round(( (p.score || 50) + attendancePercent ) / 2);
    }
    
    // Always cap at 100%
    completionRate = Math.min(100, Math.max(0, completionRate));

    return {
      profile: p,
      score: completionRate,
      attended: onTimeCount,
      total: totalCount
    };
  }).sort((a, b) => b.score - a.score);

  // Take Top 3 for Podium
  const first = leaderboardData[0];
  const second = leaderboardData[1];
  const third = leaderboardData[2];

  // Rest for standard table
  const tableData = leaderboardData.slice(3);

  return (
    <div className="space-y-8" id="leaderboard-root">
      
      {/* Title */}
      <div className="border-b border-gray-200 pb-3">
        <h2 className="text-lg font-bold text-gray-900 flex items-[#4B5E40] items-center gap-1.5 leading-normal">
          <Trophy className="w-5 h-5 text-[#4B5E40]" /> High Accountability leaderboard
        </h2>
        <p className="text-xs text-gray-500 mt-1">
          Graded rankings are updated in real-time as standups, daily learning summaries, and punctuality times are audit-cleared by tech mentors.
        </p>
      </div>

      {/* 3-Tier Podium */}
      <div className="flex flex-col sm:flex-row items-end justify-center gap-4 sm:gap-6 pt-12 pb-6 max-w-2xl mx-auto" id="leaderboard-podium-block">
        
        {/* 2nd Place Pillar */}
        {second && (
          <div className="w-full sm:w-44 flex flex-col items-center order-2 sm:order-1" id="podium-pillar-2">
            <div className="text-center space-y-1 mb-2.5">
              <div className="w-10 h-10 rounded-full bg-slate-100 border-2 border-slate-300 flex items-center justify-center mx-auto shadow-sm">
                <Medal className="w-5.5 h-5.5 text-slate-400" />
              </div>
              <h4 className="font-bold text-gray-900 text-xs sm:text-sm block truncate max-w-[140px]">{second.profile.fullName}</h4>
              <span className="text-[10px] text-gray-500 block truncate max-w-[140px]">{second.profile.track.split(" ")[0]}</span>
            </div>
            
            <div className="w-full h-24 bg-slate-100 rounded-t-xl border border-slate-200 flex flex-col justify-center items-center p-3 text-center shadow-xs">
              <span className="font-mono text-xl font-extrabold text-slate-700">2nd</span>
              <span className="text-xs font-black text-slate-800 mt-1">{second.score}% rating</span>
              <span className="text-[9px] text-slate-500 font-mono mt-0.5">{second.attended}/{second.total} on-time</span>
            </div>
          </div>
        )}

        {/* 1st Place Pillar */}
        {first && (
          <div className="w-full sm:w-48 flex flex-col items-center order-1 sm:order-2 z-10 -mt-6" id="podium-pillar-1">
            <div className="text-center space-y-1 mb-2.5">
              <div className="w-12 h-12 rounded-full bg-amber-50 border-3 border-amber-400 flex items-center justify-center mx-auto shadow-md relative">
                <Trophy className="w-6.5 h-6.5 text-amber-500" />
                <Star className="w-4 h-4 text-amber-500 fill-amber-400 absolute -top-1.5 -right-1.5 animate-spin" />
              </div>
              <h4 className="font-black text-gray-900 text-sm sm:text-base block truncate max-w-[160px]">{first.profile.fullName}</h4>
              <span className="text-[10px] text-[#4B5E40] font-semibold block truncate max-w-[160px]">{first.profile.track.split(" ")[0]}</span>
            </div>
            
            <div className="w-full h-32 bg-[#4B5E40] rounded-t-xl border border-[#4B5E40]/90 flex flex-col justify-center items-center p-3 text-center shadow-md relative">
              <div className="absolute top-2.5 px-2 py-0.5 bg-emerald-600/40 text-[8px] font-bold tracking-wider text-emerald-100 rounded">TOP PERFORMER</div>
              <span className="font-mono text-2xl font-black text-white">1st</span>
              <span className="text-sm font-black text-emerald-100 mt-1">{first.score}% rating</span>
              <span className="text-[10px] text-emerald-200 font-mono mt-0.5">{first.attended}/{first.total} on-time</span>
            </div>
          </div>
        )}

        {/* 3rd Place Pillar */}
        {third && (
          <div className="w-full sm:w-44 flex flex-col items-center order-3 sm:order-3 animate-fade-in" id="podium-pillar-3">
            <div className="text-center space-y-1 mb-2.5">
              <div className="w-10 h-10 rounded-full bg-orange-50 border-2 border-orange-300 flex items-center justify-center mx-auto shadow-sm">
                <Award className="w-5.5 h-5.5 text-amber-700" />
              </div>
              <h4 className="font-bold text-gray-900 text-xs sm:text-sm block truncate max-w-[140px]">{third.profile.fullName}</h4>
              <span className="text-[10px] text-gray-500 block truncate max-w-[140px]">{third.profile.track.split(" ")[0]}</span>
            </div>
            
            <div className="w-full h-18 bg-orange-50 rounded-t-xl border border-orange-100 flex flex-col justify-center items-center p-3 text-center shadow-2xs">
              <span className="font-mono text-lg font-extrabold text-amber-800">3rd</span>
              <span className="text-xs font-black text-amber-900 mt-1">{third.score}% rating</span>
              <span className="text-[9px] text-amber-700 font-mono mt-0.5">{third.attended}/{third.total} on-time</span>
            </div>
          </div>
        )}
      </div>

      {/* Leadership Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-3xs overflow-x-auto" id="leaderboard-table-panel">
        <table className="w-full whitespace-no-wrap text-left text-xs text-gray-700 font-sans">
          <thead>
            <tr className="bg-[#F8FAF8] border-b border-gray-200 text-gray-500 uppercase tracking-wider text-[10px] font-bold">
              <th className="py-3 px-4 text-center font-mono w-14">Rank</th>
              <th className="py-3 px-4">Student Name</th>
              <th className="py-3 px-4">Registered Tech Track</th>
              <th className="py-3 px-4 text-center">Score rating</th>
              <th className="py-3 px-4 text-center">On-Time / total syncs</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-150">
            {leaderboardData.map((student, index) => {
              const rankNum = index + 1;
              return (
                <tr 
                  key={student.profile.id} 
                  id={`rank-row-${rankNum}`}
                  className="hover:bg-gray-50/50 transition"
                >
                  <td className="py-3 px-4 text-center font-mono font-bold font-sm text-gray-600">
                    {rankNum === 1 ? "🥇" : rankNum === 2 ? "🥈" : rankNum === 3 ? "🥉" : `#${rankNum}`}
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-semibold block text-gray-900">{student.profile.fullName}</span>
                    <span className="text-[10px] text-gray-400 font-mono">@{student.profile.username}</span>
                  </td>
                  <td className="py-3 px-4 font-semibold text-gray-600 max-w-sm truncate text-[#4B5E40]">
                    {student.profile.track}
                  </td>
                  <td className="py-3 px-4 text-center font-bold">
                    <span className={`inline-block px-2.5 py-0.5 rounded text-[11px] ${
                      student.score >= 80 ? "bg-emerald-50 text-emerald-800" : student.score >= 50 ? "bg-amber-50 text-amber-800" : "bg-rose-50 text-rose-800"
                    }`}>
                      {student.score}%
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center font-mono text-gray-500">
                    {student.attended} / {student.total}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
