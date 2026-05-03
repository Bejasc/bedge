# @bejasc/logger

Lightweight, customizable logging for Node.js with console, file, and Discord webhook support.

## 🚀 Quick Start

```typescript
// app.ts - Create once
import { createLogger, LogLevel } from '@bejasc/logger';

// Simple: one line with sensible defaults
export const logger = createLogger('my-app');

// Or specify a global log level for all targets
export const logger = createLogger('my-app', { minLevel: LogLevel.INFO });

// anywhere.ts - Use everywhere
import { logger } from './app';
logger.info('Server Started', 'Listening on port 3000');
logger.error('Database Error', 'Connection failed', error, { query: 'SELECT *' });
```

**That's it!** Environment variables configure everything else automatically.

## ✨ Features

- **🎯 Simple**: One line to create, import anywhere
- **🎨 Multi-target**: Console (colored), File (rotated), Discord webhooks
- **🔧 Flexible**: Independent log levels per target
- **👶 Context**: Child loggers with persistent metadata
- **⚡ Fast**: Performance guards skip expensive operations
- **⏱️ Timing**: Built-in operation timer
- **📱 Discord**: Rich embeds with color-coding

## 📖 API Reference

### Log Methods

All log methods follow a consistent signature pattern:

```typescript
logger.verbose(title, message?, extra?)         // Most detailed
logger.debug(title, message?, extra?)           // Debug info
logger.info(title, message?, extra?)            // General info
logger.warn(title, message?, extra?)            // Warnings
logger.error(title, messageOrError?, errorOrExtra?, extra?)   // Errors - flexible overloads
logger.fatal(title, messageOrError?, errorOrExtra?, extra?)   // Fatal errors - flexible overloads
```

**Error/Fatal Method Usage:**
```typescript
// Simple message
logger.error('Failed', 'Connection timeout');

// Just an error
logger.error('Failed', err);

// Message with extra data
logger.error('Failed', 'Connection timeout', { host: 'localhost' });

// Message and error
logger.error('Failed', 'DB error', err);

// Message, error, and extra data
logger.error('Failed', 'DB error', err, { query: 'SELECT *' });

// Error with extra data
logger.error('Failed', err, { userId: '123' });
```

### Child Loggers & Context

```typescript
// Add persistent context
const userLogger = logger.child({ userId: '123', sessionId: 'abc' });
userLogger.info('Login', 'User authenticated');  // Includes userId + sessionId
userLogger.error('Failed', error);                // Context in every log
```

### Timing Operations

```typescript
const timer = logger.time('Database Query');
try {
    await db.query('SELECT * FROM users');
    timer.end();  // Logs: [DEBUG] Timer: Database Query completed { duration: "125ms" }
} catch (err) {
    timer.end({ error: err });  // Log timing even on error
}
```

### Correlation IDs (Distributed Tracing)

```typescript
// Create logger with correlation ID for request tracing
const requestLogger = logger.withCorrelationId('req-abc-123');

requestLogger.info('Processing', 'Started request');
requestLogger.info('Database', 'Query executed');
requestLogger.info('Response', 'Request completed');
// All logs include correlationId: 'req-abc-123'

// Perfect for microservices and distributed systems
app.use((req, res, next) => {
    req.logger = logger.withCorrelationId(req.id);
    next();
});
```

### Visual Formatting

```typescript
logger.separator();  // Prints horizontal line
logger.header('🚀 Application Started', 'blue');  // Bold header with timestamp
logger.info('Server', 'Ready on port 3000');
```

### Performance Guards

```typescript
// Skip expensive computation if debug is disabled
if (logger.isDebugEnabled()) {
  const stats = calculateExpensiveStats();
  logger.debug('Stats', 'Performance metrics', stats);
}
```

## 🔧 Configuration

### Environment Variables

