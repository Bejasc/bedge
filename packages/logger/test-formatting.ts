import { createLogger } from "./src/index";

// Create a simple logger for testing
const logger = createLogger("discord-space-game");

// Test different log levels with the new formatting
console.log("🚀 Testing new NestJS-style formatting...\n");

logger.verbose("Verbose Test", "This is a verbose message");
logger.debug("Debug Test", "This is a debug message");
logger.info("Info Test", "This is an info message");
logger.warn("Warning Test", "This is a warning message");
logger.error("Error Test", "This is an error message");
logger.fatal("Fatal Test", "This is a fatal message");

// Test with extra data
logger.info("Data Test", "Message with extra data", {
    userId: "123456",
    action: "login",
    timestamp: new Date().toISOString()
});

// Test with error
try {
    throw new Error("Test error for logging");
} catch (error) {
    logger.error("Exception Test", "Caught an error", error as Error);
}

console.log("\n✅ Formatting test completed!");
