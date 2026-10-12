const fs = require('fs');

async function check() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL + '/rest/v1/episodes?select=*';
  const res = await fetch(url, {
    headers: {
      'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      'Authorization': 'Bearer ' + process.env.SUPABASE_SERVICE_ROLE_KEY
    }
  });
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}

check();
