/**
 * Eight Sleep Module
 *
 * Provides integration with Eight Sleep API for sleep tracking data.
 * Includes encrypted credential storage, automatic sync scheduling,
 * and sleep analysis features.
 */

export { EightSleepController } from './controllers/eightSleepController';
export { EightSleepService } from './services/eightSleepService';
export { SleepCorrelationService } from './services/sleepCorrelationService';
export { default as eightSleepRoutes } from './routes';
export {
  startSyncScheduler,
  stopSyncScheduler,
  isSchedulerRunning,
  getSchedulerStatus,
} from './jobs/syncScheduler';
export * from './types';
