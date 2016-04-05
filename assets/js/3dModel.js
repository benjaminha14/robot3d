/*global quat*/
/*global mat4*/
/*global vec3*/


var canvas;
var gl;

function getE(id) {
    return document.getElementById(id);
}
window.addEventListener('load', function(e) {
    try {
        canvas = getE("3dCanvas");
        gl = canvas.getContext('experimental-webgl');
        initGL();
        initGame();
        canvas.addEventListener("mousedown", function(event) {
            event = event || window.event;
            event.preventDefault();
            touchStart(event.clientX, event.clientY, 0);
        }, false);
        canvas.addEventListener("mousemove", function(event) {
            event = event || window.event;
            event.preventDefault();
            touchMove(event.clientX, event.clientY, 0);
        }, false);
        canvas.addEventListener("mouseup", function(event) {
            event = event || window.event;
            event.preventDefault();
            touchEnd(event.clientX, event.clientY, 0);
        }, false);
        canvas.addEventListener("touchstart", function(event) {
            event.preventDefault();
            var ts = event.changedTouches;
            for (var i = 0; i < ts.length; i++)
                touchStart(ts[i].pageX, ts[i].pageY, ts[i].identifier);
        }, false);
        canvas.addEventListener("touchmove", function(event) {
            event.preventDefault();
            var ts = event.changedTouches;
            for (var i = 0; i < ts.length; i++)
                touchMove(ts[i].pageX, ts[i].pageY, ts[i].identifier);
        }, false);
        
        function tEnd(event) {
            event.preventDefault();
            var ts = event.changedTouches;
            for (var i = 0; i < ts.length; i++)
                touchEnd(ts[i].pageX, ts[i].pageY, ts[i].identifier);
        }
        canvas.addEventListener("touchend", tEnd, false);
        canvas.addEventListener("touchcancel", tEnd, false);
        canvas.addEventListener("wheel", function(event) {
            event = event || window.event;
            event.preventDefault();
            var delta = event.wheelDelta || -event.detail;
            modelScale *= Math.pow(1.001, delta);
        }, false);
        //document.body.style.fontSize = canvas.height + "px";
        requestAnimationFrame(drawFrame);
    }
    catch (e) {
        alert("onload: " + e.message)
    }
}, false);

var fovy = 45;

var camPanTouch = null,
    joyTouch = null;
var lastCTX, lastCTY;

function touchStart(tx, ty, tid) {
    camPanTouch = tid;
    lastCTX = tx;
    lastCTY = ty;
}

function touchMove(tx, ty, tid) {
    if (tid == camPanTouch) {
        var tmp = quat.create();
        quat.rotateY(tmp, tmp, (tx - lastCTX) / canvas.height * 45 * 0.1);
        quat.rotateX(tmp, tmp, (ty - lastCTY) / canvas.height * 45 * 0.1);
        quat.mul(camRot, tmp, camRot);
        lastCTX = tx;
        lastCTY = ty;
    }
}

function touchEnd(tx, ty, tid) {
    if (tid == camPanTouch) {
        camPanTouch = null;
    }
}

var modelM = mat4.create(),
    viewM = mat4.create(),
    projection = mat4.create();
var shader;

