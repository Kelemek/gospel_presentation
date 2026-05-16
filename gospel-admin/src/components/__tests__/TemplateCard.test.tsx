import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import TemplateCard from '../TemplateCard'

const defaultTemplate = {
  id: 't1',
  slug: 'template-one',
  title: 'Template One',
  description: 'A test template',
  isTemplate: true,
  isPublic: false,
  visitCount: 5,
  siteUrl: 'https://example.com'
}

describe('TemplateCard', () => {
  it('renders template title and description', () => {
    render(
      <TemplateCard
        template={defaultTemplate}
        siteUrl="https://example.com"
        onCopyUrl={jest.fn()}
        onDelete={jest.fn()}
        onDownloadBackup={jest.fn()}
        onRestoreBackup={jest.fn()}
      />
    )
    expect(screen.getByText('Template One')).toBeInTheDocument()
    expect(screen.getByText('A test template')).toBeInTheDocument()
  })

  it('shows checked Public checkbox when template is public', () => {
    render(
      <TemplateCard
        template={{ ...defaultTemplate, isPublic: true }}
        siteUrl="https://example.com"
        onCopyUrl={jest.fn()}
        onDelete={jest.fn()}
        onDownloadBackup={jest.fn()}
        onRestoreBackup={jest.fn()}
        onTogglePublic={jest.fn()}
        userRole="admin"
        isExpanded={true}
        onToggleExpand={jest.fn()}
      />
    )
    expect(screen.getByRole('checkbox', { name: /Public \(show in Resources/i })).toBeChecked()
  })

  it('calls onTogglePublic when Public checkbox is toggled', () => {
    const onTogglePublic = jest.fn()
    render(
      <TemplateCard
        template={defaultTemplate}
        siteUrl="https://example.com"
        onCopyUrl={jest.fn()}
        onDelete={jest.fn()}
        onDownloadBackup={jest.fn()}
        onRestoreBackup={jest.fn()}
        onTogglePublic={onTogglePublic}
        userRole="admin"
        isExpanded={true}
        onToggleExpand={jest.fn()}
      />
    )
    const checkbox = screen.getByRole('checkbox', { name: /Public \(show in Resources/i })
    expect(checkbox).not.toBeChecked()

    fireEvent.click(checkbox)
    expect(onTogglePublic).toHaveBeenCalledWith(defaultTemplate, true)
  })

  it('shows Clone and calls onCloneTemplate when expanded as admin', () => {
    const onCloneTemplate = jest.fn()
    render(
      <TemplateCard
        template={defaultTemplate}
        siteUrl="https://example.com"
        onCopyUrl={jest.fn()}
        onDelete={jest.fn()}
        onDownloadBackup={jest.fn()}
        onRestoreBackup={jest.fn()}
        userRole="admin"
        isExpanded={true}
        onToggleExpand={jest.fn()}
        onCloneTemplate={onCloneTemplate}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: 'Clone' }))
    expect(onCloneTemplate).toHaveBeenCalledWith({ slug: 'template-one', title: 'Template One' })
  })

  it('does not show Clone without onCloneTemplate', () => {
    render(
      <TemplateCard
        template={defaultTemplate}
        siteUrl="https://example.com"
        onCopyUrl={jest.fn()}
        onDelete={jest.fn()}
        onDownloadBackup={jest.fn()}
        onRestoreBackup={jest.fn()}
        userRole="admin"
        isExpanded={true}
        onToggleExpand={jest.fn()}
      />
    )
    expect(screen.queryByRole('button', { name: 'Clone' })).not.toBeInTheDocument()
  })

  it('does not show Public checkbox when userRole is not admin', () => {
    render(
      <TemplateCard
        template={defaultTemplate}
        siteUrl="https://example.com"
        onCopyUrl={jest.fn()}
        onDelete={jest.fn()}
        onDownloadBackup={jest.fn()}
        onRestoreBackup={jest.fn()}
        onTogglePublic={jest.fn()}
        isExpanded={true}
        onToggleExpand={jest.fn()}
      />
    )
    expect(screen.queryByRole('checkbox', { name: /Public/i })).not.toBeInTheDocument()
  })
})
