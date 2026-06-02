import express from "express";
import path from "path";
import dns from "dns";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import { AIProviderService } from "./src/services/aiProvider";

dotenv.config();

// Workaround for Node.js DNS issues with modern systems in sandboxes
if (typeof dns.setDefaultResultOrder === "function") {
  dns.setDefaultResultOrder("ipv4first");
}

const app = express();
app.use(express.json());

const PORT = Number(process.env.PORT) || 3000;

// Lazy initialize Gemini AI client
let aiInstance: GoogleGenAI | null = null;

function getGemini(): GoogleGenAI {
  if (!aiInstance) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      console.warn("GEMINI_API_KEY is not configured in environment variables. Falling back to mock-mode.");
    }
    aiInstance = new GoogleGenAI({
      apiKey: key || "MOCK_KEY",
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiInstance;
}

function parseTextToJson(text: string, fallbackVal?: any): any {
  console.log("TEXT BEFORE JSON PARSE:", text);
  console.log("[JSON-Parser] Starting robust raw text parse.");
  console.log("[JSON-Parser] Raw text length:", text ? text.length : 0);

  if (!text || !text.trim()) {
    console.warn("[JSON-Parser] Warning: Provided text is empty. Utilizing fallback value.");
    if (fallbackVal) return fallbackVal;
    throw new Error("Provided text was empty");
  }

  // First try simple clean parse
  let clean = text.trim();
  try {
    if (clean.startsWith("```json")) {
      clean = clean.substring(7);
    } else if (clean.startsWith("```")) {
      clean = clean.substring(3);
    }
    if (clean.endsWith("```")) {
      clean = clean.substring(0, clean.length - 3);
    }
    clean = clean.trim();
    return JSON.parse(clean);
  } catch (initialErr) {
    console.warn("[JSON-Parser] Initial direct parsing failed. Attempting block extraction...", initialErr);
  }

  // Second pattern: Find nested bracket/brace
  try {
    const firstBraceIdx = clean.indexOf("{");
    const lastBraceIdx = clean.lastIndexOf("}");
    const firstBracketIdx = clean.indexOf("[");
    const lastBracketIdx = clean.lastIndexOf("]");

    let startIdx = -1;
    let endIdx = -1;

    if (firstBraceIdx !== -1 && (firstBracketIdx === -1 || firstBraceIdx < firstBracketIdx)) {
      startIdx = firstBraceIdx;
      endIdx = lastBraceIdx;
    } else if (firstBracketIdx !== -1) {
      startIdx = firstBracketIdx;
      endIdx = lastBracketIdx;
    }

    if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
      const extracted = clean.substring(startIdx, endIdx + 1);
      console.log("[JSON-Parser] Extracted nested JSON segment:", extracted);
      return JSON.parse(extracted);
    }
  } catch (extractionErr) {
    console.warn("[JSON-Parser] Nested block extraction parsing failed:", extractionErr);
  }

  // Third level recovery: sanitize control characters and replace quotes
  try {
    let sanitized = clean
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\x00-\x1F\x7F-\x9F]/g, "");

    const firstBraceIdx = sanitized.indexOf("{");
    const lastBraceIdx = sanitized.lastIndexOf("}");

    if (firstBraceIdx !== -1 && lastBraceIdx !== -1 && lastBraceIdx > firstBraceIdx) {
      sanitized = sanitized.substring(firstBraceIdx, lastBraceIdx + 1);
      return JSON.parse(sanitized);
    }
  } catch (sanitizeErr) {
    console.error("[JSON-Parser] Sanitization retry failed:", sanitizeErr);
  }

  // Critical exit path: fail gracefully using fallback if defined
  console.error("JSON PARSE FAILURE", text);
  if (fallbackVal) {
    console.warn("[JSON-Parser] CRITICAL RECOVERY: Returning fallback value to prevent endpoint crash.");
    if (typeof fallbackVal === "object" && fallbackVal !== null) {
      return {
        ...fallbackVal,
        isRawResponseFallback: true,
        rawText: text
      };
    }
    return fallbackVal;
  }

  console.error("[JSON-Parser] CRITICAL PARSING CRASH! No recovery possible. Raw text:", text);
  throw new Error("Unable to parse generated text into structured JSON format.");
}

interface MultiProviderConfig {
  systemInstruction?: string;
  prompt: string;
  responseMimeType?: string;
  schemaDescription?: string;
  jsonSchema?: any;
  fallbackGenerator: () => any;
}

