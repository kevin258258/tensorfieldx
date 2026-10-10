import vertexSource from '../shaders/noise-reveal.vert?raw';
import fragmentSource from '../shaders/noise-reveal.frag?raw';

let noiseImage: Promise<HTMLImageElement> | undefined;
function loadNoise() {
  return noiseImage ??= new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => { noiseImage = undefined; reject(new Error('Reveal texture unavailable')); };
    image.src = '/design/kazuki/reveal-noise.webp';
  });
}

class NoiseReveal {
  private gl: WebGLRenderingContext;
  private program: WebGLProgram;
  private buffer: WebGLBuffer;
  private textures: WebGLTexture[] = [];
  private uniforms: Record<string, WebGLUniformLocation | null> = {};
  private resizeObserver: ResizeObserver;
  private paletteObserver: MutationObserver;
  private frame = 0;
  private progress = 0;
  private ease = 1;
  private center = [.5, .5];
  private animating = false;

  constructor(private canvas: HTMLCanvasElement, private image: HTMLImageElement, noise: HTMLImageElement, signal: AbortSignal) {
    const gl = canvas.getContext('webgl', { alpha: true, antialias: false, premultipliedAlpha: true });
    if (!gl) throw new Error('WebGL unavailable');
    this.gl = gl;
    const compile = (kind: number, source: string) => {
      const shader = gl.createShader(kind);
      if (!shader) throw new Error('Unable to allocate shader');
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const error = gl.getShaderInfoLog(shader);
        gl.deleteShader(shader);
        throw new Error(error || 'Shader compilation failed');
      }
      return shader;
    };
    const vertex = compile(gl.VERTEX_SHADER, vertexSource);
    const fragment = compile(gl.FRAGMENT_SHADER, fragmentSource);
    const program = gl.createProgram();
    if (!program) throw new Error('Unable to allocate program');
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) || 'Shader link failed');
    this.program = program;
    gl.useProgram(program);
    const buffer = gl.createBuffer();
    if (!buffer) throw new Error('Unable to allocate geometry');
    this.buffer = buffer;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    ['visual', 'noise', 'resolution', 'crop', 'center', 'ink', 'progress', 'ease', 'reach'].forEach(name => {
      this.uniforms[name] = gl.getUniformLocation(program, name);
    });
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    [image, noise].forEach((source, unit) => {
      const texture = gl.createTexture();
      if (!texture) throw new Error('Unable to allocate texture');
      this.textures.push(texture);
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
      gl.uniform1i(this.uniforms[unit ? 'noise' : 'visual'], unit);
    });
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas);
    this.paletteObserver = new MutationObserver(() => this.updateInk());
    this.paletteObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-palette'] });
    this.resize();
    this.updateInk();
    signal.addEventListener('abort', () => this.dispose(), { once: true });
  }

  setCenter(x: number, y: number) {
    if (this.animating) return;
    this.center = [x, 1 - y];
    this.draw();
  }

  transition(visible: boolean) {
    cancelAnimationFrame(this.frame);
    const started = performance.now();
    const from = this.progress;
    const fromEase = this.ease;
    const target = visible ? 1 : 0;
    const duration = visible ? 800 : 600;
    this.animating = true;
    const tick = (now: number) => {
      const fraction = Math.min(1, (now - started) / duration);
      this.progress = from + (target - from) * fraction;
      this.ease = fromEase + (target - fromEase) * fraction;
      this.draw();
      if (fraction < 1) this.frame = requestAnimationFrame(tick);
      else { this.animating = false; this.ease = visible ? 0 : 1; }
    };
    this.frame = requestAnimationFrame(tick);
  }

  private resize() {
    const box = this.canvas.getBoundingClientRect();
    const dpr = Math.min(devicePixelRatio || 1, 2);
    this.canvas.width = Math.max(1, Math.round(box.width * dpr));
    this.canvas.height = Math.max(1, Math.round(box.height * dpr));
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    const viewAspect = this.canvas.width / this.canvas.height;
    const imageAspect = this.image.naturalWidth / this.image.naturalHeight;
    this.gl.uniform2f(this.uniforms.crop, Math.min(1, viewAspect / imageAspect), Math.min(1, imageAspect / viewAspect));
    this.draw();
  }

  private updateInk() {
    const ink = getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim().split(/\s+/).map(Number);
    this.gl.uniform3f(this.uniforms.ink, ink[0] / 255, ink[1] / 255, ink[2] / 255);
    this.draw();
  }

  private draw() {
    const { gl, canvas, uniforms } = this;
    const x = this.center[0] * canvas.width;
    const y = this.center[1] * canvas.height;
    const reach = 1.8 * Math.max(Math.hypot(x, y), Math.hypot(canvas.width - x, y), Math.hypot(x, canvas.height - y), Math.hypot(canvas.width - x, canvas.height - y));
    gl.uniform2f(uniforms.resolution, canvas.width, canvas.height);
    gl.uniform2f(uniforms.center, x, y);
    gl.uniform1f(uniforms.reach, reach);
    gl.uniform1f(uniforms.progress, this.progress);
    gl.uniform1f(uniforms.ease, this.ease);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  private dispose() {
    cancelAnimationFrame(this.frame);
    this.resizeObserver.disconnect();
    this.paletteObserver.disconnect();
    this.textures.forEach(texture => this.gl.deleteTexture(texture));
    this.gl.deleteBuffer(this.buffer);
    this.gl.deleteProgram(this.program);
    this.gl.getExtension('WEBGL_lose_context')?.loseContext();
  }
}

export function initNoiseReveals(signal: AbortSignal) {
  document.querySelectorAll<HTMLElement>('.featured-entry-preview, .archive-entry-preview').forEach(preview => {
    const image = preview.querySelector<HTMLImageElement>('img');
    const host = preview.parentElement;
    if (!image || !host) return;
    let reveal: NoiseReveal | undefined;
    let preparing = false;
    let visible = false;
    let center = [.5, .5];
    const prepare = async () => {
      if (preparing || reveal) return;
      preparing = true;
      const canvas = document.createElement('canvas');
      canvas.className = 'noise-reveal-canvas';
      try {
        const [noise] = await Promise.all([loadNoise(), image.decode()]);
        if (signal.aborted) return;
        preview.append(canvas);
        reveal = new NoiseReveal(canvas, image, noise, signal);
        preview.classList.add('is-noise-ready');
        signal.addEventListener('abort', () => {
          preview.classList.remove('is-noise-ready');
          canvas.remove();
        }, { once: true });
        reveal.setCenter(center[0], center[1]);
        if (visible) reveal.transition(true);
      } catch {
        canvas.getContext('webgl')?.getExtension('WEBGL_lose_context')?.loseContext();
        canvas.remove();
        // The static image hover remains usable when graphics are unavailable.
      }
    };
    const position = (event: PointerEvent) => {
      const box = host.getBoundingClientRect();
      center = [(event.clientX - box.left) / box.width, (event.clientY - box.top) / box.height];
      reveal?.setCenter(center[0], center[1]);
    };
    host.addEventListener('pointerenter', event => {
      visible = true;
      position(event);
      if (reveal) reveal.transition(true);
      else void prepare();
    }, { signal });
    host.addEventListener('pointermove', position, { signal });
    host.addEventListener('pointerleave', () => { visible = false; reveal?.transition(false); }, { signal });
  });
}
