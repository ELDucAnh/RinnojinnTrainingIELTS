// lib/writing-grade-prompt.ts
// Shared prompt guidelines for IELTS Writing Band 6 -> Band 8 Tutor
// Target matrix: TA/TR >= 8.0 | CC = 9.0 | GRA >= 8.0 | LR = 7.0 -> Overall >= 8.0

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
  const unitLabel = isFullEssay ? 'toàn bài (gọi rõ từng Đoạn & từng Câu)' : 'Body hiện tại (gọi rõ Câu 1, Câu 2, Câu 3, Câu 4...)';

  return `
=== HỆ QUY CHIẾU GIA SƯ KÈM NÂNG TỪ BAND 6.0 LÊN BAND 8.0 (${taskShort} 8.0 · CC 9.0 · GRA 8.0 · LR 7.0) ===
Mục tiêu tuyệt đối: Feedback phải RÕ RÀNG, CHÍNH XÁC TUYỆT ĐỐI VỀ NGỮ PHÁP KHI THAY VÀO, đặc biệt MỔ XẺ SIÊU RÕ **Coherence & Cohesion (CC 9.0)**.

1. QUY TẮC SỐNG CÒN CHỐNG SỬA NỬA VẾ LÀM SAI NGỮ PHÁP CẢ CÂU (BẮT BUỘC 100%):
   - LỖI NGHIÊM TRỌNG CẤM MẮC PHẢI: TUYỆT ĐỐI KHÔNG BAO GIỜ chỉ cắt một nửa vế câu rồi đề xuất sửa riêng vế sau khiến học viên ghép vào bị lỗi ngữ pháp (ví dụ: comma splice, mất động từ chính, dư "but" sau "although", đổi V sang V-ing làm cụt mệnh đề, sai chia thì hoặc đứt đại từ quy chiếu với vế đầu!).
   - QUY TẮC BẮT BUỘC CHO MỌI MỤC TRONG "mappings", "ccFlowAudit" VÀ "grammarErrors":
     * "currentText" / "currentSentence": BẮT BUỘC trích **NGUYÊN VĂN TRỌN VẸN CẢ CÂU** của học viên (có viết hoa đầu câu và dấu chấm cuối câu; nếu lỗi nằm ở sự nối giữa 2 câu thì trích trọn vẹn cả 2 câu liên tiếp!).
     * "improvedExample" / "fixedFullSentence": BẮT BUỘC viết ra **NGUYÊN VĂN TRỌN VẸN CẢ CÂU HOÀN CHỈNH** sau khi đã chỉnh sửa đúng điểm đó — giữ nguyên ý tưởng và các phần viết đúng của học viên, NHƯNG đã điều chỉnh đồng bộ cả vế đầu lẫn vế sau để học viên thay nguyên câu vào là **ĐÚNG NGỮ PHÁP 100%**, không bị gãy cấu trúc!
     * TỰ KIỂM TRA TRƯỚC KHI XUẤT MỌI CÂU SỬA: Kiểm tra kỹ (1) Chủ ngữ – Động từ chính đủ và khớp số ít/số nhiều, (2) Không có comma splice (2 mệnh đề độc lập nối bằng dấu phẩy), (3) Không lặp liên từ ("Although ... but ...", "Because ... so ..."), (4) Mạo từ & giới từ chính xác, (5) Đại từ quy chiếu ("this", "it", "they", "which") trỏ đúng danh từ.
     * Đối với "vocabularyTips" (cặp từ đơn/cụm từ): "betterAlternative" BẮT BUỘC có **CÙNG TỪ LOẠI, CÙNG CHIA THÌ VÀ KÈM ĐÚNG GIỚI TỪ** với "studentWord" để thay 1-1 không bao giờ làm hỏng ngữ pháp câu!
     * KHÔNG viết lại cả một đoạn văn hoàn toàn mới trong "mappings" — mỗi mapping CHỈ sửa trọn vẹn đúng 1 câu (hoặc đúng 1 cặp 2 câu nối nhau) học viên đã viết!

2. TÂM ĐIỂM RÕ NHẤT — COHERENCE & COHESION (CC = 9.0 THEO ĐÚNG OFFICIAL IELTS BAND 9 DESCRIPTORS):
   Mọi đánh giá CC và mảng "ccFlowAudit" PHẢI bám sát 4 trụ cột chuẩn Cambridge Band 9.0 CC:
   (1) **"The message can be followed effortlessly"** — Người đọc lướt từ Câu 1 → Câu 2 → Câu 3 → Câu 4 không bị khựng nửa giây nào; cuối câu trước dẫn thẳng sang đầu câu sau (mạch Thông tin Cũ -> Thông tin Mới).
   (2) **"Cohesion is used in such a way that it very rarely / never attracts attention"** — Liên kết "tàng hình": dùng phép quy chiếu tinh tế ("this shift", "such policies", "this high cost", "doing so", "the former", "respectively") và chuỗi từ vựng cùng trường nghĩa thay vì đặt từ nối lộ liễu/máy móc ở đầu câu ("Firstly, Secondly, Moreover, Furthermore, In addition, On the other hand, In conclusion").
   (3) **"Any lapses in coherence or cohesion are minimal"** — Không nhảy cóc logic giữa 2 câu liên tiếp, không dùng đại từ mơ hồ ("it / this / they" không rõ trỏ về danh từ nào).
   (4) **"Paragraphing is skilfully managed"** — Một trọng tâm rõ ràng xuyên suốt đoạn, thứ tự câu logic (Topic Claim -> Giải thích -> Minh họa -> Chốt/Chuyển ý) và liên kết mượt với các Body xung quanh.
   - BẮT BUỘC xuất mảng **"ccFlowAudit"** mổ xẻ **TỪNG ĐIỂM CHUYỂN CÂU LIÊN TIẾP** trong ${unitLabel} (VD: "Body trước → Câu 1", "Câu 1 → Câu 2", "Câu 2 → Câu 3", "Câu 3 → Câu 4"...):
     * Nếu câu nối nào đã mượt chuẩn 9.0 -> ghi status "seamless" và khen đúng kỹ thuật đã làm được.
     * Nếu câu nối nào còn dùng từ nối lộ ("mechanical"), nhảy ý/khựng mạch ("abrupt"), hoặc đại từ quy chiếu mơ hồ ("unclear_ref") -> chỉ rõ VÌ SAO chưa đạt Band 9 CC, hướng dẫn CÁCH NỐI LẠI (bắt lại ý nào ở câu trước, bỏ từ nối nào, thay bằng phép quy chiếu/thứ tự chủ ngữ nào), và cung cấp "fixedFullSentence" là **NGUYÊN VĂN CẢ CÂU HOÀN CHỈNH** đã sửa mượt & đúng ngữ pháp 100%!

3. ĐỒNG BỘ 100% TRÊN CẢ 4 TIÊU CHÍ (KHÔNG MÂU THUẪN NHAU):
   - Lập MỘT kế hoạch sửa duy nhất trên ${unitLabel} rồi ánh xạ khớp nhau giữa ${taskShort}, CC, GRA, LR.
   - MỖI TIÊU CHÍ BẮT BUỘC có đủ 4 tầng:
     (a) "reason": Chẩn đoán sắc bén bài đang ở Band mấy theo IELTS Band Descriptors và thiếu gì để lên ngưỡng (${taskShort} 8.0 / CC 9.0 / GRA 8.0 / LR 7.0).
     (b) "mindsetShift": Thay đổi tư duy cụ thể (Band 6 nghĩ thế nào vs Band 8–9 nghĩ thế nào).
     (c) "mappings": 2–4 điểm chỉnh sửa SIÊU CHI TIẾT bám đúng từng Câu, luôn đưa **TRỌN VẸN CẢ CÂU** ở "currentText" và "improvedExample" để tuyệt đối không làm hỏng ngữ pháp khi thay vào!
     (d) "whatToStudy": 1–3 chủ điểm kiến thức cụ thể NÊN HỌC THÊM (nếu cần).

4. YÊU CẦU KHẮT KHE CHO 3 TIÊU CHÍ CÒN LẠI:
   - "${taskShort}" (MỤC TIÊU >= 8.0): Soi cực gắt độ bám đề, chiều sâu ${taskType === 'task1' ? 'gom nhóm dữ liệu, đối chiếu định lượng & chính xác 100% số liệu' : 'lập luận nhân-quả tầng sâu, không nhảy cóc logic, ví dụ thực tế thuyết phục'}. Nếu thiếu ý -> dùng issueType "add" chỉ rõ cần thêm câu vào sau Câu nào + khung câu hoàn chỉnh rõ ngữ pháp + cụm B1–B2.
   - "GRA" (MỤC TIÊU >= 8.0 — ĐA DẠNG CÂU ĐƠN & CÂU PHỨC + SẠCH LỖI):
     * Band 8.0 GRA đòi hỏi **đa số câu hoàn toàn sạch lỗi (error-free)** VÀ **phối hợp nhịp nhàng giữa Câu đơn (sắc gọn) và Câu phức/ghép tự nhiên** (While/Whereas/Although, ", which + V", phân từ rút gọn, with + N + V-ing, điều kiện/bị động/so sánh).
     * Khi sửa lỗi ngữ pháp trong "GRA.mappings" và "grammarErrors", LUÔN hiển thị CẢ CÂU HOÀN CHỈNH đã sửa sạch mọi lỗi liên đới (chủ-vị, mạo từ, giới từ, dấu phẩy, thì)!
   - "LR" (MỤC TIÊU CHỈ CẦN = 7.0 — TỪ VỰNG B1–B2 PHỔ THÔNG, RÕ NGHĨA, 100% SÁT ĐỀ, CẤM KHOE TỪ CAO SIÊU):
     * Học viên CHỈ aim **LR 7.0** (vì 8 TA/TR + 9 CC + 8 GRA + 7 LR = 8.0 Overall). Band 7.0 LR KHÔNG CẦN từ C1–C2! Chỉ cần từ **B1–B2 quen thuộc, tự nhiên, đúng collocation, sát chủ đề đề bài** và không lặp từ sơ đẳng quá nhiều.
     * TUYỆT ĐỐI KHÔNG hạ < 7.0 chỉ vì học viên dùng từ phổ thông rõ nghĩa! Chỉ sửa khi sai collocation, dịch word-by-word từ tiếng Việt, lặp từ liên tục hoặc dùng sai sắc thái/lệch đề.
     * **CẤM TUYỆT ĐỐI** đề xuất các từ C1–C2 hoa mỹ/dễ gây lệch đề (*ubiquitous, exacerbate, ameliorate, mitigate, proliferate, paramount, deleterious, detrimental, unprecedented, multifaceted, paradigm shift, galvanize, bolster, perpetuate, unyielding, supremacy, indispensable, myriad, plethora, ramifications, repercussions, trajectory, skyrocket, plummet, eclipse, dwarf, stark dichotomy*).

5. ĐOẠN CHỐT NHẬN XÉT GIA SƯ BẰNG TIẾNG VIỆT ("tutorClosingNote" — BẮT BUỘC CÓ):
   - Viết như một GIA SƯ IELTS WRITING THỰC THỤ kèm 1-1 (khoảng 160–240 từ tiếng Việt, chia 3–4 đoạn ngắn bằng \\n\\n):
     * Đoạn 1: Chẩn đoán thẳng bài này đang ở dáng dấp Band mấy (6.0 / 6.5 / 7.0 / 8.0) & khen đúng điểm sáng cụ thể.
     * Đoạn 2: Bóc tách 1–2 nút thắt gốc rễ (đặc biệt nhấn mạnh mạch CC 9.0 & cấu trúc câu GRA 8.0; nếu có bản nháp lần trước thì đối chiếu trực tiếp tiến bộ và chỗ còn sót).
     * Đoạn 3: Thứ tự ưu tiên sửa ngay 1 -> 2 -> 3 để nhảy band nhanh nhất mà không rối.
     * Đoạn 4: Một câu chốt tư duy cốt lõi giúp học viên nâng từ Band 6 lên Band 8.
`;
}

