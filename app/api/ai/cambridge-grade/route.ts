export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server';
import { formatGeminiError, generateJsonWithFallback } from '@/lib/gemini-helper';
import { extractInlineImagePayload } from '@/lib/image-utils';
import { countWords } from '@/lib/writing-practice-types';
import type { GuidedTaskType, UserOutlineParagraph } from '@/lib/writing-guided-types';

type CambridgePhase = 'task-cc' | 'lr-gra' | 'tutor-verdict';

const CAMBRIDGE_OFFICIAL_DESCRIPTORS_TASK1 = `
=== OFFICIAL CAMBRIDGE IELTS WRITING TASK 1 BAND DESCRIPTORS (MAY 2023) ===
- **Task Achievement (TA)**:
  * Band 8: Covers all requirements sufficiently, appropriately and relevantly; presents, highlights and illustrates key features clearly and appropriately.
  * Band 7: Covers the requirements of the task; presents a clear overview of main trends, differences or stages; clearly presents and highlights key features/bullet points, though could be more fully extended.
  * Band 6: Addresses the requirements of the task; presents an overview with information appropriately selected (or attempts overview); presents and adequately highlights key features, but details may be irrelevant, inappropriate or inaccurate.
  * Band 5: Generally addresses the task; format may be inappropriate in places; recounts detail mechanically with no clear overview; may be no data to support the description; presents, but inadequately covers, key features.
- **Coherence & Cohesion (CC)**:
  * Band 8: Message can be followed with ease; information and ideas are logically sequenced; cohesion is well managed; occasional lapses; paragraphing used sufficiently and appropriately.
  * Band 7: Logically organises information and ideas; clear progression throughout; uses a range of cohesive devices appropriately although there may be some under-/over-use; paragraphing is generally well managed.
  * Band 6: Arranges information and ideas coherently and there is a clear overall progression; uses cohesive devices effectively, but cohesion within and/or between sentences may be faulty or mechanical; referencing may not always be clear or appropriate; paragraphing may not always be logical.
  * Band 5: Presents information with some organisation but there may be a lack of overall progression; makes inadequate, inaccurate or over-use of cohesive devices; may be repetitive because of lack of referencing and substitution.
- **Lexical Resource (LR)**:
  * Band 8: Wide resource fluently and flexibly used to convey precise meanings; skilful use of uncommon items; rare inaccuracies in word choice/collocation/spelling.
  * Band 7: Sufficient resource to allow some flexibility and precision; some ability to use less common items; awareness of style and collocation is evident, though occasional errors in word choice, spelling and/or word formation occur.
  * Band 6: Resource is generally adequate and appropriate for the task; attempts to use less common vocabulary with some inaccuracy; some errors in spelling/word formation, but do not impede communication.
  * Band 5: Resource is limited but minimally adequate for the task; noticeable errors in spelling/word formation that may cause some difficulty for the reader.
- **Grammatical Range & Accuracy (GRA)**:
  * Band 8: Wide range of structures flexibly and accurately used; majority of sentences are error-free; punctuation is well managed.
  * Band 7: Uses a variety of complex structures; produces frequent error-free sentences; good control of grammar and punctuation but may make a few errors.
  * Band 6: Uses a mix of simple and complex sentence forms; makes some errors in grammar and punctuation, rarely reducing communication.
  * Band 5: Uses only a limited range of structures; attempts complex sentences but these tend to be less accurate than simple sentences; frequent grammatical errors and faulty punctuation.
`;

