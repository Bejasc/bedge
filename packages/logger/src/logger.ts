import { CustomLogType, LogColor, LogEntry, LogExtra, LogLevel, LoggerConfig } from "./types";

import { ConsoleTarget } from "./targets/console-target";
import { DiscordTarget } from "./targets/discord-target";
import { FileTarget } from "./targets/file-target";

/**
 * Main Logger class that provides comprehensive logging functionality
 */
export class Logger {
	protected readonly config: LoggerConfig;
	protected readonly consoleTarget?: ConsoleTarget;
	protected readonly fileTarget?: FileTarget;
	protected readonly discordTarget?: DiscordTarget;
	protected readonly customTypes: Map<string, CustomLogType> = new Map();

	constructor(config: LoggerConfig, customTypes?: Map<string, CustomLogType>) {
		this.config = config;
		this.customTypes = customTypes || new Map();

		// Initialize targets based on configuration
		if (config.targets.console?.enabled) {
			const showExtraData = config.targets.console.showExtraData ?? true;
			this.consoleTarget = new ConsoleTarget(config.targets.console.minLevel, config.projectColor, showExtraData);
		}

		if (config.targets.file?.enabled) {
			this.fileTarget = new FileTarget(
				config.targets.file.path, 
				config.targets.file.minLevel, 
				config.targets.file.maxSize, 
				config.targets.file.maxFiles,
				config.targets.file.format || 'text',
				undefined, // maxConsecutiveErrors - use default
				config.debug || false
			);
		}

		if (config.targets.discord?.enabled) {
			this.discordTarget = new DiscordTarget(config.targets.discord.webhook, config.targets.discord.minLevel, config.targets.discord.perLevelWebhooks);
		}
	}

	/**
	 * Logs a verbose message
	 * @param title Log title
	 * @param message Log message
	 * @param extra Extra information
	 */
	verbose(title: string, message?: string, extra?: LogExtra): void {
		this.log(LogLevel.VERBOSE, title, message, undefined, extra);
	}

	/**
	 * Logs a debug message
	 * @param title Log title
	 * @param message Log message
	 * @param extra Extra information
	 */
	debug(title: string, message?: string, extra?: LogExtra): void {
		this.log(LogLevel.DEBUG, title, message, undefined, extra);
	}

	/**
	 * Logs an info message
	 * @param title Log title
	 * @param message Log message
	 * @param extra Extra information
	 */
	info(title: string, message?: string, extra?: LogExtra): void {
		this.log(LogLevel.INFO, title, message, undefined, extra);
	}

	/**
	 * Logs a warning message
	 * @param title Log title
	 * @param message Log message
	 * @param extra Extra information
	 */
	warn(title: string, message?: string, extra?: LogExtra): void {
		this.log(LogLevel.WARN, title, message, undefined, extra);
	}

	/**
	 * Logs an error message
	 * @param title Log title
	 * @param messageOrError Log message or Error object
	 * @param errorOrExtra Error object or extra data (if messageOrError is a string)
	 * @param extra Extra information (only used if messageOrError is a string and errorOrExtra is an Error)
	 * @example
	 * logger.error('Failed', 'Connection timeout');
	 * logger.error('Failed', err);
	 * logger.error('Failed', 'DB error', err);
	 * logger.error('Failed', 'DB error', err, { query: 'SELECT *' });
	 * logger.error('Failed', 'Connection timeout', { host: 'localhost' });
	 */
	error(title: string, messageOrError?: string | Error, errorOrExtra?: Error | LogExtra, extra?: LogExtra): void {
		const { message, error, finalExtra } = this.parseErrorParams(messageOrError, errorOrExtra, extra);
		this.log(LogLevel.ERROR, title, message, error, finalExtra);
	}

	/**
	 * Logs a fatal message
	 * @param title Log title
	 * @param messageOrError Log message or Error object
	 * @param errorOrExtra Error object or extra data (if messageOrError is a string)
	 * @param extra Extra information (only used if messageOrError is a string and errorOrExtra is an Error)
	 * @example
	 * logger.fatal('Crashed', 'Out of memory');
	 * logger.fatal('Crashed', err);
	 * logger.fatal('Crashed', 'Critical failure', err);
	 * logger.fatal('Crashed', 'Critical failure', err, { pid: 1234 });
	 * logger.fatal('Crashed', 'Out of memory', { pid: 1234 });
	 */
	fatal(title: string, messageOrError?: string | Error, errorOrExtra?: Error | LogExtra, extra?: LogExtra): void {
		const { message, error, finalExtra } = this.parseErrorParams(messageOrError, errorOrExtra, extra);
		this.log(LogLevel.FATAL, title, message, error, finalExtra);
	}

