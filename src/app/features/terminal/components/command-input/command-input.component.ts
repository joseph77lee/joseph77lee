import { Component, Input, Output, EventEmitter, ViewChild, ElementRef, OnInit, OnDestroy } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { CommandService } from '../../../../core/services/command.service';

@Component({
  selector: 'app-command-input',
  templateUrl: './command-input.component.html',
  styleUrls: ['./command-input.component.scss'],
  host: {
    'class': 'command-input-component'
  }
})
export class CommandInputComponent implements OnInit, OnDestroy {
  @Input() prompt = '$ ';
  @Input() disabled = false;
  @Input() hideInlineTooltips = false;
  @Output() commandSubmitted = new EventEmitter<string>();
  @Output() inputFocused = new EventEmitter<string>();
  @Output() inputBlurred = new EventEmitter<void>();
  @Output() suggestionsChanged = new EventEmitter<string[]>();

  @ViewChild('inputElement', { static: true }) inputElement!: ElementRef<HTMLInputElement>;

  // Input state
  currentCommand = '';
  isFocused = false;
  showSuggestions = false;
  suggestions: string[] = [];
  selectedSuggestionIndex = -1;

  // Command history navigation
  private commandHistory: string[] = [];
  private historyIndex = -1;
  private tempCommand = ''; // Store current input when navigating history

  private destroy$ = new Subject<void>();

  constructor(private commandService: CommandService) {}

  ngOnInit(): void {
    this.subscribeToCommandHistory();
    this.focusInput();
    this.setupWindowResizeListener();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Subscribe to command service history updates
   */
  private subscribeToCommandHistory(): void {
    this.commandService.commandHistory$
      .pipe(takeUntil(this.destroy$))
      .subscribe(history => {
        this.commandHistory = [...history];
        this.historyIndex = this.commandHistory.length;
      });
  }

  /**
   * Setup window resize listener for responsive placeholder
   */
  private setupWindowResizeListener(): void {
    if (typeof window !== 'undefined') {
      const resizeHandler = () => {
        // Trigger change detection for placeholder text
        if (this.inputElement?.nativeElement) {
          const currentPlaceholder = this.placeholderText;
          this.inputElement.nativeElement.placeholder = currentPlaceholder;
        }
      };

      window.addEventListener('resize', resizeHandler);
      
      // Cleanup on destroy
      this.destroy$.subscribe(() => {
        window.removeEventListener('resize', resizeHandler);
      });
    }
  }

  /**
   * Focus the input element
   */
  focusInput(): void {
    setTimeout(() => {
      if (this.inputElement?.nativeElement && !this.disabled) {
        this.inputElement.nativeElement.focus();
      }
    }, 100);
  }

  /**
   * Handle input focus
   */
  onFocus(): void {
    this.isFocused = true;
    this.updateSuggestions();
    this.inputFocused.emit(this.currentCommand);
  }

  /**
   * Handle input blur
   */
  onBlur(): void {
    this.isFocused = false;
    this.inputBlurred.emit();
    // Delay hiding suggestions to allow clicking on them
    setTimeout(() => {
      if (!this.isFocused) {
        this.hideSuggestions();
      }
    }, 200);
  }

  /**
   * Handle input value changes
   */
  onInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.currentCommand = target.value;
    this.updateSuggestions();
  }

  /**
   * Handle keyboard events
   */
  onKeydown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'Enter':
        event.preventDefault();
        this.handleEnterKey();
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
      
      case 'ArrowLeft':
      case 'ArrowRight':
        // Allow normal cursor movement, but hide suggestions
        this.hideSuggestions();
        break;
      
      case 'Escape':
        event.preventDefault();
        this.handleEscape();
        break;
      
