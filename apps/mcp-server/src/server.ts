import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { allTools } from './tools';
import { apiClient } from './api-client';
import { config } from './config';

export async function createServer() {
  const server = new Server(
    {
      name: 'singularity-health',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
        resources: {},
        prompts: {},
      },
    }
  );

  // List available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    const tools = Object.entries(allTools).map(([name, tool]) => ({
      name,
      description: tool.description,
      inputSchema: {
        type: 'object' as const,
        properties: tool.inputSchema._def?.shape
          ? Object.fromEntries(
              Object.entries(tool.inputSchema._def.shape()).map(([key, schema]: [string, any]) => [
                key,
                {
                  type: getZodType(schema),
                  description: schema._def?.description || '',
                },
              ])
            )
          : {},
        required: tool.inputSchema._def?.shape
          ? Object.entries(tool.inputSchema._def.shape())
              .filter(([_, schema]: [string, any]) => !schema.isOptional?.())
              .map(([key]) => key)
          : [],
      },
    }));

    return { tools };
  });

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    const tool = allTools[name as keyof typeof allTools];
    if (!tool) {
      return {
        content: [{ type: 'text', text: `Unknown tool: ${name}` }],
        isError: true,
      };
    }

    try {
      const result = await tool.handler(args || {});
      return result;
    } catch (error: any) {
      return {
        content: [{ type: 'text', text: `Error: ${error.message}` }],
        isError: true,
      };
    }
  });

  // List resources (health data categories)
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    return {
      resources: [
        {
          uri: 'health://biomarkers',
          name: 'Biomarkers',
          description: 'Lab test results and health markers',
          mimeType: 'application/json',
        },
        {
          uri: 'health://supplements',
          name: 'Supplements',
          description: 'Current supplement protocol',
          mimeType: 'application/json',
        },
        {
          uri: 'health://routines',
          name: 'Routines',
          description: 'Daily health routines',
          mimeType: 'application/json',
        },
        {
          uri: 'health://goals',
          name: 'Goals',
          description: 'Health goals and progress',
          mimeType: 'application/json',
        },
        {
          uri: 'health://knowledge',
          name: 'Knowledge Base',
          description: 'Health protocols and reference docs',
          mimeType: 'application/json',
        },
      ],
    };
  });

  // Read resources
  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const { uri } = request.params;

    try {
      let data: any;

      switch (uri) {
        case 'health://biomarkers':
          data = await apiClient.getBiomarkers({ limit: 50 });
          break;
        case 'health://supplements':
          data = await apiClient.getSupplements({ active_only: true });
          break;
        case 'health://routines':
          data = await apiClient.getRoutines();
          break;
        case 'health://goals':
          data = await apiClient.getGoals({ status: 'active' });
          break;
        case 'health://knowledge':
          data = await apiClient.getProtocolDocs({});
          break;
        default:
          throw new Error(`Unknown resource: ${uri}`);
      }

      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(data, null, 2),
          },
        ],
      };
    } catch (error: any) {
      return {
        contents: [
          {
            uri,
            mimeType: 'text/plain',
            text: `Error: ${error.message}`,
          },
        ],
      };
    }
  });

  // List prompts
  server.setRequestHandler(ListPromptsRequestSchema, async () => {
    return {
      prompts: [
        {
          name: 'health-review',
          description: 'Comprehensive review of current health status and recommendations',
        },
        {
          name: 'supplement-check',
          description: 'Review supplement protocol for potential interactions or optimizations',
        },
        {
          name: 'biomarker-analysis',
          description: 'Analyze biomarker trends and suggest areas of focus',
        },
      ],
    };
  });

  // Get prompt
  server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    const { name } = request.params;

    const prompts: Record<string, { description: string; messages: any[] }> = {
      'health-review': {
        description: 'Comprehensive health review',
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Please review my current health status. Use get_health_summary to see my data, then provide:
1. Summary of current biomarker status (any concerns?)
2. Review of my supplement protocol
3. Progress toward my health goals
4. Specific recommendations for improvement`,
            },
          },
        ],
      },
      'supplement-check': {
        description: 'Supplement protocol review',
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Review my supplement protocol using get_supplements. Check for:
1. Potential interactions between supplements
2. Optimal timing and dosing
3. Gaps based on my health goals
4. Cost optimization opportunities`,
            },
          },
        ],
      },
      'biomarker-analysis': {
        description: 'Biomarker trend analysis',
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Analyze my biomarker data using get_biomarkers. Focus on:
1. Any values outside normal ranges
2. Trends over time (improving or declining)
3. Correlations with my supplement protocol
4. Recommended tests to add`,
            },
          },
        ],
      },
    };

    const prompt = prompts[name];
    if (!prompt) {
      throw new Error(`Unknown prompt: ${name}`);
    }

    return prompt;
  });

  return server;
}

// Helper to convert Zod types to JSON Schema types
function getZodType(schema: any): string {
  const typeName = schema._def?.typeName;

  switch (typeName) {
    case 'ZodString':
      return 'string';
    case 'ZodNumber':
      return 'number';
    case 'ZodBoolean':
      return 'boolean';
    case 'ZodArray':
      return 'array';
    case 'ZodObject':
      return 'object';
    case 'ZodOptional':
      return getZodType(schema._def.innerType);
    case 'ZodDefault':
      return getZodType(schema._def.innerType);
    case 'ZodEnum':
      return 'string';
    default:
      return 'string';
  }
}

export async function runServer() {
  const server = await createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error('Singularity Health MCP Server running on stdio');
  console.error(`API URL: ${config.apiBaseUrl}`);
  console.error(`Read-only mode: ${config.readOnly}`);
}
