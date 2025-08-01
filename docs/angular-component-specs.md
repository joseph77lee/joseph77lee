# Angular Component Implementation Specifications

## 🚀 Project Structure

```
src/app/
├── core/
│   ├── services/
│   │   ├── command.service.ts
│   │   ├── portfolio.service.ts
│   │   ├── session.service.ts
│   │   ├── command-history.service.ts
│   │   └── theme.service.ts
│   ├── models/
│   │   ├── command.models.ts
│   │   ├── portfolio.models.ts
│   │   ├── session.models.ts
│   │   └── output.models.ts
│   └── interceptors/
│       └── api.interceptor.ts
├── features/
│   └── terminal/
│       ├── components/
│       │   ├── terminal-container/
│       │   ├── command-input/
│       │   ├── terminal-output/
│       │   ├── output-renderer/
│       │   ├── typewriter-text/
│       │   ├── command-suggestions/
│       │   └── loading-indicator/
│       ├── services/
│       │   ├── command-parser.service.ts
│       │   ├── output-formatter.service.ts
│       │   └── keyboard-navigation.service.ts
│       └── directives/
│           ├── terminal-focus.directive.ts
│           └── terminal-touch.directive.ts
├── shared/
│   ├── components/
│   │   └── error-display/
│   ├── pipes/
│   │   ├── highlight.pipe.ts
│   │   └── format-date.pipe.ts
│   └── utilities/
│       ├── animation.utils.ts
│       └── accessibility.utils.ts
└── styles/
    ├── base/
    │   ├── _variables.scss
    │   ├── _mixins.scss
    │   └── _typography.scss
    ├── components/
    │   ├── _terminal.scss
    │   ├── _buttons.scss
    │   └── _animations.scss
    └── themes/
        ├── _dark.scss
        └── _light.scss
```

## 🔧 Core Services Implementation

### Command Service
```typescript
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { CommandInput, CommandOutput, CommandError } from '../models/command.models';

@Injectable({
  providedIn: 'root'
})
export class CommandService {
  private readonly apiUrl = '/api/v1';
  private isProcessingSubject = new BehaviorSubject<boolean>(false);
  
  isProcessing$ = this.isProcessingSubject.asObservable();

  constructor(private http: HttpClient) {}

  executeCommand(command: string, sessionId: string): Observable<CommandOutput> {
    this.isProcessingSubject.next(true);
    
    const payload: CommandInput = {
      command,
      sessionId,
      timestamp: new Date().toISOString()
    };

    return this.http.post<CommandOutput>(`${this.apiUrl}/commands/execute`, payload)
      .pipe(
        finalize(() => this.isProcessingSubject.next(false))
      );
  }

  getAvailableCommands(): Observable<CommandDefinition[]> {
    return this.http.get<CommandDefinition[]>(`${this.apiUrl}/commands`);
  }
}
```

### Portfolio Service
```typescript
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, shareReplay } from 'rxjs';
import { Portfolio, ContentSection } from '../models/portfolio.models';

@Injectable({
  providedIn: 'root'
})
export class PortfolioService {
  private readonly apiUrl = '/api/v1/portfolio';
  private portfolioCache$ = this.http.get<Portfolio>(this.apiUrl)
    .pipe(shareReplay(1));

  constructor(private http: HttpClient) {}

  getPortfolio(): Observable<Portfolio> {
    return this.portfolioCache$;
  }

  getSection(section: string): Observable<ContentSection> {
    return this.http.get<ContentSection>(`${this.apiUrl}/${section}`);
  }

  downloadResume(): Observable<Blob> {
    return this.http.post(`${this.apiUrl}/download/resume`, {}, {
      responseType: 'blob'
    });
  }
}
```

### Session Service
```typescript
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { Session, SessionPreferences } from '../models/session.models';

@Injectable({
  providedIn: 'root'
})
export class SessionService {
  private readonly apiUrl = '/api/v1/sessions';
  private sessionSubject = new BehaviorSubject<Session | null>(null);
  
  session$ = this.sessionSubject.asObservable();

  constructor(private http: HttpClient) {
    this.initializeSession();
  }

  private initializeSession(): void {
    const existingSessionId = localStorage.getItem('portfolio-session-id');
    
    if (existingSessionId) {
      this.getSession(existingSessionId).subscribe({
        next: (session) => this.sessionSubject.next(session),
        error: () => this.createNewSession()
      });
    } else {
      this.createNewSession();
    }
  }

  private createNewSession(): void {
    this.http.post<Session>(`${this.apiUrl}/init`, {
      userAgent: navigator.userAgent,
      referrer: document.referrer
    }).subscribe(session => {
      localStorage.setItem('portfolio-session-id', session.id);
      this.sessionSubject.next(session);
    });
  }

  getSessionId(): string | null {
    return this.sessionSubject.value?.id || null;
  }

  updatePreferences(preferences: Partial<SessionPreferences>): Observable<Session> {
    const sessionId = this.getSessionId();
    return this.http.patch<Session>(`${this.apiUrl}/${sessionId}`, { preferences });
  }

  private getSession(sessionId: string): Observable<Session> {
    return this.http.get<Session>(`${this.apiUrl}/${sessionId}`);
  }
}
```