```bash
# Log levels: verbose, debug, info, warn, error, fatal
LOG_CONSOLE_LEVEL=info
LOG_FILE_LEVEL=debug
LOG_DISCORD_LEVEL=error

# File configuration
LOG_DIR=./logs
LOG_FILE_PATH=./logs/app.log
LOG_FILE_FORMAT=text  # 'text' (default, human-readable) or 'json' (for ELK/Datadog)

# Discord
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
DISCORD_WEBHOOK_USERNAME=My App Logger
```

### Factory Methods

```typescript
// Development: verbose console, debug file
const logger = LoggerFactory.createDevelopmentLogger({ 
  projectName: 'my-app',
  logDir: './logs' 
});

// Production: info console/file, error Discord  
const logger = LoggerFactory.createProductionLogger({
  projectName: 'my-app',
  logDir: './logs',
  discordWebhookUrl: 'https://discord.com/api/webhooks/...'
});

// Browser: console only
const logger = LoggerFactory.createBrowserLogger({ projectName: 'my-app' });
```

## 🎯 Common Patterns

### Discord Bot Command

```typescript
export async function handleCommand(interaction: ChatInputCommandInteraction) {
  const log = logger.child({ 
    userId: interaction.user.id,
    command: 'explore' 
  });

  log.info('Command', 'Executing /explore');
  try {
    // ... logic
    log.info('Success', 'Command completed');
  } catch (error) {
    log.error('Failed', error as Error);
  }
}
```

### API Request Logging

```typescript
export class AuthService {
  async login(userId: string) {
    logger.info('Login', 'Starting', { userId });
    try {
      // ... logic
      logger.info('Login', 'Success', { userId });
    } catch (error) {
      logger.error('Login', error as Error, { userId });
    }
  }
}
```

### Custom Configuration

```typescript
import { Logger, LogLevel } from '@bejasc/logger';

const logger = new Logger({
  projectName: 'my-app',
  projectColor: 'cyan',        // Color for project name
  targets: {
    console: {
      enabled: true,
      minLevel: LogLevel.INFO,
      showExtraData: true        // Show extra fields in console (default: true)
    },
    file: {
      enabled: true,
      minLevel: LogLevel.DEBUG,
      path: './logs/app.log',
      format: 'text',              // 'text' (default) or 'json'
      maxSize: 50 * 1024 * 1024,   // 50MB
      maxFiles: 10
    },
    discord: {
      enabled: true,
      minLevel: LogLevel.ERROR,
      webhook: {
        url: 'https://discord.com/api/webhooks/...',
        username: 'Bot Logger'
      }
    }
  }
});
```

### Per-Level Discord Webhooks

Route different log levels to different Discord channels for better organization:

```typescript
import { Logger, LogLevel } from '@bejasc/logger';

const logger = new Logger({
  projectName: 'my-app',
  targets: {
    discord: {
      enabled: true,
      minLevel: LogLevel.WARN,   // Default webhook receives WARN and above
      webhook: {
        url: 'https://discord.com/api/webhooks/YOUR-GENERAL-WEBHOOK',
        username: 'App Logger'
      },
      // Route specific levels to dedicated channels
      perLevelWebhooks: {
        [LogLevel.ERROR]: {
          url: 'https://discord.com/api/webhooks/YOUR-ERROR-WEBHOOK',
          username: 'Error Logger',
          avatarUrl: 'https://example.com/error-icon.png'
        },
        [LogLevel.FATAL]: {
          url: 'https://discord.com/api/webhooks/YOUR-CRITICAL-WEBHOOK',
          username: 'Critical Alerts',
          avatarUrl: 'https://example.com/critical-icon.png'
        }
      }
    }
  }
});

// Usage:
logger.warn('High Memory', 'Memory usage at 85%');  // → General webhook
logger.error('DB Error', dbError);                   // → Error webhook
logger.fatal('Service Down', 'Redis unreachable');   // → Critical webhook
```

