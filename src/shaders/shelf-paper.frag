precision highp float;
uniform sampler2D previousImage;
uniform sampler2D nextImage;
uniform vec2 paperSize;
uniform float turn;
uniform float direction;
varying vec2 uv;
varying float shade;

void main() {
  vec2 imageUV = clamp((uv - .008) / .984, 0.0, 1.0);
  vec4 previous = texture2D(previousImage, imageUV);
  vec4 next = texture2D(nextImage, imageUV);
  float along = direction > 0.0 ? uv.x : 1.0 - uv.x;
  float edge = along + sin(uv.y * 5.0) * .035;
  float reveal = smoothstep(edge - .12, edge + .12, turn * 1.32 - .16);
  vec4 image = mix(previous, next, reveal);
  float margin = min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y));
  vec3 paper = vec3(.956, .944, .919);
  vec3 color = mix(paper, image.rgb, smoothstep(.006, .01, margin));
  float crease = sin(turn * 3.14159265) * exp(-pow((edge - (turn * 1.32 - .16)) * 9.0, 2.0));
  color *= clamp(shade - crease * .065, .88, 1.0);
  float alpha = smoothstep(0.0, 1.25 / min(paperSize.x, paperSize.y), margin);
  // Match the premultiplied canvas contract used by the page cover.
  gl_FragColor = vec4(color * alpha, alpha);
}
