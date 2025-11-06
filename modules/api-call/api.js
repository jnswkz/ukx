import { API } from "/env.js";

const apiUrl = 'https://api.perplexity.ai/chat/completions';
const API_KEY = API;
if (!API_KEY) {
  console.error('API key missing. Set window.API_KEY in your HTML for local testing.');
}
const headers = {
  'accept': 'application/json',
  'content-type': 'application/json',
  'Authorization': `Bearer ${API_KEY}`
};

const payload = {
  model: 'sonar-pro',
  messages: [{ role: 'user', content: 'What were the results of the 2025 French Open Finals?' }]
};

// Try several possible response paths and return first non-empty string
function extractTextFromResponse(data) {
  if (!data) return null;
  // Common response shapes:
  if (typeof data === 'string') return data;
  if (data?.choices?.[0]?.message?.content) return data.choices[0].message.content;
  if (data?.choices?.[0]?.text) return data.choices[0].text;
  if (data?.answer) return data.answer;
  if (data?.result) return data.result;
  if (data?.output) return data.output;
  // fallback: stringify short
  try {
    return JSON.stringify(data).slice(0, 1000); // limit length
  } catch (e) {
    return null;
  }
}

// fetch(apiUrl, {
//   method: 'POST',
//   headers,
//   body: JSON.stringify(payload)
// })
//   .then(r => r.json())
//   .then(data => {
//     const text = extractTextFromResponse(data);
//     if (text) {
//       console.log('reply (text only):', text);
//       // use `text` in your UI instead of the full JSON
//     } else {
//       console.warn('Could not extract text from API response', data);
//     }
//   })
//   .catch(err => console.error(err));

export async function callApi(message){
    const prompt = "You are a Crypto wallet assistant. Answer the user's questions about their UKX crypto wallet in a concise and clear manner."
    message = prompt + "\nUser: " + message;
    const payload = {
        model: 'sonar-pro',
        messages: [{
            role: 'user',
            content: [
                { type: 'text', text: message },
                { type: 'file_url', file_url: { url: 'https://raw.githubusercontent.com/jnswkz/ukx/refs/heads/main/data/data_24h.json' } },
                { type: 'file_url', file_url: { url: 'https://raw.githubusercontent.com/jnswkz/ukx/refs/heads/main/data/data_7d.json' } },
                { type: 'file_url', file_url: { url: 'https://raw.githubusercontent.com/jnswkz/ukx/refs/heads/main/data/data_30_days.json' } }
            ]
        }]
    };
    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload)
        });
        const data = await response.json();
        const text = extractTextFromResponse(data);
         if (text) {
            const cleaned = text
                .replace(/(?:\s*\[\s*(?:\d+(?:\s*,\s*\d+)*)\s*\])+/g, '')
                .replace(/\s{2,}/g, ' ')
                .trim();
            return cleaned;
        } else {
            console.warn('Could not extract text from API response', data);
            return null;
        }
    } catch (err) {
        console.error(err);
        return null;
    }
}