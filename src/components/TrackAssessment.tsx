import React, { useState, useEffect } from "react";
import { Profile, AssessmentQuestion } from "../types";
import { TRACK_QUESTIONS, TECH_TRACKS } from "../data/assessmentQuestions";
import { getLongTrackName, getCleanTrackName } from "../utils/trackUtils";
import { 
  XSquare, 
  CheckCircle2, 
  ArrowLeft, 
  Play, 
  Pause, 
  Volume2, 
  HelpCircle, 
  Award,
  BookOpen,
  ArrowRight
} from "lucide-react";

interface TrackAssessmentProps {
  profile: Profile;
  onAssessmentCompleted: (updatedProfile: Profile) => void;
  onPivotTrack: (updatedProfile: Profile) => void;
}

export default function TrackAssessment({ profile, onAssessmentCompleted, onPivotTrack }: TrackAssessmentProps) {
  const dbTrackName = profile.track || "Frontend Development (React, Vue, HTML, CSS)";
  const longTrack = getLongTrackName(dbTrackName);
  const cleanTrack = getCleanTrackName(dbTrackName);

  // Smart normalized track mapping resolving to track questions safely without cross-track leakage
  let resolvedKey = longTrack;
  if (!TRACK_QUESTIONS[resolvedKey]) {
    const cleanLower = cleanTrack.toLowerCase();
    const longLower = longTrack.toLowerCase();

    if (cleanLower.includes("pmo") || longLower.includes("project management")) {
      resolvedKey = "Project Management (Tech)";
    } else if (cleanLower.includes("frontend") || cleanLower.includes("mobile") || longLower.includes("frontend")) {
      resolvedKey = "Frontend Development (React, Vue, HTML, CSS)";
    } else if (cleanLower.includes("php") || cleanLower.includes("laravel") || longLower.includes("php")) {
      resolvedKey = "Backend Development (PHP / Laravel)";
    } else if (cleanLower.includes("python") || longLower.includes("python")) {
      resolvedKey = "Backend Development (Python / Django)";
    } else if (cleanLower.includes("node") || longLower.includes("node")) {
      resolvedKey = "Backend Development (Node.js / Express)";
    } else if (cleanLower.includes("cyber") || longLower.includes("cyber")) {
      resolvedKey = "Cybersecurity";
    } else if (cleanLower.includes("devops") || cleanLower.includes("infrastructure") || longLower.includes("devops")) {
      resolvedKey = "DevOps & Cloud Engineering";
    } else if (cleanLower.includes("design") || cleanLower.includes("ui") || cleanLower.includes("ux") || longLower.includes("design")) {
      resolvedKey = "UI/UX Design";
    } else if (cleanLower.includes("qa") || cleanLower.includes("testing") || cleanLower.includes("proservices") || longLower.includes("qa")) {
      resolvedKey = "QA Testing & Automation";
    } else if (cleanLower.includes("marketing") || longLower.includes("marketing")) {
      resolvedKey = "Digital Marketing";
    } else if (cleanLower.includes("c#") || longLower.includes("c-sharp")) {
      resolvedKey = "C# Backend Development";
    }
  }

  // Strictly assign questions mapping to actual track - no random cross-track leakage. If no questions exist, we fall back to an empty array.
  const questions: AssessmentQuestion[] = TRACK_QUESTIONS[resolvedKey] || [];

  // Selected option indices
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Consent checkbox & interactive video states for Passed Congratulations Orientation section
  const [orientationConsent, setOrientationConsent] = useState(false);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [videoProgress, setVideoProgress] = useState(20); // starts at 20%
  const [videoWatched85, setVideoWatched85] = useState(false);
  const [isClearingOrientation, setIsClearingOrientation] = useState(false);

  // Video timer effect
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (videoPlaying) {
      timer = setInterval(() => {
        setVideoProgress((prev) => {
          if (prev >= 100) {
            setVideoPlaying(false);
            setVideoWatched85(true);
            return 100;
          }
          const next = prev + 5;
          if (next >= 85) {
            setVideoWatched85(true);
          }
          return next;
        });
      }, 400); // increments fast for premium interactive feel
    }
    return () => clearInterval(timer);
  }, [videoPlaying]);

  const handleSelectOption = (questionId: string, optionIndex: number) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: optionIndex
    }));
  };

  const handleBackToOnboarding = async () => {
    try {
      const response = await fetch("/api/profile/reset-to-onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: profile.id })
      });
      const data = await response.json();
      if (response.ok) {
        onPivotTrack(data.profile);
      } else {
        setError(data.error || "Failed to reset onboarding stage.");
      }
    } catch (err) {
      console.error(err);
      setError("An error occurred while resetting.");
    }
  };

  const handleSubmitScore = async () => {
    if (Object.keys(answers).length < questions.length) {
      alert(`Please answer all questions before submitting. You have answered ${Object.keys(answers).length} out of ${questions.length} questions.`);
      return;
    }

    setIsSubmitting(true);
    let correctCount = 0;
    questions.forEach((q) => {
      if (answers[q.id] === q.correctAnswerIndex) {
        correctCount++;
      }
    });

    const scorePercentage = Math.round((correctCount / questions.length) * 100);

    try {
      const response = await fetch("/api/profile/submit-assessment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: profile.id,
          scorePercentage
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to submit score.");

      onAssessmentCompleted(data.profile);
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Could not process assessment scores.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetake = async () => {
    try {
      const response = await fetch("/api/profile/retake-assessment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: profile.id
        })
      });
      const data = await response.json();
      if (response.ok) {
        setAnswers({});
        onPivotTrack(data.profile);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleProceedToDashboard = async () => {
    if (!orientationConsent) return;
    setIsClearingOrientation(true);

    try {
      const response = await fetch("/api/profile/clear-orientation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: profile.id })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      // Successfully cleared orientation!
      onAssessmentCompleted(data.profile);
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to confirm orientation compliance.");
    } finally {
      setIsClearingOrientation(false);
    }
  };

  // Check state directly
  const hasPassed = profile.status === "assessment_passed" || (profile.score !== undefined && profile.score >= 70);
  const showReviewUi = profile.status === "assessment_failed" && profile.score !== undefined;

  return (
    <div className="max-w-2xl mx-auto my-6 px-4 sm:px-0" id="assessment-main-container">
      
      {/* 1. RENDER FAIL VIEW (IMAGE 1 SPEC) */}
      {showReviewUi && (
        <div className="flex items-center justify-center min-h-[450px]">
          <div className="bg-white rounded-xl border border-rose-100 p-8 sm:p-10 shadow-xs max-w-lg w-full text-center space-y-6" id="fail-view-card">
            
            {/* Red circle Cross icon matches mockup perfectly */}
            <div className="flex justify-center">
              <div className="w-12 h-12 rounded-full border border-rose-200 bg-rose-50 flex items-center justify-center">
                <span className="text-rose-500 font-bold text-xl">✕</span>
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-[20px] font-bold text-gray-800 tracking-tight">
                Assessment Not Passed
              </h2>
              <p className="text-[12.5px] text-gray-500 leading-relaxed font-medium">
                Sorry, you did not meet the minimum requirements for the <strong className="text-gray-800">{cleanTrack}</strong> track.
              </p>
              <p className="text-[12px] text-gray-400 font-semibold italic">
                We recommend you do one of the following:
              </p>
            </div>

            <div className="space-y-2.5 pt-2">
              {/* Button A: Retake Assessment */}
              <button
                id="fail-action-retake-btn"
                onClick={handleRetake}
                className="w-full py-2.5 bg-[#4B5E40] hover:bg-[#3d4d34] text-white font-bold text-xs rounded transition uppercase tracking-wider cursor-pointer"
              >
                Retake Assessment
              </button>

              {/* Button B: Pivot to New Knowledge Track */}
              <button
                id="fail-action-onboarding-btn"
                onClick={handleBackToOnboarding}
                className="w-full py-2.5 bg-[#F4F5F2] hover:bg-[#EAECE6] text-gray-700 font-bold text-xs rounded border border-gray-200 transition uppercase tracking-wider cursor-pointer"
              >
                Choose a New Knowledge Track
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. RENDER SUCCESS PASS CONGRATS SCREEN (IMAGE 2 SPEC) */}
      {hasPassed && (
        <div className="space-y-6" id="pass-view-container">
          
          {/* Congrats banner card */}
          <div className="bg-white rounded-xl border border-emerald-100 p-8 sm:p-10 shadow-xs text-center space-y-4" id="congrats-status-card">
            
            {/* Green circle checkmark icon matches mockup perfectly */}
            <div className="flex justify-center">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-500 border border-emerald-200 flex items-center justify-center">
                <span className="text-xl font-bold">✓</span>
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-[22px] font-extrabold text-gray-800 tracking-tight">
                Congratulations! 🎉
              </h2>
              <p className="text-[12.5px] text-gray-500 font-medium">
                You've passed the <span className="text-emerald-600 font-bold">{cleanTrack}</span> basic assessment.
              </p>
              
              <div className="py-1">
                <span className="inline-block bg-emerald-50 border border-emerald-100 text-emerald-700 font-mono text-sm uppercase px-4 py-1 rounded font-bold">
                  Score: <strong className="text-emerald-600 font-extrabold">{profile.score || 100}%</strong>
                </span>
              </div>
              
              <p className="text-[12px] text-gray-400 font-medium">
                You have now been placed in the <strong className="text-gray-700">{cleanTrack}</strong> knowledge track.
              </p>
            </div>
          </div>

          {/* Orientation media verification block nested directly underneath */}
          <div className="bg-white rounded-xl border border-gray-100 p-6 sm:p-8 space-y-6 shadow-xs" id="congrats-orientation-card">
            
            <div className="border-b border-gray-100 pb-3">
              <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-[#4B5E40]" /> Complete Your Orientation
              </h3>
            </div>

            {/* Video Container & Conduct Sandbox */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Orientation Video */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-gray-500 uppercase flex items-center gap-1">
                  📹 Orientation Video
                </span>
                <div className="aspect-video bg-gray-50 rounded-lg border border-gray-200 p-3.5 flex flex-col justify-between relative overflow-hidden" id="orientation-pass-video-box">
                  
                  {/* Central branding metadata */}
                  <div className="my-auto text-center space-y-1 z-10">
                    <div className="w-9 h-9 rounded-full bg-[#4B5E40]/10 border border-[#4B5E40]/20 flex items-center justify-center mx-auto text-[#4B5E40]">
                      <Volume2 className="w-4 h-4" />
                    </div>
                    <h5 className="text-[10.5px] font-bold text-gray-700">Bincom Ecosystem Briefing</h5>
                    <p className="text-[9.5px] text-gray-400">Duration: 12 mins. Watched {Math.round(videoProgress)}%</p>
                  </div>

                  {/* Video actions overlay bar */}
                  <div className="w-full flex items-center gap-2 pt-2 z-10 border-t border-gray-100 bg-white/80 p-1.5 rounded">
                    <button
                      id="pass-video-play-btn"
                      type="button"
                      onClick={() => setVideoPlaying(!videoPlaying)}
                      className="w-5 h-5 rounded-full bg-[#4B5E40] text-white flex items-center justify-center hover:scale-105 transition"
                    >
                      {videoPlaying ? <Pause className="w-2.5 h-2.5" /> : <Play className="w-2.5 h-2.5 ml-0.5" />}
                    </button>
                    <div className="flex-1">
                      <div className="h-1 bg-gray-200 rounded-full w-full overflow-hidden">
                        <div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: `${videoProgress}%` }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Code of Conduct */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-gray-500 uppercase flex items-center gap-1">
                  📄 Code of Conduct
                </span>
                <div className="h-[120px] bg-gray-50 rounded-lg border border-gray-200 p-3 text-[9px] text-gray-500 overflow-y-auto space-y-2 leading-relaxed" id="orientation-pass-conduct-box">
                  <p className="font-bold text-gray-700 uppercase tracking-wider text-[9.5px]">Bincom Dev Center Handbook</p>
                  <p><b>1. Real-time Attendance:</b> Talents must mark daily attendance within the meetings hub before grace durations expire.</p>
                  <p><b>2. Accountability updates:</b> Standard project sync updates, standups text, and weekly drill items must be honest and verified.</p>
                  <p><b>3. Code Quality checks:</b> Mentors hold absolute auditing authority regarding compliance validations.</p>
                </div>
              </div>

            </div>

            {/* Acknowledgment & Proceed */}
            <div className="pt-4 border-t border-gray-100 space-y-4">
              <p className="text-[11px] text-amber-700 font-medium bg-amber-50 rounded p-2 border border-amber-100/50">
                ⚠️ Please watch at least 85% of the orientation video simulation to mark your onboarding gate as compliant.
              </p>

              <label className="flex items-start gap-2.5 text-[11.5px] font-medium text-gray-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  disabled={!videoWatched85}
                  checked={orientationConsent}
                  onChange={(e) => setOrientationConsent(e.target.checked)}
                  className="w-4 h-4 accent-[#4B5E40] mt-0.5"
                />
                <span>
                  I have watched the orientation video and read the Community Code of Conduct.
                </span>
              </label>

              <button
                id="onboard-proceed-dashboard-btn"
                onClick={handleProceedToDashboard}
                disabled={!orientationConsent || isClearingOrientation}
                className="w-full py-2.5 bg-[#4B5E40] hover:bg-[#3d4d34] disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed text-white font-bold text-xs rounded transition uppercase tracking-wider cursor-pointer text-center"
              >
                {isClearingOrientation ? "Securing Dashboard Entry..." : "Proceed to Dashboard"}
              </button>
            </div>

          </div>

        </div>
      )}

      {/* 3. ACTIVE QUIZ SHEETS SCREEN (IMAGE 3 SPEC) */}
      {!showReviewUi && !hasPassed && (
        questions.length === 0 ? (
          <div className="bg-white rounded-xl border border-amber-200 p-8 sm:p-10 shadow-xs text-center space-y-6" id="empty-questions-state">
            <div className="flex justify-center">
              <div className="w-12 h-12 rounded-full border border-amber-200 bg-amber-50 flex items-center justify-center">
                <span className="text-amber-500 font-bold text-xl">⚠️</span>
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-[20px] font-bold text-gray-800 tracking-tight">
                No Questions Available
              </h2>
              <p className="text-[12.5px] text-gray-500 leading-relaxed font-semibold">
                We currently do not have assessment questions configured for the <strong className="text-gray-800">{cleanTrack}</strong> track.
              </p>
              <p className="text-[12px] text-gray-400 font-medium">
                Please click below to go back and choose a different track.
              </p>
            </div>
            <div className="pt-2">
              <button
                id="empty-action-onboarding-btn"
                onClick={handleBackToOnboarding}
                className="w-full py-2.5 bg-[#4B5E40] hover:bg-[#3d4d34] text-white font-bold text-xs rounded transition uppercase tracking-wider cursor-pointer"
              >
                Choose a New Knowledge Track
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 p-6 sm:p-8 space-y-6 shadow-2xs" id="active-assessment-sheet">
            
            {/* Top Back navigation - implements direct "also create a navigation, to go back back to onboarding" requested constraint */}
            <div className="flex justify-between items-center pb-2 border-b border-gray-100">
              <button
                id="assessment-go-back-link"
                onClick={handleBackToOnboarding}
                className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#4B5E40] hover:text-[#3d4d34] transition cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Onboarding Form
              </button>
              <span className="text-[9.5px] font-mono text-gray-400 uppercase tracking-widest bg-gray-50 px-2 py-0.5 rounded border border-gray-150">
                8 Q-List Sheet
              </span>
            </div>

            {/* Form Header area matching Image 3 spec exactly */}
            <div className="space-y-1.5" id="assessment-sheet-header">
              <h1 className="text-lg font-bold text-gray-800 tracking-tight" id="assessment-sheet-title">
                Assessment for {cleanTrack}
              </h1>
              <p className="text-[11px] text-gray-400 font-medium" id="assessment-sheet-subtitle">
                Kindly answer these questions so we can place you in the right track
              </p>
            </div>

            {/* Display instructions validation error logs */}
            {error && (
              <div className="p-3 bg-rose-50 text-rose-800 text-xs rounded-lg border border-rose-100/50 font-medium">
                {error}
              </div>
            )}

            {/* Questions list styled perfectly after Image 3 */}
            <div className="space-y-6 pt-3" id="assessment-questions-block">
              {questions.map((q, qIndex) => {
                const questionNum = qIndex + 1;
                return (
                  <div key={q.id} className="py-4 border-b border-gray-100 last:border-0" id={`q-container-${q.id}`}>
                    
                    {/* Question header font weight/tracking */}
                    <div className="space-y-1">
                      <h3 className="font-bold text-gray-800 text-[12.5px] sm:text-[13px] leading-snug">
                        {questionNum}. {q.question}
                      </h3>
                    </div>

                    {/* Options layout centering unfilled circles exactly like mockups */}
                    <div className="mt-3.5 space-y-2">
                      {q.options.map((opt, oIndex) => {
                        const isSelected = answers[q.id] === oIndex;
                        return (
                          <button
                            key={oIndex}
                            id={`assessment-option-${q.id}-${oIndex}`}
                            type="button"
                            onClick={() => handleSelectOption(q.id, oIndex)}
                            className="w-full text-left py-1.5 px-1.5 transition text-xs sm:text-[12.5px] cursor-pointer flex items-center gap-3 hover:text-gray-900 group"
                          >
                            {/* Beautiful radio bullet circle styling */}
                            <span className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition ${
                              isSelected 
                                ? "border-[#4B5E40] bg-[#4B5E40]/10 text-[#4B5E40]" 
                                : "border-gray-300 bg-white group-hover:border-gray-450"
                            }`}>
                              {isSelected && (
                                <span className="w-1.5 h-1.5 rounded-full bg-[#4B5E40]"></span>
                              )}
                            </span>
                            
                            <span className={`font-semibold ${isSelected ? "text-[#4B5E40]" : "text-gray-600 group-hover:text-gray-800"}`}>
                              {opt}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                  </div>
                );
              })}
            </div>

            {/* Submit assessment button styled exactly like screenshot */}
            <div className="pt-4 border-t border-gray-100">
              <button
                id="assessment-submit-final-btn"
                type="button"
                onClick={handleSubmitScore}
                disabled={isSubmitting}
                className="w-full py-2.5 bg-[#4B5E40] hover:bg-[#3d4d34] disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white font-bold text-xs rounded transition uppercase tracking-wider cursor-pointer text-center shadow-xs"
              >
                {isSubmitting ? "Scoring Submissions..." : "Submit Assessment"}
              </button>
            </div>

          </div>
        )
      )}

    </div>
  );
}
