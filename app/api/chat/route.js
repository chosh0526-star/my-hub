import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

// 환경 변수에서 API 키를 가져와 초기화합니다.
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function POST(req) {
  try {
    const { messages } = await req.json();
    
    // 빠르고 똑똑한 최신 범용 모델 사용
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      // 원한다면 여기에 챗봇의 페르소나를 부여할 수 있습니다.
      systemInstruction: "당신은 'The Archive' 앱의 친절하고 똑똑한 개인 비서입니다. 사용자의 질문에 간결하고 유용하게 답해주세요."
    });

    // 이전 대화 기록을 포맷에 맞게 변환
    let formattedHistory = messages.slice(0, -1).map(m => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }]
    }));

    // 🔥 [버그 픽스] Gemini API 규칙: 첫 대화는 무조건 'user'가 시작해야 함!
    // 프론트엔드에 기본으로 띄워둔 첫 인사말(model)이 배열 맨 앞에 있다면 쏙 빼줍니다.
    if (formattedHistory.length > 0 && formattedHistory[0].role === 'model') {
      formattedHistory.shift(); 
    }

    // 채팅 세션 시작 (기억 유지)
    const chat = model.startChat({ history: formattedHistory });

    // 사용자의 마지막 메시지 전송
    const lastMessage = messages[messages.length - 1].content;
    const result = await chat.sendMessage(lastMessage);
    const response = await result.response;
    
    return NextResponse.json({ text: response.text() });
    
  } catch (error) {
    console.error('Gemini API Error:', error);
    return NextResponse.json({ error: "답변을 생성하는 데 실패했습니다." }, { status: 500 });
  }
}