**Use Cases:**
- **ERROR** → `#errors` channel for dev team monitoring
- **FATAL** → `#critical-alerts` channel with @here mentions
- **WARN** → `#monitoring` channel for general awareness

## 📋 Log Levels

| Level | Value | Color | When to Use |
|-------|-------|-------|-------------|
| VERBOSE | 0 | Gray | Trace-level debugging |
| DEBUG | 1 | Cyan | Development debugging |
| INFO | 2 | Blue | General information |
| WARN | 3 | Yellow | Warnings |
| ERROR | 4 | Red | Errors |
| FATAL | 5 | Magenta | Critical failures |

**Log Filtering:** Each target has independent `minLevel` settings. Higher values filter out lower-priority logs.  
Example: `minLevel: LogLevel.WARN` (3) only shows WARN, ERROR, and FATAL.

## 🔍 Output Examples

### Console (Colorized)
```
[my-app] 15/01/2024  14:30:25  [INFO] Server Started: Listening on port 3000
[my-app] 15/01/2024  14:30:26  [ERROR] Database Error: Connection failed
{
  "host": "localhost",
  "port": 5432
}
  Error: Connection timeout
    at Database.connect (/app/db.js:15:10)
```

### File - Text Format (Default)
Human-readable with fixed-width columns for easy scanning:
```
2024-10-09T07:46:47.123Z | INFO    | my-app          |              | [Server Started]          Application ready | port=3000 env="production"
2024-10-09T07:46:48.456Z | DEBUG   | my-app          |              | [DB Connection]           Connected to PostgreSQL | host="localhost" database="mydb"
2024-10-09T07:47:15.789Z | INFO    | my-app          | production   | [User Login]              User authenticated | userId="123456" ip="192.168.1.100"
2024-10-09T07:47:30.234Z | WARN    | my-app          | production   | [Rate Limit]              User approaching limit | userId="123456" requestCount=95
2024-10-09T07:48:05.567Z | ERROR   | my-app          | production   | [Query Failed]            Database error | query="SELECT * FROM users" | error="Error: Connection timeout" at=at Database.query (/app/db.ts:45:15)
2024-10-09T07:50:00.123Z | INFO    | my-app          |              | [Payment Processed]       Transaction completed | type=PAYMENT_EVENT | orderId="ORD-12345" amount=99.99
```

### File - JSON Format (for ELK/Datadog)
Set `LOG_FILE_FORMAT=json` for machine-parseable logs:
```json
{"timestamp":"2024-10-09T07:46:47.123Z","level":2,"levelName":"INFO","projectName":"my-app","environment":null,"title":"Server Started","message":"Application ready","extra":{"port":3000,"env":"production"}}
{"timestamp":"2024-10-09T07:48:05.567Z","level":4,"levelName":"ERROR","projectName":"my-app","environment":"production","title":"Query Failed","message":"Database error","extra":{"query":"SELECT * FROM users"},"error":{"name":"Error","message":"Connection timeout","stack":"Error: Connection timeout\n    at Database.query..."}}
```

**JSON Schema for Log Aggregation:**
```typescript
interface LogEntry {
  timestamp: string;        // ISO 8601 format
  level: number;            // 0=VERBOSE, 1=DEBUG, 2=INFO, 3=WARN, 4=ERROR, 5=FATAL
  levelName: string;        // Human-readable level name
  projectName: string;      // Your application name
  environment?: string;     // Environment tag (if LOG_SHOW_ENV=true)
  title: string;            // Log title/category
  message?: string;         // Log message
  customType?: string;      // Custom log type name
  extra?: Record<string, any>;  // Additional structured data
  error?: {                 // Error information (if present)
    name: string;           // Error type (e.g., "TypeError")
    message: string;        // Error message
    stack?: string;         // Full stack trace
  };
}
```

