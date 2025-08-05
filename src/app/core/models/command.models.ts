// Core command models for the interactive terminal portfolio

export interface CommandInput {
  command: string;
  args?: string[];
  sessionId: string;
  timestamp: string;
  context?: Record<string, any>;
}

export interface CommandOutput {
  success: boolean;
  data: {
    output: OutputContent;
    executionTime: number;
    nextSuggestions?: string[];
    requiresContinuation?: boolean;
  };
  metadata: {
    commandId: string;
    timestamp: string;
    version: string;
  };
}

export interface CommandError {
  success: false;
  error: {
    code: string;
    message: string;
    suggestion?: string;
    availableCommands?: string[];
  };
}

export interface OutputContent {
  content: string | object | any[];
  type: 'text' | 'list' | 'table' | 'json' | 'interactive';
  formatting?: OutputFormatting;
  pagination?: PaginationInfo;
  actions?: AvailableAction[];
}

export interface OutputFormatting {
  color?: 'green' | 'blue' | 'yellow' | 'red' | 'white' | 'cyan';
  style?: 'normal' | 'bold' | 'italic';
  animation?: {
    typewriter?: boolean;
    speed?: number;
  };
}

export interface PaginationInfo {
  current: number;
  total: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface AvailableAction {
  id: string;
  label: string;
  command?: string;
  type: 'button' | 'link' | 'download';
}

export interface CommandDefinition {
  name: string;
  description: string;
  usage: string;
  category: 'navigation' | 'profile' | 'technical' | 'action';
  args?: ArgumentDefinition[];
  examples?: string[];
}

export interface ArgumentDefinition {
  name: string;
  description: string;
  required: boolean;
  type: 'string' | 'number' | 'boolean';
  options?: string[];
}

export interface CommandHistoryItem {
  id: string;
  type: 'command' | 'output' | 'error' | 'system';
  command?: string;
  prompt?: string;
  content?: OutputContent | string;
  formatting?: OutputFormatting;
  suggestion?: string;
  timestamp: Date;
  isTyping?: boolean;
}

export interface CommandResult {
  output: CommandOutput | CommandError;
  historyItem: CommandHistoryItem;
}

// Command execution states
export enum CommandExecutionState {
  IDLE = 'idle',
  PROCESSING = 'processing',
  SUCCESS = 'success',
  ERROR = 'error'
}

// Available portfolio commands
export const AVAILABLE_COMMANDS = [
  'help',
  'summary', 
  'aboutme',
  'skills',
  'experience',
  'education',
  'highlights',
  'tryme',
  'download',
  'clear',
  'theme'
] as const;

export type PortfolioCommand = typeof AVAILABLE_COMMANDS[number];