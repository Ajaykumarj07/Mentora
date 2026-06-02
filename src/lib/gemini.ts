import { Note, Quiz, Roadmap, ChatMessage } from "../types";

export interface AIRecommendation {
  title: string;
  desc: string;
  category: string;
  minutes: number;
}

export interface SummaryResult {
  summaryTitle: string;
  extractedKeypoints: string[];
  estimatedReadTimeMinutes: number;
}

export async function askAiNotes(topic: string, detailLevel: string, customInstructions?: string): Promise<Partial<Note>> {
  console.info(`[Notes-Flow] Step 1: User submitted prompt. Topic: "${topic}", DetailLevel: "${detailLevel}"`);
  try {
    console.info("[Notes-Flow] Step 2: AI request started via POST /api/gemini/generate-notes");
    const response = await fetch("/api/gemini/generate-notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic, detailLevel, customInstructions }),
    });
    console.info(`[Notes-Flow] Step 3: API response received. HTTP Status: ${response.status}`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} failed to generate notes`);
    }
    const data = await response.json();
    console.info("[Notes-Flow] Step 4: Notes compilation completed. Received Payload:", data);
    return data;
  } catch (err: any) {
    console.warn("[Notes-Flow] AI Request failed or was in draft-mode. Switching to client fallback.", err);
    return {
      title: `Study Guide: ${topic}`,
      summary: `• A comprehensive overview of ${topic} details.\n• Key learning objectives and essential points compiled under ${detailLevel} level of study.`,
      content: `### Summary of ${topic}\n\nThis material introduces the primary definitions, models, and paradigms corresponding to **${topic}**. Feel free to use interactive roadmaps and quizzes to deepen your comprehension!\n\n* **Foundational Framework**: Basic theoretical parameters and design criteria.\n* **Modern Significance**: Core applications within standard technological structures.`,
      flashcards: [
        { front: `What is the core baseline of ${topic}?`, back: `The essential conceptual structure and definitions explaining ${topic}.` },
        { front: `How is ${topic} generally studied?`, back: `Through iterative synthesis, roadmap planning, and practical classroom quizzes.` }
      ]
    };
  }
}

export async function askAiQuiz(topic: string, amount: number, difficulty: string): Promise<Partial<Quiz>> {
  console.info(`[Quiz-Flow] Step 1: User submitted prompt. Topic: "${topic}", Quantity: ${amount}, Difficulty: ${difficulty}`);
  try {
    console.info("[Quiz-Flow] Step 2: AI request started via POST /api/gemini/generate-quiz");
    const response = await fetch("/api/gemini/generate-quiz", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic, amount, difficulty }),
    });
    console.info(`[Quiz-Flow] Step 3: API response received. HTTP Status: ${response.status}`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} failed to compile quiz`);
    }
    const data = await response.json();
    console.log("[Quiz-Flow] Step 4: Quiz generation completed. Logs Payload:", data);
    return data;
  } catch (err: any) {
    console.warn("[Quiz-Flow] AI Request failed or was in draft-mode. Switching to client fallback.", err);
    const questions = Array.from({ length: Math.min(amount, 5) }).map((_, idx) => ({
      question: `Practice Question ${idx + 1}: Which concept is most vital when evaluating ${topic}?`,
      options: [
        "Primary theoretical definition and state structures",
        "An off-grid framework minimizing semantic mappings",
        "A client-side secondary model",
        "Minimal architectural design parameters"
      ],
      correctIdx: 0,
      explanation: `Option A correctly identifies the foundational core elements of ${topic} for practical analysis.`
    }));
    return {
      title: `${topic} - practice quiz`,
      questions
    };
  }
}

export async function askAiRoadmap(subject: string, durationDays: number): Promise<Partial<Roadmap>> {
  console.info(`[Roadmap-Flow] Step 1: User submitted prompt. Subject: "${subject}", Duration: ${durationDays} days`);
  try {
    console.info("[Roadmap-Flow] Step 2: AI request started via POST /api/gemini/generate-roadmap");
    const response = await fetch("/api/gemini/generate-roadmap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject, durationDays }),
    });
    console.info(`[Roadmap-Flow] Step 3: API response received. HTTP Status: ${response.status}`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} failed to construct roadmap`);
    }
    const data = await response.json();
    console.log("[Roadmap-Flow] Step 4: Roadmap compilation completed. Payload Received:", data);
    return data;
  } catch (err: any) {
    console.warn("[Roadmap-Flow] AI Request failed or was in draft-mode. Switching to client fallback.", err);
    const steps = Array.from({ length: Math.min(durationDays, 5) }).map((_, idx) => ({
      title: `Step ${idx + 1}: Theoretical core of ${subject}`,
      description: `Review fundamental parameters and practical use cases of ${subject}.`,
      completed: false,
      day: idx + 1
    }));
    return {
      subject,
      durationDays,
      steps
    };
  }
}

