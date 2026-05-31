const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const keyMatch = env.match(/GEMINI_API_KEY=(.*)/);
const apiKey = keyMatch[1].trim().replace(/['"]/g, '');

async function findWorkingModel() {
    const listRes = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`);
    const listData = await listRes.json();
    const models = listData.models.map(m => m.name);
    const versions = ['v1beta', 'v1'];

    for (const name of models) {
        for (const version of versions) {
            const url = `https://generativelanguage.googleapis.com/${version}/${name}:generateContent?key=${apiKey}`;
            try {
                const res = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ contents: [{ parts: [{ text: "hi" }] }] })
                });
                if (res.ok) {
                    console.log(`FOUND_SUCCESS_URL: ${url}`);
                    return;
                }
            } catch (err) { }
        }
    }
}

findWorkingModel();
