import type { Skill } from './types.js';

export class SkillRegistry {
  private skills = new Map<string, Skill>();

  register(skill: Skill): void {
    this.skills.set(skill.name, skill);
  }

  get(name: string): Skill | undefined {
    return this.skills.get(name);
  }

  list(): Skill[] {
    return Array.from(this.skills.values());
  }

  has(name: string): boolean {
    return this.skills.has(name);
  }

  getSystemPrompt(skillName: string): string | null {
    const skill = this.skills.get(skillName);
    return skill?.prompt || null;
  }
}
