import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function POST(req) {
  try {
    const { text } = await req.json();
    
    // 🔥 서버에서 호출할 때는 text-embedding-004가 아주 잘 작동합니다.
    const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
    
    const result = await model.embedContent(text);
    const embedding = result.embedding.values;

    return NextResponse.json({ embedding });
  } catch (error) {
    console.error('Embedding API Error:', error);
    return NextResponse.json({ error: "임베딩 생성 실패" }, { status: 500 });
  }
}