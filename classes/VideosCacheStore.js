class VideosCacheStore {
  #videos = new Map();

  constructor() {}

  add(id, data) {
    if (this.#videos.size > 150) {
      for (const iterator of this.#videos.keys()) {
        this.#videos.delete(iterator);
        break;
      }

      this.#videos.set(id, data);
    } else {
      this.#videos.set(id, data);
    }
  }

  get(id) {
    return this.#videos.get(id);
  }

  remove(id) {
    return this.#videos.delete(id);
  }
}

module.exports = new VideosCacheStore();
