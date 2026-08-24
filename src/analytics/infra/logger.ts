/** Structured detail attached to a log line. */
export type AnalyticsLogDetails = object;

export interface AnalyticsLogger {
  debug(message: string, details?: AnalyticsLogDetails): void;
  warn(message: string, details?: AnalyticsLogDetails): void;
  error(message: string, details?: AnalyticsLogDetails): void;
}

export interface ConsoleAnalyticsLoggerOptions {
  /** When `true`, `debug` is emitted (the debug-mode tracer). */
  readonly verbose: boolean;
}

const PREFIX = "[BASS Analytics]";

export class ConsoleAnalyticsLogger implements AnalyticsLogger {
  constructor(private readonly options: ConsoleAnalyticsLoggerOptions) {}

  debug(message: string, details?: AnalyticsLogDetails): void {
    if (this.options.verbose) this.write("debug", message, details);
  }
  warn(message: string, details?: AnalyticsLogDetails): void {
    this.write("warn", message, details);
  }
  error(message: string, details?: AnalyticsLogDetails): void {
    this.write("error", message, details);
  }

  private write(
    level: "debug" | "warn" | "error",
    message: string,
    details?: AnalyticsLogDetails,
  ): void {
    try {
      const line = `${PREFIX} ${message}`;
      if (details === undefined) console[level](line);
      else console[level](line, details);
    } catch {
      // Never let logging break the caller.
    }
  }
}

export class NoopAnalyticsLogger implements AnalyticsLogger {
  debug(): void {
    // Intentionally no-op.
  }
  warn(): void {
    // Intentionally no-op.
  }
  error(): void {
    // Intentionally no-op.
  }
}
