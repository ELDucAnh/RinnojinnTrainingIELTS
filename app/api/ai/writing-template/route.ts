export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server';
import { formatGeminiError, generateJsonWithFallback } from '@/lib/gemini-helper';
import { extractInlineImagePayload } from '@/lib/image-utils';
import {
  normalizeDetailedParagraphTemplate,
  normalizeOutlineEvaluation,
  type GuidedTaskType,
  type OutlineParagraphPlan,
  type UserOutlineParagraph,
} from '@/lib/writing-guided-types';

type TemplateMode = 'evaluate-outline' | 'build-template-chunk';

function formatUserParagraphs(paragraphs: UserOutlineParagraph[]): string {
  return paragraphs
    .map(
      (p, idx) =>
        `[Đoạn ${idx + 1} — "${p.heading}"]:\n${p.ideasVi.trim()}`
    )
    .join('\n\n');
}

function buildEvaluateOutlinePrompt(params: {
  taskType: GuidedTaskType;
  promptText: string;
  hasImage: boolean;
  userParagraphs: UserOutlineParagraph[];
}): string {
  const { taskType, promptText, hasImage, userParagraphs } = params;
  const isTask1 = taskType === 'task1';
  const taskCritName = isTask1 ? 'Task Achievement (TA)' : 'Task Response (TR)';

  return `Bạn là GIA SƯ IELTS WRITING (chuẩn Cambridge Assessment English — Band Descriptors May 2023).
Học viên đang luyện viết IELTS Academic Writing **${isTask1 ? 'Task 1' : 'Task 2'}** (mục tiêu đầu ra Overall >= 6.5).
Học viên đã **tự chia đoạn và tự viết dàn ý bằng tiếng Việt** bên dưới.

=== ĐỀ BÀI ${isTask1 ? 'TASK 1' : 'TASK 2'} ===
${promptText ? `Đề bằng chữ:\n"""\n${promptText}\n"""` : '(Học viên cung cấp đề trực tiếp qua ảnh biểu đồ/đề đính kèm)'}
${hasImage ? '(ĐÃ ĐÍNH KÈM ẢNH ĐỀ/BIỂU ĐỒ TASK 1 — BẮT BUỘC đọc thật kỹ tiêu đề, đơn vị, mốc thời gian, xu hướng, điểm cao nhất/thấp nhất, quy trình/bản đồ trong ảnh để đối chiếu 100% chính xác!)' : ''}

=== DÀN Ý TIẾNG VIỆT & CÁCH CHIA ĐOẠN CỦA HỌC VIÊN (${userParagraphs.length} đoạn) ===
${formatUserParagraphs(userParagraphs)}

=== NHIỆM VỤ CỦA BẠN ===
1. Chấm điểm dự kiến cho tiêu chí **${taskCritName}** của dàn ý này theo đúng **Official Cambridge IELTS Band Descriptors**:
${
  isTask1
    ? `   - **Đạt TA >= 7.0 (PASS)** khi VÀ CHỈ KHI:
     + Có đầy đủ phần Mở bài (paraphrase đề), Tổng quan Overview rõ xu hướng/đặc điểm nổi bật chính (KHÔNG bỏ sót Overview hoặc nhét số liệu vụn vào Overview), và các đoạn Thân bài chọn lọc & so sánh được các số liệu/đặc điểm nổi bật ĐÚNG sự thật trong biểu đồ/ảnh.
     + Cách chia đoạn hợp lý (gom nhóm thông minh, không bỏ sót đối tượng/giai đoạn quan trọng của đề).
   - **Dưới TA < 7.0 (FAIL — cần học viên bổ sung)** nếu: thiếu Overview rõ ràng, thiếu dữ liệu/đặc điểm quan trọng, sai số liệu so với ảnh/đề, gom nhóm lộn xộn không có so sánh đối chiếu, hoặc chỉ liệt kê rời rạc.`
    : `   - **Đạt TR >= 7.0 (PASS)** khi VÀ CHỈ KHI:
     + Trả lời ĐẦY ĐỦ mọi vế câu hỏi của đề bài (không bỏ sót vế nào, nhận đúng dạng đề Opinion / Discussion / Cause-Solution / Two-part...).
     + Quan điểm (position) rõ ràng và nhất quán xuyên suốt các đoạn.
     + Các ý chính (main ideas) liên quan trực tiếp đến đề, có hướng giải thích nguyên nhân–hệ quả hoặc ví dụ cụ thể (không chung chung, không lạc đề, không tự mâu thuẫn).
     + Cách chia đoạn rõ ràng, mỗi đoạn thân bài có 1 trọng tâm rõ.
   - **Dưới TR < 7.0 (FAIL — cần học viên bổ sung)** nếu: bỏ sót 1 vế câu hỏi, lập trường mơ hồ, luận điểm quá sơ sài/chung chung chưa có cơ chế giải thích, lạc đề, hoặc chia đoạn rối.`
}
2. Nếu \`estimatedTaskBand < 7.0\`: chỉ thật cụ thể trong \`missingElementsVi\` và \`paragraphFeedback\` (từng đoạn một!) rằng học viên cần **bổ sung thêm ý gì / số liệu gì vào đoạn nào** để dàn ý chạm vững mức ${taskCritName} >= 7.0.
3. Tạo \`chartOrPromptSummaryEn\`: tóm tắt ngắn gọn, chính xác 100% bằng tiếng Anh các thông tin cốt lõi của đề bài${hasImage ? ' (đặc biệt trích xuất đầy đủ tên biểu đồ, đơn vị, mốc năm, các con số/xu hướng/bước quy trình/thay đổi chính đọc được từ ảnh!)' : ''}.
4. Lập \`paragraphPlans\` cho đúng ${userParagraphs.length} đoạn học viên đã chia: xác định vai trò đoạn, số câu phù hợp (2–4 câu/đoạn), khung độ dài, chiến lược CC > 7.0 (dùng conjunction Band 8.0) và chiến lược GRA > 7.0 (ngữ pháp nâng cao phù hợp) để bước tiếp theo dựng Template siêu chi tiết.

TRẢ VỀ DUY NHẤT JSON HỢP LỆ (không markdown, không giải thích ngoài JSON):
{
  "estimatedTaskBand": 7.0,
  "passedTask7": true,
  "detectedType": "${isTask1 ? 'VD: Line Graph (Dynamic) / Bar Chart / Process / Map' : 'VD: Opinion (Agree/Disagree) / Discussion + Opinion / Problem-Solution'}",
  "chartOrPromptSummaryEn": "Concise accurate English summary of the prompt and all key chart figures/features...",
  "verdictVi": "2-3 câu nhận xét thẳng thắn bằng tiếng Việt về điểm TA/TR hiện tại của dàn ý.",
  "strengthsVi": ["Điểm tốt #1 trong dàn ý học viên", "Điểm tốt #2"],
  "missingElementsVi": ["Nếu < 7.0: liệt kê rõ yêu cầu/ý/số liệu đang thiếu; nếu >= 7.0 để mảng rỗng []"],
  "paragraphFeedback": [
    {
      "paragraphIndex": 0,
      "heading": "${userParagraphs[0]?.heading || 'Đoạn 1'}",
      "status": "strong | needs_addition | off_track",
      "commentVi": "Nhận xét trực tiếp về ý của đoạn này so với yêu cầu đề.",
      "whatToAddVi": "Gợi ý cụ thể cần bổ sung ý/số liệu gì bằng tiếng Việt vào đoạn này (để rỗng nếu đã đủ tốt)."
    }
  ],
  "paragraphPlans": [
    {
      "paragraphIndex": 0,
      "heading": "${userParagraphs[0]?.heading || 'Đoạn 1'}",
      "roleVi": "Vai trò cụ thể của đoạn này trong tổng thể bài",
      "targetSentences": 2,
      "targetWordRange": "40–55 từ",
      "ccStrategyVi": "Chiến lược nối mạch & conjunction Band 8.0 cho đoạn này",
      "graStrategyVi": "Cấu trúc ngữ pháp khó (GRA > 7.0) sẽ cài vào đoạn này"
    }
  ]
}`;
}

