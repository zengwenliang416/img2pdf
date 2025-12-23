/**
 * 日志工具模块
 * 提供可配置的日志级别控制，生产环境自动禁用调试日志
 */

export type LogLevel = "debug" | "info" | "warn" | "error" | "none";

interface LoggerConfig {
  level: LogLevel;
  prefix: string;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  none: 4,
};

// 根据环境自动设置日志级别
const DEFAULT_LEVEL: LogLevel =
  process.env.NODE_ENV === "production" ? "warn" : "debug";

class Logger {
  private config: LoggerConfig;

  constructor(prefix: string = "[App]", level?: LogLevel) {
    this.config = {
      prefix,
      level: level ?? DEFAULT_LEVEL,
    };
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.config.level];
  }

  private formatMessage(level: string, message: string): string {
    return `${this.config.prefix} ${message}`;
  }

  debug(message: string, ...args: unknown[]): void {
    if (this.shouldLog("debug")) {
      console.log(this.formatMessage("DEBUG", message), ...args);
    }
  }

  info(message: string, ...args: unknown[]): void {
    if (this.shouldLog("info")) {
      console.info(this.formatMessage("INFO", message), ...args);
    }
  }

  warn(message: string, ...args: unknown[]): void {
    if (this.shouldLog("warn")) {
      console.warn(this.formatMessage("WARN", message), ...args);
    }
  }

  error(message: string, ...args: unknown[]): void {
    if (this.shouldLog("error")) {
      console.error(this.formatMessage("ERROR", message), ...args);
    }
  }

  setLevel(level: LogLevel): void {
    this.config.level = level;
  }
}

// 预定义的模块日志器
export const filterLogger = new Logger("[Filter]");
export const exportLogger = new Logger("[Export]");
export const transformLogger = new Logger("[Transform]");
export const edgeLogger = new Logger("[Edge]");
export const opencvLogger = new Logger("[OpenCV]");

// 组件日志器
export const uploadLogger = new Logger("[Upload]");
export const cornerLogger = new Logger("[Corner]");
export const filterPanelLogger = new Logger("[FilterPanel]");

// 默认日志器
export const logger = new Logger();

// 工厂函数，用于创建自定义日志器
export function createLogger(prefix: string, level?: LogLevel): Logger {
  return new Logger(prefix, level);
}
