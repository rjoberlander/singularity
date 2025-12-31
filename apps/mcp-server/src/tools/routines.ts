import { z } from 'zod';
import { apiClient } from '../api-client';

export const routineTools = {
  get_routines: {
    description: 'Get the user\'s daily routines including morning, afternoon, and evening protocols.',
    inputSchema: z.object({}),
    handler: async () => {
      const routines = await apiClient.getRoutines();

      if (!routines || routines.length === 0) {
        return { content: [{ type: 'text' as const, text: 'No routines found.' }] };
      }

      const formatted = routines.map(r => {
        const timeLabel = r.time_of_day ? ` (${r.time_of_day})` : '';
        let text = `\n## ${r.name}${timeLabel}\n`;

        if (r.items && r.items.length > 0) {
          text += r.items.map((item: any) => {
            const time = item.time ? ` @ ${item.time}` : '';
            const duration = item.duration ? ` [${item.duration}]` : '';
            const supplement = item.supplement ? ` → ${item.supplement.name}` : '';
            return `  • ${item.title}${time}${duration}${supplement}`;
          }).join('\n');
        } else {
          text += '  (no items)';
        }

        return text;
      }).join('\n');

      return {
        content: [{
          type: 'text' as const,
          text: `Daily Routines:${formatted}`
        }]
      };
    }
  }
};
