precision highp float;
uniform sampler2D paper;
uniform sampler2D grain;
uniform sampler2D noise;
uniform vec2 resolution;
uniform vec2 tileSize;
uniform vec2 grainOffset;
uniform vec2 center;
uniform float progress;
uniform float ease;
uniform float reach;
uniform vec3 ink;

void main() {
  vec2 uv = gl_FragCoord.xy / resolution;
  uv.y = 1.0 - uv.y;
  vec2 paperUV = mod(uv * tileSize / 500.0, 1.0);
  paperUV.y = 1.0 - paperUV.y;
  vec4 paperColor = texture2D(paper, paperUV);
  vec2 grainUV = mod(grainOffset + uv * tileSize / 250.0, 1.0);
  grainUV.y = 1.0 - grainUV.y;
  vec4 grainColor = texture2D(grain, grainUV);
  float noiseValue = texture2D(noise, gl_FragCoord.xy / max(resolution.x, resolution.y) * 1.2).r;
  float phase = clamp((1.0 - progress - noiseValue * 0.1) / 0.9, 0.0, 1.0);
  float sineInOut = -0.5 * (cos(3.14159265359 * phase) - 1.0);
  float sineIn = sin((phase - 1.0) * 1.57079632679) + 1.0;
  phase = mix(sineInOut, sineIn, ease);
  float radius = reach * phase;
  float edge = (radius - distance(gl_FragCoord.xy, center) * (1.0 + noiseValue * 0.8)) / max(radius, 0.0001);
  float alpha = 1.0 - smoothstep(0.0, 0.7, edge);
  vec3 color = mix(mix(paperColor.rgb, ink, 1.0 - alpha), grainColor.rgb, grainColor.a);
  gl_FragColor = vec4(color, alpha * (1.0 - smoothstep(0.8, 1.0, phase)));
}
