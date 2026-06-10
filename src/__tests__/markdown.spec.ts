import { describe, it, expect, beforeEach } from 'vitest'
import { marked } from 'marked'

describe('Markdown Rendering', () => {
  beforeEach(() => {
    marked.setOptions({
      breaks: true,
      gfm: true,
    })
  })

  it('should render plain text', () => {
    const input = '这是一段普通文本'
    const output = marked.parse(input) as string
    expect(output).toContain('这是一段普通文本')
  })

  it('should render bold text', () => {
    const input = '**粗体文本**'
    const output = marked.parse(input) as string
    expect(output).toContain('<strong>')
    expect(output).toContain('粗体文本')
  })

  it('should render italic text', () => {
    const input = '*斜体文本*'
    const output = marked.parse(input) as string
    expect(output).toContain('<em>')
    expect(output).toContain('斜体文本')
  })

  it('should render inline code', () => {
    const input = '`code`'
    const output = marked.parse(input) as string
    expect(output).toContain('<code>')
    expect(output).toContain('code')
  })

  it('should render code block', () => {
    const input = '```javascript\nconst x = 1\n```'
    const output = marked.parse(input) as string
    expect(output).toContain('<pre>')
    expect(output).toContain('<code')
    expect(output).toContain('const x = 1')
  })

  it('should render unordered list', () => {
    const input = '- 项目1\n- 项目2\n- 项目3'
    const output = marked.parse(input) as string
    expect(output).toContain('<ul>')
    expect(output).toContain('<li>')
    expect(output).toContain('项目1')
    expect(output).toContain('项目2')
  })

  it('should render ordered list', () => {
    const input = '1. 项目1\n2. 项目2'
    const output = marked.parse(input) as string
    expect(output).toContain('<ol>')
    expect(output).toContain('<li>')
  })

  it('should render headings', () => {
    const h1 = marked.parse('# 标题1') as string
    expect(h1).toContain('<h1')
    expect(h1).toContain('标题1')

    const h2 = marked.parse('## 标题2') as string
    expect(h2).toContain('<h2')

    const h3 = marked.parse('### 标题3') as string
    expect(h3).toContain('<h3')
  })

  it('should render blockquote', () => {
    const input = '> 引用内容'
    const output = marked.parse(input) as string
    expect(output).toContain('<blockquote')
    expect(output).toContain('引用内容')
  })

  it('should render links', () => {
    const input = '[链接](https://example.com)'
    const output = marked.parse(input) as string
    expect(output).toContain('<a')
    expect(output).toContain('href="https://example.com"')
    expect(output).toContain('链接')
  })

  it('should handle empty input', () => {
    const output = marked.parse('') as string
    expect(output).toBe('')
  })

  it('should handle line breaks', () => {
    const input = '第一行\n第二行'
    const output = marked.parse(input) as string
    expect(output).toContain('第一行')
    expect(output).toContain('第二行')
  })
})