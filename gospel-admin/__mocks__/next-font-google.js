// Jest mock for next/font/google (Geist, Geist_Mono, etc.)
const mockFont = () => ({
  className: 'mock-font-class',
  style: {},
})
module.exports = {
  Geist: mockFont,
  Geist_Mono: mockFont,
}
