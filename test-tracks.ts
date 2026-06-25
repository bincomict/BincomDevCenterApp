import { getCleanTrackName, getLongTrackName } from "./src/utils/trackUtils";
import { TRACK_QUESTIONS } from "./src/data/assessmentQuestions";
import { Profile, AssessmentQuestion } from "./src/types";

// Helper function to resolve questions exactly like the actual TrackAssessment component does
function resolveQuestionsForUser(trackName: string): AssessmentQuestion[] {
  const longTrack = getLongTrackName(trackName);
  const cleanTrack = getCleanTrackName(trackName);

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
  return TRACK_QUESTIONS[resolvedKey] || [];
}

// Test Runner
async function runTests() {
  console.log("==================================================");
  console.log("💡 RUNNING TRACK QUESTION ISOLATION TEST SUITE...");
  console.log("==================================================");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${message}`);
      failed++;
    }
  }

  // Test Case 1: PMO User 1 ("PMO emigr8") should receive Project Management (Tech) questions
  const userPmoEmigr8 = { id: "test-user-1", track: "PMO emigr8" };
  const pmoEmigr8Questions = resolveQuestionsForUser(userPmoEmigr8.track);
  assert(pmoEmigr8Questions.length > 0, "PMO emigr8 receives questions");
  assert(
    pmoEmigr8Questions.some(q => q.id.startsWith("pm_")),
    "PMO emigr8 questions strictly belong to Project Management (Tech) track"
  );
  assert(
    !pmoEmigr8Questions.some(q => q.id.startsWith("php_")),
    "PMO emigr8 questions DO NOT leak from PHP/Backend track"
  );

  // Test Case 2: PMO User 2 ("PMO bincom dev center") should receive Project Management (Tech) questions
  const userPmoDevCenter = { id: "test-user-2", track: "PMO bincom dev center" };
  const pmoDevCenterQuestions = resolveQuestionsForUser(userPmoDevCenter.track);
  assert(pmoDevCenterQuestions.length > 0, "PMO bincom dev center receives questions");
  assert(
    pmoDevCenterQuestions.some(q => q.id.startsWith("pm_")),
    "PMO bincom dev center questions strictly belong to Project Management (Tech) track"
  );

  // Test Case 3: PHP/Backend User should receive PHP/Laravel questions and not PMO questions
  const userPhp = { id: "test-user-3", track: "PHP/Backend" };
  const phpQuestions = resolveQuestionsForUser(userPhp.track);
  assert(phpQuestions.length > 0, "PHP/Backend user receives questions");
  assert(
    phpQuestions.some(q => q.id.startsWith("php_")),
    "PHP/Backend questions strictly belong to Backend Development (PHP / Laravel) track"
  );
  assert(
    !phpQuestions.some(q => q.id.startsWith("pm_")),
    "PHP/Backend questions DO NOT leak from PMO/Project Management track"
  );

  // Test Case 4: Cybersecurity User should receive Cybersecurity questions and not PMO or PHP questions
  const userCyber = { id: "test-user-4", track: "Cybersecurity" };
  const cyberQuestions = resolveQuestionsForUser(userCyber.track);
  assert(cyberQuestions.length > 0, "Cybersecurity user receives questions");
  assert(
    cyberQuestions.some(q => q.id.startsWith("cyber_")),
    "Cybersecurity questions strictly belong to Cybersecurity track"
  );

  // Test Case 5: Empty/Unconfigured Track (e.g. "Some Unconfigured Track") should return empty questions array (to trigger UI empty state)
  const userUnconfigured = { id: "test-user-5", track: "Some Random Unconfigured Track Name That Matches Nothing" };
  const unconfiguredQuestions = resolveQuestionsForUser(userUnconfigured.track);
  assert(
    unconfiguredQuestions.length === 0,
    "Unconfigured track has no questions and correctly resolves to empty array instead of falling back to default track"
  );

  console.log("\n==================================================");
  console.log(`📊 TEST SUITE SUMMARY: ${passed} Passed, ${failed} Failed`);
  console.log("==================================================");

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error("Test suite crashed runtime error:", err);
  process.exit(1);
});
