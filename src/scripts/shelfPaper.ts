import vertexSource from '../shaders/shelf-paper.vert?raw';
import fragmentSource from '../shaders/shelf-paper.frag?raw';

/** A deformable paper preview. Rendering stops when its spring has settled. */
export function createShelfPaper(host: HTMLElement, sources: string[], signal: AbortSignal) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const enabled = () => !reduced.matches && !document.hidden;
  const canvas = document.createElement('canvas');
  canvas.className = 'shelf-paper-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  let gl: WebGLRenderingContext | null = null;
  let program: WebGLProgram | null = null;
  let geometry: WebGLBuffer | null = null;
  let textures: WebGLTexture[] = [];
  let images: HTMLImageElement[] = [];
  const uniforms: Record<string, WebGLUniformLocation | null> = {};
  let selected = 0, previous = 0, turn = 1, direction = 1;
  let x = 0, y = 0, dx = 0, dy = 0, targetX = 0, targetY = 0;
  let frame = 0, last = 0, vertices = 0;
  let preparing = false, failed = false, visible = host.getBoundingClientRect().width > 0;
  let ink = [125 / 255, 151 / 255, 184 / 255];
  const updateInk = () => {
    const color = getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim().split(/\s+/).map(Number);
    if (color.length === 3 && color.every(Number.isFinite)) ink = color.map(channel => channel / 255);
    if (gl) draw();
  };
  const stop = () => { cancelAnimationFrame(frame); frame = 0; last = 0; };
  const wake = () => {
    if (!frame && gl && enabled() && visible && !signal.aborted) frame = requestAnimationFrame(tick);
  };
  function resize() {
    if (!gl || !images[selected] || !enabled() || !visible) return;
    const box = host.getBoundingClientRect();
    if (!box.width || !box.height) return;
    // The shared covers are small; extra retina pixels cost more than they add.
    const ratio = Math.min(devicePixelRatio || 1, fine.matches ? 1.5 : 1, 1400 / Math.max(box.width, box.height));
    canvas.width = Math.max(1, Math.round(box.width * ratio));
    canvas.height = Math.max(1, Math.round(box.height * ratio));
    gl.viewport(0, 0, canvas.width, canvas.height);
    draw();
  }
  function draw() {
    if (!gl || !images[selected]) return;
    const image = images[selected];
    const imageAspect = image.naturalWidth / image.naturalHeight;
    const aspect = Math.max(imageAspect, 1.6);
    // Leave room around the mesh for the bent corners and tilted projection.
    const width = Math.min(canvas.width * .94, canvas.height * .84 * aspect);
    const height = width / aspect;
    gl.useProgram(program);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    for (const [unit, index] of [previous, selected].entries()) {
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, textures[index]);
    }
    gl.uniform2f(uniforms.resolution, canvas.width, canvas.height);
    gl.uniform2f(uniforms.paperSize, width, height);
    gl.uniform2f(uniforms.imageScale, Math.min(1, aspect / imageAspect), Math.min(1, imageAspect / aspect));
    gl.uniform3f(uniforms.ink, ink[0], ink[1], ink[2]);
    gl.uniform2f(uniforms.pointer, x, y);
    gl.uniform2f(uniforms.velocity, dx, dy);
    gl.uniform1f(uniforms.turn, turn);
    gl.uniform1f(uniforms.direction, direction);
    gl.drawArrays(gl.TRIANGLES, 0, vertices);
    host.style.setProperty('--paper-width', `${width / canvas.width * 100}%`);
    host.style.setProperty('--paper-height', `${height / canvas.height * 100}%`);
    host.style.setProperty('--paper-shadow-x', `${-24 - x * 24}px`);
    host.style.setProperty('--paper-shadow-y', `${20 + y * 18}px`);
    host.style.setProperty('--paper-shadow-angle', `${-5 - x * 5}deg`);
    host.style.setProperty('--paper-shadow-opacity', `${.74 - Math.sin(turn * Math.PI) * .14}`);
  }
  function tick(now: number) {
    frame = 0;
    if (!enabled() || !visible || !gl || signal.aborted) { stop(); return; }
    const dt = Math.min((now - (last || now - 16)) / 1000, .032);
    last = now;
    // A damped spring gives the corners a small lag, without rigid cursor locking.
    dx += ((targetX - x) * 76 - dx * 15) * dt;
    dy += ((targetY - y) * 76 - dy * 15) * dt;
    x += dx * dt; y += dy * dt;
    turn = Math.min(1, turn + dt / 1.1);
    draw();
    if (turn < 1 || Math.abs(targetX - x) + Math.abs(targetY - y) + Math.abs(dx) + Math.abs(dy) > .002) {
      host.dataset.paperState = turn < 1 ? 'turning' : 'moving';
      wake();
    } else {
      x = targetX; y = targetY; dx = dy = 0; last = 0;
      draw(); host.dataset.paperState = 'idle';
    }
  }
  const sync = (entrance = false) => {
    if (!enabled() || !visible) {
      stop(); host.classList.remove('is-paper-ready'); host.dataset.paperState = 'static';
    } else if (gl) {
      turn = entrance ? .3 : 1; x = y = dx = dy = targetX = targetY = 0;
      host.classList.add('is-paper-ready'); resize(); wake();
    } else void prepare();
  };
  async function prepare() {
    if (preparing || failed || !sources.length || !enabled() || !visible) return;
    preparing = true;
    try {
      const cache = new Map<string, Promise<HTMLImageElement>>();
      images = await Promise.all(sources.map(src => {
        if (!cache.has(src)) cache.set(src, new Promise((resolve, reject) => {
          const image = new Image();
          image.onload = () => resolve(image); image.onerror = reject; image.src = src;
        }));
        return cache.get(src)!;
      }));
      if (signal.aborted || !enabled() || !visible) return;
      gl = canvas.getContext('webgl', { alpha: true, antialias: true, premultipliedAlpha: true });
      if (!gl) throw new Error('Paper graphics unavailable');
      const compile = (type: number, source: string) => {
        const shader = gl!.createShader(type)!;
        gl!.shaderSource(shader, source); gl!.compileShader(shader);
        if (!gl!.getShaderParameter(shader, gl!.COMPILE_STATUS)) {
          gl!.deleteShader(shader); throw new Error('Paper shader unavailable');
        }
        return shader;
      };
      const vertex = compile(gl.VERTEX_SHADER, vertexSource);
      const lod = gl.getExtension('EXT_shader_texture_lod')
        ? '#extension GL_EXT_shader_texture_lod : enable\n#define PAPER_EXPLICIT_LOD\n' : '';
      const fragment = compile(gl.FRAGMENT_SHADER, lod + fragmentSource);
      program = gl.createProgram()!;
      gl.attachShader(program, vertex); gl.attachShader(program, fragment); gl.linkProgram(program);
      gl.deleteShader(vertex); gl.deleteShader(fragment);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Paper shader unavailable');
      gl.useProgram(program);
      const points: number[] = [];
      for (let row = 0; row < 20; row++) for (let col = 0; col < 28; col++) {
        const a = col / 28, b = row / 20, c = (col + 1) / 28, d = (row + 1) / 20;
        points.push(a,b,c,b,a,d,a,d,c,b,c,d);
      }
      vertices = points.length / 2;
      geometry = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, geometry);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(points), gl.STATIC_DRAW);
      const point = gl.getAttribLocation(program, 'point');
      gl.enableVertexAttribArray(point); gl.vertexAttribPointer(point, 2, gl.FLOAT, false, 0, 0);
      ['resolution','paperSize','imageScale','ink','pointer','velocity','turn','direction','previousImage','nextImage'].forEach(name => uniforms[name] = gl!.getUniformLocation(program!, name));
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      const textureCache = new Map<HTMLImageElement, WebGLTexture>();
      textures = images.map(image => {
        if (textureCache.has(image)) return textureCache.get(image)!;
        const texture = gl!.createTexture()!;
        gl!.bindTexture(gl!.TEXTURE_2D, texture);
        // Mip levels give a continuous soft-focus transition with two texture reads,
        // rather than widely spaced blur taps or a full-frame CSS blur.
        const bitmap = document.createElement('canvas');
        const powerOfTwo = (size: number) => Math.min(1024, 2 ** Math.ceil(Math.log2(size)));
        bitmap.width = powerOfTwo(image.naturalWidth); bitmap.height = powerOfTwo(image.naturalHeight);
        const context = bitmap.getContext('2d');
        if (!context) throw new Error('Paper image unavailable');
        context.drawImage(image, 0, 0, bitmap.width, bitmap.height);
        gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_S, gl!.CLAMP_TO_EDGE);
        gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_T, gl!.CLAMP_TO_EDGE);
        gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MIN_FILTER, gl!.LINEAR_MIPMAP_LINEAR);
        gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MAG_FILTER, gl!.LINEAR);
        gl!.texImage2D(gl!.TEXTURE_2D, 0, gl!.RGBA, gl!.RGBA, gl!.UNSIGNED_BYTE, bitmap);
        gl!.generateMipmap(gl!.TEXTURE_2D);
        bitmap.width = bitmap.height = 1;
        textureCache.set(image, texture); return texture;
      });
      gl.uniform1i(uniforms.previousImage, 0); gl.uniform1i(uniforms.nextImage, 1);
      host.append(canvas);
      canvas.addEventListener('webglcontextlost', event => {
        event.preventDefault(); stop(); gl = null; failed = true;
        host.classList.remove('is-paper-ready'); canvas.remove();
      }, { signal });
      updateInk(); sync(true);
    } catch {
      failed = true; stop(); host.classList.remove('is-paper-ready');
      gl?.getExtension('WEBGL_lose_context')?.loseContext(); gl = null;
    }
    finally { preparing = false; }
  }
  const resizeObserver = new ResizeObserver(resize); resizeObserver.observe(host);
  const observer = new IntersectionObserver(entries => {
    const entry = entries.find(entry => entry.target === host);
    if (!entry) return;
    visible = entry.isIntersecting;
    if (visible && enabled()) {
      if (gl) { host.classList.add('is-paper-ready'); resize(); wake(); }
      else void prepare();
    } else stop();
  });
  observer.observe(host);
  reduced.addEventListener('change', () => sync(), { signal });
  document.addEventListener('visibilitychange', () => sync(), { signal });
  document.addEventListener('reference:palette', updateInk, { signal });
  signal.addEventListener('abort', () => {
    stop(); resizeObserver.disconnect(); observer.disconnect();
    host.classList.remove('is-paper-ready'); canvas.remove();
    if (gl) {
      [...new Set(textures)].forEach(texture => gl!.deleteTexture(texture));
      gl.deleteBuffer(geometry); gl.deleteProgram(program);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    }
    gl = null;
  }, { once: true });
  void prepare();
  return {
    // One renderer follows the visible mobile cover instead of allocating a
    // WebGL context and image textures for every article in the scrolling list.
    mount(next: HTMLElement) {
      if (next === host || signal.aborted) return;
      stop();
      host.classList.remove('is-paper-ready'); host.dataset.paperState = 'static';
      resizeObserver.unobserve(host); observer.unobserve(host);
      host = next;
      visible = host.getBoundingClientRect().width > 0;
      if (gl) host.append(canvas);
      resizeObserver.observe(host); observer.observe(host);
      sync();
    },
    select(index: number) {
      if (selected === index || index < 0 || index >= sources.length) return;
      previous = selected; direction = index > selected ? 1 : -1; selected = index;
      turn = enabled() ? 0 : 1;
      wake();
    },
    position(px: number, py: number) {
      targetX = Math.max(-1, Math.min(1, px)); targetY = Math.max(-1, Math.min(1, py)); wake();
    },
    reset() { targetX = targetY = 0; wake(); },
  };
}
