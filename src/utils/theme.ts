export interface ThemeColors {
  user: string;
  agent: string;
  tool: string;
  error: string;
  warning: string;
  success: string;
  info: string;
  dim: string;
}

export const themes: Record<string, ThemeColors> = {
  default: {
    user: 'blue',
    agent: 'magenta',
    tool: 'cyan',
    error: 'red',
    warning: 'yellow',
    success: 'green',
    info: 'cyan',
    dim: 'gray',
  },
  dark: {
    user: 'blueBright',
    agent: 'magentaBright',
    tool: 'cyanBright',
    error: 'redBright',
    warning: 'yellowBright',
    success: 'greenBright',
    info: 'white',
    dim: 'gray',
  },
  minimal: {
    user: 'white',
    agent: 'white',
    tool: 'white',
    error: 'red',
    warning: 'yellow',
    success: 'green',
    info: 'white',
    dim: 'gray',
  },
  dracula: {
    user: '#8be9fd',
    agent: '#ff79c6',
    tool: '#50fa7b',
    error: '#ff5555',
    warning: '#f1fa8c',
    success: '#50fa7b',
    info: '#bd93f9',
    dim: '#6272a4',
  },
};

export function getTheme(): ThemeColors {
  const name = process.env.MINA_THEME || 'default';
  return (themes as any)[name] as ThemeColors;
}

export function listThemes(): string {
  return 'Available themes:\n' +
    Object.keys(themes).map((t) => `  ${t}${t === (process.env.MINA_THEME || 'default') ? ' (current)' : ''}`).join('\n') +
    '\n\nSet via: export MINA_THEME=<name>';
}
