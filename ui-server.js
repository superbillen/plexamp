const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;
const PLEX_IP = '127.0.0.1';
const PLEX_PORT = 32500;
// Din nøgle:
const TOKEN = 'S6xbNwzPB_snxszfstiyG';

// Funktion der henter data fra Plexamp
const checkPlex = (cb) => {
    // Vi sætter nøglen direkte i URL'en, det er mest stabilt
    const pathUrl = `/player/timeline/poll?wait=0&X-Plex-Token=${TOKEN}`;
    
    const options = {
        hostname: PLEX_IP,
        port: PLEX_PORT,
        path: pathUrl,
        method: 'GET'
    };

    const req = http.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            // Find "state" (playing/stopped) i teksten
            const lower = data.toLowerCase();
            const isPlaying = lower.includes('state="playing"') || lower.includes('"state":"playing"');

            // Find info med tekst-søgning (Regex)
            // Det virker uanset om Plex svarer med XML eller JSON
            const titleMatch = data.match(/title="([^"]+)"/) || data.match(/"title":"([^"]+)"/);
            const artistMatch = data.match(/grandparentTitle="([^"]+)"/) || data.match(/parentTitle="([^"]+)"/) || data.match(/"grandparentTitle":"([^"]+)"/);
            const thumbMatch = data.match(/thumb="([^"]+)"/) || data.match(/"thumb":"([^"]+)"/);

            const result = {
                state: isPlaying ? 'playing' : 'stopped',
                title: titleMatch ? titleMatch[1] : 'Ukendt',
                artist: artistMatch ? artistMatch[1] : '',
                thumb: thumbMatch ? thumbMatch[1] : ''
            };
            cb(result);
        });
    });

    req.on('error', () => cb({ state: 'stopped' }));
    req.end();
};

const server = http.createServer((req, res) => {
    // 1. Skærmen spørger: "Hvad sker der?"
    if (req.url === '/state') {
        checkPlex((data) => {
            res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
            res.end(JSON.stringify(data));
        });
        return;
    }

    // 2. Skærmen beder om billede (Vi henter det med nøglen)
    if (req.url.startsWith('/proxy/')) {
        const thumbPath = req.url.replace('/proxy', '');
        // Hent billede fra Plexamp MED nøglen
        const options = {
            hostname: PLEX_IP,
            port: PLEX_PORT,
            path: thumbPath + `?X-Plex-Token=${TOKEN}`,
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

    // 3. Ellers vis bare HTML-filen
    let filePath = '.' + req.url;
    if (filePath === './') filePath = './index.html';
    
    fs.readFile(path.join(__dirname, filePath), (err, content) => {
        if (err) {
            res.writeHead(500);
            res.end('Fejl');
        } else {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(content, 'utf-8');
        }
    });
});

server.listen(PORT, () => console.log('Kører...'));