	/**
	 * Parses flexible error/fatal method parameters into structured format
	 * @param messageOrError Log message or Error object
	 * @param errorOrExtra Error object or extra data
	 * @param extra Extra information
	 * @returns Parsed parameters
	 */
	private parseErrorParams(
		messageOrError?: string | Error, 
		errorOrExtra?: Error | LogExtra, 
		extra?: LogExtra
	): { message?: string; error?: Error; finalExtra?: LogExtra } {
		let message: string | undefined;
		let error: Error | undefined;
		let finalExtra: LogExtra | undefined;

		if (typeof messageOrError === 'string') {
			message = messageOrError;
			if (errorOrExtra instanceof Error) {
				error = errorOrExtra;
				finalExtra = extra;
			} else {
				finalExtra = errorOrExtra;
			}
		} else if (messageOrError instanceof Error) {
			error = messageOrError;
			message = messageOrError.message;
			finalExtra = errorOrExtra as LogExtra;
		}

		return { message, error, finalExtra };
	}

	/**
	 * Logs with a custom type
	 * @param customType Custom log type name
	 * @param title Log title
	 * @param message Log message
	 * @param extra Extra information
	 */
	custom(customType: string, title: string, message?: string, extra?: LogExtra): void {
		const customTypeConfig = this.customTypes.get(customType);
		const level = customTypeConfig?.level || LogLevel.INFO;

		this.log(level, title, message, undefined, extra, customType);
	}

	/**
	 * Registers a custom log type
	 * @param customType Custom log type configuration
	 */
	registerCustomType(customType: CustomLogType): void {
		this.customTypes.set(customType.name, customType);
	}

	/**
	 * Core logging method - fire and forget with proper error handling
	 * @param level Log level
	 * @param title Log title
	 * @param message Log message
	 * @param error Error object
	 * @param extra Extra information
	 * @param customType Custom type name
	 */
	protected log(level: LogLevel, title: string, message?: string, error?: Error, extra?: LogExtra, customType?: string): void {
		const entry: LogEntry = {
			timestamp: new Date(),
			level,
			projectName: this.config.projectName,
			environment: this.config.environment,
			projectColor: this.config.projectColor,
			title,
			message: message || undefined,
			error,
			extra,
			customType,
		};

		// Console target is synchronous - write immediately
		if (this.consoleTarget) {
			try {
				this.consoleTarget.write(entry);
			} catch (err) {
				// Fallback to basic console if console target fails
				console.error('[Logger] Console target error:', err);
			}
		}

		// Fire and forget async targets
		const promises: Promise<void>[] = [];

		if (this.fileTarget) {
			promises.push(this.fileTarget.write(entry));
		}

		if (this.discordTarget) {
			promises.push(this.discordTarget.send(entry));
		}

		// Handle async operations without blocking
		if (promises.length > 0) {
			Promise.all(promises).catch((err) => {
				// Log errors using console target if available, otherwise fallback to console.error
				if (this.consoleTarget) {
					try {
						this.consoleTarget.write({
							timestamp: new Date(),
							level: LogLevel.ERROR,
							projectName: this.config.projectName,
							environment: this.config.environment,
							projectColor: this.config.projectColor,
							title: 'Logger Error',
							message: 'Async target failed',
							error: err instanceof Error ? err : new Error(String(err)),
						});
					} catch (consoleError) {
						// Last resort: direct console.error if console target also fails
						console.error('[Logger] Async target error:', err);
						if (this.config.debug) {
							console.debug('[Logger] Console target also failed:', consoleError);
						}
					}
				} else {
					console.error('[Logger] Async target error:', err);
				}
			});
		}
	}


	/**
	 * Checks if a specific log level is enabled on any target
	 * @param level Log level to check
	 * @returns True if the level would be logged by at least one target
	 */
	isLevelEnabled(level: LogLevel): boolean {
		const consoleEnabled = !!(this.consoleTarget && level >= (this.config.targets.console?.minLevel ?? Infinity));
		const fileEnabled = !!(this.fileTarget && level >= (this.config.targets.file?.minLevel ?? Infinity));
		const discordEnabled = !!(this.discordTarget && level >= (this.config.targets.discord?.minLevel ?? Infinity));
		
		return consoleEnabled || fileEnabled || discordEnabled;
	}

	/**
	 * Check if VERBOSE level logging is enabled
	 * @returns True if verbose logs would be output
	 */
	isVerboseEnabled(): boolean {
		return this.isLevelEnabled(LogLevel.VERBOSE);
	}

	/**
	 * Check if DEBUG level logging is enabled
	 * @returns True if debug logs would be output
	 */
	isDebugEnabled(): boolean {
		return this.isLevelEnabled(LogLevel.DEBUG);
	}

	/**
	 * Check if INFO level logging is enabled
	 * @returns True if info logs would be output
	 */
	isInfoEnabled(): boolean {
		return this.isLevelEnabled(LogLevel.INFO);
	}

