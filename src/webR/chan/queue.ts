// From https://stackoverflow.com/questions/47157428/how-to-implement-a-pseudo-blocking-async-queue-in-js-ts
/**
 * @module Queue
 */

/**
 * Asynchronous queue mechanism to be used by the communication channels.
 * @typeParam T The type of item to be stored in the queue.
 */
export class AsyncQueue<T> {
  #promises: Promise<T>[];
  #resolvers: ((t: T) => void)[];

  constructor() {
    this.#resolvers = [];
    this.#promises = [];
  }

  reset() {
    this.#resolvers = [];
    this.#promises = [];
  }

  put(t: T) {
    if (!this.#resolvers.length) {
      this.#add();
    }
    const resolve = this.#resolvers.shift()!;
    resolve(t);
  }

  async get() {
    if (!this.#promises.length) {
      this.#add();
    }
    const promise = this.#promises.shift()!;
    return promise;
  }

  isEmpty() {
    return !this.#promises.length;
  }

  isBlocked() {
    return !!this.#resolvers.length;
  }

  get length() {
    return this.#promises.length - this.#resolvers.length;
  }

  #add() {
    this.#promises.push(
      new Promise((resolve) => {
        this.#resolvers.push(resolve);
      })
    );
  }
}
