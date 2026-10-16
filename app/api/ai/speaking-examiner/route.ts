import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

const SYSTEM_PROMPT = `You are a strict but professional IELTS Speaking Examiner. 
The user is taking an IELTS Speaking mock test.
The user's test mode is: {MODE} (Can be Part 1, Part 2, Part 3, or Full Test).
The topic for this test is: "{TOPIC}".

Rules:
1. ONLY act as the examiner. DO NOT play both sides.
2. Ask one question at a time. WAIT for the candidate's response.
3. Keep your responses short, natural, and conversational (spoken English). DO NOT output markdown, bold text, or lists.
4. DO NOT evaluate the user's answer immediately. Just acknowledge and move to the next question.
5. If MODE is "Full Test":
   - Start with Part 1 (3-4 questions about familiar topics).
   - Then say: "Now, I'm going to give you a topic, and I'd like you to talk about it for one to two minutes. Before you talk, you'll have one minute to think about what you're going to say. You can make some notes if you wish. Here is your topic: [Read the Part 2 cue card]. You have 1 minute to prepare."
   - Then wait. In the next turn, after the user says they are ready, say: "Please start speaking now."
   - After the user speaks for Part 2, move to Part 3 (4-5 abstract questions related to Part 2).
   - Finally, conclude the test with: "That is the end of the speaking test. Thank you."
6. If the user's input is empty or unintelligible, ask them to repeat or move on.
7. You are part of an API. The client will send you the conversation history. You just generate the next thing the examiner says.
`;

export async function POST(req: NextRequest) {
  try {
    const { history, mode, topic } = await req.json();

    if (!history || !Array.isArray(history)) {
      return NextResponse.json({ error: 'Missing conversation history' }, { status: 400 });
    }

    const fallbackModels = [
      'gemini-flash-latest',
      'gemini-3.6-flash',
      'gemini-3.5-flash',
      'gemini-pro-latest'
    ];

    const prompt = SYSTEM_PROMPT.replace('{MODE}', mode || 'Full Test').replace('{TOPIC}', topic || 'Random');

    const formattedHistory = history.map((msg: any) => ({
      role: msg.role === 'examiner' ? 'model' : 'user',
      parts: [{ text: msg.text }]
    }));

    let latestMessage = "Hello, examiner.";
    if (formattedHistory.length > 0) {
      latestMessage = history[history.length - 1].text;
    }

    let result;
    let lastError;

    for (const modelName of fallbackModels) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const chat = model.startChat({
          history: [
            { role: 'user', parts: [{ text: prompt }] },
            { role: 'model', parts: [{ text: "Understood. I am ready to start the IELTS Speaking test." }] },
            ...formattedHistory.slice(0, -1) // All except the latest user message
          ],
        });
        result = await chat.sendMessage(latestMessage);
        if (result) break;
      } catch (e: any) {
        lastError = e;
        console.warn(`Model ${modelName} failed: ${e.message}`);
      }
    }

    if (!result) {
      throw lastError || new Error('All models failed');
    }

    const responseText = result.response.text();

    return NextResponse.json({ response: responseText });

  } catch (error: any) {
    console.error('Error in speaking-examiner:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