**Datadog/ELK Parsing Tips:**
- Use `timestamp` as the primary time field
- Index by `level` for filtering by severity
- Create alerts on `level >= 4` (ERROR and FATAL)
- Parse `error.stack` for error tracking
- Use `projectName` and `environment` for multi-app deployments
- Extra fields are automatically flattened for searching

### Discord
Rich embeds with color-coding, structured fields, and error stack traces.

**Note:** Discord webhooks are rate-limited automatically (2.5 req/sec) to prevent hitting Discord's limits (30 req/60sec).

## 🧰 Advanced Features

### Resource Management

```typescript
// Flush all pending writes before shutdown
logger.error('Critical', 'App crashed');
await logger.flush();  // Ensure error is written
process.exit(1);

// Close logger and release resources
await logger.close();  // Calls flush() then closes file handles
```

### Health Monitoring

```typescript
const health = await logger.getHealth();
console.log(health);
// {
//   console: { enabled: true },
//   file: { 
//     enabled: true, 
//     healthy: true, 
//     consecutiveErrors: 0,
//     filePath: './logs/app.log'
//   },
//   discord: { 
//     enabled: true, 
//     pendingRequests: 2 
//   }
// }
```

### Child Logger Context Immutability

```typescript
const userLogger = logger.child({ userId: '123' });

// Child context takes precedence over extra data
userLogger.info('Action', 'Click', { userId: '456' });
// Result: { userId: '123' } - child context is immutable
```

### Custom Log Types

```typescript
logger.registerCustomType({
  name: 'GAME_EVENT',
  level: LogLevel.INFO,
  color: 'green'
});

logger.custom('GAME_EVENT', 'Level Up', 'Player reached level 10', {
  playerId: '123',
  newLevel: 10
});
```

### Testing Support

```typescript
import { createMockLogger } from '@bejasc/logger';

const mockLogger = createMockLogger('test');
// ... use mockLogger in tests

// Assert logs were created
expect(mockLogger.hasLog('User Login')).toBe(true);
expect(mockLogger.getLogCount(LogLevel.ERROR)).toBe(0);

// Test correlation IDs
const correlatedLogger = mockLogger.withCorrelationId('test-123');
correlatedLogger.info('Test', 'Message');
expect(mockLogger.logs[0].correlationId).toBe('test-123');

mockLogger.clear(); // Reset for next test
```

## 🌐 Browser Compatibility

The logger supports both Node.js and browser environments with automatic platform detection:

```typescript
// In browser (React, Vue, Angular, etc.)
import { createLogger } from '@bejasc/logger';

const logger = createLogger('my-app', {
    overrides: {
        targets: {
            console: { enabled: true, minLevel: LogLevel.DEBUG },
            discord: {
                enabled: true,
                minLevel: LogLevel.ERROR,
                webhook: { url: process.env.REACT_APP_DISCORD_WEBHOOK }
            }
            // File logging automatically disabled in browser
        }
    }
});

// Log frontend errors to Discord
try {
    await api.fetchUser();
} catch (err) {
    logger.error('API Error', 'Failed to fetch user', err, {
        userId: user.id,
        browser: navigator.userAgent
    });
}
```

**Browser Features:**
- ✅ Console logging with colors
- ✅ Discord webhooks
- ✅ Correlation IDs
- ✅ Child loggers
- ❌ File logging (not available in browser)

## 🔮 Roadmap

### Potential Future Enhancements

- [ ] **Discord object formatting**: Auto-format Discord.js objects in log messages with proper type guards
- [ ] **Streaming file writes**: Chunked writes for high-volume logging scenarios
- [ ] **Performance metrics**: Built-in benchmarking and performance tracking
- [ ] **Log sampling**: Rate limiting for high-frequency logs to reduce noise
- [ ] **Structured query support**: Better integration with log aggregation tools

## 📦 Dependencies

- **chalk** (^4.1.2): Console color formatting
- **date-fns** (^2.30.0): Date formatting

## License

MIT
