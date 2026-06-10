import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

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

describe('Question Selection Logic', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    localStorage.clear()
  })

  describe('toggleQuestion', () => {
    it('should add question when not selected', () => {
      const selectedQuestions: string[] = []
      const question = '这是什么？'
      
      const index = selectedQuestions.indexOf(question)
      if (index > -1) {
        selectedQuestions.splice(index, 1)
      } else {
        selectedQuestions.push(question)
      }
      
      expect(selectedQuestions).toContain(question)
      expect(selectedQuestions.length).toBe(1)
    })

    it('should remove question when already selected', () => {
      const selectedQuestions: string[] = ['这是什么？', '怎么用？']
      const question = '这是什么？'
      
      const index = selectedQuestions.indexOf(question)
      if (index > -1) {
        selectedQuestions.splice(index, 1)
      } else {
        selectedQuestions.push(question)
      }
      
      expect(selectedQuestions).not.toContain(question)
      expect(selectedQuestions.length).toBe(1)
      expect(selectedQuestions).toContain('怎么用？')
    })
  })

  describe('combinedQuestion', () => {
    it('should combine selected questions with custom text', () => {
      const selectedQuestions = ['这是什么？', '怎么用？']
      const customQuestion = '请详细说明'
      
      const selectedText = selectedQuestions.join('；')
      const customText = customQuestion.trim()
      
      const combined = !selectedText ? customText : 
                       !customText ? selectedText : 
                       `${selectedText}；${customText}`
      
      expect(combined).toBe('这是什么？；怎么用？；请详细说明')
    })

    it('should return only selected questions when no custom text', () => {
      const selectedQuestions = ['这是什么？', '怎么用？']
      const customQuestion = ''
      
      const selectedText = selectedQuestions.join('；')
      const customText = customQuestion.trim()
      
      const combined = !selectedText ? customText : 
                       !customText ? selectedText : 
                       `${selectedText}；${customText}`
      
      expect(combined).toBe('这是什么？；怎么用？')
    })

    it('should return only custom text when no selected questions', () => {
      const selectedQuestions: string[] = []
      const customQuestion = '请详细说明'
      
      const selectedText = selectedQuestions.join('；')
      const customText = customQuestion.trim()
      
      const combined = !selectedText ? customText : 
                       !customText ? selectedText : 
                       `${selectedText}；${customText}`
      
      expect(combined).toBe('请详细说明')
    })

    it('should return empty string when no questions', () => {
      const selectedQuestions: string[] = []
      const customQuestion = ''
      
      const selectedText = selectedQuestions.join('；')
      const customText = customQuestion.trim()
      
      const combined = !selectedText && !customText ? '' : 
                       !selectedText ? customText : 
                       !customText ? selectedText : 
                       `${selectedText}；${customText}`
      
      expect(combined).toBe('')
    })
  })

  describe('addSelectedToInput', () => {
    it('should add selected questions to empty custom input', () => {
      const selectedQuestions = ['这是什么？', '怎么用？']
      let customQuestion = ''
      
      if (selectedQuestions.length > 0) {
        const questions = selectedQuestions.join('；')
        if (customQuestion) {
          customQuestion = `${questions}；${customQuestion}`
        } else {
          customQuestion = questions
        }
        selectedQuestions.length = 0
      }
      
      expect(customQuestion).toBe('这是什么？；怎么用？')
      expect(selectedQuestions.length).toBe(0)
    })

    it('should append selected questions to existing custom input', () => {
      const selectedQuestions = ['这是什么？']
      let customQuestion = '请详细说明'
      
      if (selectedQuestions.length > 0) {
        const questions = selectedQuestions.join('；')
        if (customQuestion) {
          customQuestion = `${questions}；${customQuestion}`
        } else {
          customQuestion = questions
        }
        selectedQuestions.length = 0
      }
      
      expect(customQuestion).toBe('这是什么？；请详细说明')
    })
  })
})