import cron from 'node-cron';
import { container } from '@sapphire/framework';

export class TaskManager {
  private tasks = new Map<string, cron.ScheduledTask>();

  register(name: string, expression: string, fn: () => void | Promise<void>): void {
    if (this.tasks.has(name)) {
      container.logger.warn(`TaskManager: job "${name}" is already registered — skipping`);
      return;
    }
    const task = cron.schedule(expression, () => {
      container.logger.debug(`TaskManager: running job "${name}"`);
      Promise.resolve(fn()).catch((err) => {
        container.logger.error(`TaskManager: job "${name}" threw:`, err);
      });
    });
    this.tasks.set(name, task);
    container.logger.info(`TaskManager: registered job "${name}" (${expression})`);
  }

  deregister(name: string): void {
    const task = this.tasks.get(name);
    if (!task) {
      container.logger.warn(`TaskManager: job "${name}" not found`);
      return;
    }
    task.stop();
    this.tasks.delete(name);
    container.logger.info(`TaskManager: deregistered job "${name}"`);
  }
}

export const taskManager = new TaskManager();
