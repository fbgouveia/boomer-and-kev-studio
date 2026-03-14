/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const keyMatch = env.match(/GEMINI_API_KEY=(.*)/);
const apiKey = keyMatch[1].trim().replace(/['"]/g, '');

async function find() {
    const listRes = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`);
    const listData = await listRes.json();
    const models = listData.models.map(m => m.name);

    for (const name of models) {
        for (const v of ['v1beta', 'v1']) {
            const url = `https://generativelanguage.googleapis.com/${v}/${name}:generateContent?key=${apiKey}`;
            try {
                const r = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ contents: [{ parts: [{ text: 'hi' }] }] })
                });
                if (r.ok) {
                    console.log(`SUCCESS => version: ${v}, model: ${name}`);
                    process.exit(0);
                }
            } catch (_e) { }
        }
    }
    console.log("No working model found.");
}

find();
