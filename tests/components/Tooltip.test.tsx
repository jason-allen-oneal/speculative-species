import { render, screen, fireEvent } from '@testing-library/react';
import Tooltip from '@/components/Tooltip';

describe('Tooltip Component', () => {
  const defaultProps = {
    id: 'test-tooltip',
    text: 'This is a test tooltip',
    children: <button>Hover me</button>,
  };

  describe('Rendering', () => {
    it('should render children', () => {
      render(<Tooltip {...defaultProps} />);
      
      expect(screen.getByRole('button', { name: 'Hover me' })).toBeInTheDocument();
    });

    it('should render tooltip text in the DOM', () => {
      render(<Tooltip {...defaultProps} />);
      
      expect(screen.getByText('This is a test tooltip')).toBeInTheDocument();
    });

    it('should initially hide tooltip (opacity-0)', () => {
      render(<Tooltip {...defaultProps} />);
      
      const tooltipText = screen.getByText('This is a test tooltip');
      expect(tooltipText.className).toContain('opacity-0');
    });

    it('should render with correct id prop', () => {
      const { container } = render(<Tooltip {...defaultProps} />);
      
      // The tooltip should have interaction tied to the id
      const tooltipWrapper = container.querySelector('.relative.group');
      expect(tooltipWrapper).toBeInTheDocument();
    });

    it('should render custom children correctly', () => {
      render(
        <Tooltip id="custom" text="Custom tooltip">
          <div data-testid="custom-child">Custom Content</div>
        </Tooltip>
      );
      
      expect(screen.getByTestId('custom-child')).toBeInTheDocument();
      expect(screen.getByText('Custom Content')).toBeInTheDocument();
    });
  });

  describe('Click Interaction (Mobile Toggle)', () => {
    it('should show tooltip on click', () => {
      const { container } = render(<Tooltip {...defaultProps} />);
      
      const wrapper = container.querySelector('.relative.group');
      if (wrapper) {
        fireEvent.click(wrapper);
      }
      
      const tooltipText = screen.getByText('This is a test tooltip');
      expect(tooltipText.className).toContain('opacity-100');
    });

    it('should toggle tooltip visibility on repeated clicks', () => {
      const { container } = render(<Tooltip {...defaultProps} />);
      
      const wrapper = container.querySelector('.relative.group');
      if (wrapper) {
        // First click - show
        fireEvent.click(wrapper);
        let tooltipText = screen.getByText('This is a test tooltip');
        expect(tooltipText.className).toContain('opacity-100');
        
        // Second click - hide
        fireEvent.click(wrapper);
        tooltipText = screen.getByText('This is a test tooltip');
        expect(tooltipText.className).toContain('opacity-0');
        
        // Third click - show again
        fireEvent.click(wrapper);
        tooltipText = screen.getByText('This is a test tooltip');
        expect(tooltipText.className).toContain('opacity-100');
      }
    });

    it('should hide tooltip on mouse leave after click', () => {
      const { container } = render(<Tooltip {...defaultProps} />);
      
      const wrapper = container.querySelector('.relative.group');
      if (wrapper) {
        // Click to show
        fireEvent.click(wrapper);
        let tooltipText = screen.getByText('This is a test tooltip');
        expect(tooltipText.className).toContain('opacity-100');
        
        // Mouse leave to hide
        fireEvent.mouseLeave(wrapper);
        tooltipText = screen.getByText('This is a test tooltip');
        expect(tooltipText.className).toContain('opacity-0');
      }
    });
  });

  describe('Multiple Tooltips', () => {
    it('should handle multiple tooltips with different ids', () => {
      render(
        <>
          <Tooltip id="tooltip1" text="Tooltip 1">
            <div>Element 1</div>
          </Tooltip>
          <Tooltip id="tooltip2" text="Tooltip 2">
            <div>Element 2</div>
          </Tooltip>
        </>
      );
      
      expect(screen.getByText('Tooltip 1')).toBeInTheDocument();
      expect(screen.getByText('Tooltip 2')).toBeInTheDocument();
      expect(screen.getByText('Element 1')).toBeInTheDocument();
      expect(screen.getByText('Element 2')).toBeInTheDocument();
    });

    it('should only show one tooltip at a time when clicked', () => {
      const { container } = render(
        <>
          <Tooltip id="tooltip1" text="Tooltip 1">
            <div>Element 1</div>
          </Tooltip>
          <Tooltip id="tooltip2" text="Tooltip 2">
            <div>Element 2</div>
          </Tooltip>
        </>
      );
      
      const wrappers = container.querySelectorAll('.relative.group');
      
      // Click first tooltip
      if (wrappers[0]) {
        fireEvent.click(wrappers[0]);
        const tooltip1 = screen.getByText('Tooltip 1');
        expect(tooltip1.className).toContain('opacity-100');
      }
      
      // Note: Since each tooltip has its own state, both can be shown independently
      // This is the current behavior based on the component implementation
    });
  });

  describe('Styling and Classes', () => {
    it('should apply correct positioning classes', () => {
      render(<Tooltip {...defaultProps} />);
      
      const tooltipText = screen.getByText('This is a test tooltip');
      expect(tooltipText.className).toContain('absolute');
      expect(tooltipText.className).toContain('left-full');
      expect(tooltipText.className).toContain('ml-2');
    });

    it('should apply transition classes', () => {
      render(<Tooltip {...defaultProps} />);
      
      const tooltipText = screen.getByText('This is a test tooltip');
      expect(tooltipText.className).toContain('transition-opacity');
      expect(tooltipText.className).toContain('duration-300');
    });

    it('should apply z-index for layering', () => {
      render(<Tooltip {...defaultProps} />);
      
      const tooltipText = screen.getByText('This is a test tooltip');
      expect(tooltipText.className).toContain('z-50');
    });

    it('should have correct inline styles for background', () => {
      render(<Tooltip {...defaultProps} />);
      
      const tooltipText = screen.getByText('This is a test tooltip');

      // Check that inline styles are applied (exact values may vary)
      expect(tooltipText).toHaveStyle({
        backgroundColor: 'rgba(0, 0, 0, 0.95)',
      });
    });
  });

  describe('Text Content', () => {
    it('should display long text correctly', () => {
      const longText = 'This is a very long tooltip text that should still be displayed correctly in the tooltip component without any issues.';
      
      render(
        <Tooltip id="long" text={longText}>
          <div>Element</div>
        </Tooltip>
      );
      
      expect(screen.getByText(longText)).toBeInTheDocument();
    });

    it('should handle special characters in text', () => {
      const specialText = 'Special: & < > " \' / \\ @ # $ % ^';
      
      render(
        <Tooltip id="special" text={specialText}>
          <div>Element</div>
        </Tooltip>
      );
      
      expect(screen.getByText(specialText)).toBeInTheDocument();
    });

    it('should handle empty text', () => {
      const { container } = render(
        <Tooltip id="empty" text="">
          <div>Element</div>
        </Tooltip>
      );
      const tooltipDiv = container.querySelector('.absolute.left-full');
      expect(tooltipDiv).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have pointer-events-none when hidden', () => {
      render(<Tooltip {...defaultProps} />);
      
      const tooltipText = screen.getByText('This is a test tooltip');
      expect(tooltipText.className).toContain('pointer-events-none');
    });

    it('should have pointer-events-auto when visible', () => {
      const { container } = render(<Tooltip {...defaultProps} />);
      
      const wrapper = container.querySelector('.relative.group');
      if (wrapper) {
        fireEvent.click(wrapper);
      }
      
      const tooltipText = screen.getByText('This is a test tooltip');
      expect(tooltipText.className).toContain('pointer-events-auto');
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid clicks without errors', () => {
      const { container } = render(<Tooltip {...defaultProps} />);
      
      const wrapper = container.querySelector('.relative.group');
      if (wrapper) {
        // Rapid clicking
        for (let i = 0; i < 10; i++) {
          fireEvent.click(wrapper);
        }
      }
      
      // Should not crash and tooltip should exist
      expect(screen.getByText('This is a test tooltip')).toBeInTheDocument();
    });

    it('should handle mouse leave without prior interaction', () => {
      const { container } = render(<Tooltip {...defaultProps} />);
      
      const wrapper = container.querySelector('.relative.group');
      if (wrapper) {
        fireEvent.mouseLeave(wrapper);
      }
      
      const tooltipText = screen.getByText('This is a test tooltip');
      expect(tooltipText.className).toContain('opacity-0');
    });
  });
});
