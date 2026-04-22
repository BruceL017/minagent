#!/usr/bin/env bun
import React from 'react';
import { render } from 'ink';
import { loadConfig, validateConfig } from './config.js';
import { defaultTools } from './tools/index.js';
import { SkillRegistry } from './skills/registry.js';
import { loadSkillsFromDir } from './skills/loader.js';
import { App } from './components/App.js';
import { applyPersistentConfig } from './utils/configStore.js';

async function main() {
  // Apply persistent config before loading so env vars are set
  applyPersistentConfig();
  const config = loadConfig();

  try {
    validateConfig(config);
  } catch (err: any) {
    console.error(err.message);
    process.exit(1);
  }

  const skills = new SkillRegistry();
  const globalCount = await loadSkillsFromDir(config.globalSkillsDir, skills);
  const localCount = await loadSkillsFromDir(config.localSkillsDir, skills);

  console.log('Starting MinAgent...');
  console.log(`Provider: ${config.llmProvider}, Model: ${config.model}`);
  if (globalCount + localCount > 0) {
    console.log(`Loaded ${globalCount + localCount} skills.`);
  }
  console.log('Type your message, or /help for commands');
  console.log('---');

  render(
    React.createElement(App, {
      config,
      tools: defaultTools,
      skills,
    })
  );
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
