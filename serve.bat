@echo off
REM Launches a local web server for the Claymation build and opens it in your browser.
REM Double-click this file to play. Close this window to stop the server.

cd /d "%~dp0"

set PORT=8000

echo Starting Penalty Cup (Claymation) on http://localhost:%PORT%/game.html
echo Close this window to stop the server.
echo.

REM Open the game in the default browser after a short delay.
start "" cmd /c "timeout /t 1 >nul & start http://localhost:%PORT%/game.html"

REM Prefer the Python launcher (py), then python, then node.
where py >nul 2>nul && ( py -m http.server %PORT% & goto :eof )
where python >nul 2>nul && ( python -m http.server %PORT% & goto :eof )
where node >nul 2>nul && ( node -e "const h=require('http'),f=require('fs'),p=require('path'),P=%PORT%;h.createServer((q,s)=>{let u=decodeURIComponent(q.url.split('?')[0]);if(u==='/')u='/game.html';const fp=p.join(__dirname,u);f.readFile(fp,(e,d)=>{if(e){s.writeHead(404);s.end('not found');return;}const t={'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.mp3':'audio/mpeg','.wav':'audio/wav'}[p.extname(fp)]||'application/octet-stream';s.writeHead(200,{'Content-Type':t});s.end(d);});}).listen(P,()=>console.log('Serving on http://localhost:'+P));" & goto :eof )

echo.
echo ERROR: Could not find Python or Node.js to run a local server.
echo Install Python from https://www.python.org/ and try again.
pause
