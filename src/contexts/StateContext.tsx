import React, { createContext, useContext, useState, useEffect } from "react";
import { UserProfile, Note, Quiz, Roadmap, ChatMessage, LeaderboardUser, Toast } from "../types";
import { auth, db, isMockFirebase as initialIsMock, registerMockFallback, handleFirestoreError, OperationType, formatAuthError, finalConfig } from "../lib/firebase";
import { onAuthStateChanged, signOut, sendEmailVerification, GoogleAuthProvider, signInWithPopup, setPersistence, browserLocalPersistence, signInWithRedirect, getRedirectResult, signInWithCredential } from "firebase/auth";
import { doc, getDoc, setDoc, collection, getDocs, query, where, addDoc, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { UserSyncService } from "../services/userSyncService";
import { isAndroid, getIsAndroid, getIsIOS, getIsNative } from "../lib/platform";
import { FirebaseAuthentication } from "@capacitor-firebase/authentication";
import { Capacitor } from "@capacitor/core";

interface StateContextType {
  user: UserProfile | null;
  loading: boolean;
  notes: Note[];
  quizzes: Quiz[];
  roadmaps: Roadmap[];
  chats: ChatMessage[];
  leaderboard: LeaderboardUser[];
  currentTheme: "dark" | "light" | "matrix" | "nordic";
  setTheme: (theme: "dark" | "light" | "matrix" | "nordic") => void;
  pomodoroMinutes: number;
  pomodoroSeconds: number;
  pomodoroActive: boolean;
  pomodoroMode: "work" | "break";
  setPomodoroActive: (active: boolean) => void;
  resetPomodoro: () => void;
  setPomodoroTime: (min: number) => void;
  
  // Toast notifications
  toasts: Toast[];
  addToast: (type: "levelup" | "badge" | "info" | "success", title: string, message: string) => void;
  removeToast: (id: string) => void;
  
  // Auth actions
  login: (email: string, pass: string) => Promise<void>;
  register: (email: string, pass: string, name: string) => Promise<void>;
  googleSignIn: () => Promise<void>;
  logout: () => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  isEmailVerified: boolean;
  sendVerificationEmail: () => Promise<void>;
  reloadUserAuth: () => Promise<void>;
  
  // App action triggers
  addXpAndCoins: (xpToAdd: number, coinsToAdd: number) => Promise<void>;
  incrementStreak: () => Promise<void>;
  saveNote: (title: string, content: string, summary: string, flashcards?: any[], isRawResponseFallback?: boolean, rawText?: string) => Promise<Note>;
  deleteNote: (id: string) => Promise<void>;
  saveQuiz: (title: string, questions: any[], score?: number, isRawResponseFallback?: boolean, rawText?: string) => Promise<Quiz>;
  updateQuizScore: (quizId: string, score: number) => Promise<void>;
  saveRoadmap: (subject: string, durationDays: number, steps: any[]) => Promise<Roadmap>;
  toggleRoadmapStep: (roadmapId: string, stepIdx: number) => Promise<void>;
  saveChatMessage: (sender: "user" | "ai", text: string) => Promise<ChatMessage>;
  clearChats: () => void;
}

const StateContext = createContext<StateContextType | undefined>(undefined);

// Helper function to recursively remove undefined fields and replace undefined values to prevent Firestore crashes
function removeUndefinedFields<T>(obj: T): T {
  if (obj === null || typeof obj !== "object") {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(item => removeUndefinedFields(item)) as any;
  }
  const entries = Object.entries(obj).map(([key, value]) => {
    if (value && typeof value === "object") {
      return [key, removeUndefinedFields(value)];
    }
    return [key, value];
  });
  return Object.fromEntries(
    entries.filter(([_, value]) => value !== undefined)
  ) as any;
}

// Base mock leaderboard users for gamification
const INITIAL_LEADERBOARD: LeaderboardUser[] = [
  { uid: "l1", displayName: "Feynman Apprentice", xp: 1450, level: 8 },
  { uid: "l2", displayName: "Marie_Curie_XP", xp: 1200, level: 7 },
  { uid: "l3", displayName: "AlanTuring_99", xp: 980, level: 5 },
  { uid: "user_sim", displayName: "You (Simulated)", xp: 0, level: 1 },
  { uid: "l4", displayName: "AdaLovelaceCode", xp: 850, level: 4 },
  { uid: "l5", displayName: "GalileoFinder", xp: 520, level: 3 },
];

export const StateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isMockFirebase, setIsMockFirebase] = useState(initialIsMock);

  useEffect(() => {
    registerMockFallback(() => {
      setIsMockFirebase(true);
    });
  }, []);

  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<Note[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [roadmaps, setRoadmaps] = useState<Roadmap[]>([]);
  const [chats, setChats] = useState<ChatMessage[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>(INITIAL_LEADERBOARD);
  const [currentTheme, setThemeState] = useState<"dark" | "light" | "matrix" | "nordic">("dark");
  const [isEmailVerified, setIsEmailVerified] = useState<boolean>(false);
  
  // Toasts state handler
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (type: "levelup" | "badge" | "info" | "success", title: string, message: string) => {
    const id = "toast_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, type, title, message }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };
  
  // Pomodoro
  const [pomodoroMinutes, setPomodoroMinutes] = useState(25);
  const [pomodoroSeconds, setPomodoroSeconds] = useState(0);
  const [pomodoroActive, setPomodoroActive] = useState(false);
  const [pomodoroMode, setPomodoroMode] = useState<"work" | "break">("work");

  // Load configuration and cached offline data
  useEffect(() => {
    const cachedTheme = localStorage.getItem("mentora_theme") as any;
    if (cachedTheme) setThemeState(cachedTheme);

    // Initial pre-loaded mock notes and assessments to guide the user immediately
    const localNotes = localStorage.getItem("mentora_notes");
    if (localNotes) {
      setNotes(JSON.parse(localNotes));
    } else {
      const defaultNotes: Note[] = [
        {
          id: "def-n1",
          userId: "any-user",
          title: "Introduction to Neural Networks",
          summary: "• Neural Networks model human brain structures • Deep nodes process features hierarchically • Backpropagation weights adjust gradient loss values.",
          content: "### Core Conceptions\n\nArtificial Neural Networks (ANN) are parallel information structures inspired by biology.\n\n### The Node Unit\n\nEach node collects inputs, multiplies them by individual weight nodes, applies a non-linear activation metric, and channels the outcome.\n\n$$\\text{Output} = \\sigma\\left(\\sum w_i x_i + b\\right)$$\n\n### Optimization\n\nUsing **Gradient Descent** paired with Backpropagation helps compute weight adjustments to bound our general prediction discrepancies.",
          flashcards: [
            { front: "What is Backpropagation?", back: "The step-by-step weight tuning optimization routine propagating error gradients back through levels." },
            { front: "Name the primary activation functions.", back: "Sigmoid, ReLU, Tanh, and GeLU." }
          ],
          createdAt: new Date().toISOString()
        }
      ];
      setNotes(defaultNotes);
      localStorage.setItem("mentora_notes", JSON.stringify(defaultNotes));
    }

    const localQuizzes = localStorage.getItem("mentora_quizzes");
    if (localQuizzes) {
      setQuizzes(JSON.parse(localQuizzes));
    } else {
      const defaultQuizzes: Quiz[] = [
        {
          id: "def-q1",
          userId: "any-user",
          title: "Generative AI Foundations Quiz",
          questions: [
            {
              question: "Which of the following describes the key self-attention mechanism in Transformers?",
              options: [
                "It computes static recurrence parameters sequentially.",
                "It establishes dynamic weights correlating every word with all other words in the token sequence.",
                "It acts purely as a traditional convolutional kernel filter.",
                "It forces randomized noise inputs to collapse into labels."
              ],
              correctIdx: 1,
              explanation: "Self-attention computes dot-product query-key relationships across all input tokens simultaneously, enabling stellar context comprehension without recursive loops."
            }
          ],
          score: 100,
          createdAt: new Date().toISOString()
        }
      ];
      setQuizzes(defaultQuizzes);
      localStorage.setItem("mentora_quizzes", JSON.stringify(defaultQuizzes));
    }

    const localRoadmaps = localStorage.getItem("mentora_roadmaps");
    if (localRoadmaps) {
      setRoadmaps(JSON.parse(localRoadmaps));
    } else {
      const defaultRoadmaps: Roadmap[] = [
        {
          id: "def-r1",
          userId: "any-user",
          subject: "AI Engineering Foundations",
          durationDays: 5,
          steps: [
            { title: "Understand Linear Algebra basics", description: "Learn tensors operations, dot products, and eigenvalues.", completed: true, day: 1 },
            { title: "Backpropagation math & derivatives", description: "Write single-node gradient steps by hand.", completed: false, day: 2 },
            { title: "Building multi-layer neural layers", description: "Construct fully connected nodes with customizable activation.", completed: false, day: 3 }
          ],
          createdAt: new Date().toISOString()
        }
      ];
      setRoadmaps(defaultRoadmaps);
      localStorage.setItem("mentora_roadmaps", JSON.stringify(defaultRoadmaps));
    }

    const localChats = localStorage.getItem("mentora_chats");
    if (localChats) setChats(JSON.parse(localChats));

    const playwrightMock = localStorage.getItem("playwright_mock_user");
    if (playwrightMock) {
      setUser({
        uid: "mock-student-123",
        displayName: "Simulated Student",
        email: "student@example.com",
        photoURL: "",
        role: "student",
        xp: 120,
        level: 1,
        coins: 10,
        streak: 1,
        lastActive: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
        badges: ["First Milestone"],
        createdAt: new Date().toISOString(),
      });
      setIsEmailVerified(true);
      setLoading(false);
    }
  }, []);

  // Sync state helpers to localStorage for mock/hybrid situations
  const syncLocal = (key: string, data: any) => {
    localStorage.setItem(key, JSON.stringify(data));
  };

  // Listen to Auth State
  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }

    // Process redirect results if any (e.g., coming back from Google auth redirect fallback)
    getRedirectResult(auth)
      .then(async (result) => {
        if (result?.user) {
          console.info("[Auth] Resolved redirect and signed in user:", result.user.email);
          console.log("LOGIN SUCCESS");
          console.log("Google popup success: true");
          console.log("Firebase Auth success: true");
          console.log("User UID:", result.user.uid);
          console.log("AUTH UID:", result.user.uid);
          console.log("AUTH EMAIL:", result.user.email || "");

          console.log("USERSYNC START");
          const user = result.user;
          const userRef = doc(db, "users", user.uid);
          
          console.log("Firestore document lookup:", user.uid);
          const userSnap = await getDoc(userRef);

          if (!userSnap.exists()) {
            console.log("USER DOC EXISTS: false");
            console.log("FIRESTORE WRITE START");
            console.log("Firebase Project ID:", finalConfig.projectId);
            console.log("Authenticated User UID:", auth?.currentUser?.uid || user.uid);
            console.log("Authenticated User Email:", auth?.currentUser?.email || user.email || "");
            console.log("FIRESTORE WRITE PATH:", `users/${user.uid}`);
            try {
              const payload = removeUndefinedFields({
                uid: user.uid,
                name: user.displayName || "",
                displayName: user.displayName || "",
                email: user.email || "",
                photoURL: user.photoURL || "",
                role: "student",
                xp: 100,
                level: 1,
                coins: 5,
                streak: 1,
                badges: ["First Milestone"],
                createdAt: serverTimestamp(),
                lastLoginAt: serverTimestamp(),
                lastActive: serverTimestamp()
              });
              console.log("Firestore Payload:", payload);
              await setDoc(userRef, payload);
              console.log("USER DOC CREATED: true");
              console.log("FIRESTORE WRITE SUCCESS");
              console.log("Firestore write result: success");
            } catch (error: any) {
              console.error("FIRESTORE ERROR CODE:", error.code);
              console.error("FIRESTORE ERROR MESSAGE:", error.message);
              console.error("FIRESTORE ERROR OBJECT:", error);
              console.log("USER DOC CREATED: false");
              console.log("FIRESTORE WRITE ERROR", error);
              console.log("FIRESTORE ERROR:", error);
              throw error;
            }
          } else {
            console.log("USER DOC EXISTS: true");
            console.log("FIRESTORE WRITE START");
            console.log("Firebase Project ID:", finalConfig.projectId);
            console.log("Authenticated User UID:", auth?.currentUser?.uid || user.uid);
            console.log("Authenticated User Email:", auth?.currentUser?.email || user.email || "");
            console.log("FIRESTORE WRITE PATH:", `users/${user.uid}`);
            try {
              const payload = removeUndefinedFields({
                lastLoginAt: serverTimestamp(),
                lastActive: serverTimestamp()
              });
              console.log("Firestore Payload:", payload);
              await updateDoc(userRef, payload);
              console.log("USER DOC UPDATED: true");
              console.log("FIRESTORE WRITE SUCCESS");
              console.log("Firestore write result: success");
            } catch (error: any) {
              console.error("FIRESTORE ERROR CODE:", error.code);
              console.error("FIRESTORE ERROR MESSAGE:", error.message);
              console.error("FIRESTORE ERROR OBJECT:", error);
              console.log("USER DOC UPDATED: false");
              console.log("FIRESTORE WRITE ERROR", error);
              console.log("FIRESTORE ERROR:", error);
              throw error;
            }
          }
        }
      })
      .catch((err) => {
        console.error("[Auth] Redirect sign-in result check failure:", err);
        const friendlyMsg = formatAuthError(err);
        addToast("info", "Connect Google Failure", friendlyMsg);
      });

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (localStorage.getItem("playwright_mock_user")) {
        setLoading(false);
        return;
      }
      if (firebaseUser) {
        setIsEmailVerified(firebaseUser.emailVerified);
        try {
          // Sync with Firestore using UserSyncService
          console.log("USERSYNC START");
          const syncedProfile = await UserSyncService.syncUser(firebaseUser);
          setUser(syncedProfile);
          localStorage.setItem("mentora_offline_user", JSON.stringify(syncedProfile));
          
          // Fetch user-specific Notes, Quizzes, Roadmaps
          const notesSnap = await getDocs(query(collection(db, "notes"), where("userId", "==", firebaseUser.uid)));
          const notesList: Note[] = [];
          notesSnap.forEach(d => notesList.push({ id: d.id, ...d.data() } as Note));
          if (notesList.length > 0) setNotes(notesList);

          const quizSnap = await getDocs(query(collection(db, "quizzes"), where("userId", "==", firebaseUser.uid)));
          const quizList: Quiz[] = [];
          quizSnap.forEach(d => quizList.push({ id: d.id, ...d.data() } as Quiz));
          if (quizList.length > 0) setQuizzes(quizList);

          const roadmapsSnap = await getDocs(query(collection(db, "roadmaps"), where("userId", "==", firebaseUser.uid)));
          const roadmapsList: Roadmap[] = [];
          roadmapsSnap.forEach(d => roadmapsList.push({ id: d.id, ...d.data() } as Roadmap));
          if (roadmapsList.length > 0) setRoadmaps(roadmapsList);

        } catch (err: any) {
          const errMsg = err?.message || String(err || "");
          console.error("[Auth Error] Firestore profile setup failed:", errMsg);
          
          // Show: "Account created but profile setup failed."
          addToast(
            "info",
            "Profile Synchronization Error ⚠️",
            "Account created but profile setup failed. Please contact support or try logging in again."
          );
          
          // Set user to null to prevent bypassing synchronization policies
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Update leaderboard scores when user updates their level
  useEffect(() => {
    if (user) {
      setLeaderboard((prev) => {
        const next = prev.map((item) => {
          if (item.uid === "user_sim" || item.uid === user.uid) {
            return { ...item, uid: user.uid, displayName: user.displayName, xp: user.xp, level: user.level };
          }
          return item;
        });
        return [...next].sort((a, b) => b.xp - a.xp);
      });
    }
  }, [user]);

  // Pomodoro timer interval
  useEffect(() => {
    let interval: any = null;
    if (pomodoroActive) {
      interval = setInterval(() => {
        if (pomodoroSeconds > 0) {
          setPomodoroSeconds((s) => s - 1);
        } else if (pomodoroMinutes > 0) {
          setPomodoroMinutes((m) => m - 1);
          setPomodoroSeconds(59);
        } else {
          // Timer finished! Give XP reward based on focus completion
          const isWork = pomodoroMode === "work";
          if (isWork) {
            addXpAndCoins(50, 10);
            if (user && !user.badges.includes("Focus Guru")) {
              updateBadgeList("Focus Guru");
            }
            addToast("success", "Focus Session Complete! ⏱️", "Congratulations! You completed a 25-minute Pomodoro focus session. +50 XP and +10 Coins!");
            setPomodoroMode("break");
            setPomodoroMinutes(5);
          } else {
            addToast("info", "Interval Break Over! 🚀", "Time to get back to studying. Stay active!");
            setPomodoroMode("work");
            setPomodoroMinutes(25);
          }
          setPomodoroSeconds(0);
          setPomodoroActive(false);
        }
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [pomodoroActive, pomodoroMinutes, pomodoroSeconds, pomodoroMode]);

  const updateBadgeList = async (badge: string) => {
    if (!user) return;
    const nextBadges = [...user.badges];
    if (!nextBadges.includes(badge)) {
      nextBadges.push(badge);
      const nextProfile = { ...user, badges: nextBadges };
      setUser(nextProfile);
      
      // Dispatch premium celebration toast Alert
      addToast("badge", "BADGE UNLOCKED! 🏅", `Incredible studying! You've unlocked the rare "${badge}" collectible.`);

      if (!isMockFirebase && auth?.currentUser) {
        console.log("FIRESTORE WRITE START");
        console.log("Firebase Project ID:", finalConfig.projectId);
        console.log("Authenticated User UID:", auth?.currentUser?.uid);
        console.log("Authenticated User Email:", auth?.currentUser?.email || "");
        console.log("FIRESTORE WRITE PATH:", `users/${auth.currentUser.uid}`);
        try {
          const payload = removeUndefinedFields({ badges: nextBadges });
          console.log("Firestore Payload:", payload);
          await updateDoc(doc(db, "users", auth.currentUser.uid), payload);
        } catch (error: any) {
          console.error("FIRESTORE ERROR CODE:", error.code);
          console.error("FIRESTORE ERROR MESSAGE:", error.message);
          console.error("FIRESTORE ERROR OBJECT:", error);
          console.warn("Failed to update firestore badges", error);
        }
      } else {
        syncLocal("mentora_offline_user", nextProfile);
      }
    }
  };

  const setTheme = (theme: "dark" | "light" | "matrix" | "nordic") => {
    setThemeState(theme);
    localStorage.setItem("mentora_theme", theme);
  };

  const resetPomodoro = () => {
    setPomodoroActive(false);
    setPomodoroMinutes(pomodoroMode === "work" ? 25 : 5);
    setPomodoroSeconds(0);
  };

  const setPomodoroTime = (min: number) => {
    setPomodoroActive(false);
    setPomodoroMinutes(min);
    setPomodoroSeconds(0);
  };

  // Auth Functions
  const login = async (email: string, pass: string) => {
    throw new Error("Email Authentication has been deprecated. Please use Google Sign-In ONLY.");
  };

  const register = async (email: string, pass: string, name: string) => {
    throw new Error("Email Authentication has been deprecated. Please use Google Sign-In ONLY.");
  };

  const googleSignIn = async (retryCount = 0): Promise<void> => {
    if (!auth) {
      throw new Error("Firebase Authentication is not initialized. Please verify configuration.");
    }
    
    // Evaluate platform dynamically at execution time
    const dynamicPlatform = Capacitor.getPlatform();
    const dynamicIsNative = Capacitor.isNativePlatform();
    const isAndroidApp = getIsAndroid();
    const isIOSApp = getIsIOS();
    const isMobileNative = isAndroidApp || isIOSApp || dynamicIsNative || dynamicPlatform === "android" || dynamicPlatform === "ios";

    console.info(`[Auth] googleSignIn invoked. Platform: ${dynamicPlatform}, Native: ${dynamicIsNative}, isAndroidApp: ${isAndroidApp}, isIOSApp: ${isIOSApp}, isMobileNative: ${isMobileNative}`);

    setLoading(true);
    try {
      // On Android/iOS Native (Capacitor WebView), strictly enforce native Google Sign-in via Capawesome
      if (isMobileNative) {
        console.info("[Auth] Native mobile environment detected — calling Capawesome native authentication.");
        const result = await FirebaseAuthentication.signInWithGoogle({});
        if (!result.credential?.idToken) {
          throw new Error("Google Sign-In failed: No ID Token returned from native SDK.");
        }
        const credential = GoogleAuthProvider.credential(result.credential.idToken);
        const userCredential = await signInWithCredential(auth, credential);
        const user = userCredential.user;
        
        console.log("LOGIN SUCCESS");
        console.log("Google native success: true");
        console.log("Firebase Auth success: true");
        console.log("User UID:", user.uid);
        console.log("AUTH UID:", user.uid);
        console.log("AUTH EMAIL:", user.email || "");

        console.log("USERSYNC START");
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
          console.log("USER DOC EXISTS: false");
          console.log("FIRESTORE WRITE START");
          console.log("Firebase Project ID:", finalConfig.projectId);
          console.log("Authenticated User UID:", auth?.currentUser?.uid || user.uid);
          console.log("Authenticated User Email:", auth?.currentUser?.email || user.email || "");
          console.log("FIRESTORE WRITE PATH:", `users/${user.uid}`);
          try {
            const payload = removeUndefinedFields({
              uid: user.uid,
              name: user.displayName || "",
              displayName: user.displayName || "",
              email: user.email || "",
              photoURL: user.photoURL || "",
              role: "student",
              xp: 100,
              level: 1,
              coins: 5,
              streak: 1,
              badges: ["First Milestone"],
              createdAt: serverTimestamp(),
              lastLoginAt: serverTimestamp(),
              lastActive: serverTimestamp()
            });
            console.log("Firestore Payload:", payload);
            await setDoc(userRef, payload);
            console.log("USER DOC CREATED: true");
            console.log("FIRESTORE WRITE SUCCESS");
            console.log("Firestore write result: success");
          } catch (error: any) {
            console.error("FIRESTORE ERROR CODE:", error.code);
            console.error("FIRESTORE ERROR MESSAGE:", error.message);
            console.error("FIRESTORE ERROR OBJECT:", error);
            console.log("USER DOC CREATED: false");
            console.log("FIRESTORE WRITE ERROR", error);
            console.log("FIRESTORE ERROR:", error);
            throw error;
          }
        } else {
          console.log("USER DOC EXISTS: true");
          console.log("FIRESTORE WRITE START");
          console.log("Firebase Project ID:", finalConfig.projectId);
          console.log("Authenticated User UID:", auth?.currentUser?.uid || user.uid);
          console.log("Authenticated User Email:", auth?.currentUser?.email || user.email || "");
          console.log("FIRESTORE WRITE PATH:", `users/${user.uid}`);
          try {
            const payload = removeUndefinedFields({
              lastLoginAt: serverTimestamp(),
              lastActive: serverTimestamp()
            });
            console.log("Firestore Payload:", payload);
            await updateDoc(userRef, payload);
            console.log("USER DOC UPDATED: true");
            console.log("FIRESTORE WRITE SUCCESS");
            console.log("Firestore write result: success");
          } catch (error: any) {
            console.error("FIRESTORE ERROR CODE:", error.code);
            console.error("FIRESTORE ERROR MESSAGE:", error.message);
            console.error("FIRESTORE ERROR OBJECT:", error);
            console.log("USER DOC UPDATED: false");
            console.log("FIRESTORE WRITE ERROR", error);
            console.log("FIRESTORE ERROR:", error);
            throw error;
          }
        }

        addToast("success", "Welcome Academic", `Log-in successful! Welcome back, ${user.displayName || "Scholar"}.`);
        return;
      }

      // On Web, use standard popup-based sign-in
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      await setPersistence(auth, browserLocalPersistence);
      
      try {
        console.info(`[Auth] Attempting popup-based login (attempt ${retryCount + 1})...`);
        const result = await signInWithPopup(auth, provider);
        if (result.user) {
          console.log("LOGIN SUCCESS");
          console.log("Google popup success: true");
          console.log("Firebase Auth success: true");
          console.log("User UID:", result.user.uid);
          console.log("AUTH UID:", result.user.uid);
          console.log("AUTH EMAIL:", result.user.email || "");

          console.log("USERSYNC START");
          const user = result.user;
          const userRef = doc(db, "users", user.uid);
          
          console.log("Firestore document lookup:", user.uid);
          const userSnap = await getDoc(userRef);

          if (!userSnap.exists()) {
            console.log("USER DOC EXISTS: false");
            console.log("FIRESTORE WRITE START");
            console.log("Firebase Project ID:", finalConfig.projectId);
            console.log("Authenticated User UID:", auth?.currentUser?.uid || user.uid);
            console.log("Authenticated User Email:", auth?.currentUser?.email || user.email || "");
            console.log("FIRESTORE WRITE PATH:", `users/${user.uid}`);
            try {
              const payload = removeUndefinedFields({
                uid: user.uid,
                name: user.displayName || "",
                displayName: user.displayName || "",
                email: user.email || "",
                photoURL: user.photoURL || "",
                role: "student",
                xp: 100,
                level: 1,
                coins: 5,
                streak: 1,
                badges: ["First Milestone"],
                createdAt: serverTimestamp(),
                lastLoginAt: serverTimestamp(),
                lastActive: serverTimestamp()
              });
              console.log("Firestore Payload:", payload);
              await setDoc(userRef, payload);
              console.log("USER DOC CREATED: true");
              console.log("FIRESTORE WRITE SUCCESS");
              console.log("Firestore write result: success");
            } catch (error: any) {
              console.error("FIRESTORE ERROR CODE:", error.code);
              console.error("FIRESTORE ERROR MESSAGE:", error.message);
              console.error("FIRESTORE ERROR OBJECT:", error);
              console.log("USER DOC CREATED: false");
              console.log("FIRESTORE WRITE ERROR", error);
              console.log("FIRESTORE ERROR:", error);
              throw error;
            }
          } else {
            console.log("USER DOC EXISTS: true");
            console.log("FIRESTORE WRITE START");
            console.log("Firebase Project ID:", finalConfig.projectId);
            console.log("Authenticated User UID:", auth?.currentUser?.uid || user.uid);
            console.log("Authenticated User Email:", auth?.currentUser?.email || user.email || "");
            console.log("FIRESTORE WRITE PATH:", `users/${user.uid}`);
            try {
              const payload = removeUndefinedFields({
                lastLoginAt: serverTimestamp(),
                lastActive: serverTimestamp()
              });
              console.log("Firestore Payload:", payload);
              await updateDoc(userRef, payload);
              console.log("USER DOC UPDATED: true");
              console.log("FIRESTORE WRITE SUCCESS");
              console.log("Firestore write result: success");
            } catch (error: any) {
              console.error("FIRESTORE ERROR CODE:", error.code);
              console.error("FIRESTORE ERROR MESSAGE:", error.message);
              console.error("FIRESTORE ERROR OBJECT:", error);
              console.log("USER DOC UPDATED: false");
              console.log("FIRESTORE WRITE ERROR", error);
              console.log("FIRESTORE ERROR:", error);
              throw error;
            }
          }

          addToast("success", "Welcome Academic", `Log-in successful! Welcome back, ${result.user.displayName || "Scholar"}.`);
        }
      } catch (popupErr: any) {
        const errCode = popupErr?.code || "";
        const isPopupBlockedOrClosed = errCode === "auth/popup-blocked" || 
                                       errCode === "auth/popup-closed-by-user" || 
                                       errCode === "auth/cancelled-popup-request";
        
        // If it is a temporary network request error, support automatic retry
        if (errCode === "auth/network-request-failed" && retryCount < 2) {
          console.warn(`[Auth] Network failure during sign-in. Retrying in ${500 * (retryCount + 1)}ms...`);
          await new Promise(resolve => setTimeout(resolve, 500 * (retryCount + 1)));
          return googleSignIn(retryCount + 1);
        }
        
        if (isPopupBlockedOrClosed) {
          console.info("[Auth] Popup blocked or closed by user. Redirecting directly to Google login interface.");
          addToast("info", "Redirecting Sign-In", "Popup closed or blocked. Redirecting to Google login page...");
          await signInWithRedirect(auth, provider);
        } else {
          throw popupErr;
        }
      }
    } catch (err: any) {
      console.error("[Auth] Google SignIn failure details:", err);
      const friendlyMsg = formatAuthError(err);
      addToast("info", "Connect Google Failure", friendlyMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    localStorage.removeItem("mentora_offline_user");
    localStorage.removeItem("playwright_mock_user");
    if (!auth) {
      setUser(null);
      return;
    }
    await signOut(auth);
    setUser(null);
  };

  const forgotPassword = async (email: string) => {
    throw new Error("Password recovery is unavailable. Please use Google Sign-In ONLY.");
  };

  const sendVerificationEmail = async () => {
    if (!auth) {
      throw new Error("No active credentials service available.");
    }
    const currentUser = auth.currentUser;
    if (currentUser) {
      await sendEmailVerification(currentUser);
      addToast("success", "Verification Sent ✉️", "Verification link sent to: " + currentUser.email);
    } else {
      throw new Error("No active student session detected.");
    }
  };

  const reloadUserAuth = async () => {
    if (!auth) {
      throw new Error("No active credentials service available.");
    }
    const currentUser = auth.currentUser;
    if (currentUser) {
      await currentUser.reload();
      const verifiedNow = auth.currentUser?.emailVerified || false;
      setIsEmailVerified(verifiedNow);
      if (verifiedNow) {
        addToast("success", "Security Verified ✔️", "Splendid! Your email address is now verified.");
      } else {
        addToast("info", "Verification Status ⏳", "Verification is still pending. Check the link sent to " + currentUser.email);
      }
    }
  };

  // Gamification metrics modifier
  const addXpAndCoins = async (xpToAdd: number, coinsToAdd: number) => {
    if (!user) return;
    const nextXp = user.xp + xpToAdd;
    const nextLevel = Math.floor(nextXp / 500) + 1;
    const nextCoins = user.coins + coinsToAdd;
    
    // Check if newly leveled up
    if (nextLevel > user.level) {
      addToast("levelup", "LEVEL UP! 🚀", `Congratulations! You reached Level ${nextLevel}! Unlocked 15 bonus coins.`);
    }

    const nextProfile: UserProfile = {
      ...user,
      xp: nextXp,
      level: nextLevel,
      coins: nextCoins + (nextLevel > user.level ? 15 : 0),
      lastActive: new Date().toISOString()
    };
    
    setUser(nextProfile);

    if (!isMockFirebase && auth?.currentUser) {
      console.log("FIRESTORE WRITE START");
      console.log("Firebase Project ID:", finalConfig.projectId);
      console.log("Authenticated User UID:", auth.currentUser.uid);
      console.log("Authenticated User Email:", auth.currentUser.email || "");
      console.log("FIRESTORE WRITE PATH:", `users/${auth.currentUser.uid}`);
      try {
        const payload = removeUndefinedFields({
          xp: nextXp,
          level: nextLevel,
          coins: nextProfile.coins,
          lastActive: nextProfile.lastActive
        });
        console.log("Firestore Payload:", payload);
        await updateDoc(doc(db, "users", auth.currentUser.uid), payload);
      } catch (error: any) {
        console.error("FIRESTORE ERROR CODE:", error.code);
        console.error("FIRESTORE ERROR MESSAGE:", error.message);
        console.error("FIRESTORE ERROR OBJECT:", error);
        console.warn(error);
      }
    } else {
      syncLocal("mentora_offline_user", nextProfile);
    }
  };

  const incrementStreak = async () => {
    if (!user) return;
    const nextStreak = user.streak + 1;
    const mockProfile = { ...user, streak: nextStreak, lastActive: new Date().toISOString() };
    setUser(mockProfile);

    if (!isMockFirebase && auth?.currentUser) {
      console.log("FIRESTORE WRITE START");
      console.log("Firebase Project ID:", finalConfig.projectId);
      console.log("Authenticated User UID:", auth.currentUser.uid);
      console.log("Authenticated User Email:", auth.currentUser.email || "");
      console.log("FIRESTORE WRITE PATH:", `users/${auth.currentUser.uid}`);
      try {
        const payload = removeUndefinedFields({
          streak: nextStreak,
          lastActive: mockProfile.lastActive
        });
        console.log("Firestore Payload:", payload);
        await updateDoc(doc(db, "users", auth.currentUser.uid), payload);
      } catch (error: any) {
        console.error("FIRESTORE ERROR CODE:", error.code);
        console.error("FIRESTORE ERROR MESSAGE:", error.message);
        console.error("FIRESTORE ERROR OBJECT:", error);
        console.warn(error);
      }
    } else {
      syncLocal("mentora_offline_user", mockProfile);
    }
  };

  // Study Note CRUD handlers
  const saveNote = async (
    title: string,
    content: string,
    summary: string,
    flashcards?: any[],
    isRawResponseFallback?: boolean,
    rawText?: string
  ): Promise<Note> => {
    const fresh: Note = {
      id: "note_" + Date.now(),
      userId: auth?.currentUser?.uid || user?.uid || "mock_uid",
      title,
      content,
      summary,
      flashcards,
      createdAt: new Date().toISOString(),
      isRawResponseFallback: isRawResponseFallback ?? false,
      rawText: rawText ?? ""
    };

    const nextList = [fresh, ...notes];
    setNotes(nextList);
    syncLocal("mentora_notes", nextList);

    if (!isMockFirebase && auth?.currentUser) {
      console.log("FIRESTORE WRITE START");
      console.log("Firebase Project ID:", finalConfig.projectId);
      console.log("Authenticated User UID:", auth.currentUser.uid);
      console.log("Authenticated User Email:", auth.currentUser.email || "");
      console.log("FIRESTORE WRITE PATH:", `notes/${fresh.id}`);
      try {
        const payload = removeUndefinedFields(fresh);
        console.log("Firestore Payload:", payload);
        await setDoc(doc(db, "notes", fresh.id), payload);
      } catch (error: any) {
        console.error("FIRESTORE ERROR CODE:", error.code);
        console.error("FIRESTORE ERROR MESSAGE:", error.message);
        console.error("FIRESTORE ERROR OBJECT:", error);
        addToast("info", "Cloud Sync Off ⚠️", "Generated successfully but could not be saved.");
      }
    }
    
    await addXpAndCoins(35, 5); // Reward note creation
    return fresh;
  };

  const deleteNote = async (id: string) => {
    const nextList = notes.filter(n => n.id !== id);
    setNotes(nextList);
    syncLocal("mentora_notes", nextList);

    if (!isMockFirebase && auth?.currentUser) {
      try {
        await deleteDoc(doc(db, "notes", id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `notes/${id}`);
      }
    }
  };

  // Quiz assessment handlers
  const saveQuiz = async (
    title: string,
    questions: any[],
    score?: number,
    isRawResponseFallback?: boolean,
    rawText?: string
  ): Promise<Quiz> => {
    const fresh: Quiz = {
      id: "quiz_" + Date.now(),
      userId: auth?.currentUser?.uid || user?.uid || "mock_uid",
      title,
      questions,
      createdAt: new Date().toISOString(),
      isRawResponseFallback: isRawResponseFallback ?? false,
      rawText: rawText ?? ""
    };
    if (score !== undefined) {
      fresh.score = score;
    }

    const nextList = [fresh, ...quizzes];
    setQuizzes(nextList);
    syncLocal("mentora_quizzes", nextList);

    if (!isMockFirebase && auth?.currentUser) {
      console.log("FIRESTORE WRITE START");
      console.log("Firebase Project ID:", finalConfig.projectId);
      console.log("Authenticated User UID:", auth.currentUser.uid);
      console.log("Authenticated User Email:", auth.currentUser.email || "");
      console.log("FIRESTORE WRITE PATH:", `quizzes/${fresh.id}`);
      try {
        const payload = removeUndefinedFields(fresh);
        console.log("Firestore Payload:", payload);
        await setDoc(doc(db, "quizzes", fresh.id), payload);
      } catch (error: any) {
        console.error("FIRESTORE ERROR CODE:", error.code);
        console.error("FIRESTORE ERROR MESSAGE:", error.message);
        console.error("FIRESTORE ERROR OBJECT:", error);
        addToast("info", "Cloud Sync Off ⚠️", "Generated successfully but could not be saved.");
      }
    }

    await addXpAndCoins(50, 10); // Reward quiz creation
    return fresh;
  };

  const updateQuizScore = async (quizId: string, score: number) => {
    const nextQuizzes = quizzes.map((q) => {
      if (q.id === quizId) return { ...q, score };
      return q;
    });
    setQuizzes(nextQuizzes);
    syncLocal("mentora_quizzes", nextQuizzes);

    if (!isMockFirebase && auth?.currentUser) {
      console.log("FIRESTORE WRITE START");
      console.log("Firebase Project ID:", finalConfig.projectId);
      console.log("Authenticated User UID:", auth.currentUser.uid);
      console.log("Authenticated User Email:", auth.currentUser.email || "");
      console.log("FIRESTORE WRITE PATH:", `quizzes/${quizId}`);
      try {
        const payload = removeUndefinedFields({ score });
        console.log("Firestore Payload:", payload);
        await updateDoc(doc(db, "quizzes", quizId), payload);
      } catch (error: any) {
        console.error("FIRESTORE ERROR CODE:", error.code);
        console.error("FIRESTORE ERROR MESSAGE:", error.message);
        console.error("FIRESTORE ERROR OBJECT:", error);
        addToast("info", "Cloud Sync Off ⚠️", "Quiz score updated locally but could not be backed up to the cloud.");
      }
    }

    // Award bonus XP on top-grade score
    const rewards = score >= 80 ? 40 : 15;
    await addXpAndCoins(rewards, score >= 80 ? 8 : 2);
    if (score === 100) {
      await updateBadgeList("Einstein Mind");
    }
  };

  // Learning Roadmaps Progress managers
  const saveRoadmap = async (subject: string, durationDays: number, steps: any[]): Promise<Roadmap> => {
    const fresh: Roadmap = {
      id: "roadmap_" + Date.now(),
      userId: auth?.currentUser?.uid || user?.uid || "mock_uid",
      subject,
      durationDays,
      steps,
      createdAt: new Date().toISOString()
    };

    const nextList = [fresh, ...roadmaps];
    setRoadmaps(nextList);
    syncLocal("mentora_roadmaps", nextList);

    if (!isMockFirebase && auth?.currentUser) {
      console.log("FIRESTORE WRITE START");
      console.log("Firebase Project ID:", finalConfig.projectId);
      console.log("Authenticated User UID:", auth.currentUser.uid);
      console.log("Authenticated User Email:", auth.currentUser.email || "");
      console.log("FIRESTORE WRITE PATH:", `roadmaps/${fresh.id}`);
      try {
        const payload = removeUndefinedFields(fresh);
        console.log("Firestore Payload:", payload);
        await setDoc(doc(db, "roadmaps", fresh.id), payload);
      } catch (error: any) {
        console.error("FIRESTORE ERROR CODE:", error.code);
        console.error("FIRESTORE ERROR MESSAGE:", error.message);
        console.error("FIRESTORE ERROR OBJECT:", error);
        addToast("info", "Cloud Sync Off ⚠️", "Generated successfully but could not be saved.");
      }
    }

    await addXpAndCoins(40, 5);
    await updateBadgeList("Roadmap Conqueror");
    return fresh;
  };

  const toggleRoadmapStep = async (roadmapId: string, stepIdx: number) => {
    const nextList = roadmaps.map((r) => {
      if (r.id === roadmapId) {
        const nextSteps = [...r.steps];
        const prevCompleted = nextSteps[stepIdx].completed;
        nextSteps[stepIdx] = { ...nextSteps[stepIdx], completed: !prevCompleted };
        return { ...r, steps: nextSteps };
      }
      return r;
    });

    setRoadmaps(nextList);
    syncLocal("mentora_roadmaps", nextList);

    const matchRoad = roadmaps.find(rd => rd.id === roadmapId);
    if (matchRoad) {
      const stepToToggle = matchRoad.steps[stepIdx];
      const isFinishing = !stepToToggle.completed;
      
      if (!isMockFirebase && auth?.currentUser) {
        console.log("FIRESTORE WRITE START");
        console.log("Firebase Project ID:", finalConfig.projectId);
        console.log("Authenticated User UID:", auth.currentUser.uid);
        console.log("Authenticated User Email:", auth.currentUser.email || "");
        console.log("FIRESTORE WRITE PATH:", `roadmaps/${roadmapId}`);
        try {
          const targetRoadDoc = nextList.find(r => r.id === roadmapId);
          if (targetRoadDoc) {
            const payload = removeUndefinedFields({ steps: targetRoadDoc.steps });
            console.log("Firestore Payload:", payload);
            await updateDoc(doc(db, "roadmaps", roadmapId), payload);
          }
        } catch (error: any) {
          console.error("FIRESTORE ERROR CODE:", error.code);
          console.error("FIRESTORE ERROR MESSAGE:", error.message);
          console.error("FIRESTORE ERROR OBJECT:", error);
          addToast("info", "Cloud Sync Off ⚠️", "Roadmap progress updated locally but could not be backed up to the cloud.");
        }
      }

      if (isFinishing) {
        await addXpAndCoins(20, 3);
      }
    }
  };

  // Live doubt chat memory persistence
  const saveChatMessage = async (sender: "user" | "ai", text: string): Promise<ChatMessage> => {
    const fresh: ChatMessage = {
      id: "msg_" + Date.now() + "_" + Math.random().toString(36).substring(4),
      userId: auth?.currentUser?.uid || user?.uid || "mock_uid",
      sender,
      text,
      timestamp: new Date().toISOString()
    };

    const nextChats = [...chats, fresh];
    setChats(nextChats);
    syncLocal("mentora_chats", nextChats);

    if (!isMockFirebase && auth?.currentUser) {
      console.log("FIRESTORE WRITE START");
      console.log("Firebase Project ID:", finalConfig.projectId);
      console.log("Authenticated User UID:", auth.currentUser.uid);
      console.log("Authenticated User Email:", auth.currentUser.email || "");
      console.log("FIRESTORE WRITE PATH:", `chat_histories/${fresh.id}`);
      try {
        const payload = removeUndefinedFields(fresh);
        console.log("Firestore Payload:", payload);
        await setDoc(doc(db, "chat_histories", fresh.id), payload);
      } catch (error: any) {
        console.error("FIRESTORE ERROR CODE:", error.code);
        console.error("FIRESTORE ERROR MESSAGE:", error.message);
        console.error("FIRESTORE ERROR OBJECT:", error);
        addToast("info", "Cloud Sync Off ⚠️", "Generated successfully but could not be saved.");
      }
    }

    if (sender === "user") {
      await addXpAndCoins(5, 1);
    }
    return fresh;
  };

  const clearChats = () => {
    setChats([]);
    localStorage.removeItem("mentora_chats");
  };

  return (
    <StateContext.Provider
      value={{
        user,
        loading,
        notes,
        quizzes,
        roadmaps,
        chats,
        leaderboard,
        currentTheme,
        setTheme,
        pomodoroMinutes,
        pomodoroSeconds,
        pomodoroActive,
        pomodoroMode,
        setPomodoroActive,
        resetPomodoro,
        setPomodoroTime,
        toasts,
        addToast,
        removeToast,
        login,
        register,
        googleSignIn,
        logout,
        forgotPassword,
        isEmailVerified,
        sendVerificationEmail,
        reloadUserAuth,
        addXpAndCoins,
        incrementStreak,
        saveNote,
        deleteNote,
        saveQuiz,
        updateQuizScore,
        saveRoadmap,
        toggleRoadmapStep,
        saveChatMessage,
        clearChats
      }}
    >
      {children}
    </StateContext.Provider>
  );
};

export const useAppState = () => {
  const context = useContext(StateContext);
  if (!context) throw new Error("useAppState must be used within a StateProvider");
  return context;
};
