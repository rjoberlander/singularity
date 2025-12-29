/**
 * AI API Key Health Check Cron Job
 *
 * Runs nightly at 2 AM to test all active AI API keys
 * and update their health status in the database.
 */

import cron from 'node-cron';
import AIAPIKeyService from '../modules/ai-api-keys/services/aiAPIKeyService';

/**
 * Start the nightly health check cron job
 * Runs at 2:00 AM every day
 */
export function startAIKeyHealthCheckCron(): void {
  // Cron expression: 0 2 * * * = At 02:00 every day
  const cronExpression = '0 2 * * *';

  console.log('Scheduling AI API key health check cron job (daily at 2:00 AM)');

  cron.schedule(cronExpression, async () => {
    console.log(`[${new Date().toISOString()}] Starting nightly AI API key health check...`);

    try {
      const summary = await AIAPIKeyService.healthCheckAll();

      console.log(`[${new Date().toISOString()}] AI API key health check completed:`);
      console.log(`  Total keys tested: ${summary.total_keys}`);
      console.log(`  Healthy: ${summary.healthy}`);
      console.log(`  Unhealthy: ${summary.unhealthy}`);

      if (summary.failures.length > 0) {
        console.log('  Failures:');
        summary.failures.forEach(failure => {
          console.log(`    - ${failure.provider}/${failure.key_name}: ${failure.error}`);
        });
      }
    } catch (error) {
      console.error(`[${new Date().toISOString()}] AI API key health check failed:`, error);
    }
  });

  console.log('AI API key health check cron job scheduled successfully');
}

/**
 * Run health check immediately (for testing or manual trigger)
 */
export async function runHealthCheckNow(): Promise<void> {
  console.log(`[${new Date().toISOString()}] Running manual AI API key health check...`);

  try {
    const summary = await AIAPIKeyService.healthCheckAll();

    console.log(`[${new Date().toISOString()}] Manual health check completed:`);
    console.log(`  Total keys tested: ${summary.total_keys}`);
    console.log(`  Healthy: ${summary.healthy}`);
    console.log(`  Unhealthy: ${summary.unhealthy}`);

    if (summary.failures.length > 0) {
      console.log('  Failures:');
      summary.failures.forEach(failure => {
        console.log(`    - ${failure.provider}/${failure.key_name}: ${failure.error}`);
      });
    }
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Manual health check failed:`, error);
    throw error;
  }
}

export default { startAIKeyHealthCheckCron, runHealthCheckNow };
