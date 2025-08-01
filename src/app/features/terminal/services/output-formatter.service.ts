import { Injectable } from '@angular/core';
import { OutputContent, OutputFormatting } from '../../../core/models/command.models';

@Injectable({
  providedIn: 'root'
})
export class OutputFormatterService {

  /**
   * Format text content with optional styling
   */
  formatText(content: string, formatting?: OutputFormatting): OutputContent {
    return {
      content: this.processTextContent(content),
      type: 'text',
      formatting
    };
  }

  /**
   * Format array data as a list
   */
  formatList(items: any[], formatting?: OutputFormatting): OutputContent {
    const processedItems = items.map(item => this.processListItem(item));
    
    return {
      content: processedItems,
      type: 'list',
      formatting
    };
  }

  /**
   * Format tabular data
   */
  formatTable(data: any[], headers?: string[], formatting?: OutputFormatting): OutputContent {
    const tableData = this.processTableData(data, headers);
    
    return {
      content: tableData,
      type: 'table',
      formatting
    };
  }

  /**
   * Format JSON data
   */
  formatJson(data: any, formatting?: OutputFormatting): OutputContent {
    return {
      content: data,
      type: 'json',
      formatting: {
        ...formatting,
        style: 'normal' // Override style for JSON
      }
    };
  }

  /**
   * Format interactive content with actions
   */
  formatInteractive(
    content: any, 
    actions: any[] = [], 
    formatting?: OutputFormatting
  ): OutputContent {
    return {
      content,
      type: 'interactive',
      formatting,
      actions: actions.map(action => this.processAction(action))
    };
  }

  /**
   * Format paginated content
   */
  formatPaginated(
    content: any,
    currentPage: number,
    totalPages: number,
    formatting?: OutputFormatting
  ): OutputContent {
    return {
      content,
      type: 'text',
      formatting,
      pagination: {
        current: currentPage,
        total: totalPages,
        hasNext: currentPage < totalPages,
        hasPrevious: currentPage > 1
      }
    };
  }

  /**
   * Format error message
   */
  formatError(message: string, suggestion?: string): OutputContent {
    return {
      content: message,
      type: 'text',
      formatting: {
        color: 'red',
        style: 'normal'
      }
    };
  }

  /**
   * Format success message
   */
  formatSuccess(message: string): OutputContent {
    return {
      content: message,
      type: 'text',
      formatting: {
        color: 'green',
        style: 'normal'
      }
    };
  }

  /**
   * Format warning message
   */
  formatWarning(message: string): OutputContent {
    return {
      content: message,
      type: 'text',
      formatting: {
        color: 'yellow',
        style: 'normal'
      }
    };
  }

  /**
   * Format info message
   */
  formatInfo(message: string): OutputContent {
    return {
      content: message,
      type: 'text',
      formatting: {
        color: 'blue',
        style: 'normal'
      }
    };
  }

  /**
   * Format command help output
   */
  formatHelp(commands: any[]): OutputContent {
    const helpText = this.buildHelpText(commands);
    
    return {
      content: helpText,
      type: 'text',
      formatting: {
        color: 'cyan',
        style: 'normal'
      }
    };
  }

  /**
   * Add typewriter animation to content
   */
  withTypewriter(content: OutputContent, speed: number = 50): OutputContent {
    return {
      ...content,
      formatting: {
        ...content.formatting,
        animation: {
          typewriter: true,
          speed
        }
      }
    };
  }

  /**
   * Add color to content
   */
  withColor(content: OutputContent, color: OutputFormatting['color']): OutputContent {
    return {
      ...content,
      formatting: {
        ...content.formatting,
        color
      }
    };
  }

  /**
   * Add style to content
   */
  withStyle(content: OutputContent, style: OutputFormatting['style']): OutputContent {
    return {
      ...content,
      formatting: {
        ...content.formatting,
        style
      }
    };
  }

  // Private helper methods

  private processTextContent(content: string): string {
    // Process special formatting markers
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
      .replace(/\*(.*?)\*/g, '<em>$1</em>') // Italic
      .replace(/`(.*?)`/g, '<code>$1</code>') // Inline code
      .replace(/\n/g, '<br>'); // Line breaks
  }

  private processListItem(item: any): string {
    if (typeof item === 'string') {
      return this.processTextContent(item);
    }
    
    if (typeof item === 'object' && item !== null) {
      if (item.text) {
        return this.processTextContent(item.text);
      }
      
      // Convert object to key-value display
      return Object.entries(item)
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ');
    }
    
    return String(item);
  }

  private processTableData(data: any[], headers?: string[]): any {
    if (!Array.isArray(data) || data.length === 0) {
      return { headers: [], rows: [] };
    }

    // If headers provided, use them
    if (headers) {
      const rows = data.map(item => {
        if (typeof item === 'object' && item !== null) {
          return headers.map(header => String(item[header] || ''));
        }
        return headers.map((_, index) => index === 0 ? String(item) : '');
      });
      
      return { headers, rows };
    }

    // Auto-detect headers from first object
    if (typeof data[0] === 'object' && data[0] !== null) {
      const detectedHeaders = Object.keys(data[0]);
      const rows = data.map(item => 
        detectedHeaders.map(header => String(item[header] || ''))
      );
      
      return { headers: detectedHeaders, rows };
    }

    // Fallback for simple arrays
    return {
      headers: ['Value'],
      rows: data.map(item => [String(item)])
    };
  }

  private processAction(action: any): any {
    return {
      id: action.id || this.generateActionId(),
      label: action.label || 'Action',
      type: action.type || 'button',
      command: action.command,
      url: action.url,
      filename: action.filename
    };
  }

  private buildHelpText(commands: any[]): string {
    if (!commands || commands.length === 0) {
      return 'No commands available.';
    }

    let helpText = 'Available commands:\n\n';
    
    // Group commands by category
    const categorized = commands.reduce((acc, cmd) => {
      const category = cmd.category || 'other';
      if (!acc[category]) acc[category] = [];
      acc[category].push(cmd);
      return acc;
    }, {});

    // Format each category
    Object.entries(categorized).forEach(([category, cmds]: [string, any]) => {
      helpText += `**${category.toUpperCase()}**\n`;
      
      cmds.forEach((cmd: any) => {
        helpText += `  ${cmd.name.padEnd(12)} - ${cmd.description}\n`;
        if (cmd.usage && cmd.usage !== cmd.name) {
          helpText += `  ${' '.repeat(12)}   Usage: ${cmd.usage}\n`;
        }
      });
      
      helpText += '\n';
    });

    helpText += 'Type any command to get started, or use Tab for auto-completion.';
    
    return helpText;
  }

  private generateActionId(): string {
    return 'action-' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Truncate content if too long
   */
  truncateContent(content: string, maxLength: number = 1000): string {
    if (content.length <= maxLength) return content;
    
    return content.substring(0, maxLength - 3) + '...';
  }

  /**
   * Sanitize HTML content
   */
  sanitizeHtml(content: string): string {
    return content
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Format duration in human-readable format
   */
  formatDuration(milliseconds: number): string {
    if (milliseconds < 1000) {
      return `${milliseconds}ms`;
    }
    
    if (milliseconds < 60000) {
      return `${(milliseconds / 1000).toFixed(1)}s`;
    }
    
    const minutes = Math.floor(milliseconds / 60000);
    const seconds = Math.floor((milliseconds % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  }

  /**
   * Format file size in human-readable format
   */
  formatFileSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)}${units[unitIndex]}`;
  }
}