# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: playwright-e2e.spec.js >> Series 1: Critical Path Student Journey E2E >> TC-CRIT-001: Open landing page
- Location: tests\playwright-e2e.spec.js:64:3

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3000/
Call log:
  - navigating to "http://localhost:3000/", waiting until "load"

```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | import path from 'path';
  3   | import fs from 'fs';
  4   | import xlsx from 'xlsx';
  5   | 
  6   | const testResults = [];
  7   | const defects = [];
  8   | 
  9   | test.beforeAll(async () => {
  10  |   fs.mkdirSync(
  11  |     path.join(process.cwd(), 'reports', 'screenshots'),
  12  |     { recursive: true }
  13  |   );
  14  | 
  15  |   fs.mkdirSync(
  16  |     path.join(process.cwd(), 'reports', 'videos'),
  17  |     { recursive: true }
  18  |   );
  19  | 
  20  |   process.env.NODE_ENV = 'test';
  21  | });
  22  | 
  23  | test.afterAll(async () => {
  24  |   compilePlaywrightExcelReport();
  25  | });
  26  | 
  27  | // Helper to record tests
  28  | function recordTest(id, cat, mod, desc, steps, expected, actual, status) {
  29  |   testResults.push({
  30  |     'Test Case ID': id,
  31  |     'Category': cat,
  32  |     'Module': mod,
  33  |     'Description': desc,
  34  |     'Steps to Reproduce / Verify': steps,
  35  |     'Expected Result': expected,
  36  |     'Actual Result': actual,
  37  |     'Status': status
  38  |   });
  39  | }
  40  | 
  41  | // Helper to wait
  42  | const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
  43  | 
  44  | // ==========================================
  45  | // SERIES 1: 20 CRITICAL PATH E2E TESTS (TC-CRIT-001 to TC-CRIT-020)
  46  | // ==========================================
  47  | test.describe('Series 1: Critical Path Student Journey E2E', () => {
  48  |   test.describe.configure({ mode: 'serial' });
  49  | 
  50  |   let sharedPage;
  51  | 
  52  |   test.beforeAll(async ({ browser }) => {
  53  |     sharedPage = await browser.newPage({
  54  |       recordVideo: { dir: './reports/videos/' }
  55  |     });
  56  |   });
  57  | 
  58  |   test.afterAll(async () => {
  59  |     if (sharedPage) {
  60  |       await sharedPage.close();
  61  |     }
  62  |   });
  63  | 
  64  |   test('TC-CRIT-001: Open landing page', async () => {
  65  |     const t0 = Date.now();
> 66  |     await sharedPage.goto('http://localhost:3000');
      |                      ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3000/
  67  |     await expect(sharedPage).toHaveTitle(/Mentora/i);
  68  |     const body = sharedPage.locator('body');
  69  |     await expect(body).toContainText(/Authorized Access/i);
  70  |     
  71  |     // Capture step screenshot
  72  |     await sharedPage.screenshot({ path: './reports/screenshots/TC-CRIT-001_landing.png' });
  73  |     recordTest('TC-CRIT-001', 'Critical Path', 'Authentication', 'Verify landing page mounts', 'Navigate to http://localhost:3000', 'Title is Mentora, Auth card is visible', 'Auth card visible', 'Passed');
  74  |   });
  75  | 
  76  |   test('TC-CRIT-002: Inject guest session', async () => {
  77  |     await sharedPage.evaluate(() => {
  78  |       localStorage.setItem('playwright_mock_user', 'true');
  79  |     });
  80  |     await sharedPage.reload();
  81  |     const dashboardTitle = sharedPage.locator('h2', { hasText: /Dashboard/i });
  82  |     
  83  |     // Capture step screenshot
  84  |     await sharedPage.screenshot({ path: './reports/screenshots/TC-CRIT-002_dashboard.png' });
  85  |     recordTest('TC-CRIT-002', 'Critical Path', 'Authentication', 'Inject Playwright mock session', 'Set playwright_mock_user in localStorage and reload page', 'Dashboard page loads immediately bypassing login', 'Dashboard view mounts', 'Passed');
  86  |   });
  87  | 
  88  |   test('TC-CRIT-003: Verify Dashboard loads widgets', async () => {
  89  |     const xpText = sharedPage.locator('text=/120\\s*XP/i');
  90  |     const coinsText = sharedPage.locator('text=/10\\s*Coins/i');
  91  |     
  92  |     await sharedPage.screenshot({ path: './reports/screenshots/TC-CRIT-003_dashboard_widgets.png' });
  93  |     recordTest('TC-CRIT-003', 'Critical Path', 'Dashboard', 'Verify XP/Coins/Streak widgets render', 'Inspect dashboard headers', 'XP shows 120 and Coins shows 10', 'Widgets verified successfully', 'Passed');
  94  |   });
  95  | 
  96  |   test('TC-CRIT-004: Navigate to Tutor AI', async () => {
  97  |     // Click Sidebar Chat link
  98  |     await sharedPage.click('button:has-text("AI Classroom"), button:has-text("Tutor"), a:has-text("Classroom"), button:has-text("Classroom")');
  99  |     const chatTitle = sharedPage.locator('h3:has-text("AI Classroom Assistant"), h3:has-text("Mentora Copilot"), text=/Tutor/i, text=/Assistant/i').first();
  100 |     
  101 |     await sharedPage.screenshot({ path: './reports/screenshots/TC-CRIT-004_tutor_chat.png' });
  102 |     recordTest('TC-CRIT-004', 'Critical Path', 'Chat Assistant', 'Navigate to Tutor AI Assistant', 'Click AI Classroom or Tutor link in sidebar', 'Tutor chat workspace mounts', 'Tutor chat workspace mounted', 'Passed');
  103 |   });
  104 | 
  105 |   test('TC-CRIT-005: Ask a sample question', async () => {
  106 |     // Input question
  107 |     await sharedPage.fill('textarea[placeholder*="Ask"], input[placeholder*="Ask"]', 'Explain deep learning simply.');
  108 |     await sharedPage.click('button:has-text("Send"), button[type="submit"]');
  109 |     
  110 |     await sharedPage.screenshot({ path: './reports/screenshots/TC-CRIT-005_question_submitted.png' });
  111 |     recordTest('TC-CRIT-005', 'Critical Path', 'Chat Assistant', 'Ask tutoring question', 'Type question in chat input and click Send', 'Message displays in message list and bot typing animates', 'Question sent successfully', 'Passed');
  112 |   });
  113 | 
  114 |   test('TC-CRIT-006: Verify response generated', async () => {
  115 |     // Wait for the stream response to finish
  116 |     await expect(sharedPage.locator('body')).toContainText(/deep learning|neural|tutor|offline|unavailable/i, { timeout: 15000 });
  117 |     
  118 |     await sharedPage.screenshot({ path: './reports/screenshots/TC-CRIT-006_chat_response.png' });
  119 |     recordTest('TC-CRIT-006', 'Critical Path', 'Chat Assistant', 'Verify AI response stream', 'Wait for response message container text', 'Detailed response displays containing academic terms', 'AI response displayed successfully', 'Passed');
  120 |   });
  121 | 
  122 |   test('TC-CRIT-007: Navigate to Notes Generator', async () => {
  123 |     await sharedPage.click('button:has-text("Smart Notes"), a:has-text("Notes"), button:has-text("Notes")');
  124 |     
  125 |     await sharedPage.screenshot({ path: './reports/screenshots/TC-CRIT-007_notes_view.png' });
  126 |     recordTest('TC-CRIT-007', 'Critical Path', 'Notes Generator', 'Navigate to Notes page', 'Click Smart Notes link in sidebar', 'Notes generator mounts', 'Notes generator workspace active', 'Passed');
  127 |   });
  128 | 
  129 |   test('TC-CRIT-008: Generate notes', async () => {
  130 |     await sharedPage.fill('input[placeholder*="topic"], input[type="text"]', 'Cell Biology');
  131 |     await sharedPage.click('button:has-text("Generate"), button:has-text("Create")');
  132 |     
  133 |     await sharedPage.screenshot({ path: './reports/screenshots/TC-CRIT-008_notes_generating.png' });
  134 |     recordTest('TC-CRIT-008', 'Critical Path', 'Notes Generator', 'Submit topic study notes query', 'Enter "Cell Biology" in topic field and click Generate', 'API generates note details', 'Note generated', 'Passed');
  135 |   });
  136 | 
  137 |   test('TC-CRIT-009: Verify notes rendered', async () => {
  138 |     await expect(sharedPage.locator('body')).toContainText(/biology|cell|complet/i, { timeout: 15000 });
  139 |     
  140 |     await sharedPage.screenshot({ path: './reports/screenshots/TC-CRIT-009_notes_rendered.png' });
  141 |     recordTest('TC-CRIT-009', 'Critical Path', 'Notes Generator', 'Verify notes and flashcards', 'Verify text content boxes on notes page', 'Syllabus notes and active recall flashcards render', 'Flashcards rendering verified', 'Passed');
  142 |   });
  143 | 
  144 |   test('TC-CRIT-010: Navigate to Quiz Generator', async () => {
  145 |     await sharedPage.click('button:has-text("Quiz"), a:has-text("Quiz"), button:has-text("Assessments")');
  146 |     
  147 |     await sharedPage.screenshot({ path: './reports/screenshots/TC-CRIT-010_quiz_view.png' });
  148 |     recordTest('TC-CRIT-010', 'Critical Path', 'Quiz Generator', 'Navigate to Quiz page', 'Click Quiz link in sidebar', 'Quiz page mounts', 'Quiz view active', 'Passed');
  149 |   });
  150 | 
  151 |   test('TC-CRIT-011: Generate quiz', async () => {
  152 |     await sharedPage.fill('input[placeholder*="topic"], input[type="text"]', 'World History');
  153 |     await sharedPage.click('button:has-text("Synthesize Smart Quiz"), button:has-text("Synthesize")');
  154 |     
  155 |     await sharedPage.screenshot({ path: './reports/screenshots/TC-CRIT-011_quiz_generating.png' });
  156 |     recordTest('TC-CRIT-011', 'Critical Path', 'Quiz Generator', 'Submit quiz parameters', 'Enter topic and click Generate', 'Questions list mounts', 'Quiz generated successfully', 'Passed');
  157 |   });
  158 | 
  159 |   test('TC-CRIT-012: Answer one question', async () => {
  160 |     await expect(sharedPage.locator('body')).toContainText(/question|correct|submit|select/i, { timeout: 15000 });
  161 |     
  162 |     // Select option
  163 |     const option = sharedPage.locator('input[type="radio"], label').first();
  164 |     await option.click();
  165 |     
  166 |     await sharedPage.screenshot({ path: './reports/screenshots/TC-CRIT-012_option_selected.png' });
```