import { Directive, ElementRef, HostListener, Input, OnInit, OnDestroy } from '@angular/core';

@Directive({
  selector: '[terminalTouch]'
})
export class TerminalTouchDirective implements OnInit, OnDestroy {
  @Input() terminalTouch: boolean = true;
  @Input() swipeThreshold: number = 50; // Pixels
  @Input() swipeTimeThreshold: number = 300; // Milliseconds

  private touchStartX = 0;
  private touchStartY = 0;
  private touchStartTime = 0;
  private isSwiping = false;

  constructor(private elementRef: ElementRef<HTMLElement>) {}

  ngOnInit(): void {
    // Add touch-friendly CSS class
    this.elementRef.nativeElement.classList.add('touch-enabled');
  }

  ngOnDestroy(): void {
    // Cleanup if needed
    this.elementRef.nativeElement.classList.remove('touch-enabled');
  }

  /**
   * Handle touch start events
   */
  @HostListener('touchstart', ['$event'])
  onTouchStart(event: TouchEvent): void {
    if (!this.terminalTouch || event.touches.length !== 1) {
      return;
    }

    const touch = event.touches[0];
    this.touchStartX = touch.clientX;
    this.touchStartY = touch.clientY;
    this.touchStartTime = Date.now();
    this.isSwiping = false;

    // Focus input on touch start
    this.focusTerminalInput(event);
  }

  /**
   * Handle touch move events
   */
  @HostListener('touchmove', ['$event'])
  onTouchMove(event: TouchEvent): void {
    if (!this.terminalTouch || event.touches.length !== 1) {
      return;
    }

    const touch = event.touches[0];
    const deltaX = Math.abs(touch.clientX - this.touchStartX);
    const deltaY = Math.abs(touch.clientY - this.touchStartY);

    // Detect if user is swiping (vs just scrolling)
    if (deltaX > 10 || deltaY > 10) {
      this.isSwiping = true;
    }
  }

  /**
   * Handle touch end events
   */
  @HostListener('touchend', ['$event'])
  onTouchEnd(event: TouchEvent): void {
    if (!this.terminalTouch) {
      return;
    }

    const touchEndTime = Date.now();
    const touchDuration = touchEndTime - this.touchStartTime;

    // Handle swipe gestures
    if (this.isSwiping && event.changedTouches.length === 1) {
      const touch = event.changedTouches[0];
      const deltaX = touch.clientX - this.touchStartX;
      const deltaY = touch.clientY - this.touchStartY;

      this.handleSwipeGesture(deltaX, deltaY, touchDuration);
    } else if (!this.isSwiping && touchDuration < this.swipeTimeThreshold) {
      // Handle tap (short touch without movement)
      this.handleTap(event);
    }

    // Reset swipe state
    this.isSwiping = false;
  }

  /**
   * Handle touch cancel events
   */
  @HostListener('touchcancel', ['$event'])
  onTouchCancel(event: TouchEvent): void {
    this.isSwiping = false;
  }

  /**
   * Prevent context menu on long press
   */
  @HostListener('contextmenu', ['$event'])
  onContextMenu(event: Event): void {
    // Prevent context menu on terminal area to avoid interfering with touch interactions
    if (this.terminalTouch) {
      event.preventDefault();
    }
  }

  /**
   * Handle swipe gestures
   */
  private handleSwipeGesture(deltaX: number, deltaY: number, duration: number): void {
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    // Only handle swipes that exceed threshold and happen quickly enough
    if (Math.max(absX, absY) < this.swipeThreshold || duration > this.swipeTimeThreshold) {
      return;
    }

    // Determine swipe direction
    if (absX > absY) {
      // Horizontal swipe
      if (deltaX > 0) {
        this.handleSwipeRight();
      } else {
        this.handleSwipeLeft();
      }
    } else {
      // Vertical swipe
      if (deltaY > 0) {
        this.handleSwipeDown();
      } else {
        this.handleSwipeUp();
      }
    }
  }

  /**
   * Handle tap gestures
   */
  private handleTap(event: TouchEvent): void {
    const target = event.target as HTMLElement;

    // Don't handle taps on interactive elements
    if (this.isInteractiveElement(target)) {
      return;
    }

    // Focus terminal input on tap
    setTimeout(() => {
      this.focusTerminalInput(event);
    }, 50);
  }

