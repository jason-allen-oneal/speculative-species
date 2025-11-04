# Testing Documentation

This document describes the testing approach and infrastructure for the Speculative Species project.

## Overview

The project uses **Jest** as the test runner and **React Testing Library** for component testing. The test suite focuses on unit tests for utility functions, component tests for UI elements, and integration tests for complete features.

## Test Infrastructure

### Dependencies

- **jest**: Test runner and framework
- **@testing-library/react**: React component testing utilities
- **@testing-library/jest-dom**: Custom Jest matchers for DOM assertions
- **@testing-library/user-event**: User interaction simulation
- **jest-environment-jsdom**: DOM environment for testing React components
- **@types/jest**: TypeScript type definitions for Jest

### Configuration Files

- `jest.config.js`: Main Jest configuration with Next.js integration
- `jest.setup.js`: Test setup file that imports jest-dom matchers
- `tsconfig.json`: TypeScript configuration (includes test files)

## Running Tests

### Basic Commands

```bash
# Run all tests once
npm test

# Run tests in watch mode (interactive)
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

### Watch Mode Features

In watch mode, Jest provides several useful options:
- Press `a` to run all tests
- Press `f` to run only failed tests
- Press `p` to filter by filename pattern
- Press `t` to filter by test name pattern
- Press `q` to quit watch mode

## Test Organization

Tests are organized in a centralized `tests/` directory at the project root, mirroring the source code structure:

```
tests/
├── lib/
│   ├── utils.test.ts
│   └── config.server.test.ts
└── components/
    ├── Tooltip.test.tsx
    ├── ControlPanel.test.tsx
    └── PlanetView.test.tsx

src/
├── lib/
│   ├── utils.ts
│   └── config.server.ts
└── components/
    ├── Tooltip.tsx
    ├── ControlPanel.tsx
    └── PlanetView.tsx
