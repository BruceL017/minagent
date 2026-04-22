import { spawnSync } from 'child_process';
import { existsSync } from 'fs';
import type { Command } from './types.js';

interface TestFramework {
  name: string;
  command: string;
  args: string[];
  detectFiles: string[];
}

const TEST_FRAMEWORKS: TestFramework[] = [
  {
    name: 'Bun',
    command: 'bun',
    args: ['test'],
    detectFiles: ['bunfig.toml'],
  },
  {
    name: 'Vitest',
    command: 'npx',
    args: ['vitest', 'run'],
    detectFiles: ['vitest.config.ts', 'vitest.config.js'],
  },
  {
    name: 'Jest',
    command: 'npx',
    args: ['jest'],
    detectFiles: ['jest.config.js', 'jest.config.ts'],
  },
  {
    name: 'Playwright',
    command: 'npx',
    args: ['playwright', 'test'],
    detectFiles: ['playwright.config.ts', 'playwright.config.js'],
  },
  {
    name: 'Cypress',
    command: 'npx',
    args: ['cypress', 'run'],
    detectFiles: ['cypress.config.ts', 'cypress.config.js', 'cypress'],
  },
  {
    name: 'Mocha',
    command: 'npx',
    args: ['mocha'],
    detectFiles: ['.mocharc.js', '.mocharc.json'],
  },
  {
    name: 'Pytest',
    command: 'pytest',
    args: ['-v'],
    detectFiles: ['pytest.ini', 'pyproject.toml', 'setup.py'],
  },
  {
    name: 'Python unittest',
    command: 'python',
    args: ['-m', 'unittest', 'discover', '-v'],
    detectFiles: ['setup.py', 'pyproject.toml'],
  },
  {
    name: 'Cargo',
    command: 'cargo',
    args: ['test'],
    detectFiles: ['Cargo.toml'],
  },
  {
    name: 'Go',
    command: 'go',
    args: ['test', './...'],
    detectFiles: ['go.mod'],
  },
  {
    name: 'Gradle',
    command: './gradlew',
    args: ['test'],
    detectFiles: ['build.gradle', 'gradlew'],
  },
  {
    name: 'Maven',
    command: 'mvn',
    args: ['test'],
    detectFiles: ['pom.xml'],
  },
  {
    name: 'RSpec',
    command: 'bundle',
    args: ['exec', 'rspec'],
    detectFiles: ['.rspec', 'spec'],
  },
];

function detectFramework(cwd: string): TestFramework | null {
  for (const fw of TEST_FRAMEWORKS) {
    for (const file of fw.detectFiles) {
      if (existsSync(`${cwd}/${file}`)) {
        return fw;
      }
    }
  }

  // Fallback: check package.json scripts
  try {
    const pkg = JSON.parse(
      require('fs').readFileSync(`${cwd}/package.json`, 'utf-8')
    );
    if (pkg.scripts?.test) {
      // Try to infer from test script
      const testScript: string = pkg.scripts.test;
      if (testScript.includes('vitest')) return { ...TEST_FRAMEWORKS[1]! };
      if (testScript.includes('jest')) return { ...TEST_FRAMEWORKS[2]! };
      if (testScript.includes('playwright')) return { ...TEST_FRAMEWORKS[3]! };
      if (testScript.includes('cypress')) return { ...TEST_FRAMEWORKS[4]! };
      if (testScript.includes('mocha')) return { ...TEST_FRAMEWORKS[5]! };
      // Generic npm test
      return { name: 'npm', command: 'npm', args: ['test'], detectFiles: [] };
    }
  } catch {
    // No package.json
  }

  return null;
}

export const testCommand: Command = {
  name: 'test',
  description: 'Auto-detect and run project tests',
  execute: async (args, ctx) => {
    const pattern = args.trim();
    const fw = detectFramework(ctx.cwd);

    if (!fw) {
      return 'Could not auto-detect test framework. Supported: Bun, Vitest, Jest, Playwright, Cypress, Mocha, Pytest, Cargo, Go, Gradle, Maven, RSpec.';
    }

    const cmdArgs = [...fw.args];
    if (pattern) {
      // Append pattern if the framework supports it
      if (fw.name === 'Bun') cmdArgs.push(pattern);
      else if (fw.name === 'Vitest') cmdArgs.push(pattern);
      else if (fw.name === 'Jest') cmdArgs.push(pattern);
      else if (fw.name === 'Pytest') cmdArgs.push('-k', pattern);
      else if (fw.name === 'Cargo') cmdArgs.push(pattern);
    }

    const result = spawnSync(fw.command, cmdArgs, {
      cwd: ctx.cwd,
      encoding: 'utf-8',
      timeout: 300_000,
      maxBuffer: 20 * 1024 * 1024,
      env: process.env,
    });

    let output = '';
    if (result.stdout) output += result.stdout;
    if (result.stderr) output += `\n[stderr]: ${result.stderr}`;

    const MAX_LEN = 40000;
    if (output.length > MAX_LEN) {
      output = output.slice(0, MAX_LEN) + `\n... [truncated, ${output.length - MAX_LEN} chars hidden]`;
    }

    const statusLine = result.status === 0
      ? `[Tests passed (${fw.name})]`
      : `[Tests failed — exit code ${result.status} (${fw.name})]`;

    return `${statusLine}\n${output || '(no output)'}`;
  },
};
