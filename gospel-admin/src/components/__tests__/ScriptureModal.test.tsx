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
  })

  it('should render modal when open', () => {
    render(<ScriptureModal {...defaultProps} />)
    
    expect(screen.getByText('John 3:16')).toBeInTheDocument()
    expect(screen.getByText('Close')).toBeInTheDocument()
  })

  it('should not render modal when closed', () => {
    render(<ScriptureModal {...defaultProps} isOpen={false} />)
    
    expect(screen.queryByText('John 3:16')).not.toBeInTheDocument()
  })

  it('should call onClose when close button is clicked', async () => {
    const user = userEvent.setup()
    const mockOnClose = jest.fn()
    
    render(<ScriptureModal {...defaultProps} onClose={mockOnClose} />)
    
    const closeButton = screen.getByText('Close')
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
    
    expect(screen.getByText('Previous')).toBeInTheDocument()
    expect(screen.getByText('Next')).toBeInTheDocument()
    expect(screen.getByText('2 of 3')).toBeInTheDocument()
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
    
    await user.click(screen.getByText('Previous'))
    expect(mockOnPrevious).toHaveBeenCalled()
    
    await user.click(screen.getByText('Next'))
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
    
    expect(screen.getByText('Previous')).toBeDisabled()
    expect(screen.getByText('Next')).not.toBeDisabled()
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
      expect(mockFetch).toHaveBeenCalledWith('/api/scripture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reference: 'John 3:16' })
      })
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
    
    expect(screen.getByText('Show Context')).toBeInTheDocument()
  })

  it('should toggle context display', async () => {
    const user = userEvent.setup()
    const context = {
      sectionTitle: 'God',
      subsectionTitle: 'God\'s Love',
      content: 'This passage shows God\'s love for humanity.'
    }
    
    render(<ScriptureModal {...defaultProps} context={context} />)
    
    const contextButton = screen.getByText('Show Context')
    await user.click(contextButton)
    
    expect(screen.getByText('God > God\'s Love')).toBeInTheDocument()
    expect(screen.getByText('This passage shows God\'s love for humanity.')).toBeInTheDocument()
    expect(screen.getByText('Hide Context')).toBeInTheDocument()
  })

  it('should handle keyboard navigation', async () => {
    const user = userEvent.setup()
    const mockOnClose = jest.fn()
    const mockOnNext = jest.fn()
    const mockOnPrevious = jest.fn()
    
    render(
      <ScriptureModal 
        {...defaultProps} 
        onClose={mockOnClose}
        onNext={mockOnNext}
        onPrevious={mockOnPrevious}
        hasNext={true}
        hasPrevious={true}
      />
    )
    
    // ESC key should close modal
    await user.keyboard('{Escape}')
    expect(mockOnClose).toHaveBeenCalled()
    
    // Arrow keys should navigate
    await user.keyboard('{ArrowLeft}')
    expect(mockOnPrevious).toHaveBeenCalled()
    
    await user.keyboard('{ArrowRight}')
    expect(mockOnNext).toHaveBeenCalled()
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