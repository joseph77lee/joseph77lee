import { Component, OnInit, OnDestroy, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { Subject, takeUntil, combineLatest } from 'rxjs';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';

import { CommandService } from '../../../../core/services/command.service';
import { SessionService } from '../../../../core/services/session.service';
import { PortfolioService } from '../../../../core/services/portfolio.service';
import { CommandHistoryItem, CommandOutput, CommandError } from '../../../../core/models/command.models';
import { ThemeConfig } from '../../../../core/models/session.models';

@Component({
  selector: 'app-terminal-container',
  templateUrl: './terminal-container.component.html',
  styleUrls: ['./terminal-container.component.scss'],
  host: {
    'class': 'terminal-container',
    '[class.mobile]': 'isMobile',
    '[class.tablet]': 'isTablet',
    '[class.processing]': 'isProcessing',
    '[attr.aria-label]': '"Interactive Portfolio Terminal"',
    'role': 'application'
  }
})
export class TerminalContainerComponent implements OnInit, OnDestroy {
  @ViewChild('terminalBody', { static: true }) terminalBody!: ElementRef<HTMLDivElement>;
  @ViewChild('commandInput', { static: false }) commandInputComponent: any;

  // Terminal state
  commandHistory: CommandHistoryItem[] = [];
  isProcessing = false;
  currentPrompt = 'joseph@portfolio:~$ ';
  welcomeMessage = '';
  screenReaderAnnouncement = '';

  // Responsive state
  isMobile = false;
  isTablet = false;

  // Theme and session state
  currentTheme: ThemeConfig | null = null;
  sessionId: string | null = null;

  // Status bar state
  currentSuggestions: string[] = [];
  isInputFocused = false;

  get currentThemeName(): string {
    return this.currentTheme?.name || 'dark';
  }

  private destroy$ = new Subject<void>();
  private commandIdCounter = 0;

  constructor(
    private commandService: CommandService,
    private sessionService: SessionService,
    private portfolioService: PortfolioService,
    private breakpointObserver: BreakpointObserver,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.initializeResponsiveDetection();
    this.initializeTerminal();
    this.subscribeToServices();
    this.addWelcomeMessage();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Initialize responsive breakpoint detection
   */
  private initializeResponsiveDetection(): void {
    this.breakpointObserver.observe([
      Breakpoints.Handset,
      Breakpoints.Tablet
    ]).pipe(takeUntil(this.destroy$))
      .subscribe(result => {
        this.isMobile = this.breakpointObserver.isMatched(Breakpoints.Handset);
        this.isTablet = this.breakpointObserver.isMatched(Breakpoints.Tablet) && !this.isMobile;
        this.cdr.detectChanges();
      });
  }

  /**
   * Initialize terminal session and theme
   */
  private initializeTerminal(): void {
    combineLatest([
      this.sessionService.session$,
      this.sessionService.currentThemeConfig$
    ]).pipe(takeUntil(this.destroy$))
      .subscribe(([session, themeConfig]) => {
        if (session) {
          this.sessionId = session.id;
          this.welcomeMessage = session.welcomeMessage;
          this.currentPrompt = session.prompt;
        }
        
        if (themeConfig) {
          this.currentTheme = themeConfig;
          this.applyThemeStyles(themeConfig);
        }
        
        this.cdr.detectChanges();
      });
  }

  /**
   * Subscribe to service state changes
   */
  private subscribeToServices(): void {
    // Command processing state
    this.commandService.executionState$
      .pipe(takeUntil(this.destroy$))
      .subscribe(state => {
        this.isProcessing = state === 'processing';
        this.cdr.detectChanges();
      });
  }

  /**
   * Add welcome message to terminal
   */
  private addWelcomeMessage(): void {
    if (this.welcomeMessage) {
      const welcomeItem: CommandHistoryItem = {
        id: this.generateCommandId(),
        type: 'system',
        content: {
          content: this.welcomeMessage,
          type: 'text',
          formatting: {
            color: 'cyan',
            animation: { typewriter: true, speed: 30 }
          }
        },
        timestamp: new Date(),
        isTyping: true
      };

      this.commandHistory.push(welcomeItem);
      this.announceToScreenReader(this.welcomeMessage);
    }
  }

  /**
   * Execute a terminal command
   */
  executeCommand(command: string): void {
    if (!command.trim()) return;

    const trimmedCommand = command.trim();

    // Handle built-in commands first
    if (this.handleBuiltInCommand(trimmedCommand)) {
      return;
    }

    // Add command to history display
    this.addCommandToHistory(trimmedCommand);

    // Execute command through service
    if (this.sessionId) {
      this.commandService.executeCommand(trimmedCommand, this.sessionId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (output) => this.handleCommandOutput(output),
          error: (error) => this.handleCommandError(error)
        });
    } else {
      this.handleCommandError({
        success: false,
        error: {
          code: 'NO_SESSION',
          message: 'No active session. Please refresh the page.',
          suggestion: 'Refresh the page to start a new session.'
        }
      });
    }

  }

  /**
   * Handle built-in terminal commands
   */
  private handleBuiltInCommand(command: string): boolean {
    const [cmd] = command.toLowerCase().split(' ');

    switch (cmd) {
      case 'clear':
        this.clearTerminal();
        return true;
      
      default:
        return false;
    }
  }

  /**
   * Clear terminal history
   */
  private clearTerminal(): void {
    this.commandHistory = [];
    this.addWelcomeMessage();
    this.announceToScreenReader('Terminal cleared');
    
    // Scroll to bottom and refocus input after clearing
    setTimeout(() => {
      this.scrollToBottom();
      this.focusCommandInput();
    }, 100);
  }


  /**
   * Add command echo to history
   */
  private addCommandToHistory(command: string): void {
    const commandItem: CommandHistoryItem = {
      id: this.generateCommandId(),
      type: 'command',
      command,
      prompt: this.currentPrompt,
      timestamp: new Date()
    };

    this.commandHistory.push(commandItem);
    this.announceToScreenReader(`Command entered: ${command}`);
  }

  /**
   * Handle successful command output
   */
  private handleCommandOutput(output: CommandOutput): void {
    const outputItem: CommandHistoryItem = {
      id: this.generateCommandId(),
      type: 'output',
      content: output.data.output,
      timestamp: new Date(),
      isTyping: output.data.output.formatting?.animation?.typewriter || false
    };

    this.commandHistory.push(outputItem);
    
    // Announce output to screen reader
    const contentText = this.extractTextFromOutput(output.data.output);
    this.announceToScreenReader(contentText);

    // Scroll to bottom and refocus input after content is rendered
    // Use longer timeout to account for DOM updates and typewriter animation
    setTimeout(() => {
      this.scrollToBottom();
      this.focusCommandInput();
    }, 300);
  }

  /**
   * Handle command errors
   */
  private handleCommandError(error: CommandError): void {
    const errorItem: CommandHistoryItem = {
      id: this.generateCommandId(),
      type: 'error',
      content: {
        content: error.error.message,
        type: 'text',
        formatting: { color: 'red' }
      },
      suggestion: error.error.suggestion,
      timestamp: new Date()
    };

    this.commandHistory.push(errorItem);
    this.announceToScreenReader(`Error: ${error.error.message}`);

    // Scroll to bottom and refocus input after error is rendered
    setTimeout(() => {
      this.scrollToBottom();
      this.focusCommandInput();
    }, 100);
  }

  /**
   * Add system messages
   */
  private addSystemMessage(message: string, type: 'info' | 'success' | 'error' | 'warning'): void {
    const colorMap = {
      info: 'blue' as const,
      success: 'green' as const,
      error: 'red' as const,
      warning: 'yellow' as const
    };

    const systemItem: CommandHistoryItem = {
      id: this.generateCommandId(),
      type: 'system',
      content: {
        content: message,
        type: 'text',
        formatting: { color: colorMap[type] }
      },
      timestamp: new Date()
    };

    this.commandHistory.push(systemItem);
  }

  /**
   * Apply theme styles to component
   */
  private applyThemeStyles(themeConfig: ThemeConfig): void {
    if (!this.terminalBody?.nativeElement) return;

    const element = this.terminalBody.nativeElement;
    const colors = themeConfig.colors;

    // Apply theme colors as CSS custom properties
    element.style.setProperty('--terminal-bg', colors.background);
    element.style.setProperty('--terminal-text', colors.text);
    element.style.setProperty('--terminal-accent', colors.accent);
    element.style.setProperty('--terminal-success', colors.success);
    element.style.setProperty('--terminal-error', colors.error);
    element.style.setProperty('--terminal-warning', colors.warning);
    element.style.setProperty('--terminal-prompt', colors.prompt);
    element.style.setProperty('--terminal-font', themeConfig.fonts.primary);
  }

  /**
   * Scroll terminal to bottom
   */
  private scrollToBottom(): void {
    if (this.terminalBody?.nativeElement) {
      const element = this.terminalBody.nativeElement;
      element.scrollTop = element.scrollHeight;
    }
  }

  /**
   * Extract text content from output for screen reader
   */
  private extractTextFromOutput(output: any): string {
    if (typeof output.content === 'string') {
      return output.content;
    } else if (Array.isArray(output.content)) {
      return output.content.join(' ');
    } else if (typeof output.content === 'object') {
      return JSON.stringify(output.content);
    }
    return 'Command output received';
  }

  /**
   * Announce message to screen reader
   */
  private announceToScreenReader(message: string): void {
    this.screenReaderAnnouncement = message;
    // Clear announcement after a delay to avoid repetition
    setTimeout(() => {
      this.screenReaderAnnouncement = '';
      this.cdr.detectChanges();
    }, 1000);
  }

  /**
   * Generate unique command ID
   */
  private generateCommandId(): string {
    this.commandIdCounter++;
    return `cmd-${Date.now()}-${this.commandIdCounter}`;
  }

  /**
   * Track function for command history ngFor
   */
  trackByCommandId(_index: number, item: CommandHistoryItem): string {
    return item.id;
  }

  /**
   * Handle terminal click to focus input
   */
  onTerminalClick(_event: Event): void {
    // Don't focus if user is selecting text
    const selection = window.getSelection();
    if (selection && selection.toString().length > 0) {
      return;
    }

    // Focus the command input
    this.focusCommandInput();
  }

  /**
   * Focus the command input element
   */
  private focusCommandInput(): void {
    if (!this.isProcessing) {
      // Try to focus using the component reference first
      if (this.commandInputComponent && this.commandInputComponent.focusInput) {
        setTimeout(() => {
          this.commandInputComponent.focusInput();
        }, 50);
      } else {
        // Fallback: find the input element directly
        const inputElement = this.terminalBody?.nativeElement?.querySelector('app-command-input input') as HTMLInputElement;
        if (inputElement) {
          setTimeout(() => {
            inputElement.focus();
          }, 50);
        }
      }
    }
  }

  /**
   * Handle keyboard shortcuts
   */
  onKeydown(event: KeyboardEvent): void {
    // Ctrl+L - Clear terminal
    if (event.ctrlKey && event.key === 'l') {
      event.preventDefault();
      this.clearTerminal();
    }
    
    // Ctrl+C - Cancel current command (if processing)
    if (event.ctrlKey && event.key === 'c' && this.isProcessing) {
      event.preventDefault();
      // In a real implementation, this would cancel the current request
      this.addSystemMessage('^C', 'warning');
    }
  }

  /**
   * Handle input focus events for status bar
   */
  onInputFocused(_value: string): void {
    this.isInputFocused = true;
  }

  /**
   * Handle input blur events for status bar
   */
  onInputBlurred(): void {
    this.isInputFocused = false;
    this.currentSuggestions = [];
  }

  /**
   * Handle suggestions changes for status bar
   */
  onSuggestionsChanged(suggestions: string[]): void {
    this.currentSuggestions = suggestions;
  }

  /**
   * Get default content for output renderer
   */
  getDefaultContent() {
    return {
      content: '',
      type: 'text' as const
    };
  }

  /**
   * Extract error message from content
   */
  getErrorMessage(content: any): string {
    if (typeof content === 'string') {
      return content;
    }
    
    if (content && typeof content === 'object') {
      return content.content || content.message || 'Unknown error';
    }
    
    return 'Unknown error';
  }

  /**
   * Check if content is string
   */
  isStringContent(content: any): boolean {
    return typeof content === 'string';
  }

  /**
   * Get output content ensuring it's OutputContent type
   */
  getOutputContent(content: any) {
    if (content && typeof content === 'object' && content.content !== undefined) {
      return content;
    }
    
    return this.getDefaultContent();
  }
}