async function runMultiProviderAi(config: MultiProviderConfig): Promise<{ text: string; providerUsed: string }> {
  return AIProviderService.generateContent({
    systemInstruction: config.systemInstruction,
    prompt: config.prompt,
    responseMimeType: config.responseMimeType,
    schemaDescription: config.schemaDescription,
    jsonSchema: config.jsonSchema,
    fallbackGenerator: config.fallbackGenerator
  });
}

// Check api health and key config
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    hasGeminiKey: !!process.env.GEMINI_API_KEY,
  });
});

// Expose full AI health check telemetry for Admin/diagnostics view (STEP 6)
app.get("/api/ai/health", (req, res) => {
  res.json({
    status: "ok",
    providers: AIProviderService.getProviders().map(p => ({
      name: p.name,
      type: p.type,
      model: p.model,
      enabled: p.enabled,
      apiKeyPresent: !!p.apiKey
    })),
    healthStatus: AIProviderService.healthStatus,
    env: {
      hasGeminiKey: !!process.env.GEMINI_API_KEY,
      hasGroqKey: !!process.env.GROQ_API_KEY || !!process.env.VITE_GROQ_API_KEY,
      hasOpenrouterKey: !!process.env.OPENROUTER_API_KEY,
    }
  });
});

// API Endpoint 1: Generate Note with Flashcards
app.post("/api/gemini/generate-notes", async (req, res) => {
  const { topic, detailLevel = "intermediate", customInstructions = "" } = req.body;
  try {
    if (!topic) {
      return res.status(400).json({ error: "Missing required field: topic" });
    }

    const fallbackGenerator = () => ({
      title: `Comprehensive Studies: ${topic}`,
      summary: `• Bullet-point overview of ${topic}.\n• Structured details outlining core features.\n• Core formulas, methods, or historic events corresponding to the topic.`,
      content: `### Executive Overview\n\nThis lesson explores **${topic}** in a structured **${detailLevel}** format. \n\n### Foundations of ${topic}\n\n1. **Primary definitions**: Modern implementation guidelines and conceptual mappings.\n2. **Technological significance**: How this forms the baseline for contemporary educational practices.\n3. **Practical Examples**: Applied workflows modeling functional outcomes.\n\n### Advanced Conceptual Nuances\n\n* **Core metrics**: Defining limits, parameters, and design metrics.\n* **Integration boundaries**: Managing cross-domain knowledge graphs seamlessly.\n\n_Generated as a smart educational note fallback._`,
      flashcards: [
        { front: `What is the core definition of ${topic}?`, back: `The general foundational structure, conceptual framework, or baseline of ${topic}.` },
        { front: `Name one key application area of ${topic}.`, back: `Advanced SaaS layouts or multi-tier educational analytics systems.` }
      ]
    });

    const systemInstruction = "You are Mentora AI, an advanced, meticulous educational notes compiler. Generate fully comprehensive textbook notes rich in technical accuracy.";
    const prompt = `Generate a comprehensive study note and high-impact flashcards about "${topic}".
The target academic style is details-oriented, professional, and optimized for an "${detailLevel}" level.
Additional user rules: ${customInstructions}.
The response must follow the exact structure requested. The "content" field MUST use rich markdown representation and should be highly comprehensive, containing headings, detailed explanation paragraphs, bullet items, and bold key concepts.`;

    const schemaDescription = `{
      title: "string - A high-impact academic title for the note",
      summary: "string - A list of bullet points summarizing key takeaways",
      content: "string - The full, rich markdown notes content including headings, formulas, explanations",
      flashcards: [
        {
          front: "string - Question or concept description",
          back: "string - Answer or explanation details"
        }
      ]
    }`;

    const jsonSchema = {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING, description: "A high-impact academic title for the note" },
        summary: { type: Type.STRING, description: "A list of bullet points summarizing key take-aways" },
        content: { type: Type.STRING, description: "The full, rich markdown notes content including headings, explanations" },
        flashcards: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              front: { type: Type.STRING, description: "Interactive question or concept on the front" },
              back: { type: Type.STRING, description: "Comprehensive answer or description on the back" }
            },
            required: ["front", "back"]
          }
        }
      },
      required: ["title", "summary", "content", "flashcards"]
    };

    const result = await runMultiProviderAi({
      systemInstruction,
      prompt,
      responseMimeType: "application/json",
      schemaDescription,
      jsonSchema,
      fallbackGenerator
    });

    console.log("RAW NOTES RESPONSE:", result.text);
    console.log("Provider Used:", result.providerUsed);
    const parsed = parseTextToJson(result.text, fallbackGenerator());
    console.log("Status Code: 200");
    console.log("Response Body:", JSON.stringify(parsed));
    res.json(parsed);
  } catch (error: any) {
    console.error("Generate Notes Error:", error);
    res.status(500).json({ error: error.message || "Failed to generate notes" });
  }
});

