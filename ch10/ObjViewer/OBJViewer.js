// OBJViewer.js (c) 2012 matsuda and itami
// Vertex shader program
const VSHADER_SOURCE =
  "attribute vec4 a_Position;\n" +
  "attribute vec4 a_Color;\n" +
  "attribute vec4 a_Normal;\n" +
  "uniform mat4 u_MvpMatrix;\n" +
  "uniform mat4 u_NormalMatrix;\n" +
  "varying vec4 v_Color;\n" +
  "void main() {\n" +
  "  vec3 lightDirection = vec3(-0.35, 0.35, 0.87);\n" +
  "  gl_Position = u_MvpMatrix * a_Position;\n" +
  "  vec3 normal = normalize(vec3(u_NormalMatrix * a_Normal));\n" +
  "  float nDotL = max(dot(normal, lightDirection), 0.0);\n" +
  "  v_Color = vec4(a_Color.rgb * nDotL, a_Color.a);\n" +
  "}\n";

// Fragment shader program
const FSHADER_SOURCE =
  "#ifdef GL_ES\n" +
  "precision mediump float;\n" +
  "#endif\n" +
  "varying vec4 v_Color;\n" +
  "void main() {\n" +
  "  gl_FragColor = v_Color;\n" +
  "}\n";

function main() {
  // Retrieve <canvas> element
  const canvas = document.getElementById("webgl");

  // Get the rendering context for WebGL
  const gl = getWebGLContext(canvas);
  if (!gl) {
    console.log("Failed to get the rendering context for WebGL");
    return;
  }

  // Initialize shaders
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log("Failed to intialize shaders.");
    return;
  }

  // Set the clear color and enable the depth test
  gl.clearColor(0.2, 0.2, 0.2, 1.0);
  gl.enable(gl.DEPTH_TEST);

  // Get the storage locations of attribute and uniform constiables
  const program = gl.program;
  program.a_Position = gl.getAttribLocation(program, "a_Position");
  program.a_Normal = gl.getAttribLocation(program, "a_Normal");
  program.a_Color = gl.getAttribLocation(program, "a_Color");
  program.u_MvpMatrix = gl.getUniformLocation(program, "u_MvpMatrix");
  program.u_NormalMatrix = gl.getUniformLocation(program, "u_NormalMatrix");

  if (
    program.a_Position < 0 ||
    program.a_Normal < 0 ||
    program.a_Color < 0 ||
    !program.u_MvpMatrix ||
    !program.u_NormalMatrix
  ) {
    console.log("attribute, uniform変数の格納場所の取得に失敗");
    return;
  }

  // Prepare empty buffer objects for vertex coordinates, colors, and normals
  const model = initVertexBuffers(gl, program);
  if (!model) {
    console.log("Failed to set the vertex information");
    return;
  }

  // 计算视图投影矩阵
  const viewProjMatrix = new Matrix4();
  viewProjMatrix.setPerspective(
    30.0,
    canvas.width / canvas.height,
    1.0,
    5000.0
  );
  viewProjMatrix.lookAt(0.0, 500.0, 200.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0);

  // Start reading the OBJ file
  readOBJFile("teddy.obj", 5, true);

  let currentAngle = 0.0; // Current rotation angle [degree]
  const tick = function () {
    // Start drawing
    currentAngle = animate(currentAngle); // Update current rotation angle
    draw(gl, gl.program, currentAngle, viewProjMatrix, model);
    requestAnimationFrame(tick, canvas);
  };
  tick();
}

// Create an buffer object and perform an initial configuration
function initVertexBuffers(gl, program) {
  const o = new Object(); // Utilize Object object to return multiple buffer objects
  o.vertexBuffer = createEmptyArrayBuffer(gl, program.a_Position, 3, gl.FLOAT);
  o.normalBuffer = createEmptyArrayBuffer(gl, program.a_Normal, 3, gl.FLOAT);
  o.colorBuffer = createEmptyArrayBuffer(gl, program.a_Color, 4, gl.FLOAT);
  o.indexBuffer = gl.createBuffer();
  if (!o.vertexBuffer || !o.normalBuffer || !o.colorBuffer || !o.indexBuffer) {
    return null;
  }

  gl.bindBuffer(gl.ARRAY_BUFFER, null);

  return o;
}

