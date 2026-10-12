async function test() {
    const topic = 'NRL vs AFL Rivalry';
    const snippet = 'Boomer Jersey: "AFL SUCKS". Kev Jersey: "RUGBY MY BALLS". Boomer shouts "YEAH VEGAS BABY!". Kev raises arms in frustration while Boomer shadow boxes. Mention fair dinkum ticket prices.';

    console.log("--- STARTING NEURAL TEST ---");
    console.log(`Topic: ${topic}`);
    console.log(`Notes: ${snippet}`);

    try {
        const res = await fetch('http://localhost:3000/api/ai/script', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ topic, snippet })
        });
        const data = await res.json();
        console.log("--- ENGINE RESPONSE RECEIVED ---");
        console.log(JSON.stringify(data, null, 2));
    } catch (err) {
        console.error("TEST_CRASH:", err);
    }
}

test();
