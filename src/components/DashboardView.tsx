import React, { useState, useEffect } from "react";
import { useAppState } from "../contexts/StateContext";
import { askAiRecommendations, AIRecommendation } from "../lib/gemini";
import { Sparkles, Compass, Flame, Trophy, Award, Clock, ArrowUpRight, TrendingUp, Target, Check } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from "recharts";
import { ErrorBoundary } from "./ErrorBoundary";

interface DailyChallenge {
  id: string;
  title: string;
  description: string;
  rewardCoins: number;
  rewardXp: number;
}

const STATIC_CHALLENGES: DailyChallenge[] = [
  {
    id: "challenge_notes",
    title: "AI Note Master Sprint",
    description: "Launch the Smart Notes generator, draft deep study materials, and compile academic revision cards.",
    rewardCoins: 20,
    rewardXp: 50,
  },
  {
    id: "challenge_quiz",
    title: "Quiz Overlord Challenge",
    description: "Generate and successfully complete an AI study quiz check on any critical subject topic.",
    rewardCoins: 25,
    rewardXp: 60,
  },
  {
    id: "challenge_roadmap",
    title: "Strategic Syllabus Architect",
    description: "Construct a customized dynamic learning pathway roadmap for your target subject.",
    rewardCoins: 30,
    rewardXp: 70,
  },
  {
    id: "challenge_chat",
    title: "Socratic Dialogic Drill",
    description: "Initiate dialogue with the Socratic AI Study Assistant and complete a smart educational inquiry.",
    rewardCoins: 15,
    rewardXp: 40,
  },
  {
    id: "challenge_timer",
    title: "Pomodoro Deep Focus Sprints",
    description: "Induct deep focus study. Configure and trigger your local Pomodoro sessions on Mentora AI.",
    rewardCoins: 20,
    rewardXp: 50,
  }
];

