import { Injectable, HostListener } from '@angular/core';
import { Subject } from 'rxjs';

export interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  handler: () => void;
  description: string;
  context?: string;
}

@Injectable({
  providedIn: 'root'
})
export class KeyboardNavigationService {
  private shortcuts = new Map<string, KeyboardShortcut>();
  private shortcutTriggered = new Subject<KeyboardShortcut>();
  
  readonly shortcutTriggered$ = this.shortcutTriggered.asObservable();

  constructor() {
    this.registerDefaultShortcuts();
  }

  /**
   * Register a keyboard shortcut
   */
  registerShortcut(shortcut: KeyboardShortcut): void {
    const key = this.getShortcutKey(shortcut);
    this.shortcuts.set(key, shortcut);
  }

  /**
   * Unregister a keyboard shortcut
   */
  unregisterShortcut(key: string, ctrlKey = false, altKey = false, shiftKey = false): void {
    const shortcutKey = this.buildShortcutKey(key, ctrlKey, altKey, shiftKey);
    this.shortcuts.delete(shortcutKey);
  }

  /**
   * Get all registered shortcuts
   */
  getShortcuts(): KeyboardShortcut[] {
    return Array.from(this.shortcuts.values());
  }

  /**
   * Get shortcuts by context
   */
  getShortcutsByContext(context: string): KeyboardShortcut[] {
    return Array.from(this.shortcuts.values())
      .filter(shortcut => shortcut.context === context);
  }

  /**
   * Handle keyboard event
   */
  @HostListener('document:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent): void {
    // Don't handle shortcuts when typing in inputs (except for specific cases)
    if (this.shouldIgnoreEvent(event)) {
      return;
    }

    const shortcutKey = this.buildShortcutKey(
      event.key.toLowerCase(),
      event.ctrlKey,
      event.altKey,
      event.shiftKey
    );

    const shortcut = this.shortcuts.get(shortcutKey);
    if (shortcut) {
      event.preventDefault();
      event.stopPropagation();
      
      try {
        shortcut.handler();
        this.shortcutTriggered.next(shortcut);
      } catch (error) {
        console.error('Error executing keyboard shortcut:', error);
      }
    }
  }

  /**
   * Clear all shortcuts
   */
  clearShortcuts(): void {
    this.shortcuts.clear();
    this.registerDefaultShortcuts();
  }

  /**
   * Check if a shortcut is registered
   */
  isShortcutRegistered(key: string, ctrlKey = false, altKey = false, shiftKey = false): boolean {
    const shortcutKey = this.buildShortcutKey(key, ctrlKey, altKey, shiftKey);
    return this.shortcuts.has(shortcutKey);
  }

  /**
   * Get shortcut help text
   */
  getShortcutHelp(): string {
    const shortcuts = this.getShortcuts();
    const grouped = this.groupShortcutsByContext(shortcuts);
    
    let helpText = 'Keyboard Shortcuts:\n\n';
    
    Object.entries(grouped).forEach(([context, contextShortcuts]) => {
      helpText += `**${context.toUpperCase()}**\n`;
      
      contextShortcuts.forEach(shortcut => {
        const keyCombo = this.formatShortcutDisplay(shortcut);
        helpText += `  ${keyCombo.padEnd(15)} - ${shortcut.description}\n`;
      });
      
      helpText += '\n';
    });

    return helpText;
  }

  /**
   * Enable or disable shortcut handling
   */
  setEnabled(enabled: boolean): void {
    // Implementation would control whether shortcuts are processed
    // For now, this is a placeholder
  }

  // Private methods

  private registerDefaultShortcuts(): void {
    // Terminal shortcuts
    this.registerShortcut({
      key: 'l',
      ctrlKey: true,
      handler: () => this.triggerClearTerminal(),
      description: 'Clear terminal',
      context: 'terminal'
    });

    this.registerShortcut({
      key: 'c',
      ctrlKey: true,
      handler: () => this.triggerCancelCommand(),
      description: 'Cancel current command',
      context: 'terminal'
    });

    // Navigation shortcuts
    this.registerShortcut({
      key: 'arrowup',
      handler: () => this.triggerHistoryPrevious(),
      description: 'Previous command in history',
      context: 'navigation'
    });

    this.registerShortcut({
      key: 'arrowdown',
      handler: () => this.triggerHistoryNext(),
      description: 'Next command in history',
      context: 'navigation'
    });

    this.registerShortcut({
      key: 'tab',
      handler: () => this.triggerAutoComplete(),
      description: 'Auto-complete command',
      context: 'navigation'
    });

    this.registerShortcut({
      key: 'escape',
      handler: () => this.triggerEscape(),
      description: 'Clear input or close suggestions',
      context: 'navigation'
    });

    // Help shortcut
    this.registerShortcut({
      key: 'F1',
      handler: () => this.triggerHelp(),
      description: 'Show help',
      context: 'help'
    });

    // Theme shortcuts
    this.registerShortcut({
      key: 't',
      ctrlKey: true,
      altKey: true,
      handler: () => this.triggerThemeToggle(),
      description: 'Toggle theme',
      context: 'appearance'
    });
  }

