import { DISCORD_EMBED_COLORS, DiscordWebhookConfig, LogEntry, LogLevel, LOG_LEVEL_NAMES } from "../types";

const DEFAULT_MIN_REQUEST_INTERVAL = 400; // 2.5 req/sec (conservative, Discord limit is 30/60s)
const DEFAULT_MAX_QUEUE_SIZE = 100; // Prevent unbounded memory growth

interface DiscordEmbedField {
	name: string;
	value: string;
	inline?: boolean;
}

interface DiscordEmbed {
	title: string;
	description: string | null;
	color: number;
	timestamp: string;
	fields: DiscordEmbedField[];
	footer: {
		text: string;
	};
}

/**
 * Discord webhook logging target with rate limiting
 * Discord webhooks are limited to:
 * - 30 requests per 60 seconds
 * - 5 requests per 2 seconds (burst)
 */
export class DiscordTarget {
	private readonly defaultWebhook: DiscordWebhookConfig;
	private readonly perLevelWebhooks: Partial<Record<LogLevel, DiscordWebhookConfig>>;
	private readonly minLevel: LogLevel;
	
	// Rate limiting and queue management
	private requestQueue: Promise<void> = Promise.resolve();
	private lastRequestTime = 0;
	private readonly minRequestInterval: number;
	private pendingRequests = 0;
	private readonly maxQueueSize: number;
	private droppedRequests = 0;

	constructor(
		defaultWebhook: DiscordWebhookConfig, 
		minLevel: LogLevel = LogLevel.WARN, 
		perLevelWebhooks?: Partial<Record<LogLevel, DiscordWebhookConfig>>,
		minRequestInterval: number = DEFAULT_MIN_REQUEST_INTERVAL,
		maxQueueSize: number = DEFAULT_MAX_QUEUE_SIZE
	) {
		// Validate inputs
		if (!defaultWebhook || !defaultWebhook.url || defaultWebhook.url.trim() === '') {
			throw new Error('[Logger] DiscordTarget: webhook URL cannot be empty');
		}
		if (minRequestInterval < 0) {
			throw new Error('[Logger] DiscordTarget: minRequestInterval cannot be negative');
		}
		if (maxQueueSize < 1) {
			throw new Error('[Logger] DiscordTarget: maxQueueSize must be at least 1');
		}

		this.defaultWebhook = defaultWebhook;
		this.minLevel = minLevel;
		this.perLevelWebhooks = perLevelWebhooks || {};
		this.minRequestInterval = minRequestInterval;
		this.maxQueueSize = maxQueueSize;
	}

	/**
	 * Sends a log entry to Discord webhook with rate limiting
	 * @param entry Log entry to send
	 */
	async send(entry: LogEntry): Promise<void> {
		// Filter out logs below minimum level (higher minLevel values filter out lower priority logs)
		if (entry.level < this.minLevel) {
			return;
		}

		// Check queue size to prevent memory leak
		if (this.pendingRequests >= this.maxQueueSize) {
			this.droppedRequests++;
			
			// Warn periodically (every 10 dropped requests)
			if (this.droppedRequests % 10 === 1) {
				console.warn(`[Logger] Discord queue full (${this.maxQueueSize}). Dropped ${this.droppedRequests} requests.`);
			}
			return;
		}

		const webhook = this.perLevelWebhooks[entry.level] || this.defaultWebhook;
		const embed = this.createEmbed(entry);

		const payload = {
			username: webhook.username || "Logger",
			avatar_url: webhook.avatarUrl,
			embeds: [embed],
		};

		// Queue the request with rate limiting
		this.requestQueue = this.requestQueue
			.then(() => this.sendWithRateLimit(webhook.url, payload))
			.catch((err) => {
				// Prevent unhandled rejection from breaking the queue
				console.error('[Logger] Discord webhook error:', err);
			});
		
		return this.requestQueue;
	}

