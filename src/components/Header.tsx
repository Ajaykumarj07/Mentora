import React from "react";
import { useAppState } from "../contexts/StateContext";
import { Flame, Coins, Trophy, Clock, Play, Pause, RotateCcw, Award, Menu } from "lucide-react";
import { Logo } from "./common/Logo";

interface HeaderProps {
  onMenuToggle?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onMenuToggle }) => {
  const {
    user,
    pomodoroMinutes,
    pomodoroSeconds,
    pomodoroActive,
    pomodoroMode,
    setPomodoroActive,
    resetPomodoro,
  } = useAppState();

  const formattedSec = pomodoroSeconds < 10 ? `0${pomodoroSeconds}` : pomodoroSeconds;
  
  // Calculate level progress percentage (each level fits roughly 500 XP steps)
  const currentLevelXp = user ? user.xp % 500 : 0;
  const progressPercent = Math.min((currentLevelXp / 500) * 100, 100);

  return (
    <header className="flex flex-col md:flex-row md:items-center justify-between border-b border-white/10 p-4 md:px-6 bg-slate-900/65 backdrop-blur-md gap-4 pt-safe">
      {/* Left section: App Branding or Hamburger */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuToggle}
            className="md:hidden text-zinc-300 hover:text-white transition-colors"
            aria-label="Toggle navigation list"
          >
            <Menu className="w-5 h-5" />
          </button>
          <Logo size="sm" />
        </div>

        {/* Small screen Pomodoro counter preview */}
        <div className="flex md:hidden items-center gap-2 px-2.5 py-1 bg-slate-950/60 rounded-full border border-white/10">
          <Clock className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
          <span className="font-mono text-xs font-semibold text-rose-300">
            {pomodoroMinutes}:{formattedSec}
          </span>
        </div>
      </div>

      {/* Middle section: High-impact Pomodoro controller Widget */}
      <div className="hidden md:flex items-center gap-4 bg-slate-950/70 border border-white/10 px-4 py-1.5 rounded-full">
        <div className="flex items-center gap-2 border-r border-white/10 pr-3.5">
          <Clock className={`w-4 h-4 ${pomodoroMode === "work" ? "text-rose-400" : "text-sky-400"} ${pomodoroActive ? "animate-pulse" : ""}`} />
          <span className="font-mono text-sm font-bold text-slate-200">
            {pomodoroMode === "work" ? "Study Focus" : "Rest Break"}
          </span>
          <span className="font-mono text-base font-black text-rose-300 ml-1">
            {pomodoroMinutes}:{formattedSec}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPomodoroActive(!pomodoroActive)}
            className={`p-1 rounded-full transition-all ${pomodoroActive ? "bg-amber-500/20 text-amber-300 hover:bg-amber-500/30" : "bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"}`}
            title={pomodoroActive ? "Pause clock" : "Start focus countdown"}
          >
            {pomodoroActive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={resetPomodoro}
            className="p-1 rounded-full bg-slate-800 text-slate-300 hover:bg-slate-700 transition"
            title="Reset timer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Right Section: Student Streak, Level progress bar and Coins */}
      <div className="flex items-center justify-between md:justify-end gap-6 border-t border-white/10 md:border-none pt-2.5 md:pt-0">
        {/* Streak element with dynamic Flame icon */}
        <div className="flex items-center gap-1.5" title="Daily streak tracker (Duolingo Style)">
          <div className="p-1.5 bg-orange-500/10 rounded-lg text-orange-400 border border-orange-500/20">
            <Flame className="w-4 h-4 fill-orange-500 animate-bounce" />
          </div>
          <div>
            <p className="text-[10px] font-mono text-slate-400">Streak</p>
            <p className="text-xs font-bold font-display text-orange-300">{user?.streak || 0} Days</p>
          </div>
        </div>

        {/* Coins element */}
        <div className="flex items-center gap-1.5" title="Earn coins by making notes and acing quizzes">
          <div className="p-1.5 bg-amber-500/10 rounded-lg text-amber-400 border border-amber-500/20">
            <Coins className="w-4 h-4 fill-amber-500" />
          </div>
          <div>
            <p className="text-[10px] font-mono text-slate-400">Coins</p>
            <p className="text-xs font-bold font-display text-amber-300">{user?.coins || 0}</p>
          </div>
        </div>

        {/* Level XP block */}
        <div className="flex items-center gap-2" title={`${user?.xp || 0} Lifetime Experience Points`}>
          <div className="text-right">
            <div className="flex items-center gap-1 justify-end">
              <Award className="w-3.5 h-3.5 text-teal-400" />
              <span className="text-xs font-black font-display text-teal-300">Level {user?.level || 1}</span>
            </div>
            <p className="text-[9px] font-mono text-slate-400">
              {currentLevelXp}/500 XP
            </p>
          </div>
          <div className="w-16 h-2 bg-slate-950 border border-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-teal-500 to-emerald-400 transition-all duration-500 ease-out"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
        </div>
      </div>
    </header>
  );
};
