import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, finalize, map, timeout } from 'rxjs/operators';
import { 
  CommandInput, 
  CommandOutput, 
  CommandError, 
  CommandDefinition,
  CommandExecutionState,
  AVAILABLE_COMMANDS,
  PortfolioCommand 
} from '../models/command.models';

@Injectable({
  providedIn: 'root'
})
export class CommandService {
  private readonly apiUrl = '/api/v1';
  private readonly requestTimeout = 10000; // 10 seconds

  // State management
  private executionStateSubject = new BehaviorSubject<CommandExecutionState>(CommandExecutionState.IDLE);
  private currentCommandSubject = new BehaviorSubject<string | null>(null);
  private commandHistorySubject = new BehaviorSubject<string[]>([]);

  // Public observables
  readonly executionState$ = this.executionStateSubject.asObservable();
  readonly currentCommand$ = this.currentCommandSubject.asObservable();
  readonly commandHistory$ = this.commandHistorySubject.asObservable();

  // Computed properties
  get isProcessing(): boolean {
    return this.executionStateSubject.value === CommandExecutionState.PROCESSING;
  }

  get availableCommands(): readonly PortfolioCommand[] {
    return AVAILABLE_COMMANDS;
  }

  constructor(private http: HttpClient) {}

  /**
   * Execute a portfolio command
   */
  executeCommand(command: string, sessionId: string): Observable<CommandOutput> {
    if (this.isProcessing) {
      return throwError(() => new Error('Another command is currently processing'));
    }

    const trimmedCommand = command.trim().toLowerCase();
    
    // Validate command
    if (!this.isValidCommand(trimmedCommand)) {
      return throwError(() => this.createCommandError('INVALID_COMMAND', `Command '${command}' not recognized`));
    }

    this.setExecutionState(CommandExecutionState.PROCESSING);
    this.currentCommandSubject.next(trimmedCommand);

    const payload: CommandInput = {
      command: trimmedCommand,
      sessionId,
      timestamp: new Date().toISOString()
    };

    return this.http.post<CommandOutput>(`${this.apiUrl}/commands/execute`, payload)
      .pipe(
        timeout(this.requestTimeout),
        map(response => this.processCommandResponse(response)),
        catchError(error => this.handleCommandError(error)),
        finalize(() => {
          this.setExecutionState(CommandExecutionState.IDLE);
          this.currentCommandSubject.next(null);
          this.addToHistory(trimmedCommand);
        })
      );
  }

  /**
   * Get available commands with descriptions
   */
  getAvailableCommands(): Observable<CommandDefinition[]> {
    return this.http.get<{data: CommandDefinition[]}>(`${this.apiUrl}/commands`)
      .pipe(
        map(response => response.data),
        catchError(error => {
          console.warn('Failed to fetch commands from API, using fallback', error);
          return [this.getFallbackCommands()];
        })
      );
  }

  /**
   * Validate if a command is supported
   */
  isValidCommand(command: string): boolean {
    const baseCommand = command.split(' ')[0].toLowerCase();
    return AVAILABLE_COMMANDS.includes(baseCommand as PortfolioCommand);
  }

  /**
   * Get command suggestions based on partial input
   */
  getCommandSuggestions(partial: string): PortfolioCommand[] {
    if (!partial) return [...AVAILABLE_COMMANDS];
    
    const lowerPartial = partial.toLowerCase();
    return AVAILABLE_COMMANDS.filter(cmd => 
      cmd.toLowerCase().startsWith(lowerPartial)
    );
  }

  /**
   * Clear command history
   */
  clearHistory(): void {
    this.commandHistorySubject.next([]);
  }

  /**
   * Get command history
   */
  getHistory(): string[] {
    return this.commandHistorySubject.value;
  }

  // Private methods

  private setExecutionState(state: CommandExecutionState): void {
    this.executionStateSubject.next(state);
  }

  private processCommandResponse(response: CommandOutput): CommandOutput {
    if (!response.success) {
      throw new Error(response.error?.message || 'Command execution failed');
    }
    return response;
  }

