import { render, screen, fireEvent } from '@testing-library/react';
import ControlPanel from '@/components/ControlPanel';

describe('ControlPanel Component', () => {
  const mockSetters = {
    setGravity: jest.fn(),
    setOcean: jest.fn(),
    setAxialTilt: jest.fn(),
    setPressure: jest.fn(),
    setOrbitalDist: jest.fn(),
    setRotationPeriod: jest.fn(),
    setCloudCover: jest.fn(),
    setTectonic: jest.fn(),
    setPlanetSize: jest.fn(),
    onGenerate: jest.fn(),
  };

  const defaultProps = {
    gravity: 1.0,
    ocean: 0.71,
    axialTilt: 23.44,
    pressure: 1.0,
    orbitalDist: 1.0,
    rotationPeriod: 24,
    cloudCover: 0.67,
    tectonic: 5,
    planetSize: 1.0,
    ...mockSetters,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render all sliders', () => {
      render(<ControlPanel {...defaultProps} />);
      
      expect(screen.getByText(/Gravity/)).toBeInTheDocument();
      expect(screen.getByText(/Ocean Coverage/)).toBeInTheDocument();
      expect(screen.getByText(/Axial Tilt/)).toBeInTheDocument();
      expect(screen.getByText(/Atmospheric Pressure/)).toBeInTheDocument();
      expect(screen.getByText(/Orbital Distance/)).toBeInTheDocument();
      expect(screen.getByText(/Day Length/)).toBeInTheDocument();
      expect(screen.getByText(/Cloud Cover/)).toBeInTheDocument();
      expect(screen.getByText(/Tectonic Activity/)).toBeInTheDocument();
      expect(screen.getByText(/Planet Radius/)).toBeInTheDocument();
    });

    it('should render Generate button', () => {
      render(<ControlPanel {...defaultProps} />);
      
      expect(screen.getByRole('button', { name: /Generate/i })).toBeInTheDocument();
    });

    it('should display initial values correctly', () => {
      render(<ControlPanel {...defaultProps} />);
      
      expect(screen.getByText(/Gravity \(g\): 1\.00/)).toBeInTheDocument();
      expect(screen.getByText(/Ocean Coverage: 71%/)).toBeInTheDocument();
      expect(screen.getByText(/Axial Tilt \(°\): 23\.44/)).toBeInTheDocument();
    });

    it('should mark cloud cover slider as disabled', () => {
      render(<ControlPanel {...defaultProps} />);
      
      const cloudSlider = screen.getByRole('slider', { name: /Cloud Cover/i });
      expect(cloudSlider).toBeDisabled();
    });
  });

  describe('Value Formatting', () => {
    it('should format percentage values correctly', () => {
      render(<ControlPanel {...defaultProps} ocean={0.5} cloudCover={0.33} />);
      
      expect(screen.getByText(/Ocean Coverage: 50%/)).toBeInTheDocument();
      expect(screen.getByText(/Cloud Cover.*: 33%/)).toBeInTheDocument();
    });

    it('should format decimal values to 2 places', () => {
      render(<ControlPanel {...defaultProps} gravity={1.234567} tectonic={7.89} />);
      
      expect(screen.getByText(/Gravity \(g\): 1\.23/)).toBeInTheDocument();
      expect(screen.getByText(/Tectonic Activity: 7\.89/)).toBeInTheDocument();
    });

    it('should handle edge case values', () => {
      render(
        <ControlPanel
          {...defaultProps}
          gravity={0.1}
          ocean={1}
          axialTilt={0}
          pressure={10}
        />
      );
      
      expect(screen.getByText(/Gravity \(g\): 0\.10/)).toBeInTheDocument();
      expect(screen.getByText(/Ocean Coverage: 100%/)).toBeInTheDocument();
      expect(screen.getByText(/Axial Tilt \(°\): 0\.00/)).toBeInTheDocument();
      expect(screen.getByText(/Atmospheric Pressure \(atm\): 10\.00/)).toBeInTheDocument();
    });
  });

  describe('Slider Interactions', () => {
    it('should update local state when slider value changes', () => {
      render(<ControlPanel {...defaultProps} />);
      
      const gravitySlider = screen.getAllByRole('slider')[0];
      fireEvent.change(gravitySlider, { target: { value: '1.5' } });
      
      // Local state should update (visible in display)
      expect(screen.getByText(/Gravity \(g\): 1\.50/)).toBeInTheDocument();
    });

    it('should not call setters immediately on slider change', () => {
      render(<ControlPanel {...defaultProps} />);
      
      const gravitySlider = screen.getAllByRole('slider')[0];
      fireEvent.change(gravitySlider, { target: { value: '1.5' } });
      
      // Setters should not be called until Generate is clicked
      expect(mockSetters.setGravity).not.toHaveBeenCalled();
    });

    it('should update multiple sliders independently', () => {
      render(<ControlPanel {...defaultProps} />);
      
      const sliders = screen.getAllByRole('slider');
      
      // Change gravity
      fireEvent.change(sliders[0], { target: { value: '2.0' } });
      expect(screen.getByText(/Gravity \(g\): 2\.00/)).toBeInTheDocument();
      
      // Change ocean coverage
      fireEvent.change(sliders[1], { target: { value: '0.5' } });
      expect(screen.getByText(/Ocean Coverage: 50%/)).toBeInTheDocument();
    });
  });

  describe('Generate Button', () => {
    it('should call all setters when Generate is clicked', () => {
      render(<ControlPanel {...defaultProps} />);
      
      const generateButton = screen.getByRole('button', { name: /Generate/i });
      fireEvent.click(generateButton);
      
      expect(mockSetters.setGravity).toHaveBeenCalledWith(1.0);
      expect(mockSetters.setOcean).toHaveBeenCalledWith(0.71);
      expect(mockSetters.setAxialTilt).toHaveBeenCalledWith(23.44);
      expect(mockSetters.setPressure).toHaveBeenCalledWith(1.0);
      expect(mockSetters.setOrbitalDist).toHaveBeenCalledWith(1.0);
      expect(mockSetters.setRotationPeriod).toHaveBeenCalledWith(24);
      expect(mockSetters.setCloudCover).toHaveBeenCalledWith(0.67);
      expect(mockSetters.setTectonic).toHaveBeenCalledWith(5);
      expect(mockSetters.setPlanetSize).toHaveBeenCalledWith(1.0);
    });

    it('should call onGenerate with updated values', () => {
      render(<ControlPanel {...defaultProps} />);
      
      // Change a value
      const gravitySlider = screen.getAllByRole('slider')[0];
      fireEvent.change(gravitySlider, { target: { value: '2.5' } });
      
      const generateButton = screen.getByRole('button', { name: /Generate/i });
      fireEvent.click(generateButton);
      
      expect(mockSetters.onGenerate).toHaveBeenCalledWith(
        expect.objectContaining({
          gravity: 2.5,
          ocean: 0.71,
          axialTilt: 23.44,
        })
      );
    });

    it('should call each setter exactly once per generate click', () => {
      render(<ControlPanel {...defaultProps} />);
      
      const generateButton = screen.getByRole('button', { name: /Generate/i });
      fireEvent.click(generateButton);
      
      expect(mockSetters.setGravity).toHaveBeenCalledTimes(1);
      expect(mockSetters.setOcean).toHaveBeenCalledTimes(1);
      expect(mockSetters.setPlanetSize).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple Generate button clicks', () => {
      render(<ControlPanel {...defaultProps} />);
      
      const generateButton = screen.getByRole('button', { name: /Generate/i });
      
      fireEvent.click(generateButton);
      fireEvent.click(generateButton);
      fireEvent.click(generateButton);
      
      expect(mockSetters.setGravity).toHaveBeenCalledTimes(3);
      expect(mockSetters.onGenerate).toHaveBeenCalledTimes(3);
    });
  });

  describe('Slider Constraints', () => {
    it('should respect min and max values for gravity', () => {
      const { container } = render(<ControlPanel {...defaultProps} />);
      
      const gravitySlider = screen.getAllByRole('slider')[0];
      expect(gravitySlider).toHaveAttribute('min', '0.1');
      expect(gravitySlider).toHaveAttribute('max', '3');
      expect(gravitySlider).toHaveAttribute('step', '0.05');
    });

    it('should respect min and max values for ocean coverage', () => {
      render(<ControlPanel {...defaultProps} />);
      const oceanSlider = screen.getAllByRole('slider')[1];
      
      expect(oceanSlider).toHaveAttribute('min', '0');
      expect(oceanSlider).toHaveAttribute('max', '1');
      expect(oceanSlider).toHaveAttribute('step', '0.01');
    });

    it('should respect constraints for all sliders', () => {
      render(<ControlPanel {...defaultProps} />);
      
      const sliders = screen.getAllByRole('slider');
      
      // Each slider should have min, max, and step attributes
      sliders.forEach(slider => {
        expect(slider).toHaveAttribute('min');
        expect(slider).toHaveAttribute('max');
        expect(slider).toHaveAttribute('step');
      });
    });
  });

  describe('Tooltip Integration', () => {
    it('should render tooltips for all sliders', () => {
      render(<ControlPanel {...defaultProps} />);
      
      // Check for tooltip text in the DOM (they're rendered but hidden)
      expect(screen.getByText(/Determines surface weight and atmospheric retention/)).toBeInTheDocument();
      expect(screen.getByText(/Fraction of the planet covered by oceans/)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have accessible slider labels', () => {
      render(<ControlPanel {...defaultProps} />);
      
      const sliders = screen.getAllByRole('slider');
      expect(sliders.length).toBeGreaterThan(0);
      
      // All sliders should be present
      expect(sliders.length).toBe(9); // 9 parameters
    });

    it('should have button with accessible name', () => {
      render(<ControlPanel {...defaultProps} />);
      
      const button = screen.getByRole('button', { name: /Generate/i });
      expect(button).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid slider changes', () => {
      render(<ControlPanel {...defaultProps} />);
      
      const gravitySlider = screen.getAllByRole('slider')[0];
      
      // Rapid changes
      for (let i = 0; i < 10; i++) {
        fireEvent.change(gravitySlider, { target: { value: `${0.5 + i * 0.1}` } });
      }
      
      // Should still be functional
      expect(screen.getByText(/Gravity/)).toBeInTheDocument();
    });

    it('should maintain state after prop changes', () => {
      const { rerender } = render(<ControlPanel {...defaultProps} />);
      
      // Change local value
      const gravitySlider = screen.getAllByRole('slider')[0];
      fireEvent.change(gravitySlider, { target: { value: '2.0' } });
      
      // Update props (but local state should be independent until Generate)
      rerender(<ControlPanel {...defaultProps} gravity={1.5} />);
      
      // Local value should be preserved
      expect(screen.getByText(/Gravity \(g\): 2\.00/)).toBeInTheDocument();
    });

    it('should handle floating point precision in displays', () => {
      render(<ControlPanel {...defaultProps} gravity={1.999999} />);
      
      // Should round/format properly
      expect(screen.getByText(/Gravity \(g\): 2\.00/)).toBeInTheDocument();
    });
  });

  describe('Component Structure', () => {
    it('should have correct CSS classes for layout', () => {
      const { container } = render(<ControlPanel {...defaultProps} />);
      
      const panel = container.querySelector('.w-full.flex.flex-wrap');
      expect(panel).toBeInTheDocument();
    });

    it('should render button with correct styling classes', () => {
      render(<ControlPanel {...defaultProps} />);
      
      const button = screen.getByRole('button', { name: /Generate/i });
      expect(button.className).toContain('bg-blue-600');
      expect(button.className).toContain('hover:bg-blue-500');
    });
  });
});
