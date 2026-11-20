// lib/writing-grade-prompt.ts
// Shared prompt guidelines for IELTS Writing Band 6 -> Band 8 Tutor
// Target matrix: TA/TR >= 8.0 | CC >= 9.0 | GRA >= 8.0 | LR >= 7.0 -> Overall >= 8.0

import type { PreviousAttemptSummary } from '@/lib/writing-practice-types';

export function buildPreviousAttemptBlock(previousAttempt?: PreviousAttemptSummary | null): string {
  if (!previousAttempt || !previousAttempt.content?.trim()) return '';

  return `
=== LỊCH SỬ BẢN NHÁP LẦN TRƯỚC CỦA HỌC VIÊN (LẦN #${previousAttempt.attemptNumber} — BAND ${previousAttempt.overallBand.toFixed(1)}) ===
Học viên vừa tự chỉnh sửa bài viết từ lần trước. BẮT BUỘC đối chiếu bản mới với bản cũ này để đóng vai GIA SƯ KÈM 1-1:
- Điểm lần trước: TA/TR ${previousAttempt.bands.task.toFixed(1)} | CC ${previousAttempt.bands.cc.toFixed(1)} | GRA ${previousAttempt.bands.gra.toFixed(1)} | LR ${previousAttempt.bands.lr.toFixed(1)}
- Các lỗi chính lần trước đã nhắc:
${previousAttempt.keyIssues.length > 0 ? previousAttempt.keyIssues.map((x) => `  * ${x}`).join('\n') : '  * (Không ghi chú)'}
- Bản viết lần trước:
"""
${previousAttempt.content}
"""
-> Trong "tutorClosingNote", HÃY chỉ đích danh: học viên đã sửa tốt điểm nào so với bản trước, điểm nào sửa chưa tới hoặc còn sót lại!
`;
}

