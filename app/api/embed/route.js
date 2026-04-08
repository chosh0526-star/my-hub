import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { text } = await req.json();

    // 1. 환경 변수 체크
    const apiKey = process.env.GEMINI_API_KEY; 
    if (!apiKey) {
      console.error("에러: GEMINI_API_KEY가 서버 설정에 등록되어 있지 않습니다.");
      return NextResponse.json({ error: "API 키 설정 누락" }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    
    // 2. 모델 호출 (text-embedding-004 시도 후 안 되면 001로 자동 후퇴)
    let modelName = "text-embedding-004";
    let result;
    
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      result = await model.embedContent(text);
    } catch (e) {
      console.log("004 모델 실패, 001로 재시도합니다...");
      modelName = "embedding-001";
      const fallbackModel = genAI.getGenerativeModel({ model: modelName });
      result = await fallbackModel.embedContent(text);
    }

    const embedding = result.embedding.values;
    return NextResponse.json({ embedding });

  } catch (error) {
    console.error('Embedding API 서버 내부 에러:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}