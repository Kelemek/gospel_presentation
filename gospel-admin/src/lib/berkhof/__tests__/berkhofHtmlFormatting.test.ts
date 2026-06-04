import { boldBerkhofOutlineMarkers } from '@/lib/berkhof/berkhofHtmlFormatting'

describe('boldBerkhofOutlineMarkers', () => {
  it('bolds leading numbered outline with optional indent', () => {
    expect(boldBerkhofOutlineMarkers(' 1. ABSOLUTE DENIAL')).toBe(
      ' <strong>1.</strong> ABSOLUTE DENIAL'
    )
    expect(boldBerkhofOutlineMarkers('1. THE ONTOLOGICAL ARGUMENT.')).toBe(
      '<strong>1.</strong> THE ONTOLOGICAL ARGUMENT.'
    )
  })

  it('bolds lowercase letter outlines before text or tags', () => {
    expect(boldBerkhofOutlineMarkers('a.<span class="ital">An immanent God.</span>')).toBe(
      '<strong>a.</strong><span class="ital">An immanent God.</span>'
    )
    expect(boldBerkhofOutlineMarkers(' b. A finite God.')).toBe(
      ' <strong>b.</strong> A finite God.'
    )
  })

  it('does not double-wrap or bold non-outline prefixes', () => {
    expect(boldBerkhofOutlineMarkers('<strong>1.</strong> Already bold')).toBe(
      '<strong>1.</strong> Already bold'
    )
    expect(boldBerkhofOutlineMarkers('L. Berkhof')).toBe('L. Berkhof')
    expect(boldBerkhofOutlineMarkers('For us the existence of God')).toBe(
      'For us the existence of God'
    )
  })
})