	/**
	 * Check if WARN level logging is enabled
	 * @returns True if warn logs would be output
	 */
	isWarnEnabled(): boolean {
		return this.isLevelEnabled(LogLevel.WARN);
	}

	/**
	 * Check if ERROR level logging is enabled
	 * @returns True if error logs would be output
	 */
	isErrorEnabled(): boolean {
		return this.isLevelEnabled(LogLevel.ERROR);
	}

	/**
	 * Check if FATAL level logging is enabled
	 * @returns True if fatal logs would be output
	 */
	isFatalEnabled(): boolean {
		return this.isLevelEnabled(LogLevel.FATAL);
	}

	/**
	 * Creates a child logger with additional context
	 * @param additionalContext Additional context to add to all logs
	 * @returns New child logger instance
	 */
	child(additionalContext: LogExtra): Logger {
		return new ChildLogger(this.config, additionalContext, this.customTypes);
	}

	/**
	 * Creates a logger with a correlation ID for distributed tracing
	 * All logs from this logger will include the correlation ID
	 * @param correlationId Correlation ID to attach to all logs
	 * @returns New logger instance with correlation ID
	 * @example
	 * const requestLogger = logger.withCorrelationId('req-123');
	 * requestLogger.info('Processing', 'Started');  // Includes correlationId: 'req-123'
	 */
	withCorrelationId(correlationId: string): Logger {
		return new CorrelationLogger(this.config, correlationId, this.customTypes);
	}

	/**
	 * Creates a timer for measuring operation duration
	 * @param label Label for the operation being timed
	 * @param level Log level for the timing message (default: DEBUG)
	 * @returns Object with end() and cancel() methods
	 * @example
	 * const timer = logger.time('Database Query');
	 * try {
	 *   await db.query();
	 *   timer.end(); // Logs: [DEBUG] Timer: Database Query completed { duration: "125ms" }
	 * } catch (err) {
	 *   timer.end({ error: err }); // Logs with error info
	 * }
	 */
	time(label: string, level: LogLevel = LogLevel.DEBUG): { end: (extra?: LogExtra) => void; cancel: () => void } {
		const start = Date.now();
		let ended = false;

		return {
			end: (extra?: LogExtra) => {
				if (ended) {
					if (this.config.debug) {
						console.warn(`[Logger] Timer "${label}" already ended`);
					}
					return;
				}
				ended = true;
				const duration = Date.now() - start;
				this.log(level, 'Timer', `${label} completed`, undefined, { 
					duration: `${duration}ms`,
					...extra 
				});
			},
			cancel: () => {
				if (ended) {
					if (this.config.debug) {
						console.warn(`[Logger] Timer "${label}" already ended`);
					}
					return;
				}
				ended = true;
				if (this.config.debug) {
					console.debug(`[Logger] Timer "${label}" cancelled after ${Date.now() - start}ms`);
				}
			}
		};
	}

	/**
	 * Tests all configured targets
	 * @returns Object with test results for each target
	 */
	async testTargets(): Promise<{ console: boolean; file: boolean; discord: boolean }> {
		const results = {
			console: false,
			file: false,
			discord: false,
		};

		// Test console target
		if (this.consoleTarget) {
			try {
				this.consoleTarget.write({
					timestamp: new Date(),
					level: LogLevel.INFO,
					projectName: this.config.projectName,
					environment: this.config.environment,
					projectColor: this.config.projectColor,
					title: "Logger Test",
					message: "Console logging is working",
				});
				results.console = true;
			} catch (error) {
				results.console = false;
				if (this.config.debug) {
					console.debug('[Logger] Console target test failed:', error);
				}
			}
		}

		// Test file target
		if (this.fileTarget) {
			try {
				await this.fileTarget.write({
					timestamp: new Date(),
					level: LogLevel.INFO,
					projectName: this.config.projectName,
					environment: this.config.environment,
					projectColor: this.config.projectColor,
					title: "Logger Test",
					message: "File logging is working",
				});
				results.file = true;
			} catch (error) {
				results.file = false;
				if (this.config.debug) {
					console.debug('[Logger] File target test failed:', error);
				}
			}
		}

		// Test Discord target
		if (this.discordTarget) {
			results.discord = await this.discordTarget.testConnection();
		}

		return results;
	}

	/**
	 * Writes a separator line to console
	 */
	separator(): void {
		if (this.consoleTarget) {
			this.consoleTarget.writeSeparator();
		}
	}

	/**
	 * Writes a header to console output
	 * @param text Header text
	 * @param color Optional color (defaults to project color or white)
	 * @param includeTimestamp Whether to include timestamp and project name (default: true)
	 */
	header(text: string, color?: LogColor | string, includeTimestamp: boolean = true): void {
		if (this.consoleTarget) {
			this.consoleTarget.writeHeader(text, color, includeTimestamp, this.config.projectName, this.config.projectColor);
		}
	}

