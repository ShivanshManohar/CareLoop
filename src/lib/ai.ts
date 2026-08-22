import { GoogleGenerativeAI } from "@google/generative-ai";
import { buildPreVisitPrompt, buildPostVisitPrompt, SymptomInput } from "./prompts";

export interface PreVisitTriageResult {
  urgencyLevel: "Low" | "Medium" | "High";
  chiefComplaint: string;
  suggestedQuestions: string[];
}

const DEFAULT_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === "" || apiKey === "your-gemini-api-key") {
    return null;
  }
  return new GoogleGenerativeAI(apiKey);
}

/**
 * Deterministic Mock for Pre-Visit Triage when GEMINI_API_KEY is not set
 */
function getMockPreVisitTriage(symptoms: SymptomInput): PreVisitTriageResult {
  const severity = symptoms.severity || 4;
  const notes = (symptoms.notes || "").toLowerCase();
  const tags = (symptoms.tags || "").toLowerCase();

  let urgencyLevel: "Low" | "Medium" | "High" = "Low";
  if (severity >= 8 || notes.includes("chest pain") || notes.includes("shortness of breath") || notes.includes("bleeding")) {
    urgencyLevel = "High";
  } else if (severity >= 5 || notes.includes("fever") || notes.includes("infection") || notes.includes("pain")) {
    urgencyLevel = "Medium";
  }

  const chiefComplaint = symptoms.notes
    ? `Patient presents with ${symptoms.notes} (duration: ${symptoms.duration || "unspecified"}, severity: ${severity}/10).`
    : `Patient reports mild symptoms requiring routine clinical evaluation.`;

  const questionsMap: Record<string, string[]> = {
    High: [
      "Are you experiencing any acute chest pressure, radiation to the arm, or severe dizziness?",
      "When did the most intense pain/episode begin, and does anything relieve it?",
      "Have you taken any emergency medication or had prior cardiac/vascular history?",
    ],
    Medium: [
      "How has the severity progressed since initial symptom onset?",
      "Have you noticed any associated chills, nausea, or localized swelling?",
      "What over-the-counter medications have you tried, and did they reduce discomfort?",
    ],
    Low: [
      "How long have you noticed these mild symptoms, and do they impact daily activities?",
      "Have there been recent dietary or environmental changes?",
      "Do you have a personal or family history of similar seasonal or chronic concerns?",
    ],
  };

  return {
    urgencyLevel,
    chiefComplaint,
    suggestedQuestions: questionsMap[urgencyLevel],
  };
}

/**
 * Analyzes patient intake symptoms and returns structured JSON triage.
 * Includes 1 automatic retry on failure before falling back.
 */
export async function analyzePreVisitSymptoms(symptoms: SymptomInput): Promise<{
  success: boolean;
  data: PreVisitTriageResult;
  isMock: boolean;
  error?: string;
}> {
  const genAI = getGeminiClient();

  if (!genAI) {
    // Graceful offline development fallback
    return {
      success: true,
      data: getMockPreVisitTriage(symptoms),
      isMock: true,
    };
  }

  const prompt = buildPreVisitPrompt(symptoms);

  // Attempt with 1 retry
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const model = genAI.getGenerativeModel({
        model: DEFAULT_MODEL,
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.2,
        },
      });

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const parsed = JSON.parse(text) as PreVisitTriageResult;

      // Validate schema
      if (
        parsed.urgencyLevel &&
        ["Low", "Medium", "High"].includes(parsed.urgencyLevel) &&
        typeof parsed.chiefComplaint === "string" &&
        Array.isArray(parsed.suggestedQuestions)
      ) {
        return { success: true, data: parsed, isMock: false };
      }
    } catch (err: any) {
      console.warn(`[CareLoop AI] Pre-visit analysis attempt ${attempt} failed:`, err?.message || err);
      if (attempt === 2) {
        // Fallback to mock on final failure to ensure system resilience
        return {
          success: false,
          data: getMockPreVisitTriage(symptoms),
          isMock: true,
          error: err?.message || "AI triage service temporarily unavailable",
        };
      }
    }
  }

  return {
    success: false,
    data: getMockPreVisitTriage(symptoms),
    isMock: true,
    error: "AI generation failed after retries",
  };
}

/**
 * Deterministic Mock Post-Visit Summary for offline local development
 */
export function getMockPostVisitSummary(clinicalNotes: string, prescription?: string): string {
  return `## 📋 Visit Summary & Diagnosis
Thank you for visiting today. We completed a thorough review of your reported symptoms. Based on the examination, we discussed your current health status and outlined a supportive recovery plan.

**Key Findings:**
${clinicalNotes || "Regular clinical check-up and symptom monitoring."}

---

## 💊 Medication & Care Schedule
${
  prescription
    ? `Please follow this medication plan carefully:\n${prescription}\n\n- Take medications with plenty of water.\n- Avoid skipping prescribed doses.`
    : "No new prescription required. Continue staying well hydrated and getting adequate rest."
}

---

## 🗓️ Next Steps & When to Seek Urgent Care
- **Follow-up:** Schedule a follow-up check in 7–10 days if symptoms do not steadily improve.
- **Red Flags:** Seek immediate emergency care if you experience severe shortness of breath, sudden high fever above 103°F, or sudden acute chest/abdominal pain.`;
}

/**
 * Generates or streams the post-visit patient summary.
 */
export async function generatePostVisitSummaryStream(clinicalNotes: string, prescription?: string) {
  const genAI = getGeminiClient();
  const prompt = buildPostVisitPrompt(clinicalNotes, prescription);

  if (!genAI) {
    // Return a readable mock stream for offline development
    const mockText = getMockPostVisitSummary(clinicalNotes, prescription);
    const chunks = mockText.split(" ");

    const encoder = new TextEncoder();
    return new ReadableStream({
      async start(controller) {
        for (const word of chunks) {
          controller.enqueue(encoder.encode(word + " "));
          await new Promise((res) => setTimeout(res, 25)); // simulate token streaming
        }
        controller.close();
      },
    });
  }

  const model = genAI.getGenerativeModel({ model: DEFAULT_MODEL });
  const result = await model.generateContentStream(prompt);

  const encoder = new TextEncoder();
  return new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of result.stream) {
          const chunkText = chunk.text();
          controller.enqueue(encoder.encode(chunkText));
        }
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
  });
}
