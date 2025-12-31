import { z } from 'zod';
import { apiClient } from '../api-client';
import { config } from '../config';

export const supplementTools = {
  get_supplements: {
    description: 'Get the user\'s supplements list. Can filter by category or show only active supplements.',
    inputSchema: z.object({
      category: z.string().optional().describe('Filter by category (vitamin, mineral, herb, amino acid, etc.)'),
      active_only: z.boolean().optional().default(true).describe('Only show active/current supplements'),
    }),
    handler: async (args: { category?: string; active_only?: boolean }) => {
      const supplements = await apiClient.getSupplements(args);

      if (!supplements || supplements.length === 0) {
        return { content: [{ type: 'text' as const, text: 'No supplements found.' }] };
      }

      const formatted = supplements.map(s => {
        const dose = s.dose ? ` - ${s.dose}` : '';
        const timing = s.timing ? ` (${s.timing})` : '';
        const brand = s.brand ? ` [${s.brand}]` : '';
        return `• ${s.name}${dose}${timing}${brand}`;
      }).join('\n');

      const activeLabel = args.active_only ? 'active ' : '';
      return {
        content: [{
          type: 'text' as const,
          text: `Found ${supplements.length} ${activeLabel}supplements:\n\n${formatted}`
        }]
      };
    }
  },

  add_supplement: {
    description: 'Add a new supplement to the user\'s protocol.',
    inputSchema: z.object({
      name: z.string().describe('Name of the supplement'),
      brand: z.string().optional().describe('Brand name'),
      dose: z.string().optional().describe('Dose per serving (e.g., "5000 IU", "500mg")'),
      category: z.string().optional().describe('Category (vitamin, mineral, herb, amino acid, probiotic, other)'),
      timing: z.string().optional().describe('When to take (morning, afternoon, evening, with food, etc.)'),
      frequency: z.string().optional().describe('How often (daily, twice daily, as needed, etc.)'),
      notes: z.string().optional().describe('Additional notes or reasons for taking'),
    }),
    handler: async (args: any) => {
      if (config.readOnly) {
        return { content: [{ type: 'text' as const, text: 'Error: Server is in read-only mode.' }] };
      }

      const supplement = await apiClient.createSupplement(args);

      const dose = supplement.dose ? ` (${supplement.dose})` : '';
      return {
        content: [{
          type: 'text' as const,
          text: `✓ Added supplement: ${supplement.name}${dose}`
        }]
      };
    }
  }
};
