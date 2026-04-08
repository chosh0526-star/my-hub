import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js'; // 🔥 Supabase 클라이언트 추가

// 1. API 키 및 Supabase 연결 세팅
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL, 
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export async function POST(req) {
  try {
    const { messages } = await req.json();
    const lastMessage = messages[messages.length - 1].content; // 사용자의 최신 질문

    // ==========================================
    // 💡 [핵심 1] 사용자 질문을 숫자로 번역해서 검색하기
    // ==========================================
    const embeddingModel = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
    const embedResult = await embeddingModel.embedContent(lastMessage);
    const queryEmbedding = embedResult.embedding.values.slice(0, 768); // 768차원 압축!

    // ==========================================
    // 💡 [핵심 2] DB에서 가장 비슷한 카드 찾아오기 (Phase 1에서 만든 함수 호출!)
    // ==========================================
    const { data: searchResults, error: searchError } = await supabase.rpc('match_dashboard_items', {
      query_embedding: queryEmbedding,
      match_threshold: 0.3, // 30% 이상 비슷한 내용 다 가져오기
      match_count: 5        // 최대 5장까지
    });

    if (searchError) throw searchError;

    // ==========================================
    // 💡 [핵심 3] 찾은 기록을 챗봇에게 몰래 전달할 "컨텍스트"로 만들기
    // ==========================================
    let contextText = "아래는 사용자의 'The Archive' 저장소에서 찾은 관련 기록입니다:\n\n";
    if (searchResults && searchResults.length > 0) {
      searchResults.forEach((item, index) => {
        contextText += `[기록 ${index + 1}] 제목: ${item.title}\n내용: ${item.content}\n\n`;
      });
    } else {
      contextText += "현재 질문과 일치하는 저장된 기록이 없습니다.\n\n";
    }

    // ==========================================
    // 💡 [핵심 4] 챗봇 출격 (하이브리드 모드: 내 기록 + 웹 검색)
    // ==========================================
    const chatModel = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      // 🔥 1. 최면(프롬프트) 변경: 우선순위를 정해줍니다.
      systemInstruction: `당신은 'The Archive' 앱의 친절하고 똑똑한 만능 AI 비서입니다.
      
      [답변 규칙]
      1. 우선순위 1: 제공된 [저장소 기록]에 사용자의 질문과 관련된 내용이 있다면, "기록에 따르면~" 이라고 먼저 알려주세요.
      2. 우선순위 2: 저장소 기록에 내용이 없거나, 날씨/뉴스/일반 상식 등 범용적인 질문이라면 당신의 방대한 지식과 검색 기능을 활용해 자유롭게 답변하세요.
      3. 답변은 항상 자연스럽고 친절한 말투로 작성하세요.`,
      
      // 🔥 2. 구글 실시간 웹 검색 도구 장착! (이 한 줄로 인터넷이 연결됩니다)
      tools: [{ googleSearch: {} }],
    });

    // 챗봇에게는 "찾아온 기록"과 "사용자의 원래 질문"을 합쳐서 던져줍니다!
    const finalPrompt = `${contextText}\n사용자의 실제 질문: ${lastMessage}`;

    // 이전 대화 기록 포맷 변환 및 첫 인사말 제거
    let formattedHistory = messages.slice(0, -1).map(m => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }]
    }));
    if (formattedHistory.length > 0 && formattedHistory[0].role === 'model') {
      formattedHistory.shift(); 
    }

    const chat = chatModel.startChat({ history: formattedHistory });
    const result = await chat.sendMessage(finalPrompt);
    const response = await result.response;
    
    return NextResponse.json({ text: response.text() });
    
  } catch (error) {
    console.error('Chat API Error:', error);
    return NextResponse.json({ error: "답변을 생성하는 데 실패했습니다." }, { status: 500 });
  }
}