import { Logger } from '../logger';
import { LoggerConfig, LogLevel, FILE_SIZE } from '../types';

/**
 * Factory class for creating logger instances with common configurations
 */
export class LoggerFactory {
	/**
	 * Creates a logger for development environment
	 * @param options Development logger options
	 * @returns Configured logger instance
	 */
	static createDevelopmentLogger(options: {
		projectName: string;
		logDir?: string;
		overrides?: Partial<LoggerConfig>;
	}): Logger {
		const { projectName, logDir = './logs', overrides } = options;
		const config: LoggerConfig = {
			projectName,
			environment: process.env.LOG_SHOW_ENV === 'true' ? 'development' : undefined,
			projectColor: process.env.LOG_PROJECT_COLOR,
			targets: {
				console: {
					enabled: true,
					minLevel: LogLevel.VERBOSE,
				},
				file: {
					enabled: true,
					minLevel: LogLevel.DEBUG,
					path: `${logDir}/${projectName}-dev.log`,
					maxSize: FILE_SIZE.MB_10,
				},
				discord: {
					enabled: false,
					minLevel: LogLevel.ERROR,
					webhook: { url: '' }, // Will be disabled anyway
				},
			},
		};

		return new Logger({ ...config, ...overrides });
	}

	/**
	 * Creates a logger for production environment
	 * @param options Production logger options
	 * @returns Configured logger instance
	 */
	static createProductionLogger(options: {
		projectName: string;
		logDir?: string;
		discordWebhookUrl?: string;
		overrides?: Partial<LoggerConfig>;
	}): Logger {
		const { projectName, logDir = './logs', discordWebhookUrl, overrides } = options;
		const config: LoggerConfig = {
			projectName,
			environment: process.env.LOG_SHOW_ENV === 'true' ? 'production' : undefined,
			projectColor: process.env.LOG_PROJECT_COLOR,
			targets: {
				console: {
					enabled: true,
					minLevel: LogLevel.INFO,
				},
				file: {
					enabled: true,
					minLevel: LogLevel.INFO,
					path: `${logDir}/${projectName}-prod.log`,
					maxSize: FILE_SIZE.MB_50,
				},
				discord: {
					enabled: !!discordWebhookUrl,
					minLevel: LogLevel.ERROR,
					webhook: {
						url: discordWebhookUrl || '',
						username: `${projectName} Logger`,
					},
				},
			},
		};

		return new Logger({ ...config, ...overrides });
	}

	/**
	 * Creates a logger from environment variables
	 * @param options Environment logger options
	 * @returns Configured logger instance
	 */
	static createFromEnvironment(options: {
		projectName: string;
		minLevel?: LogLevel;
		projectColor?: string;
		overrides?: Partial<LoggerConfig>;
	}): Logger {
		const { projectName, minLevel: globalMinLevel, projectColor, overrides } = options;
		const isProduction = process.env.NODE_ENV === 'production';
		const logDir = process.env.LOG_DIR || './logs';
		const discordWebhookUrl = process.env.DISCORD_WEBHOOK_URL;

		// Parse log levels from environment, with globalMinLevel as fallback
		const consoleLevel = this.parseLogLevel(process.env.LOG_CONSOLE_LEVEL) || 
			globalMinLevel ||
			(isProduction ? LogLevel.INFO : LogLevel.VERBOSE);
		const fileLevel = this.parseLogLevel(process.env.LOG_FILE_LEVEL) || 
			globalMinLevel ||
			(isProduction ? LogLevel.INFO : LogLevel.DEBUG);
		const discordLevel = this.parseLogLevel(process.env.LOG_DISCORD_LEVEL) || 
			globalMinLevel ||
			LogLevel.ERROR;

		// Parse file format from environment (text or json)
		const fileFormat = (process.env.LOG_FILE_FORMAT === 'json' || process.env.LOG_FILE_FORMAT === 'text')
			? process.env.LOG_FILE_FORMAT
			: 'text';

		const config: LoggerConfig = {
			projectName,
			environment: process.env.LOG_SHOW_ENV === 'true' ? (process.env.NODE_ENV || 'development') : undefined,
			projectColor: projectColor || process.env.LOG_PROJECT_COLOR,
			targets: {
				console: {
					enabled: process.env.LOG_CONSOLE_ENABLED !== 'false',
					minLevel: consoleLevel,
				},
				file: {
					enabled: process.env.LOG_FILE_ENABLED !== 'false',
					minLevel: fileLevel,
					path: process.env.LOG_FILE_PATH || `${logDir}/${projectName}.log`,
					format: fileFormat,
					maxSize: parseInt(process.env.LOG_FILE_MAX_SIZE || String(FILE_SIZE.MB_10)),
				},
				discord: {
					enabled: !!discordWebhookUrl && process.env.LOG_DISCORD_ENABLED !== 'false',
					minLevel: discordLevel,
					webhook: {
						url: discordWebhookUrl || '',
						username: process.env.DISCORD_WEBHOOK_USERNAME || `${projectName} Logger`,
						avatarUrl: process.env.DISCORD_WEBHOOK_AVATAR_URL,
					},
				},
			},
		};

		const finalConfig = { ...config, ...overrides };
		this.validateConfig(finalConfig);
		return new Logger(finalConfig);
	}

