// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, vi } from 'vitest'

vi.mock('electron', () => ({
  app: {
    isPackaged: false,
  },
}))

import { resolveBridgeDepsBundle } from '../../../electron/command/codexNativeBridgeManager'

describe('resolveBridgeDepsBundle', () => {
  it('returns dev path when file exists in resources directory', () => {
    const result = resolveBridgeDepsBundle(() => true)
    expect(result).toMatch(/resources\/codex-bridge-deps\.cjs$/)
  })

  it('throws when bundle file is not found', () => {
    expect(() => resolveBridgeDepsBundle(() => false)).toThrow(
      /Bridge dependency bundle not found/,
    )
    expect(() => resolveBridgeDepsBundle(() => false)).toThrow(
      /Run "pnpm run bundle:bridge"/,
    )
  })
})
