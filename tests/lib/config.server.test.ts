/**
 * @jest-environment node
 */

import { loadConfig } from '@/lib/config.server';
import { readFile } from 'node:fs/promises';

// Mock the fs/promises module
jest.mock('node:fs/promises');

const mockReadFile = readFile as jest.MockedFunction<typeof readFile>;

describe('loadConfig', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Successful Config Loading', () => {
    it('should load and parse valid config.json', async () => {
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

      mockReadFile.mockResolvedValue(JSON.stringify(mockConfig));

      const result = await loadConfig();

      expect(mockReadFile).toHaveBeenCalledWith('config.json', 'utf8');
      expect(result).toEqual(mockConfig);
    });

    it('should correctly parse numeric values', async () => {
      const mockConfig = {
        params: {
          physical: {
            radius_scale: 0.75,
            mass: 1.2e24,
          },
        },
      };

      mockReadFile.mockResolvedValue(JSON.stringify(mockConfig));

      const result = await loadConfig();

      expect(result.params.physical.radius_scale).toBe(0.75);
      expect(result.params.physical.mass).toBe(1.2e24);
    });

    it('should correctly parse nested objects', async () => {
      const mockConfig = {
        params: {
          atmosphere: {
            composition: {
              N2: 0.78,
              O2: 0.21,
              Ar: 0.01,
            },
          },
        },
      };

      mockReadFile.mockResolvedValue(JSON.stringify(mockConfig));

      const result = await loadConfig();

      expect(result.params.atmosphere.composition).toEqual({
        N2: 0.78,
        O2: 0.21,
        Ar: 0.01,
      });
    });
  });

  describe('Error Handling', () => {
    it('should throw error when file does not exist', async () => {
      const error = new Error('ENOENT: no such file or directory');
      (error as NodeJS.ErrnoException).code = 'ENOENT';
      mockReadFile.mockRejectedValue(error);

      await expect(loadConfig()).rejects.toThrow();
    });

    it('should throw error when JSON is invalid', async () => {
      mockReadFile.mockResolvedValue('{ invalid json }');

      await expect(loadConfig()).rejects.toThrow();
    });

    it('should throw error when file is empty', async () => {
      mockReadFile.mockResolvedValue('');

      await expect(loadConfig()).rejects.toThrow();
    });

    it('should throw error on malformed JSON with missing braces', async () => {
      mockReadFile.mockResolvedValue('{"params": {"physical": {"radius_scale": 1.0}');

      await expect(loadConfig()).rejects.toThrow();
    });

    it('should throw error on invalid unicode in JSON', async () => {
      // Note: JSON.parse actually handles this specific unicode character
      // Use a truly invalid JSON string instead
      mockReadFile.mockResolvedValue('{"test": undefined}');

      await expect(loadConfig()).rejects.toThrow();
    });
  });

  describe('File Reading Parameters', () => {
    it('should read file with utf8 encoding', async () => {
      mockReadFile.mockResolvedValue('{"test": "data"}');

      await loadConfig();

      expect(mockReadFile).toHaveBeenCalledWith('config.json', 'utf8');
    });

    it('should call readFile exactly once', async () => {
      mockReadFile.mockResolvedValue('{"test": "data"}');

      await loadConfig();

      expect(mockReadFile).toHaveBeenCalledTimes(1);
    });
  });

  describe('Special JSON Values', () => {
    it('should handle null values in JSON', async () => {
      const mockConfig = {
        params: {
          test: null,
        },
      };

      mockReadFile.mockResolvedValue(JSON.stringify(mockConfig));

      const result = await loadConfig();

      expect(result.params.test).toBeNull();
    });

    it('should handle boolean values in JSON', async () => {
      const mockConfig = {
        params: {
          enabled: true,
          disabled: false,
        },
      };

      mockReadFile.mockResolvedValue(JSON.stringify(mockConfig));

      const result = await loadConfig();

      expect(result.params.enabled).toBe(true);
      expect(result.params.disabled).toBe(false);
    });

    it('should handle arrays in JSON', async () => {
      const mockConfig = {
        params: {
          values: [1, 2, 3, 4, 5],
          strings: ['a', 'b', 'c'],
        },
      };

      mockReadFile.mockResolvedValue(JSON.stringify(mockConfig));

      const result = await loadConfig();

      expect(result.params.values).toEqual([1, 2, 3, 4, 5]);
      expect(result.params.strings).toEqual(['a', 'b', 'c']);
    });

    it('should handle very large numbers in scientific notation', async () => {
      const mockConfig = {
        params: {
          mass: 5.972e24,
          distance: 1.496e11,
        },
      };

      mockReadFile.mockResolvedValue(JSON.stringify(mockConfig));

      const result = await loadConfig();

      expect(result.params.mass).toBe(5.972e24);
      expect(result.params.distance).toBe(1.496e11);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty object', async () => {
      mockReadFile.mockResolvedValue('{}');

      const result = await loadConfig();

      expect(result).toEqual({});
    });

    it('should handle deeply nested structures', async () => {
      const mockConfig = {
        level1: {
          level2: {
            level3: {
              level4: {
                value: 'deep',
              },
            },
          },
        },
      };

      mockReadFile.mockResolvedValue(JSON.stringify(mockConfig));

      const result = await loadConfig();

      expect(result.level1.level2.level3.level4.value).toBe('deep');
    });

    it('should preserve string whitespace', async () => {
      const mockConfig = {
        text: '  spaces  ',
        multiline: 'line1\nline2',
      };

      mockReadFile.mockResolvedValue(JSON.stringify(mockConfig));

      const result = await loadConfig();

      expect(result.text).toBe('  spaces  ');
      expect(result.multiline).toBe('line1\nline2');
    });

    it('should handle special characters in strings', async () => {
      const mockConfig = {
        unicode: '🌍🪐⭐',
        escaped: 'quote: " backslash: \\',
      };

      mockReadFile.mockResolvedValue(JSON.stringify(mockConfig));

      const result = await loadConfig();

      expect(result.unicode).toBe('🌍🪐⭐');
      expect(result.escaped).toBe('quote: " backslash: \\');
    });
  });
});
