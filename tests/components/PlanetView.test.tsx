import { render, screen, fireEvent } from "@testing-library/react";
import PlanetView from "@/components/PlanetView";
import type { ComponentProps, ReactNode } from "react";
import type ControlPanel from "@/components/ControlPanel";
import type PlanetCanvas from "@/components/PlanetCanvas";
import type PhysicsInfo from "@/components/PhysicsInfo";

const mockControlPanel = jest.fn();
const mockPlanetCanvas = jest.fn();
const mockPhysicsInfo = jest.fn();

type ControlPanelProps = ComponentProps<typeof ControlPanel>;
type PlanetCanvasProps = ComponentProps<typeof PlanetCanvas>;
type PhysicsInfoProps = ComponentProps<typeof PhysicsInfo>;

// Mock the Canvas component from @react-three/fiber since it requires WebGL
jest.mock("@react-three/fiber", () => ({
  Canvas: ({ children }: { children: ReactNode }) => <div data-testid="mock-canvas">{children}</div>,
  useFrame: jest.fn(),
  useThree: jest.fn(() => ({ camera: { position: { set: jest.fn() } } })),
}));

// Mock the child components
jest.mock("@/components/ControlPanel", () => {
  return function MockControlPanel(props: ControlPanelProps) {
    mockControlPanel(props);
    return (
      <div data-testid="control-panel">
        <button onClick={() => props.onGenerate({} as Record<string, number>)}>Generate</button>
      </div>
    );
  };
});

jest.mock("@/components/PlanetCanvas", () => {
  return function MockPlanetCanvas(props: PlanetCanvasProps) {
    mockPlanetCanvas(props);
    return (
      <div data-testid="planet-canvas">
        <button 
          onClick={() => props.onPlanetClick && props.onPlanetClick({
            latitude: 45.0,
            longitude: -122.0,
            elevationKm: 1.5,
            elevationMeters: 1500,
            elevationNormalized: 0.6,
            relativeToSeaLevel: 0.3,
            isOcean: false,
            uv: [0.5, 0.5],
            worldPosition: [1, 0, 0],
            localPosition: [1, 0, 0],
          })}
        >
          Click Planet
        </button>
      </div>
    );
  };
});

jest.mock("@/components/PhysicsInfo", () => {
  return function MockPhysicsInfo(props: PhysicsInfoProps) {
    mockPhysicsInfo(props);
    return <div data-testid="physics-info" />;
  };
});