  private getShortcutKey(shortcut: KeyboardShortcut): string {
    return this.buildShortcutKey(
      shortcut.key.toLowerCase(),
      shortcut.ctrlKey || false,
      shortcut.altKey || false,
      shortcut.shiftKey || false
    );
  }

  private buildShortcutKey(key: string, ctrlKey: boolean, altKey: boolean, shiftKey: boolean): string {
    const modifiers = [];
    if (ctrlKey) modifiers.push('ctrl');
    if (altKey) modifiers.push('alt');
    if (shiftKey) modifiers.push('shift');
    
    return [...modifiers, key.toLowerCase()].join('+');
  }

  private shouldIgnoreEvent(event: KeyboardEvent): boolean {
    const target = event.target as HTMLElement;
    
    // Ignore events from non-terminal inputs (except for specific shortcuts)
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
      // Allow certain shortcuts even in inputs
      const allowedShortcuts = ['ctrl+l', 'ctrl+c', 'f1'];
      const currentShortcut = this.buildShortcutKey(
        event.key.toLowerCase(),
        event.ctrlKey,
        event.altKey,
        event.shiftKey
      );
      
      return !allowedShortcuts.includes(currentShortcut);
    }

    // Ignore if user is selecting text
    const selection = window.getSelection();
    if (selection && selection.toString().length > 0) {
      return true;
    }

    return false;
  }

  private formatShortcutDisplay(shortcut: KeyboardShortcut): string {
    const parts = [];
    
    if (shortcut.ctrlKey) parts.push('Ctrl');
    if (shortcut.altKey) parts.push('Alt');
    if (shortcut.shiftKey) parts.push('Shift');
    
    // Format key name
    let key = shortcut.key;
    if (key.startsWith('arrow')) {
      key = key.replace('arrow', '↑↓←→'['arrow'.indexOf(key.substring(5))]);
    } else if (key === ' ') {
      key = 'Space';
    } else if (key.length === 1) {
      key = key.toUpperCase();
    }
    
    parts.push(key);
    
    return parts.join('+');
  }

  private groupShortcutsByContext(shortcuts: KeyboardShortcut[]): { [context: string]: KeyboardShortcut[] } {
    return shortcuts.reduce((acc, shortcut) => {
      const context = shortcut.context || 'general';
      if (!acc[context]) acc[context] = [];
      acc[context].push(shortcut);
      return acc;
    }, {} as { [context: string]: KeyboardShortcut[] });
  }

  // Shortcut action triggers (to be handled by components)
  private triggerClearTerminal(): void {
    // This would be handled by the terminal component
    document.dispatchEvent(new CustomEvent('terminal:clear'));
  }

  private triggerCancelCommand(): void {
    document.dispatchEvent(new CustomEvent('terminal:cancel'));
  }

  private triggerHistoryPrevious(): void {
    document.dispatchEvent(new CustomEvent('terminal:history-previous'));
  }

  private triggerHistoryNext(): void {
    document.dispatchEvent(new CustomEvent('terminal:history-next'));
  }

  private triggerAutoComplete(): void {
    document.dispatchEvent(new CustomEvent('terminal:autocomplete'));
  }

  private triggerEscape(): void {
    document.dispatchEvent(new CustomEvent('terminal:escape'));
  }

  private triggerHelp(): void {
    document.dispatchEvent(new CustomEvent('terminal:help'));
  }

  private triggerThemeToggle(): void {
    document.dispatchEvent(new CustomEvent('terminal:theme-toggle'));
  }

  /**
   * Create a custom shortcut key combination
   */
  static createShortcut(
    key: string,
    handler: () => void,
    description: string,
    options: {
      ctrlKey?: boolean;
      altKey?: boolean;
      shiftKey?: boolean;
      context?: string;
    } = {}
  ): KeyboardShortcut {
    return {
      key: key.toLowerCase(),
      ctrlKey: options.ctrlKey || false,
      altKey: options.altKey || false,
      shiftKey: options.shiftKey || false,
      handler,
      description,
      context: options.context || 'custom'
    };
  }
}