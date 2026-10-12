const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
  if (line && line.includes('=')) {
    const [key, val] = line.split('=');
    acc[key.trim()] = val.trim();
  }
  return acc;
}, {});
fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/bucket`, {
  method: 'POST',
  headers: {
    'apikey': env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    id: "videos",
    name: "videos",
    public: true
  })
}).then(r => r.json()).then(console.log).catch(console.error);