export function buildCriterionJsonShape(critDesc: string, sampleBand = 7.0): string {
  return `{
      "band": ${sampleBand.toFixed(1)},
      "reason": "Chẩn đoán chi tiết theo IELTS Band Descriptors (${critDesc}).",
      "mindsetShift": "Thay đổi tư duy (Band 6 -> mục tiêu): Hiện tại bạn đang viết theo thói quen [...], để đạt mục tiêu hãy chuyển sang tư duy [...].",
      "mappings": [
        {
          "targetLocation": "Vị trí chính xác (VD: 'Câu 1', 'Câu 2 → Câu 3', 'Sau Câu 2')",
          "issueType": "add | replace | fix_error",
          "currentText": "NGUYÊN VĂN TRỌN VẸN CẢ CÂU hiện tại của học viên (hoặc câu đứng trước nếu là slot 'add')",
          "actionGuide": "Giải thích RÕ RÀNG: sai/yếu ở chỗ nào, vì sao giám khảo trừ điểm, cần sửa đồng bộ vế nào với vế nào để câu mượt & chuẩn ngữ pháp.",
          "suggestedPhrases": ["cụm B1-B2 / phép quy chiếu / cấu trúc cụ thể 1", "cụm 2"],
          "improvedExample": "NGUYÊN VĂN TRỌN VẸN CẢ CÂU HOÀN CHỈNH sau khi sửa (đã kiểm tra 100% đúng ngữ pháp, khớp vế đầu–vế sau, thay vào là chạy ngay; KHÔNG cắt nửa vế, KHÔNG viết lại nguyên đoạn mới!)"
        }
      ],
      "whatToStudy": ["Chủ điểm kiến thức / kỹ thuật cụ thể cần ôn thêm 1", "Chủ điểm 2"],
      "evidence": ["Trích dẫn ngắn các điểm chính từ bài viết"],
      "fixes": ["Tóm tắt 1 dòng hành động tương ứng từng mapping"]
    }`;
}

