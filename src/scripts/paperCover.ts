import vertexSource from '../shaders/noise-reveal.vert?raw';
import fragmentSource from '../shaders/paper-cover.frag?raw';

const grainPositions = [[0, 0], [10, 10], [150, 20], [125, 125], [40, 170], [125, 125], [90, 10], [60, 100], [20, 70], [120, 80], [0, 250]];
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
// Paper motion is available on touch devices as well as desktops.
export const usesPaperMotion = () => !reduced();

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Paper texture unavailable'));
    image.src = src;
  });
}

/** A single persisted cover survives every ClientRouter body swap. */
export class PaperCover {
  private canvas: HTMLCanvasElement;
  private gl?: WebGLRenderingContext;
  private uniforms: Record<string, WebGLUniformLocation | null> = {};
  private progress = 0;
  private ease = 1;
  private center = [innerWidth / 2, innerHeight / 2];
  private frame = 0;
  private finish?: () => void;
  private fallback?: Animation;
  private animating = false;
  private targetVisible = false;

  constructor(private element: HTMLElement) {
    this.canvas = element.querySelector('canvas')!;
    if (usesPaperMotion()) void this.prepare();
    window.addEventListener('resize', () => this.resize());
    document.addEventListener('astro:after-swap', () => this.updateInk());
    document.addEventListener('reference:palette', () => this.updateInk());
  }

  setCenter(x: number, y: number) {
    if (!this.animating) this.center = [x, y];
  }

  coverImmediately() {
    this.cancel();
    this.progress = 1;
    this.ease = 0;
    this.element.style.opacity = '1';
    this.draw(performance.now());
  }

  transition(visible: boolean, duration: number): Promise<void> {
    if (!usesPaperMotion()) {
      this.cancel();
      this.targetVisible = visible;
      this.progress = visible ? 1 : 0;
      this.element.style.opacity = visible ? '1' : '0';
      return Promise.resolve();
    }
    const fromOpacity = getComputedStyle(this.element).opacity;
    this.cancel();
    this.targetVisible = visible;
    this.animating = true;
    return new Promise(resolve => {
      this.finish = resolve;
      if (!this.gl) {
        // Keep the fallback brief so navigation never waits on a long fade.
        this.fallback = this.element.animate([{ opacity: fromOpacity }, { opacity: visible ? 1 : 0 }], { duration: Math.min(duration, 240), fill: 'forwards' });
        this.fallback.onfinish = () => {
          this.progress = visible ? 1 : 0;
          this.element.style.opacity = visible ? '1' : '0';
          this.fallback?.cancel();
          this.fallback = undefined;
          this.animating = false;
          this.finish = undefined;
          resolve();
        };
        return;
      }
      this.element.style.opacity = '1';
      const started = performance.now();
      const from = this.progress;
      const fromEase = this.ease;
      const target = visible ? 1 : 0;
      const tick = (now: number) => {
        const fraction = Math.min(1, (now - started) / duration);
        this.progress = from + (target - from) * fraction;
        this.ease = fromEase + (target - fromEase) * fraction;
        this.draw(now);
        if (fraction < 1) this.frame = requestAnimationFrame(tick);
        else {
          this.animating = false;
          this.ease = visible ? 0 : 1;
          this.finish = undefined;
          if (!visible) this.element.style.opacity = '0';
          else this.holdGrain();
          resolve();
        }
      };
      this.frame = requestAnimationFrame(tick);
    });
  }

  private holdGrain() {
    const tick = (now: number) => {
      this.draw(now);
      this.frame = requestAnimationFrame(tick);
    };
    this.frame = requestAnimationFrame(tick);
  }

  private cancel() {
    cancelAnimationFrame(this.frame);
    this.fallback?.cancel();
    this.fallback = undefined;
    this.animating = false;
    this.finish?.();
    this.finish = undefined;
  }

