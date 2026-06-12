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
      keywords: ['room', 'building', 'facility', 'lab', 'maintenance', 'cleaning', 'electricity', 'water', 'parking', 'elevator'],
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
    if (rule.keywords.some((kw) => text.includes(kw))) {
      const urgentWords = ['urgent', 'critical', 'immediately', 'emergency', 'asap', 'severe', 'danger'];
      const priority = urgentWords.some((w) => text.includes(w)) ? 'High' : 'Medium';
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