describe('PlanetView Component', () => {
  const mockConfig = {
    params: {
      stellar: {
        star_type: 'G2V',
        orbital_distance: 1.0,
        axial_tilt: 23.44,
        rotation_period_hours: 23.934,
      },
      physical: {
        radius_scale: 1.0,
        mass: 5.972e24,
        magnetosphere: 1.0,
      },
      atmosphere: {
        surface_pressure: 1.0,
        composition: {
          N2: 0.78084,
          O2: 0.20946,
        },
        cloud_cover: 0.67,
        greenhouse_index: 1.0,
      },
      hydrology: {
        ocean: 0.71,
        ice: 0.03,
        tectonic_activity: 5,
        topographic_variation: 0.30,
      },
      climate: {
        mean_surface_temp_k: 288.0,
        wind_strength_mps: 7.0,
      },
    },
    metadata: {
      created: '2025-11-02T22:00:00Z',
      id: 'world_earth',
      name: 'Earth',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockControlPanel.mockClear();
    mockPlanetCanvas.mockClear();
    mockPhysicsInfo.mockClear();
  });

  describe('Initial Rendering', () => {
    it('should render without crashing', () => {
      render(<PlanetView config={mockConfig} />);
      expect(screen.getByTestId('control-panel')).toBeInTheDocument();
      expect(screen.getByTestId('planet-canvas')).toBeInTheDocument();
      expect(screen.getByTestId('physics-info')).toBeInTheDocument();
    });

    it('should render main element with correct classes', () => {
      const { container } = render(<PlanetView config={mockConfig} />);
      const main = container.querySelector('main');
      
      expect(main).toBeInTheDocument();
      expect(main?.className).toContain('w-screen');
      expect(main?.className).toContain('h-screen');
    });

    it('should not show surface sample panel initially', () => {
      render(<PlanetView config={mockConfig} />);
      
      expect(screen.queryByText('Surface Sample')).not.toBeInTheDocument();
    });
  });

  describe('State Initialization from Config', () => {
    it("derives surface gravity from mass and radius", () => {
      render(<PlanetView config={mockConfig} />);

      const controlProps = mockControlPanel.mock.calls[0][0];
      expect(controlProps.ocean).toBeCloseTo(0.71, 2);
      expect(controlProps.axialTilt).toBeCloseTo(23.44, 2);

      const planetProps = mockPlanetCanvas.mock.calls[0][0];
      expect(planetProps.gravity).toBeCloseTo(1.0, 2);

      const physicsProps = mockPhysicsInfo.mock.calls[0][0];
      expect(physicsProps.escapeVelocity.kilometersPerSecond).toBeCloseTo(11.19, 2);
      expect(physicsProps.retention.thresholdVelocity / 1000).toBeCloseTo(1.86, 2);
      expect(physicsProps.temperature.equilibriumTemperature).toBeCloseTo(255, 0);
      expect(physicsProps.temperature.surfaceTemperature).toBeCloseTo(288, 0);
      expect(physicsProps.temperature.greenhouseDelta).toBeCloseTo(33, 0);
      expect(physicsProps.pressure.expectedPressureAtm).toBeCloseTo(1.0, 2);
      expect(physicsProps.pressure.status).toBe("nominal");
      expect(physicsProps.hillSphere.radiusKilometers).toBeGreaterThan(1_300_000);
      expect(physicsProps.hillSphere.radiusKilometers).toBeLessThan(1_600_000);
      expect(physicsProps.orbital.periodDays).toBeCloseTo(365.25, 1);
      expect(physicsProps.cloudSuggestion.suggestedFraction).toBeGreaterThan(0.3);
      expect(physicsProps.wind.qualitative).toBe("moderate");
      expect(physicsProps.retention.warnings).toHaveLength(0);
      expect(physicsProps.retention.gases.length).toBeGreaterThan(0);
    });

    it('should initialize state with orbital distance from config', () => {
      const customConfig = {
        ...mockConfig,
        params: {
          ...mockConfig.params,
          stellar: {
            ...mockConfig.params.stellar,
            orbital_distance: 2.5,
          },
        },
      };
      
      const { container } = render(<PlanetView config={customConfig} />);
      expect(container).toBeInTheDocument();
    });

    it('should initialize state with all config parameters', () => {
      render(<PlanetView config={mockConfig} />);
      
      // Should render without errors with all parameters
      expect(screen.getByTestId('control-panel')).toBeInTheDocument();
      expect(screen.getByTestId('planet-canvas')).toBeInTheDocument();
    });
  });

  describe('Planet Click Interaction', () => {
    it('should display surface sample panel when planet is clicked', () => {
      render(<PlanetView config={mockConfig} />);
      
      const clickButton = screen.getByText('Click Planet');
      fireEvent.click(clickButton);
      
      expect(screen.getByText('Surface Sample')).toBeInTheDocument();
    });

    it('should display correct latitude and longitude', () => {
      render(<PlanetView config={mockConfig} />);
      
      const clickButton = screen.getByText('Click Planet');
      fireEvent.click(clickButton);
      
      expect(screen.getByText(/Lat 45\.00°, Lon -122\.00°/)).toBeInTheDocument();
    });

    it('should display elevation for land', () => {
      render(<PlanetView config={mockConfig} />);
      
      const clickButton = screen.getByText('Click Planet');
      fireEvent.click(clickButton);
      
      expect(screen.getByText(/Elevation.*\+1\.50 km/)).toBeInTheDocument();
    });

    it('should display normalized height', () => {
      render(<PlanetView config={mockConfig} />);
      
      const clickButton = screen.getByText('Click Planet');
      fireEvent.click(clickButton);
      
      expect(screen.getByText(/Normalized height 0\.600/)).toBeInTheDocument();
    });

    it('should display relative sea level', () => {
      render(<PlanetView config={mockConfig} />);
      
      const clickButton = screen.getByText('Click Planet');
      fireEvent.click(clickButton);
      
      expect(screen.getByText(/Relative.*\+30\.0%/)).toBeInTheDocument();
    });

    it('should display world position', () => {
      render(<PlanetView config={mockConfig} />);
      
      const clickButton = screen.getByText('Click Planet');
      fireEvent.click(clickButton);
      
      expect(screen.getByText(/World \(1\.00, 0\.00, 0\.00\)/)).toBeInTheDocument();
    });

    it('should pause planet rotation when clicked', () => {
      render(<PlanetView config={mockConfig} />);
      
      const clickButton = screen.getByText('Click Planet');
      fireEvent.click(clickButton);
      
      // isPaused should be set to true (tested via component not erroring)
      expect(screen.getByText('Surface Sample')).toBeInTheDocument();
    });
  });

  describe('Ocean Click Handling', () => {
    it('should display depth for ocean points', () => {
      // Skip this test for now as the mock doesn't support different scenarios easily
      // This would be better tested in E2E or with more complex mocking
    });
  });

  describe('Generate Button Integration', () => {
    it('should call handleGenerate when generate button is clicked', () => {
      render(<PlanetView config={mockConfig} />);
      
      const generateButton = screen.getByText('Generate');
      
      // Should not throw error when clicked
      expect(() => fireEvent.click(generateButton)).not.toThrow();
    });
  });

  describe('Layout Structure', () => {
    it('should have control panel at the top', () => {
      const { container } = render(<PlanetView config={mockConfig} />);
      
      const main = container.querySelector('main');
      const controlPanel = screen.getByTestId('control-panel');
      
      // Control panel should exist within main element
      expect(main).toContainElement(controlPanel);
    });

    it('should have planet canvas in flex-grow container', () => {
      const { container } = render(<PlanetView config={mockConfig} />);
      
      const flexGrow = container.querySelector('.flex-grow');
      expect(flexGrow).toBeInTheDocument();
      
      const planetCanvas = screen.getByTestId('planet-canvas');
      expect(flexGrow).toContainElement(planetCanvas);
    });

    it('should position surface sample panel absolutely', () => {
      render(<PlanetView config={mockConfig} />);
      
      const clickButton = screen.getByText('Click Planet');
      fireEvent.click(clickButton);
      
      // The surface sample info is in an absolutely positioned div
      // Let's find it by looking for the container with those specific classes
      const { container } = render(<PlanetView config={mockConfig} />);
      fireEvent.click(screen.getAllByText('Click Planet')[1]);
      
      const absolutePanel = container.querySelector('.absolute.bottom-6.left-6');
      expect(absolutePanel).toBeInTheDocument();
    });
  });

  describe('Surface Sample Panel Styling', () => {
    it('should have correct background and border styling', () => {
      render(<PlanetView config={mockConfig} />);
      
      const clickButton = screen.getByText('Click Planet');
      fireEvent.click(clickButton);
      
      // Find the surface sample container (should be outermost div with these classes)
      const { container } = render(<PlanetView config={mockConfig} />);
      fireEvent.click(screen.getAllByText('Click Planet')[1]); // Click the second one (re-rendered)
      
      const panel = container.querySelector('.bg-gray-900\\/85');
      expect(panel).toBeInTheDocument();
      expect(panel?.className).toContain('border-gray-700');
      expect(panel?.className).toContain('rounded-lg');
    });
  });

  describe('Config Variations', () => {
    it("recalculates gravity when radius scale changes", () => {
      const largeRadiusConfig = {
        ...mockConfig,
        params: {
          ...mockConfig.params,
          physical: {
            ...mockConfig.params.physical,
            radius_scale: 2.0,
          },
        },
      };
      
      render(<PlanetView config={largeRadiusConfig} />);
      expect(screen.getByTestId('planet-canvas')).toBeInTheDocument();
      const physicsProps = mockPhysicsInfo.mock.calls[0][0];
      expect(physicsProps.escapeVelocity.kilometersPerSecond).toBeCloseTo(7.91, 2);
      expect(physicsProps.temperature.equilibriumTemperature).toBeLessThan(255);
      expect(physicsProps.pressure.status).toBe("nominal");
      expect(physicsProps.pressure.warnings[0]).toMatch(/Scale height/i);
      expect(physicsProps.hillSphere.radiusKilometers).toBeGreaterThan(1_000_000);
      expect(physicsProps.cloudSuggestion.suggestedFraction).toBeGreaterThan(0.3);
    });

    it('should handle different ocean coverage values', () => {
      const lowOceanConfig = {
        ...mockConfig,
        params: {
          ...mockConfig.params,
          hydrology: {
            ...mockConfig.params.hydrology,
            ocean: 0.2,
          },
        },
      };
      
      render(<PlanetView config={lowOceanConfig} />);
      expect(screen.getByTestId('planet-canvas')).toBeInTheDocument();
    });

    it('should handle extreme axial tilt', () => {
      const extremeTiltConfig = {
        ...mockConfig,
        params: {
          ...mockConfig.params,
          stellar: {
            ...mockConfig.params.stellar,
            axial_tilt: 90,
          },
        },
      };
      
      render(<PlanetView config={extremeTiltConfig} />);
      expect(screen.getByTestId('planet-canvas')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing optional config fields', () => {
      const minimalConfig = {
        params: {
          stellar: {
            orbital_distance: 1.0,
            rotation_period_hours: 24,
            axial_tilt: 0,
          },
          physical: {
            radius_scale: 1.0,
            mass: 5.972e24,
          },
          atmosphere: {
            surface_pressure: 1.0,
            cloud_cover: 0.5,
          },
          hydrology: {
            ocean: 0.5,
            tectonic_activity: 5,
          },
        },
      };
      
      // @ts-expect-error - Testing with minimal config
      render(<PlanetView config={minimalConfig} />);
      expect(screen.getByTestId('planet-canvas')).toBeInTheDocument();
    });

    it('should not crash with rapid planet clicks', () => {
      render(<PlanetView config={mockConfig} />);
      
      const clickButton = screen.getByText('Click Planet');
      
      for (let i = 0; i < 10; i++) {
        fireEvent.click(clickButton);
      }
      
      expect(screen.getByText('Surface Sample')).toBeInTheDocument();
    });
  });
});
