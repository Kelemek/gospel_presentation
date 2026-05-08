import { plainTextForProfileResourceListen } from '@/lib/profileResourceListenText'

describe('plainTextForProfileResourceListen', () => {
  it('strips data-gospel-mount subtrees', () => {
    document.body.innerHTML = `
      <div id="root">
        <p>Hello <span data-gospel-mount="1"><button>John 3:16</button></span> world.</p>
      </div>
    `
    const el = document.getElementById('root')!
    expect(plainTextForProfileResourceListen(el)).toBe('Hello world.')
  })

  it('removes buttons', () => {
    document.body.innerHTML = `
      <div id="root">
        <p>Line one <button type="button" aria-label="Remove">×</button> line two.</p>
      </div>
    `
    const el = document.getElementById('root')!
    expect(plainTextForProfileResourceListen(el)).toBe('Line one line two.')
  })

  it('normalizes whitespace', () => {
    document.body.innerHTML = `<div id="root"><p>  A   B  </p></div>`
    const el = document.getElementById('root')!
    expect(plainTextForProfileResourceListen(el)).toBe('A B')
  })
})
