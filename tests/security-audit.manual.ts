import {
  initializeTestEnvironment,
  assertFails,
  RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { readFileSync } from "fs";
import { resolve } from "path";
import { setDoc, doc, updateDoc } from "firebase/firestore";

let testEnv: RulesTestEnvironment | undefined;
let emulatorReady = true;

beforeAll(async () => {
  try {
    const rules = readFileSync(resolve(__dirname, "../firestore.rules"), "utf8");
    testEnv = await initializeTestEnvironment({
      projectId: "mentora-security-audit",
      firestore: { 
        rules,
        host: "127.0.0.1",
        port: 8085
      },
    });
  } catch (err) {
    console.warn("⚠️  Could not connect to Firestore emulator. Skipping security audit.");
    emulatorReady = false;
  }
});

afterAll(async () => {
  if (testEnv) {
    await testEnv.cleanup();
  }
});

beforeEach(async () => {
  if (testEnv) {
    await testEnv.clearFirestore();
  }
});

describe("Security Audit: Known Vulnerabilities", () => {
  it("VULNERABILITY: permits a standard user to escalate their own role to admin", async () => {
    if (!emulatorReady || !testEnv) return;

    const unprivilegedAuth = testEnv.authenticatedContext("user-123", { email: "user@test.com" });
    const db = unprivilegedAuth.firestore();

    // 1. User creates their document
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const adminDb = context.firestore();
      await setDoc(doc(adminDb, "users", "user-123"), {
        uid: "user-123",
        email: "user@test.com",
        role: "student",
        xp: 0,
        level: 1,
        coins: 0,
        streak: 0,
        lastActive: "123",
        lastLoginAt: "123",
        createdAt: "123"
      });
    });

    // 2. User attempts to update their own role (Escalation)
    // The rules now correctly block this, so assertFails verifies the vulnerability is patched.
    const userRef = doc(db, "users", "user-123");
    await assertFails(
      updateDoc(userRef, {
        role: "admin",
      })
    );
  });
});
