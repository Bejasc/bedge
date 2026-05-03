import * as fs from 'fs';
import * as path from 'path';
import { LogEntry, LogLevel, LOG_LEVEL_NAMES, FileLogFormat } from '../types';

const DEFAULT_MAX_CONSECUTIVE_ERRORS = 5;

/**
 * File logging target with rotation support
 */
export class FileTarget {
	private readonly filePath: string;
	private readonly maxSize: number;
	private readonly maxFiles: number;
	private readonly minLevel: LogLevel;
	private readonly format: FileLogFormat;
	private writeErrorCount: number = 0;
	private readonly maxConsecutiveErrors: number;
	private hasEmittedWarning: boolean = false;
	private isDisabled: boolean = false;
	private readonly debug: boolean;
	
	// Write queue to prevent race conditions
	private writeQueue: Promise<void> = Promise.resolve();

	constructor(
		filePath: string,
		minLevel: LogLevel = LogLevel.INFO,
		maxSize: number = 10 * 1024 * 1024, // 10MB default
		maxFiles: number = 5,
		format: FileLogFormat = 'text',
		maxConsecutiveErrors: number = DEFAULT_MAX_CONSECUTIVE_ERRORS,
		debug: boolean = false
	) {
		// Validate inputs
		if (!filePath || filePath.trim() === '') {
			throw new Error('[Logger] FileTarget: filePath cannot be empty');
		}
		if (maxSize <= 0) {
			throw new Error('[Logger] FileTarget: maxSize must be positive');
		}
		if (maxFiles < 1) {
			throw new Error('[Logger] FileTarget: maxFiles must be at least 1');
		}
		if (maxConsecutiveErrors < 1) {
			throw new Error('[Logger] FileTarget: maxConsecutiveErrors must be at least 1');
		}

		this.filePath = filePath;
		this.minLevel = minLevel;
		this.maxSize = maxSize;
		this.maxFiles = maxFiles;
		this.format = format;
		this.maxConsecutiveErrors = maxConsecutiveErrors;
		this.debug = debug;

		// Ensure directory exists
		this.ensureDirectoryExists();
	}

	/**
	 * Writes a log entry to file
	 * @param entry Log entry to write
	 */
	async write(entry: LogEntry): Promise<void> {
		// Filter out logs below minimum level (higher minLevel values filter out lower priority logs)
		if (entry.level < this.minLevel) {
			return;
		}

		// Circuit breaker: skip if target is disabled
		if (this.isDisabled) {
			return;
		}

		// Queue the write to prevent race conditions
		this.writeQueue = this.writeQueue.then(() => this.performWrite(entry));
		return this.writeQueue;
	}

	/**
	 * Performs the actual write operation (called sequentially via queue)
	 * @param entry Log entry to write
	 */
	private async performWrite(entry: LogEntry): Promise<void> {
		// Check if we need to rotate the log file
		await this.rotateIfNeeded();

		const logLine = this.format === 'json' 
			? this.formatAsJson(entry)
			: this.formatAsText(entry);
		
		try {
			await fs.promises.appendFile(this.filePath, logLine + '\n', 'utf8');
			// Reset error count on successful write
			this.writeErrorCount = 0;
		} catch (writeError) {
			this.writeErrorCount++;
			
			// Circuit breaker: disable target after max consecutive errors
			if (this.writeErrorCount >= this.maxConsecutiveErrors) {
				this.isDisabled = true;
				
				if (!this.hasEmittedWarning) {
					console.error(`[Logger] File target disabled after ${this.writeErrorCount} consecutive failures: ${this.filePath}`);
					console.error('[Logger] File logging has been disabled. Error:', writeError);
					this.hasEmittedWarning = true;
				}
			}
		}
	}

