import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useAppStore } from '../appStore'

describe('appStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('should have initial state', () => {
    const store = useAppStore()
    expect(store.capturedText).toBe('')
    expect(store.questionTags).toEqual([])
    expect(store.selectedQuestion).toBe('')
    expect(store.answer).toBe('')
    expect(store.isLoading).toBe(false)
  })

  it('should set captured text', () => {
    const store = useAppStore()
    const testText = 'Hello World'
    
    store.setCapturedText(testText)
    expect(store.capturedText).toBe(testText)
  })

  it('should set question tags', () => {
    const store = useAppStore()
    const tags = ['What is this?', 'How to use?']
    
    store.setQuestionTags(tags)
    expect(store.questionTags).toEqual(tags)
  })

  it('should set selected question', () => {
    const store = useAppStore()
    const question = 'What is this?'
    
    store.setSelectedQuestion(question)
    expect(store.selectedQuestion).toBe(question)
  })

  it('should set answer', () => {
    const store = useAppStore()
    const answer = 'This is a test answer'
    
    store.setAnswer(answer)
    expect(store.answer).toBe(answer)
  })

  it('should set loading state', () => {
    const store = useAppStore()
    
    store.setIsLoading(true)
    expect(store.isLoading).toBe(true)
    
    store.setIsLoading(false)
    expect(store.isLoading).toBe(false)
  })

  it('should clear answer', () => {
    const store = useAppStore()
    store.setAnswer('Test answer')
    
    store.clearAnswer()
    expect(store.answer).toBe('')
  })
})
