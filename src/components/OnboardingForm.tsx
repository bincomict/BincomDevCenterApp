import React, { useState } from "react";
import { Profile } from "../types";

interface OnboardingFormProps {
  profile: Profile;
  onUpdateSuccess: (updated: Profile) => void;
  onNavigateToAssessment: () => void;
}

// Convert radio track options to backend technical tracks for assessment matching
const mapTrackToBackendTrack = (optionValue: string): string => {
  return optionValue;
};

export default function OnboardingForm({ profile, onUpdateSuccess, onNavigateToAssessment }: OnboardingFormProps) {
  const [fullName, setFullName] = useState("");
  const [education, setEducation] = useState("");
  const [occupation, setOccupation] = useState("");
  const [experience, setExperience] = useState("");
  const [track, setTrack] = useState("");
  const [learningLevel, setLearningLevel] = useState("");
  const [prevCourse, setPrevCourse] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError("");
    setSuccess("");

    if (!fullName.trim()) {
      setError("Please fill in your Full Name.");
      setLoading(false);
      return;
    }
    if (!education) {
      setError("Please select your highest level of education.");
      setLoading(false);
      return;
    }
    if (!occupation) {
      setError("Please select your current occupation & role.");
      setLoading(false);
      return;
    }
    if (!experience) {
      setError("Please select your years of experience in tech.");
      setLoading(false);
      return;
    }
    if (!track) {
      setError("Please select your desired knowledge track.");
      setLoading(false);
      return;
    }
    if (!learningLevel) {
      setError("Please select your learning level.");
      setLoading(false);
      return;
    }
    if (!prevCourse) {
      setError("Please declare whether you completed a previous course.");
      setLoading(false);
      return;
    }

    const mappedBackendTrack = mapTrackToBackendTrack(track);

    try {
      const res = await fetch("/api/profile/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: profile.id,
          fullName: fullName,
          education: education,
          occupation: occupation,
          techExperience: experience,
          track: mappedBackendTrack,
          learningLevel: learningLevel,
          previousCourseCompleted: prevCourse === "Yes"
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit onboarding credentials");

      setSuccess("Onboarding parameters successfully matched!");
      
      setTimeout(() => {
        onUpdateSuccess(data.profile);
      }, 150);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred while saving your onboarding details.");
    } finally {
      setLoading(false);
    }
  };

  const TRACKS_OPTIONS = [
    "PMO emigr8",
    "PMO bincom dev center",
    "PMO bincom global/bincom ict",
    "Cybersecurity",
    "PHP/Backend",
    "Infrastructure/DevOps",
    "Graphics/UI/UX Design",
    "Digital Marketing",
    "Python/Data Science",
    "Mobile App / Frontend Development",
    "C#",
    "Proservices"
  ];

  const LEVELS_OPTIONS = [
    "Apprentice level 1",
    "Apprentice level 2",
    "Apprentice level 3",
    "Volunteer beginner level",
    "Volunteer intermediate level",
    "Junior associate level 1",
    "Junior associate level 2",
    "Junior associate level 3",
    "Senior associate level 1",
    "Senior associate level 2",
    "Senior associate level 3",
    "Mentor",
    "Admin",
    "Intern",
    "Trainee Level 1",
    "Trainee Level 2",
    "Trainee Level 3",
    "Global Techie 0",
    "Global Techie 1",
    "Global Techie 2",
    "Global Techie 3"
  ];

  return (
    <div className="max-w-[620px] mx-auto my-6 bg-white rounded-xl shadow-xs border border-gray-100 overflow-hidden" id="onboarding-form-card">
      
      {/* Header section consistent with visual layouts */}
      <div className="p-6 pb-4 text-center border-b border-gray-100" id="onboarding-form-header">
        <h1 className="text-xl font-bold text-gray-800 tracking-tight" id="onboarding-title">
          Onboarding Form
        </h1>
        <p className="text-[11px] text-gray-400 mt-1 font-medium leading-relaxed" id="onboarding-subtitle">
          Please complete the following information to begin your journey with Bincom Dev Center
        </p>
      </div>

      <div className="p-6 sm:p-8 pt-4">
        {error && (
          <div className="p-3 bg-rose-50 text-rose-800 text-xs rounded-lg mb-5 border border-rose-100/50 font-medium" id="onboard-error-log">
            {error}
          </div>
        )}

        {success && (
          <div className="p-3 bg-[#4B5E40]/10 text-[#4B5E40] text-xs rounded-lg mb-5 border border-[#4B5E40]/10 font-bold" id="onboard-success-log">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6" id="onboarding-aligned-form">
          
          {/* SECTION 1: Personal Background */}
          <div className="space-y-4">
            <div className="border-b border-gray-100 pb-1.5 mt-2">
              <h2 className="text-[12px] font-bold text-gray-800 uppercase tracking-wider">
                Personal Background
              </h2>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-700 mb-1.5" htmlFor="full-name">
                Full Name
              </label>
              <input
                id="full-name"
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your full name"
                className="w-full px-3 py-2 text-xs bg-[#EAECE6]/40 rounded border border-transparent focus:outline-none focus:bg-white focus:border-[#4B5E40] text-gray-800 font-medium transition"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-700 mb-1.5" htmlFor="education-level">
                Highest Level of Education
              </label>
              <select
                id="education-level"
                value={education}
                onChange={(e) => setEducation(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-[#EAECE6]/40 rounded border border-transparent focus:outline-none focus:bg-white focus:border-[#4B5E40] text-gray-700 font-medium transition cursor-pointer"
              >
                <option value="">Select education level</option>
                <option value="High School">High School</option>
                <option value="Associate Degree">Associate Degree</option>
                <option value="Bachelor's Degree">Bachelor's Degree</option>
                <option value="Master's Degree">Master's Degree</option>
                <option value="PhD">PhD</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-700 mb-1.5" htmlFor="occupation-select">
                Current Occupation & Role
              </label>
              <select
                id="occupation-select"
                value={occupation}
                onChange={(e) => setOccupation(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-[#EAECE6]/40 rounded border border-transparent focus:outline-none focus:bg-white focus:border-[#4B5E40] text-gray-700 font-medium transition cursor-pointer"
              >
                <option value="">Select occupation</option>
                <option value="Student">Student</option>
                <option value="Employed">Employed</option>
                <option value="Freelancer">Freelancer</option>
                <option value="Unemployed">Unemployed</option>
                <option value="Entrepreneur">Entrepreneur</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-700 mb-1.5" htmlFor="experience-select">
                Years of Experience in Tech
              </label>
              <select
                id="experience-select"
                value={experience}
                onChange={(e) => setExperience(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-[#EAECE6]/40 rounded border border-transparent focus:outline-none focus:bg-white focus:border-[#4B5E40] text-gray-700 font-medium transition cursor-pointer"
              >
                <option value="">Select experience</option>
                <option value="No experience">No experience</option>
                <option value="1-2 years">1-2 years</option>
                <option value="3-5 years">3-5 years</option>
                <option value="5+ years">5+ years</option>
              </select>
            </div>
          </div>

          {/* SECTION 2: Knowledge Track Selection */}
          <div className="space-y-3">
            <div className="border-b border-gray-100 pb-1.5 mt-2">
              <h2 className="text-[12px] font-bold text-gray-800 uppercase tracking-wider">
                Knowledge Track Selection
              </h2>
            </div>

            <div>
              <span className="block text-[11px] font-bold text-gray-500 mb-2">
                Select your desired knowledge track
              </span>
              <div className="space-y-2.5 max-h-56 overflow-y-auto pr-2" id="track-radio-group">
                {TRACKS_OPTIONS.map((tOpt) => (
                  <label key={tOpt} className="flex items-center gap-2.5 text-xs text-gray-750 font-medium cursor-pointer py-0.5 select-none hover:text-gray-900 transition">
                    <input
                      type="radio"
                      name="knowledge-track"
                      value={tOpt}
                      checked={track === tOpt}
                      onChange={() => setTrack(tOpt)}
                      className="w-3.5 h-3.5 accent-[#4B5E40]"
                    />
                    {tOpt}
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* SECTION 3: Learning Level */}
          <div className="space-y-3">
            <div className="border-b border-gray-100 pb-1.5 mt-2">
              <h2 className="text-[12px] font-bold text-gray-800 uppercase tracking-wider">
                Learning Level
              </h2>
            </div>

            <div>
              <span className="block text-[11px] font-bold text-gray-500 mb-2">
                Select your current level
              </span>
              <div className="space-y-2.5 max-h-64 overflow-y-auto pr-2" id="level-radio-group">
                {LEVELS_OPTIONS.map((lOpt) => (
                  <label key={lOpt} className="flex items-center gap-2.5 text-xs text-gray-750 font-medium cursor-pointer py-0.5 select-none hover:text-gray-900 transition">
                    <input
                      type="radio"
                      name="learning-level"
                      value={lOpt}
                      checked={learningLevel === lOpt}
                      onChange={() => setLearningLevel(lOpt)}
                      className="w-3.5 h-3.5 accent-[#4B5E40]"
                    />
                    {lOpt}
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* SECTION 4: Previous Experience */}
          <div className="space-y-3">
            <div className="border-b border-gray-100 pb-1.5 mt-2">
              <h2 className="text-[12px] font-bold text-gray-800 uppercase tracking-wider">
                Previous Experience
              </h2>
            </div>

            <div>
              <span className="block text-[11px] font-bold text-gray-500 mb-2.5">
                Have you completed any previous course in your desired track?
              </span>
              <div className="flex flex-col gap-2" id="prev-course-radio-group">
                {["Yes", "No"].map((option) => (
                  <label key={option} className="flex items-center gap-2.5 text-xs text-gray-750 font-medium cursor-pointer select-none hover:text-gray-900">
                    <input
                      type="radio"
                      name="previous-course"
                      value={option}
                      checked={prevCourse === option}
                      onChange={() => setPrevCourse(option)}
                      className="w-3.5 h-3.5 accent-[#4B5E40]"
                    />
                    {option}
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* SUBMIT BUTTON */}
          <div className="pt-2">
            <button
              id="onboard-submit-form-btn"
              type="submit"
              className="w-full py-2.5 bg-[#4B5E40] hover:bg-[#3d4d34] text-white font-bold text-xs rounded transition uppercase tracking-wider cursor-pointer text-center"
            >
              {loading ? "Saving Credentials..." : "Submit"}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
