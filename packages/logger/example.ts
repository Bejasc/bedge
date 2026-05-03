/**
 * @workspace/logger - Simple Usage Examples
 *
 * This demonstrates the recommended single-instance logger pattern
 * for easy use throughout your application.
 */

import { LoggerFactory, createLogger } from "./src/index";

// =============================================================================
// 🚀 RECOMMENDED: Single Logger Instance Pattern
// =============================================================================

/**
 * Step 1: Create and configure your logger once (usually in app.ts or main.ts)
 * Then export it for use throughout your application
 */

// Option A: Simple logger with environment variables (recommended)
export const logger = createLogger("discord-space-game");

// Option B: Custom configuration for specific needs
export const customLogger = LoggerFactory.createProductionLogger({
	projectName: "my-app",
	logDir: "./logs",
	discordWebhookUrl: process.env.DISCORD_WEBHOOK_URL
});

// =============================================================================
// 📝 Usage Examples Throughout Your App
// =============================================================================

// In any service file (e.g., auth.service.ts)
function demonstrateServiceUsage() {
	// Just import and use - no setup needed!
	// import { logger } from '../app';

	logger.info("Service Started", "Authentication service initialized");
	logger.debug("Config Loaded", "JWT configuration loaded", {
		expiresIn: "24h",
		algorithm: "HS256",
	});

	// Error handling
	try {
		throw new Error("JWT token expired");
	} catch (error) {
		logger.error("Auth Failed", "Token validation failed", error as Error, {
			userId: "123456789",
			tokenType: "access_token",
		});
	}

	// Child logger with context for related operations
	const userLogger = logger.child({
		userId: "123456789",
		action: "password_reset",
	});

	userLogger.info("Password Reset", "User requested password reset");
	userLogger.info("Email Sent", "Reset email sent successfully");
}

// In a Discord bot command (e.g., explore.command.ts)
function demonstrateBotCommandUsage() {
	// import { logger } from '../app';

	// Log command usage
	logger.info("Command Used", "User executed /explore", {
		userId: "987654321",
		guildId: "111222333",
		channelId: "444555666",
	});

	// Game action logging
	logger.info("Game Action", "Player explored new system", {
		playerId: "987654321",
		systemName: "Alpha Centauri",
		experience: 250,
		newLevel: 5,
	});
}

// In an API controller (e.g., game.controller.ts)
function demonstrateControllerUsage() {
	// import { logger } from '../app';

	const requestLogger = logger.child({
		requestId: "req-abc-123",
		endpoint: "/api/game/explore",
	});

	requestLogger.info("Request Started", "Processing explore request");
	requestLogger.debug("Validation", "Request parameters validated");
	requestLogger.info("Request Completed", "Explore request successful", {
		duration: "150ms",
		statusCode: 200,
	});
}

// =============================================================================
// 🔧 Custom Logger Configurations
// =============================================================================

function demonstrateCustomConfigurations() {
	// Development logger - verbose console, debug file, no Discord
	const devLogger = LoggerFactory.createDevelopmentLogger({
		projectName: "my-app",
		logDir: "./logs"
	});

	// Production logger - info console/file, error Discord
	const prodLogger = LoggerFactory.createProductionLogger({
		projectName: "my-app",
		logDir: "./logs",
		discordWebhookUrl: "https://discord.com/api/webhooks/your-webhook"
	});

	// Browser logger - console only
	const browserLogger = LoggerFactory.createBrowserLogger({
		projectName: "my-app"
	});

	devLogger.debug("Debug Info", "This only shows in development");
	prodLogger.error("Production Error", "This goes to Discord in production");
	browserLogger.info("Browser", "Client-side logging active");
}

// =============================================================================
// 🧪 Testing Your Logger
// =============================================================================

async function testLogger() {
	// Test all configured targets
	const results = await logger.testTargets();

	console.log("=== Logger Test Results ===");
	console.log("Console logging:", results.console ? "✅ Working" : "❌ Failed");
	console.log("File logging:", results.file ? "✅ Working" : "❌ Failed");
	console.log("Discord logging:", results.discord ? "✅ Working" : "❌ Failed");
}

// =============================================================================
// 🚀 Run Examples
// =============================================================================

async function runExamples() {
	console.log("🚀 Running @workspace/logger examples...\n");

	// Basic usage
	logger.info("App Started", "Application is starting up");
	logger.warn("Memory Warning", "High memory usage detected", {
		usage: "85%",
		threshold: "90%",
	});

	// Run demonstrations
	demonstrateServiceUsage();
	demonstrateBotCommandUsage();
	demonstrateControllerUsage();
	demonstrateCustomConfigurations();

	// Test logger
	await testLogger();

	// Demonstrate flush and health check
	await logger.flush();
	const health = await logger.getHealth();
	console.log("\n📊 Logger Health:", JSON.stringify(health, null, 2));

	console.log("\n✅ All examples completed! Check your console, files, and Discord for output.");
}

// Run examples if this file is executed directly
if (require.main === module) {
	// eslint-disable-next-line promise/prefer-await-to-then
	runExamples().catch(console.error);
}

export { demonstrateServiceUsage, demonstrateBotCommandUsage, demonstrateControllerUsage, demonstrateCustomConfigurations, testLogger };
