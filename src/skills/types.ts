export interface Skill {
  name: string;
  description: string;
  prompt: string;
  tools?: string[];
}

export interface SkillModule {
  default: Skill;
}