export function buildAlignedCriteriaDirectives(params: {
  taskType: 'task1' | 'task2';
  isFullEssay: boolean;
}): string {
  const { taskType, isFullEssay } = params;
  const taskShort = taskType === 'task1' ? 'TA' : 'TR';
  const unitLabel = isFullEssay ? 'toàn bài (gọi rõ từng Đoạn & từng Câu)' : 'Body hiện tại (gọi rõ Câu 1, Câu 2, Sau Câu 2...)';

  return `
=== HỆ QUY CHIẾU GIA SƯ KÈM NÂNG TỪ BAND 6.0 LÊN BAND 8.0 (${taskShort} 8.0 · CC 9.0 · GRA 8.0 · LR 7.0) ===
Mục tiêu tuyệt đối: Biến feedback thành bài học 1-1 giúp người học TỰ NHẬN RA TƯ DUY BAND 6 CỦA MÌNH VÀ BIẾT CHÍNH XÁC CẦN ĐỔI GÌ ĐỂ LÊN BAND 8.0+.

1. NGUYÊN TẮC SIÊU CHI TIẾT & ĐỒNG BỘ 100% TRÊN CẢ 4 TIÊU CHÍ:
   - Trước khi viết JSON, lập MỘT KẾ HOẠCH SỬA DUY NHẤT bám thẳng vào đúng các câu học viên đã viết trong ${unitLabel}, rồi ánh xạ KHỚP NHAU trên cả 4 tiêu chí (KHÔNG mâu thuẫn từ vựng/cấu trúc giữa 4 tiêu chí!).
   - MỖI TIÊU CHÍ BẮT BUỘC có đủ 4 tầng huấn luyện:
     (a) "reason": Chẩn đoán sắc bén bài đang dừng ở Band mấy theo IELTS Band Descriptors và MẤT ĐIỂM Ở CHỖ NÀO so với ngưỡng (${taskShort} 8.0 / CC 9.0 / GRA 8.0 / LR 7.0).
     (b) "mindsetShift": Bóc tách **THAY ĐỔI TƯ DUY** cụ thể — chỉ ra thói quen tư duy Band 6 của học viên trong bài này là gì, và người viết Band 8–9 tư duy khác đi như thế nào.
     (c) "mappings": 2–4 điểm chỉnh sửa SIÊU CHI TIẾT (chỉ đích danh vị trí câu/cụm, trích "currentText", giải thích VÌ SAO cần sửa và CÁCH SỬA từng bước trong "actionGuide", kèm "suggestedPhrases" và "improvedExample" là cụm/khung câu ngắn ngay đúng vị trí đó).
     (d) "whatToStudy": 1–3 chủ điểm cụ thể NÊN HỌC THÊM (nếu tiêu chí chưa đạt hoặc còn điểm hổng kiến thức nền, VD: kỹ thuật nối chủ ngữ Old->New cho CC 9.0, phân từ rút gọn & mệnh đề quan hệ không xác định cho GRA 8.0, cụm collocation B1–B2 bản xứ cho LR 7.0+).

2. YÊU CẦU KHẮT KHE THEO TỪNG MỤC TIÊU ĐIỂM:
   - "${taskShort}" (MỤC TIÊU >= 8.0): Soi cực gắt độ bám đề, chiều sâu ${taskType === 'task1' ? 'gom nhóm dữ liệu, đối chiếu định lượng & chính xác 100% số liệu' : 'lập luận nhân-quả tầng sâu, không nhảy cóc logic, ví dụ thực tế thuyết phục'}. Nếu thiếu ý/thiếu phân tích -> dùng issueType "add" chỉ rõ cần thêm ý gì ngay sau câu nào + gợi ý cụm B1–B2.
   - "CC" (MỤC TIÊU = 9.0 — CHUẨN ĐỈNH CAO NHẤT):
     * Band 9.0 CC nghĩa là **liên kết "tàng hình" (attracts no attention)**: dòng chảy Old Information -> New Information mượt tuyệt đối, dùng phép quy chiếu tinh tế ("this trend", "such measures", "the former", "mirroring this pattern"), chuyển ý bằng logic nội dung chứ KHÔNG phụ thuộc từ nối đầu câu ("Firstly, Secondly, Moreover, Furthermore, In addition, On the other hand, In conclusion").
     * Nếu bài còn dùng từ nối liệt kê máy móc, nhảy ý đột ngột, hoặc lặp lại cùng 1 chủ ngữ rời rạc -> TRẦN CC <= 7.5–8.0 và chỉ rõ từng vị trí trong "CC.mappings" cần bỏ/đổi từ nối nào sang phép quy chiếu gì, VÌ SAO.
   - "GRA" (MỤC TIÊU >= 8.0 — ĐA DẠNG & ĐỘ CHÍNH XÁC CAO):
     * Band 8.0 GRA đòi hỏi **đa số câu hoàn toàn sạch lỗi (error-free)** VÀ có **nhịp điệu câu phức linh hoạt, tự nhiên** (mệnh đề nhượng bộ While/Whereas/Although, mệnh đề quan hệ không xác định ", which + V", cụm phân từ V-ing/V-ed, cấu trúc with + N + V-ing, bị động/so sánh tinh tế cho Task 1 hoặc câu điều kiện/giả định/danh từ hóa vừa phải cho Task 2).
     * Nếu toàn câu đơn ghép "and/but/so", lặp 1 mẫu câu phức, hoặc còn lỗi mạo từ/chia động từ/giới từ/dấu phẩy -> TRẦN GRA <= 6.5–7.5 và chỉ rõ cách gộp/nâng cấp cấu trúc ngay trên câu học viên đã viết!
   - "LR" (MỤC TIÊU >= 7.0 — TỰ NHIÊN, ĐÚNG COLLOCATION B1–B2, KHÔNG ÉP TỪ C2 HIẾM):
     * Chấm công tâm theo chuẩn **7.0 LR**: ưu tiên **collocation B1–B2 chuẩn bản xứ viết học thuật**, dùng chính xác sắc thái (word choice & register) và ít lặp từ. KHÔNG hạ < 7.0 chỉ vì thiếu từ C1–C2 hiếm! Chỉ trừ <= 6.5 khi dịch word-by-word từ tiếng Việt, sai collocation, lặp từ đơn giản, hoặc dùng sai loại từ.

3. CẤM VIẾT HỘ ĐOẠN MỚI ĐỂ HỌC THUỘC KHI CHƯA ĐẠT:
   - "improvedExample" trong "mappings" CHỈ là cụm thay thế hoặc 1 khung câu sửa đúng chỗ đó — TUYỆT ĐỐI không dán nguyên đoạn văn mới thay thế.
   - "vocabularyTips" ánh xạ 1-1 với "LR.mappings"; "grammarErrors" ánh xạ 1-1 với các lỗi sửa trong "GRA.mappings".

4. ĐOẠN CHỐT NHẬN XÉT GIA SƯ BẰNG TIẾNG VIỆT ("tutorClosingNote" — BẮT BUỘC CÓ):
   - Viết như một GIA SƯ IELTS WRITING THỰC THỤ đang ngồi kèm 1-1 ngay cạnh học viên (khoảng 160–240 từ tiếng Việt, chia thành 3–4 đoạn ngắn rõ ràng bằng \\n\\n):
     * Đoạn 1 (Chẩn đoán tổng thể & Điểm sáng): Bóc tách thẳng bài này đang mang dáng dấp Band mấy (6.0 / 6.5 / 7.0 / 8.0), khen đúng chỗ học viên viết có lực (trích cụ thể).
     * Đoạn 2 (Bóc tách 1–2 nút thắt gốc rễ đang kéo điểm): Giải thích thói quen tư duy/viết lách nào đang khiến bài chưa lên được ngưỡng ${taskShort} 8.0 · CC 9.0 · GRA 8.0 · LR 7.0 (nếu có bản nháp lần trước thì đối chiếu trực tiếp tiến bộ và chỗ còn sót).
     * Đoạn 3 (Kế hoạch hành động sửa ngay lần tới — Thứ tự ưu tiên 1 -> 2 -> 3): Chỉ rõ thứ tự sửa khôn ngoan nhất ngay trên bài hiện tại để nhảy band nhanh nhất mà không bị rối.
     * Đoạn 4 (Lời chốt định hướng nâng từ 6 -> 8): Một lời nhắc tư duy cốt lõi ngắn gọn giúp học viên nhớ lâu cho các bài sau.
`;
}

