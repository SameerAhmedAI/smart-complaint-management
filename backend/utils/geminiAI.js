const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Analyzes a complaint using Gemini AI and returns structured metadata.
 * Falls back to safe defaults if the AI call fails.
 *
 * @param {string} title - Complaint title
 * @param {string} description - Complaint description
 * @returns {Promise<{category, priority, suggestedDepartment, sentiment, summary}>}
 */
const analyzeComplaint = async (title, description) => {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `
You are an AI assistant for a university smart complaint management system.
Analyze the following complaint and return a structured JSON response.

Complaint Title: ${title}
Complaint Description: ${description}

Instructions:
- Determine the most appropriate category from: Infrastructure, Academic, Administrative, Financial, IT Support, Security, Facilities, Other
- Assess the priority level: low, medium, high, or critical
- Suggest which university department should handle this
- Detect the sentiment: positive, neutral, negative, very negative
- Write a brief 1-2 sentence summary

Respond ONLY with a raw JSON object — no markdown, no code fences, no extra text:
{
  "category": "...",
  "priority": "...",
  "suggestedDepartment": "...",
  "sentiment": "...",
  "summary": "..."
}
`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    // Strip any accidental markdown code block wrappers
    const cleaned = text
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim();

    const parsed = JSON.parse(cleaned);

    const validCategories = [
      'Infrastructure', 'Academic', 'Administrative', 'Financial',
      'IT Support', 'Security', 'Facilities', 'Other',
    ];
    const validPriorities = ['low', 'medium', 'high', 'critical'];

    return {
      category: validCategories.includes(parsed.category) ? parsed.category : 'Other',
      priority: validPriorities.includes(parsed.priority) ? parsed.priority : 'medium',
      suggestedDepartment: parsed.suggestedDepartment || 'General Administration',
      sentiment: parsed.sentiment || 'neutral',
      summary: parsed.summary || 'No summary generated.',
    };
  } catch (error) {
    console.error('⚠️  Gemini AI analysis failed:', error.message);
    return {
      category: 'Other',
      priority: 'medium',
      suggestedDepartment: 'General Administration',
      sentiment: 'neutral',
      summary: 'AI analysis unavailable at this time.',
    };
  }
};

module.exports = { analyzeComplaint };