## 🎯 Component Implementations

### Terminal Container Component
```typescript
import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { CommandService } from '../../core/services/command.service';
import { SessionService } from '../../core/services/session.service';
import { CommandHistoryService } from '../../core/services/command-history.service';
import { CommandHistoryItem, CommandOutput } from '../../core/models/command.models';

@Component({
  selector: 'app-terminal-container',
  templateUrl: './terminal-container.component.html',
  styleUrls: ['./terminal-container.component.scss'],
  host: {
    'class': 'terminal-container',
    '[class.mobile]': 'isMobile'
  }
})
export class TerminalContainerComponent implements OnInit, OnDestroy {
  @ViewChild('terminalBody', { static: true }) terminalBody!: ElementRef;

  commandHistory: CommandHistoryItem[] = [];
  isProcessing = false;
  currentPrompt = 'joseph@portfolio:~$ ';
  welcomeMessage = '';
  isMobile = window.innerWidth < 768;

  private destroy$ = new Subject<void>();

  constructor(
    private commandService: CommandService,
    private sessionService: SessionService,
    private historyService: CommandHistoryService
  ) {}

  ngOnInit(): void {
    this.initializeTerminal();
    this.subscribeToServices();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeTerminal(): void {
    this.sessionService.session$
      .pipe(takeUntil(this.destroy$))
      .subscribe(session => {
        if (session) {
          this.welcomeMessage = session.welcomeMessage;
          this.addWelcomeMessage();
        }
      });
  }

  private subscribeToServices(): void {
    this.commandService.isProcessing$
      .pipe(takeUntil(this.destroy$))
      .subscribe(isProcessing => {
        this.isProcessing = isProcessing;
      });
  }

  private addWelcomeMessage(): void {
    this.commandHistory.push({
      id: 'welcome',
      type: 'output',
      content: {
        type: 'text',
        data: this.welcomeMessage
      },
      timestamp: new Date(),
      isTyping: true
    });
  }

  executeCommand(command: string): void {
    if (!command.trim()) return;

    // Add command to history
    this.commandHistory.push({
      id: this.generateId(),
      type: 'command',
      command,
      prompt: this.currentPrompt,
      timestamp: new Date()
    });

    // Add to command history service
    this.historyService.addCommand(command);

    // Execute command
    const sessionId = this.sessionService.getSessionId();
    if (sessionId) {
      this.commandService.executeCommand(command, sessionId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (output) => this.handleCommandOutput(output),
          error: (error) => this.handleCommandError(error)
        });
    }

    // Scroll to bottom
    setTimeout(() => this.scrollToBottom(), 100);
  }

  private handleCommandOutput(output: CommandOutput): void {
    this.commandHistory.push({
      id: this.generateId(),
      type: 'output',
      content: output.content,
      formatting: output.formatting,
      timestamp: new Date(),
      isTyping: output.animation?.typewriter || false
    });
  }

  private handleCommandError(error: any): void {
    this.commandHistory.push({
      id: this.generateId(),
      type: 'error',
      content: error.message || 'An error occurred',
      suggestion: error.suggestion,
      timestamp: new Date()
    });
  }

  private scrollToBottom(): void {
    const element = this.terminalBody.nativeElement;
    element.scrollTop = element.scrollHeight;
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }
}
```

