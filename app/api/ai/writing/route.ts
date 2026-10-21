import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GEMINI_FALLBACK_MODELS } from '@/lib/ai-models';

// Khởi tạo Gemini client với API Key từ biến môi trường
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: Request) {
  try {
    // Nếu không có API Key, báo lỗi luôn để tránh sập app
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'Chưa cấu hình GEMINI_API_KEY trên server.' },
        { status: 500 }
      );
    }

    const body = await req.json();
    const { taskType, topic, essay, topicImage } = body;

    if (!taskType || (!topic && !topicImage) || !essay) {
      return NextResponse.json(
        { error: 'Vui lòng cung cấp đủ đề bài (text hoặc ảnh) và bài làm.' },
        { status: 400 }
      );
    }

    // Model được cấu hình bên dưới phần gọi API bằng cơ chế fallback

    // Prompt siêu chi tiết ép Gemini trả về JSON
    const prompt = `
Bạn là một cựu giám khảo IELTS vô cùng khắt khe và công tâm.
Nhiệm vụ của bạn là chấm điểm bài viết IELTS ${taskType.toUpperCase()} dưới đây theo ĐÚNG 4 TIÊU CHÍ (Task Response/Task Achievement, Coherence and Cohesion, Lexical Resource, Grammatical Range and Accuracy) VÀ BÁM SÁT OFFICIAL IELTS WRITING BAND DESCRIPTORS (May 2023).

Tuyệt đối KHÔNG ĐƯỢC CHẤM THẤP ĐIỂM XUỐNG MỘT CÁCH VÔ LÝ. Nếu bài làm đạt mức Band 8, 9 theo đúng rubric, bạn PHẢI cho Band 8, 9.

Đề bài: "${topic}"

Bài làm của học viên:
"${essay}"

=== IELTS WRITING BAND DESCRIPTORS (TÓM TẮT TIÊU CHÍ 9, 8, 7, 6) ===
Band 9:
- TR/TA: Trả lời hoàn hảo tất cả yêu cầu, phát triển ý sâu sắc.
- CC: Mạch lạc hoàn toàn tự nhiên, không gượng ép.
- LR: Từ vựng linh hoạt, chính xác tuyệt đối, tự nhiên như người bản xứ. Lỗi cực kỳ hiếm.
- GRA: Cấu trúc đa dạng, linh hoạt hoàn toàn. Lỗi cực kỳ hiếm.

Band 8:
- TR/TA: Trả lời tốt tất cả yêu cầu. Phát triển ý tốt.
- CC: Mạch lạc tốt, chia đoạn hợp lý. Thỉnh thoảng có lỗi nhỏ không đáng kể.
- LR: Dùng từ vựng rộng, linh hoạt. Có dùng idiomatic/uncommon items tốt. Lỗi nhỏ hiếm gặp.
- GRA: Đa dạng cấu trúc, phần lớn câu không có lỗi.

Band 7:
- TR/TA: Giải quyết tốt yêu cầu. Có cái nhìn tổng quan rõ ràng.
- CC: Tổ chức logic, mạch lạc. Có thể dùng quá/thiếu một số từ nối.
- LR: Đủ từ vựng để diễn đạt linh hoạt. Có dùng idiomatic items. Có vài lỗi nhỏ.
- GRA: Dùng nhiều cấu trúc phức tạp. Kiểm soát ngữ pháp tốt, thỉnh thoảng có lỗi.

Band 6:
- TR/TA: Giải quyết được yêu cầu nhưng đôi khi chưa đầy đủ hoặc không rõ ràng.
- CC: Sắp xếp thông tin tương đối mạch lạc, đôi khi dùng từ nối bị lỗi hoặc lặp.
- LR: Đủ từ vựng cho bài. Có cố gắng dùng từ vựng phức tạp nhưng bị sai.
- GRA: Có kết hợp câu đơn và phức nhưng linh hoạt kém. Có lỗi ngữ pháp nhưng không cản trở giao tiếp.

Band 5:
- TR/TA: Nhìn chung giải quyết được yêu cầu nhưng không đầy đủ. Định dạng có thể chưa phù hợp.
- CC: Có tổ chức nhưng thiếu logic toàn cục. Lạm dụng hoặc thiếu từ nối.
- LR: Từ vựng hạn chế, lặp từ nhiều, hay dùng sai ngữ cảnh.
- GRA: Chỉ dùng tốt câu đơn. Cố dùng câu phức nhưng sai nhiều, lỗi ngữ pháp gây khó khăn cho người đọc.

Band 4:
- TR/TA: Chỉ cố gắng trả lời mức tối thiểu, lạc đề hoặc không rõ ý chính.
- CC: Thông tin không liền mạch, không có sự phát triển ý. Lỗi dùng từ nối rất nhiều.
- LR: Rất hạn chế, lặp lại. Hay dùng sai từ làm hỏng ý nghĩa câu.
- GRA: Rất ít cấu trúc. Lỗi sai chằng chịt cản trở ý nghĩa.

Band 3-1:
- Lạc đề hoàn toàn, hoặc quá ngắn không đủ đánh giá. Từ vựng và ngữ pháp quá kém không thể hiểu.

Hãy đối chiếu CỰC KỲ KHÁCH QUAN. Nếu bài có lỗi, hãy chỉ ra. Nếu bài xuất sắc, HÃY CHO ĐIỂM CAO (8.0 - 9.0). Bám sát đúng mô tả của Official IELTS Writing Band Descriptors May 2023.

BẠN BẮT BUỘC PHẢI TRẢ VỀ KẾT QUẢ DƯỚI DẠNG CHUỖI JSON HỢP LỆ (KHÔNG bọc trong markdown \`\`\`json). Cấu trúc JSON phải chính xác như sau:
{
  "overallBand": 6.5,
  "scores": {
    "TR": 6.0,
    "CC": 6.5,
    "LR": 7.0,
    "GRA": 6.5
  },
  "feedback": {
    "TR": {
      "summary": "Nhận xét tổng quan cực kỳ chi tiết (ít nhất 4-5 câu). Giải thích cặn kẽ tại sao bài viết được điểm này, phân tích từng đoạn xem trả lời trọn vẹn chưa.",
      "detailedReasons": [
        "Trích dẫn lỗi 1 (nếu có)",
        "Trích dẫn lỗi 2 (nếu có)"
      ]
    },
    "CC": {
      "summary": "Nhận xét tổng quan về sự mạch lạc giữa các đoạn (ít nhất 4-5 câu).",
      "detailedReasons": [
        "Trích dẫn chỗ chuyển ý gượng ép (nếu có)"
      ]
    },
    "LR": {
      "summary": "Nhận xét tổng quan về vốn từ vựng (ít nhất 4-5 câu).",
      "detailedReasons": [
        "Trích dẫn đích danh cụm từ dùng sai ngữ cảnh (nếu có)"
      ]
    },
    "GRA": {
      "summary": "Nhận xét tổng quan về ngữ pháp (ít nhất 4-5 câu).",
      "detailedReasons": [
        "Trích dẫn những lỗi sai lặp đi lặp lại hoặc lỗi cấu trúc (nếu có)"
      ]
    }
  }, // CHÚ Ý CỰC KỲ QUAN TRỌNG: Mảng 'detailedReasons' PHẢI chỉ ra TẤT CẢ các chỗ trong bài khiến điểm bị mất. Nếu bài đạt Band 4, 5, 6 thì mảng này phải có RẤT NHIỀU lỗi được chỉ rõ. Nhưng NẾU Band điểm của tiêu chí đó là 8.5 hoặc 9.0 thì mảng 'detailedReasons' KHÔNG CẦN CHỈ LỖI MÀ ĐỂ TRỐNG [].
  "grammarErrors": [
    {
      "error": "Trích dẫn lại chính xác câu/cụm từ bị sai trong bài",
      "correction": "Sửa lại cho đúng",
      "explanation": "PHÂN TÍCH RỄ CÂY (Root cause): Giải thích cặn kẽ tại sao lại sai luật ngữ pháp này. Hướng dẫn tư duy logic để thí sinh KHÔNG BAO GIỜ lặp lại lỗi này nữa (bằng tiếng Việt)"
    }
  ], // YÊU CẦU QUAN TRỌNG: CHỈ LIỆT KÊ NHỮNG LỖI THỰC SỰ SAI. NẾU BÀI RẤT XUẤT SẮC (BAND 8.0+), đừng bịa ra lỗi, mảng này có thể trống. NẾU BÀI TỆ (Nhiều lỗi), hãy liệt kê TOÀN BỘ lỗi sai, đừng bao giờ giới hạn ở 3 lỗi (cứ có lỗi là liệt kê hết).
  "vocabularyUpgrades": [
    {
      "original": "Từ/cụm từ cơ bản trong bài (vd: very happy)",
      "upgrade": "Từ/cụm từ Band 8-9 thay thế siêu đỉnh (vd: ecstatic, over the moon)",
      "explanation": "Nghĩa tiếng Việt, sắc thái nghĩa và ví dụ cách dùng trong câu."
    }
  ], // YÊU CẦU QUAN TRỌNG: Hãy đề xuất nâng cấp TOÀN BỘ các từ vựng/cấu trúc cơ bản trong bài. Tuy nhiên, nếu bài ĐÃ SỬ DỤNG TỪ VỰNG XUẤT SẮC, đừng bắt ép nâng cấp những từ đã hay sẵn. 
  "generalComment": "NHẬN XÉT SIÊU CHI TIẾT (dài khoảng 2-3 đoạn văn): Tổng kết toàn diện về ưu điểm, khuyết điểm cốt lõi. Đưa ra lộ trình hành động (actionable advice) cực kỳ rõ ràng để thí sinh nâng ngay lập tức 0.5 - 1.0 band trong bài viết tới.",
  "improvedVersion": {
    "band8Sample": "Bài viết được viết lại HOÀN TOÀN dựa trên ý tưởng gốc của thí sinh nhưng được nâng cấp toàn diện lên Band 8+ (từ vựng xịn, cấu trúc câu phức tạp, mạch lạc tuyệt đối).",
    "differences": "PHÂN TÍCH RẤT SÂU: Giải thích cặn kẽ và chi tiết (từ 5-7 câu) chỉ ra những điểm khác biệt lớn nhất giúp bài này đạt Band 8 so với bài gốc của thí sinh. Phân tích cụ thể cách dùng từ, cấu trúc câu, sự mạch lạc và logic."
  }
}
`;

    // Chuẩn bị payload (có thể là multi-modal nếu có ảnh)
    const parts: any[] = [prompt];
    
    if (topicImage && taskType === 'task1') {
      const matches = topicImage.match(/^data:(image\/\w+);base64,(.*)$/);
      if (matches && matches.length === 3) {
        parts.push({
          inlineData: {
            data: matches[2],
            mimeType: matches[1]
          }
        });
      }
    }

    const fallbackModels = GEMINI_FALLBACK_MODELS;

    let result;
    let lastError;

    for (const modelName of fallbackModels) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        result = await model.generateContent(parts);
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

    // Dọn dẹp chuỗi trả về (đôi khi Gemini tự thêm ```json ... ```)
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();

    let parsedData;
    try {
      parsedData = JSON.parse(text);
    } catch (parseError) {
      console.error('Lỗi Parse JSON từ Gemini:', text);
      return NextResponse.json(
        { error: 'AI trả về định dạng lỗi: ' + text.slice(0, 100) + '...' },
        { status: 500 }
      );
    }

    return NextResponse.json(parsedData, { status: 200 });
  } catch (error: any) {
    console.error('Lỗi khi chấm AI Writing:', error);
    return NextResponse.json(
      { error: 'Lỗi AI: ' + (error.message || String(error)) },
      { status: 500 }
    );
  }
}
