import React from "react";
import { Profile } from "../types";
import { Compass, ShieldAlert, LogOut } from "lucide-react";

interface TopNavProps {
  profile: Profile;
  onLogout: () => Promise<void>;
  showOnboardingForm?: boolean;
  showAssessmentGrid?: boolean;
  showOrientationGate?: boolean;
}

export default function TopNav({
  profile,
  onLogout,
  showOnboardingForm = false,
  showAssessmentGrid = false,
  showOrientationGate = false,
}: TopNavProps) {
  return (
    <header className="bg-white border-b border-gray-100 py-3.5 px-4 sm:px-6 sticky top-0 z-30 shadow-2xs" id="central-hub-header">
      <div className="w-full flex items-center justify-between gap-4">
        
        {/* Brand Logo and Active track badges */}
        <div className="flex items-center gap-3">
          <div className="font-extrabold tracking-tight text-gray-900 text-lg">
            Bincom <span className="text-[#4B5E40] font-sans">Dev Center</span>
          </div>
          
          {profile.track && profile.track !== "All" && (
            <span className="hidden md:inline-flex items-center gap-1 text-[10.5px] font-bold bg-[#4B5E40]/10 text-[#4B5E40] py-0.5 px-2.5 rounded-full border border-[#4B5E40]/10">
              <Compass className="w-3.5 h-3.5" /> Assigned Track: {profile.track.split(" ")[0]}
            </span>
          )}

          {profile.role === "admin" && (
            <span className="hidden md:inline-flex items-center gap-1 text-[10.5px] font-bold bg-indigo-50 text-indigo-700 py-0.5 px-2.5 rounded-full border border-indigo-150">
              <ShieldAlert className="w-3.5 h-3.5" /> Mentor / Board Auditor
            </span>
          )}
        </div>

        {/* Action Tools & User Panel info */}
        <div className="flex items-center gap-4">
          {(profile.role === "admin" || (!showOnboardingForm && !showAssessmentGrid && !showOrientationGate)) && (
            <span className="text-xs text-gray-500 hidden sm:inline">
              Welcome, <strong className="text-gray-900">{profile.fullName}</strong>
            </span>
          )}

          <button
            id="platform-logout-btn"
            onClick={onLogout}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-550 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-100 transition duration-150 cursor-pointer text-center font-medium"
          >
            <LogOut className="w-3.5 h-3.5" /> Logout
          </button>
        </div>
      </div>
    </header>
  );
}
