import _noise from './noise.glsl';
export const planetFragmentGLSL = `
uniform int type;
uniform float radius;
uniform float amplitude;
uniform float sharpness;
uniform float offset;
uniform float period;
uniform float persistence;
uniform float lacunarity;
uniform int octaves;
// Matrices provided by the renderer (declare explicitly for fragment shader)
uniform mat4 modelMatrix;
uniform mat3 normalMatrix;
uniform float displacementScale;
uniform float displacementBias;
uniform int outputMode; // 0=color (default), 1=height (outputs normalized height in R)
uniform float seaLevel;

uniform vec3 color1;
uniform vec3 color2;
uniform vec3 color3;
uniform vec3 color4;
uniform vec3 color5;
uniform float transition2;
uniform float transition3;
uniform float transition4;
uniform float transition5;
uniform float blend12;
uniform float blend23;
uniform float blend34;
uniform float blend45;

uniform float bumpStrength;
uniform float bumpOffset;

uniform float ambientIntensity;
uniform float diffuseIntensity;
uniform float specularIntensity;
uniform float shininess;
uniform vec3 lightDirection;
uniform vec3 lightColor;

varying vec3 fragPosition;
varying vec3 fragNormal;
varying vec3 fragTangent;
varying vec3 fragBitangent;

void main() {
  // Compute raw terrain heights for shading/thresholds
  float h_raw = terrainHeight(type, fragPosition, amplitude, sharpness, offset, period, persistence, lacunarity, octaves);
  vec3 dx = bumpOffset * fragTangent;
  float h_dx_raw = terrainHeight(type, fragPosition + dx, amplitude, sharpness, offset, period, persistence, lacunarity, octaves);
  vec3 dy = bumpOffset * fragBitangent;
  float h_dy_raw = terrainHeight(type, fragPosition + dy, amplitude, sharpness, offset, period, persistence, lacunarity, octaves);

  // Use a scaled/safe displacement for positional/bump calculations while keeping the raw
  // heights for displacement. We'll compute an adjusted height for color thresholds
  // that mirrors the CPU-side reshaping (sea level, min lift/depth), so visuals and
  // click-classification match.
  float h_s = h_raw * displacementScale + displacementBias;
  float h_dx_s = h_dx_raw * displacementScale + displacementBias;
  float h_dy_s = h_dy_raw * displacementScale + displacementBias;

  // CPU-matching reshaping parameters
  const float minLandLift = 0.14;
  const float minOceanDepth = 0.12;
  float landDen = max(1e-4, 1.0 - seaLevel);
  float oceanDen = max(1e-4, seaLevel);
  float h_adj;
  if (h_raw >= seaLevel) {
    float landNorm = clamp((h_raw - seaLevel) / landDen, 0.0, 1.0);
    float curved = pow(landNorm, 0.8);
    float lifted = minLandLift + (1.0 - minLandLift) * curved;
    h_adj = seaLevel + lifted * landDen;
  } else {
    float oceanNorm = clamp((seaLevel - h_raw) / oceanDen, 0.0, 1.0);
    float curved = pow(oceanNorm, 1.15);
    float depth = minOceanDepth + (1.0 - minOceanDepth) * curved;
    h_adj = seaLevel - depth * oceanDen;
  }
  h_adj = clamp(h_adj, 0.0, 1.0);
  // Use reshaped height for palette thresholds and lighting
  float h = h_adj;

  // Compute world-space positions for bump normal and lighting. We compute local-space
  // displaced positions then transform with the model matrix to world space so they
  // align with cameraPosition and lightDirection (both in world space).
  vec3 pos_local = fragPosition * (radius + h_s);
  vec3 pos_dx_local = (fragPosition + dx) * (radius + h_dx_s);
  vec3 pos_dy_local = (fragPosition + dy) * (radius + h_dy_s);
  vec3 pos = (modelMatrix * vec4(pos_local, 1.0)).xyz;
  vec3 pos_dx = (modelMatrix * vec4(pos_dx_local, 1.0)).xyz;
  vec3 pos_dy = (modelMatrix * vec4(pos_dy_local, 1.0)).xyz;

  // Bump normal computed from world-space displaced positions
  vec3 bumpNormal = normalize(cross(pos_dx - pos, pos_dy - pos));

  // Transform base normal into world-space using the normal matrix, then blend with bumpNormal
  vec3 baseNormalWorld = normalize((normalMatrix * fragNormal));
  vec3 N = normalize(mix(baseNormalWorld, bumpNormal, bumpStrength));
  vec3 L = normalize(-lightDirection);
  vec3 V = normalize(cameraPosition - pos);
  vec3 R = normalize(reflect(L, N));
  float diffuse = diffuseIntensity * max(0.0, dot(N, -L));
  float specularFalloff = clamp((transition3 - h) / transition3, 0.0, 1.0);
  float specular = max(0.0, specularFalloff * specularIntensity * pow(dot(V, R), shininess));
  float light = ambientIntensity + diffuse + specular;

  vec3 color12 = mix(color1, color2, smoothstep(transition2 - blend12, transition2 + blend12, h));
  vec3 color123 = mix(color12, color3, smoothstep(transition3 - blend23, transition3 + blend23, h));
  vec3 color1234 = mix(color123, color4, smoothstep(transition4 - blend34, transition4 + blend34, h));
  vec3 finalColor = mix(color1234, color5, smoothstep(transition5 - blend45, transition5 + blend45, h));

  // If requested, output normalized height directly for GPU heightmap render pass
  if (outputMode == 1) {
    // Output height in the red channel as a float; other channels can be zero.
    gl_FragColor = vec4(h, 0.0, 0.0, 1.0);
    return;
  }

  gl_FragColor = vec4(light * finalColor * lightColor, 1.0);
}
`;

export default planetFragmentGLSL;
