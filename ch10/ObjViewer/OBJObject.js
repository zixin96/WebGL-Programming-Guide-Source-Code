class OBJObject {
  constructor(name) {
    this.name = name;
    this.faces = new Array(0);
    this.numIndices = 0;
  }

  addFace(face) {
    this.faces.push(face);
    this.numIndices += face.numIndices;
  }
}