// Create a buffer object, assign it to attribute constiables, and enable the assignment
function createEmptyArrayBuffer(gl, a_attribute, num, type) {
  const buffer = gl.createBuffer(); // Create a buffer object
  if (!buffer) {
    console.log("Failed to create the buffer object");
    return null;
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.vertexAttribPointer(a_attribute, num, type, false, 0, 0); // Assign the buffer object to the attribute constiable
  gl.enableVertexAttribArray(a_attribute); // Enable the assignment

  return buffer;
}

// Read a file
function readOBJFile(fileName, scale, reverse) {
  const request = new XMLHttpRequest();

  request.onreadystatechange = function () {
    if (request.readyState === 4 && request.status !== 404) {
      onReadOBJFile(request.responseText, fileName, scale, reverse);
    }
  };
  request.open("GET", fileName, true); // Create a request to acquire the file
  request.send(); // Send the request
}

let g_objDoc = null; // The information of OBJ file
let g_drawingInfo = null; // The information for drawing 3D model

// OBJ File has been read
function onReadOBJFile(fileString, fileName, scale, reverse) {
  const objDoc = new OBJDoc(fileName); // Create a OBJDoc object
  const result = objDoc.parse(fileString, scale, reverse); // Parse the file
  if (!result) {
    g_objDoc = null;
    g_drawingInfo = null;
    console.log("OBJ file parsing error.");
    return;
  }
  g_objDoc = objDoc;
}

// Coordinate transformation matrix
const g_modelMatrix = new Matrix4();
const g_mvpMatrix = new Matrix4();
const g_normalMatrix = new Matrix4();

function draw(gl, program, angle, viewProjMatrix, model) {
  if (g_objDoc != null && g_objDoc.isMTLComplete()) {
    // OBJ and all MTLs are available
    g_drawingInfo = onReadComplete(gl, model, g_objDoc);
    g_objDoc = null;
  }
  if (!g_drawingInfo) return; // determine if the model has been loaded

  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); // Clear color and depth buffers

  g_modelMatrix.setRotate(angle, 1.0, 0.0, 0.0); // 適当に回転
  g_modelMatrix.rotate(angle, 0.0, 1.0, 0.0);
  g_modelMatrix.rotate(angle, 0.0, 0.0, 1.0);

  // Calculate the normal transformation matrix and pass it to u_NormalMatrix
  g_normalMatrix.setInverseOf(g_modelMatrix);
  g_normalMatrix.transpose();
  gl.uniformMatrix4fv(program.u_NormalMatrix, false, g_normalMatrix.elements);

  // Calculate the model view project matrix and pass it to u_MvpMatrix
  g_mvpMatrix.set(viewProjMatrix);
  g_mvpMatrix.multiply(g_modelMatrix);
  gl.uniformMatrix4fv(program.u_MvpMatrix, false, g_mvpMatrix.elements);

  // Draw
  gl.drawElements(
    gl.TRIANGLES,
    g_drawingInfo.indices.length,
    gl.UNSIGNED_SHORT,
    0
  );
}

// OBJ File has been read compreatly
function onReadComplete(gl, model, objDoc) {
  // Acquire the vertex coordinates and colors from OBJ file
  const drawingInfo = objDoc.getDrawingInfo();

  // Write date into the buffer object
  gl.bindBuffer(gl.ARRAY_BUFFER, model.vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, drawingInfo.vertices, gl.STATIC_DRAW);

  gl.bindBuffer(gl.ARRAY_BUFFER, model.normalBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, drawingInfo.normals, gl.STATIC_DRAW);

  gl.bindBuffer(gl.ARRAY_BUFFER, model.colorBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, drawingInfo.colors, gl.STATIC_DRAW);

  // Write the indices to the buffer object
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, model.indexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, drawingInfo.indices, gl.STATIC_DRAW);

  return drawingInfo;
}

const ANGLE_STEP = 30; // The increments of rotation angle (degrees)

let last = Date.now(); // Last time that this function was called
function animate(angle) {
  const now = Date.now(); // Calculate the elapsed time
  const elapsed = now - last;
  last = now;
  // Update the current rotation angle (adjusted by the elapsed time)
  const newAngle = angle + (ANGLE_STEP * elapsed) / 1000.0;
  return newAngle % 360;
}

//------------------------------------------------------------------------------
// OBJParser
//------------------------------------------------------------------------------

// Analyze the material file
function onReadMTLFile(fileString, mtl) {
  const lines = fileString.split("\n"); // Break up into lines and store them as array
  lines.push(null); // Append null
  let index = 0; // Initialize index of line

  // Parse line by line
  let line; // A string in the line to be parsed
  let name = ""; // Material name
  const sp = new StringParser(); // Create StringParser
  while ((line = lines[index++]) != null) {
    sp.init(line); // init StringParser
    const command = sp.getWord(); // Get command
    if (command == null) continue; // check null command

    switch (command) {
      case "#":
        continue; // Skip comments
      case "newmtl": // Read Material chunk
        name = mtl.parseNewmtl(sp); // Get name
        continue; // Go to the next line
      case "Kd": // Read normal
        if (name == "") continue; // Go to the next line because of Error
        const material = mtl.parseRGB(sp, name);
        mtl.materials.push(material);
        name = "";
        continue; // Go to the next line
    }
  }
  mtl.complete = true;
}

// Get the length of word
function getWordLength(str, start) {
  let i = start;
  let len = str.length;
  for (; i < len; i++) {
    const c = str.charAt(i);
    if (c == "\t" || c == " " || c == "(" || c == ")" || c == '"') break;
  }
  return i - start;
}

//------------------------------------------------------------------------------
// Common function
//------------------------------------------------------------------------------
function calcNormal(p0, p1, p2) {
  // v0: a vector from p1 to p0, v1; a vector from p1 to p2
  const v0 = new Float32Array(3);
  const v1 = new Float32Array(3);
  for (let i = 0; i < 3; i++) {
    v0[i] = p0[i] - p1[i];
    v1[i] = p2[i] - p1[i];
  }

  // The cross product of v0 and v1
  const c = new Float32Array(3);
  c[0] = v0[1] * v1[2] - v0[2] * v1[1];
  c[1] = v0[2] * v1[0] - v0[0] * v1[2];
  c[2] = v0[0] * v1[1] - v0[1] * v1[0];

  // Normalize the result
  const v = new Vector3(c);
  v.normalize();
  return v.elements;
}
