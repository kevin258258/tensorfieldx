precision highp float;
uniform sampler2D previousImage;
uniform sampler2D nextImage;
uniform vec2 paperSize;
uniform float turn;
uniform float direction;
varying vec2 uv;
varying float shade;

// A soft focus wash bridges covers, including entries sharing the default photo.
vec4 softImage(sampler2D image, vec2 point, float radius) {
  if (radius < .0001) return texture2D(image, point);
  vec2 r = vec2(radius, radius * paperSize.x / paperSize.y);
  vec4 color = texture2D(image, point) * .28;
  color += texture2D(image, clamp(point + vec2(r.x, 0.0), 0.0, 1.0)) * .12;
  color += texture2D(image, clamp(point - vec2(r.x, 0.0), 0.0, 1.0)) * .12;
  color += texture2D(image, clamp(point + vec2(0.0, r.y), 0.0, 1.0)) * .12;
  color += texture2D(image, clamp(point - vec2(0.0, r.y), 0.0, 1.0)) * .12;
  color += texture2D(image, clamp(point + r, 0.0, 1.0)) * .06;
  color += texture2D(image, clamp(point - r, 0.0, 1.0)) * .06;
  color += texture2D(image, clamp(point + vec2(r.x, -r.y), 0.0, 1.0)) * .06;
  color += texture2D(image, clamp(point + vec2(-r.x, r.y), 0.0, 1.0)) * .06;
  return color;
}

void main() {
  vec2 imageUV = clamp((uv - .006) / .988, 0.0, 1.0);
  float sweep = sin(turn * 3.14159265);
  float along = direction > 0.0 ? uv.x : 1.0 - uv.x;
  float radius = sweep * sweep * .034;
  vec4 previous = softImage(previousImage, imageUV, radius);
  vec4 next = softImage(nextImage, imageUV, radius);
  float reveal = smoothstep(.08, .92, turn);
  vec3 color = mix(previous.rgb, next.rgb, reveal);
  float cloud = .5 + .5 * sin(along * 4.0 + uv.y * 3.0 - turn * 5.0);
  vec3 wash = mix(vec3(.64, .77, .78), vec3(.74, .76, .87), cloud);
  wash = mix(wash, vec3(.80, .82, .69), smoothstep(.6, 1.0, along + uv.y * .2));
  color = mix(color, wash, sweep * .48);
  float margin = min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y));
  vec3 paper = vec3(.956, .944, .919);
  color = mix(paper, color, smoothstep(.003, .008, margin));
  float edgeShade = exp(-margin * 120.0) * .018;
  color *= clamp(shade - edgeShade - sweep * .025, .87, 1.0);
  float alpha = smoothstep(0.0, 1.25 / min(paperSize.x, paperSize.y), margin);
  // Keep the same Apple-safe premultiplied canvas contract as page transitions.
  gl_FragColor = vec4(color * alpha, alpha);
}
