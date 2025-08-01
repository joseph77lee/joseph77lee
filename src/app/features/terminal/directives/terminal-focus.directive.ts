import { Directive, ElementRef, HostListener, Input, OnInit, OnDestroy } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';

@Directive({
  selector: '[terminalFocus]'
})
export class TerminalFocusDirective implements OnInit, OnDestroy {
  @Input() terminalFocus: string | boolean = true;
  @Input() focusTarget?: string; // CSS selector for focus target

  private destroy$ = new Subject<void>();
  private focusElement?: HTMLElement;

  constructor(private elementRef: ElementRef<HTMLElement>) {}

  ngOnInit(): void {
    this.setupFocusTarget();
    this.setupCustomEventListeners();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Handle click events to focus terminal input
   */
  @HostListener('click', ['$event'])
  onClick(event: Event): void {
    if (!this.shouldHandleFocusEvent(event)) {
      return;
    }

    this.focusTerminalInput();
  }

  /**
   * Handle touch events for mobile
   */
  @HostListener('touchend', ['$event'])
  onTouchEnd(event: TouchEvent): void {
    if (!this.shouldHandleFocusEvent(event)) {
      return;
    }

    // Small delay to prevent conflicts with other touch handlers
    setTimeout(() => {
      this.focusTerminalInput();
    }, 50);
  }

  /**
   * Handle keyboard events to ensure focus
   */
  @HostListener('keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    // Focus input when typing starts (except for special keys)
    if (this.isTypingKey(event) && !this.isInputFocused()) {
      this.focusTerminalInput();
    }
  }

  /**
   * Setup focus target element
   */
  private setupFocusTarget(): void {
    if (this.focusTarget) {
      this.focusElement = document.querySelector(this.focusTarget) as HTMLElement;
    } else {
      // Default to finding command input within the element
      this.focusElement = this.elementRef.nativeElement.querySelector('.command-input') as HTMLElement;
    }

    if (!this.focusElement) {
      console.warn('TerminalFocusDirective: Focus target not found');
    }
  }

  /**
   * Setup custom event listeners for programmatic focus
   */
  private setupCustomEventListeners(): void {
    // Listen for custom focus events
    document.addEventListener('terminal:focus', () => {
      this.focusTerminalInput();
    });

    // Listen for focus-related terminal events
    document.addEventListener('terminal:clear', () => {
      setTimeout(() => this.focusTerminalInput(), 100);
    });

    document.addEventListener('terminal:help', () => {
      setTimeout(() => this.focusTerminalInput(), 100);
    });
  }

  /**
   * Focus the terminal input element
   */
  private focusTerminalInput(): void {
    if (!this.focusElement) {
      this.setupFocusTarget(); // Retry setup
    }

    if (this.focusElement && typeof this.focusElement.focus === 'function') {
      try {
        this.focusElement.focus();
        
        // If it's an input element, position cursor at end
        if (this.focusElement instanceof HTMLInputElement) {
          const length = this.focusElement.value.length;
          this.focusElement.setSelectionRange(length, length);
        }
      } catch (error) {
        console.warn('Failed to focus terminal input:', error);
      }
    }
  }

  /**
   * Check if focus event should be handled
   */
  private shouldHandleFocusEvent(event: Event): boolean {
    // Don't handle if directive is disabled
    if (this.terminalFocus === false) {
      return false;
    }

    const target = event.target as HTMLElement;

    // Don't handle if clicking on interactive elements
    if (this.isInteractiveElement(target)) {
      return false;
    }

    // Don't handle if user is selecting text
    const selection = window.getSelection();
    if (selection && selection.toString().length > 0) {
      return false;
    }

    // Don't handle if target is already an input
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
      return false;
    }

    return true;
  }

  /**
   * Check if element is interactive (should not trigger focus)
   */
  private isInteractiveElement(element: HTMLElement): boolean {
    const interactiveTags = ['BUTTON', 'A', 'INPUT', 'TEXTAREA', 'SELECT'];
    const interactiveRoles = ['button', 'link', 'menuitem', 'option'];

    // Check tag name
    if (interactiveTags.includes(element.tagName)) {
      return true;
    }

    // Check role attribute
    const role = element.getAttribute('role');
    if (role && interactiveRoles.includes(role)) {
      return true;
    }

    // Check for clickable classes or attributes
    if (element.classList.contains('clickable') || 
        element.classList.contains('interactive') ||
        element.hasAttribute('tabindex')) {
      return true;
    }

    // Check parent elements
    let parent = element.parentElement;
    while (parent && parent !== this.elementRef.nativeElement) {
      if (interactiveTags.includes(parent.tagName) || 
          parent.classList.contains('interactive')) {
        return true;
      }
      parent = parent.parentElement;
    }

    return false;
  }

  /**
   * Check if key event represents typing
   */
  private isTypingKey(event: KeyboardEvent): boolean {
    // Ignore modifier keys and special keys
    const specialKeys = [
      'Control', 'Alt', 'Shift', 'Meta',
      'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
      'Tab', 'Enter', 'Escape', 'F1', 'F2', 'F3', 'F4', 'F5', 'F6',
      'F7', 'F8', 'F9', 'F10', 'F11', 'F12'
    ];

    if (specialKeys.includes(event.key)) {
      return false;
    }

    // Ignore Ctrl/Cmd combinations
    if (event.ctrlKey || event.metaKey) {
      return false;
    }

    // Consider it a typing key if it's a printable character
    return event.key.length === 1 || event.key === 'Backspace' || event.key === 'Delete';
  }

  /**
   * Check if an input element is currently focused
   */
  private isInputFocused(): boolean {
    const activeElement = document.activeElement;
    return activeElement instanceof HTMLInputElement || 
           activeElement instanceof HTMLTextAreaElement;
  }

  /**
   * Programmatically trigger focus
   */
  focus(): void {
    this.focusTerminalInput();
  }

  /**
   * Check if focus target is available
   */
  get hasFocusTarget(): boolean {
    return !!this.focusElement;
  }

  /**
   * Get the current focus target element
   */
  get focusTargetElement(): HTMLElement | undefined {
    return this.focusElement;
  }
}