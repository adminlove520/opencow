#!/usr/bin/env node

/**
 * Bundle the codex native bridge dependencies (@modelcontextprotocol/sdk + zod)
 * into a single CJS file so they can be shipped via extraResources instead of
 * asarUnpack. This avoids the minimatch "pattern is too long" crash during
 * universal macOS builds (see @electron/universal mergeASARs).
 */

import { build } from 'esbuild'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '..')
const outfile = path.join(projectRoot, 'resources', 'codex-bridge-deps.cjs')

// Virtual entry that re-exports the three modules the bridge script needs
const entryContents = `
const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { z } = require('zod/v4');

module.exports = { McpServer, StdioServerTransport, z };
`

await build({
  stdin: {
    contents: entryContents,
    resolveDir: projectRoot,
    loader: 'js',
  },
  outfile,
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node20',
  minify: false,
  sourcemap: false,
  // Keep readable for debugging production issues
  legalComments: 'none',
})

console.log(`[bundle-bridge-deps] wrote ${outfile}`)