export function buildCriterionJsonShape(critDesc: string, sampleBand = 7.0): string {
  return `{
      "band": ${sampleBand.toFixed(1)},
      "reason": "Chẩn đoán chi tiết theo IELTS Band Descriptors (${critDesc}).",
      "mindsetShift": "Thay đổi tư duy (Band 6 -> Band 8/9): Hiện tại bạn đang tư duy theo hướng [...], để đạt mục tiêu hãy chuyển sang tư duy [...].",
      "mappings": [
        {
          "targetLocation": "Vị trí chính xác (VD: 'Câu 1', 'Đoạn 2 — Sau Câu 2 (...)', 'Cụm ... ở Câu 3')",
          "issueType": "add | replace | fix_error",
          "currentText": "Trích nguyên văn cụm/câu hiện tại của học viên (để '' nếu là slot 'add')",
          "actionGuide": "Hướng dẫn SIÊU CHI TIẾT: sai/yếu ở đâu, vì sao giám khảo trừ điểm, cần thay đổi hoặc bổ sung chính xác cái gì theo hướng nào.",
          "suggestedPhrases": ["cụm từ / phép quy chiếu / cấu trúc cụ thể 1", "cụm 2", "cụm 3"],
          "improvedExample": "Cụm từ đổi tự nhiên hoặc 1 khung câu sửa đúng vị trí này (KHÔNG viết lại cả đoạn mới)"
        }
      ],
      "whatToStudy": ["Chủ điểm kiến thức / kỹ thuật viết cụ thể cần ôn thêm 1", "Chủ điểm 2"],
      "evidence": ["Trích dẫn ngắn các điểm chính từ bài viết"],
      "fixes": ["Tóm tắt 1 dòng hành động tương ứng từng mapping"]
    }`;
}

export function buildUnifiedGradeJsonSchema(params: {
  taskShort: 'TA' | 'TR';
  extraFieldsSchema?: string;
  modelUpgradeInstruction: string;
}): string {
  const { taskShort, extraFieldsSchema = '', modelUpgradeInstruction } = params;

  return `{
  "criteria": {
    "task": ${buildCriterionJsonShape(`${taskShort} >= 8.0: bám đề, độ sâu lập luận/số liệu, điểm thiếu cần bổ sung`, 7.5)},
    "cc": ${buildCriterionJsonShape('CC = 9.0: liên kết tàng hình Old->New, phép quy chiếu tinh tế, loại bỏ từ nối máy móc', 7.5)},
    "gra": ${buildCriterionJsonShape('GRA >= 8.0: đa dạng cấu trúc phức tự nhiên & độ chính xác cao sạch lỗi', 7.0)},
    "lr": ${buildCriterionJsonShape('LR >= 7.0: collocation B1-B2 bản xứ tự nhiên, sắc thái chính xác, tránh lặp & dịch từng chữ', 7.0)}
  },
  ${extraFieldsSchema}
  "grammarErrors": [
    {
      "original": "Đúng cụm/câu lỗi đã nêu ở GRA.mappings",
      "correction": "Cách sửa chuẩn xác Band 8.0",
      "explanation": "Giải thích chi tiết sai ở quy tắc ngữ pháp nào và cách tránh lặp lại"
    }
  ],
  "vocabularyTips": [
    {
      "studentWord": "Đúng từ/cụm thiếu tự nhiên đã nêu ở LR.mappings",
      "betterAlternative": "Collocation B1–B2 tự nhiên chuẩn bản xứ",
      "reason": "Vì sao tự nhiên, đúng sắc thái và khớp ý hơn"
    }
  ],
  "generalFeedback": "Tóm tắt ngắn gọn 2 câu tiếng Việt về trạng thái đạt/chưa đạt mục tiêu (${taskShort} 8.0 · CC 9.0 · GRA 8.0 · LR 7.0 — Overall 8.0).",
  "tutorClosingNote": "Đoạn chốt 160–240 từ tiếng Việt đóng vai gia sư Writing kèm 1-1: bóc tách điểm mạnh/nút thắt gốc rễ, lộ trình ưu tiên sửa 1-2-3 ngay lần tới, và lời nhắc tư duy nâng từ Band 6 lên Band 8 (dùng \\n\\n để tách đoạn rõ ràng).",
  "modelUpgrade": "${modelUpgradeInstruction}"
}`;
}

