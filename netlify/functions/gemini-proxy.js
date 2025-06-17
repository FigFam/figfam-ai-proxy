const fetch = require('node-fetch');

exports.handler = async function(event, context) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { skills } = JSON.parse(event.body);
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

    if (!GEMINI_API_KEY) { return { statusCode: 500, body: 'API key not configured.' }; }
    if (!skills) { return { statusCode: 400, body: 'Skills not provided.' }; }

    const prompt = `You are an encouraging business coach. A father has listed his skills. Brainstorm 5 simple 'micro-stream' business ideas. His skills are: "${skills}".`;

    const payload = {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
              type: "OBJECT",
              properties: { "ideas": { "type": "ARRAY", "items": { "type": "OBJECT", "properties": { "title": { "type": "STRING" }, "description": { "type": "STRING" } } } } },
          }
      }
    };

    const googleApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

    const googleResponse = await fetch(googleApiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (!googleResponse.ok) {
        console.error('Google API Error:', await googleResponse.text());
        return { statusCode: googleResponse.status, body: 'Error from AI service.' };
    }

    const result = await googleResponse.json();
    const jsonText = result.candidates[0].content.parts[0].text;
    const parsedJson = JSON.parse(jsonText);

    return {
        statusCode: 200,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify(parsedJson.ideas)
    };

  } catch (error) {
    console.error('Proxy Error:', error);
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to process your request.' }) };
  }
};
