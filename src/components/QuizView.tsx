import React, { useState } from "react";
import { useAppState } from "../contexts/StateContext";
import { askAiQuiz } from "../lib/gemini";
import {
  Sparkles,
  Brain,
  HelpCircle,
  Clock,
  ChevronRight,
  Trash2,
  RefreshCw,
  Trophy,
  CheckCircle2,
  XCircle,
  AlertCircle
} from "lucide-react";

export const QuizView: React.FC = () => {
  const { quizzes, saveQuiz, updateQuizScore, addToast } = useAppState();

  // Navigation tabs
  const [activeTab, setActiveTab] = useState<"build" | "saved">("build");

  // Form states
  const [topic, setTopic] = useState("");
  const [amount, setAmount] = useState(5);
  const [difficulty, setDifficulty] = useState("Medium");
  const [generating, setGenerating] = useState(false);

  // Active playing quiz states
  const [playingQuiz, setPlayingQuiz] = useState<any | null>(null);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [scoreCount, setScoreCount] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);

  // Trace execution flow Step 5: UI renders response
  React.useEffect(() => {
    if (playingQuiz) {
      console.info("[Quiz-Flow] Step 5: UI renders active quiz play screen for:", playingQuiz.title, "Questions count:", playingQuiz.questions?.length);
    }
  }, [playingQuiz]);

  // Quiz creation handler
  const handleBuild = async () => {
    if (!topic.trim() || generating) return;
    setGenerating(true);
    try {
      const result = await askAiQuiz(topic, amount, difficulty);
      if (result.title && result.questions) {
        const saved = await saveQuiz(
          result.title,
          result.questions,
          undefined,
          result.isRawResponseFallback,
          result.rawText
        );
        startQuizPlay(saved);
      }
    } catch (err: any) {
      addToast("info", "Compilation Failed ⚠️", `Quiz compilation failed: ${err?.message || "connection error"}`);
    } finally {
      setGenerating(false);
    }
  };

  const startQuizPlay = (quiz: any) => {
    setPlayingQuiz(quiz);
    setCurrentQuestionIdx(0);
    setSelectedIdx(null);
    setIsSubmitted(false);
    setScoreCount(0);
    setQuizFinished(false);
    setActiveTab("saved");
  };

  const handleSubmitAnswer = () => {
    if (selectedIdx === null || isSubmitted) return;
    setIsSubmitted(true);
    
    const currentQuestion = playingQuiz.questions[currentQuestionIdx];
    if (selectedIdx === currentQuestion.correctIdx) {
      setScoreCount((prev) => prev + 1);
    }
  };

  const handleNext = () => {
    if (!isSubmitted) return;
    
    if (currentQuestionIdx < playingQuiz.questions.length - 1) {
      setCurrentQuestionIdx((prev) => prev + 1);
      setSelectedIdx(null);
      setIsSubmitted(false);
    } else {
      // Quiz complete!
      const percent = Math.round((scoreCount / playingQuiz.questions.length) * 100);
      updateQuizScore(playingQuiz.id, percent);
      setQuizFinished(true);
    }
  };

  return (
    <div className="space-y-6 pb-20 select-text">
      {/* Subnav selectors */}
      <div className="flex border-b border-white/10 select-none">
        <button
          onClick={() => {
            setActiveTab("build");
            setPlayingQuiz(null);
          }}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 text-sm font-semibold font-display outline-hidden transition-all ${
            activeTab === "build" && !playingQuiz
              ? "border-emerald-500 text-emerald-400 font-bold"
              : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          <Sparkles className="w-4 h-4" />
          AI Quiz Architect
        </button>
        <button
          onClick={() => setActiveTab("saved")}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 text-sm font-semibold font-display outline-hidden transition-all ${
            activeTab === "saved" || playingQuiz
              ? "border-emerald-500 text-emerald-400 font-bold"
              : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          <Brain className="w-4 h-4" />
          Active Classroom Playgrounds
        </button>
      </div>

      {/* RENDER INACTIVE QUIZ BUILD FORM */}
      {activeTab === "build" && !playingQuiz && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-2 space-y-4 bg-slate-900/40 border border-white/10 p-5 rounded-2.5xl h-fit">
            <h4 className="font-display font-bold text-slate-100 flex items-center gap-2">
              <Brain className="w-4 h-4 text-emerald-400 animate-pulse" />
              Syllabus Assessment Center
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed select-none">
              Generate customizable interactive quizzes dynamically using Gemini. Challenge your conceptual comprehension and unlock Coins/XP.
            </p>

            <div className="space-y-4.5 pt-2">
              <div>
                <label className="block text-[10px] uppercase font-mono tracking-wider font-bold text-slate-400 mb-1.5 select-none">
                  Assess Topic
                </label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. neurobiology, Javascript ES6, world war 1..."
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-xs font-semibold text-white outline-hidden focus:border-emerald-500/50 transition-all font-display"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-mono tracking-wider font-bold text-slate-400 mb-1.5 select-none">
                  Assess Question Amount
                </label>
                <select
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-xs font-semibold text-slate-300 outline-hidden focus:border-emerald-500/50 transition-all font-mono"
                >
                  <option value="3">3 questions</option>
                  <option value="5">5 questions</option>
                  <option value="8">8 questions</option>
                  <option value="10">10 questions</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-mono tracking-wider font-bold text-slate-400 mb-1.5 select-none">
                  Assessment Complexity
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {["Easy", "Medium", "Hard"].map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setDifficulty(lvl)}
                      className={`px-2 py-1.5 rounded-lg text-[10px] font-mono font-bold capitalize transition-all border ${
                        difficulty === lvl
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/40"
                          : "bg-slate-950/40 text-slate-400 border-white/5 hover:bg-slate-950"
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleBuild}
                disabled={!topic.trim() || generating}
                className="w-full py-3.5 bg-gradient-to-tr from-emerald-500 to-sky-400 hover:from-emerald-600 hover:to-sky-500 text-slate-950 hover:text-white disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 font-display font-black text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-2 select-none animate-shimmer"
              >
                {generating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Generating Interactive Quiz...
                  </>
                ) : (
                  <>
                    <Brain className="w-4 h-4" />
                    Synthesize Smart Quiz &middot; +50 XP
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="lg:col-span-3 min-h-[300px] border border-white/10 rounded-2.5xl p-6.5 bg-slate-900/30 flex flex-col justify-center items-center text-center select-none space-y-4">
            <div className="bg-emerald-500/10 border border-emerald-500/20 p-5 rounded-full animate-float">
              <Brain className="w-10 h-10 text-emerald-400" />
            </div>
            <div className="max-w-md">
              <h5 className="font-display font-extrabold text-white text-base">Graded Playground Incubator</h5>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Design custom adaptive syllabus test suites. Ace multi-choice questions covering any subject, review answers with prompt AI logs, and increment daily streak ranks.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* RENDER ACTIVE CLASSROOM PLAYGROUND SELECTOR OR ACTIVE PLAY COIL */}
      {(activeTab === "saved" || playingQuiz) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* List existing quizzes */}
          {!playingQuiz && (
            <div className="lg:col-span-3 space-y-4 pr-1">
              <span className="text-[10px] uppercase font-mono tracking-wider font-bold text-slate-500 block pl-1 select-none">
                Syllabus Test Sheets ({quizzes.length})
              </span>
              {quizzes.length === 0 ? (
                <div className="text-center py-10 border border-white/10 bg-slate-900/35 rounded-2.5xl">
                  <p className="text-sm text-slate-400">No test sheets compiled. Create one!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {quizzes.map((q) => (
                    <div
                      key={q.id}
                      className="p-5 rounded-2.5xl bg-slate-900/40 border border-white/10 hover:border-emerald-500/30 flex items-center justify-between shadow-lg transition-all"
                    >
                      <div className="space-y-1">
                        <span className="text-[9px] font-mono bg-purple-500/15 px-2 py-0.5 rounded text-purple-300 border border-purple-500/20 uppercase font-extrabold">
                          SaaS Exam Paper
                        </span>
                        <h5 className="font-display font-black text-sm text-slate-100 pt-1">
                          {q.title}
                        </h5>
                        <p className="text-[10px] text-slate-400 font-mono">
                          Questions: {q.questions.length} &middot; Last score: {q.score !== undefined ? `${q.score}%` : "Not taken"}
                        </p>
                      </div>
                      <button
                        onClick={() => startQuizPlay(q)}
                        className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-display font-extrabold text-xs rounded-xl max-h-9 transition shadow-md select-none"
                      >
                        Play Board
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* PLAYGROUND GAME INTERACTIVE SCREEN */}
          {playingQuiz && (
            <div className="lg:col-span-3">
              {!quizFinished ? (
                <div className="max-w-xl mx-auto p-5 md:p-6 bg-slate-900/45 border border-white/10 rounded-2.5xl space-y-5 shadow-xl select-none">
                  
                  {playingQuiz.isRawResponseFallback && (
                    <div className="p-4 bg-amber-500/10 border border-amber-500/20 text-amber-300 rounded-2.5xl text-xs space-y-1 font-display">
                      <span className="font-bold flex items-center gap-1.5 text-amber-400 text-xs">⚠️ Warning:</span>
                      <span>Unable to generate structured quiz. Showing generated content.</span>
                    </div>
                  )}

                  {/* Progress Indicator */}
                  <div className="flex items-center justify-between pb-3 border-b border-white/5">
                    <h5 className="font-display font-extrabold text-xs text-slate-300 truncate pr-5">
                      Playing: {playingQuiz.title}
                    </h5>
                    <span className="font-mono text-[11px] font-medium text-emerald-400 whitespace-nowrap">
                      Question {currentQuestionIdx + 1} of {playingQuiz.questions.length}
                    </span>
                  </div>

                  {/* Progress bar line */}
                  <div className="w-full h-1.5 bg-slate-950 border border-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-400 transition-all duration-300"
                      style={{ width: `${((currentQuestionIdx) / playingQuiz.questions.length) * 100}%` }}
                    ></div>
                  </div>

                  {/* Question description */}
                  <div className="py-2">
                    <h4 className="text-sm md:text-base font-semibold text-white leading-relaxed font-sans">
                      {playingQuiz.questions[currentQuestionIdx].question}
                    </h4>
                  </div>

                  {/* 4 Multi-choice options listing */}
                  <div className="space-y-2.5">
                    {playingQuiz.questions[currentQuestionIdx].options.map((option: string, i: number) => {
                      const isSelected = selectedIdx === i;
                      const isCorrectAnswer = playingQuiz.questions[currentQuestionIdx].correctIdx === i;
                      let bgClass = "bg-slate-950/60 border-white/5 hover:border-white/15";
                      
                      if (isSelected && !isSubmitted) {
                        bgClass = "bg-emerald-500/10 border-emerald-500 text-emerald-300";
                      } else if (isSubmitted) {
                        if (isCorrectAnswer) {
                          bgClass = "bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold";
                        } else if (isSelected) {
                          bgClass = "bg-red-500/20 border-red-500 text-red-300";
                        }
                      }

                      return (
                        <button
                          key={i}
                          onClick={() => !isSubmitted && setSelectedIdx(i)}
                          disabled={isSubmitted}
                          className={`w-full text-left p-4.5 rounded-xl border transition-all text-xs font-medium leading-relaxed font-sans flex items-center justify-between ${bgClass}`}
                        >
                          <div className="flex gap-3.5 items-center">
                            <span className="font-mono text-slate-500 uppercase font-bold text-[10px] w-4.5 h-4.5 rounded-md bg-white/[0.03] border border-white/5 flex items-center justify-center">
                              {String.fromCharCode(97 + i)}
                            </span>
                            <span>{option}</span>
                          </div>
                          {isSubmitted && isCorrectAnswer && <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />}
                          {isSubmitted && isSelected && !isCorrectAnswer && <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />}
                        </button>
                      );
                    })}
                  </div>

                  {/* Reveal AI explanation feedback bubble */}
                  {isSubmitted && (
                    <div className="p-4 rounded-xl bg-slate-950 border border-white/5 space-y-1.5 animate-fadeIn">
                      <div className="flex items-center gap-1.5 font-display font-extrabold text-[11px] text-emerald-400">
                        <AlertCircle className="w-3.5 h-3.5" />
                        AI TEACHER FEEDBACK:
                      </div>
                      <p className="text-[11px] text-slate-300 font-sans leading-relaxed">
                        {playingQuiz.questions[currentQuestionIdx].explanation}
                      </p>
                    </div>
                  )}

                  {/* Active playing navigators */}
                  <div className="flex justify-end pt-3 border-t border-white/5">
                    {!isSubmitted ? (
                      <button
                        onClick={handleSubmitAnswer}
                        disabled={selectedIdx === null}
                        className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-display font-bold text-xs rounded-xl transition duration-200"
                      >
                        Check Answer
                      </button>
                    ) : (
                      <button
                        onClick={handleNext}
                        className="px-4 py-2 bg-gradient-to-tr from-emerald-500 to-sky-400 hover:from-emerald-600 hover:to-sky-500 text-slate-950 hover:text-white font-display font-medium text-xs rounded-xl flex items-center gap-1"
                      >
                        {currentQuestionIdx < playingQuiz.questions.length - 1 ? "Next step" : "Complete quiz & check scores"}
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                </div>
              ) : (
                /* FINISHED GAME SCORING SUMMARY PAGE */
                <div className="max-w-sm mx-auto p-8 bg-slate-900 border border-white/10 rounded-2.5xl text-center shadow-xl space-y-6 animate-fadeIn">
                  <div className="inline-flex bg-amber-500/10 border border-amber-500/35 p-5 rounded-full animate-float">
                    <Trophy className="w-12 h-12 text-amber-400" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20 font-bold uppercase select-none">
                      Daily session completed
                    </span>
                    <h4 className="text-xl font-display font-black text-white mt-3">
                      Quiz Completed!
                    </h4>
                  </div>

                  <div className="p-4 bg-slate-950/70 border border-white/5 rounded-xl flex items-center justify-around">
                    <div>
                      <p className="text-[10px] uppercase font-mono text-slate-500">Correct answers</p>
                      <h4 className="text-lg font-black font-display text-emerald-400 mt-0.5">
                        {scoreCount} / {playingQuiz.questions.length}
                      </h4>
                    </div>
                    <div className="w-px h-8 bg-white/10" />
                    <div>
                      <p className="text-[10px] uppercase font-mono text-slate-500">Graded Score</p>
                      <h4 className="text-lg font-black font-display text-emerald-400 mt-0.5">
                        {Math.round((scoreCount / playingQuiz.questions.length) * 100)}%
                      </h4>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <button
                      onClick={() => startQuizPlay(playingQuiz)}
                      className="w-full py-3 bg-slate-850 hover:bg-slate-800 border border-white/5 hover:border-white/10 text-white rounded-xl text-xs font-bold font-display transition-all"
                    >
                      Replay exam
                    </button>
                    <button
                      onClick={() => {
                        setPlayingQuiz(null);
                        setActiveTab("build");
                      }}
                      className="w-full py-3 bg-gradient-to-tr from-emerald-500 to-sky-400 hover:from-emerald-600 hover:to-sky-500 text-slate-950 rounded-xl text-xs font-black font-display transition shadow-md"
                    >
                      Classroom Home
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      )}
    </div>
  );
};
