import { z } from 'zod';
import { apiClient } from '../api-client';
import { config } from '../config';

export const biomarkerTools = {
  get_biomarkers: {
    description: 'Get biomarker/lab test results. Can filter by category (e.g., "metabolic", "hormones", "vitamins") or date range.',
    inputSchema: z.object({
      category: z.string().optional().describe('Filter by category (e.g., metabolic, hormones, vitamins, minerals, lipids)'),
      limit: z.number().optional().default(20).describe('Maximum number of results'),
      date_from: z.string().optional().describe('Start date (YYYY-MM-DD)'),
      date_to: z.string().optional().describe('End date (YYYY-MM-DD)'),
    }),
    handler: async (args: { category?: string; limit?: number; date_from?: string; date_to?: string }) => {
      const biomarkers = await apiClient.getBiomarkers(args);

      if (!biomarkers || biomarkers.length === 0) {
        return { content: [{ type: 'text' as const, text: 'No biomarkers found.' }] };
      }

      const formatted = biomarkers.map(b => {
        let status = '';
        if (b.reference_range_low && b.reference_range_high) {
          if (b.value < b.reference_range_low) status = ' ⚠️ LOW';
          else if (b.value > b.reference_range_high) status = ' ⚠️ HIGH';
          else status = ' ✓';
        }
        return `• ${b.name}: ${b.value} ${b.unit}${status} (${b.date_tested})`;
      }).join('\n');

      return {
        content: [{
          type: 'text' as const,
          text: `Found ${biomarkers.length} biomarkers:\n\n${formatted}`
        }]
      };
    }
  },

  get_biomarker_history: {
    description: 'Get historical values for a specific biomarker to see trends over time.',
    inputSchema: z.object({
      name: z.string().describe('Name of the biomarker (e.g., "Vitamin D", "HbA1c", "TSH")'),
    }),
    handler: async (args: { name: string }) => {
      const history = await apiClient.getBiomarkerHistory(args.name);

      if (!history || history.length === 0) {
        return { content: [{ type: 'text' as const, text: `No history found for "${args.name}".` }] };
      }

      const formatted = history.map(h =>
        `• ${h.date_tested}: ${h.value} ${h.unit}`
      ).join('\n');

      return {
        content: [{
          type: 'text' as const,
          text: `History for ${args.name} (${history.length} records):\n\n${formatted}`
        }]
      };
    }
  },

  add_biomarker: {
    description: 'Record a new biomarker/lab test result. Use this when the user shares new lab values.',
    inputSchema: z.object({
      name: z.string().describe('Name of the biomarker (e.g., "Vitamin D", "HbA1c")'),
      value: z.number().describe('The measured value'),
      unit: z.string().describe('Unit of measurement (e.g., "ng/mL", "%", "mg/dL")'),
      date_tested: z.string().describe('Date of test (YYYY-MM-DD)'),
      category: z.string().optional().describe('Category (metabolic, hormones, vitamins, minerals, lipids, etc.)'),
      reference_range_low: z.number().optional().describe('Low end of normal reference range'),
      reference_range_high: z.number().optional().describe('High end of normal reference range'),
      notes: z.string().optional().describe('Additional notes'),
    }),
    handler: async (args: any) => {
      if (config.readOnly) {
        return { content: [{ type: 'text' as const, text: 'Error: Server is in read-only mode.' }] };
      }

      const biomarker = await apiClient.createBiomarker(args);

      return {
        content: [{
          type: 'text' as const,
          text: `✓ Saved biomarker: ${biomarker.name} = ${biomarker.value} ${biomarker.unit} (${biomarker.date_tested})`
        }]
      };
    }
  }
};
