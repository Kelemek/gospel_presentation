import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ScriptureWordStudyPanel from '@/components/ScriptureWordStudyPanel'

describe('ScriptureWordStudyPanel', () => {
  beforeEach(() => {
    global.fetch = jest.fn(async (url: string | URL) => {
      const u = String(url)
      if (u.includes('/api/scripture/word-study')) {
        return {
          ok: true,
          json: async () => ({
            reference: 'Romans 12:2',
            passageKey: 'ROM.12.2',
            stepRef: 'Rom.12.2',
            language: 'grc',
            words: [
              {
                position: 8,
                text: 'μεταμορφοῦσθε',
                transliteration: 'metamorphousthe',
                strongs: 'G3339',
                gloss: 'do be transformed',
              },
            ],
            verses: [
              {
                verse: 2,
                passageKey: 'ROM.12.2',
                stepRef: 'Rom.12.2',
                words: [
                  {
                    position: 8,
                    text: 'μεταμορφοῦσθε',
                    transliteration: 'metamorphousthe',
                    strongs: 'G3339',
                    gloss: 'do be transformed',
                  },
                ],
              },
            ],
          }),
        } as Response
      }
      if (u.includes('/api/scripture/lexicon')) {
        return {
          ok: true,
          json: async () => ({
            strongs: 'G3339',
            language: 'grc',
            gloss: 'to transform',
            definition: 'to transform',
            source: 'TBESG',
            detail: 'brief',
          }),
        } as Response
      }
      return { ok: false, json: async () => ({}) } as Response
    }) as typeof fetch
  })

  it('renders nothing when disabled', () => {
    const { container } = render(
      <ScriptureWordStudyPanel reference="Romans 12:2" enabled={false} />
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('loads and shows words when enabled', async () => {
    render(<ScriptureWordStudyPanel reference="Romans 12:2" enabled />)
    await waitFor(() => {
      expect(screen.getByText('μεταμορφοῦσθε')).toBeInTheDocument()
    })
    expect(screen.getByText('G3339')).toBeInTheDocument()
  })

  it('shows verse labels when multiple verses are returned', async () => {
    ;(global.fetch as jest.Mock).mockImplementation(async (url: string | URL) => {
      if (String(url).includes('/api/scripture/word-study')) {
        return {
          ok: true,
          json: async () => ({
            reference: 'Romans 12:2-3',
            passageKey: 'ROM.12.2',
            stepRef: 'Rom.12.2-3',
            language: 'grc',
            words: [],
            verses: [
              {
                verse: 2,
                passageKey: 'ROM.12.2',
                stepRef: 'Rom.12.2',
                words: [{ position: 1, text: 'καὶ', strongs: 'G2532', gloss: 'and' }],
              },
              {
                verse: 3,
                passageKey: 'ROM.12.3',
                stepRef: 'Rom.12.3',
                words: [{ position: 1, text: 'λέγω', strongs: 'G3004', gloss: 'to speak' }],
              },
            ],
          }),
        } as Response
      }
      return { ok: false, json: async () => ({}) } as Response
    })
    render(<ScriptureWordStudyPanel reference="Romans 12:2-3" enabled />)
    await waitFor(() => {
      expect(screen.getByText('Verse 2')).toBeInTheDocument()
      expect(screen.getByText('Verse 3')).toBeInTheDocument()
    })
  })

  it('expands lexicon on word click', async () => {
    const user = userEvent.setup()
    render(<ScriptureWordStudyPanel reference="Romans 12:2" enabled />)
    await waitFor(() => expect(screen.getByText('G3339')).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: /G3339/i }))
    await waitFor(() => {
      expect(screen.getByText('Source: TBESG (brief)')).toBeInTheDocument()
    })
  })

  it('opens lexicon for Hebrew words when strongs/gloss were swapped in import', async () => {
    const swappedImportWord = {
      position: 1,
      text: 'אַתָּה',
      transliteration: 'a.Tah',
      strongs: 'you',
      gloss: '{H0859A}',
    }
    const wordStudyPayload = {
      reference: 'Deuteronomy 4:35',
      passageKey: 'DEU.4.35',
      stepRef: 'Deu.4.35',
      language: 'heb' as const,
      words: [swappedImportWord],
      verses: [
        {
          verse: 35,
          passageKey: 'DEU.4.35',
          stepRef: 'Deu.4.35',
          words: [swappedImportWord],
        },
      ],
    }

    ;(global.fetch as jest.Mock).mockImplementation(async (url: string | URL) => {
      const u = String(url)
      if (u.includes('/api/scripture/word-study')) {
        return {
          ok: true,
          json: async () => wordStudyPayload,
        } as Response
      }
      if (u.includes('/api/scripture/lexicon')) {
        return {
          ok: true,
          json: async () => ({
            strongs: 'H859',
            language: 'heb',
            lemma: 'אַ֫יִן',
            transliteration: 'a.yin',
            gloss: 'nothing',
            definition: 'nothingness; non-existence',
            source: 'TBESH',
            detail: 'brief',
          }),
        } as Response
      }
      return { ok: false, json: async () => ({}) } as Response
    })
    const user = userEvent.setup()
    render(<ScriptureWordStudyPanel reference="Deuteronomy 4:35" enabled embedded />)
    await waitFor(() => {
      expect(screen.getByText('a.Tah')).toBeInTheDocument()
      expect(screen.getByText('H859')).toBeInTheDocument()
    })
    await user.click(screen.getByRole('button', { name: /אַתָּה.*a\.Tah.*you.*H859/i }))
    await waitFor(() => {
      expect(screen.getByRole('region', { name: 'Lexicon definition' })).toBeInTheDocument()
      expect(screen.getByText('Source: TBESH (brief)')).toBeInTheDocument()
      expect(screen.getByText('nothingness; non-existence')).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /^Full$/i })).not.toBeInTheDocument()
      const lexiconRegion = screen.getByRole('region', { name: 'Lexicon definition' })
      expect(lexiconRegion).toHaveTextContent('Lemma')
      expect(lexiconRegion).toHaveTextContent('Transliteration')
      expect(lexiconRegion).toHaveTextContent('Gloss')
      expect(lexiconRegion).toHaveTextContent('Definition')
    })
    const lemmaLine = screen.getByText('אַ֫יִן')
    const translitLine = screen.getByText('a.yin')
    expect(lemmaLine).toHaveAttribute('dir', 'rtl')
    expect(translitLine).toHaveAttribute('dir', 'ltr')
    expect(lemmaLine.tagName).toBe('P')
    expect(translitLine.tagName).toBe('P')
    expect(lemmaLine.textContent).not.toContain('a.yin')
  })

  it('shows server message when word study returns 503 without data', async () => {
    const message = 'Word study data is not installed on this server.'
    ;(global.fetch as jest.Mock).mockImplementation(async (url: string | URL) => {
      if (String(url).includes('/api/scripture/word-study')) {
        return {
          ok: false,
          status: 503,
          json: async () => ({
            unavailableReason: message,
            error: message,
            verses: [],
          }),
        } as Response
      }
      return { ok: false, json: async () => ({}) } as Response
    })

    render(<ScriptureWordStudyPanel reference="Romans 12:2" enabled />)
    await waitFor(() => {
      expect(screen.getByText(message)).toBeInTheDocument()
    })
  })

  it('shows unavailableReason on failed responses when error is omitted', async () => {
    const message = 'Word study data is not installed on this server.'
    ;(global.fetch as jest.Mock).mockImplementation(async (url: string | URL) => {
      if (String(url).includes('/api/scripture/word-study')) {
        return {
          ok: false,
          status: 503,
          json: async () => ({
            unavailableReason: message,
            verses: [],
          }),
        } as Response
      }
      return { ok: false, json: async () => ({}) } as Response
    })

    render(<ScriptureWordStudyPanel reference="Romans 12:2" enabled />)
    await waitFor(() => {
      expect(screen.getByText(message)).toBeInTheDocument()
    })
  })

  it('shows lexicon in a bottom sheet when embedded', async () => {
    const user = userEvent.setup()
    render(
      <div className="relative h-80">
        <ScriptureWordStudyPanel reference="Romans 12:2" enabled embedded />
      </div>
    )
    await waitFor(() => expect(screen.getByText('G3339')).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: /G3339/i }))
    await waitFor(() => {
      expect(screen.getByRole('region', { name: 'Lexicon definition' })).toBeInTheDocument()
      expect(screen.getByText('Source: TBESG (brief)')).toBeInTheDocument()
    })
  })
})