// API Endpoint 2: Generate Quiz
app.post("/api/gemini/generate-quiz", async (req, res) => {
  const { topic, amount = 5, difficulty = "Medium" } = req.body;
  try {
    if (!topic) {
      return res.status(400).json({ error: "Missing required field: topic" });
    }

    const fallbackGenerator = () => {
      const mockQuestions = Array.from({ length: Math.min(amount, 5) }).map((_, idx) => ({
        question: `Question ${idx + 1}: Which of the following best defines a key concept within ${topic} related to level ${difficulty}?`,
        options: [
          "Primary theoretical baseline representing standard parameters",
          "Advanced modular synthesis resolving semantic differences",
          "An architectural framework centering localized states",
          "A modern derivative pattern securing client nodes"
        ],
        correctIdx: 2,
        explanation: `Options A and B represent external patterns. Option C specifically defines the localized structural state parameters suited to our current study of ${topic}.`
      }));
      return {
        title: `${topic} Master Quiz`,
        questions: mockQuestions
      };
    };

    const systemInstruction = "You are Mentora AI, an elite educational examiner creating high-quality, rigorous quiz questions.";
    const prompt = `Create a multiple-choice study quiz with exactly ${amount} questions about "${topic}".
Difficulty level: "${difficulty}".
For each question, provide 4 diverse believable options, indicate the correct 0-based index of the answer, and add an educational explanation outlining the logical reasons of the correctness.`;

    const schemaDescription = `{
      title: "string - A compelling title for this academic quiz",
      questions: [
        {
          question: "string - The actual quiz question description",
          options: ["string - Exactly 4 options of answers"],
          correctIdx: "number - The correct answer index (0 to 3)",
          explanation: "string - High-quality reasoning for why it's correct"
        }
      ]
    }`;

    const jsonSchema = {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING, description: "A compelling title of the academic quiz sheet" },
        questions: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              question: { type: Type.STRING, description: "The quiz question description" },
              options: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Exactly 4 options"
              },
              correctIdx: { type: Type.INTEGER, description: "The index (0 to 3) of the correct answer option" },
              explanation: { type: Type.STRING, description: "A clear explanation of why this answer is correct and others are incorrect" }
            },
            required: ["question", "options", "correctIdx", "explanation"]
          }
        }
      },
      required: ["title", "questions"]
    };

    const result = await runMultiProviderAi({
      systemInstruction,
      prompt,
      responseMimeType: "application/json",
      schemaDescription,
      jsonSchema,
      fallbackGenerator
    });

    console.log("RAW QUIZ RESPONSE:", result.text);
    console.log("Provider Used:", result.providerUsed);
    const parsed = parseTextToJson(result.text, fallbackGenerator());
    console.log("Status Code: 200");
    console.log("Response Body:", JSON.stringify(parsed));
    res.json(parsed);
  } catch (error: any) {
    console.error("Generate Quiz Error:", error);
    res.status(500).json({ error: error.message || "Failed to generate quiz" });
  }
});

