import { z } from 'zod';
import { apiClient } from '../api-client';
import { config } from '../config';

export const goalTools = {
  get_goals: {
    description: 'Get the user\'s health goals, optionally filtered by status or category.',
    inputSchema: z.object({
      status: z.enum(['active', 'achieved', 'paused']).optional().describe('Filter by goal status'),
      category: z.string().optional().describe('Filter by category'),
    }),
    handler: async (args: { status?: 'active' | 'achieved' | 'paused'; category?: string }) => {
      const goals = await apiClient.getGoals(args);

      if (!goals || goals.length === 0) {
        return { content: [{ type: 'text' as const, text: 'No goals found.' }] };
      }

      const formatted = goals.map(g => {
        const statusIcon = g.status === 'achieved' ? '✓' : g.status === 'paused' ? '⏸' : '→';
        const target = g.target_biomarker && g.target_value
          ? ` (Target: ${g.direction} ${g.target_biomarker} to ${g.target_value})`
          : '';

        let text = `${statusIcon} ${g.title}${target}`;

        if (g.interventions && g.interventions.length > 0) {
          text += '\n' + g.interventions.map((i: any) =>
            `    - ${i.intervention}`
          ).join('\n');
        }

        return text;
      }).join('\n\n');

      return {
        content: [{
          type: 'text' as const,
          text: `Health Goals:\n\n${formatted}`
        }]
      };
    }
  },

  add_goal: {
    description: 'Create a new health goal.',
    inputSchema: z.object({
      title: z.string().describe('Goal title/description'),
      category: z.string().optional().describe('Category (e.g., sleep, energy, weight, longevity)'),
      target_biomarker: z.string().optional().describe('Biomarker to target (e.g., "HbA1c", "Vitamin D")'),
      target_value: z.number().optional().describe('Target value for the biomarker'),
      direction: z.enum(['increase', 'decrease', 'maintain']).describe('Direction of change'),
      priority: z.number().optional().default(1).describe('Priority (1-5, higher = more important)'),
      notes: z.string().optional().describe('Additional notes or context'),
    }),
    handler: async (args: any) => {
      if (config.readOnly) {
        return { content: [{ type: 'text' as const, text: 'Error: Server is in read-only mode.' }] };
      }

      const goal = await apiClient.createGoal(args);

      return {
        content: [{
          type: 'text' as const,
          text: `✓ Created goal: ${goal.title}`
        }]
      };
    }
  }
};
