const http = require('http');
const fs = require('fs');
const path = require('path');

// --- INDSTILLINGER ---
const PORT = 8080;
const PLEXAMP_IP = '127.0.0.1';
const PLEXAMP_PORT = 32500;
// Her er din nøgle, som vi fandt i filen:
const PLEX_TOKEN = 'S6xbNwzPB_snxszfstiyG';

// Hent status fra Plexamp
const getPlexampStatus = (callback) => {
    const options = {
        hostname: PLEXAMP_IP,
        port: PLEXAMP_PORT,
        path: '/player/timeline/poll?wait=0',
        method: 'GET',
        headers: { 
            'Accept': 'application/json',
            'X-Plex-Token': PLEX_TOKEN 
        }
    };

    const req = http.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            // Gør teksten til små bogstaver for nem søgning
            const lowerData = data.toLowerCase();
            
            // TJEK: Er musikken i gang?
            // Vi tjekker bredt efter "playing" i både JSON og XML format
            const isPlaying = lowerData.includes('"state":"playing"') || lowerData.includes('state="playing"');

            // HENT INFO: Titel, Kunstner, Billede
            // Vi bruger Regex (tekst-søgning) da det virker på både XML og JSON
            // Det er mere robust end JSON.parse hvis Plexamp svarer mærkeligt
            
            // Titel
            const titleMatch = data.match(/title="([^"]+)"/) || data.match(/"title":"([^"]+)"/);
            // Kunstner (kan hedde grandparentTitle eller parentTitle)
            const artistMatch = data.match(/grandparentTitle="([^"]+)"/) || data.match(/parentTitle="([^"]+)"/) || 
                              data.match(/"grandparentTitle":"([^"]+)"/) || data.match(/"parentTitle":"([^"]+)"/);
            // Billede (Thumb)
            const thumbMatch = data.match(/thumb="([^"]+)"/) || data.match(/"thumb":"([^"]+)"/);

            const result = {
                state: isPlaying ? 'playing' : 'stopped',
                title: titleMatch ? titleMatch[1] : 'Ukendt',
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

    // Proxy: Hent billeder (Sender nøglen med, så vi får lov at se billedet)
    if (req.url.startsWith('/proxy/')) {
        const thumbPath = req.url.replace('/proxy', '');
        const options = {
            hostname: PLEXAMP_IP,
            port: PLEXAMP_PORT,
            path: thumbPath,
            method: 'GET',
            headers: { 'X-Plex-Token': PLEX_TOKEN }
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

server.listen(PORT, () => {
    console.log(`UI Server kører på port ${PORT}`);
});
