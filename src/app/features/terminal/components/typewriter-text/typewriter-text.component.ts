import { Component, Input, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { interval, Subscription, take, finalize } from 'rxjs';

@Component({
  selector: 'app-typewriter-text',
  template: `
    <span class="typewriter-text" [attr.aria-live]="'polite'">{{ displayText }}</span>
    <span class="typing-cursor" 
          *ngIf="isTyping && enabled" 
          aria-hidden="true">|</span>
  `,
  styleUrls: ['./typewriter-text.component.scss'],
  host: {
    'class': 'typewriter-component',
    '[class.typing]': 'isTyping',
    '[class.complete]': '!isTyping'
  }
})
export class TypewriterTextComponent implements OnInit, OnDestroy {
  @Input() text = '';
  @Input() speed = 50; // milliseconds per character
  @Input() enabled = true;

  displayText = '';
  isTyping = false;

  private typewriterSubscription?: Subscription;

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    if (this.enabled && this.text) {
      this.startTypewriter();
    } else {
      this.displayText = this.text;
    }
  }

  ngOnDestroy(): void {
    this.stopTypewriter();
  }

  /**
   * Start the typewriter animation
   */
  private startTypewriter(): void {
    if (!this.text || this.typewriterSubscription) {
      return;
    }

    this.isTyping = true;
    this.displayText = '';
    
    // Handle different types of text content
    const textToType = this.processTextForTyping(this.text);
    
    this.typewriterSubscription = interval(this.speed).pipe(
      take(textToType.length),
      finalize(() => {
        this.isTyping = false;
        this.cdr.detectChanges();
      })
    ).subscribe({
      next: (index) => {
        this.displayText = textToType.substring(0, index + 1);
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.warn('Typewriter animation error:', error);
        this.displayText = this.text;
        this.isTyping = false;
        this.cdr.detectChanges();
      }
    });
  }

  /**
   * Stop the typewriter animation
   */
  private stopTypewriter(): void {
    if (this.typewriterSubscription) {
      this.typewriterSubscription.unsubscribe();
      this.typewriterSubscription = undefined;
    }
    this.isTyping = false;
  }

  /**
   * Process text content for typing animation
   */
  private processTextForTyping(text: string): string {
    if (typeof text !== 'string') {
      return String(text);
    }

    // Remove any HTML tags for clean typing
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = text;
    return tempDiv.textContent || tempDiv.innerText || text;
  }

  /**
   * Restart typewriter animation with new text
   */
  restartTypewriter(newText?: string): void {
    this.stopTypewriter();
    
    if (newText !== undefined) {
      this.text = newText;
    }
    
    if (this.enabled && this.text) {
      setTimeout(() => this.startTypewriter(), 100);
    } else {
      this.displayText = this.text;
    }
  }

  /**
   * Skip typewriter animation and show complete text
   */
  skipAnimation(): void {
    this.stopTypewriter();
    this.displayText = this.text;
    this.isTyping = false;
    this.cdr.detectChanges();
  }

  /**
   * Check if animation is currently running
   */
  get isAnimating(): boolean {
    return this.isTyping;
  }

  /**
   * Get progress of current animation (0-1)
   */
  get progress(): number {
    if (!this.text || !this.isTyping) {
      return 1;
    }
    return this.displayText.length / this.text.length;
  }
}