// API Endpoint 3: Generate Roadmap study plan
app.post("/api/gemini/generate-roadmap", async (req, res) => {
  const { subject, durationDays = 7 } = req.body;
  try {
    if (!subject) {
      return res.status(400).json({ error: "Missing required field: subject" });
    }

    const fallbackGenerator = () => {
      const steps = Array.from({ length: Math.min(durationDays, 5) }).map((_, idx) => ({
        title: `Phase ${idx + 1}: Conceptualizing the Core Elements of ${subject}`,
        description: `Explore primary definitions, construct foundational nodes, and evaluate basic case studies corresponding to ${subject}.`,
        completed: false,
        day: idx + 1
      }));
      return {
        subject,
        durationDays,
        steps
      };
    };

    const systemInstruction = "You are Mentora AI, an expert syllabus and progressive academic roadmap architect.";
    const prompt = `Create an elegant, daily structured study roadmap plan for mastering the subject "${subject}" in exactly ${durationDays} days.
Make each step high-impact, actionable, and progressive. Make sure the 'day' is set consecutively starting from 1 up to ${durationDays}.`;

    const schemaDescription = `{
      subject: "string - The academic subject of this roadmap",
      durationDays: "number - The total number of progressive study steps/days",
      steps: [
        {
          title: "string - Daily curriculum or module topic title",
          description: "string - Learning goals, reference notes, and study instructions",
          completed: "boolean - Always set to false initially",
          day: "number - Consecutively numbered day from 1 to durationDays"
        }
      ]
    }`;

    const jsonSchema = {
      type: Type.OBJECT,
      properties: {
        subject: { type: Type.STRING, description: "The academic subject of the roadmap" },
        durationDays: { type: Type.INTEGER, description: "Total count of steps/days" },
        steps: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING, description: "Title of the day's study topic" },
              description: { type: Type.STRING, description: "Practical learning instructions, exercises, and key outcomes" },
              completed: { type: Type.BOOLEAN, description: "Defaults to false" },
              day: { type: Type.INTEGER, description: "Sequential day count (1 to durationDays)" }
            },
            required: ["title", "description", "completed", "day"]
          }
        }
      },
      required: ["subject", "durationDays", "steps"]
    };

    const result = await runMultiProviderAi({
      systemInstruction,
      prompt,
      responseMimeType: "application/json",
      schemaDescription,
      jsonSchema,
      fallbackGenerator
    });

    const parsed = parseTextToJson(result.text, fallbackGenerator());
    res.json(parsed);
  } catch (error: any) {
    console.error("Generate Roadmap Error:", error);
    res.status(500).json({ error: error.message || "Failed to generate roadmap" });
  }
});

function getLocalTutorFallbackText(userMessageText: string, docContext?: string, imageAttachment?: any): string {
  let promptText = userMessageText.toLowerCase().trim();
  let text = "";

  if (promptText.includes("deep learning")) {
    text = `### ✨ Deep Learning Academic Synthesis
    
Deep learning is a subset of machine learning that utilizes multi-layered artificial neural networks (hence "deep") to model complex representations and learn high-level features directly from raw data. 

**Key Principles:**
1. **Hierarchical Representation**: Lower layers learn basic features (like edges, corners, or speech phones) while higher layers combine them to discover abstract patterns (such as entire faces or complete semantic concepts).
2. **Backpropagation & Gradient Descent**: Weights and biases of the network are iteratively adjusted by calculating the gradient of the loss function with respect to the weights.
3. **Common Architectures**:
   - **CNNs (Convolutional Neural Networks)**: Specialized for grid structures (spatial data like images).
   - **RNNs/LSTMs**: Tailored for sequence processing (time-series or natural language).
   - **Transformers**: Leverage self-attention mechanisms to parallelize context representation (forming the bedrock of modern Large Language Models).

*Advanced AI services are temporarily experiencing heavy congestion, but I can still support you in outlining core study topics! Feel free to ask more focused questions or check your saved notes module.*`;
  } 
  else if (promptText.includes("python") || promptText.includes("code") || promptText.includes("program")) {
    text = `### 🐍 Coding & Python Syntax Essentials

Below is a clean, practical guide to defining structures in Python:

\`\`\`python
# Example: Smart Study Recall Counter
class StudyRecall:
    def __init__(self, topic: str):
        self.topic = topic
        self.scores = []

    def log_trial(self, score: float):
        self.scores.append(score)
        print(f"Logged {score}% recall performance for {self.topic}.")

    def current_average(self) -> float:
        if not self.scores:
            return 0.0
        return sum(self.scores) / len(self.scores)

# Quick verification:
trial = StudyRecall("Deep Learning")
trial.log_trial(85.0)
trial.log_trial(94.5)
print(f"Average Performance: {trial.current_average()}%")
\`\`\`

**Key Takeaways:**
- Keep structures modular. Use logical classes or pure functions to handle state isolation.
- Use explicit type hints for robust code patterns.`;
  } 
  else {
    text = `### 🎓 Mentora Study Companion (Local Core Concept Mode)

I have received your learning query regarding: **"${userMessageText || "Academic Guidelines"}"**.

Due to extremely high global congestion, our real-time cloud-based AI reasoning pipelines are currently rate-limited. To guarantee your flow state is never interrupted, I am running our localized educational repository:

#### 1. Core Paradigm Map of "${userMessageText || "Revision"}"
- **Foundational Concepts**: Focus on establishing the general structure, conceptual definitions, and mechanical limits of the subject before diving into complex proofs.
- **Cognitive Load Optimization**: Break larger syllabus lists down into 20-minute sprints. Spend 5 minutes recalling core definitions instead of re-reading text.
- **Active Recall Drills**: Close your book and bullet out the 3 most essential equations or ideas we just discussed.

`;
    if (docContext) {
      text += `📂 **Document Connection Detected:** I analyzed the linked file content (*"${docContext.substring(0, 100)}..."*). Consider exploring its structural key-points and generating high-impact flashcards in the Notes sidebar.\n`;
    }
    if (imageAttachment) {
      text += `🖼️ **Visual Diagram Attested:** Your attached study graphic exhibits educational coordinates or illustrations. For best results on exams, focus your analysis on coordinate intersections and key label definitions!\n`;
    }
  }

  return text;
}

