/**
 * CareLoop AI Prompt Templates
 * All AI prompts are centralized here for strict consistency and maintainability.
 */

export interface SymptomInput {
  duration?: string;
  severity?: number;
  tags?: string;
  notes?: string;
}

export function buildPreVisitPrompt(symptoms: SymptomInput): string {
  const formattedSymptoms = [
    symptoms.duration ? `Duration: ${symptoms.duration}` : null,
    symptoms.severity ? `Pain/Severity Scale (1-10): ${symptoms.severity}/10` : null,
    symptoms.tags ? `Reported Symptoms/Tags: ${symptoms.tags}` : null,
    symptoms.notes ? `Patient Description: ${symptoms.notes}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  return `You are a clinical triage AI assistant for CareLoop.
Analyse these symptoms and return urgency level (Low/Medium/High), chief complaint, and three suggested questions for the doctor.

Symptoms:
${formattedSymptoms || "No specific symptoms reported by patient."}

Return a valid JSON object matching this exact schema:
{
  "urgencyLevel": "Low" | "Medium" | "High",
  "chiefComplaint": "A concise 1-2 sentence clinical summary of the primary complaint and onset.",
  "suggestedQuestions": [
    "Question 1 for doctor to ask regarding symptoms",
    "Question 2 for doctor to evaluate differential diagnosis",
    "Question 3 for doctor to check red flags or lifestyle factors"
  ]
}`;
}

export function buildPostVisitPrompt(clinicalNotes: string, prescription?: string): string {
  return `You are CareLoop's patient communication medical AI.
Convert these clinical notes into a patient-friendly summary with a medication schedule and follow-up steps.

Doctor's Clinical Notes:
${clinicalNotes}

${prescription ? `Prescription & Orders:\n${prescription}` : "Prescription: None noted."}

Formatting Guidelines:
1. Use warm, reassuring, and easy-to-understand plain language (grade 6-8 reading level).
2. Clearly divide the response into 3 sections with Markdown headers:
   - ## 📋 Visit Summary & Diagnosis (What we discussed in simple terms)
   - ## 💊 Medication & Care Schedule (Clear daily instructions, dosage, and when to take)
   - ## 🗓️ Next Steps & When to Seek Urgent Care (Follow-up timing, warning signs)
3. Keep it clear, concise, and structured.`;
}
