import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { text } = await req.json();

    const apiKey = process.env.GEMINI_API_KEY; 
    if (!apiKey) {
      console.error("에러: GEMINI_API_KEY가 서버 설정에 등록되어 있지 않습니다.");
      return NextResponse.json({ error: "API 키 설정 누락" }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    
    // 🔥 [최종 픽스] 2026년 구글의 최신 공식 표준 임베딩 모델 이름으로 변경!
    const model = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
    
    const result = await model.embedContent(text);
    // 🔥 [최종 압축] 3072개의 숫자를 앞부분 768개만 잘라냅니다 (MRL 기술!)
    const embedding = result.embedding.values.slice(0, 768);

    return NextResponse.json({ embedding });

  } catch (error) {
    console.error('Embedding API 서버 내부 에러:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}