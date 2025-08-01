# Frontend UI Design - Interactive Terminal Portfolio

## 🎨 Design System Overview

### Visual Identity
- **Theme**: Terminal/CLI aesthetic with modern polish
- **Colors**: Monospace terminal palette with accent colors
- **Typography**: Monospace fonts for authenticity
- **Layout**: Full-screen terminal simulation

### Color Palette
```scss
// Dark Theme (Primary)
$terminal-bg: #0d1117;
$terminal-text: #c9d1d9;
$prompt-color: #58a6ff;
$success-color: #56d364;
$error-color: #f85149;
$warning-color: #d29922;
$accent-color: #79c0ff;

// Light Theme (Alternative)
$terminal-bg-light: #f6f8fa;
$terminal-text-light: #24292f;
$prompt-color-light: #0969da;
```

## 🏗️ Component Architecture

### Core Terminal Components

#### 1. Terminal Container (`terminal-container`)
```typescript
@Component({
  selector: 'app-terminal-container',
  template: `
    <div class="terminal-window" [class.mobile]="isMobile">
      <div class="terminal-header">
        <div class="terminal-controls">
          <span class="control close"></span>
          <span class="control minimize"></span>
          <span class="control maximize"></span>
        </div>
        <div class="terminal-title">joseph@portfolio:~$</div>
      </div>
      
      <div class="terminal-body" #terminalBody>
        <app-terminal-output 
          [history]="commandHistory"
          [isTyping]="isTyping">
        </app-terminal-output>
        
        <app-command-input 
          [prompt]="currentPrompt"
          (commandSubmitted)="executeCommand($event)"
          [disabled]="isProcessing">
        </app-command-input>
      </div>
    </div>
  `,
  styleUrls: ['./terminal-container.component.scss']
})
export class TerminalContainerComponent {
  commandHistory: CommandHistoryItem[] = [];
  isTyping = false;
  isProcessing = false;
  currentPrompt = 'joseph@portfolio:~$ ';
  isMobile = this.breakpointObserver.isMatched('(max-width: 768px)');
}
```

#### 2. Command Input (`command-input`)
```typescript
@Component({
  selector: 'app-command-input',
  template: `
    <div class="command-line" [class.focused]="isFocused">
      <span class="prompt">{{ prompt }}</span>
      <input 
        #commandInput
        type="text"
        class="command-input"
        [(ngModel)]="currentCommand"
        (keydown)="handleKeydown($event)"
        (focus)="isFocused = true"
        (blur)="isFocused = false"
        [disabled]="disabled"
        autocomplete="off"
        spellcheck="false">
      <span class="cursor" [class.blink]="isFocused"></span>
    </div>
    
    <app-command-suggestions 
      *ngIf="showSuggestions"
      [suggestions]="suggestions"
      [selectedIndex]="selectedSuggestionIndex"
      (suggestionSelected)="selectSuggestion($event)">
    </app-command-suggestions>
  `,
  styleUrls: ['./command-input.component.scss']
})
export class CommandInputComponent {
  @Input() prompt = '$ ';
  @Input() disabled = false;
  @Output() commandSubmitted = new EventEmitter<string>();
  
  currentCommand = '';
  isFocused = false;
  showSuggestions = false;
  suggestions: string[] = [];
  commandHistory: string[] = [];
  historyIndex = -1;
}
```

