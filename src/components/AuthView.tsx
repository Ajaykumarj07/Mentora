import React, { useState } from "react";
import { useAppState } from "../contexts/StateContext";
import { motion, AnimatePresence } from "motion/react";
import { Shield, Sparkles, BookOpen, BrainCircuit, Compass, AlertCircle, ArrowRight } from "lucide-react";
import { Logo } from "./common/Logo";
import { isAndroid } from "../lib/platform";

export const AuthView: React.FC = () => {
  const { googleSignIn, addToast, currentTheme } = useAppState();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleGoogleClick = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      await googleSignIn();
    } catch (err: any) {
      if (err?.code !== "auth/popup-closed-by-user") {
        const rawMsg = err?.message || String(err);
        const isUnauthorizedDomain = rawMsg.includes("auth/unauthorized-domain") || err?.code === "auth/unauthorized-domain";
        if (!isUnauthorizedDomain) {
          setErrorMsg("Google authentication connection failed. Please reload or check your internet settings.");
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const isLight = currentTheme === "light";
  
  // Custom theme backdrop mappings
  let pageBg = "bg-[#0B0F19]";
  let cardBg = "bg-slate-900/40 backdrop-blur-xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.4)]";
  let textColor = "text-slate-200";
  let subText = "text-slate-400";
  let accentGradient = "from-purple-500 via-pink-500 to-amber-500";

  if (currentTheme === "light") {
    pageBg = "bg-zinc-50";
    cardBg = "bg-white border border-zinc-200 shadow-xl";
    textColor = "text-zinc-805";
    subText = "text-zinc-500";
    accentGradient = "from-indigo-600 via-purple-600 to-pink-500";
  } else if (currentTheme === "matrix") {
    pageBg = "bg-black font-mono";
    cardBg = "bg-black border border-green-500/30 shadow-[0_0_30px_rgba(34,197,94,0.1)]";
    textColor = "text-green-400";
    subText = "text-green-500/80";
    accentGradient = "from-green-500 to-emerald-400";
  } else if (currentTheme === "nordic") {
    pageBg = "bg-slate-900";
    cardBg = "bg-slate-850/80 backdrop-blur-lg border border-slate-750/60 shadow-2xl";
    textColor = "text-slate-100";
    subText = "text-slate-400";
    accentGradient = "from-sky-500 to-teal-400";
  }

  const features = [
    {
      icon: <BrainCircuit className="w-5 h-5 text-purple-500" />,
      title: "Self-correcting AI Co-pilot",
      desc: "Instant notes generation, multi-provider smart retries, and failure-free interactive chats.",
    },
    {
      icon: <Compass className="w-5 h-5 text-pink-500" />,
      title: "Adaptive Study Roadmaps",
      desc: "Customize day-by-day syllabi tailored to specified timelines and subjects of study.",
    },
    {
      icon: <BookOpen className="w-5 h-5 text-amber-500" />,
      title: "Interactive Classroom Quizzes",
      desc: "Challenge knowledge limits, track progress metrics, and automatically score XP.",
    },
  ];

  return (
    <div className={`min-h-screen ${pageBg} flex items-center justify-center p-4 md:p-8 relative overflow-hidden transition-colors duration-300 font-sans`}>
      {/* Premium ambient light layers */}
      <div className="absolute top-1/6 left-1/4 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[120px] -z-10 animate-pulse"></div>
      <div className="absolute bottom-1/6 right-1/4 w-[500px] h-[500px] bg-pink-500/5 rounded-full blur-[140px] -z-10 animate-pulse" style={{ animationDelay: "2s" }}></div>

      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Branding & Marketing Column */}
        <div className="lg:col-span-7 space-y-6 text-center lg:text-left p-2">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs backdrop-blur-sm">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin" style={{ animationDuration: "4s" }} />
            <span className={`font-mono text-[10px] uppercase tracking-wider ${currentTheme === "matrix" ? "text-green-400" : "text-slate-400"}`}>
              Education Redefined
            </span>
          </div>

          <div className="space-y-3">
            <Logo size="xl" showText={true} className="justify-center lg:justify-start" />
            <h1 className={`text-3xl md:text-5xl font-display font-black tracking-tight leading-tight ${currentTheme === "matrix" ? "text-green-400" : "text-white"}`}>
              Your Ultimate <br className="hidden md:inline" />
              <span className={`bg-gradient-to-r ${accentGradient} bg-clip-text text-transparent italic`}>
                Interactive Study
              </span>{" "}
              Partner.
            </h1>
          </div>

          <p className={`text-sm md:text-base max-w-lg mx-auto lg:mx-0 leading-relaxed ${subText}`}>
            Empower your academic journey. Generate instantly reviewable notes, step-by-step master roadmaps, and robust exam preparation challenges.
          </p>

          {/* Feature Lists */}
          <div className="hidden md:grid grid-cols-1 gap-4 pt-4 max-w-md mx-auto lg:mx-0">
            {features.map((f, i) => (
              <div key={i} className="flex gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-all">
                <div className="shrink-0 p-2 rounded-xl bg-slate-950/45 border border-white/5 flex items-center justify-center">
                  {f.icon}
                </div>
                <div className="text-left">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">{f.title}</h4>
                  <p className={`text-[11px] leading-normal mt-1 ${subText}`}>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Authentication Card Column */}
        <div className="lg:col-span-5 w-full max-w-md mx-auto lg:mx-0">
          <div className={`p-6 md:p-8 rounded-3xl ${cardBg} relative overflow-hidden`}>
            {/* Gloss shine bar */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>

            <div className="text-center space-y-2 mb-8">
              <h3 className="text-lg font-black uppercase tracking-wider text-white">
                Authorized Access
              </h3>
              <p className={`text-[11px] font-medium leading-normal ${subText}`}>
                Please connect your Google Account to automatically personalize your sandbox and sync study logs.
              </p>
            </div>

            {errorMsg && (
              <div className="p-3 mb-6 bg-red-500/10 border border-red-500/20 rounded-2xl flex gap-2 items-start text-left select-text">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <p className="text-[11px] font-sans font-medium text-red-400 leading-normal">
                  {errorMsg}
                </p>
              </div>
            )}

            <AnimatePresence mode="wait">
              {loading ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="py-12 flex flex-col items-center justify-center space-y-4"
                >
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full border-2 border-purple-500/20 border-t-purple-500 animate-spin"></div>
                    <Shield className="w-5 h-5 text-pink-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                  </div>
                  <div className="text-center space-y-1">
                    <p className="text-xs font-black text-white uppercase tracking-widest">Constructing Session</p>
                    <p className={`text-[10px] font-mono uppercase tracking-wider ${subText} animate-pulse`}>personalizing classroom...</p>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-6"
                >
                  {/* Real Google SSO button */}
                  <button
                    onClick={handleGoogleClick}
                    className="w-full group relative py-3.5 px-4 bg-slate-950 hover:bg-slate-900 border border-white/10 hover:border-white/20 text-white rounded-2xl text-xs font-black uppercase tracking-wider font-display transition-all duration-300 flex items-center justify-center gap-3 shadow-[inset_0_1px_1px_rgba(255,255,255,0.08)] cursor-pointer"
                  >
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                    
                    <svg className="w-4 h-4 text-red-400 group-hover:scale-110 transition-transform duration-200" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12.24 10.285V13.4h6.887C18.2 15.614 15.645 18 12.24 18c-3.86 0-7-3.14-7-7s3.14-7 7-7c1.7 0 3.25.61 4.46 1.64l2.384-2.384C17.307 1.697 14.93 1 12.24 1 6.58 1 2 5.58 2 11.24s4.58 10.24 10.24 10.24c5.79 0 10.24-4.06 10.24-10.24 0-.69-.06-1.35-.18-1.955H12.24z" />
                    </svg>
                    <span>{isAndroid ? "Sign in with Google" : "Connect with Google"}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-white transition-colors duration-200" />
                  </button>

                  {/* Android native prompt notice */}
                  {isAndroid && (
                    <p className={`text-center text-[10px] font-mono ${subText}`}>
                      You will be prompted to choose a Google Account.
                    </p>
                  )}

                  <div className="pt-4 border-t border-white/5 space-y-4">
                    <div className="flex gap-2.5 items-start">
                      <Shield className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                      <p className={`text-[10px] leading-relaxed text-left ${subText}`}>
                        <strong className="text-slate-300 uppercase block mb-0.5">Verified Profile Lock</strong>
                        Mentora enforces standard cryptographic OAuth token handshakes. No system credentials or access tokens are ever read or persisted.
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
};
