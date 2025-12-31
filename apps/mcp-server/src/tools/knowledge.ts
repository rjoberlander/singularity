import { z } from 'zod';
import { apiClient } from '../api-client';
import { config } from '../config';

export const knowledgeTools = {
  search_knowledge: {
    description: 'Search the user\'s health knowledge base / protocol docs. Use this to find specific information about their health protocols, notes, or reference materials.',
    inputSchema: z.object({
      query: z.string().describe('Search query'),
    }),
    handler: async (args: { query: string }) => {
      const docs = await apiClient.searchProtocolDocs(args.query);

      if (!docs || docs.length === 0) {
        return { content: [{ type: 'text' as const, text: `No results found for "${args.query}".` }] };
      }

      const formatted = docs.map(d => {
        const preview = d.content
          ? d.content.substring(0, 200) + (d.content.length > 200 ? '...' : '')
          : '(no content)';
        return `## ${d.title}\nCategory: ${d.category}\n${preview}`;
      }).join('\n\n---\n\n');

      return {
        content: [{
          type: 'text' as const,
          text: `Found ${docs.length} results:\n\n${formatted}`
        }]
      };
    }
  },

  get_knowledge: {
    description: 'Get all protocol docs / knowledge base entries, optionally filtered by category.',
    inputSchema: z.object({
      category: z.enum(['routine', 'biomarkers', 'supplements', 'goals', 'reference', 'other']).optional()
        .describe('Filter by category'),
    }),
    handler: async (args: { category?: string }) => {
      const docs = await apiClient.getProtocolDocs(args);

      if (!docs || docs.length === 0) {
        return { content: [{ type: 'text' as const, text: 'No knowledge base entries found.' }] };
      }

      const formatted = docs.map(d =>
        `• [${d.category}] ${d.title}`
      ).join('\n');

      return {
        content: [{
          type: 'text' as const,
          text: `Knowledge Base (${docs.length} entries):\n\n${formatted}`
        }]
      };
    }
  },

  save_knowledge: {
    description: 'Save new information to the user\'s health knowledge base. Use this when the user wants to remember something important about their health, protocols, or learnings.',
    inputSchema: z.object({
      title: z.string().describe('Title for this knowledge entry'),
      content: z.string().describe('The content/information to save'),
      category: z.enum(['routine', 'biomarkers', 'supplements', 'goals', 'reference', 'other'])
        .describe('Category for this entry'),
    }),
    handler: async (args: { title: string; content: string; category: any }) => {
      if (config.readOnly) {
        return { content: [{ type: 'text' as const, text: 'Error: Server is in read-only mode.' }] };
      }

      const doc = await apiClient.createProtocolDoc(args);

      return {
        content: [{
          type: 'text' as const,
          text: `✓ Saved to knowledge base: "${doc.title}" [${doc.category}]`
        }]
      };
    }
  }
};
