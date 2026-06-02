import { GoogleGenAI } from "@google/genai";

export interface AIProviderConfig {
  systemInstruction?: string;
  prompt: string;
  responseMimeType?: string;
  schemaDescription?: string;
  jsonSchema?: any;
  fallbackGenerator: () => any;
  timeoutMs?: number;
}

export interface AIResponse {
  text: string;
  providerUsed: string;
}

export interface ProviderDefinition {
  name: string;
  type: "groq" | "gemini" | "openrouter";
  model: string;
  apiKey?: string;
  enabled: boolean;
}

export interface AIHealthStatus {
  lastRequestTime: string | null;
  lastProviderUsed: string | null;
  lastModelUsed: string | null;
  lastPromptLength: number | null;
  lastResponseTextLength: number | null;
  lastResponseStatus: string | null;
  lastResponseText: string | null;
  lastError: string | null;
}

/**
 * Robust, highly reliable multi-provider AI service layer supporting
 * modular model switching, retry loops, timeout handling, and stream parsing.
 */
export class AIProviderService {
  private static geminiClient: GoogleGenAI | null = null;

  // Real-time server side audit logs for step 6 diagnostics
  public static healthStatus: AIHealthStatus = {
    lastRequestTime: null,
    lastProviderUsed: null,
    lastModelUsed: null,
    lastPromptLength: null,
    lastResponseTextLength: null,
    lastResponseStatus: null,
    lastResponseText: null,
    lastError: null,
  };

  /**
   * Helper to resolve the active providers list in order of priority.
   * Priority:
   * 1. Groq (llama-3.3-70b-versatile)
   * 2. Groq Fallback (llama-3.1-8b-instant)
   * 3. Gemini 3.5 Flash (as secondary cloud fallback)
   */
  public static getProviders(): ProviderDefinition[] {
    const groqKey = process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY || "";
    const geminiKey = process.env.GEMINI_API_KEY || "";
    const openrouterKey = process.env.OPENROUTER_API_KEY || "";

    return [
      {
        name: "Groq Primary",
        type: "groq",
        model: "llama-3.3-70b-versatile",
        apiKey: groqKey,
        enabled: !!groqKey
      },
      {
        name: "Groq Fallback",
        type: "groq",
        model: "llama-3.1-8b-instant",
        apiKey: groqKey,
        enabled: !!groqKey
      },
      {
        name: "Gemini 3.5 Flash",
        type: "gemini",
        model: "gemini-3.5-flash",
        apiKey: geminiKey,
        enabled: !!geminiKey
      },
      {
        name: "OpenRouter",
        type: "openrouter",
        model: "google/gemini-2.5-flash",
        apiKey: openrouterKey,
        enabled: !!openrouterKey
      }
    ];
  }

