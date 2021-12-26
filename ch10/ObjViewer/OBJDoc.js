class OBJDoc {
  constructor(fileName) {
    this.fileName = fileName;
    this.mtls = new Array(0); // Initialize the property for MTL
    this.objects = new Array(0); // Initialize the property for Object
    this.vertices = new Array(0); // Initialize the property for Vertex
    this.normals = new Array(0); // Initialize the property for Normal
  }

  parse(fileString, scale, reverse) {
    const lines = fileString.split("\n"); // Break up into lines and store them as array
    lines.push(null); // Append null
    let index = 0; // Initialize index of line

    let currentObject = null;
    let currentMaterialName = "";

    // Parse line by line
    let line; // A string in the line to be parsed
    const sp = new StringParser(); // Create StringParser
    while ((line = lines[index++]) != null) {
      sp.init(line); // init StringParser
      const command = sp.getWord(); // Get command
      if (command == null) continue; // check null command
      switch (command) {
        case "#":
          continue; // Skip comments
        case "mtllib": // Read Material chunk
          const path = this.parseMtllib(sp, this.fileName);
          const mtl = new MTLDoc(); // Create MTL instance
          this.mtls.push(mtl);
          const request = new XMLHttpRequest();
          request.onreadystatechange = function () {
            if (request.readyState == 4) {
              if (request.status != 404) {
                onReadMTLFile(request.responseText, mtl);
              } else {
                mtl.complete = true;
              }
            }
          };
          request.open("GET", path, true); // Create a request to acquire the file
          request.send(); // Send the request
          continue; // Go to the next line
        case "o":
        case "g": // Read Object name
          const object = this.parseObjectName(sp);
          this.objects.push(object);
          currentObject = object;
          continue; // Go to the next line
        case "v": // Read vertex
          const vertex = this.parseVertex(sp, scale);
          this.vertices.push(vertex);
          continue; // Go to the next line
        case "vn": // Read normal
          const normal = this.parseNormal(sp);
          this.normals.push(normal);
          continue; // Go to the next line
        case "usemtl": // Read Material name
          currentMaterialName = this.parseUsemtl(sp);
          continue; // Go to the next line
        case "f": // Read face
          const face = this.parseFace(
            sp,
            currentMaterialName,
            this.vertices,
            reverse
          );
          currentObject.addFace(face);
          continue; // Go to the next line
      }
    }

    return true;
  }

  parseMtllib(sp, fileName) {
    // Get directory path
    const i = fileName.lastIndexOf("/");
    const dirPath = "";
    if (i > 0) dirPath = fileName.substr(0, i + 1);

    return dirPath + sp.getWord(); // Get path
  }

  parseObjectName(sp) {
    const name = sp.getWord();
    return new OBJObject(name);
  }

  parseVertex(sp, scale) {
    const x = sp.getFloat() * scale;
    const y = sp.getFloat() * scale;
    const z = sp.getFloat() * scale;
    return new Vertex(x, y, z);
  }

  parseNormal(sp) {
    const x = sp.getFloat();
    const y = sp.getFloat();
    const z = sp.getFloat();
    return new Normal(x, y, z);
  }

  parseUsemtl(sp) {
    return sp.getWord();
  }

  parseFace(sp, materialName, vertices, reverse) {
    const face = new Face(materialName);
    // get indices
    for (;;) {
      const word = sp.getWord();
      if (word == null) break;
      const subWords = word.split("/");
      if (subWords.length >= 1) {
        const vi = parseInt(subWords[0]) - 1;
        face.vIndices.push(vi);
      }
      if (subWords.length >= 3) {
        const ni = parseInt(subWords[2]) - 1;
        face.nIndices.push(ni);
      } else {
        face.nIndices.push(-1);
      }
    }

    // calc normal
    const v0 = [
      vertices[face.vIndices[0]].x,
      vertices[face.vIndices[0]].y,
      vertices[face.vIndices[0]].z,
    ];
    const v1 = [
      vertices[face.vIndices[1]].x,
      vertices[face.vIndices[1]].y,
      vertices[face.vIndices[1]].z,
    ];
    const v2 = [
      vertices[face.vIndices[2]].x,
      vertices[face.vIndices[2]].y,
      vertices[face.vIndices[2]].z,
    ];

    // calculate the surface normal
    const normal = calcNormal(v0, v1, v2);
    // 找出是否正确找到了法线
    if (normal == null) {
      if (face.vIndices.length >= 4) {
        // 如果曲面是四边形，用另一种3点组合法线计算
        const v3 = [
          vertices[face.vIndices[3]].x,
          vertices[face.vIndices[3]].y,
          vertices[face.vIndices[3]].z,
        ];
        normal = calcNormal(v1, v2, v3);
      }
      if (normal == null) {
        // 由于没有得到法线，所以应该是Y轴方向的法线。
        normal = [0.0, 1.0, 0.0];
      }
    }
    if (reverse) {
      normal[0] = -normal[0];
      normal[1] = -normal[1];
      normal[2] = -normal[2];
    }
    face.normal = new Normal(normal[0], normal[1], normal[2]);

    // Devide to triangles if face contains over 3 points.
    if (face.vIndices.length > 3) {
      const n = face.vIndices.length - 2;
      const newVIndices = new Array(n * 3);
      const newNIndices = new Array(n * 3);
      for (let i = 0; i < n; i++) {
        newVIndices[i * 3 + 0] = face.vIndices[0];
        newVIndices[i * 3 + 1] = face.vIndices[i + 1];
        newVIndices[i * 3 + 2] = face.vIndices[i + 2];
        newNIndices[i * 3 + 0] = face.nIndices[0];
        newNIndices[i * 3 + 1] = face.nIndices[i + 1];
        newNIndices[i * 3 + 2] = face.nIndices[i + 2];
      }
      face.vIndices = newVIndices;
      face.nIndices = newNIndices;
    }
    face.numIndices = face.vIndices.length;

    return face;
  }

  // Check Materials
  isMTLComplete() {
    if (this.mtls.length == 0) return true;
    for (let i = 0; i < this.mtls.length; i++) {
      if (!this.mtls[i].complete) return false;
    }
    return true;
  }

  // Find color by material name
  findColor(name) {
    for (let i = 0; i < this.mtls.length; i++) {
      for (let j = 0; j < this.mtls[i].materials.length; j++) {
        if (this.mtls[i].materials[j].name == name) {
          return this.mtls[i].materials[j].color;
        }
      }
    }
    return new Color(0.8, 0.8, 0.8, 1);
  }

  //------------------------------------------------------------------------------
  // Retrieve the information for drawing 3D model
  getDrawingInfo() {
    // Create an arrays for vertex coordinates, normals, colors, and indices
    let numIndices = 0;
    for (let i = 0; i < this.objects.length; i++) {
      numIndices += this.objects[i].numIndices;
    }
    const numVertices = numIndices;
    const vertices = new Float32Array(numVertices * 3);
    const normals = new Float32Array(numVertices * 3);
    const colors = new Float32Array(numVertices * 4);
    const indices = new Uint16Array(numIndices);

    // Set vertex, normal and color
    let index_indices = 0;
    for (let i = 0; i < this.objects.length; i++) {
      const object = this.objects[i];
      for (let j = 0; j < object.faces.length; j++) {
        const face = object.faces[j];
        const color = this.findColor(face.materialName);
        const faceNormal = face.normal;
        for (let k = 0; k < face.vIndices.length; k++) {
          // Set index
          indices[index_indices] = index_indices;
          // Copy vertex
          const vIdx = face.vIndices[k];
          const vertex = this.vertices[vIdx];
          vertices[index_indices * 3 + 0] = vertex.x;
          vertices[index_indices * 3 + 1] = vertex.y;
          vertices[index_indices * 3 + 2] = vertex.z;
          // Copy color
          colors[index_indices * 4 + 0] = color.r;
          colors[index_indices * 4 + 1] = color.g;
          colors[index_indices * 4 + 2] = color.b;
          colors[index_indices * 4 + 3] = color.a;
          // Copy normal
          const nIdx = face.nIndices[k];
          if (nIdx >= 0) {
            const normal = this.normals[nIdx];
            normals[index_indices * 3 + 0] = normal.x;
            normals[index_indices * 3 + 1] = normal.y;
            normals[index_indices * 3 + 2] = normal.z;
          } else {
            normals[index_indices * 3 + 0] = faceNormal.x;
            normals[index_indices * 3 + 1] = faceNormal.y;
            normals[index_indices * 3 + 2] = faceNormal.z;
          }
          index_indices++;
        }
      }
    }
    return new DrawingInfo(vertices, normals, colors, indices);
  }
}
