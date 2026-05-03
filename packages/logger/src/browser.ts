// Browser-compatible exports (excludes Node.js-specific FileTarget)

import { LoggerFactory } from './config/logger-factory';
import { LogLevel, LoggerConfig } from './types';

// Main exports
export { Logger } from './logger';
export { LoggerFactory } from './config/logger-factory';

// Type exports
export {
	LogLevel,
	LogColor,
	LOG_LEVEL_NAMES,
	LOG_LEVEL_COLORS,
	DISCORD_EMBED_COLORS,
	FILE_SIZE,
} from './types';

export type {
	LoggerConfig,
	LogTargetConfig,
	LogEntry,
	LogExtra,
	DiscordWebhookConfig,
	CustomLogType,
	CustomLogFormatter,
	FileLogFormat,
	FileLogFormat as FileFormat,
} from './types';

// Formatter exports (for advanced usage)
export { ConsoleFormatter } from './formatters/console-formatter';

// Target exports (for advanced usage) - FileTarget excluded for browser
export { ConsoleTarget } from './targets/console-target';
export { DiscordTarget } from './targets/discord-target';

// Testing utilities
export { MockLogger, createMockLogger } from './testing/mock-logger';
export type { MockLogger as MockLoggerType } from './testing/mock-logger';

/**
 * Creates a logger instance configured from environment variables
 * Browser version - FileTarget is automatically disabled
 * @param projectName Name of the project/application
 * @param options Optional configuration
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

	// In browser, always disable file target
	const browserOverrides: Partial<LoggerConfig> = {
		...options?.overrides,
		targets: {
			...options?.overrides?.targets,
			file: {
				enabled: false,
				minLevel: LogLevel.INFO,
				path: '', // Not used in browser
			},
		},
	};

	return LoggerFactory.createFromEnvironment({ 
		projectName, 
		minLevel: options?.minLevel,
		projectColor: options?.projectColor,
		overrides: browserOverrides
	});
}

// Default export
export { Logger as default } from './logger';
