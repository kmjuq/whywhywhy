import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useLLM } from '../useLLM'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value }),
    removeItem: vi.fn((key: string) => { delete store[key] }),
    clear: vi.fn(() => { store = {} })
  }
})()
Object.defineProperty(window, 'localStorage', { value: localStorageMock })

// Mock fetch
const mockFetch = vi.fn()
;(window as any).fetch = mockFetch

describe('useLLM', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should export all required functions', () => {
    const llm = useLLM()
    expect(typeof llm.generateQuestionTags).toBe('function')
    expect(typeof llm.queryAnswer).toBe('function')
    expect(typeof llm.getStoredApiKey).toBe('function')
    expect(typeof llm.setStoredApiKey).toBe('function')
    expect(typeof llm.getStoredModel).toBe('function')
    expect(typeof llm.setStoredModel).toBe('function')
    expect(typeof llm.getStoredProvider).toBe('function')
    expect(typeof llm.setStoredProvider).toBe('function')
    expect(typeof llm.getAvailableProviders).toBe('function')
    expect(typeof llm.getModelsForProvider).toBe('function')
  })

  it('should store and retrieve API key', () => {
    const llm = useLLM()
    llm.setStoredApiKey('test-api-key')
    expect(llm.getStoredApiKey()).toBe('test-api-key')
  })

  it('should store and retrieve model', () => {
    const llm = useLLM()
    llm.setStoredModel('deepseek-chat')
    expect(llm.getStoredModel()).toBe('deepseek-chat')
  })

  it('should store and retrieve provider', () => {
    const llm = useLLM()
    llm.setStoredProvider('deepseek')
    expect(llm.getStoredProvider()).toBe('deepseek')
  })

  it('should return available providers', () => {
    const llm = useLLM()
    const providers = llm.getAvailableProviders()
    expect(providers).toHaveLength(2)
    expect(providers[0].id).toBe('openai')
    expect(providers[1].id).toBe('deepseek')
  })

  it('should return models for provider', () => {
    const llm = useLLM()
    const deepseekModels = llm.getModelsForProvider('deepseek')
    expect(deepseekModels).toContain('deepseek-chat')
    
    const openaiModels = llm.getModelsForProvider('openai')
    expect(openaiModels).toContain('gpt-4o-mini')
  })

  it('should return empty array when API key is not set', async () => {
    const llm = useLLM()
    const result = await llm.generateQuestionTags('test text')
    expect(result).toEqual([])
    expect(llm.error.value).toBe('请先在设置中配置 API Key')
  })

  it('should return empty array when text is empty', async () => {
    const llm = useLLM()
    llm.setStoredApiKey('test-api-key')
    const result = await llm.generateQuestionTags('')
    expect(result).toEqual([])
    expect(llm.error.value).toBe('文本内容不能为空')
  })

  it('should generate question tags successfully', async () => {
    const mockResponse = {
      choices: [
        {
          message: {
            content: JSON.stringify(['这是什么？', '怎么用？', '有什么特点？'])
          }
        }
      ]
    }
    
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    })

    const llm = useLLM()
    llm.setStoredApiKey('test-api-key')
    
    const result = await llm.generateQuestionTags('test content')
    
    expect(result).toEqual(['这是什么？', '怎么用？', '有什么特点？'])
    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.deepseek.com/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-api-key'
        })
      })
    )
  })

  it('should handle API error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ error: { message: 'Invalid API key' } })
    })

    const llm = useLLM()
    llm.setStoredApiKey('invalid-key')
    
    const result = await llm.generateQuestionTags('test content')
    
    expect(result).toEqual([])
    expect(llm.error.value).toContain('Invalid API key')
  })

  it('should return empty answer when API key is not set', async () => {
    const llm = useLLM()
    const result = await llm.queryAnswer('test text', 'test question')
    expect(result).toBe('')
    expect(llm.error.value).toBe('请先在设置中配置 API Key')
  })

  it('should query answer successfully', async () => {
    const mockResponse = {
      choices: [
        {
          message: {
            content: '这是一个测试答案。'
          }
        }
      ]
    }
    
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    })

    const llm = useLLM()
    llm.setStoredApiKey('test-api-key')
    
    const result = await llm.queryAnswer('test content', 'test question')
    
    expect(result).toBe('这是一个测试答案。')
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })
})
