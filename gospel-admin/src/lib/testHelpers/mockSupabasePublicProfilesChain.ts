/** Supabase `.select().in().eq().eq()` chain that resolves on the second `.eq()`. */
export function mockSupabasePublicProfilesChain(rows: { slug: string; title: string }[]) {
  let eqCalls = 0
  type ProfilesQueryChain = {
    select: jest.Mock
    in: jest.Mock
    eq: jest.Mock
  }
  const chain: ProfilesQueryChain = {
    select: jest.fn(),
    in: jest.fn(),
    eq: jest.fn(),
  }
  chain.select.mockReturnValue(chain)
  chain.in.mockReturnValue(chain)
  chain.eq.mockImplementation(() => {
    eqCalls += 1
    if (eqCalls >= 2) {
      return Promise.resolve({ data: rows, error: null })
    }
    return chain
  })
  return chain
}
