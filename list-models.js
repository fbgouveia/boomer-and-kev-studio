const https = require('https');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
const keyMatch = env.match(/GEMINI_API_KEY=(.*)/);
if (!keyMatch) {
    console.error('No API key found in .env.local');
    process.exit(1);
}
const apiKey = keyMatch[1].trim().replace(/['"]/g, '');

const options = {
    hostname: 'generativelanguage.googleapis.com',
    port: 443,
    path: `/v1/models?key=${apiKey}`,
    method: 'GET'
};

const req = https.request(options, res => {
    let data = '';
    res.on('data', d => {
        data += d;
    });
    res.on('end', () => {
        try {
            const parsed = JSON.parse(data);
            if (parsed.models) {
                console.log('TARGET MODEL CHECK:');
                const target = parsed.models.find(m => m.name.includes('gemini-2.0-flash-lite'));
                if (target) {
                    console.log(JSON.stringify(target, null, 2));
                } else {
                    console.log('gemini-2.0-flash-lite NOT FOUND in list.');
                    console.log('AVAILABLE MODELS:', parsed.models.map(m => m.name).join(', '));
                }
            } else {
                console.log('NO MODELS FOUND. RESPONSE:', JSON.stringify(parsed, null, 2));
            }
        } catch (e) {
            console.error('PARSE ERROR:', e);
            console.log('RAW DATA:', data);
        }
    });
});

req.on('error', error => {
    console.error('REQUEST ERROR:', error);
});

req.end();