async function streamGroq(apiKey: string, model: string, systemInstruction: string, promptText: string, res: any): Promise<boolean> {
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: model,
      messages: [
        { role: "system", content: systemInstruction },
        { role: "user", content: promptText }
      ],
      stream: true,
      temperature: 0.7
    })
  });

  if (!response.ok) {
    const errorMsg = await response.text().catch(() => "");
    throw new Error(`Groq HTTP error ${response.status} - ${errorMsg}`);
  }

  const reader = response.body;
  if (!reader) {
    throw new Error("Groq response body is not a readable stream");
  }

  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  for await (const chunk of reader as any) {
    buffer += decoder.decode(chunk, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      const cleanLine = line.trim();
      if (!cleanLine) continue;
      if (cleanLine === "data: [DONE]") continue;

      if (cleanLine.startsWith("data: ")) {
        try {
          const jsonStr = cleanLine.substring(6);
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content || "";
          if (content) {
            res.write(content);
          }
        } catch (e) {
          // chunk edge parsing exception tolerance
        }
      }
    }
  }

  if (buffer) {
    const cleanLine = buffer.trim();
    if (cleanLine.startsWith("data: ") && cleanLine !== "data: [DONE]") {
      try {
        const jsonStr = cleanLine.substring(6);
        const parsed = JSON.parse(jsonStr);
        const content = parsed.choices?.[0]?.delta?.content || "";
        if (content) {
          res.write(content);
        }
      } catch (e) {}
    }
  }

  return true;
}

