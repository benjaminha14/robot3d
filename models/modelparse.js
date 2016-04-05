var fs = require("fs");

var filename = process.argv[2];
if (!filename) {
    console.error("Usage: node modelparse.js [file]");
    return;
}
var fileType = /\.(\w+)$/.exec(filename);
if (!fileType) {
    console.error("Cannot determine file extension");
    return;
}
fileType = fileType[1].toLowerCase();
if (fileType!="stl" && fileType!="obj") {
    console.error("Unsupported file type: "+fileType);
    return;
}
console.log("File type: "+fileType);
var opts = process.argv[3];
var genNorms = opts&&opts.indexOf("g")>-1;
var revFaces = opts&&opts.indexOf("r")>-1;
var revNorms = (opts&&opts.indexOf("n")>-1) != revFaces;
var redPrec = opts&&opts.indexOf("p")>-1;
var optArr = [];if(genNorms)optArr.push("generate normals");if(revFaces)optArr.push("reverse faces");if(revNorms)optArr.push("invert normals");if(redPrec)optArr.push("reduce precision");
if (optArr.length>0)console.log("Options: "+optArr.join(", "));

var mtls = {};
if (fileType=="obj") {
  var mtlFilename = filename.replace(/obj$/i,"mtl");
  try {
    var data = fs.readFileSync(mtlFilename, "utf8");
    console.log("Read file: "+mtlFilename);
    var lines = data.split(/\n/);
    var curM;
    for (var li in lines) {
      var line = lines[li].trim();
      var m;
      if (m=line.match(/^newmtl\s+(\S+)/))
        mtls[curM=m[1]] = {};
      else if (m=line.match(/^Kd\s+(\S+)\s+(\S+)\s+(\S+)/))
        mtls[curM].color = {r:parseFloat(m[1]),g:parseFloat(m[2]),b:parseFloat(m[3])};
    }
    var numMats = Object.keys(mtls).length;
    console.log("Parsed "+numMats+" material"+(numMats==1?"":"s"));
  } catch (err) {
    console.log("Didn't find .mtl file");
  }
}//console.dir(mtls);
fs.readFile(filename, "utf8", function(err, data) {
  console.log("Read file: "+filename);
  var out = fileType=="stl"?parseSTL(data):parseOBJ(data);
  fs.writeFile("model.json", JSON.stringify(out), "utf8", function(err) {
      if (err) console.error(err.toString());
      else console.log("Wrote model.json");
  });
});

function vertexMeta() {
  return {
    vertCount:null,
    avgX:null,avgY:null,avgZ:null,
    recordVert: function(x,y,z) {
      this.avgX = (this.avgX*this.vertCount + x)/(this.vertCount+1);
      this.avgY = (this.avgY*this.vertCount + y)/(this.vertCount+1);
      this.avgZ = (this.avgZ*this.vertCount + z)/(this.vertCount+1);
      if (!this.maxX || x>this.maxX) this.maxX = x;
      if (!this.minX || x<this.minX) this.minX = x;
      if (!this.maxY || y>this.maxY) this.maxY = y;
      if (!this.minY || y<this.minY) this.minY = y;
      if (!this.maxZ || z>this.maxZ) this.maxZ = z;
      if (!this.minZ || z<this.minZ) this.minZ = z;
      this.vertCount++;
    }
  };
}

