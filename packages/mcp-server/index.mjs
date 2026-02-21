/**
 * index.mjs — OMCM MCP Server unified entry point.
 *
 * Registers all tools from three sub-servers:
 *   - Fusion (omcm_fusion_*)
 *   - Semantic Code Index (omcm_index_*)
 *   - Cross-session Learning / Memory (omcm_memory_*)
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerFusionTools } from './servers/fusion/index.mjs';
import { registerIndexTools } from './servers/index/index.mjs';
import { registerMemoryTools } from './servers/memory/index.mjs';

const server = new McpServer({
  name: 'omcm',
  version: '0.1.0',
  description: 'OMCM MCP Server — Fusion, Semantic Index, Cross-session Learning',
});

registerFusionTools(server);
registerIndexTools(server);
registerMemoryTools(server);

const transport = new StdioServerTransport();
await server.connect(transport);
