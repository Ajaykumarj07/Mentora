import React, { useState } from "react";
import { StateProvider, useAppState } from "./contexts/StateContext";
import { motion } from "motion/react";
import { Header } from "./components/Header";
import { Sidebar } from "./components/Sidebar";
import { ToastContainer } from "./components/ToastContainer";
import { OfflineBanner } from "./components/OfflineBanner";
import { DashboardView } from "./components/DashboardView";
import { ChatAssistantView } from "./components/ChatAssistantView";
import { SmartNotesView } from "./components/SmartNotesView";
import { QuizView } from "./components/QuizView";
import { RoadmapView } from "./components/RoadmapView";
import { ProfileSettingsView } from "./components/ProfileSettingsView";
import { AuthView } from "./components/AuthView";
import { Logo } from "./components/common/Logo";
import { Lock, RefreshCw, Send, ShieldAlert } from "lucide-react";
import { ErrorBoundary } from "./components/ErrorBoundary";

interface VerificationProps {
  email: string;
  onResend: () => Promise<void>;
  onReload: () => Promise<void>;
  currentTheme: string;
}

const VerificationBanner: React.FC<VerificationProps> = ({ email, onResend, onReload, currentTheme }) => {
  const [resending, setResending] = useState(false);
  const [checking, setChecking] = useState(false);

  const isLight = currentTheme === "light";
  const isMatrix = currentTheme === "matrix";

  const bannerBg = isLight
    ? "bg-amber-50 border-amber-200 text-amber-800"
    : isMatrix
    ? "bg-black border-green-500/25 text-green-400 font-mono"
    : "bg-gradient-to-r from-amber-500/10 to-orange-500/5 border-amber-500/20";

  const titleColor = isLight 
    ? "text-amber-800" 
    : isMatrix 
    ? "text-green-400" 
    : "text-amber-400";

  const descColor = isLight 
    ? "text-zinc-650" 
    : isMatrix 
    ? "text-green-505/90" 
    : "text-slate-450";

  const btnBg = isLight
    ? "bg-amber-600 hover:bg-amber-700 text-white"
    : isMatrix
    ? "bg-green-500/20 hover:bg-green-500/35 border border-green-500/30 text-green-400"
    : "bg-amber-500 hover:bg-amber-600 text-slate-950";

  const checkBtnBg = isLight
    ? "bg-white hover:bg-zinc-105 border-zinc-200 text-zinc-850"
    : isMatrix
    ? "bg-black hover:bg-zinc-910 border-green-500/30 text-green-400"
    : "bg-slate-950 hover:bg-slate-900 border-white/10 hover:border-white/15 text-white";

  const handleResend = async () => {
    setResending(true);
    try {
      await onResend();
    } catch {
      // alerts handled in context
    } finally {
      setResending(false);
    }
  };

  const handleReload = async () => {
    setChecking(true);
    try {
      await onReload();
    } catch {
      // alerts handled in context
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className={`mb-6 p-4 border rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 animate-fade-in ${bannerBg}`}>
      <div className="flex items-center gap-3 w-full md:w-auto">
        <div className={`p-2 rounded-xl shrink-0 ${isLight ? "bg-amber-100 text-amber-600" : isMatrix ? "bg-green-500/10 text-green-400" : "bg-amber-500/20 text-amber-400"}`}>
          <ShieldAlert className="w-5 h-5" />
        </div>
        <div className="text-left">
          <h4 className={`text-xs font-black font-display uppercase tracking-wider ${titleColor}`}>
            Verification Pending
          </h4>
          <p className={`text-[11px] leading-normal ${descColor}`}>
            Verify secure session for <b className={isLight ? "text-amber-900" : isMatrix ? "text-green-300" : "text-white"}>{email}</b> to activate full AI Smart capabilities.
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
        <button
          onClick={handleResend}
          disabled={resending}
          className={`px-3.5 py-1.5 font-display font-black text-[10px] tracking-wider uppercase rounded-xl transition cursor-pointer disabled:opacity-50 ${btnBg}`}
        >
          {resending ? "Dispatching..." : "Resend Link"}
        </button>
        <button
          onClick={handleReload}
          disabled={checking}
          className={`px-3.5 py-1.5 font-display font-bold text-[10px] tracking-wider uppercase rounded-xl transition flex items-center justify-center gap-1 cursor-pointer border ${checkBtnBg}`}
        >
          <RefreshCw className={`w-3 h-3 ${checking ? "animate-spin text-amber-500" : ""}`} />
          Verify Now
        </button>
      </div>
    </div>
  );
};

const VerificationLockout: React.FC<VerificationProps> = ({ email, onResend, onReload, currentTheme }) => {
  const [resending, setResending] = useState(false);
  const [checking, setChecking] = useState(false);

  const isLight = currentTheme === "light";
  const isMatrix = currentTheme === "matrix";

  const cardBg = isLight 
    ? "bg-white border-zinc-200 shadow-xl" 
    : isMatrix 
    ? "bg-black border-green-500/30 text-green-400 font-mono" 
    : "bg-slate-900/40 border-white/5 backdrop-blur-md shadow-2xl";
    
  const headingColor = isLight 
    ? "text-slate-900" 
    : isMatrix 
    ? "text-green-400" 
    : "text-white";
    
  const descColor = isLight 
    ? "text-zinc-650" 
    : isMatrix 
    ? "text-green-500/85" 
    : "text-slate-400";
    
  const codeBg = isLight 
    ? "bg-zinc-100 border-zinc-200 text-zinc-800"
    : isMatrix 
    ? "bg-black border-green-500/20 text-green-400"
    : "bg-slate-950 border-white/5 text-slate-300";

  const lockIconBg = isLight
    ? "bg-amber-50 border-amber-100 text-amber-500"
    : isMatrix
    ? "bg-green-500/5 border-green-500/10 text-green-400"
    : "bg-amber-500/10 border-amber-500/20 text-amber-500";

  const btnBg = isLight
    ? "bg-amber-600 hover:bg-amber-700 text-white"
    : isMatrix
    ? "bg-green-500/20 hover:bg-green-500/35 border border-green-500/30 text-green-400"
    : "bg-amber-500 hover:bg-amber-600 text-slate-950";

  const checkBtnBg = isLight
    ? "bg-white hover:bg-zinc-100 border-zinc-200 text-zinc-800"
    : isMatrix
    ? "bg-black hover:bg-zinc-900 border-green-500/35 text-green-400"
    : "bg-slate-950 hover:bg-slate-900 border-white/15 hover:border-white/25 text-white shadow-inner";

  const handleResend = async () => {
    setResending(true);
    try {
      await onResend();
    } catch {
      // alerts handled in context
    } finally {
      setResending(false);
    }
  };

  const handleReload = async () => {
    setChecking(true);
    try {
      await onReload();
    } catch {
      // alerts handled in context
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className={`p-6 md:p-12 text-center max-w-lg mx-auto border rounded-3xl space-y-6 mt-8 animate-fade-in ${cardBg}`}>
      <div className={`inline-flex p-4 rounded-full border ${lockIconBg}`}>
        <Lock className="w-8 h-8" />
      </div>
      <div className="space-y-2">
        <h3 className={`text-xl font-display font-black tracking-tight ${headingColor}`}>
          Verification Required
        </h3>
        <p className={`text-xs leading-relaxed max-w-sm mx-auto ${descColor}`}>
          To preserve your secure custom sandbox, AI teacher services (smart notes, conversational chat, customized quizzes, and roadmaps) are temporarily locked until your email address is verified.
        </p>
        <div className={`inline-block px-3 py-1.5 border rounded-xl text-xs font-semibold font-mono mt-3 select-all ${codeBg}`}>
          {email}
        </div>
      </div>

      <div className="w-full flex flex-col sm:flex-row gap-3 pt-2">
        <button
          onClick={handleResend}
          disabled={resending}
          className={`flex-1 py-3 font-display font-black text-xs tracking-wider uppercase rounded-xl transition flex items-center justify-center gap-1.5 shadow-md cursor-pointer disabled:opacity-50 ${btnBg}`}
        >
          <Send className="w-3.5 h-3.5" />
          {resending ? "Dispatching..." : "Resend Link"}
        </button>
        <button
          onClick={handleReload}
          disabled={checking}
          className={`flex-1 py-3 font-display font-bold text-xs tracking-wider uppercase rounded-xl transition flex items-center justify-center gap-1.5 border cursor-pointer ${checkBtnBg}`}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${checking ? "animate-spin text-amber-500" : ""}`} />
          Refresh Status
        </button>
      </div>
    </div>
  );
};

function MainAppContent() {
  const { user, loading, currentTheme, isEmailVerified, sendVerificationEmail, reloadUserAuth } = useAppState();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  React.useEffect(() => {
    // Sync class mapping on HTML root
    document.documentElement.classList.remove("theme-dark", "theme-light", "theme-matrix", "theme-nordic", "dark", "light");
    document.documentElement.classList.add(`theme-${currentTheme}`);
    if (currentTheme === "light") {
      document.documentElement.classList.add("light");
    } else {
      document.documentElement.classList.add("dark");
    }
  }, [currentTheme]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0F19] flex flex-col justify-center items-center p-6 relative overflow-hidden select-none">
        {/* Futuristic neon backing rings and ambient glow circles */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[radial-gradient(ellipse_at_center,var(--color-brand-purple)/8%,transparent_60%)] rounded-full blur-3xl -z-10 animate-pulse"></div>
        <div className="absolute top-1/4 left-1/3 w-[300px] h-[300px] bg-[radial-gradient(ellipse_at_center,var(--color-brand-pink)/6%,transparent_60%)] rounded-full blur-3xl -z-10 animate-pulse" style={{ animationDuration: "6s" }}></div>
        
        <div className="text-center space-y-8 max-w-sm w-full">
          {/* Logo intro glow animation using Framer Motion */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ 
              scale: [1, 1.04, 1],
              opacity: 1,
            }}
            transition={{ 
              scale: { repeat: Infinity, duration: 3, ease: "easeInOut" },
              opacity: { duration: 0.8 }
            }}
            className="inline-flex p-6 rounded-3xl bg-[#111827]/75 border border-white/15 shadow-[0_0_50px_rgba(168,85,247,0.15)] backdrop-blur-lg relative overflow-hidden"
          >
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
            <Logo size="lg" showText={false} />
          </motion.div>

          {/* Loading status details and gradient indicator line */}
          <div className="space-y-4">
            <h2 className="text-2xl font-display font-black tracking-widest text-white">
              MENTORA <span className="bg-gradient-to-r from-pink-500 via-orange-400 to-purple-500 bg-clip-text text-transparent italic">AI</span>
            </h2>
            <div className="w-48 h-1 bg-slate-950/60 mx-auto rounded-full overflow-hidden border border-white/5 relative shadow-inner">
              <motion.div
                animate={{ x: ["-100%", "250%"] }}
                transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
                className="absolute inset-y-0 w-24 bg-gradient-to-r from-brand-start via-brand-pink to-brand-purple rounded-full"
              ></motion.div>
            </div>
            <p className="text-[10px] font-mono tracking-widest text-slate-450 uppercase pt-1 animate-pulse">
              Synthesizing Classroom Session...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Render authentications if credential session is inactive
  if (!user) {
    return <AuthView />;
  }

  // Map theme background color parameters
  let themeBg = "bg-slate-950 text-slate-100";
  let themeGrid = "border-white/10";
  
  if (currentTheme === "nordic") {
    themeBg = "bg-slate-900 text-slate-100";
    themeGrid = "border-slate-800";
  } else if (currentTheme === "light") {
    themeBg = "bg-zinc-50 text-slate-900";
    themeGrid = "border-zinc-200";
  } else if (currentTheme === "matrix") {
    themeBg = "bg-black text-green-400 font-mono";
    themeGrid = "border-green-500/30";
  }

  const isAiTab = ["chat", "notes", "quiz", "roadmap"].includes(activeTab);
  const shouldLock = !isEmailVerified && isAiTab;

  return (
    <div className={`min-h-screen flex ${themeBg} theme-${currentTheme} transition-colors duration-300 font-sans`}>
      {/* Sidebar - Collapsible off-canvas drawer & Desktop Menu list */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
      />

      {/* Main Content Area split */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />

        {/* Offline detection banner — shown on native when network is unavailable */}
        <OfflineBanner />
        
        {/* Dynamic viewport container */}
        {/* pb-safe ensures content is not hidden behind Android's bottom nav bar */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 pb-safe">
          <div className="max-w-6.5xl mx-auto">
            {/* Display warning banner if email is not verified */}
            {!isEmailVerified && (
              <VerificationBanner 
                email={user?.email || ""} 
                onResend={sendVerificationEmail}
                onReload={reloadUserAuth}
                currentTheme={currentTheme}
              />
            )}

            {shouldLock ? (
              <VerificationLockout 
                email={user?.email || ""} 
                onResend={sendVerificationEmail}
                onReload={reloadUserAuth}
                currentTheme={currentTheme}
              />
            ) : (
              <ErrorBoundary componentName={`${activeTab.toUpperCase()} View Workspace`}>
                {activeTab === "dashboard" && <DashboardView />}
                {activeTab === "chat" && <ChatAssistantView />}
                {activeTab === "notes" && <SmartNotesView />}
                {activeTab === "quiz" && <QuizView />}
                {activeTab === "roadmap" && <RoadmapView />}
                {activeTab === "profile" && <ProfileSettingsView />}
              </ErrorBoundary>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <StateProvider>
      <MainAppContent />
      <ToastContainer />
    </StateProvider>
  );
}
