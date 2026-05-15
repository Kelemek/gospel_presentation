import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import InlineRichTextEditor, { htmlToPlainText } from '@/components/InlineRichTextEditor'

describe('InlineRichTextEditor', () => {
  it('htmlToPlainText strips tags', () => {
    expect(htmlToPlainText('<p>Hi <strong>there</strong></p>')).toBe('Hi there')
  })

  it('renders a text input with plain value from HTML', () => {
    const onChange = jest.fn()
    render(
      <InlineRichTextEditor value="<h3>Title <em>x</em></h3>" onChange={onChange} placeholder="Title here" />
    )
    const input = screen.getByRole('textbox', { name: /Title here/i })
    expect(input).toHaveValue('Title x')
  })

  it('commits on blur when value changed', async () => {
    const user = userEvent.setup()
    const onChange = jest.fn()
    render(<InlineRichTextEditor value="Old" onChange={onChange} />)
    const input = screen.getByRole('textbox')
    await user.clear(input)
    await user.type(input, 'New title')
    await user.tab()
    expect(onChange).toHaveBeenCalledWith('New title')
  })

  it('field variant wraps input in RichTextEditor-style chrome', () => {
    render(
      <InlineRichTextEditor value="T" onChange={jest.fn()} variant="field" placeholder="Title here" />
    )
    const input = screen.getByRole('textbox', { name: /Title here/i })
    expect(input.parentElement).toHaveClass(
      'border',
      'border-slate-200',
      'rounded-lg',
      'p-3',
      'bg-white',
      'focus-within:ring-2',
      'focus-within:ring-blue-400'
    )
  })
})