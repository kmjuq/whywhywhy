import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Tauri window API
const mockSetSize = vi.fn()
const mockShow = vi.fn()
const mockHide = vi.fn()
const mockSetFocus = vi.fn()
const mockIsFocused = vi.fn().mockResolvedValue(true)
const mockSetPosition = vi.fn()

vi.mock('@tauri-apps/api/window', () => ({
  getCurrentWindow: () => ({
    show: mockShow,
    hide: mockHide,
    setFocus: mockSetFocus,
    isFocused: mockIsFocused,
    setSize: mockSetSize,
    setPosition: mockSetPosition,
  }),
}))

vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn().mockResolvedValue(() => {}),
}))

describe('useWindow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should resize window to minimum height when content is small', async () => {
    const { useWindow } = await import('../../composables/useWindow')
    const { resizeToContent } = useWindow()
    
    await resizeToContent(100)
    
    expect(mockSetSize).toHaveBeenCalledWith({
      type: 'Physical',
      width: 420,
      height: 300,
    })
  })

  it('should resize window to maximum height when content is large', async () => {
    const { useWindow } = await import('../../composables/useWindow')
    const { resizeToContent } = useWindow()
    
    await resizeToContent(1000)
    
    expect(mockSetSize).toHaveBeenCalledWith({
      type: 'Physical',
      width: 420,
      height: 700,
    })
  })

  it('should resize window to calculated height for medium content', async () => {
    const { useWindow } = await import('../../composables/useWindow')
    const { resizeToContent } = useWindow()
    
    // headerHeight = 48, padding = 24
    // calculatedHeight = 400 + 48 + 24 = 472
    await resizeToContent(400)
    
    expect(mockSetSize).toHaveBeenCalledWith({
      type: 'Physical',
      width: 420,
      height: 472,
    })
  })

  it('should show window', async () => {
    const { useWindow } = await import('../../composables/useWindow')
    const { showWindow, isVisible } = useWindow()
    
    await showWindow()
    
    expect(mockShow).toHaveBeenCalled()
    expect(mockSetFocus).toHaveBeenCalled()
    expect(isVisible.value).toBe(true)
  })

  it('should hide window', async () => {
    const { useWindow } = await import('../../composables/useWindow')
    const { hideWindow, isVisible } = useWindow()
    
    await hideWindow()
    
    expect(mockHide).toHaveBeenCalled()
    expect(isVisible.value).toBe(false)
  })

  it('should set window position', async () => {
    const { useWindow } = await import('../../composables/useWindow')
    const { setPosition } = useWindow()
    
    await setPosition(100, 200)
    
    expect(mockSetPosition).toHaveBeenCalledWith({
      type: 'Physical',
      x: 100,
      y: 200,
    })
  })
})