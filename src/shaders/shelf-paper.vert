precision highp float;
attribute vec2 point;
uniform vec2 resolution;
uniform vec2 paperSize;
uniform vec2 pointer;
uniform vec2 velocity;
uniform float turn;
uniform float direction;
varying vec2 uv;
varying float shade;

void main() {
  uv = point;
  vec2 local = (point - .5) * paperSize;
  float sweep = sin(turn * 3.14159265);
  float arch = sin(point.x * 3.14159265);
  float ripple = sin(point.x * 5.0 + point.y * 2.5 - turn * 4.0);
  vec2 drift = clamp(velocity, vec2(-1.0), vec2(1.0));
  float saddle = sin(point.y * 3.14159265) * (point.x - .5);
  float z = arch * paperSize.x * (.065 + pointer.x * .11)
    + saddle * paperSize.x * (.045 + pointer.y * .055)
    + ripple * paperSize.x * (drift.x * .035 + drift.y * .025)
    + arch * sweep * paperSize.x * .21 * direction;
  local.y += sin(point.x * 3.14159265 + point.y * 1.8) * paperSize.y
    * (.016 + pointer.y * .075 + sweep * .06);
  float rx = -.065 - pointer.y * .28;
  float ry = -.07 + pointer.x * .32 + sweep * .24 * direction;
  vec3 p = vec3(local, z);
  p = vec3(p.x, p.y * cos(rx) - p.z * sin(rx), p.y * sin(rx) + p.z * cos(rx));
  p = vec3(p.x * cos(ry) + p.z * sin(ry), p.y, -p.x * sin(ry) + p.z * cos(ry));
  float rz = -.075 + pointer.x * .10 + pointer.y * .025 + sweep * .06 * direction;
  p.xy = mat2(cos(rz), sin(rz), -sin(rz), cos(rz)) * p.xy;
  p.xy /= 1.0 - p.z / max(resolution.x * 1.8, 900.0);
  p.xy += pointer * resolution * .032;
  p.y += sweep * paperSize.y * .045;
  // Gentle shading only darkens the paper; it never adds light to the page.
  shade = 1.0 - abs(z) / max(paperSize.x, 1.0) * .34;
  gl_Position = vec4(p.xy / resolution * 2.0, 0.0, 1.0);
}
