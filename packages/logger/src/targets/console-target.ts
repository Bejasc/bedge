import { LogEntry, LogLevel } from '../types';
import { ConsoleFormatter } from '../formatters/console-formatter';

/**
 * Console logging target with color support
 */
export class ConsoleTarget {
	private readonly minLevel: LogLevel;
	private readonly projectColor?: string;
	private readonly showExtraData: boolean;

	constructor(minLevel: LogLevel = LogLevel.INFO, projectColor?: string, showExtraData: boolean = true) {
		this.minLevel = minLevel;
		this.projectColor = projectColor;
		this.showExtraData = showExtraData;
	}

	/**
	 * Writes a log entry to console using appropriate console method
	 * @param entry Log entry to write
	 */
	write(entry: LogEntry): void {
		// Filter out logs below minimum level (higher minLevel values filter out lower priority logs)
		if (entry.level < this.minLevel) {
			return;
		}

		// Format with console-specific showExtraData setting
		const formatted = ConsoleFormatter.format(entry, true, this.showExtraData);
		
		// Use appropriate console method based on log level
		switch (entry.level) {
			case LogLevel.VERBOSE:
			case LogLevel.DEBUG:
				console.debug(formatted);
				break;
			case LogLevel.INFO:
				console.info(formatted);
				break;
			case LogLevel.WARN:
				console.warn(formatted);
				break;
			case LogLevel.ERROR:
			case LogLevel.FATAL:
				console.error(formatted);
				break;
			default:
				console.log(formatted);
		}
	}

	/**
	 * Writes a separator line to console
	 */
	writeSeparator(): void {
		console.log(ConsoleFormatter.createSeparator(true));
	}

	/**
	 * Writes a header to console
	 * @param text Header text
	 * @param color Optional color override
	 * @param includeTimestamp Whether to include timestamp and project info
	 * @param projectName Project name for timestamp formatting
	 * @param projectColor Default project color
	 */
	writeHeader(text: string, color?: string, includeTimestamp: boolean = true, projectName?: string, projectColor?: string): void {
		console.log(ConsoleFormatter.formatHeader(text, true, color, includeTimestamp, projectName, projectColor));
	}
}
