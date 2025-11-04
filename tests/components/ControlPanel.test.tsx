import { fireEvent, render, screen } from "@testing-library/react";
import ControlPanel from "@/components/ControlPanel";

describe("ControlPanel Component", () => {
  const mockSetters = {
    setOcean: jest.fn(),
    setAxialTilt: jest.fn(),
    setOrbitalDist: jest.fn(),
    setRotationPeriod: jest.fn(),
    setCloudCover: jest.fn(),
    setTectonic: jest.fn(),
    setPlanetSize: jest.fn(),
    onGenerate: jest.fn(),
  };

  const defaultProps = {
    ocean: 0.71,
    axialTilt: 23.44,
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

  it("does not render a gravity control or readout", () => {
    render(<ControlPanel {...defaultProps} />);

    expect(screen.queryByText(/Surface Gravity/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("slider", { name: /Gravity/i })).not.toBeInTheDocument();
  });

  it("renders sliders for adjustable parameters only", () => {
    render(<ControlPanel {...defaultProps} />);

    expect(screen.getByRole("slider", { name: /Ocean Coverage/i })).toBeInTheDocument();
    expect(screen.getByRole("slider", { name: /Axial Tilt/i })).toBeInTheDocument();
    expect(screen.getByRole("slider", { name: /Orbital Distance/i })).toBeInTheDocument();
    expect(screen.getByRole("slider", { name: /Day Length/i })).toBeInTheDocument();
    expect(screen.getByRole("slider", { name: /Cloud Cover/i })).toBeInTheDocument();
    expect(screen.getByRole("slider", { name: /Tectonic Activity/i })).toBeInTheDocument();
    expect(screen.getByRole("slider", { name: /Planet Radius/i })).toBeInTheDocument();
    expect(screen.queryByRole("slider", { name: /Atmospheric Pressure/i })).not.toBeInTheDocument();
  });

  it("formats displayed values correctly", () => {
    render(<ControlPanel {...defaultProps} ocean={0.5} cloudCover={0.33} tectonic={7.891} />);

    expect(screen.getByText(/Ocean Coverage: 50%/)).toBeInTheDocument();
    expect(screen.getByText(/Cloud Cover.*: 33%/)).toBeInTheDocument();
    expect(screen.getByText(/Tectonic Activity: 7\.89/)).toBeInTheDocument();
  });

  it("updates local slider state without calling setters immediately", () => {
    render(<ControlPanel {...defaultProps} />);

    const oceanSlider = screen.getByRole("slider", { name: /Ocean Coverage/i });
    fireEvent.change(oceanSlider, { target: { value: "0.5" } });

    expect(screen.getByText(/Ocean Coverage: 50%/)).toBeInTheDocument();
    expect(mockSetters.setOcean).not.toHaveBeenCalled();
  });

  it("calls setters and onGenerate when Generate is clicked", () => {
    render(<ControlPanel {...defaultProps} />);

    const tectonicSlider = screen.getByRole("slider", { name: /Tectonic Activity/i });
    fireEvent.change(tectonicSlider, { target: { value: "6.5" } });

    fireEvent.click(screen.getByRole("button", { name: /Generate/i }));

    expect(mockSetters.setOcean).toHaveBeenCalledWith(0.71);
    expect(mockSetters.setTectonic).toHaveBeenCalledWith(6.5);
    expect(mockSetters.setPlanetSize).toHaveBeenCalledWith(1.0);
    expect(mockSetters.onGenerate).toHaveBeenCalledTimes(1);

    const payload = mockSetters.onGenerate.mock.calls[0][0] as Record<string, number>;
    expect(payload.gravity).toBeUndefined();
    expect(payload.pressure).toBeUndefined();
    expect(payload.ocean).toBe(0.71);
    expect(payload.tectonic).toBe(6.5);
  });

  it("disables the cloud cover slider as indicated", () => {
    render(<ControlPanel {...defaultProps} />);

    const cloudSlider = screen.getByRole("slider", { name: /Cloud Cover/i });
    expect(cloudSlider).toBeDisabled();
  });

  it("exposes sliders with accessible names and expected count", () => {
    render(<ControlPanel {...defaultProps} />);

    const sliders = screen.getAllByRole("slider");
    expect(sliders).toHaveLength(7);
  });

  it("enforces slider constraints for ocean coverage", () => {
    render(<ControlPanel {...defaultProps} />);

    const oceanSlider = screen.getByRole("slider", { name: /Ocean Coverage/i });
    expect(oceanSlider).toHaveAttribute("min", "0");
    expect(oceanSlider).toHaveAttribute("max", "1");
    expect(oceanSlider).toHaveAttribute("step", "0.01");
  });
});
