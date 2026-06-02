import React, { useState } from "react";
import { useAppState } from "../contexts/StateContext";
import { formatAuthError } from "../lib/firebase";
import {
  User,
  Sliders,
  Shield,
  Trash2,
  CheckCircle,
  HelpCircle,
  Award,
  Sparkles,
  RefreshCw,
  Clock
} from "lucide-react";

export const ProfileSettingsView: React.FC = () => {
  const { user, currentTheme, setTheme, logout, isEmailVerified, sendVerificationEmail, reloadUserAuth, addToast } = useAppState();
  const [isResetConfirming, setIsResetConfirming] = useState(false);

  const handleResetData = () => {
    if (!isResetConfirming) {
      setIsResetConfirming(true);
      addToast("info", "Cache Purge Request ⚠️", "Tap the reset button again to completely purge your progress!");
      return;
    }
    localStorage.clear();
    addToast("success", "Cache Cleared 🧹", "Successfully wiped local statistics. Reloading workspace...");
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  const themeDetails = [
    { id: "dark", label: "Cosmic Obsidian", desc: "Default eye-safe dark space with neon cyan accents", bg: "bg-slate-950 border-white/5 text-teal-400" },
    { id: "nordic", label: "Aurora Polar", desc: "Soft midnight blues and arctic slate backgrounds", bg: "bg-slate-900 border-white/10 text-sky-400" },
    { id: "light", label: "Polar Bright", desc: "Crisp off-whites and charcoal text for pure focus", bg: "bg-zinc-50 border-zinc-200 text-slate-800" },
    { id: "matrix", label: "Phosphor Matrix", desc: "True black with active terminal green colors", bg: "bg-black border-emerald-500/50 text-emerald-400 font-mono" }
  ] as const;

  return (
    <div className="space-y-6 pb-20 select-text">
      {/* Upper overview card */}
      <div className="flex items-center justify-between pb-3 border-b border-white/10">
        <div>
          <h3 className="font-display font-black text-slate-100 flex items-center gap-2">
            <User className="w-5 h-5 text-purple-400" />
            Your Academic Profile
          </h3>
          <p className="text-xs text-slate-400">Manage your educational metrics, styling options, and secrets</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="lg:col-span-2 space-y-6">
          <div className="p-6 bg-slate-900/40 border border-white/10 rounded-2.5xl space-y-5 shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2.5xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white text-2xl font-black font-display shadow-md">
                  {user?.displayName ? user.displayName.substring(0, 2).toUpperCase() : "AI"}
                </div>
                <div>
                  <h4 className="text-lg font-display font-black text-white">
                    {user?.displayName || "Guest Student"}
                  </h4>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <p className="text-xs text-slate-400 font-sans">{user?.email}</p>
                    {isEmailVerified ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-bold font-mono tracking-wider uppercase rounded-md">
                        <CheckCircle className="w-2.5 h-2.5" />
                        Verified
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[9px] font-bold font-mono tracking-wider uppercase rounded-md">
                        <Clock className="w-2.5 h-2.5" />
                        Unverified
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500 font-mono mt-1.5">
                    Student UUID: {user?.uid.substring(0, 15)}...
                  </p>
                </div>
              </div>

              <div className="p-3 px-4 bg-slate-950/60 border border-white/5 rounded-xl text-center shadow-inner">
                <div className="flex items-center gap-1.5 justify-center">
                  <Award className="w-4 h-4 text-amber-400 fill-amber-400" />
                  <span className="text-sm font-black font-display text-white">Level {user?.level || 1} Elite</span>
                </div>
                <p className="text-[10px] text-slate-400 font-mono mt-1">
                  Total Experience: {user?.xp} XP
                </p>
              </div>
            </div>

            {/* Email verification pending notice and actions */}
            {!isEmailVerified && (
              <div className="p-4 bg-amber-500/5 rounded-2xl border border-amber-500/15 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h5 className="text-xs font-bold font-display text-amber-400">Classroom Security Notice</h5>
                  <p className="text-[11px] text-slate-400 leading-normal max-w-md">
                    Please verify your email to secure your profile and clear any Firestore policy restrictions.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={async () => {
                      try {
                        await sendVerificationEmail();
                        addToast("success", "Verification Dispatched 📧", "A new secure link has been emailed to you.");
                      } catch (err: any) {
                        addToast("info", "Resend Failed ⚠️", formatAuthError(err));
                      }
                    }}
                    className="flex-1 sm:flex-none px-3 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-display font-black text-[10px] tracking-wider uppercase rounded-xl transition duration-200 cursor-pointer shadow-md"
                  >
                    Resend Verification
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        await reloadUserAuth();
                      } catch (err: any) {
                        addToast("info", "Sync Failed ⚠️", formatAuthError(err));
                      }
                    }}
                    className="flex-1 sm:flex-none px-3 py-2 bg-slate-950 hover:bg-slate-900 text-white font-display font-bold text-[10px] tracking-wider uppercase rounded-xl border border-white/10 hover:border-white/15 transition flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3 text-slate-400" />
                    Verify Now
                  </button>
                </div>
              </div>
            )}

            {/* List badges detail */}
            <div className="pt-4 border-t border-white/5">
              <h5 className="font-display font-semibold text-xs text-slate-300 mb-3 select-none">
                UNLOCKED BADGES ({user?.badges.length || 0})
              </h5>
              <div className="flex flex-wrap gap-2">
                {user?.badges.map((badgeName) => (
                  <span
                    key={badgeName}
                    className="px-3 py-1.5 bg-purple-500/10 border border-purple-500/20 text-purple-300 rounded-xl text-[10px] font-mono font-extrabold flex items-center gap-1 shadow-sm uppercase shrink-0"
                  >
                    <Sparkles className="w-3 h-3 fill-purple-400 animate-pulse text-purple-400" />
                    {badgeName}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Theme Workspace Stylers selector */}
          <div className="p-6 bg-slate-900/40 border border-white/10 rounded-2.5xl space-y-4 shadow-lg select-none">
            <h4 className="font-display font-bold text-slate-100 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-emerald-400" />
              SaaS Interface Styling Presets
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Tailor the coloring of your virtual classrooms. Changes sync effortlessly with desktop or mobile simulation frames.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
              {themeDetails.map((theme) => {
                const isActive = currentTheme === theme.id;
                return (
                  <button
                    key={theme.id}
                    onClick={() => setTheme(theme.id)}
                    className={`p-4 text-left rounded-2xl border transition-all flex flex-col justify-between h-28 cursor-pointer ${theme.bg} ${
                      isActive ? "ring-2 ring-emerald-400" : "opacity-75 hover:opacity-100"
                    }`}
                  >
                    <div>
                      <h5 className="text-[13px] font-bold tracking-tight">{theme.label}</h5>
                      <p className="text-[11px] opacity-75 mt-1 leading-normal font-sans">{theme.desc}</p>
                    </div>
                    {isActive && (
                      <span className="text-[9px] uppercase font-mono font-bold tracking-widest text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-md border border-emerald-500/20 self-end">
                        Active Presets
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Workspace Operations & secrets tutorial */}
        <div className="space-y-6">
          
          <div className="p-5 bg-slate-950 border border-white/5 rounded-2.5xl space-y-3 shadow-inner">
            <h4 className="font-display font-bold text-xs text-slate-300 flex items-center gap-2">
              <Shield className="w-4 h-4 text-orange-400" />
              AI Studio Security & Key Guide
            </h4>
            
            <div className="space-y-3.5 text-xs text-slate-400 font-sans leading-relaxed pt-2">
              <p>
                To utilize the full breadth of the Google Gemini LLM API features (smart textbook generators, multi-choice playgrounds, timelines synthesis), configure your workspace secrets.
              </p>
              
              <div className="p-3 bg-slate-900 border border-white/5 rounded-xl space-y-1.5">
                <p className="font-mono text-[10px] uppercase font-bold text-slate-200 flex items-center gap-1 select-none">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  Active environment:
                </p>
                <p className="font-mono text-[10px] text-zinc-400 line-clamp-2">
                  GEMINI_API_KEY is configured on the backend proxy server inside the Express runtime.
                </p>
              </div>

              <p className="text-[11px]">
                To update key bindings, access the **Secrets Panel** inside the Google AI Studio settings, bind `GEMINI_API_KEY` to your valid project token, and launch the dev host server!
              </p>
            </div>
          </div>

          <div className="p-5 bg-slate-900/30 border border-white/10 rounded-2.5xl space-y-3 shadow-lg select-none">
            <h4 className="font-display font-bold text-xs text-red-400 flex items-center gap-1.5">
              <Trash2 className="w-4 h-4" />
              Workspace Reset Controls
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed font-sans">
              To wipe locally simulated milestones, clear progress tokens, and return Leaderboard users to default parameters, click the button below. This operation is irreversible.
            </p>
            <button
               onClick={handleResetData}
               className={`w-full py-2.5 rounded-xl font-display font-extrabold text-xs transition border ${
                 isResetConfirming 
                   ? "bg-red-500 text-white border-red-600 animate-pulse font-black" 
                   : "bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border-red-500/20"
               }`}
            >
              {isResetConfirming ? "⚠️ Tap Again to Reset All Data" : "Absolute Purge Workspace Cash"}
            </button>
          </div>

        </div>
      </div>

    </div>
  );
};
