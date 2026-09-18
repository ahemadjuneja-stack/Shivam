import { GoogleGenAI } from '@google/genai';
import { db, COLLECTIONS } from '../src/firebase';
import { collection, onSnapshot, query, where, getDocs, doc, setDoc, serverTimestamp } from 'firebase/firestore';

export function initGeminiAutoResponder() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('GEMINI_API_KEY is not set. Gemini auto-responder is disabled.');
    return;
  }

  const ai = new GoogleGenAI({ apiKey });
  const processedMessageIds = new Set<string>();

  console.log('Initializing Gemini Auto-Responder listener on chat_messages...');

  const messagesCol = collection(db, COLLECTIONS.MESSAGES);
  
  onSnapshot(messagesCol, async (snapshot) => {
    for (const change of snapshot.docChanges()) {
      if (change.type === 'added') {
        const msgDoc = change.doc;
        const data = msgDoc.data() as any;
        const msgId = data.id || data.messageId || msgDoc.id;

        // Skip if already processed or if message is from admin
        if (processedMessageIds.has(msgId) || data.sender === 'admin' || data.sender === 'Shivam Admin') {
          continue;
        }

        // Skip historical messages older than 2 minutes on startup
        const msgTimestamp = data.timestamp?.toMillis ? data.timestamp.toMillis() : (data.createdAt || Date.now());
        if (Date.now() - msgTimestamp > 120000) {
          processedMessageIds.add(msgId);
          continue;
        }

        const text = (data.text || data.message || '').toLowerCase();
        const customerId = data.customerId || data.customerCode || '';

        // Keywords check for order or parcel status
        const keywords = ['parcel', 'maal', 'order', 'dispatch', 'nikal gaya', 'tracking', 'kahan pahucha', 'delivery', 'status', 'bheja', 'bheji', 'pahucha', 'kab aayega', 'aaya kya'];
        const isStatusQuery = keywords.some(kw => text.includes(kw));

        if (!isStatusQuery) {
          continue;
        }

        // Mark as processed immediately
        processedMessageIds.add(msgId);

        console.log(`Auto-responder triggered for customer ${customerId} query: "${text}"`);

        // Strict Security & Zero-PII Policy: Fetch active order and extract ONLY status string
        let orderStatus = 'Pending';
        let hasActiveOrder = false;
        try {
          const ordersCol = collection(db, COLLECTIONS.ORDERS);
          const orderQuery = query(ordersCol, where('customerId', '==', customerId));
          const orderSnap = await getDocs(orderQuery);
          
          if (!orderSnap.empty) {
            let latestOrder: any = null;
            let latestTime = 0;
            orderSnap.forEach(oDoc => {
              const oData = oDoc.data() as any;
              const t = oData.createdAt || 0;
              if (t >= latestTime) {
                latestTime = t;
                latestOrder = oData;
              }
            });

            if (latestOrder) {
              hasActiveOrder = true;
              orderStatus = latestOrder.status || latestOrder.overallStatus || 'Pending';
            }
          }
        } catch (err) {
          console.error('Error fetching customer active order for auto-responder:', err);
        }

        // Call Gemini API with strict system instructions and zero PII
        let botReply = '';
        try {
          const systemInstruction = `You are an automated support assistant for Shivam Showroom. Your ONLY role is to politely inform the customer about their current parcel/order status in Hinglish.
STRICT RULES:
- Tone: Polite store support.
- Response Format: 'Namaste! Aapka order check kiya gaya hai. Abhi aapke maal/parcel ka status [Status] hai. Baki ki zaruri details humari team aapko jald hi provide karegi. Dhanyawad!'
- If no active order is found: 'Namaste! Aapke account se koi active pending order nahi dikh raha hai. Humari team jald hi aapse yahan connect karegi. Dhanyawad!'
- STRICTLY FORBIDDEN: Never disclose customer IDs, phone numbers, addresses, backend logic, code, APK source links, Firebase structure, or dashboard URLs.
- If asked anything off-topic or sensitive, reply: 'Is baare me jaankari ke liye kripya direct showroom admin se sampark karein. Dhanyawad!'`;

          const prompt = hasActiveOrder 
            ? `Customer order status: ${orderStatus}. Generate response adhering strictly to the response format.`
            : `No active order found. Generate response for no pending order.`;

          const response = await ai.models.generateContent({
            model: 'gemini-3.8-flash',
            contents: prompt,
            config: {
              systemInstruction,
              temperature: 0.3
            }
          });

          botReply = response.text ? response.text.trim() : '';
        } catch (geminiErr) {
          console.error('Gemini API error in auto-responder:', geminiErr);
          if (hasActiveOrder) {
            botReply = `Namaste! Aapka order check kiya gaya hai. Abhi aapke maal/parcel ka status ${orderStatus} hai. Baki ki zaruri details humari team aapko jald hi provide karegi. Dhanyawad!`;
          } else {
            botReply = `Namaste! Aapke account se koi active pending order nahi dikh raha hai. Humari team jald hi aapse yahan connect karegi. Dhanyawad!`;
          }
        }

        if (!botReply) {
          if (hasActiveOrder) {
            botReply = `Namaste! Aapka order check kiya gaya hai. Abhi aapke maal/parcel ka status ${orderStatus} hai. Baki ki zaruri details humari team aapko jald hi provide karegi. Dhanyawad!`;
          } else {
            botReply = `Namaste! Aapke account se koi active pending order nahi dikh raha hai. Humari team jald hi aapse yahan connect karegi. Dhanyawad!`;
          }
        }

        // Save response back to Firestore under respective customer thread as 'admin' ('Shivam Admin')
        const replyMsgId = `auto-reply-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const replyPayload = {
          id: replyMsgId,
          messageId: replyMsgId,
          customerId,
          customerCode: customerId,
          shopName: 'Shivam Admin',
          sender: 'admin',
          type: 'text',
          text: botReply,
          message: botReply,
          mediaUrl: null,
          isRead: false,
          read: false,
          timestamp: serverTimestamp(),
          createdAt: Date.now()
        };

        try {
          const replyRef = doc(db, COLLECTIONS.MESSAGES, replyMsgId);
          await setDoc(replyRef, replyPayload, { merge: true });

          try {
            const convReplyRef = doc(db, COLLECTIONS.CONVERSATIONS, customerId, 'messages', replyMsgId);
            await setDoc(convReplyRef, replyPayload, { merge: true });
          } catch {}

          try {
            const altReplyRef = doc(db, 'messages', replyMsgId);
            await setDoc(altReplyRef, replyPayload, { merge: true });
          } catch {}

          console.log(`Auto-responder successfully replied to customer ${customerId}`);
        } catch (saveErr) {
          console.error('Error saving auto-responder reply to Firestore:', saveErr);
        }
      }
    }
  }, (err) => {
    console.error('Auto-responder Firestore listener error:', err);
  });
}
