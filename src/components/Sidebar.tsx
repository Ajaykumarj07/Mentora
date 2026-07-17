import React from "react";
import { useAppState } from "../contexts/StateContext";
import { motion } from "motion/react";
import { Logo } from "./common/Logo";
import {
  Compass,
  MessageSquare,
  BookOpen,
  Brain,
  ListChecks,
  User,
  Sliders,
  LogOut,
  Sparkles,
  Award
} from "lucide-react";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  isOpen,
  setIsOpen,
}) => {
  const { user, logout, currentTheme, setTheme } = useAppState();

  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: Compass, accent: "text-blue-400" },
    { id: "chat", label: "AI Doubt Tutor", icon: MessageSquare, accent: "text-purple-400" },
    { id: "notes", label: "Smart Notes", icon: BookOpen, accent: "text-emerald-400" },
    { id: "quiz", label: "Quiz Generator", icon: Brain, accent: "text-yellow-400" },
    { id: "roadmap", label: "Study Roadmaps", icon: ListChecks, accent: "text-sky-400" },
    { id: "profile", label: "Your Profile", icon: User, accent: "text-teal-400" },
  ];

  const handleNav = (tabId: string) => {
    setActiveTab(tabId);
    setIsOpen(false);
  };

  return (
    <>
      {/* Off-canvas sidebar overlay for smaller viewports */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 md:hidden"
        ></div>
      )}

      {/* Primary Desktop Sidebar component */}
      <aside
        className={`fixed md:sticky top-0 left-0 h-full w-64 z-50 bg-slate-950/90 border-r border-white/10 p-5 flex flex-col justify-between transition-transform duration-300 md:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div>
          {/* Top Logo branding */}
          <div className="mb-8 mt-2 px-1">
            <Logo size="md" />
            <p className="text-[8px] font-mono tracking-widest uppercase text-slate-500 mt-1 pl-1">Premium Co-pilot</p>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1.5">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNav(item.id)}
                  className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl transition-all font-display text-sm font-semibold outline-hidden ${
                    isActive
                      ? "bg-white/10 text-white shadow-inner border border-white/5"
                      : "text-slate-400 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? item.accent : "text-slate-400"}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Theme Quick Switcher */}
          <div className="mt-8 border-t border-white/10 pt-4">
            <h4 className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-2">
              Workspace Style
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {(["dark", "light", "matrix", "nordic"] as const).map((theme) => (
                <button
                  key={theme}
                  onClick={() => setTheme(theme)}
                  className={`px-2 py-1.5 rounded-lg text-[11px] font-mono font-bold capitalize transition-all border ${
                    currentTheme === theme
                      ? "bg-slate-800 text-emerald-400 border-emerald-500/50"
                      : "bg-slate-900/40 text-slate-400 border-white/5 hover:bg-slate-800/60"
                  }`}
                >
                  {theme}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Lower section: User credentials info card & Logout button */}
        <div className="border-t border-white/10 pt-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-500 to-indigo-505 flex items-center justify-center font-display font-bold text-white shadow-md">
                {user?.displayName ? user.displayName.substring(0, 2).toUpperCase() : "AI"}
              </div>
              <span className="absolute bottom-[-1px] right-[-1px] w-3 h-3 bg-emerald-500 border border-slate-950 rounded-full"></span>
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-bold text-white font-display truncate">
                {user?.displayName || "Guest Student"}
              </p>
              <div className="flex items-center gap-1">
                <Award className="w-3 h-3 text-amber-400 fill-amber-400" />
                <span className="text-[10px] text-slate-400 font-mono">
                  Level {user?.level || 1} Elite
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 hover:text-red-300 rounded-xl transition text-xs font-bold font-display"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out Workspace
          </button>
        </div>
      </aside>

      {/* Floating Bottom Navigation Bar for Mobile Viewports (Collapses automatically) */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950 border-t border-white/10 flex md:hidden items-center justify-around py-2.5 px-4 backdrop-blur-lg select-none pb-safe">
        {menuItems.slice(0, 5).map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className="flex flex-col items-center justify-center outline-hidden tap-highlight-transparent touch-target"
            >
              <Icon className={`w-5 h-5 ${isActive ? item.accent : "text-slate-500"}`} />
              <span className={`text-[9px] mt-1 font-sans ${isActive ? "text-white font-bold" : "text-slate-500"}`}>
                {item.label.split(" ")[0]}
              </span>
            </button>
          );
        })}
        {/* Profile on mobile */}
        <button
          onClick={() => setActiveTab("profile")}
          className="flex flex-col items-center justify-center outline-hidden select-none tap-highlight-transparent touch-target"
        >
          <div className={`w-5 h-5 rounded-full bg-slate-800 border-2 ${activeTab === "profile" ? "border-teal-400 bg-teal-500" : "border-slate-600"} flex items-center justify-center text-[8px] font-black text-white`}>
            {user?.displayName ? user.displayName.charAt(0).toUpperCase() : "U"}
          </div>
          <span className={`text-[9px] mt-1 font-sans ${activeTab === "profile" ? "text-teal-400 font-bold" : "text-slate-500"}`}>
            Profile
          </span>
        </button>
      </nav>
    </>
  );
};
