// Session management models for the terminal interface

export interface Session {
  id: string;
  createdAt: string;
  expiresAt: string;
  welcomeMessage: string;
  prompt: string;
  theme: ThemeType;
  preferences: SessionPreferences;
  metadata: SessionMetadata;
}

export interface SessionPreferences {
  showTypingAnimation: boolean;
  autoComplete: boolean;
  theme: ThemeType;
  animationSpeed: number;
  soundEnabled: boolean;
  showWelcomeMessage: boolean;
}

export interface SessionMetadata {
  userAgent: string;
  referrer: string;
  screenResolution: string;
  timezone: string;
  language: string;
  firstVisit: boolean;
}

export interface SessionInitRequest {
  userAgent: string;
  referrer: string;
  screenResolution?: string;
  timezone?: string;
  language?: string;
  preferences?: Partial<SessionPreferences>;
}

export interface SessionUpdateRequest {
  preferences?: Partial<SessionPreferences>;
  theme?: ThemeType;
}

export type ThemeType = 'dark' | 'light' | 'matrix' | 'retro';

export interface ThemeConfig {
  name: ThemeType;
  displayName: string;
  colors: {
    background: string;
    text: string;
    accent: string;
    success: string;
    error: string;
    warning: string;
    prompt: string;
  };
  fonts: {
    primary: string;
    secondary?: string;
  };
}

// Default session preferences
export const DEFAULT_SESSION_PREFERENCES: SessionPreferences = {
  showTypingAnimation: true,
  autoComplete: true,
  theme: 'dark',
  animationSpeed: 50,
  soundEnabled: false,
  showWelcomeMessage: true
};

// Available themes
export const AVAILABLE_THEMES: Record<ThemeType, ThemeConfig> = {
  dark: {
    name: 'dark',
    displayName: 'Dark Terminal',
    colors: {
      background: '#0d1117',
      text: '#c9d1d9',
      accent: '#58a6ff',
      success: '#56d364',
      error: '#f85149',
      warning: '#d29922',
      prompt: '#79c0ff'
    },
    fonts: {
      primary: "'Monaco', 'Menlo', 'Ubuntu Mono', monospace"
    }
  },
  light: {
    name: 'light',
    displayName: 'Light Terminal',
    colors: {
      background: '#f6f8fa',
      text: '#24292f',
      accent: '#0969da',
      success: '#1a7f37',
      error: '#cf222e',
      warning: '#9a6700',
      prompt: '#0550ae'
    },
    fonts: {
      primary: "'Monaco', 'Menlo', 'Ubuntu Mono', monospace"
    }
  },
  matrix: {
    name: 'matrix',
    displayName: 'Matrix Green',
    colors: {
      background: '#000000',
      text: '#00ff00',
      accent: '#00aa00',
      success: '#00ff00',
      error: '#ff0000',
      warning: '#ffff00',
      prompt: '#00cc00'
    },
    fonts: {
      primary: "'Courier New', monospace"
    }
  },
  retro: {
    name: 'retro',
    displayName: 'Retro Amber',
    colors: {
      background: '#1e1e1e',
      text: '#ffb000',
      accent: '#ff8c00',
      success: '#90ee90',
      error: '#ff6b6b',
      warning: '#ffd700',
      prompt: '#ff8c00'
    },
    fonts: {
      primary: "'Courier New', monospace"
    }
  }
};