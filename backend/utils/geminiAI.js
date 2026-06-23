// Helper to check if text contains a keyword as a whole word/phrase (including plural/singular)
const hasWholeWord = (text, keyword) => {
  const escapedKeyword = keyword.toLowerCase().replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
  // Allow optional plural suffix (s or es) at word boundaries
  const regex = new RegExp(`\\b${escapedKeyword}(?:es|s)?\\b`, 'i');
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
      keywords: ['room', 'building', 'facility', 'lab', 'maintenance', 'washroom', 'bathroom', 'toilet', 'clean', 'cleaning', 'hygiene', 'furniture', 'chair', 'desk', 'ac', 'air conditioning', 'electricity', 'plumbing', 'water', 'leak', 'projector', 'equipment', 'broken', 'damaged', 'repair', 'fix', 'classroom', 'ceiling', 'light', 'fan', 'heater', 'cooler'],
      category: 'Facilities',
      department: 'Facilities Management',
    },
    {
      keywords: ['class', 'exam', 'grade', 'course', 'academic', 'lecture', 'assignment', 'result', 'semester', 'transcript', 'syllabus', 'teacher', 'professor', 'homework', 'marks', 'gpa', 'attendance sheet', 'timetable', 'schedule'],
      category: 'Academic',
      department: 'Academic Affairs',
    },
  ];

  let bestRule = null;
  let maxMatches = 0;

  for (const rule of rules) {
    let matchCount = 0;
    for (const kw of rule.keywords) {
      if (hasWholeWord(text, kw)) {
        matchCount++;
      }
    }
    if (matchCount > maxMatches) {
      maxMatches = matchCount;
      bestRule = rule;
    }
  }

  if (bestRule && maxMatches > 0) {
    const urgentWords = ['urgent', 'critical', 'immediately', 'emergency', 'asap', 'severe', 'danger'];
    const priority = urgentWords.some((w) => hasWholeWord(text, w)) ? 'High' : 'Medium';
    return {
      category: bestRule.category,
      priority,
      suggestedDepartment: bestRule.department,
      sentiment: 'neutral',
      summary: `[Auto-classified] ${bestRule.category} complaint — AI unavailable. Keyword-based classification applied (${maxMatches} keyword matches).`,
    };
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
