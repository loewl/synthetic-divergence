export class SpatialHashGrid {
  constructor(cellSize = 64) {
    this.s = cellSize;
    this.map = new Map();
  }

  _key(ix, iy) {
    return ix + ',' + iy;
  }

  _cell(x, y) {
    const s = this.s;
    return [Math.floor(x / s), Math.floor(y / s)];
  }

  clear() {
    this.map.clear();
  }

  insert(item, x, y) {
    const [ix, iy] = this._cell(x, y);
    const k = this._key(ix, iy);
    let a = this.map.get(k);
    if (!a) {
      a = [];
      this.map.set(k, a);
    }
    a.push(item);
  }

  rebuildFrom(items, getX, getY) {
    this.map.clear();
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      this.insert(it, getX(it), getY(it));
    }
  }

  queryRadius(x, y, r) {
    const s = this.s;
    const ix0 = Math.floor((x - r) / s), iy0 = Math.floor((y - r) / s);
    const ix1 = Math.floor((x + r) / s), iy1 = Math.floor((y + r) / s);
    let out = null;
    for (let iy = iy0; iy <= iy1; iy++) {
      for (let ix = ix0; ix <= ix1; ix++) {
        const a = this.map.get(this._key(ix, iy));
        if (a) {
          if (out) {
            out.push(...a);
          } else {
            out = a.slice();
          }
        }
      }
    }
    return out || [];
  }
}
