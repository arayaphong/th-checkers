// Decorative twinkling-star background. Populates a container with randomly
// sized and positioned star elements; CSS animates them.
export class Starfield {
  #el;
  #count;

  constructor(el, { count = 80 } = {}) {
    this.#el = el;
    this.#count = count;
  }

  render() {
    if (!this.#el) return;
    this.#el.innerHTML = '';
    for (let i = 0; i < this.#count; i++) {
      const star = document.createElement('div');
      star.className = 'star';
      const size = Math.random() * 2.5 + 1;
      star.style.width = `${size}px`;
      star.style.height = `${size}px`;
      star.style.left = `${Math.random() * 100}%`;
      star.style.top = `${Math.random() * 100}%`;
      star.style.animationDuration = `${Math.random() * 3 + 2}s`;
      star.style.animationDelay = `${Math.random() * 5}s`;
      this.#el.appendChild(star);
    }
  }
}
