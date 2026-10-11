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
  float z = arch * paperSize.x * (.038 + pointer.x * .07)
    + ripple * paperSize.x * (drift.x * .02 + drift.y * .014)
    + arch * sweep * paperSize.x * .15 * direction;
  local.y += sin(point.x * 3.14159265 + point.y * 1.8) * paperSize.y
    * (pointer.y * .05 + sweep * .045);
  float rx = -.025 - pointer.y * .2;
  float ry = pointer.x * .24 + sweep * .16 * direction;
  vec3 p = vec3(local, z);
  p = vec3(p.x, p.y * cos(rx) - p.z * sin(rx), p.y * sin(rx) + p.z * cos(rx));
  p = vec3(p.x * cos(ry) + p.z * sin(ry), p.y, -p.x * sin(ry) + p.z * cos(ry));
  float rz = -.055 + pointer.x * .065 + sweep * .045 * direction;
  p.xy = mat2(cos(rz), sin(rz), -sin(rz), cos(rz)) * p.xy;
  p.xy /= 1.0 - p.z / max(resolution.x * 1.8, 900.0);
  p.xy += pointer * resolution * .025;
  // Gentle shading only darkens the paper; it never adds light to the page.
  shade = 1.0 - abs(z) / max(paperSize.x, 1.0) * .28;
  gl_Position = vec4(p.xy / resolution * 2.0, 0.0, 1.0);
}