const CC_FLOW_AUDIT_SCHEMA = `"ccFlowAudit": [
    {
      "transition": "Tên điểm nối (VD: 'Body trước → Câu 1', 'Câu 1 → Câu 2', 'Câu 2 → Câu 3', 'Câu 3 → Câu 4')",
      "status": "seamless | mechanical | abrupt | unclear_ref",
      "currentSentence": "Nguyên văn CẢ CÂU hiện tại của học viên tại điểm chuyển này",
      "diagnosis": "Phân tích cực rõ theo 4 trụ cột Band 9 CC (Effortless to follow? Cohesion attracts attention? Minimal lapses? Paragraphing?): chỗ nối này đang bị khựng/lộ/mơ hồ ở đâu?",
      "howToFix": "Hướng dẫn cụ thể cần bỏ từ nối máy móc nào, bắt lại ý cũ nào ở câu trước (Old -> New), dùng phép quy chiếu/cấu trúc nối nào để mạch đọc 'tàng hình' chuẩn Band 9.0 CC",
      "fixedFullSentence": "NGUYÊN VĂN CẢ CÂU HOÀN CHỈNH sau khi sửa nối CC 9.0 (đã kiểm tra 100% đúng ngữ pháp cả câu, thay thẳng nguyên câu vào bài là khớp; nếu status là 'seamless' thì ghi lại chính câu của học viên)"
    }
  ]`;