function buildTemplateChunkPrompt(params: {
  taskType: GuidedTaskType;
  promptText: string;
  chartOrPromptSummaryEn: string;
  userParagraphs: UserOutlineParagraph[];
  targetIndices: number[];
  paragraphPlans: OutlineParagraphPlan[];
  previousTemplatesSummary: Array<{ paragraphIndex: number; heading: string; usedConnectors: string[]; usedGrammar: string[] }>;
  includeMatrix: boolean;
}): string {
  const {
    taskType,
    promptText,
    chartOrPromptSummaryEn,
    userParagraphs,
    targetIndices,
    paragraphPlans,
    previousTemplatesSummary,
    includeMatrix,
  } = params;

  const isTask1 = taskType === 'task1';

  const targetBlocks = targetIndices
    .map((idx) => {
      const up = userParagraphs[idx];
      const plan = paragraphPlans.find((p) => p.paragraphIndex === idx);
      return `--- ĐOẠN CẦN DỰNG TEMPLATE: paragraphIndex=${idx} ---
- Tên đoạn học viên đặt: "${up.heading}"
- Dàn ý tiếng Việt của học viên:
"""
${up.ideasVi.trim()}
"""
- Kế hoạch đề xuất: ${plan ? `${plan.roleVi} | Số câu: ${plan.targetSentences} | Độ dài: ${plan.targetWordRange} | CC: ${plan.ccStrategyVi} | GRA: ${plan.graStrategyVi}` : 'Dựng 2-4 câu chi tiết chuẩn GRA & CC > 7.0'}`;
    })
    .join('\n\n');

  const fullOutlineOverview = userParagraphs
    .map((p, i) => `Đoạn ${i + 1} (${p.heading}): ${p.ideasVi.trim().slice(0, 180)}`)
    .join('\n');

  const prevBlock =
    previousTemplatesSummary.length > 0
      ? `\n=== CÁC ĐOẠN TRƯỚC ĐÃ DỰNG (KHÔNG LẶP LẠI CONJUNCTION & CẤU TRÚC NGỮ PHÁP ĐÃ DÙNG) ===\n${JSON.stringify(previousTemplatesSummary)}\n`
      : '';

  return `Bạn là GIA SƯ IELTS WRITING CHUYÊN NGHIỆP.
Học viên đang aim **Overall 6.5+**, đã tự viết dàn ý tiếng Việt đạt chuẩn ${isTask1 ? 'TA' : 'TR'} >= 7.0.
Nhiệm vụ của bạn là dựng **TEMPLATE SIÊU CHI TIẾT, CHUẨN MỰC** cho **CHỈ các đoạn được yêu cầu bên dưới** (paragraphIndex: ${targetIndices.join(', ')}) để học viên TỰ TRA TỪ VỰNG và RÁP Ý CỦA MÌNH VÀO!

=== NGỮ CẢNH ĐỀ BÀI (${isTask1 ? 'IELTS Writing Task 1' : 'IELTS Writing Task 2'}) ===
${promptText ? `Đề bài: ${promptText}\n` : ''}Tóm tắt dữ liệu/đề chuẩn xác: ${chartOrPromptSummaryEn}

=== BỨC TRANH TOÀN BÀI CỦA HỌC VIÊN (${userParagraphs.length} đoạn) ===
${fullOutlineOverview}
${prevBlock}
=== CÁC ĐOẠN CẦN DỰNG TEMPLATE SIÊU CHI TIẾT LẦN NÀY ===
${targetBlocks}

=== QUY TẮC VÀNG BẮT BUỘC (VI PHẠM LÀ FAIL) ===
1. **SIÊU CHI TIẾT & BÁM 100% DÀN Ý TIẾNG VIỆT CỦA HỌC VIÊN**:
   - Không viết bài mẫu hoàn chỉnh thay học viên! Thay vào đó, dựng **khung câu tiếng Anh cực rõ có đánh dấu ô trống \`[SLOT 1: ...]\`, \`[SLOT 2: ...]\`** cho TỪNG CÂU MỘT theo đúng mạch ý tiếng Việt học viên đã viết.
   - Ở MỖI ô trống \`[SLOT]\` trong mảng \`slots\`, phải ghi chi tiết:
     + \`whatToPutVi\`: ráp chính xác phần ý nào của học viên vào đây,
     + \`grammaticalForm\`: yêu cầu chính xác từ loại/thì (VD: \`Noun Phrase\`, \`V-ing\`, \`Mệnh đề S + V quá khứ đơn\`, \`Adj + N\`) để ráp vào không sai ngữ pháp,
     + \`plainKeywordsHint\`: 2–3 gợi ý hướng từ khóa **B1–B2 thông dụng, trong sáng** để học viên tự tra từ điển & mở rộng (CẤM nhồi từ C2 sáo rỗng!),
     + \`replaceableWith\`: gợi ý cụ thể có thể **thay thế chỗ này bằng cấu trúc / cụm diễn đạt nào khác** cho linh hoạt.
2. **KHÔNG LẠM DỤNG TỪ VỰNG CAO SIÊU TRONG TEMPLATE**:
   - Từ khung cố định trong \`templateSkeleton\` phải **trong sáng, tự nhiên, dễ hiểu (B1–B2 học thuật)** — TUYỆT ĐỐI CẤM nhồi các từ C2 hoa mỹ sáo rỗng ("ubiquitous", "plethora", "myriad", "ameliorate", "exacerbate", "unyielding", "paradigm shift", "stark dichotomy", "skyrocket", "plummet", "preponderance").
3. **CONJUNCTION & LIÊN KẾT CHUẨN BAND 8.0 (ĐẢM BẢO CC > 7.0)**:
   - TUYỆT ĐỐI CẤM lạm dụng từ nối máy móc kiểu "Firstly,", "Secondly,", "Moreover,", "Furthermore,", "In addition," ở đầu câu!
   - Thay bằng **hệ thống conjunction & phép nối Band 8.0 tự nhiên**: mệnh đề phụ thuộc (\`While / Whereas ... , ...\`, \`Although / Even though ...\`, \`Given that ...\`, \`Provided that ...\`), liên kết hệ quả mượt (\`, thereby + V-ing\`, \`, which in turn + V\`), phép quy chiếu danh từ tóm tắt (\`This upward trend ...\`, \`Such measures ...\`, \`This shift ...\`), đối chiếu tự nhiên (\`By contrast,\`, \`Compared with ...\`, \`Unlike ...\`).
   - Mỗi câu đều nêu rõ \`usedConnector\`, \`whyBand8Vi\` (vì sao nối mượt với câu trước đạt CC > 7.0/8.0) và \`alternatives\` (2–3 conjunction Band 8 khác thay thế được ngay vị trí đó!).
4. **ÁP DỤNG NGỮ PHÁP KHÓ CHUẨN XÁC (ĐẢM BẢO GRA > 7.0 — CÀNG ĐA DẠNG & CHUẨN CÀNG TỐT)**:
   - Cài đặt hợp lý, tự nhiên nhiều cấu trúc ngữ pháp nâng cao trong từng đoạn (không lặp cùng 1 khung 2 câu liên tiếp):
     + Mệnh đề quan hệ không xác định (\`, which + V\`),
     + Mệnh đề phân từ rút gọn (\`V-ing ... / Having + V3 / V-ed ...\`),
     + Mệnh đề nhượng bộ / tương phản (\`Whereas / While / Although S + V, S + V\`),
     + Đảo ngữ nhẹ học thuật (\`Not only does S + V, but ... also ...\`),
     + Câu chẻ nhấn mạnh (\`It is [N] that + V\`) hoặc cấu trúc chủ ngữ giả (\`It is clear/evident that ...\`),
     + ${isTask1 ? 'So sánh bội số / cấu trúc số liệu (\`twice as high as\`, \`followed closely by\`, \`with [N] + V-ing\`, bị động cho Map/Process)' : 'Câu điều kiện / giả định (\`Were governments to ...\`, \`If ... were to ...\`, \`Without + N, S would ...\`), cấu trúc \`The more ..., the more ...\`'}.
   - Luôn ghi rõ \`formula\` và \`accuracyWatchoutVi\` (bẫy ngữ pháp cần tránh khi điền từ vào khung để không mất điểm Accuracy!).
5. **GHÉP NGUYÊN ĐOẠN (\`assembledParagraphTemplate\`)**:
   - Ghép liền các \`templateSkeleton\` của đoạn đó thành 1 đoạn văn liền mạch (giữ nguyên các ô \`[SLOT ...]\`) để học viên thấy toàn cảnh dòng chảy cả đoạn.

TRẢ VỀ DUY NHẤT JSON HỢP LỆ (KHÔNG markdown):
{
  ${
    includeMatrix
      ? `"overallStrategyVi": "2-3 câu tóm tắt chiến lược toàn bài giúp học viên ráp từ vựng từ template để đạt GRA > 7.0, CC > 7.0 và vượt vững mốc Overall 6.5+.",
  "targetWordCount": "${isTask1 ? '160–190 từ' : '265–310 từ'}",
  `
      : ''
  }"paragraphs": [
    {
      "paragraphIndex": ${targetIndices[0]},
      "userHeading": "${userParagraphs[targetIndices[0]]?.heading || 'Đoạn 1'}",
      "paragraphRoleVi": "Vai trò cụ thể của đoạn này",
      "targetWordRange": "50–75 từ",
      "targetSentenceCount": 3,
      "ccParagraphBridgeVi": "Hướng dẫn nối mạch từ đoạn trước sang đoạn này chuẩn Band 8.0",
      "sentences": [
        {
          "sentenceNumber": 1,
          "purposeVi": "Câu này triển khai chính xác ý nào của học viên",
          "templateSkeleton": "While [SLOT 1: vế tương phản/bối cảnh từ ý bạn], [SLOT 2: chủ ngữ chính] + [SLOT 3: động từ chính + tân ngữ], which + [SLOT 4: hệ quả/so sánh].",
          "slots": [
            {
              "slotLabel": "[SLOT 1: ...]",
              "whatToPutVi": "Ráp ý nào từ dàn ý tiếng Việt của bạn vào đây",
              "grammaticalForm": "Mệnh đề (S + V thì hiện tại đơn / quá khứ đơn)",
              "plainKeywordsHint": ["gợi ý từ khóa B1-B2 #1", "gợi ý #2"],
              "replaceableWith": "Có thể thay bằng cụm 'Despite + N/V-ing' hoặc đảo vế thứ tự nếu muốn đổi nhịp"
            }
          ],
          "conjunctionBand8": {
            "usedConnector": "While ... , ... + , which ...",
            "whyBand8Vi": "Gộp 2 vế tương phản + mở rộng hệ quả ngay trong 1 câu mượt mà thay vì cắt 2 câu rời bằng 'However/Moreover'.",
            "alternatives": ["Whereas ... , ...", "Although ... , ..."]
          },
          "advancedGrammar": {
            "structureName": "Mệnh đề tương phản (While) kết hợp Mệnh đề quan hệ không xác định (, which)",
            "formula": "While S1 + V1, S2 + V2, which + V3 (chia số ít)",
            "accuracyWatchoutVi": "Lưu ý: sau 'While' KHÔNG thêm 'but'; sau ', which' thay cho cả mệnh đề trước nên động từ V3 luôn chia số ít!"
          }
        }
      ],
      "assembledParagraphTemplate": "Ghép đầy đủ tất cả templateSkeleton của đoạn này thành 1 đoạn hoàn chỉnh có giữ các [SLOT ...]."
    }
  ]${
    includeMatrix
      ? `,
  "substitutionMatrix": [
    {
      "locationVi": "Đoạn 2 -> Đoạn 3 (tránh lặp conjunction đối chiếu)",
      "originalPattern": "While S1 + V1, S2 + V2",
      "alternatives": ["Whereas S1 + V1, S2 + V2", "By contrast, S + V", "Unlike [N], [S] + V"],
      "whyReplaceVi": "Xoay vòng cấu trúc đối chiếu giữa các đoạn để CC & GRA giữ vững mức > 7.0."
    }
  ]`
      : ''
  }
}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const mode: TemplateMode = body?.mode;
    const taskType: GuidedTaskType = body?.taskType === 'task1' ? 'task1' : 'task2';
    const promptText: string = typeof body?.promptText === 'string' ? body.promptText.trim() : '';
    const imageDataUrl: string | undefined =
      typeof body?.imageDataUrl === 'string' ? body.imageDataUrl : undefined;

    const rawParagraphs: any[] = Array.isArray(body?.userParagraphs) ? body.userParagraphs : [];
    const userParagraphs: UserOutlineParagraph[] = rawParagraphs
      .map((p, idx) => ({
        id: String(p?.id || `p-${idx + 1}`),
        heading: String(p?.heading || `Đoạn ${idx + 1}`).trim(),
        ideasVi: String(p?.ideasVi || '').trim(),
      }))
      .filter((p) => p.ideasVi.length > 0);

    if (userParagraphs.length < 2) {
      return NextResponse.json(
        { error: 'Vui lòng tự chia và viết dàn ý tiếng Việt cho ít nhất 2 đoạn trước khi gửi gia sư AI.' },
        { status: 400 }
      );
    }

    const inlineImage = taskType === 'task1' ? extractInlineImagePayload(imageDataUrl) : undefined;

    if (taskType === 'task1' && !promptText && !inlineImage) {
      return NextResponse.json(
        { error: 'Vui lòng dán/tải ảnh biểu đồ Task 1 hoặc nhập đề bài trước khi gửi.' },
        { status: 400 }
      );
    }

    if (taskType === 'task2' && promptText.length < 15) {
      return NextResponse.json(
        { error: 'Vui lòng nhập đầy đủ đề bài IELTS Writing Task 2 (tối thiểu 15 ký tự).' },
        { status: 400 }
      );
    }

    // ─── MODE 1: ĐÁNH GIÁ TA/TR CỦA DÀN Ý TIẾNG VIỆT (GATE >= 7.0) ───
    if (mode === 'evaluate-outline') {
      const prompt = buildEvaluateOutlinePrompt({
        taskType,
        promptText,
        hasImage: Boolean(inlineImage),
        userParagraphs,
      });

      const { data } = await generateJsonWithFallback(
        prompt,
        `writing-template:eval:${taskType}`,
        (parsed) => {
          if (!parsed || typeof parsed !== 'object') {
            throw new Error('Phản hồi đánh giá dàn ý không hợp lệ');
          }
          return normalizeOutlineEvaluation(parsed, userParagraphs);
        },
        {
          temperature: 0.2,
          maxOutputTokens: 2800,
          perModelTimeoutMs: 24_000,
          totalBudgetMs: 48_000,
          modelProfile: 'fast',
          images: inlineImage ? [inlineImage] : undefined,
        }
      );

      return NextResponse.json(data, { status: 200 });
    }

    // ─── MODE 2: DỰNG TEMPLATE SIÊU CHI TIẾT THEO CHẶNG 1–2 ĐOẠN ───
    if (mode === 'build-template-chunk') {
      const targetIndices: number[] = Array.isArray(body?.targetIndices)
        ? body.targetIndices
            .map((n: any) => Number(n))
            .filter((n: number) => Number.isInteger(n) && n >= 0 && n < userParagraphs.length)
        : [0];

      if (targetIndices.length === 0) {
        return NextResponse.json({ error: 'targetIndices không hợp lệ.' }, { status: 400 });
      }

      const chartOrPromptSummaryEn = String(body?.chartOrPromptSummaryEn || promptText || '').trim();
      const paragraphPlans: OutlineParagraphPlan[] = Array.isArray(body?.paragraphPlans)
        ? body.paragraphPlans
        : [];
      const previousTemplatesSummary = Array.isArray(body?.previousTemplatesSummary)
        ? body.previousTemplatesSummary
        : [];
      const includeMatrix = Boolean(body?.includeMatrix);

      const prompt = buildTemplateChunkPrompt({
        taskType,
        promptText,
        chartOrPromptSummaryEn,
        userParagraphs,
        targetIndices,
        paragraphPlans,
        previousTemplatesSummary,
        includeMatrix,
      });

      const { data } = await generateJsonWithFallback(
        prompt,
        `writing-template:chunk:${taskType}:${targetIndices.join('-')}`,
        (parsed) => {
          const arr = Array.isArray(parsed?.paragraphs) ? parsed.paragraphs : null;
          if (!arr || arr.length === 0) {
            throw new Error('AI trả về thiếu mảng paragraphs của template');
          }
          const normalizedParagraphs = targetIndices.map((targetIdx, pos) => {
            const found =
              arr.find((x: any) => Number(x?.paragraphIndex) === targetIdx) ??
              arr[pos] ??
              {};
            return normalizeDetailedParagraphTemplate(found, userParagraphs[targetIdx], targetIdx);
          });

          return {
            overallStrategyVi:
              typeof parsed?.overallStrategyVi === 'string' ? parsed.overallStrategyVi : undefined,
            targetWordCount:
              typeof parsed?.targetWordCount === 'string' ? parsed.targetWordCount : undefined,
            paragraphs: normalizedParagraphs,
            substitutionMatrix: Array.isArray(parsed?.substitutionMatrix)
              ? parsed.substitutionMatrix
              : undefined,
          };
        },
        {
          temperature: 0.35,
          maxOutputTokens: targetIndices.length > 1 ? 4600 : 3200,
          perModelTimeoutMs: 26_000,
          totalBudgetMs: 50_000,
          modelProfile: 'fast',
          failFastOnTooLong: targetIndices.length > 1,
        }
      );

      return NextResponse.json(data, { status: 200 });
    }

    return NextResponse.json({ error: 'Tham số mode không hợp lệ.' }, { status: 400 });
  } catch (error: any) {
    console.error('[writing-template] Error:', error);
    const { message, status, retryAfterSeconds } = formatGeminiError(
      error,
      'Lỗi xử lý dàn ý & template: '
    );
    return NextResponse.json({ error: message, retryAfterSeconds }, { status });
  }
}
