import { terrainHeight } from '@/lib/terrain';

describe('terrainHeight mirror', () => {
  it('returns finite values and is deterministic', () => {
    const args = {
      type: 2,
      v: { x: 0.1, y: 0.2, z: 0.3 },
      amplitude: 1.19,
      sharpness: 2.6,
      offset: -0.016,
      period: 0.6,
      persistence: 0.484,
      lacunarity: 1.8,
      octaves: 4,
    };
    const a = terrainHeight(
      args.type,
      args.v,
      args.amplitude,
      args.sharpness,
      args.offset,
      args.period,
      args.persistence,
      args.lacunarity,
      args.octaves
    );
    const b = terrainHeight(
      args.type,
      args.v,
      args.amplitude,
      args.sharpness,
      args.offset,
      args.period,
      args.persistence,
      args.lacunarity,
      args.octaves
    );
    expect(Number.isFinite(a)).toBe(true);
    expect(a).toBe(b);
  });

  it('varies with amplitude and type', () => {
    const base = terrainHeight(2, { x: 0.5, y: 0.7, z: 0.9 }, 1.0, 1.0, 0, 0.6, 0.5, 1.8, 3);
    const higher = terrainHeight(2, { x: 0.5, y: 0.7, z: 0.9 }, 2.0, 1.0, 0, 0.6, 0.5, 1.8, 3);
    const otherType = terrainHeight(1, { x: 0.5, y: 0.7, z: 0.9 }, 1.0, 1.0, 0, 0.6, 0.5, 1.8, 3);
    expect(higher).not.toBe(base);
    expect(otherType).not.toBe(base);
  });
});