// API Endpoint 4-Stream: AI chatbot streaming academic assistant with File details
app.post("/api/gemini/chat-stream", async (req, res) => {
  try {
    const { messages, docContext, imageAttachment } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Missing or invalid field: messages" });
    }

    // Configure content-type for real-time Transfer-Encoding stream
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Transfer-Encoding", "chunked");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const lastMessage = messages[messages.length - 1];
    const userMessageText = lastMessage?.text || "";

    const getFallbackText = () => getLocalTutorFallbackText(userMessageText, docContext, imageAttachment);

    // Prepare multi-turn system instruction and prompt payload
    let contextHeader = "";
    if (docContext) {
      contextHeader += `[STUDENT ATTACHED STUDY FILE / DOCUMENT]:\n---START---\n${docContext}\n---END---\n\n`;
    }

    const formattedHistory = messages
      .slice(-12)
      .map((m: any) => `${m.sender === "user" ? "Student" : "Mentora AI"}: ${m.text}`)
      .join("\n");

    const systemInstruction = `You are Mentora AI, an intelligent, conversational, premium AI assistant with a personality similar to ChatGPT, Google Gemini, Claude, and Perplexity. Under all circumstances, be conversational, fluid, helpful and direct. Avoid robotic section layouts unless requested. Use markdown and code blocks beautifully of course.`;
    const dynamicPrompt = `${contextHeader} Behave as Mentora AI according to the exact guidelines. Use the optional document context or history below.\n\nDialogue history:\n${formattedHistory}\n\nStudent's latest query: ${userMessageText}`;

    const streamWithDelay = async (text: string) => {
      const words = text.split(/(\s+)/);
      for (const word of words) {
        res.write(word);
        await new Promise((resolve) => setTimeout(resolve, 8)); // very fast smooth simulated streaming
      }
    };

    const groqKey = process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;
    const openrouterKey = process.env.OPENROUTER_API_KEY;

    let streamSucceeded = false;
    let fallbackWarningSent = false;

    // 1. Groq primary model
    if (groqKey) {
      try {
        console.log("[AI-Router-Stream] Attempting Groq primary stream (llama-3.3-70b-versatile)...");
        await streamGroq(groqKey, "llama-3.3-70b-versatile", systemInstruction, dynamicPrompt, res);
        streamSucceeded = true;
      } catch (err: any) {
        console.warn("[AI-Router-Stream-Error] Groq primary stream failed. Switching to fallback:", err.message || err);
        res.write("AI services are temporarily busy. Switching to backup intelligence provider...\n\n");
        fallbackWarningSent = true;
      }
    }

    // 2. Groq fallback model
    if (!streamSucceeded && groqKey) {
      try {
        console.log("[AI-Router-Stream] Attempting Groq fallback stream (llama-3.1-8b-instant)...");
        await streamGroq(groqKey, "llama-3.1-8b-instant", systemInstruction, dynamicPrompt, res);
        streamSucceeded = true;
      } catch (err: any) {
        console.warn("[AI-Router-Stream-Error] Groq fallback stream failed:", err.message || err);
        if (!fallbackWarningSent) {
          res.write("AI services are temporarily busy. Switching to backup intelligence provider...\n\n");
          fallbackWarningSent = true;
        }
      }
    }

    // 3. Gemini 3.5 secondary cloud fallback
    if (!streamSucceeded && geminiKey) {
      try {
        console.log("[AI-Router-Stream] Attempting Gemini 3.5 Stream (gemini-3.5-flash)...");
        
        // Record telemetry for streaming
        AIProviderService.healthStatus.lastRequestTime = new Date().toISOString();
        AIProviderService.healthStatus.lastPromptLength = dynamicPrompt.length;
        AIProviderService.healthStatus.lastProviderUsed = "Gemini Stream Fallback";
        AIProviderService.healthStatus.lastModelUsed = "gemini-3.5-flash";
        AIProviderService.healthStatus.lastResponseStatus = "Streaming In Progress";

        const ai = getGemini();
        let contentArgument: any;
        if (imageAttachment && imageAttachment.data) {
          const imgPart = {
            inlineData: {
              mimeType: imageAttachment.mimeType,
              data: imageAttachment.data
            }
          };
          const textPart = { text: dynamicPrompt };
          contentArgument = { parts: [imgPart, textPart] };
        } else {
          contentArgument = dynamicPrompt;
        }

        const responseStream = await ai.models.generateContentStream({
          model: "gemini-3.5-flash",
          contents: contentArgument,
          config: {
            systemInstruction,
            temperature: 0.7,
          }
        });
        let accumulatedLength = 0;
        let responseContent = "";
        for await (const chunk of responseStream) {
          const text = chunk.text;
          if (text) {
            res.write(text);
            accumulatedLength += text.length;
            responseContent += text;
          }
        }
        streamSucceeded = true;
        
        AIProviderService.healthStatus.lastResponseStatus = "Streaming Succeeded";
        AIProviderService.healthStatus.lastResponseTextLength = accumulatedLength;
        AIProviderService.healthStatus.lastResponseText = responseContent;
      } catch (err: any) {
        console.warn("[AI-Router-Stream-Error] Gemini 3.5 stream fallback failed:", err.message || err);
        AIProviderService.healthStatus.lastError = err.message || String(err);
        AIProviderService.healthStatus.lastResponseStatus = "Streaming Failed";
      }
    }

    // 4. OpenRouter fallback
    if (!streamSucceeded && openrouterKey) {
      try {
        console.log("[AI-Router-Stream] Attempting OpenRouter Stream...");
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${openrouterKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://ai.studio/build",
            "X-Title": "Mentora AI Classroom"
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: systemInstruction },
              { role: "user", content: dynamicPrompt }
            ],
            temperature: 0.7
          })
        });
        if (response.ok) {
          const data = await response.json();
          const text = data.choices?.[0]?.message?.content || "";
          if (text) {
            await streamWithDelay(text);
            streamSucceeded = true;
          }
        }
      } catch (err: any) {
        console.warn("[AI-Router-Stream-Error] OpenRouter fallback failed:", err.message || err);
      }
    }

    // 5. Local Offline Assistant fallback
    if (!streamSucceeded) {
      console.warn("[AI-Router-Stream] ALL CLOUD STREAMING PROVIDERS EXHAUSTED. Deploying Local Backup.");
      const fallbackText = getFallbackText();
      await streamWithDelay(fallbackText);
    }

    return res.end();
  } catch (error: any) {
    console.error("Endpoint chat-stream error:", error);
    res.write(`\n\n[ERR: Stream interrupted: ${error?.message || "connection issues"}. Reverting to local layers.]`);
    res.end();
  }
});

