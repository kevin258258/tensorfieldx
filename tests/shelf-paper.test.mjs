import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { transformSync } = createRequire(require.resolve('astro/package.json'))('esbuild');
const compiled = transformSync(await readFile(new URL('../src/scripts/shelfPaper.ts', import.meta.url), 'utf8'), { loader:'ts', format:'cjs' }).code;

async function harness({ finePointer = true, wide = true, pixelRatio = 1 } = {}) {
  const queue = new Map(); let id = 0, now = 0, draws = 0, disposed = false;
  const reduced = Object.assign(new EventTarget(), { matches:false });
  const desktop = Object.assign(new EventTarget(), { matches:wide });
  const fine = Object.assign(new EventTarget(), { matches:finePointer });
  const document = Object.assign(new EventTarget(), { hidden:false });
  const classes = new Set();
  const canvas = Object.assign(new EventTarget(), { setAttribute() {}, remove() {}, width:0, height:0 });
  const uniforms = {};
  const gl = new Proxy({
    createShader:()=>({}), createProgram:()=>({}), createBuffer:()=>({}), createTexture:()=>({}),
    getShaderParameter:()=>true, getProgramParameter:()=>true, getAttribLocation:()=>0,
    getUniformLocation:(_,name)=>name,
    uniform1f:(name,value)=>uniforms[name]=value,
    uniform2f:(name,x,y)=>uniforms[name]=[x,y],
    drawArrays:()=>draws++,
    getExtension:()=>({loseContext:()=>disposed=true}),
  }, { get:(target,key)=>target[key] ?? (()=>{}) });
  canvas.getContext = () => gl;
  let canvases = 0;
  document.createElement = () => canvases++ === 0 ? canvas : { getContext:()=>({drawImage() {}}) };
  const host = {
    dataset:{}, style:{setProperty() {}}, append() {},
    getBoundingClientRect:()=>({width:500,height:400}),
    classList:{add:name=>classes.add(name),remove:name=>classes.delete(name)},
  };
  const observer = class { observe() {} disconnect() {} };
  const module = { exports:{} };
  vm.runInNewContext(compiled, {
    module,exports:module.exports,require:()=>'',document,devicePixelRatio:pixelRatio,
    getComputedStyle:()=>({getPropertyValue:()=> '125 151 184'}),
    matchMedia:q=>q.includes('reduced-motion') ? reduced : q.includes('pointer') ? fine : desktop,
    requestAnimationFrame:fn=>{queue.set(++id,fn);return id;},
    cancelAnimationFrame:n=>queue.delete(n),ResizeObserver:observer,IntersectionObserver:observer,
    Image:class { naturalWidth=1000;naturalHeight=700;set src(value){this.url=value;queueMicrotask(()=>this.onload());} },
  });
  const controller = new AbortController();
  const paper = module.exports.createShelfPaper(host,['first.jpg','second.jpg','third.jpg'],controller.signal);
  await new Promise(resolve=>setImmediate(resolve));
  const step = () => { now+=16;const tasks=[...queue.values()];queue.clear();tasks.forEach(fn=>fn(now)); };
  const settle = () => { let ticks=0;while(queue.size&&ticks++<240) step();assert.equal(queue.size,0,'animation must sleep after settling'); };
  return { paper,host,queue,step,settle,uniforms,reduced,classes,controller,canvas,
    get draws(){return draws;},get disposed(){return disposed;} };
}

test('paper movement and rapid cover changes settle without a permanent RAF loop',async()=>{
  const h=await harness();h.settle();assert.equal(h.host.dataset.paperState,'idle');
  h.paper.position(.8,-.7);h.step();assert(h.uniforms.pointer[0]>0);h.settle();
  assert(Math.abs(h.uniforms.pointer[0]-.8)<.002);
  h.paper.select(1);h.step();assert.equal(h.host.dataset.paperState,'turning');
  h.paper.select(2);h.step();h.paper.select(0);h.settle();
  assert.equal(h.uniforms.turn,1);assert.equal(h.host.dataset.paperState,'idle');
  h.paper.reset();h.settle();assert.deepEqual(Array.from(h.uniforms.pointer),[0,0]);
});

test('motion preference changes and navigation abort leave usable static covers',async()=>{
  const h=await harness();h.paper.select(1);h.step();
  h.reduced.matches=true;h.reduced.dispatchEvent(new Event('change'));
  assert.equal(h.queue.size,0);assert(!h.classes.has('is-paper-ready'));
  h.paper.select(2);assert.equal(h.queue.size,0);
  h.reduced.matches=false;h.reduced.dispatchEvent(new Event('change'));h.settle();
  assert(h.classes.has('is-paper-ready'));assert.equal(h.uniforms.turn,1);
  h.paper.position(.9,.9);h.controller.abort();
  assert.equal(h.queue.size,0);assert(h.disposed);assert(!h.classes.has('is-paper-ready'));
});

test('lost graphics contexts restore the static image and cancel pending motion',async()=>{
  const h=await harness();h.paper.select(1);h.step();
  h.canvas.dispatchEvent(new Event('webglcontextlost',{cancelable:true}));
  assert.equal(h.queue.size,0);assert(!h.classes.has('is-paper-ready'));
  h.paper.position(1,1);assert.equal(h.queue.size,0);
  h.controller.abort();
});

test('touch tablets render the paper at a bounded pixel ratio and sleep after each cover change',async()=>{
  const h=await harness({finePointer:false,pixelRatio:3});
  h.settle(); assert(h.classes.has('is-paper-ready'));
  assert.equal(h.canvas.width,500); assert.equal(h.canvas.height,400);
  h.paper.select(1); h.step(); assert.equal(h.host.dataset.paperState,'turning');
  h.settle(); assert.equal(h.host.dataset.paperState,'idle');
  h.controller.abort(); assert(h.disposed);
  const phone=await harness({finePointer:false,wide:false,pixelRatio:3});
  assert.equal(phone.draws,0); assert.equal(phone.queue.size,0);
  phone.controller.abort();
});