	/**
	 * Formats log entry as human-readable text with fixed-width columns
	 * @param entry Log entry to format
	 * @returns Formatted string
	 */
	private formatAsText(entry: LogEntry): string {
		const timestamp = entry.timestamp.toISOString();
		const level = this.getLevelName(entry.level).padEnd(7); // VERBOSE is longest at 7 chars
		const project = entry.projectName.padEnd(15); // Reasonable padding for project name
		const env = entry.environment ? entry.environment.padEnd(12) : ''.padEnd(12);
		
		// Format title with fixed width (25 chars including brackets)
		// Truncate if too long (with ellipsis), pad if too short
		const maxTitleWidth = 25;
		const titleContent = entry.title.length > maxTitleWidth - 2 
			? entry.title.substring(0, maxTitleWidth - 5) + '...'
			: entry.title;
		const title = `[${titleContent}]`.padEnd(maxTitleWidth);
		
		const message = entry.message || '';
		
		// Base log line with fixed-width columns
		let line = `${timestamp} | ${level} | ${project} | ${env} | ${title} ${message}`;
		
		// Add custom type if present
		if (entry.customType) {
			line += ` | type=${entry.customType}`;
		}
		
		// Add extra data as key=value pairs
		if (entry.extra && Object.keys(entry.extra).length > 0) {
			const extraPairs = Object.entries(entry.extra)
				.map(([key, value]) => {
					// Format value based on type
					if (typeof value === 'string' && value.includes(' ')) {
						return `${key}="${value}"`;
					}
					return `${key}=${value}`;
				})
				.join(' ');
			line += ` | ${extraPairs}`;
		}
		
		// Add error information on the same line (compact format)
		if (entry.error) {
			line += ` | error="${entry.error.name}: ${entry.error.message}"`;
			// Add first line of stack trace for context
			if (entry.error.stack) {
				const firstStackLine = entry.error.stack.split('\n')[1]?.trim();
				if (firstStackLine) {
					line += ` at=${firstStackLine}`;
				}
			}
		}
		
		return line;
	}

	/**
	 * Formats log entry as JSON (for ELK/Datadog/log aggregation systems)
	 * @param entry Log entry to format
	 * @returns Formatted JSON string
	 */
	private formatAsJson(entry: LogEntry): string {
		const fileEntry = {
			timestamp: entry.timestamp.toISOString(),
			level: entry.level,
			levelName: this.getLevelName(entry.level),
			projectName: entry.projectName,
			environment: entry.environment,
			title: entry.title,
			message: entry.message,
			customType: entry.customType,
			extra: entry.extra,
			error: entry.error ? {
				name: entry.error.name,
				message: entry.error.message,
				stack: entry.error.stack,
			} : undefined,
		};

		return JSON.stringify(fileEntry);
	}

	/**
	 * Gets the level name for a log level
	 * @param level Log level
	 * @returns Level name
	 */
	private getLevelName(level: LogLevel): string {
		return LOG_LEVEL_NAMES[level] || 'UNKNOWN';
	}

	/**
	 * Ensures the log directory exists and has write permissions
	 */
	private ensureDirectoryExists(): void {
		const dir = path.dirname(this.filePath);
		if (!fs.existsSync(dir)) {
			try {
				fs.mkdirSync(dir, { recursive: true });
			} catch (error) {
				console.error(`[Logger] Failed to create log directory: ${dir}`, error);
				throw error;
			}
		}
		
		// Verify write permissions
		try {
			fs.accessSync(dir, fs.constants.W_OK);
		} catch (error) {
			console.warn(`[Logger] No write permission for log directory: ${dir}`);
			if (this.debug) {
				console.debug('[Logger] Permission check error:', error);
			}
		}
	}

	/**
	 * Rotates log files if the current file exceeds max size
	 */
	private async rotateIfNeeded(): Promise<void> {
		try {
			const stats = await fs.promises.stat(this.filePath);
			if (stats.size >= this.maxSize) {
				await this.rotateFiles();
			}
		} catch (error) {
			// File doesn't exist yet on first write - no rotation needed
			if (this.debug && (error as NodeJS.ErrnoException).code !== 'ENOENT') {
				console.debug('[Logger] Rotation check error:', error);
			}
		}
	}

