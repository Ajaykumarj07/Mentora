import React, { useState } from "react";
import { useAppState } from "../contexts/StateContext";
import { askAiRoadmap } from "../lib/gemini";
import {
  Sparkles,
  ListChecks,
  Calendar,
  CheckCircle,
  Clock,
  ChevronRight,
  Trash2,
  RefreshCw,
  Plus,
  ArrowRight,
  CheckSquare,
  Square
} from "lucide-react";

export const RoadmapView: React.FC = () => {
  const { roadmaps, saveRoadmap, toggleRoadmapStep, addToast } = useAppState();

  // Navigation subtabs
  const [activeTab, setActiveTab] = useState<"build" | "saved">("build");
  const [selectedRoadmap, setSelectedRoadmap] = useState<any | null>(roadmaps[0] || null);

  // Form states
  const [subject, setSubject] = useState("");
  const [durationDays, setDurationDays] = useState(7);
  const [generating, setGenerating] = useState(false);

  // Roadmap creation handler
  const handleBuild = async () => {
    if (!subject.trim() || generating) return;
    setGenerating(true);
    try {
      const result = await askAiRoadmap(subject, durationDays);
      if (result.subject && result.steps) {
        const saved = await saveRoadmap(result.subject, result.durationDays || durationDays, result.steps);
        setSelectedRoadmap(saved);
        setActiveTab("saved");
        setSubject("");
      }
    } catch (err: any) {
      addToast("info", "Compilation Failed ⚠️", `Roadmap compilation failed: ${err?.message || "connection error"}`);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6 pb-20 select-text">
      {/* Sub tabs list */}
      <div className="flex border-b border-white/10 select-none">
        <button
          onClick={() => setActiveTab("build")}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 text-sm font-semibold font-display outline-hidden transition-all ${
            activeTab === "build"
              ? "border-emerald-500 text-emerald-400 font-bold"
              : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          <Sparkles className="w-4 h-4" />
          AI Curriculum Planner
        </button>
        <button
          onClick={() => setActiveTab("saved")}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 text-sm font-semibold font-display outline-hidden transition-all ${
            activeTab === "saved"
              ? "border-emerald-500 text-emerald-400 font-bold"
              : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          <ListChecks className="w-4 h-4" />
          Calendar Trackers ({roadmaps.length})
        </button>
      </div>

      {/* SUBTAB 1: Build a Curriculum */}
      {activeTab === "build" && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-2 space-y-4 bg-slate-900/40 border border-white/10 p-5 rounded-2.5xl h-fit">
            <h4 className="font-display font-bold text-slate-100 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-400 animate-pulse" />
              Syllabus Timeline Synthesizer
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed select-none">
              Generate sequential daily curriculums for any complex exam or subject. Break massive textbooks down into bite-sized daily objectives.
            </p>

            <div className="space-y-4.5 pt-2">
              <div>
                <label className="block text-[10px] uppercase font-mono tracking-wider font-bold text-slate-400 mb-1.5 select-none">
                  Core Subject / Exam Purpose
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Master React Hooks depth, organic carbon cycle exam..."
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-xs font-semibold text-white outline-hidden focus:border-emerald-500/50 transition-all font-display"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-mono tracking-wider font-bold text-slate-400 mb-1.5 select-none">
                  Preparation Window Scope
                </label>
                <select
                  value={durationDays}
                  onChange={(e) => setDurationDays(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-xs font-semibold text-slate-300 outline-hidden focus:border-emerald-500/50 transition-all font-mono"
                >
                  <option value="3">3 Days (Fast-Track cram)</option>
                  <option value="5">5 Days (Key review loop)</option>
                  <option value="7">7 Days (Full Weekly mastery)</option>
                  <option value="14">14 Days (Comprehensive deep-dive)</option>
                </select>
              </div>

              <button
                onClick={handleBuild}
                disabled={!subject.trim() || generating}
                className="w-full py-3.5 bg-gradient-to-tr from-emerald-500 to-sky-400 hover:from-emerald-600 hover:to-sky-500 text-slate-950 hover:text-white disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 font-display font-black text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-2 select-none"
              >
                {generating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Assembling Study Sequence...
                  </>
                ) : (
                  <>
                    <Calendar className="w-4 h-4 animate-bounce" />
                    Create Roadmap &middot; +40 XP
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="lg:col-span-3 min-h-[300px] border border-white/10 rounded-2.5xl p-6.5 bg-slate-900/30 flex flex-col justify-center items-center text-center select-none space-y-4">
            <div className="bg-emerald-500/10 border border-emerald-500/20 p-4.5 rounded-full animate-float">
              <Calendar className="w-10 h-10 text-emerald-400" />
            </div>
            <div className="max-w-md">
              <h5 className="font-display font-extrabold text-white text-base">Graduated Course Calendar</h5>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Outline customizable, visual milestone schedules that adapt to your personal pace. Break deep learning paths into manageable daily checkpoints, achieve XP, and stay on track.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 2: Timeline Tracker */}
      {activeTab === "saved" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar side-bar menu list */}
          <div className="space-y-3">
            <span className="text-[10px] uppercase font-mono tracking-wider font-bold text-slate-500 block pl-1 select-none">
              Your Curriculums ({roadmaps.length})
            </span>
            {roadmaps.map((r) => (
              <div
                key={r.id}
                onClick={() => setSelectedRoadmap(r)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer select-none flex items-center justify-between ${
                  selectedRoadmap?.id === r.id
                    ? "bg-slate-900 shadow-md border-emerald-500/30"
                    : "bg-slate-950/40 border-white/5 hover:border-white/10"
                }`}
              >
                <div>
                  <h5 className="font-display font-black text-xs text-slate-100">
                    {r.subject}
                  </h5>
                  <p className="text-[9px] font-mono text-slate-500 mt-1">
                    Duration: {r.durationDays} Days &bull; Milestones: {r.steps.length}
                  </p>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
              </div>
            ))}
          </div>

          {/* Core Interactive Day Timeline checklist */}
          <div className="lg:col-span-2">
            {selectedRoadmap ? (
              <div className="p-5 md:p-6 bg-slate-900/35 border border-white/10 rounded-2.5xl space-y-5 shadow-xl">
                
                {/* Header overview details */}
                <div className="pb-3 border-b border-white/5 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase select-none">
                      Daily Study Schedule
                    </span>
                    <h4 className="text-base md:text-lg font-display font-black text-white mt-1">
                      {selectedRoadmap.subject}
                    </h4>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] uppercase font-mono text-slate-500 select-none">Efficiency status</p>
                    <p className="text-xs font-bold font-mono text-emerald-400 mt-0.5">
                      Completed: {selectedRoadmap.steps.filter((s: any) => s.completed).length}/{selectedRoadmap.steps.length}
                    </p>
                  </div>
                </div>

                {/* Vertical milestone checklist tree mapping */}
                <div className="space-y-5 relative pl-5">
                  <div className="absolute top-3.5 bottom-3.5 left-2 w-0.5 bg-white/10" />

                  {selectedRoadmap.steps.map((step: any, index: number) => {
                    return (
                      <div
                        key={index}
                        className="relative flex gap-4 p-3 rounded-2xl border border-white/[0.03] bg-slate-950/20 hover:bg-slate-950/50 transition-all cursor-pointer select-none"
                        onClick={() => toggleRoadmapStep(selectedRoadmap.id, index)}
                      >
                        {/* Day / checkpoint circle */}
                        <div className={`absolute -left-6.5 top-5.5 w-3 h-3 rounded-full border-2 ${
                          step.completed
                            ? "bg-emerald-400 border-slate-900"
                            : "bg-slate-950 border-slate-700"
                        }`} />

                        {/* Text details content */}
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] font-mono text-emerald-400 font-bold uppercase tracking-wider bg-emerald-500/10 px-1.5 py-0.5 rounded">
                              Day {step.day || (index + 1)} Target
                            </span>
                          </div>
                          <h5 className={`text-xs font-display font-bold leading-relaxed ${
                            step.completed ? "text-slate-500 line-through" : "text-white"
                          }`}>
                            {step.title}
                          </h5>
                          <p className="text-[11px] text-slate-400 leading-normal font-sans">
                            {step.description}
                          </p>
                        </div>

                        {/* Action checkbox indicator */}
                        <div className="flex items-center justify-center flex-shrink-0 text-emerald-400 pl-2">
                          {step.completed ? (
                            <CheckSquare className="w-5 h-5 fill-emerald-500/10" />
                          ) : (
                            <Square className="w-5 h-5 text-slate-600" />
                          )}
                        </div>

                      </div>
                    );
                  })}
                </div>

              </div>
            ) : (
              <div className="h-full min-h-[300px] border border-white/10 rounded-2.5xl p-6 flex flex-col justify-center items-center text-center select-none space-y-4 bg-slate-900/10">
                <div className="bg-slate-900/50 border border-white/5 p-4 rounded-full">
                  <ListChecks className="w-10 h-10 text-slate-600" />
                </div>
                <div>
                  <h5 className="font-display font-bold text-white text-sm">No curriculum schedules actively selected</h5>
                  <p className="text-xs text-slate-400 mt-2">
                    Design a course path or choose an existing schedule on the left menu.
                  </p>
                </div>
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
};
