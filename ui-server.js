const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;

const server = http.createServer((req, res) => {
    let filePath = './index.html';
    if (req.url === '/style.css') filePath = './style.css';

    fs.readFile(filePath, (err, content) => {
        if (err) {
            res.writeHead(500);
            res.end('Error loading file');
            return;
        }
        res.writeHead(200, { 'Content-Type': filePath.endsWith('.css') ? 'text/css' : 'text/html' });
        res.end(content, 'utf-8');
    });
});

server.listen(PORT, () => {
    console.log(`UI Server kører på port ${PORT}`);
});