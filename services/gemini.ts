import { GoogleGenAI, Chat, GenerateContentResponse, FunctionDeclaration, Type } from "@google/genai";
import { Attachment } from "../types";

// Singleton instance management
let chatSession: Chat | null = null;
let genAI: GoogleGenAI | null = null;

const getClient = (): GoogleGenAI => {
  if (!genAI) {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      throw new Error("API Key not found in environment variables");
    }
    genAI = new GoogleGenAI({ apiKey });
  }
  return genAI;
};

const getHouseSalesDeclaration: FunctionDeclaration = {
  name: 'getHouseSales',
  description: 'Dapatkan data real-time tentang penjualan rumah termasuk harga, alamat, dan tanggal.',
  parameters: {
    type: Type.OBJECT,
    properties: {}
  }
};

const fetchHouseSales = async () => {
  try {
    const response = await fetch('https://v0-house-sales-app.vercel.app/api/neon');
    if (!response.ok) throw new Error('Network response was not ok');
    return await response.json();
  } catch (error) {
    console.error('Fetch error:', error);
    return { error: 'Gagal mengambil data penjualan' };
  }
};

export const resetChat = () => {
  chatSession = null;
};

export const getChatSession = (): Chat => {
  if (!chatSession) {
    const ai = getClient();
    chatSession = ai.chats.create({
      model: 'gemini-3-pro-preview',
      config: {
        systemInstruction: "Anda adalah asisten AI yang membantu, cerdas, dan ringkas. Jawablah selalu pertanyaan dalam Bahasa Indonesia dengan jelas menggunakan format Markdown jika sesuai. Anda juga dapat membuat gambar dan mencari data penjualan rumah real-time.",
        tools: [{ functionDeclarations: [getHouseSalesDeclaration] }],
      },
    });
  }
  return chatSession;
};

export const sendMessageStream = async (
  message: string,
  attachments: Attachment[] = [],
  onChunk: (text: string) => void
): Promise<void> => {
  const chat = getChatSession();
  
  try {
    // Construct message parts
    let messageContent: any;
    
    if (attachments.length > 0) {
        // If there are attachments, we send an array of parts
        const parts = [];
        // Add attachments first (recommended for context)
        for (const att of attachments) {
            parts.push({
                inlineData: {
                    mimeType: att.mimeType,
                    data: att.data
                }
            });
        }
        // Add text prompt
        if (message) {
            parts.push({ text: message });
        }
        messageContent = parts;
    } else {
        // Just text
        messageContent = message;
    }

    const resultStream = await chat.sendMessageStream({ message: messageContent });
    
    let functionCall = null;

    for await (const chunk of resultStream) {
      const c = chunk as GenerateContentResponse;
      if (c.text) {
        onChunk(c.text);
      }
      
      // Check for function calls
      const calls = c.candidates?.[0]?.content?.parts?.filter(p => p.functionCall);
      if (calls && calls.length > 0) {
        functionCall = calls[0].functionCall;
      }
    }

    // Handle function call if detected
    if (functionCall && functionCall.name === 'getHouseSales') {
        const data = await fetchHouseSales();
        
        // Send the function response back to the model
        // We pass the function response as a message part
        const responseStream = await chat.sendMessageStream({
            message: [{
                functionResponse: {
                    name: 'getHouseSales',
                    response: { result: data }
                }
            }] as any // Cast to allow object structure if type definition is strict on string
        });

        for await (const chunk of responseStream) {
            const c = chunk as GenerateContentResponse;
            if (c.text) {
                onChunk(c.text);
            }
        }
    }

  } catch (error) {
    console.error("Error sending message to Gemini:", error);
    throw error;
  }
};

export const generateImage = async (prompt: string): Promise<string | null> => {
  const ai = getClient();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: prompt }]
      },
      config: {
        imageConfig: {
          aspectRatio: "1:1"
        }
      }
    });

    // Iterate through parts to find the image data
    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          const mimeType = part.inlineData.mimeType || 'image/png';
          return `data:${mimeType};base64,${part.inlineData.data}`;
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error("Error generating image:", error);
    throw error;
  }
};