#### 3. Terminal Output (`terminal-output`)
```typescript
@Component({
  selector: 'app-terminal-output',
  template: `
    <div class="output-container">
      <div *ngFor="let item of history; trackBy: trackByFn" 
           class="output-line"
           [ngClass]="item.type">
        
        <!-- Command Echo -->
        <div *ngIf="item.type === 'command'" class="command-echo">
          <span class="prompt">{{ item.prompt }}</span>
          <span class="command">{{ item.command }}</span>
        </div>
        
        <!-- Output Content -->
        <div *ngIf="item.type === 'output'" class="command-output">
          <app-output-renderer 
            [content]="item.content"
            [formatting]="item.formatting"
            [isTyping]="item.isTyping && isTyping">
          </app-output-renderer>
        </div>
        
        <!-- Error Messages -->
        <div *ngIf="item.type === 'error'" class="error-output">
          <span class="error-icon">❌</span>
          <span class="error-text">{{ item.content }}</span>
          <div *ngIf="item.suggestion" class="error-suggestion">
            💡 {{ item.suggestion }}
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./terminal-output.component.scss']
})
export class TerminalOutputComponent {
  @Input() history: CommandHistoryItem[] = [];
  @Input() isTyping = false;
}
```

#### 4. Output Renderer (`output-renderer`)
```typescript
@Component({
  selector: 'app-output-renderer',
  template: `
    <div class="output-content" [ngClass]="formatting?.style">
      
      <!-- Text Output -->
      <div *ngIf="content.type === 'text'" class="text-output">
        <app-typewriter-text 
          [text]="content.data"
          [speed]="typewriterSpeed"
          [enabled]="isTyping">
        </app-typewriter-text>
      </div>
      
      <!-- List Output -->
      <div *ngIf="content.type === 'list'" class="list-output">
        <div *ngFor="let item of content.data; let i = index" 
             class="list-item"
             [style.animation-delay]="i * 100 + 'ms'">
          <span class="list-bullet">•</span>
          <span class="list-text">{{ item }}</span>
        </div>
      </div>
      
      <!-- Table Output -->
      <div *ngIf="content.type === 'table'" class="table-output">
        <table class="terminal-table">
          <thead *ngIf="content.headers">
            <tr>
              <th *ngFor="let header of content.headers">{{ header }}</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let row of content.data">
              <td *ngFor="let cell of row">{{ cell }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <!-- Interactive Output -->
      <div *ngIf="content.type === 'interactive'" class="interactive-output">
        <div class="interactive-content">{{ content.data }}</div>
        <div class="interactive-actions">
          <button *ngFor="let action of content.actions"
                  class="terminal-button"
                  (click)="handleAction(action)">
            {{ action.label }}
          </button>
        </div>
      </div>
      
      <!-- Pagination -->
      <div *ngIf="content.pagination" class="pagination-controls">
        <span class="pagination-info">
          Page {{ content.pagination.current }} of {{ content.pagination.total }}
        </span>
        <button *ngIf="content.pagination.hasNext" 
                class="continue-button"
                (click)="loadNextPage()">
          Press ENTER to continue...
        </button>
      </div>
    </div>
  `,
  styleUrls: ['./output-renderer.component.scss']
})
export class OutputRendererComponent {
  @Input() content: OutputContent;
  @Input() formatting: OutputFormatting;
  @Input() isTyping = false;
  
  typewriterSpeed = 50; // milliseconds per character
}
```

## 🎭 Interactive Features

### Command Auto-completion
```typescript
@Injectable()
export class CommandSuggestionService {
  private availableCommands = [
    'help', 'summary', 'skills', 'experience', 
    'education', 'highlights', 'download'
  ];
  
  getSuggestions(input: string): string[] {
    if (!input) return this.availableCommands;
    
    return this.availableCommands.filter(cmd => 
      cmd.toLowerCase().startsWith(input.toLowerCase())
    );
  }
  
  getContextualSuggestions(command: string): string[] {
    switch (command) {
      case 'skills':
        return ['frontend', 'backend', 'tools'];
      case 'experience':
        return ['--detailed', '--summary'];
      default:
        return [];
    }
  }
}
```

### Typewriter Animation
```typescript
@Component({
  selector: 'app-typewriter-text',
  template: `
    <span class="typewriter-text">{{ displayText }}</span>
    <span class="typing-cursor" *ngIf="isTyping">|</span>
  `
})
export class TypewriterTextComponent implements OnInit, OnDestroy {
  @Input() text = '';
  @Input() speed = 50;
  @Input() enabled = true;
  
  displayText = '';
  isTyping = false;
  private typewriterSubscription?: Subscription;
  
  ngOnInit() {
    if (this.enabled) {
      this.startTypewriter();
    } else {
      this.displayText = this.text;
    }
  }
  
  private startTypewriter() {
    this.isTyping = true;
    this.displayText = '';
    
    this.typewriterSubscription = interval(this.speed).pipe(
      take(this.text.length),
      map(i => this.text.substring(0, i + 1))
    ).subscribe({
      next: (partial) => this.displayText = partial,
      complete: () => this.isTyping = false
    });
  }
}
```

### Command History Navigation
```typescript
export class CommandHistoryService {
  private history: string[] = [];
  private currentIndex = -1;
  
  addCommand(command: string) {
    if (command.trim() && this.history[this.history.length - 1] !== command) {
      this.history.push(command);
    }
    this.currentIndex = this.history.length;
  }
  
  getPreviousCommand(): string | null {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      return this.history[this.currentIndex];
    }
    return null;
  }
  
  getNextCommand(): string | null {
    if (this.currentIndex < this.history.length - 1) {
      this.currentIndex++;
      return this.history[this.currentIndex];
    } else if (this.currentIndex === this.history.length - 1) {
      this.currentIndex = this.history.length;
      return '';
    }
    return null;
  }
}
```

## 📱 Responsive Design System

### Breakpoint Strategy
```scss
// Breakpoints
$mobile: 480px;
$tablet: 768px;
$desktop: 1024px;
$large: 1200px;

// Terminal Responsive Mixins
@mixin terminal-mobile {
  @media (max-width: $tablet - 1px) {
    .terminal-window {
      margin: 0;
      border-radius: 0;
      height: 100vh;
      
      .terminal-header {
        padding: 12px 16px;
        .terminal-controls { display: none; }
      }
      
      .terminal-body {
        padding: 16px;
        font-size: 14px;
      }
      
      .command-input {
        font-size: 16px; // Prevent zoom on iOS
      }
    }
  }
}

