// Decorative twinkling-star background. Populates a container with randomly
// sized and positioned star elements; CSS animates them.
export class Starfield {
  #el;
  #count;
  #fireworkCount;
  #sparkCount;

  constructor(el, { count = 80, fireworkCount = 4, sparkCount = 12 } = {}) {
    this.#el = el;
    this.#count = count;
    this.#fireworkCount = fireworkCount;
    this.#sparkCount = sparkCount;
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

    for (let i = 0; i < this.#fireworkCount; i++) {
      const burst = document.createElement('div');
      burst.className = 'firework-burst';
      burst.style.left = `${10 + Math.random() * 80}%`;
      burst.style.top = `${8 + Math.random() * 52}%`;
      burst.style.animationDelay = `${Math.random() * 4}s`;
      burst.style.setProperty('--burst-hue', `${Math.floor(Math.random() * 80) + 10}`);

      for (let sparkIndex = 0; sparkIndex < this.#sparkCount; sparkIndex++) {
        const spark = document.createElement('span');
        spark.className = 'firework-spark';
        spark.style.setProperty('--spark-angle', `${(360 / this.#sparkCount) * sparkIndex}deg`);
        spark.style.animationDelay = `${Math.random() * 0.35}s`;
        burst.appendChild(spark);
      }

      this.#el.appendChild(burst);
    }
  }
}
