import { GoogleGenAI } from '@google/genai';
import { useAppStore } from '../store';
import { ChatMessage } from '../types';
import { syncChatMessageToFirebase } from '../services/firebaseSync';

export async function processGeminiCustomerChat(userMessageText: string, customerCode: string) {
  const apiKey = (typeof process !== 'undefined' && (process.env?.API_KEY || process.env?.GEMINI_API_KEY)) || import.meta.env.VITE_GEMINI_API_KEY || '';
  console.log('Gemini Request - API Key check:', apiKey ? 'Present (length: ' + apiKey.length + ')' : 'MISSING / EMPTY');

  if (!apiKey) {
    console.warn('Gemini Notice: API_KEY / VITE_GEMINI_API_KEY is not configured.');
    const fallbackMsg: ChatMessage = {
      id: `ai-err-${Date.now()}`,
      customerCode,
      sender: 'ADMIN',
      type: 'TEXT',
      content: 'Sorry, our AI assistant is currently unavailable. Please try again shortly.',
      timestamp: Date.now(),
      isRead: false
    };
    syncChatMessageToFirebase(fallbackMsg);
    useAppStore.setState(state => ({
      chatMessages: [...state.chatMessages, fallbackMsg]
    }));
    return;
  }

  const payload = {
    model: 'gemini-3.8-flash',
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: `You are Shivam Wholesale AI Assistant for Shivam Wholesale (Imitation, Cosmetics, and Hair Accessories based in Gujarat). A customer (Code: ${customerCode}) has sent the following message: "${userMessageText}". Respond politely, helpfully, and professionally regarding wholesale orders, catalogs, shipping, or stock availability. Keep your answer concise and business-friendly.`
          }
        ]
      }
    ]
  };

  console.log('Gemini Request Payload:', JSON.stringify(payload, null, 2));

  try {
    const ai = new GoogleGenAI({ apiKey });
    let response: any;
    try {
      response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: payload.contents
      });
    } catch (primaryErr: any) {
      console.warn('Gemini primary model notice, attempting fallback to gemini-flash-latest:', primaryErr?.message || primaryErr);
      response = await ai.models.generateContent({
        model: 'gemini-flash-latest',
        contents: payload.contents
      });
    }

    const aiReplyText = response.text || 'Thank you for your message. Our wholesale team will process your request shortly!';
    console.log('Gemini Response Success:', aiReplyText);

    const botMsg: ChatMessage = {
      id: `ai-res-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      customerCode,
      sender: 'ADMIN',
      type: 'TEXT',
      content: aiReplyText,
      timestamp: Date.now(),
      isRead: false
    };

    // Save to Firebase & store under the exact user's conversation ID
    await syncChatMessageToFirebase(botMsg);
    useAppStore.setState(state => ({
      chatMessages: [...state.chatMessages, botMsg]
    }));

  } catch (error: any) {
    console.warn('Gemini Error during generation (actual body):', error?.message || error?.toString?.() || error);
    const fallbackMsg: ChatMessage = {
      id: `ai-err-${Date.now()}`,
      customerCode,
      sender: 'ADMIN',
      type: 'TEXT',
      content: 'Sorry, our AI assistant is currently unavailable. Please try again shortly.',
      timestamp: Date.now(),
      isRead: false
    };
    await syncChatMessageToFirebase(fallbackMsg);
    useAppStore.setState(state => ({
      chatMessages: [...state.chatMessages, fallbackMsg]
    }));
  }
}