  /**
   * Handle swipe up gesture
   */
  private handleSwipeUp(): void {
    // Navigate to previous command in history
    this.dispatchTerminalEvent('terminal:history-previous');
  }

  /**
   * Handle swipe down gesture
   */
  private handleSwipeDown(): void {
    // Navigate to next command in history
    this.dispatchTerminalEvent('terminal:history-next');
  }

  /**
   * Handle swipe left gesture
   */
  private handleSwipeLeft(): void {
    // Could be used for additional navigation or commands
    // For now, just focus input
    this.dispatchTerminalEvent('terminal:focus');
  }

  /**
   * Handle swipe right gesture
   */
  private handleSwipeRight(): void {
    // Could be used for showing help or suggestions
    // For now, trigger auto-completion
    this.dispatchTerminalEvent('terminal:autocomplete');
  }

  /**
   * Focus terminal input element
   */
  private focusTerminalInput(event: TouchEvent): void {
    const target = event.target as HTMLElement;

    // Don't focus if touching interactive elements
    if (this.isInteractiveElement(target)) {
      return;
    }

    // Don't focus if user is selecting text
    const selection = window.getSelection();
    if (selection && selection.toString().length > 0) {
      return;
    }

    // Find and focus command input
    const commandInput = this.elementRef.nativeElement.querySelector('.command-input') as HTMLInputElement;
    if (commandInput) {
      // Prevent default to avoid triggering click events
      event.preventDefault();
      
      setTimeout(() => {
        commandInput.focus();
        
        // Position cursor at end of input
        if (commandInput.value) {
          const length = commandInput.value.length;
          commandInput.setSelectionRange(length, length);
        }
      }, 100);
    }
  }

  /**
   * Check if element is interactive
   */
  private isInteractiveElement(element: HTMLElement): boolean {
    const interactiveTags = ['BUTTON', 'A', 'INPUT', 'TEXTAREA', 'SELECT'];
    const interactiveClasses = ['clickable', 'interactive', 'button', 'link'];

    // Check tag name
    if (interactiveTags.includes(element.tagName)) {
      return true;
    }

    // Check classes
    if (interactiveClasses.some(className => element.classList.contains(className))) {
      return true;
    }

    // Check role attribute
    const role = element.getAttribute('role');
    if (role && ['button', 'link', 'menuitem'].includes(role)) {
      return true;
    }

    // Check parent elements
    let parent = element.parentElement;
    while (parent && parent !== this.elementRef.nativeElement) {
      if (interactiveTags.includes(parent.tagName) || 
          interactiveClasses.some(className => parent.classList.contains(className))) {
        return true;
      }
      parent = parent.parentElement;
    }

    return false;
  }

  /**
   * Dispatch custom terminal event
   */
  private dispatchTerminalEvent(eventName: string, detail?: any): void {
    const event = new CustomEvent(eventName, { 
      detail,
      bubbles: true,
      cancelable: true
    });
    
    this.elementRef.nativeElement.dispatchEvent(event);
  }

  /**
   * Add visual feedback for touch interactions
   */
  private addTouchFeedback(element: HTMLElement): void {
    element.classList.add('touch-feedback');
    
    setTimeout(() => {
      element.classList.remove('touch-feedback');
    }, 150);
  }

  /**
   * Get touch position relative to element
   */
  private getTouchPosition(touch: Touch): { x: number; y: number } {
    const rect = this.elementRef.nativeElement.getBoundingClientRect();
    return {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top
    };
  }

  /**
   * Check if touch is within element bounds
   */
  private isWithinBounds(touch: Touch): boolean {
    const rect = this.elementRef.nativeElement.getBoundingClientRect();
    return touch.clientX >= rect.left && 
           touch.clientX <= rect.right && 
           touch.clientY >= rect.top && 
           touch.clientY <= rect.bottom;
  }

  /**
   * Enable or disable touch handling
   */
  setEnabled(enabled: boolean): void {
    this.terminalTouch = enabled;
    
    if (enabled) {
      this.elementRef.nativeElement.classList.add('touch-enabled');
    } else {
      this.elementRef.nativeElement.classList.remove('touch-enabled');
    }
  }
}