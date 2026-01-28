const http = require('http');
const fs = require('fs');
const path = require('path');

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
            // --- HER VAR FEJLEN FØR ---
            // Nu tjekker vi BÅDE for JSON format og XML format
            // Vi gør teksten til små bogstaver, så vi ikke misser noget
            const lowerData = data.toLowerCase();
            
            // Er den playing? (Meget bred søgning)
            const isPlaying = lowerData.includes('"state":"playing"') || lowerData.includes('state="playing"');

            // Find titlen (Prøv JSON måde først, ellers Regex)
            let title = 'Ukendt';
            let artist = '';
            let thumb = '';

            try {
                // Prøv at læse det som rigtig data
                const json = JSON.parse(data);
                const entry = json.MediaContainer.Timeline[0];
                title = entry.title;
                artist = entry.grandparentTitle || entry.parentTitle;
                thumb = entry.thumb;
            } catch (e) {
                // Hvis det fejler, brug "grov" tekst-søgning
                const titleMatch = data.match(/title="([^"]+)"/);
                const artistMatch = data.match(/grandparentTitle="([^"]+)"/);
                const thumbMatch = data.match(/thumb="([^"]+)"/);
                
                if (titleMatch) title = titleMatch[1];
                if (artistMatch) artist = artistMatch[1];
                if (thumbMatch) thumb = thumbMatch[1];
            }

            const result = {
                state: isPlaying ? 'playing' : 'stopped',
                title: title || 'Ukendt',
                artist: artist || '',
                thumb: thumb || ''
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
    // API: Status
    if (req.url === '/state') {
        getPlexampStatus((err, data) => {
            res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
            res.end(JSON.stringify(data || { state: 'stopped' }));
        });
        return;
    }

    // Proxy: Billeder
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

    // HTML Filer
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
