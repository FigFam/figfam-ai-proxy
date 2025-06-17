exports.handler = async function(event, context) {
  // We only need to check for POST now, as Netlify handles the OPTIONS preflight check.
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { skills } = JSON.parse(event.body);
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

    if (!GEMINI_API_KEY) {
      return { statusCode: 500, body: JSON.stringify({error: 'Server configuration error.'}) };
    }
    if (!skills) {
      return { statusCode: 400, body: JSON.stringify({error: 'Skills were not provided.'}) };
    }

    const prompt = `You are an encouraging business coach. A father has listed his skills. Brainstorm 5 simple 'micro-stream' business ideas. His skills are: "${skills}".`;

    const payload = {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            "ideas": { "type": "ARRAY", "items": { "type": "OBJECT", "properties": { "title": { "type": "STRING" }, "description": { "type": "STRING" } } } }
          },
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
      const errorBody = await googleResponse.text();
      return { statusCode: googleResponse.status, body: JSON.stringify({error: `Error from the AI service.`}) };
    }
    
    const result = await googleResponse.json();
    const jsonText = result.candidates[0].content.parts[0].text;
    const parsedJson = JSON.parse(jsonText);

    // Return the successful result. No headers needed here anymore.
    return {
      statusCode: 200,
      body: JSON.stringify(parsedJson.ideas)
    };

  } catch (error) {
    console.error('Proxy Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to process your request.' })
    };
  }
};
