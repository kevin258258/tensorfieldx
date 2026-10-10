import type { TransitionBeforePreparationEvent, TransitionBeforeSwapEvent } from 'astro:transitions/client';
import { PaperCover } from './paperCover';

let bound = false;

export function initTransitions() {
  if (bound) return;
  const element = document.querySelector<HTMLElement>('[data-paper-cover]');
  if (!element) return;
  bound = true;
  const cover = new PaperCover(element);
  let navigation = 0;
  let preparing = false;
  let preparationSignal: AbortSignal | undefined;
  let swappedNavigation = 0;

  document.addEventListener('pointermove', event => cover.setCenter(event.clientX, event.clientY));
  document.addEventListener('pointerdown', event => cover.setCenter(event.clientX, event.clientY));
  document.addEventListener('reference:entered', () => {
    cover.coverImmediately();
    void cover.transition(false, 1800);
  });
  document.addEventListener('astro:before-preparation', event => {
    const next = event as TransitionBeforePreparationEvent;
    const id = ++navigation;
    preparationSignal = next.signal;
    preparing = true;
    const load = next.loader;
    next.signal.addEventListener('abort', () => {
      // A second navigation starts in the same turn; let its cover take over.
      queueMicrotask(() => {
        if (id !== navigation) return;
        preparing = false;
        void cover.transition(false, 400);
      });
    }, { once: true });
    next.loader = async () => {
      let failed = false;
      try {
        await Promise.all([load(), cover.transition(true, 1000)]);
      } catch (error) {
        failed = true;
        throw error;
      } finally {
        if (id === navigation && (failed || next.signal.aborted || next.defaultPrevented)) {
          preparing = false;
          void cover.transition(false, 400);
        }
      }
    };
  });
  document.addEventListener('astro:before-swap', event => {
    const swap = event as TransitionBeforeSwapEvent;
    if (swap.signal === preparationSignal && !swap.signal.aborted) swappedNavigation = navigation;
  });
  document.addEventListener('astro:page-load', () => {
    if (!preparing || swappedNavigation !== navigation) return;
    preparing = false;
    void cover.transition(false, 1800);
  });
}