  private async prepare() {
    try {
      const images = await Promise.all(['cover-paper.jpg', 'noise.png', 'reveal-noise.webp'].map(name => loadImage(`/design/kazuki/${name}`)));
      // Never switch renderers midway through a fallback transition.
      if (this.animating || this.progress > 0) return;
      // Supply premultiplied pixels directly, including on Apple's compositor
      // (WebKit bug 200026 ignores unpremultiplied canvas contents).
      const gl = this.canvas.getContext('webgl', { alpha: true, antialias: false, premultipliedAlpha: true });
      if (!gl) return;
      this.gl = gl;
      const compile = (kind: number, source: string) => {
        const shader = gl.createShader(kind);
        if (!shader) throw new Error('Unable to allocate shader');
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
          gl.deleteShader(shader);
          throw new Error('Paper shader compilation failed');
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
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Paper shader link failed');
      gl.useProgram(program);
      const buffer = gl.createBuffer();
      if (!buffer) throw new Error('Unable to allocate geometry');
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      const position = gl.getAttribLocation(program, 'position');
      gl.enableVertexAttribArray(position);
      gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
      ['paper', 'grain', 'noise', 'resolution', 'tileSize', 'grainOffset', 'center', 'progress', 'ease', 'reach', 'ink'].forEach(name => this.uniforms[name] = gl.getUniformLocation(program, name));
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      images.forEach((image, unit) => {
        const texture = gl.createTexture();
        if (!texture) throw new Error('Unable to allocate texture');
        gl.activeTexture(gl.TEXTURE0 + unit);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, unit === 1 ? gl.NEAREST : gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, unit === 1 ? gl.NEAREST : gl.LINEAR);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        gl.uniform1i(this.uniforms[['paper', 'grain', 'noise'][unit]], unit);
      });
      this.canvas.addEventListener('webglcontextlost', event => {
        event.preventDefault();
        const wasCovered = this.progress >= .5;
        this.cancel();
        this.gl = undefined;
        this.element.classList.remove('is-webgl');
        this.progress = wasCovered ? 1 : 0;
        this.element.style.opacity = wasCovered ? '1' : '0';
        if (!this.targetVisible) void this.transition(false, 400);
      });
      this.resize();
      this.updateInk();
      this.element.classList.add('is-webgl');
    } catch {
      this.gl?.getExtension('WEBGL_lose_context')?.loseContext();
      this.gl = undefined;
      this.element.classList.remove('is-webgl');
    }
  }

  private resize() {
    // The reference cover caps its pixel ratio at one.
    this.canvas.width = Math.max(1, innerWidth);
    this.canvas.height = Math.max(1, innerHeight);
    this.center = [Math.min(this.center[0], innerWidth), Math.min(this.center[1], innerHeight)];
    this.gl?.viewport(0, 0, this.canvas.width, this.canvas.height);
    this.draw(performance.now());
  }

  private updateInk() {
    const ink = getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim().split(/\s+/).map(Number);
    this.gl?.uniform3f(this.uniforms.ink, ink[0] / 255, ink[1] / 255, ink[2] / 255);
    this.draw(performance.now());
  }

  private draw(now: number) {
    const { gl, uniforms, canvas } = this;
    if (!gl) return;
    const [x, top] = this.center;
    const y = canvas.height - top;
    const reach = 2 * Math.max(Math.hypot(x, y), Math.hypot(canvas.width - x, y), Math.hypot(x, canvas.height - y), Math.hypot(canvas.width - x, canvas.height - y));
    const grain = grainPositions[Math.floor(now / 50) % grainPositions.length];
    gl.uniform2f(uniforms.resolution, canvas.width, canvas.height);
    gl.uniform2f(uniforms.tileSize, innerWidth, innerHeight);
    gl.uniform2f(uniforms.grainOffset, grain[0] / 250 * innerWidth / 250, grain[1] / 250 * innerHeight / 250);
    gl.uniform2f(uniforms.center, x, y);
    gl.uniform1f(uniforms.reach, reach);
    gl.uniform1f(uniforms.progress, this.progress);
    gl.uniform1f(uniforms.ease, this.ease);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
}
