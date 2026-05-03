/**
 * @module @beyondorbit/logger
 *
 * Structured logging utility with console, file, and Discord targets.
 * Environment-based configuration via `createLogger`. Used by the API
 * and any service that needs observable output.
 *
 * **Aggregates:** (none — utility package)
 * **Key use cases:** (none — provides Logger and factory)
 * **Emits:** (none)
 * **Ports:** (none)
 * **Depends on:** none
 */

// --- Core ---
export { Logger } from './logger';
export { LoggerFactory } from './config/logger-factory';

// Re-export validateConfig for manual validation
export { LoggerFactory as validateLoggerConfig } from './config/logger-factory';

// --- Types ---
export {
	LogLevel,
	LogColor,
	LogEntry,
	LoggerConfig,
	LogTargetConfig,
	LogExtra,
	DiscordWebhookConfig,
	CustomLogType,
	CustomLogFormatter,
	LOG_LEVEL_NAMES,
	LOG_LEVEL_COLORS,
	DISCORD_EMBED_COLORS,
	FILE_SIZE,
	FileLogFormat,
} from './types';

export type { FileLogFormat as FileFormat } from './types';

// --- Formatters ---
export { ConsoleFormatter } from './formatters/console-formatter';

// --- Targets ---
export { ConsoleTarget } from './targets/console-target';
export { FileTarget } from './targets/file-target';
export { DiscordTarget } from './targets/discord-target';

// --- Testing ---
export { MockLogger, createMockLogger } from './testing/mock-logger';
export type { MockLogger as MockLoggerType } from './testing/mock-logger';

// Import for type reference
import { LoggerFactory } from './config/logger-factory';
import type { LoggerConfig } from './types';
import { LogLevel } from './types';

/**
 * Creates a logger with environment-based configuration
 * This is the recommended way to create a logger instance
 * @param projectName Project name for the logger
 * @param options Optional configuration options
 * @returns Configured logger instance
 */
export function createLogger(
	projectName: string,
	options?: {
		minLevel?: LogLevel;
		projectColor?: string;
		overrides?: Partial<LoggerConfig>;
	}
) {
	// Validate inputs
	if (!projectName || projectName.trim() === '') {
		throw new Error('[Logger] createLogger: projectName cannot be empty');
	}

	return LoggerFactory.createFromEnvironment({ 
		projectName, 
		minLevel: options?.minLevel,
		projectColor: options?.projectColor,
		overrides: options?.overrides 
	});
}

// Default export
export { Logger as default } from './logger';
