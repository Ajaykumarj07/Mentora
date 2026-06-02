import React, { useState } from "react";
import { useAppState } from "../contexts/StateContext";
import { askAiNotes, askAiDocumentSummary } from "../lib/gemini";
import Markdown from "react-markdown";
import {
  Sparkles,
  BookOpen,
  FileText,
  Upload,
  Layers,
  CheckCircle,
  Clock,
  ChevronRight,
  ChevronLeft,
  Trash2,
  RefreshCw,
  Eye,
  ArrowRight,
  Check
} from "lucide-react";

export const SmartNotesView: React.FC = () => {
  const { notes, saveNote, deleteNote, addXpAndCoins, addToast } = useAppState();
  
  // Tab states
  const [activeSubTab, setActiveSubTab] = useState<"generate" | "pdf" | "saved">("generate");
  const [selectedNote, setSelectedNote] = useState<any | null>(notes[0] || null);

  // Trace execution flow Step 5: UI renders response
  React.useEffect(() => {
    if (selectedNote) {
      console.info("[Notes-Flow] Step 5: UI renders active compiled lesson note:", selectedNote.title);
    }
  }, [selectedNote]);
  
  // Note Generation Form State
  const [topic, setTopic] = useState("");
  const [detailLevel, setDetailLevel] = useState("intermediate");
  const [customRules, setCustomRules] = useState("");
  const [generating, setGenerating] = useState(false);

  // Document/PDF state
  const [docName, setDocName] = useState("");
  const [docText, setDocText] = useState("");
  const [summarizing, setSummarizing] = useState(false);
  const [summaryResult, setSummaryResult] = useState<any | null>(null);

  // Flashcards state
  const [activeCardIdx, setActiveCardIdx] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  // Note generation handler
  const handleGenerate = async () => {
    if (!topic.trim() || generating) return;
    setGenerating(true);
    try {
      const result = await askAiNotes(topic, detailLevel, customRules);
      if (result.title) {
        const savedNew = await saveNote(
          result.title,
          result.content || "",
          result.summary || "",
          result.flashcards || [],
          result.isRawResponseFallback,
          result.rawText
        );
        setSelectedNote(savedNew);
        setActiveSubTab("saved");
        setTopic("");
        setCustomRules("");
      }
    } catch (err: any) {
      addToast("info", "Generation Failed ⚠️", `Note generation failed: ${err?.message || "rate limit or connection issue"}`);
    } finally {
      setGenerating(false);
    }
  };

  // Document summarization handler
  const handleSummarize = async () => {
    if (!docText.trim() || summarizing) return;
    setSummarizing(true);
    try {
      const result = await askAiDocumentSummary(docName || "Uploaded PDF Lesson", docText);
      setSummaryResult(result);
    } catch (err: any) {
      addToast("info", "Analysis Interrupted ⚠️", `Document summary failed: ${err?.message || "connection timeout"}`);
    } finally {
      setSummarizing(false);
    }
  };

  // Save synthesized summary as a full Note
  const saveSummaryAsNote = async () => {
    if (!summaryResult) return;
    const bulletList = summaryResult.extractedKeypoints.map((pt: string) => `• ${pt}`).join("\n");
    const formattedNotesText = `### AI Synthesized Lesson: ${docName || "Custom Document"}\n\nThis material was summarized to optimize your study sessions.\n\n### Core Extract Takeaways\n\n${summaryResult.extractedKeypoints.map((pt: string, i: number) => `${i + 1}. **Concept**: ${pt}`).join("\n\n")}\n\n_Generated through the Document Synthesizer._`;
    
    // Auto-create flashcards for the summarized notes
    const cards = summaryResult.extractedKeypoints.slice(0, 3).map((pt: string, idx: number) => ({
      front: `Keynote concept query ${idx + 1} is associated with:`,
      back: pt
    }));

    const saved = await saveNote(
      summaryResult.summaryTitle || docName || "Document Summary",
      formattedNotesText,
      bulletList,
      cards
    );
    setSelectedNote(saved);
    setSummaryResult(null);
    setDocName("");
    setDocText("");
    setActiveSubTab("saved");
  };

  return (
    <div className="space-y-6 pb-20 select-text">
      {/* Tab Select Controller */}
      <div className="flex border-b border-white/10 select-none">
        <button
          onClick={() => setActiveSubTab("generate")}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 text-sm font-semibold font-display outline-hidden transition-all ${
            activeSubTab === "generate"
              ? "border-emerald-500 text-emerald-400 font-bold"
              : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          <Sparkles className="w-4 h-4" />
          AI Notes Compiler
        </button>
        <button
          onClick={() => setActiveSubTab("pdf")}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 text-sm font-semibold font-display outline-hidden transition-all ${
            activeSubTab === "pdf"
              ? "border-emerald-500 text-emerald-400 font-bold"
              : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          <FileText className="w-4 h-4" />
          PDF/Text Summarizer
        </button>
        <button
          onClick={() => setActiveSubTab("saved")}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 text-sm font-semibold font-display outline-hidden transition-all ${
            activeSubTab === "saved"
              ? "border-emerald-500 text-emerald-400 font-bold"
              : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          <BookOpen className="w-4 h-4" />
          Lesson Directory ({notes.length})
        </button>
      </div>

      {/* SUBTAB 1: AI Note Generation */}
      {activeSubTab === "generate" && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-2 space-y-4 bg-slate-900/40 border border-white/10 p-5 rounded-2.5xl h-fit">
            <h4 className="font-display font-bold text-slate-100 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              Build a New Study Guide
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed select-none">
              Input any topic to generate comprehensive detailed student textbooks paired with bullet reviews and active spaced-repetition cards instantly.
            </p>

            <div className="space-y-4.5 pt-2">
              <div>
                <label className="block text-[10px] uppercase font-mono tracking-wider font-bold text-slate-400 mb-1.5 select-none">
                  Tackle Topic
                </label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. quantum superposition, organic cell structures..."
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-xs font-semibold text-white outline-hidden focus:border-emerald-500/50 transition-all font-display"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-mono tracking-wider font-bold text-slate-400 mb-1.5 select-none">
                  Syllabus Grade Level
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {["beginner", "intermediate", "advanced"].map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setDetailLevel(lvl)}
                      className={`px-2 py-1.5 rounded-lg text-[10px] font-mono font-bold capitalize transition-all border ${
                        detailLevel === lvl
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/40"
                          : "bg-slate-950/40 text-slate-400 border-white/5 hover:bg-slate-950"
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-mono tracking-wider font-bold text-slate-400 mb-1.5 select-none">
                  Custom guidelines (Optional)
                </label>
                <textarea
                  value={customRules}
                  onChange={(e) => setCustomRules(e.target.value)}
                  rows={2}
                  placeholder="e.g. emphasize mathematical formulas, include concrete JS code samples"
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-xs font-semibold text-white outline-hidden focus:border-emerald-500/50 transition-all font-sans"
                />
              </div>

              <button
                onClick={handleGenerate}
                disabled={!topic.trim() || generating}
                className="w-full py-3.5 bg-gradient-to-tr from-emerald-500 to-sky-400 hover:from-emerald-600 hover:to-sky-500 text-slate-950 hover:text-white disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 font-display font-black text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-2 select-none"
              >
                {generating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Synthesizing Knowledge Graphs...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Generate smart lessons &middot; +35 XP
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="lg:col-span-3 min-h-[300px] border border-white/10 rounded-2.5xl p-6.5 bg-slate-900/30 flex flex-col justify-center items-center text-center select-none space-y-4">
            <div className="bg-emerald-500/10 border border-emerald-500/20 p-4.5 rounded-full animate-float">
              <BookOpen className="w-10 h-10 text-emerald-400" />
            </div>
            <div className="max-w-md">
              <h5 className="font-display font-extrabold text-white text-base">Your Active Textbook Playground</h5>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Compile notes about chemistry formulas, historic timelines, or advanced server states. The AI gathers authoritative frameworks, summarizes them, and organizes active cards to help make review quick.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 2: PDF/Text Summarizer */}
      {activeSubTab === "pdf" && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-2 space-y-4 bg-slate-900/40 border border-white/10 p-5 rounded-2.5xl h-fit">
            <h4 className="font-display font-bold text-slate-100 flex items-center gap-2">
              <Upload className="w-4 h-4 text-emerald-400" />
              Analyze Syllabus Material
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed select-none">
              Paste textbook paragraphs, copy-pastes of slide contents, or raw notes. The AI parses the material instantly into concise study bullet lists.
            </p>

            <div className="space-y-45 pt-2">
              <div>
                <label className="block text-[10px] uppercase font-mono tracking-wider font-bold text-slate-400 mb-1.5 select-none">
                  Document / Lesson Name
                </label>
                <input
                  type="text"
                  value={docName}
                  onChange={(e) => setDocName(e.target.value)}
                  placeholder="e.g. Organic Chemistry Chapter 2"
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-xs font-semibold text-white outline-hidden focus:border-emerald-500/50 transition-all font-display font-bold"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-mono tracking-wider font-bold text-slate-400 mb-1.5 select-none">
                  Pasted Material Content
                </label>
                <textarea
                  value={docText}
                  onChange={(e) => setDocText(e.target.value)}
                  rows={6}
                  placeholder="Paste study paragraphs, presentation texts, or transcripts..."
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-xs font-semibold text-white outline-hidden focus:border-emerald-500/50 transition-all font-sans leading-relaxed"
                />
              </div>

              <button
                onClick={handleSummarize}
                disabled={!docText.trim() || summarizing}
                className="w-full py-3.5 bg-slate-850 hover:bg-slate-800 disabled:bg-slate-905 border border-white/10 text-white disabled:text-slate-500 font-display font-black text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-2 select-none"
              >
                {summarizing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Compiling bullet takeaways...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Analyze Study Material
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="lg:col-span-3 border border-white/10 rounded-2.5xl p-6.5 bg-slate-900/30 min-h-[300px]">
            {summaryResult ? (
              <div className="space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <div>
                    <h5 className="font-display font-black text-white text-base">
                      {summaryResult.summaryTitle}
                    </h5>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-emerald-400 font-mono font-bold bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                        AI Compiled
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {summaryResult.estimatedReadTimeMinutes} Min study time
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={saveSummaryAsNote}
                    className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-xl text-xs font-bold font-display transition shadow-sm select-none"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Save as Note Guide
                  </button>
                </div>

                <div className="space-y-4">
                  <h6 className="font-display font-bold text-xs text-slate-300 select-none">EXECUTIVE KEY POINTS:</h6>
                  <ul className="space-y-3 pl-1">
                    {summaryResult.extractedKeypoints.map((pt: string, i: number) => (
                      <li key={i} className="flex gap-2.5 items-start text-xs text-slate-300 font-sans leading-relaxed">
                        <span className="p-1 rounded-sm bg-emerald-500/20 text-emerald-400 font-mono font-bold text-[8px] mt-0.5">
                          {i + 1}
                        </span>
                        <span>{pt}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col justify-center items-center text-center select-none space-y-4 py-8">
                <div className="bg-slate-900/50 border border-white/5 p-4.5 rounded-full animate-float">
                  <FileText className="w-10 h-10 text-slate-500" />
                </div>
                <div className="max-w-md">
                  <h5 className="font-display font-bold text-white text-sm">Synthesized Bullets Board</h5>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                    Paste content on the left pane and compile summary structures. You can seamlessly convert synthesized bullet guides into saved textbook lessons containing spaced cards with a single mouse click!
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUBTAB 3: Saved Notes List / Flip Flashcards Screen */}
      {activeSubTab === "saved" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Notes sidebar selection directory */}
          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
            <span className="text-[10px] uppercase font-mono tracking-wider font-bold text-slate-500 block mb-1 pl-1 select-none">
              Saved Course Materials ({notes.length})
            </span>
            {notes.map((note) => (
              <div
                key={note.id}
                onClick={() => {
                  setSelectedNote(note);
                  setActiveCardIdx(0);
                  setIsFlipped(false);
                }}
                className={`relative group p-4 rounded-2xl border transition-all cursor-pointer select-none ${
                  selectedNote?.id === note.id
                    ? "bg-slate-900 shadow-md border-emerald-500/30"
                    : "bg-slate-950/40 border-white/5 hover:border-white/10"
                }`}
              >
                <div className="space-y-1">
                  <h5 className="font-display font-black text-xs text-slate-100 group-hover:text-emerald-400 transition-colors">
                    {note.title}
                  </h5>
                  <p className="text-[9px] font-mono text-slate-500">
                    Compiled {new Date(note.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm("Delete notes sheet?")) {
                      deleteNote(note.id);
                      if (selectedNote?.id === note.id) setSelectedNote(null);
                    }
                  }}
                  className="absolute right-3.5 top-3.5 p-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/10 hover:border-red-500/20 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                  title="Purge lessons"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          {/* Active Saved Note detailed split study canvas */}
          <div className="lg:col-span-2">
            {selectedNote ? (
              <div className="space-y-6">
                {selectedNote.isRawResponseFallback && (
                  <div className="p-4 bg-amber-500/10 border border-amber-500/20 text-amber-300 rounded-2.5xl text-xs space-y-1 font-display">
                    <span className="font-bold flex items-center gap-1.5 text-amber-400 text-xs">⚠️ Notice:</span>
                    <span>Unable to generate structured notes. Showing raw AI response.</span>
                  </div>
                )}
                {/* Note general information */}
                <div className="p-5 bg-slate-900/35 border border-white/10 rounded-2.5xl space-y-3 shadow-md">
                  <h4 className="font-display font-black text-lg text-white">
                    {selectedNote.title}
                  </h4>
                  <div className="p-3.5 bg-slate-950/60 border border-white/10 rounded-xl space-y-1">
                    <span className="text-[10px] font-mono font-bold tracking-widest uppercase text-slate-400 select-none">
                      Bullet summary:
                    </span>
                    <p className="text-xs text-slate-300 font-sans leading-relaxed whitespace-pre-wrap">
                      {selectedNote.summary}
                    </p>
                  </div>

                  {/* Textbook Markdown Reader Canvas */}
                  <div className="pt-2 border-t border-white/5">
                    <span className="text-[10px] font-mono font-bold tracking-widest uppercase text-slate-400 select-none">
                      Detailed textbook document:
                    </span>
                    <div className="prose prose-invert prose-xs max-w-none mt-3 p-4 bg-slate-950/40 border border-white/5 rounded-xl max-h-[300px] overflow-y-auto selection:bg-emerald-500/30">
                      <Markdown>{selectedNote.content || selectedNote.rawText || ""}</Markdown>
                    </div>
                  </div>
                </div>

                {/* Spaced-Repetition Interactive FLASHCARDS stack */}
                {selectedNote.flashcards && selectedNote.flashcards.length > 0 && (
                  <div className="p-5 bg-slate-900/30 border border-white/10 rounded-2.5xl space-y-4 shadow-md select-none flex flex-col justify-between h-80">
                    <div className="flex items-center justify-between pb-2 border-b border-white/5">
                      <div className="flex items-center gap-1">
                        <Layers className="w-4 h-4 text-emerald-400" />
                        <h5 className="font-display font-bold text-xs text-slate-200">
                          Active Flashcard Revision
                        </h5>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">
                        Card {activeCardIdx + 1} of {selectedNote.flashcards.length}
                      </span>
                    </div>

                    {/* Interactive FLIP CARD */}
                    <div
                      onClick={() => setIsFlipped(!isFlipped)}
                      className="flex-1 my-3 bg-slate-950/80 hover:bg-slate-950 hover:border-emerald-500/30 border border-white/10 rounded-2xl cursor-pointer p-6 flex flex-col justify-center items-center text-center transition-all shadow-inner relative overflow-hidden"
                    >
                      <span className="absolute top-2.5 left-2.5 text-[9px] font-mono font-bold text-slate-500 uppercase">
                        {isFlipped ? "The explanation / answer" : "Query / Concept"}
                      </span>
                      <p className={`text-sm tracking-wide font-sans leading-relaxed text-slate-200 transition-all px-4 ${isFlipped ? "text-emerald-300 font-bold" : "text-slate-100 font-medium"}`}>
                        {isFlipped
                          ? selectedNote.flashcards[activeCardIdx].back
                          : selectedNote.flashcards[activeCardIdx].front}
                      </p>
                      <span className="absolute bottom-2.5 right-2.5 text-[9px] font-mono tracking-wider font-bold text-slate-500 animate-pulse">
                        Click card to flip
                      </span>
                    </div>

                    {/* Flashcards navigators */}
                    <div className="flex items-center justify-between pt-2 border-t border-white/5">
                      <button
                        onClick={() => {
                          setActiveCardIdx((prev) => Math.max(0, prev - 1));
                          setIsFlipped(false);
                        }}
                        disabled={activeCardIdx === 0}
                        className="p-1 px-3 bg-slate-800 disabled:bg-slate-900/10 hover:bg-slate-755 text-slate-350 disabled:text-slate-600 border border-white/5 rounded-xl text-xs font-bold transition flex items-center gap-1 outline-hidden"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        Prev
                      </button>
                      
                      <div className="space-x-1.5 flex items-center">
                        <button
                          onClick={() => {
                            setIsFlipped(false);
                            if (activeCardIdx < selectedNote.flashcards.length - 1) {
                              setActiveCardIdx((prev) => prev + 1);
                            } else {
                              if (addXpAndCoins) {
                                addXpAndCoins(10, 0);
                              }
                              addToast("success", "Review Completed! 🎓", "Phenomenal! Review session complete! +10 XP rewarded.");
                            }
                          }}
                          className="p-1.5 px-3 bg-emerald-500/10 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 rounded-xl text-[10px] font-bold font-display"
                        >
                          I got it &middot; +5 XP
                        </button>
                      </div>

                      <button
                        onClick={() => {
                          setActiveCardIdx((prev) => Math.min(selectedNote.flashcards.length - 1, prev + 1));
                          setIsFlipped(false);
                        }}
                        disabled={activeCardIdx === selectedNote.flashcards.length - 1}
                        className="p-1 px-3 bg-slate-800 disabled:bg-slate-900/10 hover:bg-slate-755 text-slate-350 disabled:text-slate-600 border border-white/5 rounded-xl text-xs font-bold transition flex items-center gap-1 outline-hidden"
                      >
                        Next
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full min-h-[400px] border border-white/10 rounded-2.5xl p-6.5 bg-slate-900/30 flex flex-col justify-center items-center text-center select-none space-y-4">
                <div className="bg-slate-900/50 border border-white/5 p-4 rounded-full">
                  <BookOpen className="w-10 h-10 text-slate-600" />
                </div>
                <div>
                  <h5 className="font-display font-bold text-white text-sm">No textbook note sheets selected</h5>
                  <p className="text-xs text-slate-400 mt-2">
                    Create a textbook lesson or select an existing worksheet in your directory database.
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
