class MinHeap {
  constructor(capacity, compareFn = (a, b) => a.value - b.value) {
    this.capacity = capacity;
    this.size = 0;
    this.heap = new Array(capacity);
    this.compareFn = compareFn;
  }

  insert(item) {
    if (this.size >= this.capacity) {
      throw new Error('Куча заполнена');
    }
    this.heap[this.size] = item;
    this.size++;
    this.bubbleUp(this.size - 1);
  }

  extractMin() {
    if (this.size === 0) {
      throw new Error('Куча пуста');
    }
    const minItem = this.heap[0];
    this.size--;
    if (this.size > 0) {
      this.heap[0] = this.heap[this.size];
      this.bubbleDown(0);
    }
    return minItem;
  }

  bubbleUp(i) {
    while (i > 0) {
      const parent = Math.floor((i - 1) / 2);
      if (this.compareFn(this.heap[parent], this.heap[i]) <= 0) break;
      this.swap(i, parent);
      i = parent;
    }
  }

  bubbleDown(i) {
    while (true) {
      let minIndex = i;
      const left = 2 * i + 1;
      const right = 2 * i + 2;

      if (left < this.size && this.compareFn(this.heap[left], this.heap[minIndex]) < 0) {
        minIndex = left;
      }

      if (right < this.size && this.compareFn(this.heap[right], this.heap[minIndex]) < 0) {
        minIndex = right;
      }

      if (minIndex === i) break;

      this.swap(i, minIndex);
      i = minIndex;
    }
  }

  swap(i, j) {
    [this.heap[i], this.heap[j]] = [this.heap[j], this.heap[i]];
  }
}

module.exports = { MinHeap };