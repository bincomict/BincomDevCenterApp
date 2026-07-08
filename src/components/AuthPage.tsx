import React, { useState } from "react";
import { LogIn, UserPlus, Eye, EyeOff, KeyRound, X, ShieldAlert, Sparkles } from "lucide-react";
import { Profile } from "../types";
import { loginUser, registerUser, adminBypassLogin } from "../firebaseService";

interface AuthPageProps {
  onAuthSuccess: (profile: Profile) => void;
  profiles: Profile[];
}

export default function AuthPage({ onAuthSuccess, profiles }: AuthPageProps) {
  const [isRegister, setIsRegister] = useState(false);
  const [identifier, setIdentifier] = useState(""); // login username/email
  const [loginPassword, setLoginPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Register state fields
  const [regUsername, setRegUsername] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false);

  // Recovery Modal state
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [recoverySent, setRecoverySent] = useState(false);

  // Status alerts
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError("");
    setSuccess("");

    if (!identifier) {
      setError("Please enter your username or email address.");
      setLoading(false);
      return;
    }

    try {
      const profile = await loginUser(identifier, loginPassword);
      setSuccess("Successfully authenticated! Diverting to workspace...");
      setTimeout(() => {
        onAuthSuccess(profile);
      }, 150);
    } catch (err: any) {
      setError(err.message || "Failed to find this staff or student profile on our registry.");
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError("");
    setSuccess("");

    if (!regUsername || !regEmail || !regPassword) {
      setError("Please fill all required registration details.");
      setLoading(false);
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setError("Passwords do not match. Please verify.");
      setLoading(false);
      return;
    }

    if (regPassword.length < 8) {
      setError("Password too short: must be at least 8 characters long.");
      setLoading(false);
      return;
    }

    if (!/\d/.test(regPassword)) {
      setError("Password too weak: it must contain at least one number (figure).");
      setLoading(false);
      return;
    }

    try {
      const capitalizedFullName = regUsername.charAt(0).toUpperCase() + regUsername.slice(1);
      const profile = await registerUser(regEmail, regUsername, capitalizedFullName, regPassword);
      
      setSuccess("Account provisioned successfully! Redirecting straight to onboarding...");
      setTimeout(() => {
        onAuthSuccess(profile);
      }, 150);
    } catch (err: any) {
      setError(err.message || "Something went wrong during sign up.");
      setLoading(false);
    }
  };

  // Direct Admin Bypass Action
  const handleAdminBypass = async () => {
    setError("");
    try {
      const profile = await adminBypassLogin();
      onAuthSuccess(profile);
    } catch (err: any) {
      setError("Bypass failure: " + err.message);
    }
  };

  const handleRecovery = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoveryEmail) return;

    setRecoverySent(true);
    setTimeout(() => {
      setRecoverySent(false);
      setShowRecoveryModal(false);
      setRecoveryEmail("");
      setSuccess("A recovery link has been simulated & sent to your registration email inbox.");
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-[#F4F6F3] flex flex-col items-center justify-center p-4 selection:bg-[#4B5E40] selection:text-white" id="auth-page-root">
      
      {/* Center Auth Card */}
      <div className="w-full max-w-[420px] bg-white rounded-2xl shadow-sm border border-gray-100 p-8" id="auth-card">
        
        {/* Brand header centered */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800 tracking-tight" id="auth-logo-title">
            Bincom Dev Center
          </h1>
          <p className="text-xs text-gray-400 mt-1 font-medium">
            {isRegister ? "Create your account to get started" : "Welcome back! Sign in to continue"}
          </p>
        </div>

        {/* Dynamic Warning Alerts */}
        {error && (
          <div className="p-3 bg-rose-50 text-rose-800 text-xs rounded-lg mb-4 border border-rose-100/50 leading-relaxed font-medium" id="auth-alert-error">
            {error}
          </div>
        )}

        {success && (
          <div className="p-3 bg-emerald-50 text-emerald-800 text-xs rounded-lg mb-4 border border-emerald-100/50 leading-relaxed font-semibold animate-pulse" id="auth-alert-success">
            {success}
          </div>
        )}

        {!isRegister ? (
          /* SIGN IN SCREEN */
          <form onSubmit={handleLogin} className="space-y-4" id="login-form">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                Username or Email
              </label>
              <input
                id="login-identifier-input"
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Enter username or email"
                className="w-full px-3.5 py-2.5 text-xs bg-[#EAECE6]/60 rounded-lg border border-transparent focus:outline-none focus:bg-white focus:border-[#4B5E40] transition duration-150 text-gray-800"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  id="login-password-input"
                  type={showPassword ? "text" : "password"}
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full pl-3.5 pr-10 py-2.5 text-xs bg-[#EAECE6]/60 rounded-lg border border-transparent focus:outline-none focus:bg-white focus:border-[#4B5E40] transition duration-150 text-gray-800"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-gray-400 hover:text-[#4B5E40] cursor-pointer"
                  id="login-toggle-eye-btn"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              id="login-submit-btn"
              type="submit"
              className="w-full py-2.5 bg-[#4B5E40] hover:bg-[#3d4d34] text-white text-xs font-bold rounded-lg shadow-2xs cursor-pointer transition duration-150 flex items-center justify-center gap-2"
            >
              <LogIn className="w-3.5 h-3.5" />
              Sign In
            </button>

            {/* Footer with links */}
            <div className="pt-2 flex items-center justify-between text-xs text-gray-400 font-medium select-none">
              <button
                id="recover-pwd-btn"
                type="button"
                onClick={() => { setShowRecoveryModal(true); setRecoverySent(false); }}
                className="hover:text-gray-600 hover:underline cursor-pointer"
              >
                Forgot password?
              </button>
              <button
                id="toggle-register-btn"
                type="button"
                onClick={() => { setIsRegister(true); setError(""); setSuccess(""); }}
                className="hover:text-gray-600 hover:underline cursor-pointer"
              >
                Create account
              </button>
            </div>
          </form>
        ) : (
          /* CREATE ACCOUNT SCREEN */
          <form onSubmit={handleRegister} className="space-y-4" id="register-form">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                Username
              </label>
              <input
                id="reg-username-input"
                type="text"
                required
                value={regUsername}
                onChange={(e) => setRegUsername(e.target.value.replace(/\s+/g, ""))}
                placeholder="Choose a username"
                className="w-full px-3.5 py-2.5 text-xs bg-[#EAECE6]/60 rounded-lg border border-transparent focus:outline-none focus:bg-white focus:border-[#4B5E40] transition duration-150 text-gray-800"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                Email
              </label>
              <input
                id="reg-email-input"
                type="email"
                required
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full px-3.5 py-2.5 text-xs bg-[#EAECE6]/60 rounded-lg border border-transparent focus:outline-none focus:bg-white focus:border-[#4B5E40] transition duration-150 text-gray-800"
              />
              <p className="text-[10px] text-gray-400 mt-1 font-medium">
                Use a valid email address
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  id="reg-password-input"
                  type={showRegPassword ? "text" : "password"}
                  required
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="Create a password"
                  className="w-full pl-3.5 pr-10 py-2.5 text-xs bg-[#EAECE6]/60 rounded-lg border border-transparent focus:outline-none focus:bg-white focus:border-[#4B5E40] transition duration-150 text-gray-800"
                />
                <button
                  type="button"
                  onClick={() => setShowRegPassword(!showRegPassword)}
                  className="absolute right-3 top-3 text-gray-400 hover:text-[#4B5E40] cursor-pointer"
                  id="reg-toggle-eye-btn"
                >
                  {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  id="reg-confirm-password-input"
                  type={showRegConfirmPassword ? "text" : "password"}
                  required
                  value={regConfirmPassword}
                  onChange={(e) => setRegConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  className="w-full pl-3.5 pr-10 py-2.5 text-xs bg-[#EAECE6]/60 rounded-lg border border-transparent focus:outline-none focus:bg-white focus:border-[#4B5E40] transition duration-150 text-gray-800"
                />
                <button
                  type="button"
                  onClick={() => setShowRegConfirmPassword(!showRegConfirmPassword)}
                  className="absolute right-3 top-3 text-gray-400 hover:text-[#4B5E40] cursor-pointer"
                  id="reg-toggle-confirm-eye-btn"
                >
                  {showRegConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              id="reg-submit-btn"
              type="submit"
              className="w-full py-2.5 bg-[#4B5E40] hover:bg-[#3d4d34] text-white text-xs font-bold rounded-lg shadow-2xs cursor-pointer transition duration-150 flex items-center justify-center gap-2"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Create Account
            </button>

            {/* Footer switcher design */}
            <div className="pt-2 text-center text-xs text-gray-400 font-medium select-none">
              <button
                id="toggle-login-btn"
                type="button"
                onClick={() => { setIsRegister(false); setError(""); setSuccess(""); }}
                className="hover:text-gray-600 hover:underline cursor-pointer"
              >
                Already have an account? <span className="text-[#4B5E40] font-bold">Sign in</span>
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Password Recovery Modal Overlay */}
      {showRecoveryModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" id="recovery-modal-overlay">
          <div className="bg-white rounded-2xl max-w-[390px] w-full border border-gray-100 shadow-xl p-6 relative" id="recovery-modal-body">
            
            {/* Close button top right */}
            <button
              id="close-recovery-modal-btn"
              type="button"
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 cursor-pointer p-1 rounded-full hover:bg-gray-100 transition"
              onClick={() => setShowRecoveryModal(false)}
            >
              <X className="w-4 h-4" />
            </button>

            {/* Modal Header */}
            <div className="flex items-center gap-2.5 mb-3">
              <div className="p-1.5 bg-[#4B5E40]/10 rounded-lg text-[#4B5E40]">
                <KeyRound className="w-5 h-5" />
              </div>
              <h2 className="text-base font-bold text-gray-800" id="recovery-title">
                Reset Password
              </h2>
            </div>

            <p className="text-[11.5px] text-gray-500 leading-normal mb-4">
              Enter your email and we'll send you a link to reset your password.
            </p>

            <form onSubmit={handleRecovery} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Email
                </label>
                <input
                  id="recovery-email-input"
                  type="email"
                  required
                  placeholder="Enter your email"
                  value={recoveryEmail}
                  onChange={(e) => setRecoveryEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-[#EAECE6]/60 rounded-lg border border-transparent focus:outline-none focus:bg-white focus:border-[#4B5E40] transition duration-150 text-gray-800"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  id="cancel-recovery-btn"
                  type="button"
                  onClick={() => setShowRecoveryModal(false)}
                  className="px-3.5 py-2 bg-gray-100 hover:bg-gray-150 text-gray-700 text-xs font-bold rounded-lg transition duration-150 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="submit-recovery-btn"
                  type="submit"
                  disabled={recoverySent}
                  className="px-3.5 py-2 bg-[#4B5E40] hover:bg-[#3d4d34] disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-2xs transition duration-150 cursor-pointer"
                >
                  {recoverySent ? "Sending..." : "Send Reset Link"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
