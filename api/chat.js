import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

export default async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  const { message, history = [], currentFiles = [] } = req.body;

  if (!message) {
    return res.status(400).json({ error: "Message is required" });
  }

  try {
    const systemPrompt = `
    You are an expert full-stack developer. 
    When asked to create or edit an app, respond ONLY with a JSON object containing the file structure.
    The JSON should be in this format: {
            "files": [
                {
                    "path": "filename.ext",
                    "content": "file content"
                }
            ],
            "explanation": "Brief explanation of the changes or app"
        }
    
    Current project files:
    ${JSON.stringify(currentFiles.map(f => ({ path: f.path, content: f.content.substring(0, 500) + (f.content.length > 500 ? '...' : '') })), null, 2)}
    
    If the user asks a question that doesn't require code changes, you can still return the JSON format with an empty "files" array and your answer in "explanation".
    
    If you need more information before creating the app, ask the user questions. In this case, return the JSON with an empty "files" array and your questions in "explanation".
    `;

    const messages = [
      { role: "system", content: systemPrompt },
      ...history,
      { role: "user", content: message }
    ];

    const response = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: messages,
    });

    let text = response.choices[0].message.content || "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) text = jsonMatch[0];

    try {
      const jsonResponse = JSON.parse(text);
      res.status(200).json(jsonResponse);
    } catch (e) {
      res.status(200).json({ explanation: text, files: [] });
    }
  } catch (err) {
    console.error("API Error:", err);
    res.status(500).json({ error: err.message || "API Error" });
  }
}
