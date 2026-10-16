import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: Request) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: 'Chưa cấu hình GEMINI_API_KEY trên server.' }, { status: 500 });
    }

    const body = await req.json();
    const { part, topic, transcript } = body;

    if (!transcript) {
      return NextResponse.json({ error: 'Không nhận được nội dung bài nói (transcript).' }, { status: 400 });
    }

    // Model được cấu hình bên dưới bằng cơ chế fallback

    const prompt = `
Bạn là cựu giám khảo IELTS Speaking. Học viên vừa thực hiện bài nói IELTS Speaking Part ${part || 1}.
Chủ đề / Câu hỏi: "${topic || 'General conversation'}"

Dưới đây là phần text được bóc băng (transcribe) từ giọng nói thực tế của học viên:
"${transcript}"

Nhiệm vụ của bạn là chấm điểm bài nói này theo 4 tiêu chí chuẩn của IELTS Speaking (Fluency and Coherence, Lexical Resource, Grammatical Range and Accuracy, Pronunciation). LƯU Ý VỀ PRONUNCIATION: Vì đây là bản text bóc băng từ phần mềm nhận diện giọng nói, hãy suy ra lỗi Pronunciation dựa trên việc phần mềm nhận diện sai từ ngữ (ví dụ học viên định nói 'think' nhưng phần mềm nhận thành 'sink', hoặc các từ bị dính vào nhau).

BẠN BẮT BUỘC TRẢ VỀ CHUỖI JSON HỢP LỆ (KHÔNG bọc trong \`\`\`json). Cấu trúc JSON phải chính xác như sau:
{
  "overallBand": 6.5,
  "scores": {
    "FC": 6.0,
    "LR": 6.5,
    "GRA": 7.0,
    "PR": 6.5
  },
  "feedback": {
    "FC": "PHÂN TÍCH RẤT SÂU: Đánh giá cực kỳ chi tiết về độ trôi chảy (lưu loát, tốc độ nói) và tính mạch lạc (sử dụng từ nối, triển khai ý logic). Chỉ ra những chỗ bị ngập ngừng, ậm ừ quá nhiều. (ít nhất 4-5 câu)",
    "LR": "PHÂN TÍCH RẤT SÂU: Nhận xét chi tiết về vốn từ vựng, mức độ sử dụng collocation và idiomatic expressions. Chỉ ra đích danh những cụm từ dùng sai ngữ cảnh và khen ngợi những cụm từ xuất sắc. (ít nhất 4-5 câu)",
    "GRA": "PHÂN TÍCH RẤT SÂU: Phân tích độ phức tạp và đa dạng của cấu trúc câu khi nói. Chỉ ra những lỗi sai ngữ pháp lặp đi lặp lại hoặc lỗi chia thì, chia động từ. (ít nhất 4-5 câu)",
    "PR": "PHÂN TÍCH RẤT SÂU: Đánh giá cực kỳ chi tiết về phát âm (âm cuối, trọng âm từ, trọng âm câu, ngữ điệu). Chỉ ra chính xác những âm bị phát âm sai gây hiểu lầm. (ít nhất 4-5 câu)"
  },
  "grammarErrors": [
    {
      "error": "Trích dẫn lại chính xác câu/cụm từ nói sai",
      "correction": "Sửa lại cho đúng tự nhiên",
      "explanation": "PHÂN TÍCH RỄ CÂY (Root cause): Giải thích cặn kẽ tại sao lại sai luật ngữ pháp này. Hướng dẫn tư duy logic để thí sinh KHÔNG BAO GIỜ lặp lại lỗi này nữa (bằng tiếng Việt)"
    }
  ],
  "vocabularyUpgrades": [
    {
      "original": "Từ/cụm từ cơ bản trong bài (vd: very happy)",
      "upgrade": "Từ/cụm từ Band 8-9 thay thế siêu đỉnh (vd: ecstatic, over the moon)",
      "explanation": "Nghĩa tiếng Việt, sắc thái nghĩa và ví dụ cách dùng khi nói."
    }
  ],
  "generalComment": "NHẬN XÉT SIÊU CHI TIẾT (dài khoảng 2-3 đoạn văn): Tổng kết toàn diện về ưu điểm, khuyết điểm cốt lõi. Đưa ra lộ trình hành động (actionable advice) cực kỳ rõ ràng để thí sinh nâng ngay lập tức 0.5 - 1.0 band trong bài nói tới.",
  "improvedVersion": {
    "band8Sample": "Bài nói được viết lại HOÀN TOÀN dựa trên ý tưởng gốc của thí sinh nhưng được nâng cấp toàn diện lên văn phong nói Band 8+ (từ vựng xịn, idioms, cấu trúc câu tự nhiên như người bản xứ).",
    "differences": "PHÂN TÍCH RẤT SÂU: Giải thích cặn kẽ và chi tiết (từ 5-7 câu) chỉ ra những điểm khác biệt lớn nhất giúp bài này đạt Band 8 so với bài gốc của thí sinh. Phân tích cụ thể cách phát triển ý, idioms, ngữ điệu và tự nhiên."
  }
}
`;

    const fallbackModels = [
      'gemini-flash-latest',
      'gemini-3.6-flash',
      'gemini-3.5-flash',
      'gemini-pro-latest'
    ];

    let result;
    let lastError;

    for (const modelName of fallbackModels) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        result = await model.generateContent(prompt);
        if (result) {
          console.log(`Đã dùng thành công model: ${modelName}`);
          break; // Thoát vòng lặp ngay nếu thành công
        }
      } catch (e: any) {
        lastError = e;
        console.warn(`Model ${modelName} bị lỗi hoặc quá tải: ${e.message}`);
      }
    }

    if (!result) {
      throw lastError; // Văng lỗi ra nếu không có model nào hoạt động
    }
    const response = await result.response;
    let text = response.text();

    text = text.replace(/```json/g, '').replace(/```/g, '').trim();

    const parsedData = JSON.parse(text);

    return NextResponse.json(parsedData, { status: 200 });
  } catch (error: any) {
    console.error('Lỗi khi chấm AI Speaking:', error);
    return NextResponse.json({ error: 'Có lỗi xảy ra khi chấm bài Speaking.' }, { status: 500 });
  }
}
