import { ILogger, LogLevel as SapphireLogLevel } from '@sapphire/framework';
import { LogLevel as BejascLogLevel } from '@bejasc/logger';
import type { Logger } from '@bejasc/logger';

function toBejasc(level: SapphireLogLevel): BejascLogLevel {
  if (level <= SapphireLogLevel.Trace) return BejascLogLevel.VERBOSE;
  if (level <= SapphireLogLevel.Debug) return BejascLogLevel.DEBUG;
  if (level <= SapphireLogLevel.Info)  return BejascLogLevel.INFO;
  if (level <= SapphireLogLevel.Warn)  return BejascLogLevel.WARN;
  if (level <= SapphireLogLevel.Error) return BejascLogLevel.ERROR;
  return BejascLogLevel.FATAL;
}

function parseValues(values: readonly unknown[]): { title: string; message?: string; error?: Error } {
  const [first, ...rest] = values;
  const title = String(first ?? '');
  const err = rest.find((v): v is Error => v instanceof Error);
  const msg = rest.filter(v => !(v instanceof Error)).map(String).filter(Boolean).join(' ');
  return { title, message: msg || undefined, error: err };
}

export class BotLogger implements ILogger {
  public readonly level: SapphireLogLevel;
  private readonly inner: Logger;

  public constructor(inner: Logger, level: SapphireLogLevel = SapphireLogLevel.Info) {
    this.inner = inner;
    this.level = level;
  }

  public has(level: SapphireLogLevel): boolean {
    return this.inner.isLevelEnabled(toBejasc(level));
  }

  public trace(...values: readonly unknown[]): void { this.write(SapphireLogLevel.Trace, ...values); }
  public debug(...values: readonly unknown[]): void { this.write(SapphireLogLevel.Debug, ...values); }
  public info(...values:  readonly unknown[]): void { this.write(SapphireLogLevel.Info,  ...values); }
  public warn(...values:  readonly unknown[]): void { this.write(SapphireLogLevel.Warn,  ...values); }
  public error(...values: readonly unknown[]): void { this.write(SapphireLogLevel.Error, ...values); }
  public fatal(...values: readonly unknown[]): void { this.write(SapphireLogLevel.Fatal, ...values); }

  public write(level: SapphireLogLevel, ...values: readonly unknown[]): void {
    if (!this.has(level)) return;
    const { title, message, error } = parseValues(values);

    switch (toBejasc(level)) {
      case BejascLogLevel.VERBOSE: this.inner.verbose(title, message); break;
      case BejascLogLevel.DEBUG:   this.inner.debug(title, message);   break;
      case BejascLogLevel.INFO:    this.inner.info(title, message);    break;
      case BejascLogLevel.WARN:    this.inner.warn(title, message);    break;
      case BejascLogLevel.ERROR:
        if (error && message) this.inner.error(title, message, error);
        else if (error)       this.inner.error(title, error);
        else                  this.inner.error(title, message);
        break;
      case BejascLogLevel.FATAL:
        if (error && message) this.inner.fatal(title, message, error);
        else if (error)       this.inner.fatal(title, error);
        else                  this.inner.fatal(title, message);
        break;
    }
  }
}