const CAMBRIDGE_OFFICIAL_DESCRIPTORS_TASK2 = `
=== OFFICIAL CAMBRIDGE IELTS WRITING TASK 2 BAND DESCRIPTORS (MAY 2023) ===
- **Task Response (TR)**:
  * Band 8: Prompt is appropriately and sufficiently addressed; clear and well-developed position; ideas are relevant, well extended and supported.
  * Band 7: Main parts of the prompt are appropriately addressed; clear and developed position is presented; main ideas are extended and supported but there may be a tendency to over-generalise or lack focus/precision in supporting ideas.
  * Band 6: Main parts of the prompt are addressed (though some may be more fully covered than others); a relevant position is presented although conclusions may become unclear or repetitive; main ideas are relevant, but some may be insufficiently developed or lack clarity.
  * Band 5: Main parts of the prompt are incompletely addressed; expresses a position but development is not always clear; some main ideas are put forward, but limited and not sufficiently developed; may be irrelevant detail.
- **Coherence & Cohesion (CC)**:
  * Band 8: Message can be followed with ease; information and ideas are logically sequenced; cohesion is well managed; paragraphing is used sufficiently and appropriately.
  * Band 7: Information and ideas are logically organised and there is a clear progression throughout; a range of cohesive devices including reference and substitution is used flexibly but with some inaccuracies or some over-/under-use; paragraphing is generally effective with a clear central topic in each paragraph.
  * Band 6: Information and ideas are generally arranged coherently and there is a clear overall progression; cohesive devices are used to some good effect but cohesion within and/or between sentences may be faulty or mechanical; referencing may be unclear/repetitive; paragraphing may not always be logical.
  * Band 5: Organisation is evident but not wholly logical and there may be a lack of overall progression; relationships between ideas are not always clearly marked; limited/inaccurate/over-used cohesive devices; paragraphing may be missing or inadequate.
- **Lexical Resource (LR)**:
  * Band 8: Wide resource fluently and flexibly used to convey precise meanings within scope of task; skilful use of uncommon items; rare inaccuracies.
  * Band 7: Sufficient resource to allow some flexibility and precision; some ability to use less common/idiomatic items; awareness of style and collocation is evident, though occasional errors in word choice, spelling and/or word formation occur.
  * Band 6: Resource is generally adequate and appropriate for the task; meaning is generally clear in spite of a rather restricted range or a lack of precision; attempts less common vocabulary with some inaccuracy; some spelling/word formation errors that do not impede communication.
  * Band 5: Resource is limited but minimally adequate; simple vocabulary may be used repetitively; noticeable spelling/word formation errors that may cause difficulty for the reader.
- **Grammatical Range & Accuracy (GRA)**:
  * Band 8: Wide range of structures flexibly and accurately used; majority of sentences are error-free; punctuation is well managed.
  * Band 7: A variety of complex structures is used with some flexibility and accuracy; frequent error-free sentences occur; grammar and punctuation are generally well controlled, though a few errors remain.
  * Band 6: A mix of simple and complex sentence forms is used, but flexibility is limited; errors occur in complex structures more than simple ones, rarely impeding communication.
  * Band 5: Range of structures is limited and rather repetitive; complex sentences are attempted but tend to be faulty; frequent grammatical/punctuation errors may cause difficulty for the reader.
`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const taskType: GuidedTaskType = body?.taskType === 'task1' ? 'task1' : 'task2';
    const phase: CambridgePhase = body?.phase || 'task-cc';
    const promptText: string = typeof body?.promptText === 'string' ? body.promptText.trim() : '';
    const chartOrPromptSummaryEn: string =
      typeof body?.chartOrPromptSummaryEn === 'string' ? body.chartOrPromptSummaryEn.trim() : '';
    const imageDataUrl: string | undefined =
      typeof body?.imageDataUrl === 'string' ? body.imageDataUrl : undefined;
    const essay: string = typeof body?.essay === 'string' ? body.essay.trim() : '';
    const userParagraphs: UserOutlineParagraph[] = Array.isArray(body?.userParagraphs)
      ? body.userParagraphs
      : [];
    const templateSummary: string =
      typeof body?.templateSummary === 'string' ? body.templateSummary.trim() : '';
    const previousGradeSummary: string =
      typeof body?.previousGradeSummary === 'string' ? body.previousGradeSummary.trim() : '';

    const wordCount = countWords(essay);
    const minRecommendedWords = taskType === 'task1' ? 150 : 250;
    if (wordCount < 35) {
      return NextResponse.json(
        {
          error: `Bài viết còn quá ngắn (${wordCount} từ). Hãy viết hoàn chỉnh bài (khuyến nghị >= ${minRecommendedWords} từ) trước khi gửi gia sư AI chấm chuẩn Cambridge.`,
        },
        { status: 400 }
      );
    }

    const isTask1 = taskType === 'task1';
    const taskShort = isTask1 ? 'TA' : 'TR';
    const inlineImage =
      isTask1 && phase === 'task-cc' ? extractInlineImagePayload(imageDataUrl) : undefined;

    const compactOutline = userParagraphs
      .map((p, idx) => `Đoạn ${idx + 1} (${p.heading}): ${p.ideasVi}`)
      .join('\n');

    const sharedHeader = `Bạn là CỰU GIÁM KHẢO CAMBRIDGE IELTS WRITING & GIA SƯ KÈM 1-1.
Học viên đang đặt mục tiêu **Overall >= 6.5** (${isTask1 ? 'Academic Writing Task 1' : 'Academic Writing Task 2'}).
YÊU CẦU CHẤM ĐIỂM TUYỆT ĐỐI KHÁCH QUAN & CHÍNH XÁC NHẤT theo **Official Cambridge IELTS Writing Band Descriptors (May 2023)** (thang 0.0–9.0, bước 0.5 — KHÔNG chấm nới tay ảo điểm, cũng KHÔNG dìm điểm vô lý; nêu rõ từng tiêu chí khớp chính xác mô tả Band nào của Cambridge!).

=== ĐỀ BÀI ===
${promptText ? `Đề bằng chữ: "${promptText}"` : '(Đề từ ảnh đính kèm)'}
${chartOrPromptSummaryEn ? `Tóm tắt dữ liệu chuẩn: ${chartOrPromptSummaryEn}` : ''}
${inlineImage ? '(CÓ ẢNH BIỂU ĐỒ TASK 1 ĐÍNH KÈM — kiểm tra kỹ số liệu, đơn vị, xu hướng trong bài học viên so với ảnh!)' : ''}

=== DÀN Ý TIẾNG VIỆT HỌC VIÊN ĐÃ LẬP ===
${compactOutline || '(Không có)'}
${templateSummary ? `\n=== TÓM TẮT TEMPLATE HỌC VIÊN ĐÃ XÁC NHẬN ===\n${templateSummary}\n` : ''}
${previousGradeSummary ? `\n=== KẾT QUẢ LẦN CHẤM TRƯỚC (ĐỐI CHIẾU TIẾN BỘ) ===\n${previousGradeSummary}\n` : ''}
=== BÀI VIẾT TIẾNG ANH CỦA HỌC VIÊN (${wordCount} từ — chuẩn IELTS >= ${minRecommendedWords} từ) ===
"""
${essay}
"""

${isTask1 ? CAMBRIDGE_OFFICIAL_DESCRIPTORS_TASK1 : CAMBRIDGE_OFFICIAL_DESCRIPTORS_TASK2}

QUY TẮC BẮT BUỘC CHO MỌI CÂU SỬA (\`originalSentence\` & \`fixedSentence\`):
- CẤM cắt nửa câu hay sửa nửa vế gây sai ngữ pháp! Cả \`originalSentence\` lẫn \`fixedSentence\` PHẢI là **NGUYÊN VĂN 1 CÂU TIẾNG ANH HOÀN CHỈNH** (đủ chủ-vị, đúng dấu câu, thay vào bài đọc trôi chảy ngay).
- Ngôn ngữ giải thích: **100% tiếng Việt rõ ràng, dễ hiểu như gia sư kèm trực tiếp**.
`;

    // ─── PHASE 1/3: TA/TR & CC ───
    if (phase === 'task-cc') {
      const p1Prompt = `${sharedHeader}
NHIỆM VỤ BƯỚC 1/3: Chấm điểm CHÍNH XÁC chuẩn Cambridge cho **${taskShort} (task)** và **Coherence & Cohesion (cc)**:
- Lưu ý độ dài hiện tại là ${wordCount} từ (nếu dưới ${minRecommendedWords} từ đáng kể, phản ánh đúng vào điểm ${taskShort} theo chuẩn Cambridge).
- Ở mỗi tiêu chí: chỉ rõ bài khớp chính xác mô tả Band nào của Cambridge (\`cambridgeDescriptorMatchVi\`), nêu rõ lý do (\`reasonVi\`), điểm làm tốt (\`strengthsVi\`), điểm kéo tụt band (\`weaknessesVi\`), và 2–3 ví dụ sửa nguyên câu cụ thể (\`fixes\`).

TRẢ VỀ DUY NHẤT JSON HỢP LỆ (không markdown):
{
  "criteria": {
    "task": {
      "band": 6.5,
      "cambridgeDescriptorMatchVi": "Khớp Cambridge Band X.X ở điểm: ...",
      "reasonVi": "Phân tích thẳng thắn lý do đạt band này và thiếu gì để tăng +0.5 band.",
      "strengthsVi": ["Điểm tốt #1", "Điểm tốt #2"],
      "weaknessesVi": ["Điểm yếu #1", "Điểm yếu #2"],
      "fixes": [
        {
          "location": "Đoạn 2 — Câu 1",
          "issueType": "add | replace | fix_error",
          "originalSentence": "Nguyên văn 1 câu gốc trong bài học viên.",
          "fixedSentence": "Nguyên văn 1 câu hoàn chỉnh sau khi sửa, đúng ngữ pháp 100%.",
          "explanationVi": "Giải thích rõ sửa thế nào & tại sao tăng điểm ${taskShort}.",
          "suggestedPhrases": ["cụm tự nhiên #1", "cụm #2"]
        }
      ]
    },
    "cc": {
      "band": 6.5,
      "cambridgeDescriptorMatchVi": "Khớp Cambridge Band X.X ở điểm: ...",
      "reasonVi": "Đánh giá mạch liên kết, conjunction Band 8 học viên dùng có tự nhiên không, phép quy chiếu & chia đoạn.",
      "strengthsVi": ["..."],
      "weaknessesVi": ["..."],
      "fixes": [
        {
          "location": "Đoạn 3 — Câu 2",
          "issueType": "replace",
          "originalSentence": "...",
          "fixedSentence": "...",
          "explanationVi": "...",
          "suggestedPhrases": ["..."]
        }
      ]
    }
  }
}`;

      const { data } = await generateJsonWithFallback(
        p1Prompt,
        `cambridge-grade:${taskType}:p1`,
        (parsed) => {
          if (!parsed?.criteria?.task || !parsed?.criteria?.cc) {
            throw new Error('Thiếu điểm criteria.task hoặc criteria.cc');
          }
          return parsed;
        },
        {
          temperature: 0.1,
          maxOutputTokens: 3200,
          perModelTimeoutMs: 24_000,
          totalBudgetMs: 48_000,
          modelProfile: 'grading',
          images: inlineImage ? [inlineImage] : undefined,
        }
      );

      return NextResponse.json(data, { status: 200 });
    }

    // ─── PHASE 2/3: LR & GRA ───
    if (phase === 'lr-gra') {
      const p2Prompt = `${sharedHeader}
=== KẾT QUẢ BƯỚC 1 ĐÃ CHẤM (ĐỒNG BỘ NHẤT QUÁN) ===
${JSON.stringify(body?.phase1Context || {})}

NHIỆM VỤ BƯỚC 2/3: Chấm điểm CHÍNH XÁC chuẩn Cambridge cho **Lexical Resource (lr)** và **Grammatical Range & Accuracy (gra)**:
- **LR**: đánh giá độ chính xác sắc thái từ vựng, collocation, lặp từ, chính tả/word form. Đề xuất từ thay thế tự nhiên mức B2/Band 6.5–7.5 (KHÔNG ép từ C2 khoe chữ!).
- **GRA**: đánh giá sự đa dạng cấu trúc câu phức (ghi nhận các cấu trúc ngữ pháp khó học viên dùng đúng trong \`advancedGrammarUsedWell\`), tỷ lệ câu sạch lỗi, và liệt kê chi tiết các lỗi ngữ pháp thực tế trong \`grammarErrors\` (NGUYÊN VĂN 1 CÂU trước & sau sửa!).

TRẢ VỀ DUY NHẤT JSON HỢP LỆ (không markdown):
{
  "criteria": {
    "lr": {
      "band": 6.5,
      "cambridgeDescriptorMatchVi": "Khớp Cambridge Band X.X ở điểm: ...",
      "reasonVi": "...",
      "strengthsVi": ["..."],
      "weaknessesVi": ["..."],
      "fixes": [
        {
          "location": "Đoạn 2 — Câu 2",
          "issueType": "replace",
          "originalSentence": "Nguyên câu gốc.",
          "fixedSentence": "Nguyên câu hoàn chỉnh sau khi nâng cấp từ vựng tự nhiên.",
          "explanationVi": "...",
          "suggestedPhrases": ["collocation tự nhiên #1", "collocation #2"]
        }
      ]
    },
    "gra": {
      "band": 6.5,
      "cambridgeDescriptorMatchVi": "Khớp Cambridge Band X.X ở điểm: ...",
      "reasonVi": "...",
      "strengthsVi": ["..."],
      "weaknessesVi": ["..."],
      "fixes": [
        {
          "location": "Đoạn 3 — Câu 1",
          "issueType": "fix_error",
          "originalSentence": "Nguyên câu gốc mắc lỗi ngữ pháp.",
          "fixedSentence": "Nguyên câu hoàn chỉnh đã sửa đúng 100% ngữ pháp.",
          "explanationVi": "...",
          "suggestedPhrases": []
        }
      ]
    }
  },
  "advancedGrammarUsedWell": ["VD: Mệnh đề quan hệ không xác định (, which ...) dùng đúng ở Đoạn 2"],
  "grammarErrors": [
    {
      "originalSentence": "Nguyên câu gốc sai ngữ pháp.",
      "fixedSentence": "Nguyên câu đúng ngữ pháp.",
      "errorType": "Chia thì / Mạo từ / Hòa hợp chủ vị / Dấu câu",
      "explanationVi": "Giải thích ngắn gọn dễ hiểu."
    }
  ],
  "vocabularyTips": [
    {
      "usedPhrase": "cụm từ học viên dùng còn đơn giản / chưa tự nhiên",
      "betterAlternative": "cụm collocation B2/Band 7 tự nhiên hơn",
      "reasonVi": "Lý do thay đổi."
    }
  ]
}`;

      const { data } = await generateJsonWithFallback(
        p2Prompt,
        `cambridge-grade:${taskType}:p2`,
        (parsed) => {
          if (!parsed?.criteria?.lr || !parsed?.criteria?.gra) {
            throw new Error('Thiếu điểm criteria.lr hoặc criteria.gra');
          }
          return parsed;
        },
        {
          temperature: 0.1,
          maxOutputTokens: 3400,
          perModelTimeoutMs: 24_000,
          totalBudgetMs: 48_000,
          modelProfile: 'grading',
        }
      );

      return NextResponse.json(data, { status: 200 });
    }

    // ─── PHASE 3/3: GIA SƯ NHẬN XÉT TỪNG ĐOẠN & TỔNG KẾT CHUNG ───
    const p3Prompt = `${sharedHeader}
=== KẾT QUẢ 4 TIÊU CHÍ CAMBRIDGE ĐÃ CHẤM ===
${JSON.stringify(body?.phase2Context || {})}

NHIỆM VỤ BƯỚC 3/3: Đóng vai **GIA SƯ IELTS WRITING KÈM 1-1** bằng tiếng Việt:
1. \`paragraphReviews\`: Nhận xét từng đoạn văn học viên đã viết (mạnh gì, yếu gì, sửa cụ thể thế nào).
2. \`templateUsageFeedbackVi\`: Nhận xét 2–3 câu về việc học viên đã ráp ý tưởng & tự tìm từ vựng vào khung template có mượt và tự nhiên không (chỗ nào ráp khớp tốt, chỗ nào bị gượng hoặc lệch từ loại).
3. \`tutorOverallFeedbackVi\`: Đoạn nhận xét chung sâu sắc, thực tế (150–230 từ, chia 3 đoạn ngắn bằng \`\\n\\n\`):
   - Đoạn 1: Chẩn đoán thẳng trình độ thực tế của bài so với mục tiêu **6.5+** và khen cụ thể điểm sáng học viên làm tốt.
   - Đoạn 2: Chỉ rõ "nút thắt cổ chai" lớn nhất đang kìm điểm số của bài viết này.
   - Đoạn 3: Hướng dẫn chiến lược sửa ngay bản nháp này (hoặc lưu ý cho bài sau) để bước chắc lên 6.5–7.0+${previousGradeSummary ? ' (có đối chiếu rõ điểm tiến bộ và điểm còn sót so với lần nộp trước!)' : ''}.
4. \`top3PrioritiesVi\`: Đúng 3 việc quan trọng nhất học viên cần sửa NGAY theo thứ tự ưu tiên 1 → 2 → 3.

TRẢ VỀ DUY NHẤT JSON HỢP LỆ (không markdown):
{
  "paragraphReviews": [
    {
      "paragraphLabel": "Đoạn 1 (Mở bài)",
      "strengthsVi": "...",
      "weaknessesVi": "...",
      "howToImproveVi": "..."
    }
  ],
  "templateUsageFeedbackVi": "...",
  "tutorOverallFeedbackVi": "Đoạn 1...\\n\\nĐoạn 2...\\n\\nĐoạn 3...",
  "top3PrioritiesVi": [
    "Ưu tiên 1: ...",
    "Ưu tiên 2: ...",
    "Ưu tiên 3: ..."
  ]
}`;

    const { data } = await generateJsonWithFallback(
      p3Prompt,
      `cambridge-grade:${taskType}:p3`,
      (parsed) => {
        if (!parsed || (!parsed.tutorOverallFeedbackVi && !parsed.paragraphReviews)) {
          throw new Error('Thiếu nhận xét tổng kết gia sư');
        }
        return parsed;
      },
      {
        temperature: 0.2,
        maxOutputTokens: 2800,
        perModelTimeoutMs: 22_000,
        totalBudgetMs: 46_000,
        modelProfile: 'fast',
      }
    );

    return NextResponse.json(data, { status: 200 });
  } catch (error: any) {
    console.error('[cambridge-grade] Error:', error);
    const { message, status, retryAfterSeconds } = formatGeminiError(
      error,
      'Lỗi chấm bài chuẩn Cambridge: '
    );
    return NextResponse.json({ error: message, retryAfterSeconds }, { status });
  }
}
