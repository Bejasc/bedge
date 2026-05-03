import { describe, it, expect, beforeEach } from 'vitest';
import { createLogger, createMockLogger, LogLevel, MockLogger } from '../src/index';

describe('Logger', () => {
	let mockLogger: MockLogger;

	beforeEach(() => {
		mockLogger = createMockLogger('test-logger');
	});

	describe('Basic Logging', () => {
		it('should log info messages', () => {
			mockLogger.info('Test Info', 'This is a test message');
			
			expect(mockLogger.getLogCount()).toBe(1);
			expect(mockLogger.getLastLog()?.level).toBe(LogLevel.INFO);
			expect(mockLogger.getLastLog()?.title).toBe('Test Info');
			expect(mockLogger.getLastLog()?.message).toBe('This is a test message');
		});

		it('should log error messages with error objects', () => {
			const error = new Error('Test error');
			mockLogger.error('Error Test', 'An error occurred', error);
			
			const lastLog = mockLogger.getLastLog();
			expect(lastLog?.level).toBe(LogLevel.ERROR);
			expect(lastLog?.error).toBe(error);
			expect(lastLog?.message).toBe('An error occurred');
		});

		it('should log with extra data', () => {
			mockLogger.info('User Login', 'User authenticated', { userId: '123', ip: '192.168.1.1' });
			
			const lastLog = mockLogger.getLastLog();
			expect(lastLog?.extra).toEqual({ userId: '123', ip: '192.168.1.1' });
		});
		it('should support all log levels', () => {
			mockLogger.verbose('Verbose', 'verbose message');
			mockLogger.debug('Debug', 'debug message');
			mockLogger.info('Info', 'info message');
		 mockLogger.warn('Warn', 'warn message');
		 mockLogger.error('Error', 'error message');
			mockLogger.fatal('Fatal', 'fatal message');
			
			expect(mockLogger.getLogCount()).toBe(6);
			expect(mockLogger.getLogCount(LogLevel.VERBOSE)).toBe(1);
			expect(mockLogger.getLogCount(LogLevel.DEBUG)).toBe(1);
			expect(mockLogger.getLogCount(LogLevel.INFO)).toBe(1);
			expect(mockLogger.getLogCount(LogLevel.ERROR)).toBe(1);
			expect(mockLogger.getLogCount(LogLevel.FATAL)).toBe(1);
		});
	});

	describe('Child Loggers', () => {
		it('should create child logger with context', () => {
			const childLogger = mockLogger.child({ userId: '123', sessionId: 'abc' }) as MockLogger;
			childLogger.info('User Action', 'Action performed');
			
			const lastLog = mockLogger.getLastLog();
			expect(lastLog?.extra).toMatchObject({ userId: '123', sessionId: 'abc' });
		});

		it('should merge child context with log extra data', () => {
			const childLogger = mockLogger.child({ userId: '123' }) as MockLogger;
			childLogger.info('User Action', 'Action performed', { action: 'click' });
			
			const lastLog = mockLogger.getLastLog();
			// Child context is immutable and takes precedence
			expect(lastLog?.extra).toMatchObject({ userId: '123', action: 'click' });
			expect(lastLog?.extra?.userId).toBe('123');
		});
	});

	describe('Log Level Type Guards', () => {
		it('should check if log levels are enabled', () => {
			// MockLogger captures all levels, so all should be enabled
			expect(mockLogger.isVerboseEnabled()).toBe(false); // Console disabled
			expect(mockLogger.isDebugEnabled()).toBe(false);
			expect(mockLogger.isInfoEnabled()).toBe(false);
		});
	});

	describe('Timer Helper', () => {
		it('should measure operation duration', async () => {
			const timer = mockLogger.time('Test Operation');
			
			// Simulate some work
			await new Promise(resolve => setTimeout(resolve, 50));
			
			timer.end();
			
			const lastLog = mockLogger.getLastLog();
			expect(lastLog?.title).toBe('Timer');
			expect(lastLog?.message).toBe('Test Operation completed');
			expect(lastLog?.extra?.duration).toMatch(/\d+ms/);
		});

		it('should use custom log level for timer', () => {
			const timer = mockLogger.time('Test Operation', LogLevel.INFO);
			timer.end();
			
			const lastLog = mockLogger.getLastLog();
			expect(lastLog?.level).toBe(LogLevel.INFO);
		});

		it('should allow cancelling timer', () => {
			const timer = mockLogger.time('Test Operation');
			timer.cancel();
			
			// Should not create a log entry
			expect(mockLogger.getLogCount()).toBe(0);
		});

		it('should allow adding extra context on end', () => {
			const timer = mockLogger.time('Test Operation');
			timer.end({ result: 'success', items: 5 });
			
			const lastLog = mockLogger.getLastLog();
			expect(lastLog?.extra?.duration).toMatch(/\d+ms/);
			expect(lastLog?.extra?.result).toBe('success');
			expect(lastLog?.extra?.items).toBe(5);
		});
	});

	describe('Mock Logger Utilities', () => {
		it('should clear all logs', () => {
			mockLogger.info('Test 1', 'message 1');
			mockLogger.info('Test 2', 'message 2');
			expect(mockLogger.getLogCount()).toBe(2);
			
			mockLogger.clear();
			expect(mockLogger.getLogCount()).toBe(0);
		});

		it('should check if log exists by title', () => {
			mockLogger.info('User Login', 'User authenticated');
			
			expect(mockLogger.hasLog('User Login')).toBe(true);
			expect(mockLogger.hasLog('User Logout')).toBe(false);
		});

		it('should filter logs by level', () => {
			mockLogger.info('Info 1', 'message');
			mockLogger.error('Error 1', 'message');
			mockLogger.info('Info 2', 'message');
			
			const infoLogs = mockLogger.getLogs(LogLevel.INFO);
			const errorLogs = mockLogger.getLogs(LogLevel.ERROR);
			
			expect(infoLogs.length).toBe(2);
			expect(errorLogs.length).toBe(1);
		});
	});

	describe('Custom Log Types', () => {
		it('should register and use custom log types', () => {
			mockLogger.registerCustomType({
				name: 'GAME_EVENT',
				level: LogLevel.INFO,
				color: 'green',
			});
			
			mockLogger.custom('GAME_EVENT', 'Player Level Up', 'Player reached level 10', { playerId: '123' });
			
			const lastLog = mockLogger.getLastLog();
			expect(lastLog?.customType).toBe('GAME_EVENT');
			expect(lastLog?.level).toBe(LogLevel.INFO);
		});
	});
});

describe('Logger Factory', () => {
	it('should create logger from environment', () => {
		const logger = createLogger('test-app');
		expect(logger).toBeDefined();
	});
});
