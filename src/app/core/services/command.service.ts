import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { catchError, delay, finalize, map, timeout } from 'rxjs/operators';
import { 
  CommandInput, 
  CommandOutput, 
  CommandError, 
  CommandDefinition,
  CommandExecutionState,
  AVAILABLE_COMMANDS,
  PortfolioCommand 
} from '../models/command.models';
import { SessionService } from './session.service';

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

  constructor(
    private http: HttpClient,
    private sessionService: SessionService
  ) {}

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

    // For now, use offline mode with mock responses
    return this.executeOfflineCommand(trimmedCommand)
      .pipe(
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
    // Return fallback commands directly since we're not using an API
    return of(this.getFallbackCommands());
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
      throw new Error('Command execution failed');
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

  /**
   * Execute command reading from JSON assets
   */
  private executeOfflineCommand(command: string): Observable<CommandOutput> {
    const [cmd, ...args] = command.split(' ');
    
    return this.generateResponseFromAssets(cmd, args).pipe(
      delay(200), // Small delay to simulate processing
      map(output => ({
        success: true,
        data: {
          output,
          executionTime: Math.random() * 100 + 50,
          nextSuggestions: this.getNextSuggestions(cmd)
        },
        metadata: {
          commandId: `cmd_${Date.now()}`,
          timestamp: new Date().toISOString(),
          version: '1.0.0'
        }
      } as CommandOutput)),
      catchError(error => {
        return throwError(() => this.createCommandError('EXECUTION_ERROR', error.message || 'Command execution failed'));
      })
    );
  }

  /**
   * Generate responses from JSON assets
   */
  private generateResponseFromAssets(command: string, args: string[]): Observable<any> {
    switch (command) {
      case 'help':
        return of({
          content: this.generateHelpContent(),
          type: 'text',
          formatting: { color: 'cyan' }
        });

      case 'summary':
        return this.http.get('/assets/summary.json').pipe(
          map((data: any) => ({
            content: `${data.name} - Full Stack Developer

${data.summary}

Location: ${data.location}
Website: ${data.website}${data.email ? `\nEmail: ${data.email}` : ''}

Type 'skills', 'experience', 'education', or 'highlights' for more details.`,
            type: 'text',
            formatting: { color: 'green' }
          }))
        );

      case 'aboutme':
        return this.http.get('/assets/aboutme.json').pipe(
          map((data: any) => ({
            content: `About ${data.name}

${data.about}

Location: ${data.location}
Website: ${data.website}${data.email ? `\nEmail: ${data.email}` : ''}`,
            type: 'text',
            formatting: { color: 'cyan' }
          }))
        );

      case 'skills':
        const category = args[0];
        return this.http.get('/assets/skills.json').pipe(
          map((data: any) => {
            if (category && data[category]) {
              return {
                content: data[category],
                type: 'list',
                formatting: { color: 'blue' }
              };
            }
            
            // Show all skills organized by category
            const allSkills = Object.entries(data)
              .map(([cat, skills]: [string, any]) => 
                `${cat.toUpperCase()}:\n${skills.map((skill: string) => `• ${skill}`).join('\n')}`
              )
              .join('\n\n');
            
            return {
              content: `Technical Skills:\n\n${allSkills}\n\nUse 'skills [category]' to view specific categories.`,
              type: 'text',
              formatting: { color: 'blue' }
            };
          })
        );

      case 'experience':
        return this.http.get<any[]>('/assets/experience.json').pipe(
          map((data) => {
            const experienceText = data
              .map(exp => 
                `${exp.title} | ${exp.company}\n${exp.location} | ${exp.period}\n\n${exp.summary}`
              )
              .join('\n\n' + '─'.repeat(60) + '\n\n');
            
            return {
              content: `Work Experience:\n\n${experienceText}`,
              type: 'text',
              formatting: { color: 'blue' }
            };
          })
        );

      case 'education':
        return this.http.get<any[]>('/assets/education.json').pipe(
          map((data) => {
            const educationText = data
              .map(edu => `${edu.degree}\n${edu.school}, ${edu.location} (${edu.year})`)
              .join('\n\n');
            
            return {
              content: `Education:\n\n${educationText}`,
              type: 'text',
              formatting: { color: 'purple' }
            };
          })
        );

      case 'highlights':
        return this.http.get<string[]>('/assets/highlights.json').pipe(
          map((data) => ({
            content: data,
            type: 'list',
            formatting: { color: 'yellow' }
          }))
        );

      case 'tryme':
        return this.http.get('/assets/tryme.json').pipe(
          map((data: any) => {
            const contentText = data.content.join('\n\n');
            
            return {
              content: `${data.title}

${contentText}

${data.contact.label}
${data.contact.email}`,
              type: 'text',
              formatting: { color: 'green' }
            };
          })
        );

      case 'download':
        return this.executeDownloadCommand();

      case 'theme':
        return this.executeThemeCommand(args);

      default:
        return of({
          content: `Command '${command}' is recognized but not yet implemented.\n\nAvailable commands: help, summary, aboutme, skills, experience, education, highlights, tryme, download, theme`,
          type: 'text',
          formatting: { color: 'orange' }
        });
    }
  }

  /**
   * Generate help content
   */
  private generateHelpContent(): string {
    const commands = this.getFallbackCommands();
    const categories = [...new Set(commands.map(cmd => cmd.category))];
    
    let helpText = `Joseph Lee's Interactive Portfolio Terminal\n\nAvailable Commands:\n\n`;
    
    categories.forEach(category => {
      const categoryCommands = commands.filter(cmd => cmd.category === category);
      const categoryTitle = category.charAt(0).toUpperCase() + category.slice(1);
      
      helpText += `${categoryTitle}:\n`;
      categoryCommands.forEach(cmd => {
        helpText += `  ${cmd.usage.padEnd(20)} ${cmd.description}\n`;
      });
      helpText += '\n';
    });
    
    helpText += `Type any command to explore my background and experience.\nUse 'clear' to clear the terminal or 'theme [name]' to change themes.`;
    
    return helpText;
  }


  /**
   * Execute theme command to change terminal theme
   */
  private executeThemeCommand(args: string[]): Observable<any> {
    if (args.length === 0) {
      // Show available themes
      const themes = this.sessionService.availableThemes;
      const themeList = themes.map(t => `• ${t.name} - ${t.displayName}`).join('\n');
      
      return of({
        content: `Available themes:\n\n${themeList}\n\nUsage: theme <name>`,
        type: 'text',
        formatting: { color: 'blue' }
      });
    }

    const themeName = args[0].toLowerCase();
    
    // Validate theme name
    if (themeName !== 'dark' && themeName !== 'light') {
      return of({
        content: `❌ Invalid theme: '${themeName}'\n\nAvailable themes: dark, light\n\nUsage: theme <name>`,
        type: 'text',
        formatting: { color: 'red' }
      });
    }

    // Change the theme
    return this.sessionService.changeTheme(themeName as any).pipe(
      map((theme) => ({
        content: `✅ Theme changed to: ${theme}\n\nThe ${theme} theme has been applied to the terminal.`,
        type: 'text',
        formatting: { 
          color: 'green',
          animation: { typewriter: true, speed: 30 }
        }
      })),
      catchError((error) => {
        return of({
          content: `❌ Failed to change theme: ${error.message || 'Unknown error'}\n\nAvailable themes: dark, light`,
          type: 'text',
          formatting: { color: 'red' }
        });
      })
    );
  }

  /**
   * Execute download command to download resume PDF
   */
  private executeDownloadCommand(): Observable<any> {
    try {
      // Create download link for the PDF from assets
      const link = document.createElement('a');
      link.href = 'assets/Joseph_Lee_Resume_B.pdf';
      link.download = 'Joseph_Lee_Resume_B.pdf';
      link.style.display = 'none';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      return of({
        content: '📄 Resume downloaded successfully!\n\nFile: Joseph_Lee_Resume_B.pdf\nLocation: Downloads folder\n\nThe resume contains my complete professional background, skills, and experience.',
        type: 'interactive',
        formatting: { 
          color: 'green',
          animation: { typewriter: true, speed: 30 }
        },
        actions: [
          {
            id: 'download-resume',
            label: 'Download Resume',
            type: 'download' as const
          }
        ]
      });
    } catch (error) {
      return of({
        content: '❌ Download failed. Please try again or contact support.\n\nError: Unable to generate resume file.',
        type: 'text',
        formatting: { color: 'red' }
      });
    }
  }


  /**
   * Get next command suggestions based on the current command
   */
  private getNextSuggestions(command: string): string[] {
    switch (command) {
      case 'help':
        return ['summary', 'aboutme', 'skills', 'experience'];
      case 'summary':
        return ['aboutme', 'skills', 'experience', 'tryme'];
      case 'aboutme':
        return ['summary', 'skills', 'experience', 'tryme'];
      case 'skills':
        return ['experience', 'education', 'highlights', 'tryme'];
      case 'experience':
        return ['education', 'skills', 'highlights', 'tryme'];
      case 'education':
        return ['skills', 'experience', 'highlights', 'tryme'];
      case 'highlights':
        return ['summary', 'aboutme', 'tryme', 'download'];
      case 'tryme':
        return ['download', 'summary', 'skills', 'experience'];
      case 'download':
        return ['summary', 'aboutme', 'skills', 'theme'];
      case 'theme':
        return ['help', 'summary', 'aboutme', 'skills'];
      default:
        return ['help', 'summary', 'aboutme', 'skills'];
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
        name: 'aboutme',
        description: 'Personal story and background information',
        usage: 'aboutme',
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
        name: 'tryme',
        description: 'Why you should work with Joseph',
        usage: 'tryme',
        category: 'action'
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
        description: 'Change terminal theme or show available themes',
        usage: 'theme [name]',
        category: 'action',
        args: [
          { name: 'name', description: 'Theme name (dark or light)', required: false, type: 'string', options: ['dark', 'light'] }
        ],
        examples: ['theme', 'theme dark', 'theme light']
      }
    ];
  }
}