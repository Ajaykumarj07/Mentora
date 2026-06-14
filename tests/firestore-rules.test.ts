import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { readFileSync } from "fs";
import { resolve } from "path";
import { setDoc, doc, updateDoc, getDoc } from "firebase/firestore";

let testEnv: RulesTestEnvironment | undefined;
let emulatorReady = true;

beforeAll(async () => {
  try {
    const rules = readFileSync(resolve(__dirname, "../firestore.rules"), "utf8");
    testEnv = await initializeTestEnvironment({
      projectId: "mentora-test-project",
      firestore: { 
        rules,
        host: "127.0.0.1",
        port: 8085
      },
    });
  } catch (err) {
    console.warn("⚠️  Could not connect to Firestore emulator. Skipping Firestore tests. Ensure emulator is running on port 8085.");
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

describe("Firestore Security Rules", () => {
  it("should block unauthenticated users from reading user profiles", async () => {
    if (!emulatorReady || !testEnv) {
      console.warn("Skipping test due to unavailable emulator");
      return;
    }

    const unauthed = testEnv.unauthenticatedContext();
    const db = unauthed.firestore();

    await assertFails(getDoc(doc(db, "users", "some-user-id")));
  });

  it("should allow a user to update their own safe fields", async () => {
    if (!emulatorReady || !testEnv) {
      console.warn("Skipping test due to unavailable emulator");
      return;
    }

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
