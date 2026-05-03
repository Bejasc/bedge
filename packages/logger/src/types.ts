/**
 * File size constants for log file configuration
 */
export const FILE_SIZE = {
	MB_1: 1024 * 1024,
	MB_5: 5 * 1024 * 1024,
	MB_10: 10 * 1024 * 1024,
	MB_50: 50 * 1024 * 1024,
	MB_100: 100 * 1024 * 1024,
} as const;

/**
 * Log levels with numerical values for comparison
 */
export enum LogLevel {
	VERBOSE = 0,
	DEBUG = 1,
	INFO = 2,
	WARN = 3,
	ERROR = 4,
	FATAL = 5,
}

/**
 * Type-safe color options for logging
 */
export enum LogColor {
	GRAY = "gray",
	GREY = "grey",
	BLUE = "blue",
	CYAN = "cyan",
	YELLOW = "yellow",
	RED = "red",
	MAGENTA = "magenta",
	GREEN = "green",
	WHITE = "white",
}

/**
 * Log level names mapped to their enum values
 */
export const LOG_LEVEL_NAMES: Record<LogLevel, string> = {
	[LogLevel.VERBOSE]: 'VERBOSE',
	[LogLevel.DEBUG]: 'DEBUG',
	[LogLevel.INFO]: 'INFO',
	[LogLevel.WARN]: 'WARN',
	[LogLevel.ERROR]: 'ERROR',
	[LogLevel.FATAL]: 'FATAL',
};

/**
 * Color mapping for different log levels
 */
export const LOG_LEVEL_COLORS: Record<LogLevel, string> = {
	[LogLevel.VERBOSE]: 'gray',
	[LogLevel.DEBUG]: 'cyan',
	[LogLevel.INFO]: 'blue',
	[LogLevel.WARN]: 'yellow',
	[LogLevel.ERROR]: 'red',
	[LogLevel.FATAL]: 'magenta',
};

/**
 * Discord embed color mapping for different log levels
 */
export const DISCORD_EMBED_COLORS: Record<LogLevel, number> = {
	[LogLevel.VERBOSE]: 0x808080, // Gray
	[LogLevel.DEBUG]: 0x00FFFF,   // Cyan
	[LogLevel.INFO]: 0x0099FF,    // Blue
	[LogLevel.WARN]: 0xFFFF00,    // Yellow
	[LogLevel.ERROR]: 0xFF0000,   // Red
	[LogLevel.FATAL]: 0xFF00FF,   // Magenta
};

/**
 * Extra information for logs as key-value pairs
 * Supports primitives and nested objects for structured logging
 */
export interface LogExtra {
	[key: string]: string | number | boolean | null | undefined | Record<string, unknown> | unknown[];
}

/**
 * Discord webhook configuration
 */
export interface DiscordWebhookConfig {
	url: string;
	username?: string;
	avatarUrl?: string;
}

/**
 * File log output format
 */
export type FileLogFormat = 'text' | 'json';

/**
 * Configuration for different log targets
 */
export interface LogTargetConfig {
	console?: {
		enabled: boolean;
		minLevel: LogLevel;
		showExtraData?: boolean;  // Whether to show extra data in console output (default: true)
	};
	file?: {
		enabled: boolean;
		minLevel: LogLevel;
		path: string;
		format?: FileLogFormat; // 'text' (default, human-readable) or 'json' (ELK/Datadog)
		maxSize?: number; // in bytes
		maxFiles?: number;
	};
	discord?: {
		enabled: boolean;
		minLevel: LogLevel;
		webhook: DiscordWebhookConfig;
		perLevelWebhooks?: Partial<Record<LogLevel, DiscordWebhookConfig>>;
	};
}

/**
 * Logger configuration
 */
export interface LoggerConfig {
	projectName: string;
	environment?: string;
	projectColor?: LogColor | string;
	targets: LogTargetConfig;
	/** Enable debug logging for logger internals (errors, warnings, etc.) */
	debug?: boolean;
}

/**
 * Log entry structure
 */
export interface LogEntry {
	timestamp: Date;
	level: LogLevel;
	projectName: string;
	environment?: string;
	projectColor?: string;
	title: string;
	message?: string;
	error?: Error;
	extra?: LogExtra;
	customType?: string;
	correlationId?: string;
}

/**
 * Custom log format function type
 */
export type CustomLogFormatter = (entry: LogEntry) => string;

/**
 * Custom log type definition
 */
export interface CustomLogType {
	name: string;
	level: LogLevel;
	color?: string;
	formatter?: CustomLogFormatter;
}
