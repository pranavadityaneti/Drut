
const GEMINI_API_KEY = "AIzaSyArRl5DjNbnMwWQAM3W7pSIDCuCnbVPAy8";

async function listModels() {
    console.log("Listing models...");
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}`;
    try {
        const resp = await fetch(url);
        const data = await resp.json();
        console.log(JSON.stringify(data, null, 2));
    } catch (e) {
        console.error(e);
    }
}

listModels();