function initGL() {
    shader = createShaderProg("\
attribute vec3 inVert;\
attribute vec3 inColor;\
attribute vec3 inNorm;\
attribute vec2 inTexCoords;\
uniform mat4 modelM;\
uniform mat4 viewM;\
uniform mat4 projection;\
varying vec3 vColor;\
varying vec3 rotNorm;\
varying vec2 texCoords;\
void main() {\
  gl_Position = projection*viewM*modelM*vec4(inVert,1.0);\
  rotNorm = mat3(modelM)*inNorm;\
  texCoords = inTexCoords;\
  vColor = inColor;\
}",
        "\
precision mediump float;\
uniform vec3 lightDir;\
uniform vec3 color;\
uniform sampler2D sampler;\
varying vec3 vColor;\
varying vec3 rotNorm;\
varying vec2 texCoords;\
void main() {\
  gl_FragColor = /*texture2D(sampler,texCoords)**/vec4(vColor*color*((dot(lightDir,normalize(rotNorm))+1.0)/2.0),1.0);\
}");
    gl.useProgram(shader);
    shader.inVertLoc = gl.getAttribLocation(shader, "inVert");
    gl.enableVertexAttribArray(shader.inVertLoc);
    shader.inColorLoc = gl.getAttribLocation(shader, "inColor");
    gl.enableVertexAttribArray(shader.inColorLoc);
    shader.inNormLoc = gl.getAttribLocation(shader, "inNorm");
    gl.enableVertexAttribArray(shader.inNormLoc);
    shader.inTexCoordsLoc = gl.getAttribLocation(shader, "inTexCoords");
    gl.enableVertexAttribArray(shader.inTexCoordsLoc);
    shader.projectionLoc = gl.getUniformLocation(shader, "projection");
    shader.modelMLoc = gl.getUniformLocation(shader, "modelM");
    shader.viewMLoc = gl.getUniformLocation(shader, "viewM");
    shader.colorLoc = gl.getUniformLocation(shader, "color");
    shader.lightDirLoc = gl.getUniformLocation(shader, "lightDir");
    
    gl.clearColor(3/16,3/16,3/16,1);
    gl.enable(gl.DEPTH_TEST);
    //gl.enable(gl.CULL_FACE);
    //gl.frontFace(gl.CCW);
    
    onResize();
    
    initTextures();
    initBuffers();
}

function createShaderProg(vSrc, fSrc) {
    // compile vertex shader
    var vs = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vs, vSrc);
    gl.compileShader(vs);
    if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
        alert("VS: " + gl.getShaderInfoLog(vs));
        return null;
    }
    // compile fragment shader
    var fs = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fs, fSrc);
    gl.compileShader(fs);
    if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
        alert("FS: " + gl.getShaderInfoLog(fs));
        return null;
    }
    // link program
    var sh = gl.createProgram();
    gl.attachShader(sh, vs);
    gl.attachShader(sh, fs);
    gl.linkProgram(sh);
    if (!gl.getProgramParameter(sh, gl.LINK_STATUS)) {
        alert("Shader link error");
    }
    return sh;
}

function onResize() {
    var w = canvas.width;// = window.innerWidth;
    var h = canvas.height;// = window.innerHeight;
    gl.viewport(0, 0, w, h);
    mat4.perspective(projection, fovy * Math.PI / 180, w / h, 0.1, 1000.0);
    gl.uniformMatrix4fv(shader.projectionLoc, false, projection);
}

var mmStack = [];

function pushMM() {
    mmStack.push(mat4.clone(modelM));
}

function popMM() {
    modelM = mmStack.pop();
}

function setModelM() {
    gl.uniformMatrix4fv(shader.modelMLoc, false, modelM);
}

function triNorm(v1, v2, v3) {
    return vec3.normalize([], vec3.cross([], vec3.sub([], v1, v2), vec3.sub([], v1, v3)));
}

function tri(v1, v2, v3, c) {
    var n = triNorm(v1, v2, v3);
    return [v1[0], v1[1], v1[2], c[0], c[1], c[2], n[0], n[1], n[2],
        v2[0], v2[1], v2[2], c[0], c[1], c[2], n[0], n[1], n[2],
        v3[0], v3[1], v3[2], c[0], c[1], c[2], n[0], n[1], n[2]
    ];
}

var tex;
function initTextures() {
    tex = gl.createTexture();
    var img = new Image();
    img.onload = function() {
        console.log("Image loaded");
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
        gl.generateMipmap(gl.TEXTURE_2D);
    };
    //img.src = "tex.jpg";
}

