import {
  isCcelCorpusProfileSlug,
  isResourcesMenuPickableTemplateSlug,
  resourcesMenuTemplatePickerLabel,
} from '@/lib/resourcesMenuPickableTemplates'

describe('resourcesMenuPickableTemplates', () => {
  it('treats sermon, morneve, calvin, and edwards slugs as corpus', () => {
    expect(isCcelCorpusProfileSlug('sg00042')).toBe(true)
    expect(isCcelCorpusProfileSlug('me0315')).toBe(true)
    expect(isCcelCorpusProfileSlug('cvrom')).toBe(true)
    expect(isCcelCorpusProfileSlug('je01')).toBe(true)
  })

  it('allows lgal and ordinary templates in the picker', () => {
    expect(isResourcesMenuPickableTemplateSlug('lgal')).toBe(true)
    expect(isResourcesMenuPickableTemplateSlug('default')).toBe(true)
    expect(isResourcesMenuPickableTemplateSlug('sg00001')).toBe(false)
  })

  it('hides deprecated duplicate Luther slug', () => {
    expect(isResourcesMenuPickableTemplateSlug('luthergal')).toBe(false)
  })

  it('disambiguates duplicate titles in picker labels', () => {
    const templates = [
      { slug: 'lgal', title: 'Commentary on Galatians (Martin Luther)' },
      { slug: 'other', title: 'Commentary on Galatians (Martin Luther)' },
    ]
    expect(resourcesMenuTemplatePickerLabel(templates, templates[0])).toContain('(lgal)')
    expect(resourcesMenuTemplatePickerLabel(templates, { slug: 'solo', title: 'Solo' })).toBe('Solo')
  })
})
