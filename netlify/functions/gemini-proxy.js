// The handler function that Netlify will run
exports.handler = async function(event, context) {
  // Define the CORS headers that allow your ClickFunnels page to make requests
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*', // Allows any origin, you can restrict this to your domain if needed
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // The browser sends a preliminary "preflight" OPTIONS request to ask for permission.
  // We must respond to it immediately with a 200 OK status and the correct headers.
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ message: 'CORS preflight check successful' })
    };
  }

  // If it's not a preflight check, we only allow POST requests for our main logic.
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  // --- Main Logic ---
  try {
    // Get the 'skills' from the request sent by the ClickFunnels page
    const { skills } = JSON.parse(event.body);
    // Securely get your API key from the Netlify environment variables
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

    // Error checking
    if (!GEMINI_API_KEY) {
      console.error("CRITICAL: GEMINI_API_KEY environment variable is not set.");
      return { statusCode: 500, headers: corsHeaders, body: 'Server configuration error.' };
    }
    if (!skills) {
      return { statusCode: 400, headers: corsHeaders, body: 'Skills were not provided in the request.' };
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
    
    // Use the built-in 'fetch' available in modern Node.js environments
    const googleResponse = await fetch(googleApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!googleResponse.ok) {
      const errorBody = await googleResponse.text();
      console.error('Google API Error:', errorBody);
      return { statusCode: googleResponse.status, headers: corsHeaders, body: `Error from the AI service.` };
    }
    
    const result = await googleResponse.json();
    const jsonText = result.candidates[0].content.parts[0].text;
    const parsedJson = JSON.parse(jsonText);

    // Return the successful result with the correct CORS headers
    return {
      statusCode: 200,
      headers: corsHeaders,
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
