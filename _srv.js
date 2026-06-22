const http=require('http'),fs=require('fs'),path=require('path');
const ROOT=__dirname;
const TYPES={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.fbx':'application/octet-stream','.glb':'model/gltf-binary','.mp3':'audio/mpeg','.wav':'audio/wav'};
http.createServer((req,res)=>{
  let f=req.url.split('?')[0].replace(/^\//,'')||'index.html';
  const fp=path.join(ROOT,decodeURIComponent(f));
  if(fs.existsSync(fp)&&fs.statSync(fp).isFile()){
    res.writeHead(200,{'Content-Type':TYPES[path.extname(fp)]||'application/octet-stream'});
    res.end(fs.readFileSync(fp));
  } else { res.writeHead(404);res.end('not found'); }
}).listen(7901,'127.0.0.1',()=>console.log('srv on 7901'));