  private handleCommandError(error: any): Observable<never> {
    let commandError: CommandError;

    if (error instanceof HttpErrorResponse) {
      switch (error.status) {
        case 400:
          commandError = this.createCommandError('INVALID_INPUT', 'Invalid command format');
          break;
        case 404:
          commandError = this.createCommandError('COMMAND_NOT_FOUND', 'Command not found');
          break;
        case 429:
          commandError = this.createCommandError('RATE_LIMIT', 'Too many requests. Please wait a moment.');
          break;
        case 500:
          commandError = this.createCommandError('SERVER_ERROR', 'Internal server error');
          break;
        default:
          commandError = this.createCommandError('NETWORK_ERROR', 'Network error occurred');
      }
    } else if (error.name === 'TimeoutError') {
      commandError = this.createCommandError('TIMEOUT', 'Command timed out. Please try again.');
    } else {
      commandError = this.createCommandError('UNKNOWN_ERROR', error.message || 'An unknown error occurred');
    }

    this.setExecutionState(CommandExecutionState.ERROR);
    return throwError(() => commandError);
  }

  private createCommandError(code: string, message: string, suggestion?: string): CommandError {
    return {
      success: false,
      error: {
        code,
        message,
        suggestion: suggestion || this.getErrorSuggestion(code),
        availableCommands: [...AVAILABLE_COMMANDS]
      }
    };
  }

  private getErrorSuggestion(errorCode: string): string {
    switch (errorCode) {
      case 'INVALID_COMMAND':
        return "Type 'help' to see available commands";
      case 'COMMAND_NOT_FOUND':
        return "Check spelling or type 'help' for available commands";
      case 'RATE_LIMIT':
        return "Please wait a few seconds before trying again";
      case 'TIMEOUT':
        return "Check your internet connection and try again";
      default:
        return "Type 'help' for assistance";
    }
  }

  private addToHistory(command: string): void {
    const currentHistory = this.commandHistorySubject.value;
    const lastCommand = currentHistory[currentHistory.length - 1];
    
    // Don't add duplicate consecutive commands
    if (lastCommand !== command) {
      const newHistory = [...currentHistory, command];
      // Keep only last 50 commands
      if (newHistory.length > 50) {
        newHistory.shift();
      }
      this.commandHistorySubject.next(newHistory);
    }
  }

  private getFallbackCommands(): CommandDefinition[] {
    return [
      {
        name: 'help',
        description: 'Shows available commands and descriptions',
        usage: 'help',
        category: 'navigation'
      },
      {
        name: 'summary',
        description: 'Overview of Joseph Lee\'s profile and career',
        usage: 'summary',
        category: 'profile'
      },
      {
        name: 'skills',
        description: 'Technical skills and competencies',
        usage: 'skills [category]',
        category: 'technical',
        args: [
          { name: 'category', description: 'Skill category to display', required: false, type: 'string', options: ['frontend', 'backend', 'tools'] }
        ]
      },
      {
        name: 'experience',
        description: 'Work experience and employment history',
        usage: 'experience',
        category: 'profile'
      },
      {
        name: 'education',
        description: 'Educational background and qualifications',
        usage: 'education',
        category: 'profile'
      },
      {
        name: 'highlights',
        description: 'Key achievements and notable projects',
        usage: 'highlights',
        category: 'profile'
      },
      {
        name: 'download',
        description: 'Download resume as PDF',
        usage: 'download',
        category: 'action'
      },
      {
        name: 'clear',
        description: 'Clear the terminal screen',
        usage: 'clear',
        category: 'navigation'
      },
      {
        name: 'theme',
        description: 'Change terminal theme',
        usage: 'theme [name]',
        category: 'action',
        args: [
          { name: 'name', description: 'Theme name', required: false, type: 'string', options: ['dark', 'light', 'matrix', 'retro'] }
        ]
      }
    ];
  }
}