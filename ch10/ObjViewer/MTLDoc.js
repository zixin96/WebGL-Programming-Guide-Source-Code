class MTLDoc {
  constructor() {
    this.complete = false; // MTL is configured correctly
    this.materials = new Array(0);
  }
  parseNewmtl(sp) {
    return sp.getWord(); // Get name
  }

  parseRGB(sp, name) {
    const r = sp.getFloat();
    const g = sp.getFloat();
    const b = sp.getFloat();
    return new Material(name, r, g, b, 1);
  }
}