	/**
	 * Flushes all pending log writes across all targets
	 * Waits for async operations (file writes, Discord webhooks) to complete
	 * @example
	 * logger.error('Critical', { message: 'App crashed' });
	 * await logger.flush(); // Ensure error is written before exit
	 * process.exit(1);
	 */
	async flush(): Promise<void> {
		const promises: Promise<void>[] = [];

		if (this.fileTarget) {
			promises.push(this.fileTarget.flush());
		}

		if (this.discordTarget) {
			promises.push(this.discordTarget.flush());
		}

		await Promise.all(promises);
	}

	/**
	 * Closes all logging targets and releases resources
	 * Should be called before application shutdown
	 */
	async close(): Promise<void> {
		await this.flush(); // Ensure all pending writes complete

		if (this.fileTarget) {
			await this.fileTarget.close();
		}
		// Discord target has no resources to close beyond flushing
	}

	/**
	 * Gets health status for all configured targets
	 * @returns Health information for console, file, and discord targets
	 */
	async getHealth(): Promise<{
		console: { enabled: boolean };
		file: { enabled: boolean; healthy: boolean; consecutiveErrors: number; filePath: string; disabled: boolean } | { enabled: false };
		discord: { enabled: boolean; pendingRequests: number; droppedRequests: number } | { enabled: false };
	}> {
		return {
			console: {
				enabled: !!this.consoleTarget,
			},
			file: this.fileTarget
				? {
					enabled: true,
					...(await this.fileTarget.healthCheck()),
				}
				: { enabled: false },
			discord: this.discordTarget
				? {
					enabled: true,
					pendingRequests: this.discordTarget.getPendingCount(),
					droppedRequests: this.discordTarget.getDroppedCount(),
				}
				: { enabled: false },
		};
	}
}

/**
 * Child logger that adds persistent context to all log entries
 */
class ChildLogger extends Logger {
	constructor(
		config: LoggerConfig,
		private readonly contextExtra: LogExtra,
		customTypes: Map<string, CustomLogType>
	) {
		super(config, customTypes);
	}

	/**
	 * Override log method to merge context into all logs
	 * Child context is immutable and takes precedence over log-level extra data
	 */
	protected override log(level: LogLevel, title: string, message?: string, error?: Error, extra?: LogExtra, customType?: string): void {
		const mergedExtra = { ...extra, ...this.contextExtra };
		super.log(level, title, message, error, mergedExtra, customType);
	}
}

/**
 * Logger with correlation ID for distributed tracing
 */
class CorrelationLogger extends Logger {
	constructor(
		config: LoggerConfig,
		private readonly correlationId: string,
		customTypes: Map<string, CustomLogType>
	) {
		super(config, customTypes);
	}

	/**
	 * Override log method to add correlation ID to all logs
	 */
	protected override log(level: LogLevel, title: string, message?: string, error?: Error, extra?: LogExtra, customType?: string): void {
		const entry: LogEntry = {
			timestamp: new Date(),
			level,
			projectName: this.config.projectName,
			environment: this.config.environment,
			projectColor: this.config.projectColor,
			title,
			message: message || undefined,
			error,
			extra,
			customType,
			correlationId: this.correlationId,
		};

		// Console target is synchronous - write immediately
		if (this.consoleTarget) {
			try {
				this.consoleTarget.write(entry);
			} catch (err) {
				// Fallback to basic console if console target fails
				console.error('[Logger] Console target error:', err);
			}
		}

		// Fire and forget async targets
		const promises: Promise<void>[] = [];

		if (this.fileTarget) {
			promises.push(this.fileTarget.write(entry));
		}

		if (this.discordTarget) {
			promises.push(this.discordTarget.send(entry));
		}

		// Handle async operations without blocking
		if (promises.length > 0) {
			Promise.all(promises).catch((err) => {
				// Log errors using console target if available, otherwise fallback to console.error
				if (this.consoleTarget) {
					try {
						this.consoleTarget.write({
							timestamp: new Date(),
							level: LogLevel.ERROR,
							projectName: this.config.projectName,
							environment: this.config.environment,
							projectColor: this.config.projectColor,
							title: 'Logger Error',
							message: 'Async target failed',
							error: err instanceof Error ? err : new Error(String(err)),
							correlationId: this.correlationId,
						});
					} catch (consoleError) {
						// Last resort: direct console.error if console target also fails
						console.error('[Logger] Async target error:', err);
						if (this.config.debug) {
							console.debug('[Logger] Console target also failed:', consoleError);
						}
					}
				} else {
					console.error('[Logger] Async target error:', err);
				}
			});
		}
	}
}
