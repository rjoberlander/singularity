import { z } from 'zod';
import { apiClient } from '../api-client';

export const sleepTools = {
  get_sleep_data: {
    description: 'Get recent sleep data from Eight Sleep integration including sleep scores, HRV, heart rate, and sleep stages.',
    inputSchema: z.object({
      limit: z.number().optional().default(7).describe('Number of nights to retrieve'),
    }),
    handler: async (args: { limit?: number }) => {
      try {
        const sessions = await apiClient.getSleepSessions(args);

        if (!sessions || sessions.length === 0) {
          return { content: [{ type: 'text' as const, text: 'No sleep data found. Eight Sleep may not be connected.' }] };
        }

        const formatted = sessions.map(s => {
          const score = s.sleep_score ? `Score: ${s.sleep_score}` : '';
          const hrv = s.hrv_avg ? `HRV: ${Math.round(s.hrv_avg)}ms` : '';
          const hr = s.heart_rate_avg ? `HR: ${Math.round(s.heart_rate_avg)}bpm` : '';
          const duration = s.total_sleep_duration
            ? `Duration: ${Math.round(s.total_sleep_duration / 60)}h ${s.total_sleep_duration % 60}m`
            : '';

          return `• ${s.date}: ${[score, duration, hrv, hr].filter(Boolean).join(' | ')}`;
        }).join('\n');

        return {
          content: [{
            type: 'text' as const,
            text: `Sleep Data (last ${sessions.length} nights):\n\n${formatted}`
          }]
        };
      } catch (error: any) {
        return {
          content: [{
            type: 'text' as const,
            text: `Could not fetch sleep data: ${error.message}`
          }]
        };
      }
    }
  },

  get_sleep_analysis: {
    description: 'Get an analysis of sleep patterns and trends.',
    inputSchema: z.object({}),
    handler: async () => {
      try {
        const analysis = await apiClient.getSleepAnalysis();

        if (!analysis) {
          return { content: [{ type: 'text' as const, text: 'No sleep analysis available.' }] };
        }

        return {
          content: [{
            type: 'text' as const,
            text: `Sleep Analysis:\n\n${JSON.stringify(analysis, null, 2)}`
          }]
        };
      } catch (error: any) {
        return {
          content: [{
            type: 'text' as const,
            text: `Could not fetch sleep analysis: ${error.message}`
          }]
        };
      }
    }
  }
};