	/**
	 * Creates a minimal logger for browser environments
	 * @param options Browser logger options
	 * @returns Browser-compatible logger instance
	 */
	static createBrowserLogger(options: {
		projectName: string;
		overrides?: Partial<LoggerConfig>;
	}): Logger {
		const { projectName, overrides } = options;
		const config: LoggerConfig = {
			projectName,
			environment: process.env.LOG_SHOW_ENV === 'true' ? 'browser' : undefined,
			projectColor: process.env.LOG_PROJECT_COLOR,
			targets: {
				console: {
					enabled: true,
					minLevel: LogLevel.DEBUG,
				},
				file: {
					enabled: false,
					minLevel: LogLevel.INFO,
					path: '', // Not used in browser
				},
				discord: {
					enabled: false,
					minLevel: LogLevel.ERROR,
					webhook: { url: '' }, // Not typically used in browser
				},
			},
		};

		return new Logger({ ...config, ...overrides });
	}

	/**
	 * Parses a log level from string
	 * @param levelStr Log level string
	 * @returns LogLevel enum value or undefined
	 */
	private static parseLogLevel(levelStr?: string): LogLevel | undefined {
		if (!levelStr) return undefined;

		const levelMap: Record<string, LogLevel> = {
			'verbose': LogLevel.VERBOSE,
			'debug': LogLevel.DEBUG,
			'info': LogLevel.INFO,
			'warn': LogLevel.WARN,
			'error': LogLevel.ERROR,
			'fatal': LogLevel.FATAL,
		};

		return levelMap[levelStr.toLowerCase()];
	}

	/**
	 * Validates logger configuration and emits warnings for common issues
	 * @param config Logger configuration to validate
	 */
	static validateConfig(config: LoggerConfig): void {
		// Validate Discord webhook URL format
		if (config.targets.discord?.enabled) {
			const url = config.targets.discord.webhook.url;
			if (!url) {
				console.warn('[Logger] Discord webhook is enabled but URL is empty');
			} else if (!url.startsWith('https://discord.com/api/webhooks/') && 
					   !url.startsWith('https://discordapp.com/api/webhooks/')) {
				console.warn('[Logger] Discord webhook URL does not appear to be a valid Discord webhook URL:', url);
			}
		}

		// Validate file target path
		if (config.targets.file?.enabled) {
			const path = config.targets.file.path;
			if (!path || path.trim() === '') {
				console.warn('[Logger] File target is enabled but path is empty');
			}
		}

		// Warn if all targets are disabled
		const hasEnabledTarget = 
			config.targets.console?.enabled ||
			config.targets.file?.enabled ||
			config.targets.discord?.enabled;
		
		if (!hasEnabledTarget) {
			console.warn('[Logger] No targets are enabled - logs will not be output anywhere');
		}
	}
}
