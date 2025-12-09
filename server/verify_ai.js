import axios from 'axios';

async function testBackend() {
    console.log("🧪 Verifying Node.js Backend & Gemini Integration...");

    const url = "http://localhost:8000/api/ask-ai";
    const payload = { prompt: "Explain tachycardia in 10 words." };

    try {
        const response = await axios.post(url, payload);
        console.log("\n✅ API Response Success!");
        console.log("------------------------------");
        console.log("🤖 AI Answer:", response.data.response);
        console.log("------------------------------");
    } catch (error) {
        console.error("❌ Verification Failed:");
        if (error.response) {
            console.error(`Status: ${error.response.status}`);
            console.error(`Data:`, error.response.data);
        } else {
            console.error(error.message);
        }
        process.exit(1);
    }
}

testBackend();