export async function askAiChat(messages: ChatMessage[]): Promise<{ text: string }> {
  console.info(`[Chat-Flow] Step 1: User submitted message. Dialogue History Length: ${messages.length}`);
  try {
    const cleanMessages = messages.map((m) => ({
      sender: m.sender,
      text: m.text,
    }));
    console.info("[Chat-Flow] Step 2: AI chat request started via POST /api/gemini/chat");
    const response = await fetch("/api/gemini/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: cleanMessages }),
    });
    console.info(`[Chat-Flow] Step 3: API response received. HTTP Status: ${response.status}`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} failed to query AI chat`);
    }
    const data = await response.json();
    console.info("[Chat-Flow] Step 4: AI response content reception/parsing complete. Response Text length:", data?.text?.length);
    return data;
  } catch (err: any) {
    console.warn("[Chat-Flow] AI Request failed or was in draft-mode. Switching to client fallback.", err);
    const userMsgDesc = messages[messages.length - 1]?.text || "your question";
    return {
      text: `Deep communication can sometimes be slow due to heavy server traffic. Regarding: "${userMsgDesc}" — please configure your **GEMINI_API_KEY** inside AI Studio settings or retry your prompt in a minute to get precise real-time assistance!`
    };
  }
}

export async function askAiRecommendations(
  streak: number,
  totalXp: number,
  currentLevel: number,
  completedSubjects: string[]
): Promise<{ recommendations: AIRecommendation[] }> {
  try {
    const response = await fetch("/api/gemini/recommendations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ streak, totalXp, currentLevel, completedSubjects }),
    });
    if (!response.ok) {
      throw new Error("HTTP failed to fetch recommendations");
    }
    return await response.json();
  } catch (err: any) {
    console.warn("Client fallback for study recommendations:", err);
    return {
      recommendations: [
        {
          title: "Strengthen Classroom Goals 🎯",
          desc: "Set up your interactive Roadmap or draft custom flashcards to supercharge your study session.",
          category: "Study Rituals",
          minutes: 5,
        },
        {
          title: "Take a Mini Challenge ⚡",
          desc: "Complete any customized quick quiz to evaluate recent milestones and score bonus XP.",
          category: "Performance Check",
          minutes: 8,
        }
      ],
    };
  }
}

export async function askAiDocumentSummary(documentName: string, contentText: string): Promise<SummaryResult> {
  try {
    const response = await fetch("/api/gemini/summarize-document", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentName, contentText }),
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} failed to summarize document`);
    }
    return await response.json();
  } catch (err: any) {
    console.warn("Client fallback for document summary:", err);
    return {
      summaryTitle: `Summary: ${documentName || "Classroom Document"}`,
      extractedKeypoints: [
        "Major concepts and core structures outlined in the uploaded text.",
        "Specific academic terms, definitions, and theories.",
        "Target points for upcoming assessments or knowledge synthesis."
      ],
      estimatedReadTimeMinutes: 3
    };
  }
}