	/**
	 * Rotates log files sequentially to avoid file conflicts
	 */
	private async rotateFiles(): Promise<void> {
		const dir = path.dirname(this.filePath);
		const ext = path.extname(this.filePath);
		const baseName = path.basename(this.filePath, ext);

		// Remove the oldest file if we're at max files
		const oldestFile = path.join(dir, `${baseName}.${this.maxFiles - 1}${ext}`);
		try {
			await fs.promises.unlink(oldestFile);
		} catch (error) {
			// Oldest rotated file might not exist yet
			if (this.debug && (error as NodeJS.ErrnoException).code !== 'ENOENT') {
				console.debug('[Logger] Failed to delete oldest log file:', error);
			}
		}

		// Rotate files sequentially from highest to lowest to avoid overwrites
		for (let i = this.maxFiles - 2; i >= 0; i--) {
			const currentFile = i === 0 
				? this.filePath 
				: path.join(dir, `${baseName}.${i}${ext}`);
			const nextFile = path.join(dir, `${baseName}.${i + 1}${ext}`);

			try {
				await fs.promises.rename(currentFile, nextFile);
			} catch (error) {
				// Intermediate rotated files might not exist yet
				if (this.debug && (error as NodeJS.ErrnoException).code !== 'ENOENT') {
					console.debug(`[Logger] Failed to rotate ${currentFile}:`, error);
				}
			}
		}
	}

	/**
	 * Reads log entries from file
	 * Note: Only works with JSON format logs. Text format logs cannot be parsed back into LogEntry objects.
	 * @param maxLines Maximum number of lines to read
	 * @returns Array of log entries
	 * @throws Error if file format is not JSON
	 */
	async readLogs(maxLines: number = 100): Promise<LogEntry[]> {
		if (this.format !== 'json') {
			throw new Error(
				`readLogs() only supports JSON format. Current format is '${this.format}'. ` +
				`To read logs, either use JSON format or read the file directly as text.`
			);
		}

		try {
			const content = await fs.promises.readFile(this.filePath, 'utf8');
			const lines = content.trim().split('\n').slice(-maxLines);
			
			return lines
				.filter(line => line.trim())
				.map(line => {
					try {
						const parsed = JSON.parse(line);
						return {
							...parsed,
							timestamp: new Date(parsed.timestamp),
							error: parsed.error ? Object.assign(new Error(parsed.error.message), parsed.error) : undefined,
						} as LogEntry;
					} catch (parseError) {
						// Skip malformed JSON lines
						console.warn('[Logger] Failed to parse log line:', parseError);
						return null;
					}
				})
				.filter((entry): entry is LogEntry => entry !== null);
		} catch (readError) {
			// File doesn't exist or isn't readable
			if ((readError as NodeJS.ErrnoException).code === 'ENOENT') {
				return []; // File doesn't exist yet - expected for new loggers
			}
			throw readError; // Unexpected error - propagate it
		}
	}

	/**
	 * Checks if the file target is healthy and can write
	 * @returns Health check result with status and details
	 */
	async healthCheck(): Promise<{ healthy: boolean; consecutiveErrors: number; filePath: string; disabled: boolean }> {
		return {
			healthy: !this.isDisabled && this.writeErrorCount < this.maxConsecutiveErrors,
			consecutiveErrors: this.writeErrorCount,
			filePath: this.filePath,
			disabled: this.isDisabled,
		};
	}

	/**
	 * Flushes any pending writes to disk
	 * Waits for all queued writes to complete
	 */
	async flush(): Promise<void> {
		await this.writeQueue;
	}

	/**
	 * Closes the file target
	 * Note: Since we use appendFile instead of streams, there's nothing to close
	 * This method exists for API consistency with other targets
	 */
	async close(): Promise<void> {
		// No persistent file handles to close since we use appendFile
		return Promise.resolve();
	}
}
