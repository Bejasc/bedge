import { Logger } from '../logger';
import { LoggerConfig, LogEntry, LogLevel, LogExtra } from '../types';

/**
 * Mock logger for testing purposes
 * Captures all log entries instead of outputting them
 */
export class MockLogger extends Logger {
	public logs: LogEntry[] = [];
	private sharedLogs?: LogEntry[]; // Reference to parent's logs array
	private contextExtra?: LogExtra; // Context for child loggers
	private correlationId?: string; // Correlation ID for tracing

	constructor(projectName: string = 'test', sharedLogs?: LogEntry[], contextExtra?: LogExtra, correlationId?: string) {
		super({
			projectName,
			targets: {
				console: { enabled: false, minLevel: LogLevel.VERBOSE },
				file: { enabled: false, minLevel: LogLevel.VERBOSE, path: '' },
			},
		});
		
		this.sharedLogs = sharedLogs;
		this.contextExtra = contextExtra;
		this.correlationId = correlationId;
	}

	/**
	 * Override log method to capture entries instead of outputting them
	 */
	protected override log(level: LogLevel, title: string, message?: string, error?: Error, extra?: LogExtra, customType?: string): void {
		// Merge context if this is a child logger
		const mergedExtra = this.contextExtra ? { ...extra, ...this.contextExtra } : extra;

		const entry: LogEntry = {
			timestamp: new Date(),
			level,
			projectName: this.config.projectName,
			environment: this.config.environment,
			projectColor: this.config.projectColor,
			title,
			message: message || '',
			error,
			extra: mergedExtra,
			customType,
			correlationId: this.correlationId,
		};

		// Push to shared logs if available (for child loggers), otherwise use own logs
		const targetLogs = this.sharedLogs || this.logs;
		targetLogs.push(entry);
	}

	/**
	 * Override child method to create child MockLogger that shares the same logs array
	 */
	override child(additionalContext: LogExtra): MockLogger {
		const targetLogs = this.sharedLogs || this.logs;
		return new MockLogger(this.config.projectName, targetLogs, additionalContext, this.correlationId);
	}

	/**
	 * Override withCorrelationId method to create MockLogger with correlation ID
	 */
	override withCorrelationId(correlationId: string): MockLogger {
		const targetLogs = this.sharedLogs || this.logs;
		return new MockLogger(this.config.projectName, targetLogs, this.contextExtra, correlationId);
	}

	/**
	 * Clears all captured log entries
	 */
	clear(): void {
		this.logs = [];
	}

	/**
	 * Gets all captured log entries, optionally filtered by level
	 * @param level Optional log level to filter by
	 * @returns Array of log entries
	 */
	getLogs(level?: LogLevel): LogEntry[] {
		return level !== undefined 
			? this.logs.filter(l => l.level === level)
			: this.logs;
	}

	/**
	 * Gets the count of logs at a specific level
	 * @param level Log level to count
	 * @returns Number of logs at that level
	 */
	getLogCount(level?: LogLevel): number {
		return this.getLogs(level).length;
	}

	/**
	 * Checks if a log with specific criteria exists
	 * @param title Log title to search for
	 * @param level Optional log level filter
	 * @returns True if a matching log exists
	 */
	hasLog(title: string, level?: LogLevel): boolean {
		const logs = this.getLogs(level);
		return logs.some(log => log.title === title);
	}

	/**
	 * Gets the last log entry
	 * @returns Last log entry or undefined if no logs
	 */
	getLastLog(): LogEntry | undefined {
		return this.logs[this.logs.length - 1];
	}
}

/**
 * Creates a mock logger for testing
 * @param projectName Optional project name (default: 'test')
 * @returns MockLogger instance
 */
export function createMockLogger(projectName: string = 'test'): MockLogger {
	return new MockLogger(projectName);
}