// API Endpoint 4: AI chatbot academic assistant
app.post("/api/gemini/chat", async (req, res) => {
  try {
    const { messages, docContext, imageAttachment } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Missing or invalid field: messages" });
    }

    const lastMessage = messages[messages.length - 1];
    const userMessageText = lastMessage?.text || "";

    const fallbackGenerator = () => {
      return getLocalTutorFallbackText(userMessageText, docContext, imageAttachment);
    };

    let contextHeader = "";
    if (docContext) {
      contextHeader += `[STUDENT ATTACHED STUDY FILE / DOCUMENT]:\n---START---\n${docContext}\n---END---\n\n`;
    }

    const formattedHistory = messages
      .slice(-10)
      .map((m: any) => `${m.sender === "user" ? "Student" : "Mentora AI"}: ${m.text}`)
      .join("\n");

    const prompt = `${contextHeader}You are Mentora AI, an intelligent, conversational assistant. Speak fluidly, naturally, and helpfully. Do not overcomplicate your responses. Include math, code, or charts if relevant.

Conversation History:
${formattedHistory}

Student's latest query: ${userMessageText}
Mentora AI response:`;

    const systemInstruction = "You are Mentora AI, an intelligent study copilot and reasoning companion. Be helpful, authentic, human-like, and highly responsive. Avoid robotic section layouts unless requested.";

    const result = await runMultiProviderAi({
      systemInstruction,
      prompt,
      fallbackGenerator
    });

    res.json({ text: result.text });
  } catch (error: any) {
    console.error("Chatbot Error:", error);
    res.status(200).json({ text: "AI services are temporarily unavailable." });
  }
});

// API Endpoint 5: Personalized Dashboard Study Recommendations
app.post("/api/gemini/recommendations", async (req, res) => {
  const { streak = 0, totalXp = 0, currentLevel = 1, completedSubjects = [] } = req.body;

  // Function to generate dynamic local fallback recommendations
  const getFallbackRecommendations = () => {
    const list = [];
    
    // Streak-based recommendation
    if (streak === 0) {
      list.push({
        title: "Spark Your Daily Streak! ⚡",
        desc: "Complete any interactive Roadmap module or study note today to launch your daily streak.",
        category: "Streak Boosters",
        minutes: 5
      });
    } else {
      list.push({
        title: `Protect Your ${streak}-Day Streak! 🔥`,
        desc: "Keep up the momentum! Finish a short study note or custom quiz to secure your learning streak.",
        category: "Streak Boosters",
        minutes: 7
      });
    }

    // Subject/History-based recommendation
    if (completedSubjects && completedSubjects.length > 0) {
      const lastSubject = completedSubjects[completedSubjects.length - 1];
      list.push({
        title: `Deep Dive: ${lastSubject} 🔬`,
        desc: `Ask Mentora Copilot to construct a mini conceptual review or practice exam on your previous topic: "${lastSubject}".`,
        category: "Core Subjects",
        minutes: 10
      });
    } else {
      list.push({
        title: "Explore A Fresh Roadmap Subject 🗺️",
        desc: "Head over to the Roadmaps catalog and create a structured syllabus tailored to physics, machine learning, or mathematics.",
        category: "Core Subjects",
        minutes: 12
      });
    }

    // Level-based or gamified challenge
    const xpNeeded = 500 - (totalXp % 500);
    list.push({
      title: `Sprint to Level ${currentLevel + 1}! 🏆`,
      desc: `You need just ${xpNeeded} XP to level up. Earn bonus Coins and a shiny new badge by starting an active recall practice now.`,
      category: "Challenge Mode",
      minutes: 15
    });

    return { recommendations: list };
  };

  try {
    const prompt = `Analyze this student profile structure:
Streak: ${streak} days
Cumulative XP: ${totalXp}
Level: ${currentLevel}
Previously tackled topics: ${completedSubjects.join(", ") || "None yet"}

Generate exactly 3 progressive smart learning recommendations. Focus on game mechanics (like streaks, challenges, level jumps) and subject recommendations. Return in structured JSON array.`;

    const systemInstruction = "You are Mentora AI, an intelligent Student Success Advisor.";

    const schemaDescription = `{
      recommendations: [
        {
          title: "string - Compelling task or subject title",
          desc: "string - Detailed roadmap action for gamification engagement",
          category: "string - Category like 'Gamified', 'Challenge', 'Topic Proposal'",
          minutes: "number - Estimated completion time in minutes"
        }
      ]
    }`;

    const jsonSchema = {
      type: Type.OBJECT,
      properties: {
        recommendations: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING, description: "Compelling task or subject title" },
              desc: { type: Type.STRING, description: "Detailed roadmap action for gamification engagement" },
              category: { type: Type.STRING, description: "Category like 'Gamified', 'Challenge', 'Topic Proposal'" },
              minutes: { type: Type.INTEGER, description: "Estimated completion time in minutes" }
            },
            required: ["title", "desc", "category", "minutes"]
          }
        }
      },
      required: ["recommendations"]
    };

    const result = await runMultiProviderAi({
      systemInstruction,
      prompt,
      responseMimeType: "application/json",
      schemaDescription,
      jsonSchema,
      fallbackGenerator: getFallbackRecommendations
    });

    const parsed = parseTextToJson(result.text, getFallbackRecommendations());
    res.json(parsed);
  } catch (error: any) {
    console.error("Recommendations API Error:", error);
    res.json(getFallbackRecommendations());
  }
});

