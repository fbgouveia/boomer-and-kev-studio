const fs = require('fs');
const path = require('path');

// Load env variables manually from .env.local
const envPath = path.join(__dirname, '..', '.env.local');
const env = fs.readFileSync(envPath, 'utf8');

const getEnvKey = (key) => {
  const match = env.match(new RegExp(`${key}=(.*)`));
  return match ? match[1].trim().replace(/['"]/g, '') : null;
};

const replicateToken = getEnvKey('REPLICATE_API_TOKEN');
const elevenLabsKey = getEnvKey('ELEVENLABS_API_KEY');

async function executeRealPipeline() {
  console.log("🚀 [Real Pipeline] Starting End-to-End Production Run...");

  // --- STEP 1: Generate Script ---
  const topic = 'Flat White Coffee inflation in Sydney';
  const snippet = 'Boomer holds coffee cup and shouts. Kev drinks from stubby, sighs. 9 dollars is mad.';
  
  console.log(`\n1. Generating Script for: "${topic}"...`);
  const scriptRes = await fetch('http://localhost:3000/api/ai/script', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topic, snippet })
  });

  if (!scriptRes.ok) {
    console.error("❌ Script Generation failed:", await scriptRes.text());
    return;
  }

  const scriptLines = await scriptRes.json();
  console.log(`✅ Script Generated successfully! Total scenes: ${scriptLines.length}`);
  
  // Select first scene for rendering to preserve budget
  const scene = scriptLines[0];
  console.log(`\nScene 1 Target:`);
  console.log(`- Character: ${scene.characterId.toUpperCase()}`);
  console.log(`- Speech: "${scene.text}"`);
  console.log(`- Visual: "${scene.action}"`);

  // --- STEP 2: Generate Voice Over via ElevenLabs API ---
  console.log(`\n2. Synthesizing voice over for Scene 1...`);
  const voiceRes = await fetch('http://localhost:3000/api/ai/voice', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: scene.text,
      characterId: scene.characterId,
      apiKey: elevenLabsKey
    })
  });

  if (!voiceRes.ok) {
    console.error("❌ Voice synthesis failed:", await voiceRes.text());
    return;
  }

  const audioBuffer = await voiceRes.arrayBuffer();
  const audioPath = path.join(__dirname, '..', '.tmp', 'scene_1_voice.mp3');
  fs.writeFileSync(audioPath, Buffer.from(audioBuffer));
  console.log(`✅ Voice synthesized successfully! Saved to: ${audioPath}`);

  // --- STEP 3: Dispatch Video Generation via Kling (Replicate) ---
  console.log(`\n3. Dispatching Kling v2.6 Video Generation...`);
    const renderInput = {
    script: [{
      id: scene.id,
      characterId: scene.characterId,
      text: scene.text,
      shotType: scene.shotType,
      durationEst: scene.durationEst,
      characterReference: scene.characterId === 'boomer' 
        ? 'https://raw.githubusercontent.com/fbgouveia/boomer-and-kev-studio/restore-engine/public/assets/master_boomer.png' 
        : 'https://raw.githubusercontent.com/fbgouveia/boomer-and-kev-studio/restore-engine/public/assets/master_kev.png',
      studioReference: 'https://raw.githubusercontent.com/fbgouveia/boomer-and-kev-studio/restore-engine/public/assets/master_wide.png',
      technicalPrompt: `A photorealistic video of ${scene.characterId === 'boomer' ? 'an older Australian rugged man named Boomer' : 'a deadpan young Australian man named Kev'} sitting at a podcast desk. ${scene.action}. Rembrandt lighting, chessboard contrast, 8k resolution.`
    }],
    engine: 'kling',
    apiKeys: {
      replicate: replicateToken
    }
  };

  const renderRes = await fetch('http://localhost:3000/api/render', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(renderInput)
  });

  if (!renderRes.ok) {
    console.error("❌ Video Generation failed:", await renderRes.text());
    return;
  }

  const renderData = await renderRes.json();
  const job = renderData.results?.[0];
  console.log(`✅ Video Job dispatched successfully!`);
  console.log(`- Status: ${renderData.status}`);
  console.log(`- Mode: ${renderData.mode}`);
  console.log(`- Prediction ID: ${job.predictionId}`);
  console.log(`- Initial Status: ${job.status}`);

  // --- STEP 4: Poll Video Generation status ---
  console.log(`\n4. Polling prediction status from Replicate...`);
  let completed = false;
  let attempts = 0;
  const maxAttempts = 15;

  while (!completed && attempts < maxAttempts) {
    attempts++;
    console.log(`Polling status (Attempt ${attempts}/${maxAttempts})...`);
    
    const statusRes = await fetch(`http://localhost:3000/api/render/status?id=${job.predictionId}`);
    if (statusRes.ok) {
      const statusData = await statusRes.json();
      console.log(`Current Replicate Status: ${statusData.status}`);
      
      if (statusData.status === 'succeeded') {
        completed = true;
        console.log(`\n🎉 SUCCESS! Video compiled successfully.`);
        console.log(`- Final Video URL: ${statusData.output?.[0]}`);
      } else if (statusData.status === 'failed') {
        completed = true;
        console.error(`❌ Replicate Video compilation failed.`);
      }
    } else {
      console.error(`Status check failed: HTTP ${statusRes.status}`);
    }

    if (!completed) {
      // Wait 10 seconds between polls
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
  }

  if (!completed) {
    console.log(`\n⏳ Job is taking longer to render. Replicate ID is: ${job.predictionId}`);
    console.log(`You can track it in the dashboard or via: http://localhost:3000/api/render/status?id=${job.predictionId}`);
  }
}

executeRealPipeline();