      default:
        // For other keys, update suggestions after the input changes
        setTimeout(() => this.updateSuggestions(), 0);
    }
  }

  /**
   * Handle Enter key press
   */
  private handleEnterKey(): void {
    if (this.showSuggestions && this.selectedSuggestionIndex >= 0) {
      // Select the highlighted suggestion
      const suggestion = this.suggestions[this.selectedSuggestionIndex];
      this.selectSuggestion(suggestion);
    } else if (this.currentCommand.trim()) {
      // Submit the command
      this.submitCommand();
    }
  }

  /**
   * Handle Tab key for auto-completion
   */
  private handleTabCompletion(): void {
    if (this.suggestions.length > 0) {
      if (this.suggestions.length === 1) {
        // Single suggestion - auto-complete
        this.selectSuggestion(this.suggestions[0]);
      } else {
        // Multiple suggestions - select first one or cycle through
        const nextIndex = (this.selectedSuggestionIndex + 1) % this.suggestions.length;
        this.selectedSuggestionIndex = nextIndex;
        this.showSuggestions = true;
      }
    }
  }

  /**
   * Handle Escape key
   */
  private handleEscape(): void {
    if (this.showSuggestions) {
      this.hideSuggestions();
    } else {
      this.clearInput();
    }
  }

  /**
   * Navigate command history
   */
  private navigateHistory(direction: 'up' | 'down'): void {
    if (this.commandHistory.length === 0) return;

    if (direction === 'up') {
      // Going back in history
      if (this.historyIndex === this.commandHistory.length) {
        // First time going up - save current input
        this.tempCommand = this.currentCommand;
      }
      
      if (this.historyIndex > 0) {
        this.historyIndex--;
        this.currentCommand = this.commandHistory[this.historyIndex];
        this.updateInputValue();
      }
    } else {
      // Going forward in history
      if (this.historyIndex < this.commandHistory.length - 1) {
        this.historyIndex++;
        this.currentCommand = this.commandHistory[this.historyIndex];
        this.updateInputValue();
      } else if (this.historyIndex === this.commandHistory.length - 1) {
        // Back to current input
        this.historyIndex = this.commandHistory.length;
        this.currentCommand = this.tempCommand;
        this.updateInputValue();
      }
    }

    this.hideSuggestions();
  }

  /**
   * Update input element value
   */
  private updateInputValue(): void {
    if (this.inputElement?.nativeElement) {
      this.inputElement.nativeElement.value = this.currentCommand;
      // Move cursor to end
      const length = this.currentCommand.length;
      this.inputElement.nativeElement.setSelectionRange(length, length);
    }
  }

  /**
   * Update command suggestions
   */
  private updateSuggestions(): void {
    if (!this.currentCommand.trim()) {
      this.hideSuggestions();
      this.suggestionsChanged.emit([]);
      return;
    }

    this.suggestions = this.commandService.getCommandSuggestions(this.currentCommand);
    // Always hide inline suggestions since we're using the status bar
    this.showSuggestions = false;
    this.selectedSuggestionIndex = -1;
    
    // Emit suggestions for status bar
    this.suggestionsChanged.emit(this.suggestions);
  }

  /**
   * Select a suggestion
   */
  selectSuggestion(suggestion: string): void {
    this.currentCommand = suggestion;
    this.updateInputValue();
    this.hideSuggestions();
    this.focusInput();
  }

  /**
   * Handle suggestion click
   */
  onSuggestionClick(suggestion: string, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.selectSuggestion(suggestion);
  }

  /**
   * Handle suggestion hover
   */
  onSuggestionHover(index: number): void {
    this.selectedSuggestionIndex = index;
  }

  /**
   * Hide suggestions
   */
  private hideSuggestions(): void {
    this.showSuggestions = false;
    this.selectedSuggestionIndex = -1;
  }

  /**
   * Submit current command
   */
  private submitCommand(): void {
    const command = this.currentCommand.trim();
    if (command) {
      this.commandSubmitted.emit(command);
      this.clearInput();
      this.resetHistoryNavigation();
    }
  }

  /**
   * Clear input
   */
  private clearInput(): void {
    this.currentCommand = '';
    this.updateInputValue();
    this.hideSuggestions();
  }

  /**
   * Reset history navigation state
   */
  private resetHistoryNavigation(): void {
    this.historyIndex = this.commandHistory.length;
    this.tempCommand = '';
  }

  /**
   * Get placeholder text
   */
  get placeholderText(): string {
    if (this.disabled) {
      return 'Processing...';
    }
    
    // Check window width for responsive placeholder
    if (typeof window !== 'undefined') {
      const windowWidth = window.innerWidth;
      if (windowWidth < 480) {
        return 'Type command...';
      } else if (windowWidth < 768) {
        return 'Type a command';
      }
    }
    
    return 'Type a command or "help" for assistance';
  }

  /**
   * Check if suggestion is selected
   */
  isSuggestionSelected(index: number): boolean {
    return this.selectedSuggestionIndex === index;
  }
}