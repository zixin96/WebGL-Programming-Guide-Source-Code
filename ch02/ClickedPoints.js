// ClickedPints.js (c) 2012 matsuda
// Vertex shader program
var VSHADER_SOURCE =
  'attribute vec4 a_Position;\n' +
  'void main() {\n' +
  '  gl_Position = a_Position;\n' +
  '  gl_PointSize = 10.0;\n' +
  '}\n';

// Fragment shader program
var FSHADER_SOURCE =
  'void main() {\n' +
  '  gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);\n' +
  '}\n';

function main() {
  // Retrieve <canvas> element
  var canvas = document.getElementById('webgl');

  // Get the rendering context for WebGL
  var gl = getWebGLContext(canvas);
  if (!gl) {
    console.log('Failed to get the rendering context for WebGL');
    return;
  }

  // Initialize shaders
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log('Failed to intialize shaders.');
    return;
  }

  // Get the storage location of a_Position
  var a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  if (a_Position < 0) {
    console.log('Failed to get the storage location of a_Position');
    return;
  }

  // Register function (event handler) to be called on a mouse press
  canvas.onmousedown = (ev) => { click(ev, gl, canvas, a_Position); };

  // Specify the color for clearing <canvas>
  gl.clearColor(0.5, 0.5, 0.5, 1.0);

  // Clear <canvas>
  gl.clear(gl.COLOR_BUFFER_BIT);
}

var g_points = []; // The array for the position of a mouse press
function click(ev, gl, canvas, a_Position) {
  var x = ev.clientX; // x coordinate of a mouse pointer
  var y = ev.clientY; // y coordinate of a mouse pointer
  var rect = ev.target.getBoundingClientRect() ;

  // the following computation is illustrated using a scratch paper attached to the end of the book. 
  // From Client coord System to WebGL coord system
  x = ((x - rect.left) - canvas.width/2)/(canvas.width/2);
  y = (canvas.height/2 - (y - rect.top))/(canvas.height/2);
  // Store the coordinates to g_points array
  g_points.push([x,y]);

  // Clear <canvas>
  gl.clear(gl.COLOR_BUFFER_BIT);  // WebGL will reinitialize the color buffer to (0, 0, 0, 0) (transparent) after drawing the point, thus gl.clear is necessary to preserve the background color.

  var len = g_points.length;
  for(var i = 0; i < len; i++) {
    var point = g_points[i];
    // Pass the position of a point to a_Position variable
    gl.vertexAttrib3f(a_Position, point[0], point[1], 0.0);

    // Draw
    gl.drawArrays(gl.POINTS, 0, 1);
  }
  // after the drawing operation is performed to the color buffer, the system displays its content to the screen.
  // after that, the color buffer is reinitialized to default values specified in table 2.1 (page 23) and its content is lost. (default behavior)
}
