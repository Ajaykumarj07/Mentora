import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { readFileSync } from "fs";
import { resolve } from "path";
import { setDoc, doc, updateDoc, getDoc } from "firebase/firestore";

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  const rules = readFileSync(resolve(__dirname, "../firestore.rules"), "utf8");
  testEnv = await initializeTestEnvironment({
    projectId: "mentora-test-project",
    firestore: { rules },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

describe("Firestore Security Rules & Role Escalation", () => {
  it("VULNERABILITY: permits a standard user to escalate their own role to admin", async () => {
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
    // Currently, the rules ALLOW this, so assertSucceeds is used to demonstrate the flaw
    // In a secured environment, this should be assertFails
    const userRef = doc(db, "users", "user-123");
    await assertSucceeds(
      updateDoc(userRef, {
        role: "admin",
      })
    );
  });

  it("should block unauthenticated users from reading user profiles", async () => {
    const unauthed = testEnv.unauthenticatedContext();
    const db = unauthed.firestore();

    await assertFails(getDoc(doc(db, "users", "some-user-id")));
  });

  it("should allow a user to update their own safe fields", async () => {
    const authed = testEnv.authenticatedContext("student-456", { email: "stu@test.com" });
    const db = authed.firestore();

    await testEnv.withSecurityRulesDisabled(async (context) => {
      const adminDb = context.firestore();
      await setDoc(doc(adminDb, "users", "student-456"), {
        uid: "student-456",
        email: "stu@test.com",
        role: "student",
        xp: 100,
        level: 1,
        coins: 0,
        streak: 0,
        lastActive: "123",
        lastLoginAt: "123",
        createdAt: "123"
      });
    });

    const userRef = doc(db, "users", "student-456");
    await assertSucceeds(
      updateDoc(userRef, {
        xp: 150,
      })
    );
  });
});
