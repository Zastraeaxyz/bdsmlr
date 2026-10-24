import { afterEach, describe, expect, it } from 'vitest'
import { AGE_GATE_STORAGE_KEY, confirmAge, hasConfirmedAge } from '~/lib/ageGate'

function useLocalStorage(initial: Record<string, string> = {}) {
  const store = new Map(Object.entries(initial))
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
    },
  })
  return store
}

afterEach(() => {
  Reflect.deleteProperty(globalThis, 'localStorage')
})

describe('age gate storage', () => {
  it('treats a missing value as unconfirmed', () => {
    useLocalStorage()
    expect(hasConfirmedAge()).toBe(false)
  })

  it('stores confirmation locally', () => {
    const store = useLocalStorage()
    confirmAge()
    expect(store.get(AGE_GATE_STORAGE_KEY)).toBe('true')
    expect(hasConfirmedAge()).toBe(true)
  })

  it('does not confirm when storage is unavailable', () => {
    expect(hasConfirmedAge()).toBe(false)
    expect(() => confirmAge()).not.toThrow()
  })
})
