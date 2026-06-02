# Security Specification: Mentora AI Zero-Trust Database

## 1. Data Invariants
- **Identity Lock**: All study records (Notes, Quizzes, Roadmaps, Chat history) are strictly bound to the authenticated student's `uid`. No user can read, create, update, or delete records belonging to another student.
- **Admin Lockdown**: Admin checks only execute if their profile exists in the dedicated `/admins/{adminId}` path. 
- **Type/Bound Safety**: All strings must have strict maximum lengths to protect against denial-of-service/wallet attacks.
- **State Integrity**: Users can never assign arbitrary high stats (e.g. infinite coins) or modify system-level attributes because updates are tightly controlled using Action-Based `affectedKeys()` constraints.

---

## 2. The "Dirty Dozen" Payloads
These payloads attempt to bypass identity limits, poison inputs, escalate privileges, or corrupt data integrity. All of these must be rejected with `PERMISSION_DENIED` by the final security rules.

### Playloads 1: Profile Theft
- **Target Path**: `users/target_student_123`
- **Operation**: Write
- **User context**: `request.auth.uid = attacker_uid_456`
- **Method**: Modifying another user's profile database entry.

### Payload 2: Self-Promotion (Privilege Escalation)
- **Target Path**: `users/attacker_uid_456`
- **Operation**: Update
- **Payload**: `{ "role": "admin", "displayName": "Attacker" }`
- **Method**: Injecting custom roles into a public user registration document.

### Payload 3: Coins & XP Inflation
- **Target Path**: `users/attacker_uid_456`
- **Operation**: Update
- **Payload**: `{ "xp": 999999, "coins": 999999 }`
- **Method**: Arbitrarily modifying critical progression statistics.

### Payload 4: Note Stealing
- **Target Path**: `notes/note_12345`
- **Operation**: Create
- **User context**: `request.auth.uid = user_one`
- **Payload**: `{ "id": "note_12345", "userId": "attacker_user_999", "title": "Math Note", "content": "..." }`
- **Method**: Setting the schema `userId` field to a different value to hijack content belonging to others.

### Payload 5: Large Request Poisoning (Denial of Wallet)
- **Target Path**: `notes/poison_doc`
- **Operation**: Create
- **Payload**: `{ "id": "poison_doc", "userId": "user_one", "title": "A" * 50000, "content": "A" * 1000000, "summary": "Bad summary" }`
- **Method**: Inundating Firestore with mega-bytes of string data.

### Payload 6: Blind Chat Listing (PII Gathering)
- **Target Path**: `chat_histories`
- **Operation**: List query / Get doc
- **User context**: `request.auth.uid = spy_uid_777`
- **Method**: Attempting to query `chat_histories` containing private messages belonging to other students.

### Payload 7: Roadmap Tampering
- **Target Path**: `roadmaps/roadmap_abc123`
- **Operation**: Update
- **User context**: `request.auth.uid = user_abc`
- **Payload**: `{ "steps": [ { "title": "New unapproved step", "completed": true } ] }` (Attempting to bypass step invariants).

### Payload 8: Cross-User Delete
- **Target Path**: `quizzes/quiz_xyz` (Owned by `user_xyz`)
- **Operation**: Delete
- **User context**: `request.auth.uid = attacker_uid_abc`
- **Method**: Attempting to delete a classmate's study quiz.

### Payload 9: Future Timestamp Spoofing
- **Target Path**: `users/my_user_uid`
- **Operation**: Update
- **Payload**: `{ "lastActive": "2050-12-31T23:59:59Z" }`
- **Method**: Forcing high stats longevity via client timestamps.

### Payload 10: ID Poisoning Attack
- **Target Path**: `notes/bad-id-@##$-!!!`
- **Operation**: Create
- **Payload**: `{ "id": "bad-id-@##$-!!!", "userId": "user_one", "title": "Chemistry", "content": "Water is H2O", "summary": "H2O" }`
- **Method**: Using special characters or path variables to corrupt data structures.

### Payload 11: Invisible Fields (Ghost Update)
- **Target Path**: `users/my_user_uid`
- **Operation**: Update
- **Payload**: `{ "isSubscribedPremium": true, "displayName": "Updated Stud" }`
- **Method**: Setting unallowlisted properties (`isSubscribedPremium`) in an update statement.

### Payload 12: Broken Relational Integrity
- **Target Path**: `notes/new_note`
- **Operation**: Create
- **Payload**: `{ "id": "new_note", "userId": "user_one", "title": "Bio", "content": "Cell division", "summary": "Mitosis" }`
- **Method**: Creating metadata records without a verified authenticated session (e.g., unsigned student sessions).

---

## 3. Test Verification Concept
All of the scenarios detailed above are checked during security compilation. The security rules will map permissions directly to:
1. Ownership mapping: `request.auth.uid == userId` / `request.auth.uid == resource.data.userId`
2. Size metrics validations on all fields.
3. Explicit change tracker checking via `affectedKeys()`.
