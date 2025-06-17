const fetch = require('node-fetch');

exports.handler = async function(event, context) {
  // Set up the headers that allow cross-origin requests
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*', // Allows any origin
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS' // Explicitly allow POST and OPTIONS
  };

  // The browser sends an OPTIONS request first to ask for permission.
  // We must respond to it with a 200 OK and the correct headers.
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ message: 'Preflight check successful' })
    };
  }

  // If it's not an OPTIONS request, it must be a POST request.
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  // --- Main Logic from before ---
  try {
    const { skills } = JSON.parse(event.body);
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

    if (!GEMINI_API_KEY) {
      console.error("GEMINI_API_KEY is not set.");
      return { statusCode: 500, body: 'API key not configured.' };
    }
    if (!skills) {
      return { statusCode: 400, body: 'Skills not provided.' };
    }

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
      const errorBody = await googleResponse.text();
      console.error('Google API Error:', errorBody);
      return { statusCode: googleResponse.status, body: `Error from AI service: ${errorBody}` };
    }
    
    const result = await googleResponse.json();
    const jsonText = result.candidates[0].content.parts[0].text;
    const parsedJson = JSON.parse(jsonText);

    return {
      statusCode: 200,
      headers: corsHeaders, // Use the same CORS headers for the actual response
      body: JSON.stringify(parsedJson.ideas)
    };

  } catch (error) {
    console.error('Proxy Error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Failed to process your request.' })
    };
  }
};