export function buildTaskCcPhaseSchema(params: {
  taskShort: 'TA' | 'TR';
  extraFieldsSchema?: string;
}): string {
  const { taskShort, extraFieldsSchema = '' } = params;
  return `{
  "criteria": {
    "task": ${buildCriterionJsonShape(`${taskShort} >= 8.0: bám đề, độ sâu lập luận/số liệu, phần thiếu cần tự viết thêm`, 7.5)},
    "cc": ${buildCriterionJsonShape('CC = 9.0: liên kết tàng hình Old->New, phép quy chiếu tinh tế, loại bỏ từ nối máy móc', 7.5)}
  }${extraFieldsSchema ? `,\n  ${extraFieldsSchema}` : ''}
}`;
}

export function buildGraLrPhaseSchema(): string {
  return `{
  "criteria": {
    "gra": ${buildCriterionJsonShape('GRA >= 8.0: đa dạng cấu trúc phức tự nhiên & độ chính xác cao sạch lỗi', 7.0)},
    "lr": ${buildCriterionJsonShape('LR >= 7.0: collocation B1-B2 bản xứ tự nhiên, sắc thái chính xác, tránh lặp & dịch từng chữ', 7.0)}
  },
  "grammarErrors": [
    {
      "original": "Đúng cụm/câu lỗi đã nêu ở GRA.mappings",
      "correction": "Cách sửa chuẩn xác Band 8.0",
      "explanation": "Giải thích chi tiết sai ở quy tắc ngữ pháp nào và cách tránh lặp lại"
    }
  ],
  "vocabularyTips": [
    {
      "studentWord": "Đúng từ/cụm thiếu tự nhiên đã nêu ở LR.mappings",
      "betterAlternative": "Collocation B1–B2 tự nhiên chuẩn bản xứ",
      "reason": "Vì sao tự nhiên, đúng sắc thái và khớp ý hơn"
    }
  ]
}`;
}

export function buildTutorClosingPhaseSchema(params: {
  taskShort: 'TA' | 'TR';
  includeParagraphBreakdown?: boolean;
  modelUpgradeInstruction: string;
}): string {
  const { taskShort, includeParagraphBreakdown = false, modelUpgradeInstruction } = params;
  const paragraphSchema = includeParagraphBreakdown
    ? `"paragraphBreakdown": [
    {
      "label": "Đoạn 1 (Mở bài / Intro)",
      "role": "Chức năng đoạn này trong cấu trúc chuẩn",
      "strengths": "Điểm làm tốt của đoạn",
      "weaknesses": "Điểm còn yếu / mất điểm của đoạn",
      "suggestedEdit": "Hướng tự sửa & bổ sung cụ thể ngay trên câu cũ của đoạn này + liệt kê cụm B1–B2 nên dùng (KHÔNG dán nguyên đoạn viết mới)."
    }
  ],\n  `
    : '';

  return `{
  ${paragraphSchema}"generalFeedback": "Tóm tắt ngắn gọn 2 câu tiếng Việt về trạng thái đạt/chưa đạt (${taskShort} 8.0 · CC 9.0 · GRA 8.0 · LR 7.0 — Overall 8.0).",
  "tutorClosingNote": "Đoạn chốt 160–240 từ tiếng Việt đóng vai gia sư Writing kèm 1-1: bóc tách điểm sáng, nút thắt gốc rễ, lộ trình ưu tiên sửa 1-2-3 ngay lần tới và tư duy bứt phá từ Band 6 lên Band 8 (dùng \\n\\n tách đoạn).",
  "modelUpgrade": "${modelUpgradeInstruction}"
}`;
}