```

This centralized approach:
- Keeps source code clean and free of test files
- Makes it easy to find all tests in one location
- Mirrors the source structure for easy navigation
- Separates production code from test code

## Test Suites

### Unit Tests

#### `tests/lib/utils.test.ts`
Tests for the Perlin noise generation utility function.

**Coverage:**
- Basic functionality (returns function, returns numbers)
- Output range validation
- Smoothness and continuity
- Deterministic behavior
- Edge cases (zero coordinates, negative values, large numbers)
- Statistical properties (distribution, mean)

**Key tests:**
- Noise function returns finite values in expected range
- Values vary smoothly for nearby coordinates
- Same coordinates produce consistent results
- Different generators produce different results

#### `tests/lib/config.server.test.ts`
Tests for the server-side configuration loader.

**Coverage:**
- Successful config loading and JSON parsing
- Error handling (missing file, invalid JSON, empty file)
- File reading parameters
- Special JSON values (null, boolean, arrays, scientific notation)
- Edge cases (empty object, deeply nested structures, special characters)

**Key tests:**
- Correctly loads and parses valid config.json
- Handles numeric values including scientific notation
- Properly throws errors for invalid JSON or missing files
- Preserves special characters and Unicode in strings

### Component Tests

#### `tests/components/Tooltip.test.tsx`
Tests for the Tooltip component.

**Coverage:**
- Rendering (children, tooltip text, initial state)
- Click interaction (show/hide toggle, mobile behavior)
- Multiple tooltips
- Styling and classes
- Text content (long text, special characters, empty text)
- Accessibility (pointer-events)
- Edge cases (rapid clicks, mouse leave)

**Key tests:**
- Tooltip is initially hidden (opacity-0)
- Click toggles tooltip visibility
- Mouse leave hides tooltip
- Multiple tooltips can coexist independently

#### `tests/components/ControlPanel.test.tsx`
Tests for the ControlPanel component with planet parameter sliders.

**Coverage:**
- Rendering (all sliders, generate button, initial values)
- Value formatting (percentages, decimals, edge cases)
- Slider interactions (local state updates, no immediate setter calls)
- Generate button (calls all setters, passes updated values)
- Slider constraints (min/max/step attributes)
- Tooltip integration
- Accessibility
- Edge cases (rapid changes, prop updates, floating point precision)

**Key tests:**
- All 9 parameter sliders render correctly
- Slider changes update local state but don't call setters immediately
- Generate button calls all setters with current values
- Cloud Cover slider is disabled
- Values format correctly (percentages, 2 decimal places)

### Integration Tests

#### `tests/components/PlanetView.test.tsx`
Tests for the PlanetView component (main application view).

**Coverage:**
- Initial rendering
- State initialization from config
- Planet click interaction (surface sample display, pause)
- Ocean vs land handling
- Generate button integration
- Layout structure
- Surface sample panel styling
- Config variations (different parameter values)
- Edge cases (missing fields, rapid clicks)

**Key tests:**
- Initializes state from config parameters
- Displays surface sample panel when planet is clicked
- Shows correct latitude, longitude, elevation data
- Pauses planet rotation on click
- Handles both land (elevation) and ocean (depth) points
- Layout has control panel at top, canvas in flex-grow container

**Mocking Strategy:**
- Mocks `@react-three/fiber` Canvas component (requires WebGL)
- Mocks child components (ControlPanel, PlanetCanvas) for isolation
- Uses mock implementations that trigger callbacks for testing

## Coverage Goals

The test suite aims for:
- **Utility functions**: 90%+ coverage
- **Components**: 80%+ coverage
- **Integration**: 70%+ coverage

Current coverage can be viewed by running:
```bash
npm run test:coverage
```

This generates a coverage report in the `coverage/` directory and displays a summary in the terminal.

## Writing Tests

### Best Practices

1. **Describe blocks**: Group related tests logically
   ```typescript
   describe('ComponentName', () => {
     describe('Rendering', () => { /* ... */ });
     describe('User Interactions', () => { /* ... */ });
     describe('Edge Cases', () => { /* ... */ });
   });
   ```

2. **Clear test names**: Use descriptive `it()` statements
   ```typescript
   it('should display error message when form validation fails', () => {
     // Test implementation
   });
   ```

3. **Arrange-Act-Assert**: Structure tests clearly
   ```typescript
   it('should increment counter on button click', () => {
     // Arrange
     render(<Counter />);
     const button = screen.getByRole('button');
     
     // Act
     fireEvent.click(button);
     
     // Assert
     expect(screen.getByText('Count: 1')).toBeInTheDocument();
   });
   ```

4. **Mock dependencies**: Use Jest mocks for external dependencies
   ```typescript
   jest.mock('module-name');
   ```

5. **Clean up**: Use `beforeEach` and `afterEach` for setup/teardown
   ```typescript
   beforeEach(() => {
     jest.clearAllMocks();
   });
   ```

### Common Testing Patterns

#### Testing Component Rendering
```typescript
it('should render component with props', () => {
  render(<Component prop1="value" />);
  expect(screen.getByText('value')).toBeInTheDocument();
});
```

#### Testing User Interactions
```typescript
it('should call handler on click', () => {
  const handleClick = jest.fn();
  render(<Button onClick={handleClick} />);
  
  fireEvent.click(screen.getByRole('button'));
  expect(handleClick).toHaveBeenCalledTimes(1);
});
```

#### Testing State Changes
```typescript
it('should update display when state changes', () => {
  render(<Component />);
  const input = screen.getByRole('textbox');
  
  fireEvent.change(input, { target: { value: 'new value' } });
  expect(screen.getByText('new value')).toBeInTheDocument();
});
```

#### Testing Async Operations
```typescript
it('should load data asynchronously', async () => {
  render(<AsyncComponent />);
  
  const data = await screen.findByText('Loaded Data');
  expect(data).toBeInTheDocument();
});
```

## Mocking WebGL and Three.js

Since the project uses Three.js and WebGL for 3D rendering, these components require special mocking:

```typescript
// Mock @react-three/fiber
jest.mock('@react-three/fiber', () => ({
  Canvas: ({ children }: { children: React.ReactNode }) => 
    <div data-testid="mock-canvas">{children}</div>,
  useFrame: jest.fn(),
  useThree: jest.fn(() => ({ 
    camera: { position: { set: jest.fn() } } 
  })),
}));
```

This approach:
- Replaces the Canvas with a simple div for testing
- Mocks hooks like `useFrame` and `useThree`
- Allows testing component logic without WebGL context

## Continuous Integration

The test suite is designed to run in CI/CD environments. Tests should:
- Run without user interaction
- Complete in a reasonable time
- Not depend on external services
- Have deterministic results

## Troubleshooting

### Common Issues

**Issue**: Tests fail with "Cannot find module '@/...'"
**Solution**: Check that `jest.config.js` has correct `moduleNameMapper`:
```javascript
moduleNameMapper: {
  '^@/(.*)$': '<rootDir>/src/$1',
}
```

**Issue**: WebGL/Canvas errors in tests
**Solution**: Ensure `@react-three/fiber` is properly mocked

**Issue**: "ReferenceError: document is not defined"
**Solution**: Verify `testEnvironment: 'jest-environment-jsdom'` in config

**Issue**: Module not found in Node environment tests
**Solution**: Use `@jest-environment node` comment at top of test file

### Getting Help

- Jest Documentation: https://jestjs.io/docs/getting-started
- React Testing Library: https://testing-library.com/react
- Next.js Testing: https://nextjs.org/docs/testing

## Future Improvements

Potential areas for test expansion:

1. **E2E Tests**: Add Playwright or Cypress for full user flow testing
2. **Visual Regression**: Add screenshot comparison testing
3. **Performance Tests**: Test rendering performance of 3D components
4. **Accessibility Tests**: Expand a11y testing with axe-core
5. **Physics Tests**: Add comprehensive tests for physics calculations when implemented

---

Last Updated: 2025-11-03