export function buildUnifiedGradeJsonSchema(params: {
  taskShort: 'TA' | 'TR';
  extraFieldsSchema?: string;
  modelUpgradeInstruction: string;
}): string {
  const { taskShort, extraFieldsSchema = '', modelUpgradeInstruction } = params;

  return `{
  "criteria": {
    "task": ${buildCriterionJsonShape(`${taskShort} >= 8.0: bám đề, độ sâu lập luận/số liệu, điểm thiếu cần bổ sung`, 7.5)},
    "cc": ${buildCriterionJsonShape('CC = 9.0 (TÂM ĐIỂM): effortless readability, invisible cohesion (very rarely attracts attention), minimal lapses, skilful paragraphing', 7.5)},
    "gra": ${buildCriterionJsonShape('GRA >= 8.0: phối hợp nhịp câu đơn & câu phức tự nhiên, đa số câu sạch lỗi 100%', 7.0)},
    "lr": ${buildCriterionJsonShape('LR = 7.0 ONLY: collocation B1-B2 phổ thông tự nhiên, bám sát đúng đề, CẤM gợi ý từ C1-C2 cao siêu hay làm lệch đề', 7.0)}
  },
  ${CC_FLOW_AUDIT_SCHEMA},
  ${extraFieldsSchema}
  "grammarErrors": [
    {
      "original": "NGUYÊN VĂN CẢ CÂU (hoặc mệnh đề hoàn chỉnh) có lỗi ngữ pháp",
      "correction": "NGUYÊN VĂN CẢ CÂU HOÀN CHỈNH sau khi sửa sạch lỗi (đảm bảo 100% đúng chủ-vị, thì, mạo từ, dấu câu khi thay vào)",
      "explanation": "Giải thích rõ sai ở quy tắc nào và vì sao phải sửa đồng bộ cả câu như vậy"
    }
  ],
  "vocabularyTips": [
    {
      "studentWord": "Đúng từ/cụm sai collocation, dịch từng chữ hoặc bị lặp (KHÔNG bắt bẻ từ B1-B2 đã đúng)",
      "betterAlternative": "Cụm B1–B2 phổ thông CÙNG TỪ LOẠI & GIỚI TỪ (thay 1-1 không phá ngữ pháp, TUYỆT ĐỐI không dùng từ hiếm C1–C2)",
      "reason": "Vì sao tự nhiên, đúng collocation và bám sát đề bài hơn"
    }
  ],
  "generalFeedback": "Tóm tắt ngắn gọn 2 câu tiếng Việt về trạng thái đạt/chưa đạt mục tiêu (${taskShort} 8.0 · CC 9.0 · GRA 8.0 · LR 7.0 — Overall 8.0).",
  "tutorClosingNote": "Đoạn chốt 160–240 từ tiếng Việt đóng vai gia sư Writing kèm 1-1: bóc tách điểm mạnh/nút thắt gốc rễ (đặc biệt CC 9.0 & câu phức GRA 8.0), lộ trình ưu tiên sửa 1-2-3 ngay lần tới, và lời nhắc tư duy nâng từ Band 6 lên Band 8 (dùng \\n\\n để tách đoạn rõ ràng).",
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
    "cc": ${buildCriterionJsonShape('CC = 9.0 (TÂM ĐIỂM): effortless readability, invisible cohesion (very rarely attracts attention), minimal lapses, skilful paragraphing', 7.5)}
  },
  ${CC_FLOW_AUDIT_SCHEMA}${extraFieldsSchema ? `,\n  ${extraFieldsSchema}` : ''}
}`;
}

