import { biomarkerTools } from './biomarkers';
import { supplementTools } from './supplements';
import { routineTools } from './routines';
import { goalTools } from './goals';
import { knowledgeTools } from './knowledge';
import { sleepTools } from './sleep';
import { apiClient } from '../api-client';
import { z } from 'zod';

// Health summary tool - combines multiple data sources
const healthSummaryTool = {
  get_health_summary: {
    description: 'Get a comprehensive overview of the user\'s health data including recent biomarkers, active supplements, goals, and routines. Use this first to understand the user\'s current health context.',
    inputSchema: z.object({}),
    handler: async () => {
      try {
        // Fetch data in parallel
        const [biomarkers, supplements, goals, routines] = await Promise.all([
          apiClient.getBiomarkers({ limit: 10 }).catch(() => []),
          apiClient.getSupplements({ active_only: true }).catch(() => []),
          apiClient.getGoals({ status: 'active' }).catch(() => []),
          apiClient.getRoutines().catch(() => []),
        ]);

        let summary = '# Health Summary\n\n';

        // Recent biomarkers
        summary += '## Recent Biomarkers\n';
        if (biomarkers.length > 0) {
          summary += biomarkers.slice(0, 5).map((b: any) => {
            let status = '';
            if (b.reference_range_low && b.reference_range_high) {
              if (b.value < b.reference_range_low) status = ' ⚠️ LOW';
              else if (b.value > b.reference_range_high) status = ' ⚠️ HIGH';
              else status = ' ✓';
            }
            return `• ${b.name}: ${b.value} ${b.unit}${status}`;
          }).join('\n');
        } else {
          summary += '(none recorded)';
        }

        // Active supplements
        summary += '\n\n## Active Supplements\n';
        if (supplements.length > 0) {
          summary += supplements.map((s: any) =>
            `• ${s.name}${s.dose ? ` (${s.dose})` : ''}${s.timing ? ` - ${s.timing}` : ''}`
          ).join('\n');
        } else {
          summary += '(none)';
        }

        // Active goals
        summary += '\n\n## Active Goals\n';
        if (goals.length > 0) {
          summary += goals.map((g: any) => `• ${g.title}`).join('\n');
        } else {
          summary += '(none)';
        }

        // Routines
        summary += '\n\n## Daily Routines\n';
        if (routines.length > 0) {
          summary += routines.map((r: any) =>
            `• ${r.name}${r.time_of_day ? ` (${r.time_of_day})` : ''}: ${r.items?.length || 0} items`
          ).join('\n');
        } else {
          summary += '(none defined)';
        }

        return {
          content: [{
            type: 'text' as const,
            text: summary
          }]
        };
      } catch (error: any) {
        return {
          content: [{
            type: 'text' as const,
            text: `Error fetching health summary: ${error.message}`
          }]
        };
      }
    }
  }
};

// Export all tools combined
export const allTools = {
  ...healthSummaryTool,
  ...biomarkerTools,
  ...supplementTools,
  ...routineTools,
  ...goalTools,
  ...knowledgeTools,
  ...sleepTools,
};

export {
  biomarkerTools,
  supplementTools,
  routineTools,
  goalTools,
  knowledgeTools,
  sleepTools,
};
