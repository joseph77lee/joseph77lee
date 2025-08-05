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

export type ThemeType = 'dark';

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
  }
};