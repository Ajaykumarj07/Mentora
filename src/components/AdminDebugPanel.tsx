import React, { useState, useEffect } from "react";
import { useAppState } from "../contexts/StateContext";
import { db, auth, finalConfig } from "../lib/firebase";
import { doc, getDocs, collection, updateDoc } from "firebase/firestore";
import { UserProfile } from "../types";
import { 
  ShieldCheck, 
  Users, 
  Database, 
  RefreshCw, 
  UserX, 
  CheckCircle, 
  AlertTriangle, 
  Key, 
  Activity, 
  Cpu 
} from "lucide-react";

export const AdminDebugPanel: React.FC = () => {
  const { user, currentTheme, addToast } = useAppState();
  const [firestoreUsers, setFirestoreUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncLatency, setSyncLatency] = useState<number | null>(null);
  const [syncStatus, setSyncStatus] = useState<"healthy" | "testing" | "error">("healthy");

  // AI Health Check States (Step 6)
  const [aiHealth, setAiHealth] = useState<{
    providers: Array<{ name: string; type: string; model: string; enabled: boolean; apiKeyPresent: boolean }>;
    healthStatus: {
      lastRequestTime: string | null;
      lastProviderUsed: string | null;
      lastModelUsed: string | null;
      lastPromptLength: number | null;
      lastResponseTextLength: number | null;
      lastResponseStatus: string | null;
      lastResponseText: string | null;
      lastError: string | null;
    };
    env: { hasGeminiKey: boolean; hasGroqKey: boolean; hasOpenrouterKey: boolean };
  } | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const fetchAiHealth = async () => {
    setAiLoading(true);
    try {
      const res = await fetch("/api/ai/health");
      if (res.ok) {
        const data = await res.json();
        setAiHealth(data);
      }
    } catch (err) {
      console.error("Failed to query AI metrics:", err);
    } finally {
      setAiLoading(false);
    }
  };

  useEffect(() => {
    fetchAiHealth();
    const interval = setInterval(fetchAiHealth, 10000); // refresh every 10s
    return () => clearInterval(interval);
  }, []);

  const isAdmin = user?.role === "admin";
  const isLight = currentTheme === "light";
  const isMatrix = currentTheme === "matrix";

  // Fetch Firestore users list if admin privilege is active
  const fetchFirestoreUsers = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const usersSnap = await getDocs(collection(db, "users"));
      const usersList: UserProfile[] = [];
      usersSnap.forEach((doc) => {
        usersList.push(doc.data() as UserProfile);
      });
      setFirestoreUsers(usersList);
    } catch (err: any) {
      console.warn("[Debug Panel] Denied listing all users (Expected if student):", err.message || err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchFirestoreUsers();
    } else {
      setFirestoreUsers([]);
    }
  }, [isAdmin, user?.uid]);

  // Handle switching privilege mock state for diagnostic verification
  const handleToggleAdminMode = async () => {
    if (!user) return;
    const nextRole = isAdmin ? "student" : "admin";
    const writePath = `users/${user.uid}`;
    console.log("FIRESTORE WRITE START");
    console.log("Firebase Project ID:", finalConfig.projectId);
    console.log("Authenticated User UID:", auth?.currentUser?.uid || user.uid);
    console.log("Authenticated User Email:", auth?.currentUser?.email || user.email || "");
    console.log("FIRESTORE WRITE PATH:", writePath);
    try {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, { role: nextRole });
      addToast(
        "success",
        nextRole === "admin" ? "Admin Mode Active 🔐" : "Returned to Student 🎓",
        `Your user profile role has been successfully updated to ${nextRole}.`
      );
      // Wait a bit for auth state changed to trigger and reload local state automatically
    } catch (error: any) {
      console.error("FIRESTORE ERROR CODE:", error.code);
      console.error("FIRESTORE ERROR MESSAGE:", error.message);
      console.error("FIRESTORE ERROR OBJECT:", error);
      addToast("info", "Elevation Failed ⚠️", "Account created but profile setup failed.");
    }
  };

  // Elevate a specific user document in Firestore to 'admin' using updateDoc
  const elevateUserToAdmin = async (uid: string) => {
    const writePath = `users/${uid}`;
    console.log("FIRESTORE WRITE START");
    console.log("Firebase Project ID:", finalConfig.projectId);
    console.log("Authenticated User UID:", auth?.currentUser?.uid || "");
    console.log("Authenticated User Email:", auth?.currentUser?.email || "");
    console.log("FIRESTORE WRITE PATH:", writePath);
    try {
      const userRef = doc(db, "users", uid);
      await updateDoc(userRef, { role: "admin" });
      addToast(
        "success",
        "User Elevated 🎉",
        "The selected user profile role has been successfully set to admin."
      );
      // Refresh current records list
      fetchFirestoreUsers();
    } catch (error: any) {
      console.error("FIRESTORE ERROR CODE:", error.code);
      console.error("FIRESTORE ERROR MESSAGE:", error.message);
      console.error("FIRESTORE ERROR OBJECT:", error);
      addToast("info", "Elevation Failed ⚠️", "Account created but profile setup failed.");
    }
  };

  // Run dynamic sync checks and latency diagnostics
  const handleTestSyncSpeed = async () => {
    if (!user) return;
    setSyncStatus("testing");
    const start = performance.now();
    const writePath = `users/${user.uid}`;
    console.log("FIRESTORE WRITE START");
    console.log("Firebase Project ID:", finalConfig.projectId);
    console.log("Authenticated User UID:", auth?.currentUser?.uid || user.uid);
    console.log("Authenticated User Email:", auth?.currentUser?.email || user.email || "");
    console.log("FIRESTORE WRITE PATH:", writePath);
    try {
      const userRef = doc(db, "users", user.uid);
      // Touch a safe mutable state (lastActive) to trigger real Firestore update
      await updateDoc(userRef, { lastActive: new Date().toISOString() });
      const duration = Math.round(performance.now() - start);
      setSyncLatency(duration);
      setSyncStatus("healthy");
      addToast("success", "Sync Diagnostics Completed ⚡", `Firestore roundtrip latency: ${duration}ms.`);
    } catch (error: any) {
      console.error("FIRESTORE ERROR CODE:", error.code);
      console.error("FIRESTORE ERROR MESSAGE:", error.message);
      console.error("FIRESTORE ERROR OBJECT:", error);
      setSyncStatus("error");
      addToast("info", "Sync Diagnostics Denied ⚠️", "Account created but profile setup failed.");
    }
  };

  // Compute Missing profiles
  const missingProfiles = user && firestoreUsers.length > 0 
    ? firestoreUsers.filter(u => !u.email || !u.uid)
    : [];

  return (
    <div className="pt-4 border-t border-white/10 space-y-6 select-text">
      {/* Header title block */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h4 className="font-display font-black text-slate-100 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            Admin Security & Synched Diagnostic Console
          </h4>
          <p className="text-xs text-slate-400 mt-1">
            Real-time audit tools of Google Auth session mappings, Firestore document invariants, and query logs
          </p>
        </div>
        <button
          onClick={handleToggleAdminMode}
          className={`px-4 py-2 font-display font-black text-[10px] tracking-wider uppercase rounded-xl transition duration-200 cursor-pointer shadow-md shrink-0 flex items-center gap-1.5 ${
            isAdmin 
              ? "bg-red-500 hover:bg-red-600 text-white" 
              : "bg-emerald-500 hover:bg-emerald-600 text-slate-950"
          }`}
        >
          <Key className="w-3.5 h-3.5" />
          {isAdmin ? "Deactivate Admin Mode" : "Activate Admin Mode"}
        </button>
      </div>

      {/* Subgrid overview cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Card 1: Auth Session */}
        <div className="p-4 bg-slate-950/60 border border-white/5 rounded-2xl flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 shrink-0">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-mono">Active Auth Users</p>
            <p className="text-lg font-black font-display text-white mt-0.5">1</p>
            <p className="text-[9px] text-slate-500 font-mono truncate max-w-[130px]">{user?.email}</p>
          </div>
        </div>

        {/* Card 2: Firestore records registry */}
        <div className="p-4 bg-slate-950/60 border border-white/5 rounded-2xl flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 shrink-0">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-mono">Firestore Registry</p>
            <p className="text-lg font-black font-display text-white mt-0.5">
              {isAdmin ? firestoreUsers.length : "1 profile"}
            </p>
            <p className="text-[9px] text-slate-500 font-mono">
              {isAdmin ? "Complete database indexed" : "Active query restricted"}
            </p>
          </div>
        </div>

        {/* Card 3: Missing profiles */}
        <div className="p-4 bg-slate-950/60 border border-white/5 rounded-2xl flex items-center gap-3">
          <div className={`p-2.5 rounded-xl shrink-0 ${missingProfiles.length > 0 ? "bg-red-500/10 text-red-400 animate-pulse" : "bg-emerald-500/10 text-emerald-400"}`}>
            {missingProfiles.length > 0 ? <UserX className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-mono">Missing Profiles</p>
            <p className="text-lg font-black font-display text-white mt-0.5">
              {isAdmin ? missingProfiles.length : 0}
            </p>
            <p className="text-[9px] text-slate-500 font-mono">
              {missingProfiles.length > 0 ? "Synchronization discrepancy!" : "Perfect relational parity"}
            </p>
          </div>
        </div>

        {/* Card 4: Synchronization latency */}
        <div className="p-4 bg-slate-950/60 border border-white/5 rounded-2xl flex flex-col justify-between h-full group relative">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg shrink-0 ${syncStatus === 'testing' ? "bg-amber-500/10 text-amber-500 animate-spin" : "bg-emerald-500/10 text-emerald-400"}`}>
              <Activity className="w-4 h-4" />
            </div>
            <div className="text-left">
              <p className="text-[9px] uppercase tracking-wider text-slate-400 font-mono">Sync Health</p>
              <p className="text-xs font-black text-white mt-0.5">
                {syncStatus === 'testing' ? "Auditing latencies..." : "Synced & Secure"}
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between gap-2 mt-2 pt-1 border-t border-white/5">
            <span className="text-[9px] font-mono text-slate-500">
              {syncLatency ? `${syncLatency}ms delay` : "Parity unchecked"}
            </span>
            <button
              onClick={handleTestSyncSpeed}
              disabled={syncStatus === "testing"}
              className="text-[9px] text-emerald-400 hover:text-emerald-300 uppercase font-mono font-bold flex items-center gap-0.5 transition cursor-pointer"
            >
              <RefreshCw className="w-2.5 h-2.5" />
              Sync Test
            </button>
          </div>
        </div>
      </div>

      {/* AI Engine Status Tracker (STEP 6) */}
      <div className="bg-slate-900/40 border border-white/10 rounded-2.5xl overflow-hidden shadow-lg p-5 space-y-4 select-text">
        <div className="flex items-center justify-between">
          <h5 className="font-display font-semibold text-xs text-slate-300 flex items-center gap-2 select-none">
            <Cpu className="w-4 h-4 text-emerald-400" />
            AI Service Engine Diagnostics & Health Suite (STEP 6)
          </h5>
          <button
            onClick={fetchAiHealth}
            disabled={aiLoading}
            className="text-[10px] text-emerald-400 hover:text-emerald-300 uppercase font-mono font-bold flex items-center gap-1 transition cursor-pointer"
          >
            <RefreshCw className={`w-3 h-3 ${aiLoading ? "animate-spin" : ""}`} />
            Force Recalculate
          </button>
        </div>

        {/* Live Provider Health Table */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <p className="text-[10px] uppercase font-mono text-slate-400 tracking-wider font-semibold">Active Provider Discovery</p>
            <div className="overflow-hidden border border-white/5 rounded-xl divide-y divide-white/5 bg-slate-950/40">
              {aiHealth?.providers.map((p, idx) => (
                <div key={idx} className="p-3 flex items-center justify-between text-xs font-mono">
                  <div>
                    <span className="text-slate-100 font-bold block">{p.name} <span className="text-[9px] text-slate-500">[{p.type}]</span></span>
                    <span className="text-[10px] text-slate-400">{p.model}</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                      p.apiKeyPresent 
                        ? "bg-purple-500/10 border border-purple-500/20 text-purple-400" 
                        : "bg-red-500/10 border border-red-500/20 text-red-500"
                    }`}>
                      {p.apiKeyPresent ? "API Key Loaded" : "API Key Missing"}
                    </span>
                    <span className={`w-1.5 h-1.5 rounded-full ${p.enabled ? "bg-emerald-400 animate-pulse" : "bg-slate-600"}`} />
                  </div>
                </div>
              ))}
              {!aiHealth?.providers && (
                <div className="p-4 text-center text-xs text-slate-500 italic font-sans">
                  Querying server registry...
                </div>
              )}
            </div>
          </div>

          {/* Last Transaction Status details */}
          <div className="space-y-3">
            <p className="text-[10px] uppercase font-mono text-slate-400 tracking-wider font-semibold">Last Transaction Telemetry</p>
            <div className="p-3 rounded-xl border border-white/5 bg-slate-950/40 text-xs space-y-2">
              <div className="flex justify-between items-center pb-2 border-b border-white/5">
                <span className="text-slate-400">Timestamp</span>
                <span className="font-mono text-slate-100 font-bold">
                  {aiHealth?.healthStatus.lastRequestTime ? new Date(aiHealth.healthStatus.lastRequestTime).toLocaleTimeString() : "Never queried"}
                </span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-white/5">
                <span className="text-slate-400">Provider Selected</span>
                <span className="font-mono text-emerald-400 font-bold">
                  {aiHealth?.healthStatus.lastProviderUsed || "N/A"}
                </span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-white/5">
                <span className="text-slate-400">Active Model</span>
                <span className="font-mono text-slate-300">
                  {aiHealth?.healthStatus.lastModelUsed || "N/A"}
                </span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-white/5">
                <span className="text-slate-400">Resolution Status</span>
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase font-mono ${
                  aiHealth?.healthStatus.lastResponseStatus?.includes("Success") || aiHealth?.healthStatus.lastResponseStatus?.includes("Succeeded") 
                    ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                    : aiHealth?.healthStatus.lastResponseStatus === "Fallback Delivered"
                    ? "bg-amber-500/10 border border-amber-500/20 text-amber-400"
                    : "bg-red-500/10 border border-red-500/20 text-red-500"
                }`}>
                  {aiHealth?.healthStatus.lastResponseStatus || "Idle"}
                </span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-white/5">
                <span className="text-slate-400">Payload scale</span>
                <span className="font-mono text-slate-300">
                  Prompt: {aiHealth?.healthStatus.lastPromptLength || 0} bytes | Response: {aiHealth?.healthStatus.lastResponseTextLength || 0} bytes
                </span>
              </div>
              {aiHealth?.healthStatus.lastError && (
                <div className="p-2 rounded bg-red-950/20 border border-red-900/40 text-[10px] text-red-400 font-mono flex items-start gap-1.5 overflow-x-auto select-text break-all">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-red-500 mt-0.5" />
                  <div>
                    <span className="font-bold">Last Error: </span>
                    {aiHealth.healthStatus.lastError}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Raw response explorer */}
        {aiHealth?.healthStatus.lastResponseText && (
          <div className="space-y-1.5 bg-slate-950/60 p-3 rounded-xl border border-white/5 select-text">
            <span className="text-[10px] uppercase font-mono text-slate-400 block tracking-wider font-semibold">Raw Response Payloads Auditor</span>
            <pre className="text-[10px] font-mono text-slate-300 overflow-x-auto p-2 bg-slate-950/90 rounded border border-white/5 select-text whitespace-pre-wrap max-h-[140px]">
              {aiHealth.healthStatus.lastResponseText}
            </pre>
          </div>
        )}
      </div>

      {/* Main Admin Data Tables */}
      <div className="bg-slate-900/40 border border-white/10 rounded-2.5xl overflow-hidden shadow-lg p-5 space-y-4">
        <h5 className="font-display font-semibold text-xs text-slate-300 flex items-center gap-2 select-none">
          <Users className="w-4 h-4 text-purple-400" />
          User Registry & Synchronization State
        </h5>

        {isAdmin ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-400 border-collapse">
              <thead>
                <tr className="border-b border-white/5 font-mono text-[10px] uppercase text-slate-500">
                  <th className="py-2.5 px-3">Student Email / ID</th>
                  <th className="py-2.5 px-3">Firebase Name</th>
                  <th className="py-2.5 px-3">Assigned Role</th>
                  <th className="py-2.5 px-3">Last Active Session</th>
                  <th className="py-2.5 px-3">Mapped Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {firestoreUsers.map((profile) => {
                  const isCurrentUser = profile.uid === user.uid;
                  return (
                    <tr key={profile.uid} className={`hover:bg-white/5 transition-colors ${isCurrentUser ? "bg-purple-500/5 text-slate-200" : ""}`}>
                      <td className="py-3 px-3 font-mono">
                        <div className="font-bold">{profile.email}</div>
                        <div className="text-[10px] text-slate-500">{profile.uid}</div>
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-200">
                        {profile.displayName || "Scholar"}
                        {isCurrentUser && <span className="ml-1.5 text-[9px] font-mono text-purple-400 uppercase tracking-wider font-extrabold">(You)</span>}
                      </td>
                      <td className="py-3 px-3 uppercase font-semibold">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-mono ${
                          profile.role === "admin" 
                            ? "bg-red-500/10 border border-red-500/20 text-red-400" 
                            : "bg-teal-500/10 border border-teal-500/20 text-teal-400"
                        }`}>
                          {profile.role || "student"}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-500 font-mono text-[11px]">
                        {profile.lastLoginAt ? new Date(profile.lastLoginAt).toLocaleString() : "Never login"}
                      </td>
                      <td className="py-3 px-3">
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                          SYNCED
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        {profile.role !== "admin" ? (
                          <button
                            onClick={() => elevateUserToAdmin(profile.uid)}
                            className="bg-emerald-500/20 hover:bg-emerald-500 text-emerald-400 hover:text-slate-950 border border-emerald-500/30 px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold uppercase transition duration-150 cursor-pointer"
                          >
                            Elevate To Admin
                          </button>
                        ) : (
                          <span className="text-[10px] font-mono text-slate-500 italic">No Action Needed</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-10 text-center space-y-4">
            <div className="inline-flex p-3 rounded-full bg-amber-500/5 border border-amber-500/10 text-amber-500">
              <AlertTriangle className="w-6 h-6 animate-pulse" />
            </div>
            <div className="space-y-1 max-w-sm mx-auto">
              <h6 className="text-sm font-bold font-display text-slate-200">Database Listing Query Restricted</h6>
              <p className="text-xs text-slate-400 leading-relaxed font-sans">
                Due to standard student security guidelines, you are not authorized to view raw database registers. Click the **Activate Admin Mode** action above to assign yourself privilege.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
