import { db, auth, finalConfig } from "../lib/firebase";
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { UserProfile } from "../types";

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

export class UserSyncService {
  /**
   * Helper to safely extract date/timestamp values and convert them to ISO string for typescript compatibility.
   */
  static safeGetISOString(val: any): string {
    if (!val) return new Date().toISOString();
    if (typeof val === "string") return val;
    if (typeof val?.toDate === "function") {
      return val.toDate().toISOString();
    }
    if (val?.seconds) {
      return new Date(val.seconds * 1000).toISOString();
    }
    return String(val);
  }

  /**
   * Performs user profile synchronization between Firebase Auth and Firestore.
   * 
   * Pseudo flow:
   * Google Login -> Firebase Auth Success -> Check users/{uid} -> Create if missing -> Update if exists -> Hand back UserProfile
   */
  static async syncUser(firebaseUser: any): Promise<UserProfile> {
    console.log("LOGIN SUCCESS");
    console.log("USERSYNC START");
    console.log("Firebase Auth success: true");

    if (!firebaseUser || !firebaseUser.uid) {
      console.log("FIRESTORE ERROR: No authenticated Firebase user found.");
      throw new Error("No authenticated Firebase user found.");
    }

    const { uid, displayName, email, photoURL } = firebaseUser;

    console.log("AUTH SUCCESS");
    console.log("USER UID:", uid);
    console.log("AUTH UID:", uid);
    console.log("AUTH EMAIL:", email || "");

    const userRef = doc(db, "users", uid);

    try {
      console.log("Firestore document lookup:", uid);
      const profileDoc = await getDoc(userRef);

      if (profileDoc.exists()) {
        console.log("USER DOC EXISTS: true");
        const existingData = profileDoc.data();

        const lastLoginAtStr = new Date().toISOString();
        const updatedProfile: UserProfile = {
          uid,
          displayName: displayName || existingData.displayName || existingData.name || "Scholar",
          email: email || existingData.email || "",
          photoURL: photoURL || existingData.photoURL || "",
          role: existingData.role || "student",
          xp: typeof existingData.xp === "number" ? existingData.xp : 100,
          level: typeof existingData.level === "number" ? existingData.level : 1,
          coins: typeof existingData.coins === "number" ? existingData.coins : 5,
          streak: typeof existingData.streak === "number" ? existingData.streak : 1,
          lastActive: lastLoginAtStr,
          lastLoginAt: lastLoginAtStr,
          badges: Array.isArray(existingData.badges) ? existingData.badges : ["First Milestone"],
          createdAt: UserSyncService.safeGetISOString(existingData.createdAt),
        };

        console.log("FIRESTORE WRITE START");
        console.log("Firebase Project ID:", finalConfig.projectId);
        console.log("Authenticated User UID:", auth?.currentUser?.uid || uid);
        console.log("Authenticated User Email:", auth?.currentUser?.email || email || "");
        console.log("FIRESTORE WRITE PATH:", `users/${uid}`);
        console.log("Firestore write starting (Update)...");
        const payload = removeUndefinedFields({
          displayName: updatedProfile.displayName,
          name: updatedProfile.displayName, // support write both fields
          email: updatedProfile.email,
          photoURL: updatedProfile.photoURL,
          role: updatedProfile.role,
          lastLoginAt: serverTimestamp(),
          lastActive: serverTimestamp(),
        });
        console.log("Firestore Payload:", payload);
        try {
          await updateDoc(userRef, payload);
          console.log("FIRESTORE WRITE SUCCESS");
          console.log("USER DOC UPDATED: true");
          console.log("FIRESTORE DOCUMENT UPDATED");
          console.log("Firestore write result: success");
        } catch (error: any) {
          console.error("FIRESTORE ERROR CODE:", error.code);
          console.error("FIRESTORE ERROR MESSAGE:", error.message);
          console.error("FIRESTORE ERROR OBJECT:", error);
          throw error;
        }

        return updatedProfile;
      } else {
        console.log("USER DOC EXISTS: false");

        const createdAtStr = new Date().toISOString();
        const newProfile: UserProfile = {
          uid,
          displayName: displayName || email?.split("@")[0] || "Scholar",
          email: email || "",
          photoURL: photoURL || "",
          role: "student",
          xp: 100,
          level: 1,
          coins: 5,
          streak: 1,
          lastActive: createdAtStr,
          lastLoginAt: createdAtStr,
          badges: ["First Milestone"],
          createdAt: createdAtStr,
        };

        console.log("FIRESTORE WRITE START");
        console.log("Firebase Project ID:", finalConfig.projectId);
        console.log("Authenticated User UID:", auth?.currentUser?.uid || uid);
        console.log("Authenticated User Email:", auth?.currentUser?.email || email || "");
        console.log("FIRESTORE WRITE PATH:", `users/${uid}`);
        console.log("Firestore write starting (Creation)...");
        const payload = removeUndefinedFields({
          uid,
          displayName: newProfile.displayName,
          name: newProfile.displayName, // support write both fields
          email: newProfile.email,
          photoURL: newProfile.photoURL,
          role: newProfile.role,
          xp: newProfile.xp,
          level: newProfile.level,
          coins: newProfile.coins,
          streak: newProfile.streak,
          lastActive: serverTimestamp(),
          lastLoginAt: serverTimestamp(),
          badges: newProfile.badges,
          createdAt: serverTimestamp(),
        });
        console.log("Firestore Payload:", payload);
        try {
          await setDoc(userRef, payload);
          console.log("FIRESTORE WRITE SUCCESS");
          console.log("USER DOC CREATED: true");
          console.log("FIRESTORE DOCUMENT CREATED");
          console.log("Firestore write result: success");
        } catch (error: any) {
          console.error("FIRESTORE ERROR CODE:", error.code);
          console.error("FIRESTORE ERROR MESSAGE:", error.message);
          console.error("FIRESTORE ERROR OBJECT:", error);
          throw error;
        }

        return newProfile;
      }
    } catch (err: any) {
      console.log("FIRESTORE WRITE ERROR", err);
      console.log("USER DOC CREATED: false");
      console.log("USER DOC UPDATED: false");
      console.log("FIRESTORE ERROR:", err?.message || String(err));
      console.log("Firestore write failure:", err?.message || String(err));
      console.error("[UserSyncService] Error during synchronization:", err);
      // Requirement 9: Show "Account created but profile setup failed."
      throw new Error("Account created but profile setup failed.");
    }
  }
}
