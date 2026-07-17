import React, { useState, useRef, useEffect, useMemo } from "react";
import { useAppState } from "../contexts/StateContext";
import { motion, AnimatePresence } from "motion/react";
import { API_BASE, buildApiUrl } from "../lib/api";
import Markdown from "react-markdown";
import {
  Sparkles,
  Send,
  Trash2,
  HelpCircle,
  Bot,
  User,
  ArrowRight,
  Search,
  Plus,
  Pin,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  CornerDownLeft,
  Download,
  Share2,
  Check,
  Copy,
  FileText,
  X,
  Image,
  Paperclip,
  AlertCircle,
  Square,
  Bookmark,
  RefreshCw,
  SearchCheck,
  Info,
  Layers
} from "lucide-react";

interface ExtendedChatMessage {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: string;
  bookmarked?: boolean;
  image?: { mimeType: string; data: string } | null;
  fileContextName?: string | null;
}

interface ChatThread {
  id: string;
  title: string;
  messages: ExtendedChatMessage[];
  pinned: boolean;
  createdAt: string;
}

export const ChatAssistantView: React.FC = () => {
  const { user, addXpAndCoins, addToast } = useAppState();

  // Debug Panel and Integration Health Trackers
  const [lastResponseStatus, setLastResponseStatus] = useState<string>("Not sent yet");
  const [lastError, setLastError] = useState<string>("None registered");
  const [backendHasGeminiKey, setBackendHasGeminiKey] = useState<boolean | null>(null);
  const [showDebugPanel, setShowDebugPanel] = useState<boolean>(false);

  // Unified Threads State
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string>("");
  const [threadSearchQuery, setThreadSearchQuery] = useState("");
  const [messagesSearchQuery, setMessagesSearchQuery] = useState("");

  // Input states
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  
  // Abort capability
  const abortControllerRef = useRef<AbortController | null>(null);

  // File Upload states
  const [uploadedImage, setUploadedImage] = useState<{ mimeType: string; data: string } | null>(null);
  const [uploadedDocText, setUploadedDocText] = useState<string>("");
  const [uploadedDocName, setUploadedDocName] = useState<string>("");
  const [dragActive, setDragActive] = useState(false);

  // Voice Speech To Text
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Voice text synthesis (TTS) active trackers
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);

  // UI responsive side panel toggle
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Suggested high-impact prompts
  const quickActions = [
    { label: "🧮 Solve Proof", text: "Please solve and clarify this academic problem step-by-step: " },
    { label: "💻 Explain Code", text: "Explain how the following block of code works in plain English: \n\n```\n\n```" },
    { label: "📝 Create Quiz", text: "Construct a 3-question multiple-choice quiz about this subject so I can recall: " },
    { label: "📚 Summarize Theory", text: "Evaluate the major tenets and outline a clear Feynman layperson analogy for: " },
  ];

  const samplePrompts = [
    { title: "Backpropagation simply 🧠", prompt: "Explain backpropagation in Neural Networks using a simple, human real-world analogy." },
    { title: "Review React state rules ⚡", prompt: "Summarize React 18 & 19 state update loops and explain how to prevent infinite re-renders." },
    { title: "Organic Chemistry mechanisms ⚗️", prompt: "Solve the mechanism breakdown for SN1 vs SN2 nucleophilic substitutions step-by-step." },
  ];

  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // STEP 3: Verify API key loading and log import.meta.env values
  useEffect(() => {
    console.info("[API-Key-Loading] STAGE 1: Checking client-side import.meta.env parameters:");
    const metaEnv = (import.meta as any).env || {};
    console.info(" - import.meta.env.MODE:", metaEnv.MODE);
    console.info(" - import.meta.env.BASE_URL:", metaEnv.BASE_URL);
    console.info(" - import.meta.env.VITE_GEMINI_API_KEY loaded:", !!metaEnv.VITE_GEMINI_API_KEY);
    console.info(" - import.meta.env.VITE_GROQ_API_KEY loaded:", !!metaEnv.VITE_GROQ_API_KEY);
  }, []);

  useEffect(() => {
    const checkBackendHealth = async () => {
      try {
        const url = buildApiUrl("/api/health");
        console.info(`[API-Key-Loading] STAGE 2: Querying server ${url} endpoint...`);
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          setBackendHasGeminiKey(!!data.hasGeminiKey);
          console.info("[API-Key-Loading] STAGE 3: Server health check succeeded:", data);
        } else {
          setBackendHasGeminiKey(false);
          console.warn("[API-Key-Loading] STAGE 3 WARNING: Server health check returned HTTP status:", res.status);
        }
      } catch (err) {
        setBackendHasGeminiKey(false);
        console.error("[API-Key-Loading] STAGE 3 ERROR: Server health verify exception:", err);
      }
    };
    checkBackendHealth();
  }, []);

  // Load chats & threads from localStorage on startup
  useEffect(() => {
    const cachedThreads = localStorage.getItem(`mentora_threads_${user?.uid || "guest"}`);
    
    const smallGreetingText = `### Hello! Welcome to Mentora AI 🎓✨

I'm your virtual learning assistant. Let's study, explore concepts, or solve files and academic problems together. How can I help you today?`;

    const welcomeId = "welcome_thread";
    const defaultWelcomeThread: ChatThread = {
      id: welcomeId,
      title: "Welcome to Mentora AI 🎓",
      pinned: true,
      createdAt: new Date().toISOString(),
      messages: [
        {
          id: "msg_intro_1",
          sender: "ai",
          text: smallGreetingText,
          timestamp: new Date().toISOString()
        }
      ]
    };

    if (cachedThreads) {
      try {
        let parsed: ChatThread[] = JSON.parse(cachedThreads);
        // Automatically migrate the target welcome message if it contains the old intro
        parsed = parsed.map(t => {
          if (t.id === welcomeId) {
            return {
              ...t,
              messages: t.messages.map(m => {
                if (m.id === "msg_intro_1") {
                  return { ...m, text: smallGreetingText };
                }
                return m;
              })
            };
          }
          return t;
        });

        console.log("MESSAGES BEFORE (Startup Load):", threads.find(t => t.id === activeThreadId)?.messages || []);
        console.log("STATE UPDATE SOURCE: Startup Load from localStorage");
        setThreads(parsed);
        console.log("MESSAGES AFTER (Startup Load):", parsed.find(t => t.id === activeThreadId)?.messages || []);
        if (parsed.length > 0) {
          setActiveThreadId(parsed[0].id);
        }
      } catch (e) {
        console.error("Failed to parse cached threads:", e);
      }
    } else {
      console.log("MESSAGES BEFORE (Startup Load Default):", threads.find(t => t.id === activeThreadId)?.messages || []);
      console.log("STATE UPDATE SOURCE: Startup Load Default welcome thread");
      setThreads([defaultWelcomeThread]);
      console.log("MESSAGES AFTER (Startup Load Default):", defaultWelcomeThread.messages);
      setActiveThreadId(welcomeId);
    }
  }, [user?.uid]);

  // Persist threads on updates
  const saveThreadsToStorage = (updatedThreads: ChatThread[]) => {
    console.log("MESSAGES BEFORE (saveThreadsToStorage):", threads.find(t => t.id === activeThreadId)?.messages || []);
    console.log("STATE UPDATE SOURCE: saveThreadsToStorage");
    setThreads(updatedThreads);
    console.log("MESSAGES AFTER (saveThreadsToStorage):", updatedThreads.find(t => t.id === activeThreadId)?.messages || []);
    localStorage.setItem(`mentora_threads_${user?.uid || "guest"}`, JSON.stringify(updatedThreads));
  };

  // Auto Scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [threads, loading, activeThreadId]);

  // Set up Speech To Text
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = "en-US";
      
      rec.onresult = (event: any) => {
        let interimTranscript = "";
        let finalTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
          setInputText(prev => prev + " " + finalTranscript);
        }
      };

      rec.onerror = (err: any) => {
        console.error("Speech Recognition error:", err);
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = rec;
    }
  }, []);

  // Text To Speech helper
  const handleToggleSpeak = (msgId: string, textToSpeak: string) => {
    if (!window.speechSynthesis) {
      addToast("info", "Web Speech Unavailable 🔈", "Text-to-speech is not supported in this browser version. Try Google Chrome!");
      return;
    }

    if (speakingMessageId === msgId) {
      window.speechSynthesis.cancel();
      setSpeakingMessageId(null);
    } else {
      window.speechSynthesis.cancel();
      // Remove rich markdown syntax tags for clear audio transcription
      const cleanText = textToSpeak
        .replace(/[#*`_~$-]/g, "")
        .replace(/\[.*?\]\(.*?\)/g, "");

      const utterance = new SpeechSynthesisUtterance(cleanText.slice(0, 1500));
      utterance.rate = 1.05;
      
      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find(v => v.lang.startsWith("en")) || voices[0];
      if (preferred) utterance.voice = preferred;

      utterance.onend = () => {
        setSpeakingMessageId(null);
      };
      utterance.onerror = () => {
        setSpeakingMessageId(null);
      };

      setSpeakingMessageId(msgId);
      window.speechSynthesis.speak(utterance);
    }
  };

  // Clear speech synthesis on unmount
  useEffect(() => {
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Filtered Threads list
  const filteredThreads = useMemo(() => {
    return threads.filter(t => {
      const matchTitle = t.title.toLowerCase().includes(threadSearchQuery.toLowerCase());
      const matchMessageContent = t.messages.some(m => m.text.toLowerCase().includes(threadSearchQuery.toLowerCase()));
      return matchTitle || matchMessageContent;
    }).sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
  }, [threads, threadSearchQuery]);

  // Current Thread details
  const activeThread = useMemo(() => {
    return threads.find(t => t.id === activeThreadId);
  }, [threads, activeThreadId]);

  // Filtered Messages inside Current Thread
  const filteredMessages = useMemo(() => {
    if (!activeThread) return [];
    if (!messagesSearchQuery.trim()) return activeThread.messages;
    return activeThread.messages.filter(m => m.text.toLowerCase().includes(messagesSearchQuery.toLowerCase()));
  }, [activeThread, messagesSearchQuery]);

  // Thread Operations
  const handleCreateThread = (customTitle?: string) => {
    const newThreadId = "thread_" + Date.now();
    const newThread: ChatThread = {
      id: newThreadId,
      title: customTitle || `Research Subject - ${new Date().toLocaleDateString()}`,
      pinned: false,
      createdAt: new Date().toISOString(),
      messages: [
        {
          id: "msg_" + Date.now() + "_welcome",
          sender: "ai",
          text: `🔬 **New Subject Workspace Sparked!**\nHow can I help you learn today? You can attach files, paste code, or type queries below.`,
          timestamp: new Date().toISOString()
        }
      ]
    };
    const nextThreads = [newThread, ...threads];
    saveThreadsToStorage(nextThreads);
    setActiveThreadId(newThreadId);
  };

  const handleDeleteThread = (threadId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const nextThreads = threads.filter(t => t.id !== threadId);
    saveThreadsToStorage(nextThreads);
    if (activeThreadId === threadId && nextThreads.length > 0) {
      setActiveThreadId(nextThreads[0].id);
    } else if (nextThreads.length === 0) {
      handleCreateThread("Chemistry & Physics");
    }
  };

  const handleTogglePinThread = (threadId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const nextThreads = threads.map(t => {
      if (t.id === threadId) return { ...t, pinned: !t.pinned };
      return t;
    });
    saveThreadsToStorage(nextThreads);
  };

  const handleRenameThreadTitle = (threadId: string, newTitle: string) => {
    if (!newTitle.trim()) return;
    const nextThreads = threads.map(t => {
      if (t.id === threadId) return { ...t, title: newTitle };
      return t;
    });
    saveThreadsToStorage(nextThreads);
  };

  // File Upload handling
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processUploadedFile(file);
  };

  const processUploadedFile = (file: File) => {
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target?.result as string;
        // Strip data header to get clean base64 format for Gemini
        const cleanBase64 = base64.replace(/^data:image\/\w+;base64,/, "");
        setUploadedImage({
          mimeType: file.type,
          data: cleanBase64
        });
        setUploadedDocName(file.name);
      };
      reader.readAsDataURL(file);
    } else if (
      file.type === "text/plain" ||
      file.name.endsWith(".txt") ||
      file.name.endsWith(".md") ||
      file.name.endsWith(".js") ||
      file.name.endsWith(".ts") ||
      file.name.endsWith(".json") ||
      file.name.endsWith(".py") ||
      file.name.endsWith(".html") ||
      file.name.endsWith(".css") ||
      file.name.endsWith(".csv")
    ) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setUploadedDocText(e.target?.result as string);
        setUploadedDocName(file.name);
      };
      reader.readAsText(file);
    } else {
      // General fall-through for unsupported or PDF text emulation
      const reader = new FileReader();
      reader.onload = (e) => {
        const textSeed = `[Parsed File: ${file.name}]\nFound code structures inside student file document workspace.`;
        setUploadedDocText(textSeed);
        setUploadedDocName(file.name);
      };
      reader.readAsText(file);
    }
    
    // Reward user for upload analytics
    addXpAndCoins(10, 2);
  };

  // Drag and drop areas
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processUploadedFile(e.dataTransfer.files[0]);
    }
  };

  // Clean attachments
  const handleClearAttachments = () => {
    setUploadedImage(null);
    setUploadedDocText("");
    setUploadedDocName("");
  };

  // Toggle Dictation voice input
  const handleToggleListening = () => {
    if (!recognitionRef.current) {
      addToast("info", "Speech Recognition Unsupported 🎙️", "Speech recognition isn't supported inside this browser environment. Try using Chrome or Edge!");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.error("Failed to boot Dictation controller:", err);
      }
    }
  };

  // Abort Stream trigger
  const handleAbortGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setLoading(false);
      
      // Save aborted notice to active thread
      if (activeThreadId) {
        const targetThread = threads.find(t => t.id === activeThreadId);
        if (targetThread) {
          const updatedMessages = [...targetThread.messages];
          const lastMsg = updatedMessages[updatedMessages.length - 1];
          if (lastMsg && lastMsg.sender === "ai") {
            lastMsg.text += "\n\n*[Generation stream stopped by student]*";
            const nextThreads = threads.map(t => {
              if (t.id === activeThreadId) return { ...t, messages: updatedMessages };
              return t;
            });
            saveThreadsToStorage(nextThreads);
          }
        }
      }
    }
  };

  // Main Chat sender & Receiver over streaming pipeline
  const handleSend = async (messageText?: string, isRetry: boolean = false) => {
    const textToSend = messageText !== undefined ? messageText : inputText;
    if (!textToSend.trim() && !uploadedImage && !uploadedDocText && !isRetry) return;

    if (loading) return;

    setLoading(true);
    setInputText("");

    // Create current state reference
    const currentThreadId = activeThreadId;
    const currentThread = threads.find(t => t.id === currentThreadId);
    if (!currentThread) return;

    // 1. If not retry, add user message to thread
    let updatedMessages = [...currentThread.messages];
    if (!isRetry) {
      const userMessageId = "msg_" + Date.now();
      const userMsg: ExtendedChatMessage = {
        id: userMessageId,
        sender: "user",
        text: textToSend,
        timestamp: new Date().toISOString(),
        image: uploadedImage ? { ...uploadedImage } : null,
        fileContextName: uploadedDocName || null
      };
      updatedMessages.push(userMsg);

      // Dynamically rename thread based on first question
      let updatedTitle = currentThread.title;
      if (updatedMessages.length <= 3 && currentThread.title.startsWith("Research Subject -")) {
        updatedTitle = textToSend.slice(0, 30) + (textToSend.length > 30 ? "..." : "");
      }

      const nextThreads = threads.map(t => {
        if (t.id === currentThreadId) return { ...t, title: updatedTitle, messages: updatedMessages };
        return t;
      });
      saveThreadsToStorage(nextThreads);
    } else {
      // If it is a retry, remove any existing last AI response in active list
      if (updatedMessages.length > 0 && updatedMessages[updatedMessages.length - 1].sender === "ai") {
        updatedMessages.pop();
        const nextThreads = threads.map(t => {
          if (t.id === currentThreadId) return { ...t, messages: updatedMessages };
          return t;
        });
        saveThreadsToStorage(nextThreads);
      }
    }

    // Prepare temp message for the AI
    const apiMessageId = "msg_" + Date.now() + "_ai";
    const tempAiMsg: ExtendedChatMessage = {
      id: apiMessageId,
      sender: "ai",
      text: "⚡ Mentora AI is processing critical metrics and establishing multi-turn grounding...",
      timestamp: new Date().toISOString()
    };

    const threadWithAiPlaceholder = [...updatedMessages, tempAiMsg];
    const threadsWithPlaceholder = threads.map(t => {
      if (t.id === currentThreadId) return { ...t, messages: threadWithAiPlaceholder };
      return t;
    });
    console.log("MESSAGES BEFORE (AI Placeholder Insert):", threads.find(t => t.id === currentThreadId)?.messages || []);
    console.log("STATE UPDATE SOURCE: AI Placeholder Insert");
    setThreads(threadsWithPlaceholder);
    console.log("MESSAGES AFTER (AI Placeholder Insert):", threadsWithPlaceholder.find(t => t.id === currentThreadId)?.messages || []);

    // Track state files & clear them out of input row
    const docContextValue = uploadedDocText;
    const imageAttachmentValue = uploadedImage;
    handleClearAttachments();

    // Setup network stream Abort Controller
    abortControllerRef.current = new AbortController();

    try {
      // STEP 1 TRACE: Submit handler starts, user input processed.
      console.info("[Chat-Lifecycle] STAGE 2: Starting submission flow. Mapping thread messages array...");
      const clientMessageHistory = updatedMessages.map(m => ({
        sender: m.sender,
        text: m.sender === "user" && m.fileContextName ? `[Attached details in document or file context named "${m.fileContextName}"]\n\n${m.text}` : m.text
      }));

      console.info("[Chat-Lifecycle] STAGE 3: Formulating endpoint fetch. Payload size:", clientMessageHistory.length);

      // Attempt chunk stream
      const url = buildApiUrl("/api/gemini/chat-stream");
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: clientMessageHistory,
          docContext: docContextValue || undefined,
          imageAttachment: imageAttachmentValue ? { mimeType: imageAttachmentValue.mimeType, data: imageAttachmentValue.data } : undefined
        }),
        signal: abortControllerRef.current.signal
      });

      console.info(`[Chat-Lifecycle] STAGE 4: Real-time stream fetch feedback received. Status code: ${response.status}`);
      setLastResponseStatus(String(response.status));

      // STEP 2 TRACE: Check for key HTTP failure codes
      if (response.status === 401 || response.status === 403 || response.status === 429 || response.status === 500 || response.status === 503) {
        console.warn(`[Chat-Lifecycle] API integration alert: response returned status ${response.status}`);
      }

      if (!response.ok) throw new Error(`Stream responded with bad status: ${response.status}`);

      const reader = response.body?.getReader();
      const decoder = new TextDecoder("utf-8");
      
      if (!reader) throw new Error("Response readable stream not resolved.");

      let loadedText = "";
      console.info("[Chat-Lifecycle] STAGE 5: Fetch response body decoded stream. Iterating stream fragments...");

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const delta = decoder.decode(value, { stream: true });
        loadedText += delta;

        // Render intermediate text to screen dynamically
        setThreads(prevThreads => {
          const finalThreads = prevThreads.map(t => {
            if (t.id === currentThreadId) {
              const msgs = [...t.messages];
              const placeholderIdx = msgs.findIndex(m => m.id === apiMessageId);
              if (placeholderIdx !== -1) {
                msgs[placeholderIdx] = {
                  ...msgs[placeholderIdx],
                  text: loadedText
                };
              }
              return { ...t, messages: msgs };
            }
            return t;
          });
          console.log("MESSAGES BEFORE (Stream Intermediate Check):", prevThreads.find(t => t.id === currentThreadId)?.messages || []);
          console.log("STATE UPDATE SOURCE: Stream Intermediate Check chunk");
          console.log("MESSAGES AFTER (Stream Intermediate Check):", finalThreads.find(t => t.id === currentThreadId)?.messages || []);
          return finalThreads;
        });
      }

      console.info(`[Chat-Lifecycle] STAGE 6: Stream chunk iterations successfully ended. Total length: ${loadedText.length}`);
      if (!loadedText.trim()) {
        throw new Error("Empty streaming buffer returned from network endpoint.");
      }

      // Finish up, reward XP based on query quality
      await addXpAndCoins(10, 1);

      // STEP 5: Confirm React state updates by finalizing thread in history
      setThreads(prevThreads => {
        const finalThreads = prevThreads.map(t => {
          if (t.id === currentThreadId) {
            const msgs = [...t.messages];
            const placeholderIdx = msgs.findIndex(m => m.id === apiMessageId);
            if (placeholderIdx !== -1) {
              msgs[placeholderIdx] = {
                ...msgs[placeholderIdx],
                text: loadedText
              };
            }
            return { ...t, messages: msgs };
          }
          return t;
        });
        console.log("MESSAGES BEFORE (Stream Success Finalize):", prevThreads.find(t => t.id === currentThreadId)?.messages || []);
        console.log("STATE UPDATE SOURCE: Stream Success Finalize");
        console.log("MESSAGES AFTER (Stream Success Finalize):", finalThreads.find(t => t.id === currentThreadId)?.messages || []);
        localStorage.setItem(`mentora_threads_${user?.uid || "guest"}`, JSON.stringify(finalThreads));
        console.info("[Chat-Lifecycle] STAGE 7: Success! Copilot response successfully stored and state updated.");
        return finalThreads;
      });

    } catch (err: any) {
      if (err.name === "AbortError") {
        console.warn("Generation stream aborted successfully by client.");
        return;
      }
      console.warn(`[Chat-Lifecycle] Stream pipeline connection error or missing stream: "${err?.message || err}". Transitioning to static fetch /api/gemini/chat...`);
      setLastError(err?.message || String(err));

      try {
        console.info("[Chat-Lifecycle] STAGE 3b: Transferring to static backup route POST /api/gemini/chat...");
        const clientMessageHistory = updatedMessages.map(m => ({
          sender: m.sender,
          text: m.sender === "user" && m.fileContextName ? `[Attached details in document or file context named "${m.fileContextName}"]\n\n${m.text}` : m.text
        }));

        const url = buildApiUrl("/api/gemini/chat");
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: clientMessageHistory,
            docContext: docContextValue || undefined,
            imageAttachment: imageAttachmentValue ? { mimeType: imageAttachmentValue.mimeType, data: imageAttachmentValue.data } : undefined
          }),
          signal: abortControllerRef.current.signal
        });

        console.info(`[Chat-Lifecycle] STAGE 4b: Static backup answered. Status code: ${response.status}`);
        setLastResponseStatus(String(response.status));

        if (!response.ok) {
          throw new Error(`Static backup endpoint returned bad status ${response.status}`);
        }

        const data = await response.json();
        console.info("[Chat-Lifecycle] STAGE 5b: Loaded response payload directly:", data);

        // STEP 4: Support other response shapes / parse formats
        let parsedText = "";
        if (data && typeof data.text === "string") {
          parsedText = data.text;
        } else if (data && data.candidates?.[0]?.content?.parts?.[0]?.text) {
          parsedText = data.candidates[0].content.parts[0].text;
          console.info("[Chat-Lifecycle] Parsed legacy content schema correctly (candidates[0].content.parts[0].text).");
        } else {
          parsedText = "AI services are temporarily unavailable.";
        }

        if (!parsedText.trim()) {
          parsedText = "AI services are temporarily unavailable.";
        }

        // Finish up, reward XP based on query quality
        await addXpAndCoins(10, 1);

        // STEP 5: State update confirmation
        setThreads(prevThreads => {
          const finalThreads = prevThreads.map(t => {
            if (t.id === currentThreadId) {
              const msgs = [...t.messages];
              const placeholderIdx = msgs.findIndex(m => m.id === apiMessageId);
              if (placeholderIdx !== -1) {
                msgs[placeholderIdx] = {
                  ...msgs[placeholderIdx],
                  text: parsedText
                };
              } else {
                msgs.push({
                  id: apiMessageId,
                  sender: "ai",
                  text: parsedText,
                  timestamp: new Date().toISOString()
                });
              }
              return { ...t, messages: msgs };
            }
            return t;
          });
          console.log("MESSAGES BEFORE (Static Fetch Success Finalize):", prevThreads.find(t => t.id === currentThreadId)?.messages || []);
          console.log("STATE UPDATE SOURCE: Static Fetch Success Finalize");
          console.log("MESSAGES AFTER (Static Fetch Success Finalize):", finalThreads.find(t => t.id === currentThreadId)?.messages || []);
          localStorage.setItem(`mentora_threads_${user?.uid || "guest"}`, JSON.stringify(finalThreads));
          console.info("[Chat-Lifecycle] STAGE 7: Success! Backup message successfully generated and state updated.");
          return finalThreads;
        });

      } catch (backupError: any) {
        console.error("[Chat-Lifecycle] CRITICAL FALLBACK FAILURE. All API routines exhausted:", backupError);
        setLastError(backupError?.message || String(backupError));

        // STEP 6: Emergency fallback
        const fallbackText = "AI services are temporarily unavailable.";

        setThreads(prevThreads => {
          const errorFinalThreads = prevThreads.map(t => {
            if (t.id === currentThreadId) {
              const msgs = [...t.messages];
              const placeholderIdx = msgs.findIndex(m => m.id === apiMessageId);
              if (placeholderIdx !== -1) {
                msgs[placeholderIdx] = {
                  ...msgs[placeholderIdx],
                  text: `❌ **Failed to establish AI connection:** ${backupError?.message || "connection error"}.\n\n*Emergency Fallback:* ${fallbackText}`
                };
              } else {
                msgs.push({
                  id: apiMessageId,
                  sender: "ai",
                  text: `❌ **Failed to establish AI connection:** ${backupError?.message || "connection error"}.\n\n*Emergency Fallback:* ${fallbackText}`,
                  timestamp: new Date().toISOString()
                });
              }
              return { ...t, messages: msgs };
            }
            return t;
          });
          console.log("MESSAGES BEFORE (Emergency Fallback Finalize):", prevThreads.find(t => t.id === currentThreadId)?.messages || []);
          console.log("STATE UPDATE SOURCE: Emergency Fallback Finalize");
          console.log("MESSAGES AFTER (Emergency Fallback Finalize):", errorFinalThreads.find(t => t.id === currentThreadId)?.messages || []);
          localStorage.setItem(`mentora_threads_${user?.uid || "guest"}`, JSON.stringify(errorFinalThreads));
          return errorFinalThreads;
        });
      }
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  };

  // Bookmark or Star message toggling
  const handleToggleBookmarkMessage = (msgId: string) => {
    if (!activeThreadId) return;
    const nextThreads = threads.map(t => {
      if (t.id === activeThreadId) {
        const updatedMsgs = t.messages.map(m => {
          if (m.id === msgId) return { ...m, bookmarked: !m.bookmarked };
          return m;
        });
        return { ...t, messages: updatedMsgs };
      }
      return t;
    });
    saveThreadsToStorage(nextThreads);
  };

  // Purge/Clear current thread messages
  const handlePurgeMessages = () => {
    if (!confirm("Are you sure you want to clear all conversation blocks inside this workspace thread?")) return;
    if (!activeThreadId) return;

    const nextThreads: ChatThread[] = threads.map(t => {
      if (t.id === activeThreadId) {
        return {
          ...t,
          messages: [
            {
              id: "msg_" + Date.now() + "_welcome",
              sender: "ai" as const,
              text: "🧼 **History Purged!** Let's start fresh. Introduce a technical study topic or drag files here to begin.",
              timestamp: new Date().toISOString()
            }
          ] as ExtendedChatMessage[]
        };
      }
      return t;
    });
    saveThreadsToStorage(nextThreads);
  };

  // Exporters
  const handleExportAsMarkdown = () => {
    if (!activeThread) return;
    const mdContent = activeThread.messages.map(m => {
      const header = `### [${new Date(m.timestamp).toLocaleTimeString()}] ${m.sender === "user" ? "Student" : "Mentora AI"}:\n`;
      const docBadge = m.fileContextName ? `📂 *(Attached Context File: ${m.fileContextName})*\n` : "";
      return `${header}${docBadge}${m.text}\n\n---\n`;
    }).join("\n");

    const blob = new Blob([mdContent], { type: "text/markdown;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${activeThread.title.replace(/\s+/g, "_")}_Log.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintToPDF = () => {
    window.print();
  };

  return (
    <div className="flex bg-slate-950/20 border border-white/5 rounded-3xl overflow-hidden h-[calc(100vh-140px)] gap-0" onDragEnter={handleDrag}>
      
      {/* File Drag Over Overlay */}
      {dragActive && (
        <div 
          className="absolute inset-0 bg-purple-950/80 border-4 border-dashed border-purple-500 rounded-3xl flex flex-col items-center justify-center z-50 transition-all duration-300"
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
        >
          <div className="p-6 bg-purple-900/30 border border-purple-500/30 rounded-full animate-bounce">
            <Paperclip className="w-12 h-12 text-purple-400" />
          </div>
          <h3 className="font-display font-black text-white text-lg mt-4">Drop Study Files Directly here</h3>
          <p className="text-xs text-slate-400 mt-2">Mentora accepts Text, Python, JavaScript notes, and PNG/JPEG attachments</p>
        </div>
      )}

      {/* 1. Sidebar Session panel (Threads and Filter logs) */}
      <div className={`transition-all duration-200 shadow-2xl flex flex-col border-r border-white/5 bg-slate-950/65 ${
        isSidebarOpen ? "w-80 opacity-100 flex-shrink-0" : "w-0 opacity-0 overflow-hidden"
      }`}>
        {/* Sidebar Header */}
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <span className="font-display font-black text-xs text-slate-300 uppercase tracking-widest flex items-center gap-2">
            <Layers className="w-4 h-4 text-purple-400 animate-pulse" />
            Class Workspaces
          </span>
          <button 
            onClick={() => handleCreateThread()}
            className="p-1 px-2.5 rounded-lg bg-purple-500/10 border border-purple-400/20 text-purple-400 hover:bg-purple-500/20 text-[10px] font-bold font-mono tracking-wider uppercase transition-all duration-150 cursor-pointer flex items-center gap-1 shrink-0"
          >
            <Plus className="w-3 h-3" />
            <span>New Subject</span>
          </button>
        </div>

        {/* Workspace Search Filter */}
        <div className="p-3 border-b border-white/5">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-500" />
            <input 
              type="text"
              placeholder="Search workspaces & history..."
              value={threadSearchQuery}
              onChange={(e) => setThreadSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-white/5 focus:border-purple-500/40 rounded-xl py-2 pl-8 pr-3 text-xs text-white placeholder-slate-400 outline-none transition-all font-sans"
            />
          </div>
        </div>

        {/* Scrollable Threads Container */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredThreads.length === 0 ? (
            <div className="py-12 px-4 text-center text-slate-500">
              <SearchCheck className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-xs font-semibold">No results founded.</p>
              <button 
                onClick={() => setThreadSearchQuery("")} 
                className="text-xs text-purple-400 hover:underline mt-2 font-mono"
              >
                Reset Search Filters
              </button>
            </div>
          ) : (
            filteredThreads.map(t => {
              const isActive = t.id === activeThreadId;
              const hasPinned = t.pinned;
              return (
                <div
                  key={t.id}
                  onClick={() => setActiveThreadId(t.id)}
                  className={`group relative flex flex-col p-3 rounded-2xl border transition-all duration-150 cursor-pointer text-left ${
                    isActive 
                      ? "bg-purple-950/20 border-purple-500/25 shadow-md shadow-purple-500/5 text-white" 
                      : "bg-slate-900/10 hover:bg-slate-900/40 border-transparent hover:border-white/5 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <div className="flex items-start justify-between gap-1.5">
                    <span className="font-display font-bold text-xs truncate max-w-[190px]">
                      {t.title}
                    </span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150 shrink-0">
                      <button 
                        onClick={(e) => handleTogglePinThread(t.id, e)}
                        className={`p-1 rounded-md text-slate-500 hover:text-amber-400 transition-colors ${hasPinned ? "opacity-100 text-amber-500" : ""}`}
                        title={hasPinned ? "Unpin Subject" : "Pin Subject"}
                      >
                        <Pin className="w-3 h-3" />
                      </button>
                      <button 
                        onClick={(e) => handleDeleteThread(t.id, e)}
                        className="p-1 rounded-md text-slate-500 hover:text-red-400 transition-colors"
                        title="Delete Workspace Thread"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-1 text-[9px] font-mono text-slate-500">
                    <span>{t.messages.length} messages</span>
                    {hasPinned && (
                      <span className="text-amber-400 font-bold uppercase tracking-widest text-[8px] bg-amber-500/10 border border-amber-500/20 px-1 rounded">
                        PINNED
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* User metrics block */}
        <div className="p-4 border-t border-white/5 bg-slate-950 font-sans text-xs flex items-center justify-between text-slate-400 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping"></div>
            <span className="font-mono text-[10px]">Tutor Node Active</span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono">Mentora.ai v1.4</span>
        </div>
      </div>

      {/* 2. Primary Workspace Chat Section */}
      <div className="flex-1 flex flex-col relative h-full bg-slate-950/20" onDragOver={handleDrag}>
        
        {/* Workspaces Control Header bar */}
        <div className="p-4 border-b border-white/5 flex items-center justify-between bg-slate-950/40 shrink-0 select-none">
          <div className="flex items-center gap-3">
            {/* Sidebar toggle */}
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-1.5 rounded-xl bg-slate-900 border border-white/5 text-slate-400 hover:text-white transition-colors cursor-pointer mr-1"
              title="Toggle Sidebar Layout"
            >
              <Bot className="w-4 h-4" />
            </button>
            <div className="text-left">
              {activeThread ? (
                <input
                  type="text"
                  value={activeThread.title}
                  onChange={(e) => handleRenameThreadTitle(activeThread.id, e.target.value)}
                  className="bg-transparent font-display font-black text-slate-100 text-sm focus:bg-slate-900 focus:outline-none focus:px-2 rounded border-none py-0.5 outline-none max-w-[200px] md:max-w-[320px] transition-all"
                  title="Click to rename subject workspace"
                />
              ) : (
                <h4 className="font-display font-black text-slate-100 text-sm">Workspace Copilot</h4>
              )}
              <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono text-slate-400 mt-0.5">
                <span className="w-1.5 h-1.5 bg-purple-400 rounded-full"></span>
                <span>Active Model: **gemini-3.5-flash**</span>
                <span className="text-slate-600">|</span>
                <button
                  id="btn_toggle_diagnostic"
                  onClick={() => setShowDebugPanel(!showDebugPanel)}
                  className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold border transition-colors cursor-pointer ${
                    showDebugPanel 
                      ? "bg-purple-500/20 text-purple-300 border-purple-400/30" 
                      : "bg-slate-900 hover:bg-slate-800 text-slate-450 border-white/5"
                  }`}
                >
                  {showDebugPanel ? "Hide Diagnostic Monitor [ON]" : "Show Diagnostic Monitor [OFF]"}
                </button>
              </div>
            </div>
          </div>

          {/* Action Deck */}
          <div className="flex items-center gap-1.5">
            {/* Search items */}
            <div className="relative hidden md:block">
              <Search className="absolute left-2.5 top-2 top-2.5 w-3.5 h-3.5 text-slate-500" />
              <input 
                type="text"
                placeholder="Find in logs..."
                value={messagesSearchQuery}
                onChange={(e) => setMessagesSearchQuery(e.target.value)}
                className="bg-slate-900/60 border border-white/5 focus:border-purple-500/40 rounded-lg py-1.5 pl-8 pr-3 text-[10px] text-white placeholder-slate-500 outline-none w-32 focus:w-48 transition-all font-sans"
              />
            </div>
            
            <button
              onClick={handleExportAsMarkdown}
              className="p-1.5 hover:bg-slate-900 border border-white/5 text-slate-400 hover:text-white rounded-lg text-[10px] font-mono flex items-center gap-1 cursor-pointer transition-colors"
              title="Export Conversation of log"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export</span>
            </button>
            <button
              onClick={handlePrintToPDF}
              className="p-1.5 hover:bg-slate-900 border border-white/5 text-slate-400 hover:text-white rounded-lg text-[10px] font-mono flex items-center gap-1 cursor-pointer transition-colors"
              title="Print dialogue log"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">PDF</span>
            </button>
            <button
              onClick={handlePurgeMessages}
              className="p-1.5 hover:bg-red-950/35 border border-red-500/10 text-red-500 rounded-lg text-[10px] font-mono flex items-center gap-1 cursor-pointer transition-colors"
              title="Purge thread history"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Purge</span>
            </button>
          </div>
        </div>

        {/* Global Key Missing Alert */}
        {!((import.meta as any).env?.VITE_GEMINI_API_KEY) && backendHasGeminiKey === false && (
          <div id="missing_api_key_banner" className="bg-red-500/10 border-b border-red-500/20 p-3 px-4 flex items-center gap-3 text-red-300 text-xs">
            <span className="w-2 h-2 rounded-full bg-red-400 animate-ping shrink-0" />
            <div className="flex-1">
              <strong>⚠️ Production Environment Alert:</strong> Both browser and server report that the <strong>GEMINI_API_KEY</strong> environment keys are missing or failed to initialize. AI endpoints may enter offline-only fallback mode.
            </div>
            <button 
              onClick={() => addToast("info", "Help: Adding Secret Keys Key", "Open your Workspace Settings menu, choose Secrets, add your GEMINI_API_KEY, and reload.")}
              className="px-2 py-1 rounded bg-red-500/15 text-[10px] font-mono font-bold hover:bg-red-500/25 border border-red-500/25 shrink-0 transition"
            >
              How to configure?
            </button>
          </div>
        )}

        {/* Debug / Live Diagnostic Monitor Panel */}
        {showDebugPanel && (
          <div id="diagnostic_monitor_panel" className="bg-slate-950/95 border-b border-white/10 p-4 md:p-5 font-mono text-[11px] leading-relaxed text-slate-300 space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <h5 className="font-bold text-purple-400 flex items-center gap-2 text-xs uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></span>
                Mentora Real-Time Diagnostic Monitor (Tutor Copilot Pipeline)
              </h5>
              <span className="text-[9px] text-slate-500 bg-slate-900 border border-white/5 px-2 py-0.5 rounded">
                Live Status Tracker
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-slate-900/60 p-3 rounded-xl border border-white/5">
                <div className="text-slate-500 text-[9px] uppercase font-bold">AI Provider System</div>
                <div className="text-white font-bold text-xs mt-1 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  Active / Dual-Resilient
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Automatically falls back to direct static REST query if stream fails.</p>
              </div>

              <div className="bg-slate-900/60 p-3 rounded-xl border border-white/5">
                <div className="text-slate-500 text-[9px] uppercase font-bold">API Key Configurations</div>
                <div className="space-y-1 mt-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-[10px]">Client VITE_Key:</span>
                    <span className={(import.meta as any).env?.VITE_GEMINI_API_KEY ? "text-emerald-400 font-bold" : "text-amber-400 font-bold"}>
                      {(import.meta as any).env?.VITE_GEMINI_API_KEY ? "CONFIGURED (Browser)" : "MISSING"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-[10px]">Backend Server_Key:</span>
                    <span className={backendHasGeminiKey === true ? "text-emerald-400 font-bold" : backendHasGeminiKey === false ? "text-amber-400 font-bold" : "text-slate-500 animate-pulse"}>
                      {backendHasGeminiKey === true ? "CONFIGURED (Server)" : backendHasGeminiKey === false ? "MISSING (Using Local Fallbacks)" : "VERIFYING..."}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-900/60 p-3 rounded-xl border border-white/5">
                <div className="text-slate-500 text-[9px] uppercase font-bold">Last Endpoint Status</div>
                <div className="text-white font-bold text-xs mt-1 font-mono">
                  HTTP {lastResponseStatus}
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Status of the last POST request processed by server.</p>
              </div>

              <div className="bg-slate-900/60 p-3 rounded-xl border border-white/5">
                <div className="text-slate-500 text-[9px] uppercase font-bold">Active Workspace Context</div>
                <div className="text-purple-300 font-bold text-[10px] mt-1 break-words">
                  ID: {activeThreadId || "None"}
                </div>
                <p className="text-[10px] text-slate-400 mt-1">{filteredMessages.length} messaging logs inside this thread.</p>
              </div>
            </div>

            {lastError !== "None registered" && (
              <div className="bg-red-500/5 p-3 rounded-xl border border-red-500/10 text-red-300">
                <strong className="text-[9px] uppercase text-red-400 tracking-wider">Last Tracked Incident Error:</strong>
                <pre className="text-[10px] mt-1 break-words whitespace-pre-wrap select-text">{lastError}</pre>
              </div>
            )}

            <div className="flex items-center gap-3 text-[10px] text-slate-550 pt-1">
              <span>💡 *Developer Tip: Typing "hi" starts the pipeline trace and results in a guaranteed visible stream response.*</span>
            </div>
          </div>
        )}

        {/* Chat log Scroll Area */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6"
        >
          {filteredMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-xl mx-auto p-4 select-none space-y-6 py-12">
              <div className="bg-purple-500/10 border border-purple-500/20 p-5 rounded-3xl animate-pulse">
                <Bot className="w-10 h-10 text-purple-400" />
              </div>
              <div className="space-y-2">
                <h4 className="font-display font-black text-white text-base">
                  Mentora AI Feynman Copilot
                </h4>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed font-sans max-w-sm mx-auto">
                  Translate calculus integrals, review biology cell mitosis parameters, analyze algorithms, or dictate textbook definitions. I study customized models natively.
                </p>
              </div>

              {/* Suggestions */}
              <div className="w-full space-y-2 pt-4 text-left">
                <span className="text-[10px] uppercase tracking-wider font-mono font-bold text-slate-550 block mb-2 pl-1 select-none">
                  ⚡ Suggested Conceptual Starters
                </span>
                {samplePrompts.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(p.prompt)}
                    className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-slate-900/40 hover:bg-slate-900/80 border border-white/5 hover:border-purple-550/30 text-xs font-semibold text-slate-350 hover:text-white transition-all text-left cursor-pointer duration-150"
                  >
                    <span className="truncate pr-4">{p.title}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {filteredMessages.map((msg) => {
                const isAi = msg.sender === "ai";
                const isSpeaking = speakingMessageId === msg.id;
                
                return (
                  <div
                    key={msg.id}
                    className={`flex gap-4 max-w-4xl relative group transition-all duration-150 ${isAi ? "" : "ml-auto flex-row-reverse"}`}
                  >
                    {/* Character Avatar Indicator */}
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg border relative select-none ${
                      isAi 
                        ? "bg-purple-950/65 border-purple-500/20 text-purple-300" 
                        : "bg-emerald-800 border-emerald-500/20 text-teal-100"
                    }`}>
                      {isAi ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                      
                      {/* Active audio speaking pulsing dot */}
                      {isSpeaking && (
                        <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-purple-400 border border-slate-950 rounded-full animate-ping"></span>
                      )}
                    </div>

                    {/* Chat Bubble card */}
                    <div className="space-y-1 max-w-[85%] text-left">
                      {/* Header signature */}
                      <span className="text-[9px] font-mono text-slate-450 uppercase tracking-wider select-none">
                        {isAi ? "Mentora Copilot" : "Student"} • {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>

                      {/* Content panel */}
                      <div className={`p-5 rounded-3xl font-sans relative ${
                        isAi
                          ? "bg-slate-900/35 border border-white/5 hover:border-white/10 text-slate-200"
                          : "bg-emerald-950/15 border border-emerald-500/15 text-slate-100 shadow-sm"
                      }`}>
                        
                        {/* Display attached Doc text badge if present */}
                        {msg.fileContextName && (
                          <div className="flex items-center gap-2 p-2 px-3 rounded-xl bg-purple-500/5 border border-purple-500/10 text-[10px] font-mono mb-3 text-purple-300">
                            <FileText className="w-3.5 h-3.5 text-purple-400" />
                            <span>Attached document context: <strong>{msg.fileContextName}</strong></span>
                          </div>
                        )}

                        {/* Display base64 attached User screenshot image if exists */}
                        {msg.image && msg.image.data && (
                          <div className="mb-3 border border-white/10 rounded-xl overflow-hidden max-w-sm">
                            <img 
                              src={`data:${msg.image.mimeType};base64,${msg.image.data}`} 
                              alt="Context attachment visual" 
                              className="w-full object-cover max-h-48"
                              referrerPolicy="no-referrer"
                            />
                            <div className="bg-slate-955 p-1.5 text-[9px] font-mono text-slate-400 border-t border-white/5">
                              Uploaded Image ({msg.image.mimeType})
                            </div>
                          </div>
                        )}

                        {/* Render rich Markdown content with copy button, mathematics formulas, lists and dynamic syntax tables */}
                        <div className="text-xs leading-relaxed font-sans space-y-3 prose-strong:text-purple-400 selection:bg-purple-500/30">
                          <Markdown
                            components={{
                              code({ node, className, children, ...props }) {
                                const match = /language-(\w+)/.exec(className || "");
                                const codeString = String(children).replace(/\n$/, "");
                                return match ? (
                                  <div className="my-3 border border-white/10 rounded-2xl overflow-hidden bg-slate-950 font-mono text-xs text-left shadow-2xl relative">
                                    <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900/85 border-b border-white/5 text-slate-400 text-[10px] uppercase font-bold select-none">
                                      <span className="font-mono">{match[1]}</span>
                                      <button
                                        onClick={() => {
                                          navigator.clipboard.writeText(codeString);
                                          addToast("info", "Code Copied 📋", "Code template copied successfully to clipboard!");
                                        }}
                                        className="text-purple-400 hover:text-purple-300 font-bold transition duration-150 cursor-pointer flex items-center gap-1"
                                      >
                                        <Copy className="w-3 h-3" />
                                        Copy Code
                                      </button>
                                    </div>
                                    <pre className="p-4 overflow-x-auto text-[11px] leading-relaxed text-slate-200">
                                      <code>{codeString}</code>
                                    </pre>
                                  </div>
                                ) : (
                                  <code className="px-1.5 py-0.5 rounded bg-slate-800 text-purple-300 font-mono text-[11px] font-bold" {...props}>
                                    {children}
                                  </code>
                                );
                              },
                              table({ children }) {
                                return (
                                  <div className="overflow-x-auto my-4 border border-white/5 rounded-2xl">
                                    <table className="w-full text-left text-xs border-collapse">{children}</table>
                                  </div>
                                );
                              },
                              th({ children }) {
                                return <th className="bg-slate-900 p-2.5 font-bold border-b border-white/10 text-slate-300 uppercase font-mono text-[9px] tracking-wider">{children}</th>;
                              },
                              td({ children }) {
                                return <td className="p-3 border-b border-white/5 text-slate-350">{children}</td>;
                              },
                              p({ children }) {
                                return <p className="mb-2 leading-relaxed">{children}</p>;
                              },
                              ul({ children }) {
                                return <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>;
                              },
                              ol({ children }) {
                                return <ol className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>;
                              }
                            }}
                          >
                            {msg.text}
                          </Markdown>
                        </div>
                      </div>

                      {/* Chat Utility Action deck (appearing on hover or responsive tabs) */}
                      <div className="flex items-center gap-3 pt-1 pl-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                        {/* 1. Speech synthesis synthesis */}
                        <button
                          onClick={() => handleToggleSpeak(msg.id, msg.text)}
                          className={`flex items-center gap-1.5 text-[10px] font-mono tracking-wide cursor-pointer transition ${
                            isSpeaking 
                              ? "text-red-400 hover:text-red-300" 
                              : "text-slate-400 hover:text-purple-400"
                          }`}
                          title={isSpeaking ? "Stop Voice Playback" : "Read Lesson aloud"}
                        >
                          {isSpeaking ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                          <span>{isSpeaking ? "Stop synthesis" : "Speak text"}</span>
                        </button>

                        {/* 2. Copy entire message text */}
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(msg.text);
                            addToast("info", "Message Copied 📋", "Response text copied successfully to clipboard!");
                          }}
                          className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400 hover:text-purple-400 transition cursor-pointer"
                          title="Copy message definition"
                        >
                          <Copy className="w-3 h-3" />
                          <span>Copy Message</span>
                        </button>

                        {/* 3. Bookmark flag message */}
                        <button
                          onClick={() => handleToggleBookmarkMessage(msg.id)}
                          className={`flex items-center gap-1.5 text-[10px] font-mono transition cursor-pointer ${
                            msg.bookmarked 
                              ? "text-amber-400 hover:text-amber-500 font-bold" 
                              : "text-slate-400 hover:text-amber-400"
                          }`}
                          title="Bookmark concept note"
                        >
                          <Bookmark className={`w-3 h-3 ${msg.bookmarked ? "fill-amber-400" : ""}`} />
                          <span>{msg.bookmarked ? "Pushed Bookmark" : "Bookmark message"}</span>
                        </button>

                        {/* 4. Retry option on AI answers */}
                        {isAi && (
                          <button
                            onClick={() => handleSend("", true)}
                            className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400 hover:text-purple-400 transition cursor-pointer"
                            title="Regenerate this responsive message"
                          >
                            <RefreshCw className="w-3 h-3" />
                            <span>Retry generation</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Glowing Dynamic Typing Dots on Streaming generation */}
              {loading && !activeThread?.messages[activeThread.messages.length - 1]?.text.startsWith("⚡ Mentora AI is processing") && (
                <div className="flex gap-4 max-w-lg">
                  <div className="w-9 h-9 rounded-xl bg-purple-950/40 border border-purple-500/15 flex items-center justify-center text-purple-400 flex-shrink-0 animate-pulse">
                    <Bot className="w-4 h-4 animate-spin" />
                  </div>
                  <div className="bg-slate-900/30 border border-white/5 p-4 rounded-2.5xl flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
                    <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
                    <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 3. Active Input controller Area */}
        <div className="p-4 border-t border-white/5 bg-slate-950/80 sticky bottom-0 z-30 shrink-0">
          
          {/* File Attachments previews deck */}
          {(uploadedImage || uploadedDocText) && (
            <div className="flex flex-wrap items-center gap-2 mb-3 bg-slate-900/50 p-2.5 rounded-2xl border border-purple-500/10">
              <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-slate-450 px-1 select-none">
                Linked Assets ({uploadedImage ? "Visual image" : "Text document"}):
              </span>
              <div className="relative flex items-center gap-2 px-3 py-1.5 bg-purple-950/20 border border-purple-500/20 rounded-xl max-w-xs text-xs">
                {uploadedImage ? (
                  <Image className="w-3.5 h-3.5 text-purple-400" />
                ) : (
                  <FileText className="w-3.5 h-3.5 text-purple-400" />
                )}
                <span className="font-mono text-[10px] text-slate-200 truncate pr-4">{uploadedDocName || "StudyAsset"}</span>
                <button 
                  onClick={handleClearAttachments}
                  className="absolute right-1.5 text-slate-400 hover:text-red-400 p-0.5 rounded cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}

          {/* Quick Action prompts deck */}
          {!loading && (
            <div className="flex flex-wrap items-center gap-1.5 mb-3 overflow-x-auto select-none">
              {activeThread && activeThread.messages.length > 0 && activeThread.messages[activeThread.messages.length - 1]?.sender === "ai" && (
                <button
                  onClick={() => handleSend("", true)}
                  className="px-2.5 py-1.5 bg-purple-950/40 hover:bg-purple-900 border border-purple-500/30 hover:border-purple-500/60 text-[10px] text-purple-300 hover:text-white rounded-xl transition-all font-sans font-semibold flex items-center gap-1 cursor-pointer duration-155 shadow-md shrink-0"
                  title="Regenerate the last AI response"
                >
                  <RefreshCw className="w-3 h-3 text-purple-400" />
                  <span>Regenerate Response</span>
                </button>
              )}
              {quickActions.map((qa, i) => (
                <button
                  key={i}
                  onClick={() => setInputText(qa.text)}
                  className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-white/5 hover:border-purple-500/20 text-[10px] text-slate-350 hover:text-white rounded-xl transition-all font-sans cursor-pointer whitespace-nowrap duration-150"
                >
                  {qa.label}
                </button>
              ))}
            </div>
          )}

          {/* Core Input Row */}
          <div className="flex items-center gap-3 relative">
            {/* hidden trigger input */}
            <input 
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="text/*,image/*,.py,.js,.json,.md,.css"
              className="hidden"
            />
            {/* Trigger click hook button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              className="p-3.5 bg-slate-900 hover:bg-slate-800 border border-white/5 hover:border-purple-500/25 text-slate-400 hover:text-slate-100 rounded-2xl transition duration-150 cursor-pointer shrink-0 disabled:opacity-50"
              title="Upload text documents or image screenshots"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            {/* Main prompt input bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex-1 relative flex items-center"
            >
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                disabled={loading}
                placeholder={
                  loading 
                    ? "Mentora AI is generating..." 
                    : "Ask tutoring doubts (solve limits, create interactive flashcards, dictation)..."
                }
                className="w-full bg-slate-900 border border-white/5 focus:border-purple-500/40 focus:ring-1 focus:ring-purple-500/15 rounded-2xl py-3.5 pl-4 pr-24 text-xs text-white placeholder-slate-450 outline-none transition-all shadow-inner font-sans"
              />

              {/* Controls inside input field */}
              <div className="absolute right-2.5 flex items-center gap-1.5">
                {/* Glowing speech triggers */}
                <button
                  type="button"
                  onClick={handleToggleListening}
                  className={`p-2 rounded-xl transition duration-200 cursor-pointer ${
                    isListening 
                      ? "bg-red-500/20 border border-red-500/40 text-red-400 animate-pulse" 
                      : "hover:bg-slate-800 text-slate-450 hover:text-white"
                  }`}
                  title={isListening ? "Listening... click to stop" : "Use microphone dictation"}
                >
                  {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                </button>

                {/* Submit button / Stop stream button */}
                {loading ? (
                  <button
                    type="button"
                    onClick={handleAbortGeneration}
                    className="p-2 bg-red-650 hover:bg-red-700 text-white rounded-xl transition cursor-pointer shadow border border-red-500/20"
                    title="Stop AI Generation"
                  >
                    <Square className="w-3.5 h-3.5 fill-white" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={!inputText.trim() && !uploadedImage && !uploadedDocText}
                    className="p-2 px-3 bg-gradient-to-tr from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 disabled:from-slate-800 disabled:to-slate-800 text-slate-100 disabled:text-slate-500 rounded-xl transition cursor-pointer shadow-md flex items-center gap-1 font-mono text-[10px] uppercase font-black"
                  >
                    <Send className="w-3 h-3" />
                    <span>Send</span>
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Quick informational footer alert */}
          <div className="flex items-center gap-1.5 mt-3.5 justify-center text-[9px] font-mono text-slate-500 select-none">
            <Info className="w-3 h-3 text-slate-650" />
            <span>Feynman logic triggered. Complete daily active threads to earn XP and expand your badges collection.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
