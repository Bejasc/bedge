import { LOG_LEVEL_COLORS, LOG_LEVEL_NAMES, LogEntry } from "../types";

import chalk from "chalk";
import { format } from "date-fns";

// Create a chalk instance with colors always enabled at the highest level.
// Chalk sometimes disables colors when it believes the TTY doesn't support them
// (e.g., some Windows shells). Per project requirements, colors should always be on.
const coloredChalk = new chalk.Instance({ level: 3 });

/**
 * Formats log entries for console output with colors and pretty printing
 */
export class ConsoleFormatter {
	/**
	 * Formats a log entry for console output
	 * @param entry Log entry to format
	 * @param useColors Whether to use colors in output
	 * @param showExtraData Whether to show extra data in output (default: true)
	 * @returns Formatted console string
	 */
	static format(entry: LogEntry, useColors: boolean = true, showExtraData: boolean = true): string {
		const timestamp = format(entry.timestamp, "dd/MM/yyyy  HH:mm:ss ");
		const levelName = LOG_LEVEL_NAMES[entry.level];

		// Build the log line: [Project] timestamp [Tag] - Title: Message
		let logLine = "";

		// Project tag: make it bold AND colored when projectColor is provided
		if (useColors && entry.projectColor) {
			const colorFn = this.resolveChalk(entry.projectColor);
			logLine += `[${coloredChalk.bold(colorFn(entry.projectName))}]`;
		} else {
			logLine += useColors ? coloredChalk.bold(`[${entry.projectName}]`) : `[${entry.projectName}]`;
		}

		// Space and timestamp (dimmed)
		const tsText = useColors ? coloredChalk.dim(timestamp) : timestamp;
		logLine += ` ${tsText} `;

		// Colored [LEVEL] token - only color the level name, not the brackets
		logLine += this.formatLevel(levelName, entry.level, useColors);

		// Dash separator, title colored same as level, followed by a colon
		const titleColored = this.colorByLevel(entry.title, entry.level, useColors);
		logLine += ` ${titleColored}:`;

		// Message (plain)
		if (entry.message) {
			logLine += ` ${entry.message}`;
		}

		// Custom type (kept, magenta by default)
		if (entry.customType) {
			const customText = ` [${entry.customType}]`;
			logLine += useColors ? coloredChalk.magenta(customText) : customText;
		}

		// Note: environment intentionally omitted from output per requirements

		// Add extra information with pretty printing on new lines (if enabled)
		if (showExtraData) {
			logLine += this.formatExtra(entry.extra, useColors);
		}

		// Add error information
		logLine += this.formatError(entry.error, useColors);

		return logLine;
	}

	/**
	 * Formats the log level with appropriate color
	 */
	private static formatLevel(levelName: string, level: number, useColors: boolean): string {
		if (!useColors) {
			return `[${levelName}]`;
		}
		const colorName = LOG_LEVEL_COLORS[level as keyof typeof LOG_LEVEL_COLORS];
		const colorFn = this.resolveChalk(colorName);
		return `[${colorFn(levelName)}]`;
	}

	/**
	 * Colors text according to the log level color
	 */
	private static colorByLevel(text: string, level: number, useColors: boolean): string {
		if (!useColors) return text;
		const colorName = LOG_LEVEL_COLORS[level as keyof typeof LOG_LEVEL_COLORS];
		const colorFn = this.resolveChalk(colorName);
		return colorFn(text);
	}

	/**
	 * Resolve a chalk color function by name. Falls back to white when unknown.
	 */
	private static resolveChalk(colorName?: string): (text: string) => string {
		switch ((colorName || "").toLowerCase()) {
			case "gray":
			case "grey":
				return coloredChalk.gray;
			case "blue":
				return coloredChalk.blue;
			case "cyan":
				return coloredChalk.cyan;
			case "yellow":
				return coloredChalk.yellow;
			case "red":
				return coloredChalk.red;
			case "magenta":
				return coloredChalk.magenta;
			case "green":
				return coloredChalk.green;
			case "white":
				return coloredChalk.white;
			default:
				return coloredChalk.white;
		}
	}

	/**
	 * Formats extra information with pretty printing on new lines
	 */
	private static formatExtra(extra: Record<string, unknown> | undefined, useColors: boolean): string {
		if (!extra || Object.keys(extra).length === 0) {
			return "";
		}

		const prettyJson = JSON.stringify(extra, null, 2);
		const extraText = `\n${prettyJson}\n`;
		return useColors ? coloredChalk.dim(extraText) : extraText;
	}

	/**
	 * Formats error information
	 */
	private static formatError(error: Error | undefined, useColors: boolean): string {
		if (!error) {
			return "";
		}

		let errorText = "\n";

		if (useColors) {
			errorText += coloredChalk.red("Error: ") + error.message;
			if (error.stack) {
				errorText += "\n" + coloredChalk.dim(error.stack);
			}
		} else {
			errorText += "Error: " + error.message;
			if (error.stack) {
				errorText += "\n" + error.stack;
			}
		}

		return errorText;
	}

	/**
	 * Creates a separator line for console output
	 * @param useColors Whether to use colors
	 * @returns Separator string
	 */
	static createSeparator(useColors: boolean = true): string {
		const separator = "─".repeat(80);
		return useColors ? coloredChalk.dim(separator) : separator;
	}

	/**
	 * Formats a header for console output
	 * @param text Header text
	 * @param useColors Whether to use colors
	 * @param colorName Optional color name to use for background
	 * @param includeTimestamp Whether to include timestamp and project info
	 * @param projectName Project name for timestamp formatting
	 * @param projectColor Default project color
	 * @returns Formatted header string
	 */
	static formatHeader(text: string, useColors: boolean = true, colorName?: string, includeTimestamp: boolean = true, projectName?: string, projectColor?: string): string {
		let output = "";

		if (includeTimestamp && projectName) {
			const timestamp = format(new Date(), "dd/MM/yyyy  HH:mm:ss ");
			const tsText = useColors ? coloredChalk.dim(timestamp) : timestamp;

			// Format project tag same as regular logs
			if (useColors && projectColor) {
				const colorFn = this.resolveChalk(projectColor);
				output += `[${coloredChalk.bold(colorFn(projectName))}] ${tsText}`;
			} else {
				const projectText = useColors ? coloredChalk.bold(`[${projectName}]`) : `[${projectName}]`;
				output += `${projectText} ${tsText}`;
			}
		}

		// Add the header with background color and proper spacing alignment
		const headerText = useColors ? this.resolveBgChalk(colorName || projectColor || "blue")(coloredChalk.white.bold(` ${text} `)) : ` ${text} `;

		// Add spacing to align with log level tags like [INFO]
		output += ` ${headerText}`;

		return output;
	}

	/**
	 * Resolve a chalk background color function by name. Falls back to bgBlue when unknown.
	 */
	private static resolveBgChalk(colorName?: string): (text: string) => string {
		switch ((colorName || "").toLowerCase()) {
			case "gray":
			case "grey":
				return coloredChalk.bgGray;
			case "blue":
				return coloredChalk.bgBlue;
			case "cyan":
				return coloredChalk.bgCyan;
			case "yellow":
				return coloredChalk.bgYellow;
			case "red":
				return coloredChalk.bgRed;
			case "magenta":
				return coloredChalk.bgMagenta;
			case "green":
				return coloredChalk.bgGreen;
			case "white":
				return coloredChalk.bgWhite;
			default:
				return coloredChalk.bgBlue;
		}
	}
}