  /**
   * Helper to lazily-initialize Gemini client
   */
  private static getGemini(apiKey: string): GoogleGenAI {
    if (!this.geminiClient) {
      this.geminiClient = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build-service",
          },
        },
      });
    }
    return this.geminiClient;
  }

  /**
   * Helper to run queries with timeouts
   */
  private static async fetchWithTimeout(
    url: string,
    options: RequestInit,
    timeoutMs: number = 8000
  ): Promise<Response> {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(id);
      return response;
    } catch (err: any) {
      clearTimeout(id);
      throw err;
    }
  }

  /**
   * Generates structured non-streaming content from the prioritized providers.
   */
  public static async generateContent(config: AIProviderConfig): Promise<AIResponse> {
    const activeProviders = this.getProviders().filter(p => p.enabled);
    const timeout = config.timeoutMs || 10000;

    // STEP 1 Diagnostics logs
    const groqKey = process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY || "";
    const geminiKey = process.env.GEMINI_API_KEY || "";
    console.log("GROQ KEY EXISTS:", !!groqKey);
    console.log("GEMINI KEY EXISTS:", !!geminiKey);
    console.log("ACTIVE PROVIDERS:", activeProviders);

    // STEP 2 Verify provider activation
    console.log("--- PROVIDER CONFIG DISCOVERY ---");
    const allProviders = this.getProviders();
    allProviders.forEach(p => {
      console.log(`Provider Name: ${p.name}`);
      console.log(`Enabled: ${p.enabled}`);
      console.log(`Model: ${p.model}`);
      console.log(`API Key Present: ${!!p.apiKey}`);
    });
    console.log("---------------------------------");

    // Initialize/reset active health audit status for STEP 6
    this.healthStatus.lastRequestTime = new Date().toISOString();
    this.healthStatus.lastPromptLength = config.prompt ? config.prompt.length : 0;
    this.healthStatus.lastError = null;
    this.healthStatus.lastResponseStatus = "Processing";

    for (const provider of activeProviders) {
      let attempt = 0;
      const maxRetries = 2;

      // STEP 3 - Model Validity Verification
      if (provider.type === "gemini") {
        console.log(`[Model-Validation] Checking model: ${provider.model}`);
        const deprecatedModels = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-pro", "gemini-2.0-flash", "gemini-2.0-pro", "gemini-2.0-flash-thinking"];
        if (deprecatedModels.includes(provider.model)) {
          console.warn(`[Model-Validation] Model ${provider.model} is deprecated/strictly prohibited! Replacing with gemini-3.5-flash.`);
          provider.model = "gemini-3.5-flash";
        } else {
          console.log(`[Model-Validation] Model ${provider.model} is valid.`);
        }
      }

      while (attempt < maxRetries) {
        try {
          // STEP 4 - Request Execution Logs
          console.log("Request Start");
          console.log(`Provider Selected: ${provider.name}`);

          console.info(`[AIService] Routing to: ${provider.name} | Model: ${provider.model} (Attempt ${attempt + 1})`);
          let responseText = "";

          if (provider.type === "groq" && provider.apiKey) {
            const messages = [];
            if (config.systemInstruction) {
              messages.push({ role: "system", content: config.systemInstruction });
            }
            let augmentedPrompt = config.prompt;
            if (config.responseMimeType === "application/json" && config.schemaDescription) {
              augmentedPrompt += `\n\nCRITICAL RULE: Return ONLY a valid JSON object matching this schema. Plain JSON text only, no wrappers, prefaces, markdown blocks, or postscripts:\n${config.schemaDescription}`;
            }
            messages.push({ role: "user", content: augmentedPrompt });

            const response = await this.fetchWithTimeout(
              "https://api.groq.com/openai/v1/chat/completions",
              {
                method: "POST",
                headers: {
                  "Authorization": `Bearer ${provider.apiKey}`,
                  "Content-Type": "application/json"
                },
                body: JSON.stringify({
                  model: provider.model,
                  messages,
                  temperature: 0.7,
                  ...(config.responseMimeType === "application/json" ? { response_format: { type: "json_object" } } : {})
                })
              },
              timeout
            );

            console.log(`Response Status: ${response.status}`);

            if (!response.ok) {
              const errBody = await response.text().catch(() => "");
              throw new Error(`Groq HTTP ${response.status} Error: ${errBody || "Unknown"}`);
            }

            const data = await response.json();
            responseText = data.choices?.[0]?.message?.content || "";
          } 
          
          else if (provider.type === "gemini" && provider.apiKey) {
            const ai = this.getGemini(provider.apiKey);
            // Promise wrapper for Gemini call in case of timeout
            const geminiPromise = ai.models.generateContent({
              model: provider.model,
              contents: config.prompt,
              config: {
                systemInstruction: config.systemInstruction,
                temperature: 0.7,
                responseMimeType: config.responseMimeType as any,
                responseSchema: config.jsonSchema
              }
            });

            const timeoutPromise = new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error("Gemini generation timed out")), timeout)
            );

            const response = await Promise.race([geminiPromise, timeoutPromise]);
            console.log(`Response Status: 200 (Success)`);
            responseText = response.text || "";
          } 
          
          else if (provider.type === "openrouter" && provider.apiKey) {
            const messages = [];
            if (config.systemInstruction) {
              messages.push({ role: "system", content: config.systemInstruction });
            }
            let augmentedPrompt = config.prompt;
            if (config.responseMimeType === "application/json" && config.schemaDescription) {
              augmentedPrompt += `\n\nCRITICAL RULE: Return ONLY a valid JSON object matching this schema. Plain JSON text only, no prefaces or markdown styling:\n${config.schemaDescription}`;
            }
            messages.push({ role: "user", content: augmentedPrompt });

            const response = await this.fetchWithTimeout(
              "https://openrouter.ai/api/v1/chat/completions",
              {
                method: "POST",
                headers: {
                  "Authorization": `Bearer ${provider.apiKey}`,
                  "Content-Type": "application/json",
                  "HTTP-Referer": "https://ai.studio/build",
                  "X-Title": "Mentora AI Classroom"
                },
                body: JSON.stringify({
                  model: provider.model,
                  messages,
                  temperature: 0.7
                })
              },
              timeout
            );

            console.log(`Response Status: ${response.status}`);

            if (!response.ok) {
              throw new Error(`OpenRouter HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            responseText = data.choices?.[0]?.message?.content || "";
          }

          if (responseText && responseText.trim()) {
            console.log(`Response Text Length: ${responseText.length}`);

            // STEP 5 - JSON Parser Hardening and raw log before parse
            if (config.responseMimeType === "application/json") {
              console.log("[JSON-Validator] Raw response to validate JSON:", responseText);
              try {
                let clean = responseText.trim();
                if (clean.startsWith("```json")) {
                  clean = clean.substring(7);
                } else if (clean.startsWith("```")) {
                  clean = clean.substring(3);
                }
                if (clean.endsWith("```")) {
                  clean = clean.substring(0, clean.length - 3);
                }
                clean = clean.trim();
                JSON.parse(clean);
              } catch (jsonErr: any) {
                console.error("[JSON-Validator] JSON parse error on original text:", responseText);
                throw new Error(`Returned content failed JSON validation: ${jsonErr.message || jsonErr}`);
              }
            }

            console.info(`[AIService] Success with: ${provider.name}`);

            // Update live metrics for health reporting
            AIProviderService.healthStatus.lastProviderUsed = provider.name;
            AIProviderService.healthStatus.lastModelUsed = provider.model;
            AIProviderService.healthStatus.lastResponseStatus = "Verified Success";
            AIProviderService.healthStatus.lastResponseTextLength = responseText.length;
            AIProviderService.healthStatus.lastResponseText = responseText;

            return {
              text: responseText,
              providerUsed: provider.name
            };
          }

          throw new Error("Empty text returned from model provider.");

        } catch (err: any) {
          console.warn(`[AIService-Error] ${provider.name} failed (Attempt ${attempt + 1}):`, err.message || err);
          AIProviderService.healthStatus.lastError = err.message || String(err);
          AIProviderService.healthStatus.lastResponseStatus = `Error (Attempt ${attempt + 1})`;
          attempt++;
          if (attempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, attempt * 500));
          }
        }
      }
    }

    console.warn("[AIService] ALL CLOUD PROVIDERS EXHAUSTED. Deploying Local Backup.");
    const fallbackVal = config.fallbackGenerator();
    const textOutput = typeof fallbackVal === "string" ? fallbackVal : JSON.stringify(fallbackVal);
    
    // Update metrics to local fallback fallback mode status
    AIProviderService.healthStatus.lastProviderUsed = "Educational Offline Assistant";
    AIProviderService.healthStatus.lastModelUsed = "Local Backup Rule";
    AIProviderService.healthStatus.lastResponseStatus = "Fallback Delivered";
    AIProviderService.healthStatus.lastResponseTextLength = textOutput.length;
    AIProviderService.healthStatus.lastResponseText = textOutput;

    return {
      text: textOutput,
      providerUsed: "Educational Offline Assistant"
    };
  }
}
