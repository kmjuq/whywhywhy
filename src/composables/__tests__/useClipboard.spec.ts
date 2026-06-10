import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useClipboard } from '../useClipboard'
import { readText } from '@tauri-apps/plugin-clipboard-manager'

vi.mock('@tauri-apps/plugin-clipboard-manager', () => ({
  readText: vi.fn()
}))

describe('useClipboard', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('should export startListening, stopListening and getCurrentText', () => {
    const clipboard = useClipboard()
    expect(typeof clipboard.startListening).toBe('function')
    expect(typeof clipboard.stopListening).toBe('function')
    expect(typeof clipboard.getCurrentText).toBe('function')
  })

  it('should call readText when getCurrentText is called', async () => {
    const clipboard = useClipboard()
    await clipboard.getCurrentText()
    
    expect(readText).toHaveBeenCalledTimes(1)
  })

  it('should start polling when startListening is called', async () => {
    const clipboard = useClipboard()
    const callback = vi.fn()
    
    await clipboard.startListening(callback)
    
    expect(readText).toHaveBeenCalledTimes(1)
    
    vi.advanceTimersByTime(500)
    expect(readText).toHaveBeenCalledTimes(2)
    
    vi.advanceTimersByTime(500)
    expect(readText).toHaveBeenCalledTimes(3)
  })

  it('should capture text when it changes', async () => {
    const clipboard = useClipboard()
    const callback = vi.fn()
    
    ;(readText as any)
      .mockResolvedValueOnce('First text')
      .mockResolvedValueOnce('Second text')
    
    await clipboard.startListening(callback)
    vi.advanceTimersByTime(500)
    
    expect(callback).toHaveBeenCalledTimes(1)
    expect(callback).toHaveBeenLastCalledWith('First text')
  })

  it('should not capture empty text', async () => {
    const clipboard = useClipboard()
    const callback = vi.fn()
    
    ;(readText as any).mockResolvedValue('')
    
    await clipboard.startListening(callback)
    expect(callback).not.toHaveBeenCalled()
  })

  it('should not capture duplicate text', async () => {
    ;(readText as any)
      .mockResolvedValueOnce('Same text')
      .mockResolvedValueOnce('Same text')
      .mockResolvedValueOnce('Same text')
    
    const clipboard = useClipboard()
    const callback = vi.fn()
    
    await clipboard.startListening(callback)
    expect(callback).toHaveBeenCalledTimes(1)
    
    vi.advanceTimersByTime(500)
    vi.advanceTimersByTime(500)
    expect(callback).toHaveBeenCalledTimes(1)
  })

  it('should stop polling when stopListening is called', async () => {
    const clipboard = useClipboard()
    const callback = vi.fn()
    
    await clipboard.startListening(callback)
    expect(readText).toHaveBeenCalledTimes(1)
    
    clipboard.stopListening()
    
    vi.advanceTimersByTime(500)
    vi.advanceTimersByTime(500)
    expect(readText).toHaveBeenCalledTimes(1)
  })
})