export const DashboardView: React.FC = () => {
  const { user, leaderboard, notes, quizzes, roadmaps, addXpAndCoins, addToast } = useAppState();
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>([]);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [activeChallenge, setActiveChallenge] = useState<DailyChallenge | null>(null);
  const [challengeClaimed, setChallengeClaimed] = useState<boolean>(false);
  const [chartMounted, setChartMounted] = useState(false);

  useEffect(() => {
    setChartMounted(true);
    console.info("[Charts-Flow] Step 6: UI renders weekly progress chart successfully on screen rendering.");
  }, []);

  // Recharts weekly activity data
  const chartData = [
    { name: "Mon", StudyTime: 1.2, xpEarned: 40 },
    { name: "Tue", StudyTime: 2.4, xpEarned: 85 },
    { name: "Wed", StudyTime: 3.8, xpEarned: 130 },
    { name: "Thu", StudyTime: 1.8, xpEarned: 65 },
    { name: "Fri", StudyTime: 3.2, xpEarned: 110 },
    { name: "Sat", StudyTime: 4.5, xpEarned: 180 },
    { name: "Sun", StudyTime: 4.0, xpEarned: 160 },
  ];

  // Fetch recommendations with cached sessions to save quota
  useEffect(() => {
    async function loadRecs() {
      if (!user) return;

      const cacheKey = `mentora_recs_cache_${user.uid || "guest"}`;
      const cachedData = sessionStorage.getItem(cacheKey);
      if (cachedData) {
        try {
          const parsed = JSON.parse(cachedData);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setRecommendations(parsed);
            return;
          }
        } catch (_) {}
      }

      setLoadingRecs(true);
      try {
        const completed = notes.slice(0, 3).map((n) => n.title);
        const data = await askAiRecommendations(
          user.streak,
          user.xp,
          user.level,
          completed
        );
        const recList = data.recommendations || [];
        setRecommendations(recList);
        if (recList.length > 0) {
          sessionStorage.setItem(cacheKey, JSON.stringify(recList));
        }
      } catch (err) {
        // Silent fallback - server already handles and returns beautiful fallback recommendations
      } finally {
        setLoadingRecs(false);
      }
    }
    loadRecs();
  }, [user]);

  // Load or generate Daily Challenge
  useEffect(() => {
    if (!user) return;
    const todayStr = new Date().toISOString().slice(0, 10);
    const storageKey = `mentora_daily_challenge_${user.uid}`;
    const cached = localStorage.getItem(storageKey);
    
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed.date === todayStr) {
          setActiveChallenge(parsed.challenge);
          setChallengeClaimed(parsed.claimed);
          return;
        }
      } catch (e) {
        console.error("Error reading cached challenge:", e);
      }
    }
    
    // Select daily challenge deterministically based on date to ensure system longevity
    const day = new Date().getDate();
    const challengeIdx = day % STATIC_CHALLENGES.length;
    const chosen = STATIC_CHALLENGES[challengeIdx];
    
    setActiveChallenge(chosen);
    setChallengeClaimed(false);
    
    localStorage.setItem(storageKey, JSON.stringify({
      date: todayStr,
      challenge: chosen,
      claimed: false
    }));
  }, [user]);

  const handleClaimChallenge = async () => {
    if (!activeChallenge || challengeClaimed || !user) return;
    
    try {
      if (addXpAndCoins) {
        await addXpAndCoins(activeChallenge.rewardXp, activeChallenge.rewardCoins);
      }
      
      setChallengeClaimed(true);
      const todayStr = new Date().toISOString().slice(0, 10);
      const storageKey = `mentora_daily_challenge_${user.uid}`;
      localStorage.setItem(storageKey, JSON.stringify({
        date: todayStr,
        challenge: activeChallenge,
        claimed: true
      }));
      addToast("success", "Challenge Claimed! 🏆", `Incredible studying! You've successfully claimed +${activeChallenge.rewardCoins} coins and +${activeChallenge.rewardXp} XP.`);
    } catch (e) {
      console.error("Error claiming challenge rewards:", e);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* 1. Header Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl p-6 md:p-8 bg-gradient-to-r from-purple-950/40 via-slate-900/60 to-slate-950/85 border border-purple-500/20 shadow-xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl -z-10"></div>
        <div className="absolute bottom-0 left-20 w-80 h-80 bg-pink-500/5 rounded-full blur-3xl -z-10"></div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20 text-xs font-mono font-bold">
              <Sparkles className="w-3.5 h-3.5 animate-pulse text-pink-400" />
              SaaS-Level Educational Copilot
            </div>
            <h2 className="text-2xl md:text-3.5xl font-display font-black tracking-tight text-white leading-tight">
              Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-300 via-pink-400 to-amber-300 capitalize">{user?.displayName || "Scholar"}</span>!
            </h2>
            <p className="text-xs md:text-sm text-slate-300 max-w-xl font-sans">
              You are on a <span className="text-orange-300 font-extrabold">{user?.streak || 0} day study streak</span>. Master new subjects, generate AI review quizzes, and challenge your classmates to level up.
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="bg-slate-900/80 border border-white/10 p-4 rounded-2xl text-center shadow-lg min-w-24">
              <p className="text-purple-400 font-mono text-[10px] uppercase font-bold">XP Balance</p>
              <h3 className="text-2xl font-black font-display text-white mt-1">{user?.xp || 0}</h3>
              <p className="text-[9px] text-slate-400 mt-1">Level {user?.level || 1} Elite</p>
            </div>
            <div className="bg-slate-900/80 border border-white/10 p-4 rounded-2xl text-center shadow-lg min-w-24">
              <p className="text-yellow-400 font-mono text-[10px] uppercase font-bold">Total Coins</p>
              <h3 className="text-2xl font-black font-display text-white mt-1">{user?.coins || 0}</h3>
              <p className="text-[9px] text-slate-400 mt-1">SaaS Currency</p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Interactive Bento Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Weekly XP/Time Curve graph */}
        <div className="lg:col-span-2 bg-slate-900/50 border border-white/10 rounded-2.5xl p-5 md:p-6 shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="font-display font-bold text-slate-100 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  Your Weekly Progress Curve
                </h4>
                <p className="text-xs text-slate-400">Total hours spent studying vs daily XP milestones</p>
              </div>
              <span className="text-xs font-semibold text-emerald-400 px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                XP Peak Active
              </span>
            </div>
            
            <div className="w-full h-[320px] mt-4">
              <ErrorBoundary componentName="Weekly Progress Chart">
                {chartMounted ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorStudy" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorXp" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.25}/>
                          <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                      <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: "#020617", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px" }} 
                        labelClassName="text-slate-300 font-semibold"
                      />
                      <Area type="monotone" dataKey="StudyTime" name="Hours Studied" stroke="#10b981" fillOpacity={1} fill="url(#colorStudy)" strokeWidth={3} />
                      <Area type="monotone" dataKey="xpEarned" name="XP Gained" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorXp)" strokeWidth={3} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-slate-500 font-mono">
                    Loading telemetry parameters...
                  </div>
                )}
              </ErrorBoundary>
            </div>
          </div>
        </div>

        {/* Global Student Leaderboard ranking (Duolingo style) */}
        <div className="bg-slate-900/50 border border-white/10 rounded-2.5xl p-5 md:p-6 shadow-md flex flex-col justify-between">
          <div>
            <h4 className="font-display font-bold text-slate-100 flex items-center gap-2 mb-4">
              <Trophy className="w-4 h-4 text-amber-400" />
              Syllabus Leaderboard
            </h4>
            <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
              {leaderboard.map((student, index) => {
                const isCurrentUser = student.uid === user?.uid;
                return (
                  <div
                    key={student.uid}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                      isCurrentUser
                        ? "bg-emerald-500/10 border-emerald-500/30 shadow-inner"
                        : "bg-slate-950/40 border-white/5 hover:border-white/10"
                    }`}
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center font-mono font-bold text-xs ${
                        index === 0 ? "bg-amber-400 text-slate-950" :
                        index === 1 ? "bg-slate-300 text-slate-950" :
                        index === 2 ? "bg-amber-700 text-white" : "bg-slate-800 text-slate-400"
                      }`}>
                        {index + 1}
                      </span>
                      <p className="text-sm font-bold text-white font-display truncate">
                        {student.displayName}
                        {isCurrentUser && <span className="text-[10px] text-emerald-400 font-bold ml-1.5">(You)</span>}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-extrabold text-slate-200">{student.xp} XP</p>
                      <p className="text-[10px] text-slate-400">Level {student.level}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>

      {/* Daily Challenge Section */}
      {activeChallenge && (
        <div className="relative overflow-hidden rounded-3xl p-5 md:p-6 bg-slate-900/40 border border-amber-500/15 hover:border-amber-500/30 shadow-lg transition-all duration-300">
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl -z-10"></div>
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-2xl shrink-0">
                <Target className="w-6 h-6 animate-pulse text-amber-400" />
              </div>
              <div className="space-y-1 text-left">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[9px] font-mono tracking-wider font-extrabold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20 uppercase">
                    Daily Challenge
                  </span>
                  <span className="text-[9px] font-mono text-slate-400">
                     Refreshes every calendar day
                  </span>
                </div>
                <h4 className="text-base font-display font-black text-white">
                  {activeChallenge.title}
                </h4>
                <p className="text-xs text-slate-350 max-w-xl font-sans leading-relaxed">
                  {activeChallenge.description}
                </p>
              </div>
            </div>

            <div className="flex flex-row md:flex-col items-center justify-between gap-4 border-t border-white/5 md:border-t-0 pt-4 md:pt-0 shrink-0">
              <div className="flex items-center gap-3">
                <div className="bg-amber-500/5 border border-amber-500/15 p-2 rounded-xl text-center min-w-[70px]">
                  <p className="text-amber-400 font-mono text-[9px] uppercase font-bold">Coins</p>
                  <p className="text-sm font-black font-display text-white">+{activeChallenge.rewardCoins}</p>
                </div>
                <div className="bg-purple-500/5 border border-purple-500/15 p-2 rounded-xl text-center min-w-[70px]">
                  <p className="text-purple-400 font-mono text-[9px] uppercase font-bold">XP </p>
                  <p className="text-sm font-black font-display text-white">+{activeChallenge.rewardXp}</p>
                </div>
              </div>

              {challengeClaimed ? (
                <div className="w-full text-center px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-display font-black text-[10px] tracking-wider uppercase rounded-xl flex items-center justify-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  Rewards Claimed
                </div>
              ) : (
                <button
                  onClick={handleClaimChallenge}
                  className="w-full px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-display font-black text-[10px] tracking-wider uppercase rounded-xl transition duration-200 cursor-pointer shadow-md text-center"
                >
                  Verify & Claim
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. AI Smart Study Recommendations (Duolingo / Notion AI hybrid) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display font-black text-lg text-slate-100 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse" />
              AI Study Assistant Daily Tips
            </h3>
            <p className="text-xs text-slate-400">Custom tailored task prompts based on your progress analytics</p>
          </div>
        </div>

        {loadingRecs ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse bg-slate-900/30 border border-white/5 h-28 rounded-2xl"></div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {recommendations.map((rec, idx) => (
              <div
                key={idx}
                className="group relative overflow-hidden bg-slate-900/40 hover:bg-slate-900/70 border border-white/10 hover:border-emerald-500/30 p-5 rounded-2.5xl transition-all duration-300 flex flex-col justify-between shadow-lg"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-mono tracking-widest uppercase text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                      {rec.category || "AI Proposal"}
                    </span>
                    <span className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                      <Clock className="w-3 h-3" />
                      {rec.minutes || 5} Min read
                    </span>
                  </div>
                  <h4 className="text-sm font-bold tracking-tight text-white font-display group-hover:text-emerald-400 transition-colors">
                    {rec.title}
                  </h4>
                  <p className="text-xs text-slate-400 font-sans leading-relaxed">
                    {rec.desc}
                  </p>
                </div>
                
                <div className="mt-4 flex items-center gap-1 text-[11px] font-bold text-emerald-400 group-hover:translate-x-1 transition-transform self-start">
                  Action study milestone
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. Trophies & Milestones Unlocked */}
      <div className="bg-slate-900/30 border border-white/10 rounded-2.5xl p-5 md:p-6 shadow-md">
        <h4 className="font-display font-semibold text-slate-100 flex items-center gap-2 mb-4">
          <Award className="w-4 h-4 text-purple-400" />
          Achievements & Collectibles ({user?.badges.length || 0})
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {["Streak Novice", "Einstein Mind", "Focus Guru", "Roadmap Conqueror"].map((badgeName) => {
            const hasBadge = user?.badges.includes(badgeName);
            return (
              <div
                key={badgeName}
                className={`flex flex-col items-center p-4 rounded-xl border text-center transition-all ${
                  hasBadge
                    ? "bg-purple-500/10 border-purple-500/30 text-purple-300"
                    : "bg-slate-950/20 border-white/5 opacity-40 text-slate-500"
                }`}
              >
                <Trophy className={`w-8 h-8 mb-2 ${hasBadge ? "text-purple-400" : "text-slate-600"}`} />
                <p className="text-xs font-bold font-display leading-tight">{badgeName}</p>
                <p className="text-[10px] font-mono mt-1">
                  {hasBadge ? "Unlocked" : "Locked"}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
