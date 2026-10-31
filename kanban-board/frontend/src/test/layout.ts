/** jsdom has no layout: derive rects from column and card order so dnd-kit can navigate. */
export function installLayout() {
  // eslint-disable-next-line @typescript-eslint/unbound-method
  const original = Element.prototype.getBoundingClientRect;
  Element.prototype.getBoundingClientRect = function rect(this: Element) {
    const el = this as HTMLElement;
    const section = el.closest("section");
    const columns = Array.from(document.querySelectorAll("section"));
    const col = section ? columns.indexOf(section) : 0;
    let x = col * 300;
    let y = 0;
    const width = 280;
    let height = 1000;
    if (el.dataset.ticketKey) {
      const cards = Array.from(section?.querySelectorAll("[data-ticket-key]") ?? []);
      y = 60 + cards.indexOf(el) * 100;
      height = 90;
    } else if (el.dataset.columnBody !== undefined) {
      y = 40;
    } else if (el.tagName === "SECTION") {
      x = columns.indexOf(el) * 300;
    } else if (el.style.position === "fixed") {
      // The drag overlay starts exactly where the dragged card's placeholder is.
      const placeholder = document.querySelector("div[data-ticket-key]");
      if (placeholder) return placeholder.getBoundingClientRect();
      height = 90;
    } else {
      return original.call(this);
    }
    return {
      x,
      y,
      left: x,
      top: y,
      width,
      height,
      right: x + width,
      bottom: y + height,
      toJSON() {},
    };
  };
  return () => {
    Element.prototype.getBoundingClientRect = original;
  };
}

/** jsdom has no ResizeObserver; dnd-kit measures through it, so fire once on observe. */
export class FakeResizeObserver {
  private callback: ResizeObserverCallback;
  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }
  observe(target: Element) {
    queueMicrotask(() => this.callback([{ target } as ResizeObserverEntry], this));
  }
  unobserve() {}
  disconnect() {}
}
