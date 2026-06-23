// Helper to check if text contains a keyword as a whole word/phrase
const hasWholeWord = (text, keyword) => {
  const escapedKeyword = keyword.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
  const regex = new RegExp(`\\b${escapedKeyword}\\b`, 'i');
  return regex.test(text);
};

// ─── Keyword-based fallback classifier ───────────────────────────────────────
const keywordFallback = (title, description) => {
  const text = `${title} ${description}`.toLowerCase();

  const rules = [
    {
      keywords: ['internet', 'network', 'computer', 'system', 'software', 'hardware', 'laptop', 'wifi', 'printer', 'server'],
      category: 'IT',
      department: 'IT Support',
    },
    {
      keywords: ['salary', 'payment', 'invoice', 'budget', 'finance', 'fee', 'refund', 'scholarship', 'stipend'],
      category: 'Finance',
      department: 'Finance Department',
    },
    {
      keywords: ['staff', 'employee', 'leave', 'hr', 'hiring', 'recruitment', 'payroll', 'attendance', 'contract'],
      category: 'HR',
      department: 'Human Resources',
    },
    {
      keywords: ['room', 'building', 'facility', 'lab', 'maintenance', 'washroom', 'bathroom', 'toilet', 'clean', 'cleaning', 'hygiene', 'furniture', 'chair', 'desk', 'ac', 'air conditioning', 'electricity', 'plumbing', 'water', 'leak'],
      category: 'Facilities',
      department: 'Facilities Management',
    },
    {
      keywords: ['class', 'exam', 'grade', 'course', 'academic', 'lecture', 'assignment', 'result', 'semester', 'transcript'],
      category: 'Academic',
      department: 'Academic Affairs',
    },
  ];

  for (const rule of rules) {
    if (rule.keywords.some((kw) => hasWholeWord(text, kw))) {
      const urgentWords = ['urgent', 'critical', 'immediately', 'emergency', 'asap', 'severe', 'danger'];
      const priority = urgentWords.some((w) => hasWholeWord(text, w)) ? 'High' : 'Medium';
      return {
        category: rule.category,
        priority,
        suggestedDepartment: rule.department,
        sentiment: 'neutral',
        summary: `[Auto-classified] ${rule.category} complaint — AI unavailable. Keyword-based classification applied.`,
      };
    }
  }

  return {
    category: 'Other',
    priority: 'Medium',
    suggestedDepartment: 'General Administration',
    sentiment: 'neutral',
    summary: '[Auto-classified] Could not determine category — AI unavailable.',
  };
};

// ─── Keyword-only analysis (Gemini skipped — quota exhausted) ────────────────
async function analyzeComplaint(title, description) {
  console.log('Using keyword-based AI analysis');
  return keywordFallback(title, description);
}

module.exports = { analyzeComplaint };
