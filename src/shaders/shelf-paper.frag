precision highp float;
uniform sampler2D previousImage;
uniform sampler2D nextImage;
uniform vec2 paperSize;
uniform vec2 imageScale;
uniform vec3 ink;
uniform float turn;
uniform float direction;
varying vec2 uv;
varying float shade;

// A soft focus wash bridges covers, including entries sharing the default photo.
vec4 softImage(sampler2D image, vec2 point, float blur) {
  if (blur < .0001) return texture2D(image, point);
  #ifdef PAPER_EXPLICIT_LOD
  return texture2DLodEXT(image, point, blur + 1.0);
  #else
  return texture2D(image, point, blur);
  #endif
}

void main() {
  vec2 imageUV = clamp((uv - .5) * imageScale + .5, 0.0, 1.0);
  float sweep = pow(max(0.0, sin(turn * 3.14159265)), .75);
  float along = direction > 0.0 ? uv.x : 1.0 - uv.x;
  float blur = sweep * sweep * 5.5;
  vec4 previous = softImage(previousImage, imageUV, blur);
  vec4 next = softImage(nextImage, imageUV, blur);
  float reveal = smoothstep(.3, .75, turn);
  vec3 color = mix(previous.rgb, next.rgb, reveal);
  vec3 paper = vec3(.956, .944, .919);
  float tint = smoothstep(.2, .4, dot(ink, vec3(.2126, .7152, .0722)));
  color = mix(mix(color, paper, .025 + tint * .12), ink, tint * .16);
  float cloud = .5 + .5 * sin(along * 4.0 + uv.y * 3.0 - turn * 5.0);
  vec3 wash = mix(vec3(.64, .77, .78), vec3(.74, .76, .87), cloud);
  wash = mix(wash, vec3(.80, .82, .69), smoothstep(.6, 1.0, along + uv.y * .2));
  color = mix(color, wash, sweep * .82);
  float margin = min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y));
  color = mix(paper, color, smoothstep(.001, .003, margin));
  float edgeShade = exp(-margin * 120.0) * .018;
  color *= clamp(shade - edgeShade - sweep * .025, .87, 1.0);
  float alpha = smoothstep(0.0, 1.25 / min(paperSize.x, paperSize.y), margin);
  // Keep the same Apple-safe premultiplied canvas contract as page transitions.
  gl_FragColor = vec4(color * alpha, alpha);
}
