import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { CreateResourceTemplateModal } from './CreateResourceTemplateModal'

describe('CreateResourceTemplateModal', () => {
  const push = (global as any).__mockNextPush as jest.Mock

  beforeEach(() => {
    push.mockClear()
    ;(global.fetch as jest.Mock).mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : (input as Request).url
      if (url.includes('/api/profiles') && !url.includes('templates') && init?.method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ profile: { slug: 'mytpl', title: 'My Template' } }),
        })
      }
      return Promise.resolve({ ok: true, json: async () => ({}) })
    })
  })

  it('blank mode: submits blankGospelData, then navigates to content editor', async () => {
    const onClose = jest.fn()
    const onCreated = jest.fn()

    render(
      <CreateResourceTemplateModal mode={{ kind: 'blank' }} onClose={onClose} onCreated={onCreated} />
    )

    fireEvent.change(screen.getByPlaceholderText('mytemplate'), {
      target: { value: 'mytpl' },
    })
    fireEvent.change(screen.getByPlaceholderText(/Youth group gospel/i), { target: { value: 'My Template' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create' }))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/profiles',
        expect.objectContaining({
          method: 'POST',
        })
      )
    })

    const postCall = (global.fetch as jest.Mock).mock.calls.find(
      (c) => typeof c[0] === 'string' && c[0] === '/api/profiles' && c[1]?.method === 'POST'
    )
    expect(postCall).toBeTruthy()
    const body = JSON.parse(postCall![1].body as string)
    expect(body).toMatchObject({
      slug: 'mytpl',
      title: 'My Template',
      blankGospelData: true,
      isTemplate: true,
    })
    expect('cloneFromSlug' in body).toBe(false)

    await waitFor(() => {
      expect(onCreated).toHaveBeenCalled()
      expect(onClose).toHaveBeenCalled()
      expect(push).toHaveBeenCalledWith('/admin/profiles/mytpl/content')
    })
  })

  it('clone mode: resets form when source title changes for the same slug', () => {
    const onClose = jest.fn()
    const { rerender } = render(
      <CreateResourceTemplateModal
        mode={{ kind: 'clone', sourceSlug: 'original', sourceTitle: 'Original Title' }}
        onClose={onClose}
      />
    )

    expect(screen.getByDisplayValue('Copy of Original Title')).toBeInTheDocument()

    rerender(
      <CreateResourceTemplateModal
        mode={{ kind: 'clone', sourceSlug: 'original', sourceTitle: 'Renamed Title' }}
        onClose={onClose}
      />
    )

    expect(screen.getByDisplayValue('Copy of Renamed Title')).toBeInTheDocument()
  })

  it('clone mode: prefills Copy of title and sends cloneFromSlug', async () => {
    const onClose = jest.fn()
    render(
      <CreateResourceTemplateModal
        mode={{ kind: 'clone', sourceSlug: 'original', sourceTitle: 'Original Title' }}
        onClose={onClose}
      />
    )

    expect(screen.getByRole('heading', { name: 'Clone resource template' })).toBeInTheDocument()
    expect(screen.getByDisplayValue('Copy of Original Title')).toBeInTheDocument()

    fireEvent.change(screen.getByPlaceholderText('mytemplate'), {
      target: { value: 'newcopy' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Create' }))

    await waitFor(() => {
      const postCall = (global.fetch as jest.Mock).mock.calls.find(
        (c) => typeof c[0] === 'string' && c[0] === '/api/profiles' && c[1]?.method === 'POST'
      )
      expect(postCall).toBeTruthy()
      const body = JSON.parse(postCall![1].body as string)
      expect(body).toMatchObject({
        slug: 'newcopy',
        title: 'Copy of Original Title',
        cloneFromSlug: 'original',
        isTemplate: true,
      })
      expect('blankGospelData' in body).toBe(false)
    })
  })

  it('shows friendly message when slug is duplicate (app-level)', async () => {
    ;(global.fetch as jest.Mock).mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : (input as Request).url
      if (url.includes('/api/profiles') && !url.includes('templates') && init?.method === 'POST') {
        return Promise.resolve({
          ok: false,
          status: 400,
          json: async () => ({ error: "Profile with slug 'dup' already exists" }),
        })
      }
      return Promise.resolve({ ok: true, json: async () => ({}) })
    })

    render(<CreateResourceTemplateModal mode={{ kind: 'blank' }} onClose={jest.fn()} />)

    fireEvent.change(screen.getByPlaceholderText('mytemplate'), { target: { value: 'dup' } })
    fireEvent.change(screen.getByPlaceholderText(/Youth group gospel/i), { target: { value: 'My Title' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create' }))

    await waitFor(() => {
      expect(screen.getByText('That URL is already in use. Choose a different slug.')).toBeInTheDocument()
    })
  })

  it('renders nothing when mode is null', () => {
    const { container } = render(<CreateResourceTemplateModal mode={null} onClose={jest.fn()} />)
    expect(container.firstChild).toBeNull()
  })
})
