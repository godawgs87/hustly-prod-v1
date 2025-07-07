/**
 * Centralized logging utility to replace scattered console.log statements
 * with a consistent, configurable logging system
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  component?: string;
  action?: string;
  data?: any;
}

class Logger {
  private isDevelopment = import.meta.env.DEV;

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString().substring(11, 23);
    const prefix = `[${timestamp}] ${level.toUpperCase()}`;
    
    if (context?.component) {
      return `${prefix} [${context.component}] ${message}`;
    }
    
    return `${prefix} ${message}`;
  }

  debug(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      console.log(this.formatMessage('debug', message, context), context?.data || '');
    }
  }

  info(message: string, context?: LogContext): void {
    console.info(this.formatMessage('info', message, context), context?.data || '');
  }

  warn(message: string, context?: LogContext): void {
    console.warn(this.formatMessage('warn', message, context), context?.data || '');
  }

  error(message: string, error?: Error | any, context?: LogContext): void {
    console.error(this.formatMessage('error', message, context), error || '', context?.data || '');
  }

  // Specialized methods for common use cases
  auth(message: string, data?: any): void {
    this.info(message, { component: 'Auth', data });
  }

  ebay(message: string, data?: any): void {
    this.info(message, { component: 'eBay', data });
  }

  listing(message: string, data?: any): void {
    this.debug(message, { component: 'Listing', data });
  }

  upload(message: string, data?: any): void {
    this.info(message, { component: 'Upload', data });
  }

  api(message: string, data?: any): void {
    this.debug(message, { component: 'API', data });
  }
}

export const logger = new Logger();