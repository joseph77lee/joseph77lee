import { Component, Input, OnInit, ChangeDetectorRef } from '@angular/core';
import { OutputContent, OutputFormatting } from '../../../../core/models/command.models';

@Component({
  selector: 'app-output-renderer',
  templateUrl: './output-renderer.component.html',
  styleUrls: ['./output-renderer.component.scss'],
  host: {
    'class': 'output-renderer',
    '[class]': 'cssClasses'
  }
})
export class OutputRendererComponent implements OnInit {
  @Input() content!: OutputContent;
  @Input() isTyping = false;

  // Computed properties for template
  get cssClasses(): string {
    const classes = ['output-renderer'];
    
    if (this.content?.formatting?.color) {
      classes.push(`color-${this.content.formatting.color}`);
    }
    
    if (this.content?.formatting?.style) {
      classes.push(`style-${this.content.formatting.style}`);
    }
    
    if (this.content?.type) {
      classes.push(`type-${this.content.type}`);
    }
    
    if (this.isTyping) {
      classes.push('typing');
    }
    
    return classes.join(' ');
  }

  get typewriterSpeed(): number {
    return this.content?.formatting?.animation?.speed || 50;
  }

  get shouldUseTypewriter(): boolean {
    return this.isTyping && 
           this.content?.formatting?.animation?.typewriter === true &&
           this.content?.type === 'text';
  }

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    // Ensure content is valid
    if (!this.content) {
      console.warn('OutputRenderer: No content provided');
      this.content = {
        content: '',
        type: 'text'
      };
    }
  }

  /**
   * Handle action button clicks
   */
  handleAction(action: any): void {
    if (action.type === 'download' && action.command) {
      // Handle download actions
      this.handleDownloadAction(action);
    } else if (action.command) {
      // Emit command for parent to handle
      // In a real implementation, this would use an EventEmitter
      console.log('Action triggered:', action);
    }
  }

  /**
   * Handle download actions
   */
  private handleDownloadAction(action: any): void {
    // Create a temporary link to trigger download
    const link = document.createElement('a');
    link.href = action.url || '#';
    link.download = action.filename || 'download';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Load next page for paginated content
   */
  loadNextPage(): void {
    // In a real implementation, this would emit an event
    console.log('Load next page requested');
  }

  /**
   * Load previous page for paginated content
   */
  loadPreviousPage(): void {
    // In a real implementation, this would emit an event
    console.log('Load previous page requested');
  }

  /**
   * Format table data for display
   */
  formatTableData(data: any[]): { headers: string[], rows: string[][] } {
    if (!Array.isArray(data) || data.length === 0) {
      return { headers: [], rows: [] };
    }

    // If data is array of objects, extract headers and rows
    if (typeof data[0] === 'object' && data[0] !== null) {
      const headers = Object.keys(data[0]);
      const rows = data.map(item => headers.map(header => String(item[header] || '')));
      return { headers, rows };
    }

    // If data is array of arrays, first row might be headers
    if (Array.isArray(data[0])) {
      return {
        headers: data[0].map(String),
        rows: data.slice(1).map(row => row.map(String))
      };
    }

    // Fallback: treat as simple list
    return {
      headers: ['Value'],
      rows: data.map(item => [String(item)])
    };
  }

  /**
   * Format list data ensuring it's an array
   */
  formatListData(data: any): string[] {
    if (Array.isArray(data)) {
      return data.map(String);
    }
    
    if (typeof data === 'string') {
      // Split by newlines if it's a multiline string
      return data.split('\n').filter(line => line.trim());
    }
    
    if (typeof data === 'object' && data !== null) {
      // Convert object to key-value pairs
      return Object.entries(data).map(([key, value]) => `${key}: ${value}`);
    }
    
    return [String(data)];
  }

  /**
   * Format JSON data for display
   */
  formatJsonData(data: any): string {
    try {
      return JSON.stringify(data, null, 2);
    } catch (error) {
      return String(data);
    }
  }

  /**
   * Get content as string for accessibility
   */
  getContentAsString(): string {
    if (typeof this.content.content === 'string') {
      return this.content.content;
    }
    
    if (Array.isArray(this.content.content)) {
      return this.content.content.join(', ');
    }
    
    if (typeof this.content.content === 'object') {
      return JSON.stringify(this.content.content);
    }
    
    return String(this.content.content);
  }

  /**
   * Check if content has pagination
   */
  get hasPagination(): boolean {
    return !!(this.content.pagination && 
              this.content.pagination.total > 1);
  }

  /**
   * Check if there are actions available
   */
  get hasActions(): boolean {
    return !!(this.content.actions && 
              this.content.actions.length > 0);
  }

  /**
   * Get ARIA label for the output
   */
  get ariaLabel(): string {
    const typeLabel = this.content.type === 'text' ? 'Text output' :
                     this.content.type === 'list' ? 'List output' :
                     this.content.type === 'table' ? 'Table output' :
                     this.content.type === 'json' ? 'JSON output' :
                     'Interactive output';
    
    const typingLabel = this.isTyping ? ' (typing)' : '';
    
    return `${typeLabel}${typingLabel}`;
  }
}