import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function POST(req) {
  try {
    const { messages } = await req.json();
    
    // 🔥 [최종 우회 픽스] 이름 충돌이 없는 가장 안정적인 클래식 모델 사용!
    // (gemini-pro는 호환성을 위해 systemInstruction 옵션을 제거했습니다)
    const model = genAI.getGenerativeModel({ 
      model: "gemini-pro" 
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

    // 🔥 [핵심] systemInstruction 대신, 사용자의 마지막 질문에 '비서 페르소나'를 몰래 끼워 넣어서 보냅니다!
    const lastMessage = messages[messages.length - 1].content;
    const promptWithPersona = `당신은 'The Archive' 앱의 친절하고 똑똑한 AI 비서입니다. 사용자에게 친근하고 간결하게 답변해주세요.\n\n사용자 질문: ${lastMessage}`;
    
    const result = await chat.sendMessage(promptWithPersona);
    const response = await result.response;
    
    return NextResponse.json({ text: response.text() });
    
  } catch (error) {
    console.error('Gemini API Error:', error);
    return NextResponse.json({ error: "답변을 생성하는 데 실패했습니다." }, { status: 500 });
  }
}