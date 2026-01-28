const http = require('http');
const fs = require('fs');
const path = require('path');

const server = http.createServer((request, response) => {
    let filePath = '.' + request.url;
    if (filePath == './') {
        filePath = './index.html';
    }

    let extname = path.extname(filePath);
    let contentType = 'text/html';
    switch (extname) {
        case '.js': contentType = 'text/javascript'; break;
        case '.css': contentType = 'text/css'; break;
        case '.json': contentType = 'application/json'; break;
        case '.png': contentType = 'image/png'; break;
        case '.jpg': contentType = 'image/jpg'; break;
    }

    fs.readFile(filePath, function(error, content) {
        if (error) {
            if(error.code == 'ENOENT'){
                response.writeHead(404);
                response.end('Fil ikke fundet');
            } else {
                response.writeHead(500);
                response.end('Fejl: '+error.code);
            }
        } else {
            response.writeHead(200, { 'Content-Type': contentType });
            response.end(content, 'utf-8');
        }
    });
});

server.listen(8080);
console.log('Server kører på port 8080');
