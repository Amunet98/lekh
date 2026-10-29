import { describe, expect, it } from 'vitest'
import { commitAt, insertAt, pendingAt, revertAt } from './caretCommit'
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
    expect(out).toEqual({ text: 'मेरो, छ', caret: 'मेरो,'.length, converted: null })
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

describe('revertAt', () => {
  const nam = convert('namaste')

  it('gives the letters back for a backspace right after the converted word', () => {
    const typed = commitAt('namaste', 7, ' ')
    // the first backspace takes the space the ordinary way
    const afterSpace = typed.text.slice(0, -1)
    const out = revertAt(afterSpace, afterSpace.length, typed.converted)
    expect(out).toEqual({ text: 'namaste', caret: 7 })
  })

  it('lets a vowel retype join the word instead of standing alone', () => {
    const typed = commitAt('namaste', 7, ' ')
    const back = revertAt(nam, nam.length, typed.converted)!
    // two backspaces of Latin, then the retype
    const retyped = back.text.slice(0, -1) + 'e'
    expect(commitAt(retyped, retyped.length, ' ').text).toBe(`${nam} `)
  })

  it('works for a word in the middle and keeps what follows', () => {
    const typed = commitAt('ab namaste cd', 'ab namaste'.length, ' ')
    const text = typed.text.slice(0, typed.caret - 1) + typed.text.slice(typed.caret)
    const out = revertAt(text, typed.converted!.end, typed.converted)
    expect(out).toEqual({ text: 'ab namaste cd', caret: 'ab namaste'.length })
  })

  it('returns a chosen suggestion to what was typed for it', () => {
    const typed = commitAt('nep', 3, ' ', 'नेपाल')
    expect(revertAt('नेपाल', 5, typed.converted)).toEqual({ text: 'nep', caret: 3 })
  })

  it('does nothing anywhere but the end of that word', () => {
    const typed = commitAt('namaste', 7, ' ')
    expect(revertAt(typed.text, typed.text.length, typed.converted)).toBeNull()
    expect(revertAt(nam, nam.length - 1, typed.converted)).toBeNull()
  })

  it('does nothing once the word has been edited', () => {
    const typed = commitAt('namaste', 7, ' ')
    const edited = 'क' + nam.slice(1)
    expect(revertAt(edited, edited.length, typed.converted)).toBeNull()
  })

  it('does nothing when the commit converted nothing', () => {
    const typed = commitAt('नमस्ते', 6, ' ')
    expect(typed.converted).toBeNull()
    expect(revertAt('नमस्ते', 6, typed.converted)).toBeNull()
  })
})