export function buildGraLrPhaseSchema(): string {
  return `{
  "criteria": {
    "gra": ${buildCriterionJsonShape('GRA >= 8.0: phối hợp nhịp câu đơn & câu phức tự nhiên, đa số câu sạch lỗi 100%', 7.0)},
    "lr": ${buildCriterionJsonShape('LR = 7.0 ONLY: collocation B1-B2 phổ thông tự nhiên, bám sát đúng đề, CẤM gợi ý từ C1-C2 cao siêu hay lệch đề', 7.0)}
  },
  "grammarErrors": [
    {
      "original": "NGUYÊN VĂN CẢ CÂU có lỗi ngữ pháp",
      "correction": "NGUYÊN VĂN CẢ CÂU HOÀN CHỈNH sau khi sửa sạch lỗi (đảm bảo 100% đúng ngữ pháp khi thay vào)",
      "explanation": "Giải thích chi tiết sai ở quy tắc ngữ pháp nào và vì sao phải sửa đồng bộ cả câu"
    }
  ],
  "vocabularyTips": [
    {
      "studentWord": "Đúng từ/cụm sai collocation, dịch từng chữ hoặc bị lặp (KHÔNG bắt bẻ từ B1-B2 đã đúng)",
      "betterAlternative": "Cụm B1–B2 phổ thông CÙNG TỪ LOẠI & GIỚI TỪ (thay 1-1 không phá ngữ pháp, TUYỆT ĐỐI không dùng từ hiếm C1–C2)",
      "reason": "Vì sao tự nhiên, đúng collocation và bám sát đề bài hơn"
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
      "suggestedEdit": "Hướng tự sửa & bổ sung cụ thể ngay trên câu cũ của đoạn này (nếu đưa câu sửa phải là CẢ CÂU HOÀN CHỈNH đúng ngữ pháp, KHÔNG cắt nửa vế)."
    }
  ],\n  `
    : '';

  return `{
  ${paragraphSchema}"generalFeedback": "Tóm tắt ngắn gọn 2 câu tiếng Việt về trạng thái đạt/chưa đạt (${taskShort} 8.0 · CC 9.0 · GRA 8.0 · LR 7.0 — Overall 8.0).",
  "tutorClosingNote": "Đoạn chốt 160–240 từ tiếng Việt đóng vai gia sư Writing kèm 1-1: bóc tách điểm sáng, nút thắt gốc rễ (đặc biệt mạch CC 9.0), lộ trình ưu tiên sửa 1-2-3 ngay lần tới và tư duy bứt phá từ Band 6 lên Band 8 (dùng \\n\\n tách đoạn).",
  "modelUpgrade": "${modelUpgradeInstruction}"
}`;
}
