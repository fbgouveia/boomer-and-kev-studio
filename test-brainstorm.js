async function testBrainstorm() {
    const topic = 'NRL vs AFL Rivalry';
    const snippet = 'Boomer Jersey: "AFL SUCKS". Kev Jersey: "RUGBY MY BALLS". Mention Vegas.';

    console.log("🚀 [Neural_Link] Testing Brainstorming Core...");

    try {
        const res = await fetch('http://localhost:3000/api/ai/brainstorm', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ topic, snippet })
        });

        const data = await res.json();

        if (res.status === 429) {
            console.warn("⚠️ [Neural_Link] Rate Limit Detected!");
            console.log(`Wait Time: ${data.retryAfter}s`);
        } else if (res.ok) {
            console.log("✅ [Neural_Link] CONNECTION ESTABLISHED!");
            console.log("Sections Generated:", Object.keys(data).join(', '));
            console.log("Example Hook:", data.hooks?.[0]?.text?.substring(0, 100) + '...');
        } else {
            console.error("❌ [Neural_Link] API Error:", res.status);
            console.log(JSON.stringify(data, null, 2));
        }
    } catch (err) {
        console.error("❌ [Neural_Link] Test Crashed:", err.message);
    }
}

testBrainstorm();
