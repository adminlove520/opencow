// SPDX-License-Identifier: Apache-2.0

/**
 * Asar-aware child process spawning for Electron.
 *
 * Problem: child processes spawned with the system `node` binary cannot read
 * from Electron's virtual `app.asar` filesystem. This breaks `require()` for
 * any module still inside the asar archive.
 *
 * Solution (packaged app only): spawn child processes using the Electron
 * binary with `ELECTRON_RUN_AS_NODE=1`. In this mode the Electron binary
 * behaves as standard Node.js with native asar support.
 *
 * In dev mode there is no asar — system `node` is used directly, avoiding
 * the macOS Dock icon that appears when spawning the Electron binary.
 */

import { spawn } from 'node:child_process'
import { app } from 'electron'
import type { SpawnOptions, SpawnedProcess } from '@anthropic-ai/claude-agent-sdk'
import { resolveNodeExecutableForChildProcess } from './shellPath'

/**
 * Resolve the Node-compatible command for spawning child processes.
 *
 * - **Packaged app**: returns `process.execPath` (the Electron binary).
 *   Must be paired with `ELECTRON_RUN_AS_NODE=1` so the binary runs as
 *   plain Node.js with asar support.
 * - **Dev mode**: returns the system `node` from PATH. No asar handling
 *   needed; avoids spawning the Electron binary (which shows a Dock icon
 *   on macOS).
 * - **Non-Electron** (vitest): returns `process.execPath` (already Node).
 */
export function getElectronAsNodePath(): string {
  if (app.isPackaged) return process.execPath
  return resolveNodeExecutableForChildProcess() ?? process.execPath
}

/**
 * Whether the current runtime requires `ELECTRON_RUN_AS_NODE=1` for
 * child processes to have asar support. Only true in packaged Electron apps.
 */
export function needsAsarBridge(): boolean {
  return app.isPackaged
}

/**
 * Build the env overlay for a child process. In packaged builds, merges
 * `ELECTRON_RUN_AS_NODE=1` so the Electron binary runs as Node with asar
 * support. In dev mode the env is returned as-is (system node needs no flag).
 */
export function buildAsarAwareEnv<T extends Record<string, string | undefined>>(baseEnv: T): T & { ELECTRON_RUN_AS_NODE?: '1' } {
  if (!needsAsarBridge()) return baseEnv
  return { ...baseEnv, ELECTRON_RUN_AS_NODE: '1' as const }
}

export interface AsarAwareSpawnOptions {
  /**
   * Callback for stderr output lines from the child process.
   *
   * This MUST be attached here (rather than by the caller after spawn)
   * because the SDK's `spawnClaudeCodeProcess` callback returns a
   * SpawnedProcess — the caller never gets a reference to the child.
   * The SDK only attaches its own stderr listener when `options.stderr`
   * is set, which we intentionally avoid to prevent double-handling.
   */
  onStderr?: (line: string) => void
}

/**
 * Create a spawn function that conforms to the Claude Agent SDK's
 * `spawnClaudeCodeProcess` interface.
 *
 * - **Packaged**: spawns `process.execPath` with `ELECTRON_RUN_AS_NODE=1`
 *   for asar support.
 * - **Dev**: spawns the system `node` binary — no Dock icon, no asar flag.
 */
export function createAsarAwareSpawnFn(
  options: AsarAwareSpawnOptions = {},
): (spawnOpts: SpawnOptions) => SpawnedProcess {
  const command = getElectronAsNodePath()

  return (spawnOpts: SpawnOptions): SpawnedProcess => {
    // Node's ChildProcess is a structural superset of the SDK's SpawnedProcess
    // interface (stdin: Writable, stdout: Readable, killed, exitCode, kill, on).
    // stdio: 'pipe' guarantees stdin/stdout/stderr are non-null Streams.
    const child = spawn(command, spawnOpts.args, {
      cwd: spawnOpts.cwd,
      env: buildAsarAwareEnv(spawnOpts.env),
      signal: spawnOpts.signal,
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
    }) as unknown as SpawnedProcess

    if (options.onStderr) {
      const stderr = (child as unknown as { stderr: NodeJS.ReadableStream }).stderr
      stderr.setEncoding?.('utf-8')
      stderr.on('data', (chunk: string) => {
        for (const line of chunk.split('\n')) {
          const trimmed = line.trimEnd()
          if (trimmed) options.onStderr!(trimmed)
        }
      })
    }

    return child
  }
}
