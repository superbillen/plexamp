const http = require('http');
const fs = require('fs');
const path = require('path');

// --- INDSTILLINGER ---
const PORT = 8080;
const PLEXAMP_IP = '127.0.0.1';
const PLEXAMP_PORT = 32500;

// Hent status fra Plexamp
const getPlexampStatus = (callback) => {
    const options = {
        hostname: PLEXAMP_IP,
        port: PLEXAMP_PORT,
        path: '/player/timeline/poll?wait=0',
        method: 'GET',
        headers: { 'Accept': 'application/json' }
    };

    const req = http.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            // Tjek om vi spiller (Vi scanner teksten for at undgå plugins)
            const isPlaying = data.includes('state="playing"');
            
            // Find info med tekst-søgning
            const titleMatch = data.match(/title="([^"]+)"/);
            const artistMatch = data.match(/grandparentTitle="([^"]+)"/) || data.match(/parentTitle="([^"]+)"/);
            const thumbMatch = data.match(/thumb="([^"]+)"/);

            const result = {
                state: isPlaying ? 'playing' : 'stopped',
                title: titleMatch ? titleMatch[1] : 'Unknown',
                artist: artistMatch ? artistMatch[1] : '',
                thumb: thumbMatch ? thumbMatch[1] : ''
            };
            callback(null, result);
        });
    });
    
    req.on('error', (e) => {
        callback(null, { state: 'stopped' });
    });
    
    req.end();
};

const server = http.createServer((req, res) => {
    // API: Send status til skærmen
    if (req.url === '/state') {
        getPlexampStatus((err, data) => {
            res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
            res.end(JSON.stringify(data || { state: 'stopped' }));
        });
        return;
    }

    // Proxy: Hent billeder (snyd browseren til at tro de ligger lokalt)
    if (req.url.startsWith('/proxy/')) {
        const thumbPath = req.url.replace('/proxy', '');
        const options = {
            hostname: PLEXAMP_IP,
            port: PLEXAMP_PORT,
            path: thumbPath,
            method: 'GET'
        };
        const proxyReq = http.request(options, (proxyRes) => {
            res.writeHead(proxyRes.statusCode, proxyRes.headers);
            proxyRes.pipe(res);
        });
        proxyReq.on('error', () => res.end());
        proxyReq.end();
        return;
    }

    // Vis hjemmesiden
    let filePath = '.' + req.url;
    if (filePath === './') filePath = './index.html';
    
    const extname = path.extname(filePath);
    const contentType = extname === '.css' ? 'text/css' : 'text/html';

    fs.readFile(path.join(__dirname, filePath), (err, content) => {
        if (err) {
            res.writeHead(500);
            res.end('Fejl: Fandt ikke filen');
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

server.listen(PORT, () => {
    console.log(`UI Server kører på port ${PORT}`);
});
