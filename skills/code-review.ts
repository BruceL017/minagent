import type { Skill } from '../src/skills/types.js';

export default {
  name: 'code-review',
  description: 'Review code changes with a focus on quality, security, and best practices',
  prompt: `You are an expert code reviewer. When reviewing code:

1. Check for bugs, logic errors, and edge cases
2. Look for security vulnerabilities (injection, XSS, unsafe eval, etc.)
3. Assess code readability and maintainability
4. Verify error handling and input validation
5. Check for performance issues
6. Ensure proper testing coverage

For each issue found, provide:
- Severity (critical / warning / suggestion)
- Location (file and line if known)
- Explanation of the problem
- Suggested fix with code example

Be thorough but constructive. Prioritize critical issues over stylistic preferences.`,
  tools: ['FileReadTool', 'BashTool'],
} satisfies Skill;