var modelBuf;
function initBuffers() {
    modelBuf = modelData;
    initBuffer(modelBuf);
}

function initBuffer(model) {
    model.buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, model.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(model), gl.STATIC_DRAW);
    model.numVerts = model.length / 11;
    console.log("Initialized buffer with "+model.numVerts+" verts ("+(model.numVerts/3)+" triangles)");
    model.length = 0; // delete now-unneeded vertex data
}

function drawBuffer(model) {
    gl.bindBuffer(gl.ARRAY_BUFFER, model.buffer);
    gl.vertexAttribPointer(shader.inVertLoc, 3, gl.FLOAT, false, 4 * 11, 0);
    gl.vertexAttribPointer(shader.inColorLoc, 3, gl.FLOAT, false, 4 * 11, 4 * 3);
    gl.vertexAttribPointer(shader.inNormLoc, 3, gl.FLOAT, false, 4 * 11, 4 * 6);
    gl.vertexAttribPointer(shader.inTexCoordsLoc, 2, gl.FLOAT, false, 4 * 11, 4 * 9);
    gl.drawArrays(gl.TRIANGLES, 0, model.numVerts);
}

function initGame() {
    quat.rotateY(camRot, camRot, -Math.PI/4);
    quat.rotateX(camRot, camRot, Math.PI/4);
}

function setColor(r, g, b) {
    gl.uniform3fv(shader.colorLoc, [r, g, b]);
}

var camRot = quat.create();
var lastTime = null;

function drawFrame(time) {
    try {
        if (!lastTime) lastTime = time;
        var rdt = (time - lastTime) / 1000,
            dt = rdt;
        if (dt > 1 / 30) dt = 1 / 30;
        lastTime = time;
        //if (canvas.width != window.innerWidth || canvas.height != window.innerHeight)
        //    onResize();

        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        // view transform
        mat4.identity(viewM);
        mat4.translate(viewM, viewM, [0, 0, -1.3]);
        gl.uniformMatrix4fv(shader.viewMLoc, false, viewM);
        
        mat4.identity(modelM);
        setModelM();
        
        var rotM = mat4.fromQuat([], camRot);
        gl.uniform3fv(shader.lightDirLoc, vec3.normalize([], [1, -1, 0]));
        
        setColor(1,1,1);
        pushMM();
        mat4.mul(modelM, modelM, rotM);
        mat4.scale(modelM, modelM, [modelScale,modelScale,modelScale]);
        mat4.translate(modelM, modelM, vec3.negate([],modelCenter));
        setModelM();
        drawBuffer(modelBuf);
        popMM();
        
        var err = gl.getError();
        if (err == 0) requestAnimationFrame(drawFrame);
        else alert("GL error: " + err);
    } catch (e) {
        alert("drawFrame: " + e.message);
    }
}



console.log("Extracting model data...");
/**
 * TO ADD A PART INTO modelData.JS:
 * 1. Upload part into models folder
 * 2. Run modelparse.js
 *    node modelparse.js pit_display/cheesy-pit/Pit\ Display/actual/homePage/models/<INSERT MODEL HERE>.stl gp
 *      Runtime Parameters: Use gp for most cases
 *      g: generate normals rather than pre-packaged normals in file
 *      r: flip faces
 *      n: flip normals
 *      p: reduce precision of numbers in output model.json, making the file smaller
 * 3. Download the outputted model.json file
 * 4. Add a new line in the modelData.js file, type:
 *    var <insertPartName> = 
 * 5. Cut-paste the model.json text into the new line
 * 6. Rinse and repeat
 *
 * PARTS IN modelData.js:
 *  drive_Gearbox
 *  hood
 *  intake_pivot_bar
 *  superstructure
*/
var modelInfo = superstructure;
var modelData = modelInfo.model;
var modelCenter = modelInfo.avg;
var modelScale = 1/modelInfo.dSize;
console.log("Got model data.");