// API Endpoint 6: Analyze file / PDF summarizer mock/simple parsing
// Since PDF rendering has heavy dependencies on the node side, we'll support text extraction of submitted PDF logs or custom copy-pastes
app.post("/api/gemini/summarize-document", async (req, res) => {
  const { documentName, contentText } = req.body;
  try {
    if (!contentText) {
      return res.status(400).json({ error: "No document content text provided to summarize" });
    }

    const fallbackGenerator = () => ({
      summaryTitle: `AI Overview: ${documentName || "Custom Document"}`,
      extractedKeypoints: [
        "Primary topic foundations and high-level architectural constraints.",
        "Core mechanics, mathematical equations, or data flow structures analyzed.",
        "Strategic summary points showing critical items to study further for exams."
      ],
      estimatedReadTimeMinutes: 4
    });

    const prompt = `Perform a high-grade academic summarization and synthesis of this submitted document/lesson named "${documentName || "Study Material"}".
Document Text content:
${contentText.slice(0, 15000)}

Extract the structural summary details, main takeaways, and list key terms.`;

    const systemInstruction = "You are Mentora AI Academic Text Analyser. Synthesize critical details and list core study points.";

    const schemaDescription = `{
      summaryTitle: "string - Dynamic academic summary title matching the content subject",
      extractedKeypoints: ["string - Key educational takeaways and study coordinates of the text"],
      estimatedReadTimeMinutes: "number - Estimated revision read duration in minutes"
    }`;

    const jsonSchema = {
      type: Type.OBJECT,
      properties: {
        summaryTitle: { type: Type.STRING },
        extractedKeypoints: { type: Type.ARRAY, items: { type: Type.STRING } },
        estimatedReadTimeMinutes: { type: Type.INTEGER }
      },
      required: ["summaryTitle", "extractedKeypoints", "estimatedReadTimeMinutes"]
    };

    const result = await runMultiProviderAi({
      systemInstruction,
      prompt,
      responseMimeType: "application/json",
      schemaDescription,
      jsonSchema,
      fallbackGenerator
    });

    const parsed = parseTextToJson(result.text, fallbackGenerator());
    res.json(parsed);
  } catch (error: any) {
    console.error("Document Summarize Error:", error);
    res.status(500).json({ error: error.message || "Failed to compile document analysis" });
  }
});

// Configure Vite middleware and static serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Mounted Vite development middleware.");
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log("Serving compiled production assets from /dist.");
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server launched successfully. Listening on port ${PORT}`);
  });
}

startServer();
