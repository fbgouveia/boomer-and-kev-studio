/* eslint-disable @typescript-eslint/no-require-imports */
const https = require('https');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const keyMatch = env.match(/GEMINI_API_KEY=(.*)/);
const apiKey = keyMatch[1].trim().replace(/['"]/g, '');

const options = {
    hostname: 'generativelanguage.googleapis.com',
    port: 443,
    path: `/v1beta/models/gemini-1.5-flash?key=${apiKey}`,
    method: 'GET'
};

console.log(`🔍 Checking Model Metadata: ${options.path}`);

const req = https.request(options, res => {
    let data = '';
    res.on('data', d => data += d);
    res.on('end', () => {
        console.log("Status:", res.status);
        console.log("Response:", data);
    });
});

req.on('error', e => console.error(e));
req.end();