### Command Input Component
```typescript
import { Component, Input, Output, EventEmitter, ViewChild, ElementRef, OnInit } from '@angular/core';
import { CommandHistoryService } from '../../core/services/command-history.service';
import { CommandSuggestionService } from '../services/command-suggestion.service';

@Component({
  selector: 'app-command-input',
  templateUrl: './command-input.component.html',
  styleUrls: ['./command-input.component.scss']
})
export class CommandInputComponent implements OnInit {
  @Input() prompt = '$ ';
  @Input() disabled = false;
  @Output() commandSubmitted = new EventEmitter<string>();

  @ViewChild('commandInput', { static: true }) commandInput!: ElementRef<HTMLInputElement>;

  currentCommand = '';
  isFocused = false;
  showSuggestions = false;
  suggestions: string[] = [];
  selectedSuggestionIndex = -1;

  constructor(
    private historyService: CommandHistoryService,
    private suggestionService: CommandSuggestionService
  ) {}

  ngOnInit(): void {
    // Auto-focus on load
    setTimeout(() => this.commandInput.nativeElement.focus(), 100);
  }

  handleKeydown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'Enter':
        event.preventDefault();
        this.submitCommand();
        break;
      
      case 'ArrowUp':
        event.preventDefault();
        this.navigateHistory('up');
        break;
      
      case 'ArrowDown':
        event.preventDefault();
        this.navigateHistory('down');
        break;
      
      case 'Tab':
        event.preventDefault();
        this.handleTabCompletion();
        break;
      
      case 'Escape':
        this.clearInput();
        break;
      
      default:
        // Update suggestions on typing
        setTimeout(() => this.updateSuggestions(), 0);
    }
  }

  private submitCommand(): void {
    if (this.currentCommand.trim()) {
      this.commandSubmitted.emit(this.currentCommand.trim());
      this.clearInput();
    }
  }

  private navigateHistory(direction: 'up' | 'down'): void {
    const command = direction === 'up' 
      ? this.historyService.getPreviousCommand()
      : this.historyService.getNextCommand();
    
    if (command !== null) {
      this.currentCommand = command;
    }
  }

  private handleTabCompletion(): void {
    if (this.suggestions.length > 0) {
      this.currentCommand = this.suggestions[0];
      this.hideSuggestions();
    }
  }

  private updateSuggestions(): void {
    this.suggestions = this.suggestionService.getSuggestions(this.currentCommand);
    this.showSuggestions = this.suggestions.length > 0 && this.currentCommand.length > 0;
    this.selectedSuggestionIndex = -1;
  }

  private clearInput(): void {
    this.currentCommand = '';
    this.hideSuggestions();
  }

  private hideSuggestions(): void {
    this.showSuggestions = false;
    this.selectedSuggestionIndex = -1;
  }

  selectSuggestion(suggestion: string): void {
    this.currentCommand = suggestion;
    this.hideSuggestions();
    this.commandInput.nativeElement.focus();
  }
}
```

### Typewriter Text Component
```typescript
import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { interval, Subscription, take } from 'rxjs';

@Component({
  selector: 'app-typewriter-text',
  template: `
    <span class="typewriter-text">{{ displayText }}</span>
    <span class="typing-cursor" *ngIf="isTyping && enabled">|</span>
  `,
  styleUrls: ['./typewriter-text.component.scss']
})
export class TypewriterTextComponent implements OnInit, OnDestroy {
  @Input() text = '';
  @Input() speed = 50; // milliseconds per character
  @Input() enabled = true;

  displayText = '';
  isTyping = false;

  private typewriterSubscription?: Subscription;

  ngOnInit(): void {
    if (this.enabled && this.text) {
      this.startTypewriter();
    } else {
      this.displayText = this.text;
    }
  }

  ngOnDestroy(): void {
    this.typewriterSubscription?.unsubscribe();
  }

  private startTypewriter(): void {
    this.isTyping = true;
    this.displayText = '';

    this.typewriterSubscription = interval(this.speed).pipe(
      take(this.text.length)
    ).subscribe({
      next: (i) => {
        this.displayText = this.text.substring(0, i + 1);
      },
      complete: () => {
        this.isTyping = false;
      }
    });
  }
}
```

## 🎨 SCSS Styling System

### Terminal Styles
```scss
// _terminal.scss
.terminal-window {
  background: var(--terminal-bg);
  color: var(--terminal-text);
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  overflow: hidden;
  max-width: 1000px;
  margin: 20px auto;
  height: 600px;
  display: flex;
  flex-direction: column;
  
  @include terminal-mobile;
  @include terminal-tablet;
}

.terminal-header {
  background: linear-gradient(135deg, #2d3748 0%, #1a202c 100%);
  padding: 12px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.terminal-controls {
  display: flex;
  gap: 8px;
  
  .control {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    
    &.close { background: #ff5f57; }
    &.minimize { background: #ffbd2e; }
    &.maximize { background: #28ca42; }
  }
}

.terminal-title {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.8);
  font-weight: 500;
}

.terminal-body {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
  line-height: 1.4;
  
  &::-webkit-scrollbar {
    width: 8px;
  }
  
  &::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.1);
  }
  
  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.3);
    border-radius: 4px;
  }
}
```

### Animation Styles
```scss
// _animations.scss
@keyframes terminal-boot {
  0% {
    opacity: 0;
    transform: scale(0.95) translateY(20px);
  }
  100% {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

@keyframes command-slide-in {
  from {
    opacity: 0;
    transform: translateX(-10px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes cursor-blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}

@keyframes dot-pulse {
  0%, 80%, 100% { 
    opacity: 0.3; 
    transform: scale(1);
  }
  40% { 
    opacity: 1; 
    transform: scale(1.1);
  }
}

.terminal-window {
  animation: terminal-boot 0.6s cubic-bezier(0.22, 1, 0.36, 1);
}

.output-line {
  animation: command-slide-in 0.3s ease-out;
}

.typing-cursor {
  animation: cursor-blink 1s infinite;
  color: var(--accent-color);
}

.loading-dots .dot {
  animation: dot-pulse 1.4s infinite ease-in-out;
}
```

This comprehensive Angular implementation provides a fully functional, accessible, and polished terminal interface that meets all the portfolio requirements while following Angular best practices and modern web standards.