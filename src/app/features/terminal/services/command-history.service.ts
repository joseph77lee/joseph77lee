import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CommandHistoryService {
  private readonly maxHistorySize = 50;
  private historySubject = new BehaviorSubject<string[]>([]);
  private currentIndex = -1;
  private tempCommand = '';

  readonly history$ = this.historySubject.asObservable();

  get history(): string[] {
    return this.historySubject.value;
  }

  /**
   * Add command to history
   */
  addCommand(command: string): void {
    if (!command.trim()) return;

    const currentHistory = this.historySubject.value;
    const lastCommand = currentHistory[currentHistory.length - 1];

    // Don't add duplicate consecutive commands
    if (lastCommand !== command.trim()) {
      const newHistory = [...currentHistory, command.trim()];
      
      // Keep only last maxHistorySize commands
      if (newHistory.length > this.maxHistorySize) {
        newHistory.shift();
      }
      
      this.historySubject.next(newHistory);
    }

    // Reset navigation index
    this.currentIndex = this.historySubject.value.length;
    this.tempCommand = '';
  }

  /**
   * Get previous command in history
   */
  getPreviousCommand(): string | null {
    const history = this.historySubject.value;
    
    if (history.length === 0) return null;

    // First time going up - save current input
    if (this.currentIndex === history.length) {
      // tempCommand would be set by the calling component
    }

    if (this.currentIndex > 0) {
      this.currentIndex--;
      return history[this.currentIndex];
    }

    return null;
  }

  /**
   * Get next command in history
   */
  getNextCommand(): string | null {
    const history = this.historySubject.value;
    
    if (history.length === 0) return null;

    if (this.currentIndex < history.length - 1) {
      this.currentIndex++;
      return history[this.currentIndex];
    } else if (this.currentIndex === history.length - 1) {
      // Back to current input
      this.currentIndex = history.length;
      return this.tempCommand;
    }

    return null;
  }

  /**
   * Set temporary command (current input when navigating history)
   */
  setTempCommand(command: string): void {
    this.tempCommand = command;
  }

  /**
   * Reset navigation state
   */
  resetNavigation(): void {
    this.currentIndex = this.historySubject.value.length;
    this.tempCommand = '';
  }

  /**
   * Clear all history
   */
  clearHistory(): void {
    this.historySubject.next([]);
    this.resetNavigation();
  }

  /**
   * Get history size
   */
  get size(): number {
    return this.historySubject.value.length;
  }

  /**
   * Check if at beginning of history
   */
  get isAtBeginning(): boolean {
    return this.currentIndex === 0;
  }

  /**
   * Check if at end of history
   */
  get isAtEnd(): boolean {
    return this.currentIndex >= this.historySubject.value.length;
  }

  /**
   * Search history for commands containing text
   */
  searchHistory(searchTerm: string): string[] {
    if (!searchTerm.trim()) return this.historySubject.value;

    const lowerSearchTerm = searchTerm.toLowerCase();
    return this.historySubject.value.filter(command =>
      command.toLowerCase().includes(lowerSearchTerm)
    );
  }

  /**
   * Get recent commands (last n commands)
   */
  getRecentCommands(count: number = 5): string[] {
    const history = this.historySubject.value;
    return history.slice(-count);
  }

  /**
   * Get command frequency statistics
   */
  getCommandStats(): { [command: string]: number } {
    const stats: { [command: string]: number } = {};
    
    this.historySubject.value.forEach(command => {
      const baseCommand = command.split(' ')[0]; // Get command without arguments
      stats[baseCommand] = (stats[baseCommand] || 0) + 1;
    });

    return stats;
  }

  /**
   * Export history to JSON
   */
  exportHistory(): string {
    return JSON.stringify({
      history: this.historySubject.value,
      timestamp: new Date().toISOString(),
      stats: this.getCommandStats()
    }, null, 2);
  }

  /**
   * Import history from JSON
   */
  importHistory(jsonData: string): boolean {
    try {
      const data = JSON.parse(jsonData);
      
      if (data.history && Array.isArray(data.history)) {
        this.historySubject.next(data.history.slice(-this.maxHistorySize));
        this.resetNavigation();
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Failed to import history:', error);
      return false;
    }
  }
}