	/**
	 * Sends webhook payload with rate limiting
	 */
	private async sendWithRateLimit(url: string, payload: unknown): Promise<void> {
		this.pendingRequests++;
		
		// Calculate time to wait based on last request
		const now = Date.now();
		const timeSinceLastRequest = now - this.lastRequestTime;
		const waitTime = Math.max(0, this.minRequestInterval - timeSinceLastRequest);

		if (waitTime > 0) {
			await new Promise(resolve => setTimeout(resolve, waitTime));
		}

		this.lastRequestTime = Date.now();

		try {
			const response = await fetch(url, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(payload),
			});

			if (!response.ok) {
				const responseText = await response.text();
				console.error("Failed to send Discord webhook:", {
					status: response.status,
					statusText: response.statusText,
					body: responseText,
				});
			}
		} catch (error) {
			console.error("Error sending Discord webhook:", error);
		} finally {
			this.pendingRequests--;
		}
	}

	/**
	 * Creates a Discord embed from a log entry
	 * @param entry Log entry
	 * @returns Discord embed object
	 */
	private createEmbed(entry: LogEntry): DiscordEmbed {
		const levelName = this.getLevelName(entry.level);
		const color = DISCORD_EMBED_COLORS[entry.level];

		const embed: DiscordEmbed = {
			title: entry.title,
			description: entry.message || null,
			color: color,
			timestamp: entry.timestamp.toISOString(),
			fields: [],
			footer: {
				text: `${entry.projectName}${entry.environment ? ` (${entry.environment})` : ""} • ${levelName}`,
			},
		};

		// Add custom type if present
		if (entry.customType) {
			embed.fields.push({
				name: "Type",
				value: entry.customType,
				inline: true,
			});
		}

		// Add extra information as embed fields
		if (entry.extra && Object.keys(entry.extra).length > 0) {
			Object.entries(entry.extra).forEach(([key, value]) => {
				if (value !== null && value !== undefined) {
					// Format value based on type
					let formattedValue: string;
					if (typeof value === 'object') {
						// Pretty print objects/arrays
						formattedValue = JSON.stringify(value, null, 2);
						// Wrap in code block for better readability
						if (formattedValue.length > 50) {
							formattedValue = `\`\`\`json\n${formattedValue}\n\`\`\``;
						}
					} else {
						formattedValue = String(value);
					}
					
					// Discord has a 1024 character limit per field value
					if (formattedValue.length > 1020) {
						formattedValue = formattedValue.substring(0, 1017) + '...';
					}
					
					embed.fields.push({
						name: key,
						value: formattedValue,
						inline: true,
					});
				}
			});
		}

		// Add error information if present
		if (entry.error) {
			embed.fields.push({
				name: "Error",
				value: `**${entry.error.name}**: ${entry.error.message}`,
				inline: false,
			});

			// Add stack trace as a separate field if it's not too long
			if (entry.error.stack && entry.error.stack.length < 1000) {
				embed.fields.push({
					name: "Stack Trace",
					value: `\`\`\`\n${entry.error.stack.substring(0, 1000)}\n\`\`\``,
					inline: false,
				});
			}
		}

		return embed;
	}

	/**
	 * Gets the level name for a log level
	 * @param level Log level
	 * @returns Level name
	 */
	private getLevelName(level: LogLevel): string {
		return LOG_LEVEL_NAMES[level] || "UNKNOWN";
	}

	/**
	 * Waits for all pending Discord webhook requests to complete
	 */
	async flush(): Promise<void> {
		await this.requestQueue;
	}

	/**
	 * Gets the number of pending webhook requests
	 */
	getPendingCount(): number {
		return this.pendingRequests;
	}

	/**
	 * Gets the number of dropped requests due to queue overflow
	 */
	getDroppedCount(): number {
		return this.droppedRequests;
	}

	/**
	 * Tests the webhook connection
	 * @returns Promise that resolves if webhook is working
	 */
	async testConnection(): Promise<boolean> {
		const testPayload = {
			username: this.defaultWebhook.username || "Logger",
			avatar_url: this.defaultWebhook.avatarUrl,
			embeds: [
				{
					title: "Logger Test",
					description: "This is a test message from the logger system.",
					color: DISCORD_EMBED_COLORS[LogLevel.INFO],
					timestamp: new Date().toISOString(),
					footer: {
						text: "Logger System Test",
					},
				},
			],
		};

		try {
			const response = await fetch(this.defaultWebhook.url, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(testPayload),
			});

			return response.ok;
		} catch (error) {
			console.error("Discord webhook test failed:", error);
			return false;
		}
	}
}
