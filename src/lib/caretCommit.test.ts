import { describe, expect, it } from 'vitest'
import { commitAt, insertAt, pendingAt } from './caretCommit'
import { convert } from './engine'

describe('pendingAt', () => {
  it('finds the run ending at the caret, not at the end of the text', () => {
    const text = 'मेरो naam छ'
    // caret right after "naam"
    expect(pendingAt(text, 'मेरो naam'.length)).toBe('naam')
  })

  it('is empty when the caret follows Devanagari or a space', () => {
    expect(pendingAt('मेरो naam', 'मेरो'.length)).toBe('')
    expect(pendingAt('मेरो naam', 'मेरो '.length)).toBe('')
  })

  it('matches the end-of-text behaviour when the caret is at the end', () => {
    expect(pendingAt('mero naam', 9)).toBe('naam')
  })
})

describe('commitAt', () => {
  it('converts a word in the middle and leaves what follows untouched', () => {
    const text = 'मेरो naam छ'
    const caret = 'मेरो naam'.length
    const out = commitAt(text, caret, ' ')
    expect(out.text).toBe(`मेरो ${convert('naam')}  छ`)
    // caret sits right after the inserted space, before the old " छ"
    expect(out.text.slice(0, out.caret)).toBe(`मेरो ${convert('naam')} `)
  })

  it('puts the caret after the suffix even though the word changed length', () => {
    const out = commitAt('ab namaste cd', 'ab namaste'.length, '।')
    expect(out.text.slice(out.caret)).toBe(' cd')
    expect(out.text.slice(0, out.caret).endsWith('।')).toBe(true)
  })

  it('uses a chosen suggestion instead of the default conversion', () => {
    const out = commitAt('x nep y', 'x nep'.length, ' ', 'नेपाल')
    expect(out.text).toBe('x नेपाल  y')
  })

  it('only inserts the suffix when there is nothing to convert', () => {
    const out = commitAt('मेरो छ', 'मेरो'.length, ',')
    expect(out).toEqual({ text: 'मेरो, छ', caret: 'मेरो,'.length })
  })

  it('still works at the end of the text', () => {
    const out = commitAt('mero naam', 9, ' ')
    expect(out.text).toBe(`mero ${convert('naam')} `)
    expect(out.caret).toBe(out.text.length)
  })
})

describe('insertAt', () => {
  it('inserts at the caret and advances it', () => {
    expect(insertAt('abcd', 2, ' ')).toEqual({ text: 'ab cd', caret: 3 })
  })
})