function parseOBJ(input) {
    console.log("Parsing OBJ...");
    var out = [];
    var lines = input.trim().split(/\s*\n\s*/);
    var vm = vertexMeta();
    var vs = [], ts = [], ns = [];
    var curM;
    function parseVert(tok) {
      var is = tok.split("/");
      var v = vs[is[0]-1];
      var t = ts[(is[1]||is[0])-1];
      var n = genNorms?null:ns[(is[2]||is[0])-1];
      return {
        x:v[0],y:v[1],z:v[2],
        hasT: !!t,
        tx:t?t[0]:0,ty:t?t[1]:0,tz:t?t[2]:0,
        hasN: !!n,
        nx:n?n[0]:null,ny:n?n[1]:null,nz:n?n[2]:null
      };
    }
    function triNorm(v1, v2, v3) {
      var u = {x:v2.x-v1.x,y:v2.y-v1.y,z:v2.z-v1.z};
      var v = {x:v3.x-v1.x,y:v3.y-v1.y,z:v3.z-v1.z};
      var c = {x:u.z*v.y-u.y*v.z,y:u.x*v.z-u.z*v.x,z:u.y*v.x-u.x*v.y};
      var mag = Math.sqrt(c.x*c.x + c.y*c.y + c.z*c.z);
      return {x:c.x/mag,y:c.y/mag,z:c.z/mag};
    }
    for (var li in lines) {
      var line = lines[li];
      if (line.startsWith("#")) continue;
      var toks = line.split(/\s+/);
      var nToks = toks.map(x => parseFloat(x));
      var op = toks[0];
      switch (op) {
        case "v":
          vs.push([nToks[1],nToks[2],nToks[3]]);
          vm.recordVert(nToks[1],nToks[2],nToks[3]);
          break;
        case "vn":
          ns.push([nToks[1],nToks[2],nToks[3]]);
          break;
        case "vt":
          ts.push([nToks[1],nToks[2],nToks[3]||0]);
          break;
        case "usemtl":
          curM = toks[1];
          break;
        case "f":
          var v1_ = parseVert(toks[1]), v2 = parseVert(toks[2]);
          for (var i=3; i<toks.length; i++) {
            var v3_ = parseVert(toks[i]);
            var n = triNorm(v1_,v2,v3_);
            var n1_ = v1_.hasN?{x:v1_.nx,y:v1_.ny,z:v1_.nz}:n;
            var n2 = v2.hasN?{x:v2.nx,y:v2.ny,z:v2.nz}:n;
            var n3_ = v3_.hasN?{x:v3_.nx,y:v3_.ny,z:v3_.nz}:n;
            if (revNorms) {
              n1_.x*=-1;n1_.y*=-1;n1_.z*=-1;n2.x*=-1;n2.y*=-1;n2.z*=-1;n3_.x*=-1;n3_.y*=-1;n3_.z*=-1;
            }
            var v1=revFaces?v3_:v1_, n1=revFaces?n3_:n1_;
            var v3=revFaces?v1_:v3_, n3=revFaces?n1_:n3_;
            var c = mtls[curM]? mtls[curM].color : {r:0,g:1,b:1};
            out.push(v1.x,v1.y,v1.z,c.r,c.g,c.b,n1.x,n1.y,n1.z,v1.tx,v1.ty,
                     v2.x,v2.y,v2.z,c.r,c.g,c.b,n2.x,n2.y,n2.z,v2.tx,v2.ty,
                     v3.x,v3.y,v3.z,c.r,c.g,c.b,n3.x,n3.y,n3.z,v3.tx,v3.ty);
            v2 = v3_;
          }
          break;
      }
    }
    if (redPrec) {
      console.log("Reducing precision...");
      out = out.map(n => {var s=n.toPrecision(5);return s.length>n.toString().length?n:parseFloat(s)});
    }
    console.log("Done: "+out.length/11/3+" triangles.");
    var p = 3;
    console.log("Average coords: ["+vm.avgX.toFixed(p)+", "+vm.avgY.toFixed(p)+", "+vm.avgZ.toFixed(p)+"]");
    console.log("Max coords: ["+vm.maxX.toFixed(p)+", "+vm.maxY.toFixed(p)+", "+vm.maxZ.toFixed(p)+"]");
    console.log("Min coords: ["+vm.minX.toFixed(p)+", "+vm.minY.toFixed(p)+", "+vm.minZ.toFixed(p)+"]");
    var dx=vm.minX-vm.maxX, dy=vm.minY-vm.maxY, dz=vm.minZ-vm.maxZ;
    var dSize = Math.sqrt(dx*dx + dy*dy + dz*dz);
    console.log("Diagonal size: "+dSize.toFixed(p));
    return {model:out, avg:[vm.avgX,vm.avgY,vm.avgZ], min:[vm.minX,vm.minY,vm.minZ], max:[vm.maxX,vm.maxY,vm.maxZ], dSize:dSize, file:filename};
}

function parseSTL(input) {
    console.log("Parsing STL...");
    var out = [];
    var arr;
    var rx = /facet\s+normal\s+(\S+)\s+(\S+)\s+(\S+)\s+outer\s+loop\s+vertex\s+(\S+)\s+(\S+)\s+(\S+)\s+vertex\s+(\S+)\s+(\S+)\s+(\S+)\s+vertex\s+(\S+)\s+(\S+)\s+(\S+)\s+endloop/gi;
    var count = 0;
    var vm = vertexMeta();
    while (arr=rx.exec(input)) {
        arr = arr.map(x => parseFloat(x));
        if (revNorms) {
          arr[1]*=-1;arr[2]*=-1;arr[3]*=-1;
        }
        if (revFaces) {
          var t1=arr[4],t2=arr[5],t3=arr[6];
          arr[4]=arr[10];arr[5]=arr[11];arr[6]=arr[12];
          arr[10]=t1;arr[11]=t2;arr[12]=t3;
        }
        out.push(arr[4],arr[5],arr[6],1,1,1,arr[1],arr[2],arr[3],0,0, arr[7],arr[8],arr[9],1,1,1,arr[1],arr[2],arr[3],0,0, arr[10],arr[11],arr[12],1,1,1,arr[1],arr[2],arr[3],0,0);
        
        vm.recordVert(arr[4],arr[5],arr[6]);
        vm.recordVert(arr[7],arr[8],arr[9]);
        vm.recordVert(arr[10],arr[11],arr[12]);
        
        if (++count % 25000 == 0)
            console.log("Processed "+count+" triangles...");
    }
    if (redPrec) {
      console.log("Reducing precision...");
      out = out.map(n => {var s=n.toPrecision(5);return s.length>n.toString().length?n:parseFloat(s)});
    }
    console.log("Done: "+out.length/11/3+" triangles.");
    var p = 3;
    console.log("Average coords: ["+vm.avgX.toFixed(p)+", "+vm.avgY.toFixed(p)+", "+vm.avgZ.toFixed(p)+"]");
    console.log("Max coords: ["+vm.maxX.toFixed(p)+", "+vm.maxY.toFixed(p)+", "+vm.maxZ.toFixed(p)+"]");
    console.log("Min coords: ["+vm.minX.toFixed(p)+", "+vm.minY.toFixed(p)+", "+vm.minZ.toFixed(p)+"]");
    var dx=vm.minX-vm.maxX, dy=vm.minY-vm.maxY, dz=vm.minZ-vm.maxZ;
    var dSize = Math.sqrt(dx*dx + dy*dy + dz*dz);
    console.log("Diagonal size: "+dSize.toFixed(p));
    return {model:out, avg:[vm.avgX,vm.avgY,vm.avgZ], min:[vm.minX,vm.minY,vm.minZ], max:[vm.maxX,vm.maxY,vm.maxZ], dSize:dSize, file:filename};
}