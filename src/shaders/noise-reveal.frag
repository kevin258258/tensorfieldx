precision highp float;
varying vec2 uv;
uniform sampler2D visual;
uniform sampler2D noise;
uniform vec2 resolution;
uniform vec2 crop;
uniform vec2 center;
uniform vec3 ink;
uniform float progress;
uniform float ease;
uniform float reach;

void main() {
  vec4 image = texture2D(visual, (1.0 - crop) * .5 + uv * crop);
  float grain = texture2D(noise, gl_FragCoord.xy / resolution.x * .6).r;
  // Each noise value delays a pixel by up to 20% of the animation.
  float phase = clamp((progress - grain * .2) / .8, 0.0, 1.0);
  float sineOut = sin(phase * 1.57079632679);
  float sineIn = 1.0 - cos(phase * 1.57079632679);
  phase = mix(sineOut, sineIn, ease);
  float radius = max(reach * phase, .0001);
  float edge = (radius - distance(gl_FragCoord.xy, center) * (1.0 + grain * .8)) / radius;
  float cover = (1.0 - smoothstep(0.0, .7, edge)) * (1.0 - smoothstep(.5, 1.0, phase));
  gl_FragColor = vec4(mix(image.rgb, ink, cover), image.a * (1.0 - cover));
}
