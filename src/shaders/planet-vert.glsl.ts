import _noise from './noise.glsl';
export const planetVertexGLSL = `
// If geometry doesn't provide tangents, compute a simple fallback tangent from the normal
uniform int type;
uniform float radius;
uniform float amplitude;
uniform float displacementScale;
uniform float displacementBias;
uniform float sharpness;
uniform float offset;
uniform float period;
uniform float persistence;
uniform float lacunarity;
uniform int octaves;
uniform float bumpStrength;
uniform float bumpOffset;

varying vec3 fragPosition;
varying vec3 fragNormal;
varying vec3 fragTangent;
varying vec3 fragBitangent;

void main() {
  float h = terrainHeight(type, position, amplitude, sharpness, offset, period, persistence, lacunarity, octaves);
  // Apply a local-space displacement scale and bias so we can cap mountain heights
  float h_s = h * displacementScale + displacementBias;
  vec3 pos = position * (radius + h_s);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  fragPosition = position;
  fragNormal = normal;
  // Fallback tangent derived from the normal to avoid requiring attribute tangents
  fragTangent = normalize(vec3(normal.y, -normal.x, 0.0));
  fragBitangent = cross(normal, fragTangent);
}
`;

export default planetVertexGLSL;
