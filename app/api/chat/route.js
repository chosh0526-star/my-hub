import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function POST(req) {
  try {
    const { messages } = await req.json();
    
    // 🔥 [구글 정책 변경 대응 픽스] 2026년 최신 표준 모델인 2.5 Flash로 교체!
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      systemInstruction: "당신은 'The Archive' 앱의 친절하고 똑똑한 AI 비서입니다. 사용자에게 친근하고 간결하게 답변해주세요."
    });

    // 이전 대화 기록 포맷 변환
    let formattedHistory = messages.slice(0, -1).map(m => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }]
    }));

    // 첫 인사말 제거 로직 (유지)
    if (formattedHistory.length > 0 && formattedHistory[0].role === 'model') {
      formattedHistory.shift(); 
    }

    const chat = model.startChat({ history: formattedHistory });
    const lastMessage = messages[messages.length - 1].content;
    
    const result = await chat.sendMessage(lastMessage);
    const response = await result.response;
    
    return NextResponse.json({ text: response.text() });
    
  } catch (error) {
    console.error('Gemini API Error:', error);
    return NextResponse.json({ error: "답변을 생성하는 데 실패했습니다." }, { status: 500 });
  }
}