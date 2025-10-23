import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ScriptureModal from '../ScriptureModal'

// Mock fetch for scripture API calls
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

describe('ScriptureModal Component', () => {
  const defaultProps = {
    reference: 'John 3:16',
    isOpen: true,
    onClose: jest.fn(),
  }

  beforeEach(() => {
    mockFetch.mockClear()
    jest.clearAllMocks()
    
    // Default mock for fetch - can be overridden in individual tests
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        passages: ['Sample scripture text']
      })
    } as Response)
  })

  it('should render modal when open', () => {
    render(<ScriptureModal {...defaultProps} />)
    
    expect(screen.getByText('John 3:16')).toBeInTheDocument()
    expect(screen.getByLabelText('Close modal')).toBeInTheDocument()
  })

  it('should not render modal when closed', () => {
    render(<ScriptureModal {...defaultProps} isOpen={false} />)
    
    expect(screen.queryByText('John 3:16')).not.toBeInTheDocument()
  })

  it('should call onClose when close button is clicked', async () => {
    const user = userEvent.setup()
    const mockOnClose = jest.fn()
    
    render(<ScriptureModal {...defaultProps} onClose={mockOnClose} />)
    
    const closeButton = screen.getByLabelText('Close modal')
    await user.click(closeButton)
    
    expect(mockOnClose).toHaveBeenCalled()
  })

  it('should show navigation buttons when provided', () => {
    const mockOnPrevious = jest.fn()
    const mockOnNext = jest.fn()
    
    render(
      <ScriptureModal 
        {...defaultProps} 
        onPrevious={mockOnPrevious}
        onNext={mockOnNext}
        hasPrevious={true}
        hasNext={true}
        currentIndex={1}
        totalFavorites={3}
      />
    )
    
    expect(screen.getByLabelText('Previous Scripture')).toBeInTheDocument()
    expect(screen.getByLabelText('Next Scripture')).toBeInTheDocument()
    expect(screen.getByText(/2.*of.*3.*favorites/)).toBeInTheDocument()
  })

  it('should call navigation functions when buttons are clicked', async () => {
    const user = userEvent.setup()
    const mockOnPrevious = jest.fn()
    const mockOnNext = jest.fn()
    
    render(
      <ScriptureModal 
        {...defaultProps} 
        onPrevious={mockOnPrevious}
        onNext={mockOnNext}
        hasPrevious={true}
        hasNext={true}
      />
    )
    
    await user.click(screen.getByLabelText('Previous Scripture'))
    expect(mockOnPrevious).toHaveBeenCalled()
    
    await user.click(screen.getByLabelText('Next Scripture'))
    expect(mockOnNext).toHaveBeenCalled()
  })

  it('should disable navigation buttons appropriately', () => {
    render(
      <ScriptureModal 
        {...defaultProps} 
        onPrevious={jest.fn()}
        onNext={jest.fn()}
        hasPrevious={false}
        hasNext={true}
      />
    )
    
    expect(screen.getByLabelText('Previous Scripture')).toBeDisabled()
    expect(screen.getByLabelText('Next Scripture')).not.toBeDisabled()
  })

  it('should fetch scripture text when opened', async () => {
    const mockScriptureResponse = {
      ok: true,
      json: () => Promise.resolve({
        passages: ['For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life.']
      })
    }
    
    mockFetch.mockResolvedValueOnce(mockScriptureResponse as Response)
    
    render(<ScriptureModal {...defaultProps} />)
    
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/scripture?reference=John%203%3A16')
    })
  })

  it('should handle scripture fetch errors', async () => {
    mockFetch.mockRejectedValueOnce(new Error('API Error'))
    
    render(<ScriptureModal {...defaultProps} />)
    
    await waitFor(() => {
      expect(screen.getByText(/Failed to load scripture/)).toBeInTheDocument()
    })
  })

  it('should show context when provided', () => {
    const context = {
      sectionTitle: 'God',
      subsectionTitle: 'God\'s Love',
      content: 'This passage shows God\'s love for humanity.'
    }
    
    render(<ScriptureModal {...defaultProps} context={context} />)
    
    expect(screen.getByText(/Chapter Context/)).toBeInTheDocument()
  })

  it('should toggle context display', async () => {
    const user = userEvent.setup()
    const context = {
      sectionTitle: 'God',
      subsectionTitle: 'God\'s Love',
      content: 'This passage shows God\'s love for humanity.'
    }
    
    render(<ScriptureModal {...defaultProps} context={context} />)
    
    const contextButton = screen.getByText(/Chapter Context/)
    await user.click(contextButton)
    
    expect(screen.getByText('God')).toBeInTheDocument()
    expect(screen.getByText('God\'s Love')).toBeInTheDocument()
    expect(screen.getByText('This passage shows God\'s love for humanity.')).toBeInTheDocument()
  })



  it('should show loading state', () => {
    // Mock fetch to return a pending promise
    let resolvePromise: (value: any) => void
    const pendingPromise = new Promise((resolve) => {
      resolvePromise = resolve
    })
    
    mockFetch.mockReturnValueOnce(pendingPromise as any)
    
    render(<ScriptureModal {...defaultProps} />)
    
    expect(screen.getByText(/Loading scripture/)).toBeInTheDocument()
  })
})