@mixin terminal-tablet {
  @media (min-width: $tablet) and (max-width: $desktop - 1px) {
    .terminal-window {
      margin: 20px;
      max-width: calc(100vw - 40px);
    }
  }
}
```

### Touch Interactions
```typescript
@Directive({
  selector: '[terminalTouch]'
})
export class TerminalTouchDirective {
  @HostListener('touchstart', ['$event'])
  onTouchStart(event: TouchEvent) {
    // Focus input on terminal touch
    const input = document.querySelector('.command-input') as HTMLInputElement;
    if (input && !input.contains(event.target as Node)) {
      event.preventDefault();
      input.focus();
    }
  }
  
  @HostListener('touchend', ['$event'])
  onTouchEnd(event: TouchEvent) {
    // Handle touch gestures for command history
    if (this.isSwipeUp(event)) {
      // Previous command
    } else if (this.isSwipeDown(event)) {
      // Next command
    }
  }
}
```

## ♿ Accessibility Features

### ARIA Support
```typescript
@Component({
  selector: 'app-accessible-terminal',
  template: `
    <div class="terminal-container" 
         role="application"
         aria-label="Interactive Portfolio Terminal"
         [attr.aria-busy]="isProcessing">
      
      <div class="sr-only" aria-live="polite" aria-atomic="true">
        {{ screenReaderAnnouncement }}
      </div>
      
      <div class="terminal-output" 
           role="log" 
           aria-label="Command output"
           aria-live="polite">
        <!-- Output content -->
      </div>
      
      <div class="command-input-container" role="group">
        <label for="command-input" class="sr-only">
          Enter portfolio command
        </label>
        <input id="command-input"
               role="textbox"
               aria-describedby="command-help"
               [attr.aria-invalid]="hasError"
               [attr.aria-busy]="isProcessing">
      </div>
      
      <div id="command-help" class="sr-only">
        Type help to see available commands. Use up and down arrows for command history.
      </div>
    </div>
  `
})
export class AccessibleTerminalComponent {
  screenReaderAnnouncement = '';
  
  announceToScreenReader(message: string) {
    this.screenReaderAnnouncement = message;
    setTimeout(() => this.screenReaderAnnouncement = '', 1000);
  }
}
```

### Keyboard Navigation
```typescript
export class KeyboardNavigationService {
  private shortcuts = new Map([
    ['Ctrl+L', () => this.clearTerminal()],
    ['Ctrl+C', () => this.cancelCommand()],
    ['Tab', () => this.autoComplete()],
    ['Enter', () => this.executeCommand()],
    ['ArrowUp', () => this.previousCommand()],
    ['ArrowDown', () => this.nextCommand()],
    ['Escape', () => this.clearInput()]
  ]);
  
  @HostListener('document:keydown', ['$event'])
  handleKeyboardShortcut(event: KeyboardEvent) {
    const key = this.getKeyString(event);
    const handler = this.shortcuts.get(key);
    
    if (handler) {
      event.preventDefault();
      handler();
    }
  }
  
  private getKeyString(event: KeyboardEvent): string {
    const parts = [];
    if (event.ctrlKey) parts.push('Ctrl');
    if (event.altKey) parts.push('Alt');
    if (event.shiftKey) parts.push('Shift');
    parts.push(event.key);
    return parts.join('+');
  }
}
```

## 🎨 Animation System

### Entrance Animations
```scss
@keyframes terminal-boot {
  0% {
    opacity: 0;
    transform: scale(0.9);
  }
  50% {
    opacity: 0.8;
    transform: scale(1.02);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes command-slide-in {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes cursor-blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}

.terminal-window {
  animation: terminal-boot 0.8s ease-out;
}

.output-line {
  animation: command-slide-in 0.3s ease-out;
}

.cursor {
  animation: cursor-blink 1s infinite;
}
```

### Loading States
```typescript
@Component({
  selector: 'app-loading-indicator',
  template: `
    <div class="loading-container" *ngIf="isLoading">
      <div class="loading-dots">
        <span class="dot" *ngFor="let dot of dots; let i = index"
              [style.animation-delay]="i * 0.2 + 's'">.</span>
      </div>
      <span class="loading-text">{{ loadingMessage }}</span>
    </div>
  `,
  styles: [`
    .loading-dots .dot {
      animation: dot-pulse 1.4s infinite ease-in-out;
    }
    
    @keyframes dot-pulse {
      0%, 80%, 100% { opacity: 0.3; }
      40% { opacity: 1; }
    }
  `]
})
export class LoadingIndicatorComponent {
  @Input() isLoading = false;
  @Input() loadingMessage = 'Processing command...';
  dots = [1, 2, 3];
}
```

This comprehensive frontend UI design provides a polished, accessible, and interactive terminal experience that meets all the requirements while maintaining professional UX standards.