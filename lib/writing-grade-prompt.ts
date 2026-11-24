// lib/writing-grade-prompt.ts
// Shared prompt guidelines grounded in Official IELTS Writing Band Descriptors (May 2023 Update)
// Target matrix: TA/TR >= 8.0 | CC >= 8.5 | GRA >= 8.0 | LR >= 7.5 -> Overall >= 8.0

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
  const unitLabel = isFullEssay
    ? 'toàn bài (gọi rõ từng Đoạn & từng Câu)'
    : 'Body hiện tại (gọi rõ Câu 1, Câu 2, Câu 3, Câu 4...)';
  const maxInitialLinkersRule = isFullEssay
    ? 'tối đa 4 câu trên toàn bài mở đầu bằng trạng từ nối có dấu phẩy (However,/Therefore,/By contrast,/For example,...), và KHÔNG có 2 câu liên tiếp cùng mở đầu bằng trạng từ nối'
    : 'tối đa 1 câu trong Body này mở đầu bằng trạng từ nối có dấu phẩy (However,/Therefore,/By contrast,/As a result,/For example,...); dùng 0 hoặc 1 từ nối tự nhiên hợp ngữ cảnh = ĐẠT 100%';

  return `
=== HỆ QUY CHIẾU CHẤM ĐIỂM BÁM SÁT OFFICIAL IELTS WRITING BAND DESCRIPTORS (MAY 2023) ===
Mục tiêu đạt chuẩn: **${taskShort} >= 8.0 · CC >= 8.5 · GRA >= 8.0 · LR >= 7.5 (Overall >= 8.0)**.
TUYỆT ĐỐI KHÔNG CHẤM CẢM TÍNH HAY HÊN XUI! Mọi điểm số phải dựa trên tiêu chuẩn chính thức của IELTS (cập nhật tháng 5/2023) và bộ quy luật đếm cụ thể dưới đây.

1. BỘ 5 QUY LUẬT CỐ ĐỊNH CHẤM COHERENCE & COHESION (CC — MỤC TIÊU >= 8.5, CẤM CHẤM XỔ SỐ):
   Căn cứ Official IELTS Band Descriptors (May 2023):
   - Band 7 CC: "Information and ideas are logically organised, clear progression throughout; cohesive devices used with some over-/under-use."
   - Band 8 CC: "The message can be followed with ease. Information and ideas are logically sequenced, and cohesion is well managed. Occasional lapses may occur. Paragraphing is used sufficiently and appropriately."
   - Band 9 CC: "The message can be followed effortlessly. Cohesion is used in such a way that it very rarely attracts attention. Any lapses are minimal. Paragraphing is skilfully managed."

   Để loại bỏ hoàn toàn việc chấm cảm tính mỗi lần một điểm khác nhau, BẮT BUỘC kiểm tra từng quy luật từ R1 đến R5 trong mảng **"ccChecklist"**:
   - **R1 (Một trọng tâm duy nhất & Trật tự câu logic — Paragraphing & Sequencing)**:
     * ĐẠT (true): Đoạn giữ đúng 1 trọng tâm duy nhất và đi đúng trật tự chuẩn (${taskType === 'task1' ? 'Intro paraphrase đủ phạm vi; Overview chỉ nêu đặc điểm tổng quát không số liệu lẻ; Detail gom nhóm từ khái quát -> số liệu đối chiếu' : 'Intro dẫn đề -> Thesis; Thân bài đi từ Topic Sentence -> Giải thích cơ chế -> Ví dụ/Hệ quả -> Chốt ý; Kết bài tóm tắt không thêm ý mới'}).
     * VI PHẠM (false): Nhồi >1 luận điểm rời rạc vào 1 đoạn, đảo lộn trật tự logic, hoặc đứt mạch với các đoạn trước.
   - **R2 (Mạch tiến triển Cũ → Mới liền mạch — Linear Thematic Progression / "Followed with ease & effortlessly")**:
     * ĐẠT (true): Từ Câu 2 trở đi, mỗi câu đều có điểm neo nối tiếp ý từ câu ngay trước đó (Rheme câu trước -> Theme câu sau, hoặc cùng phát triển mạch chủ đề rõ ràng); người đọc theo dõi mượt từ đầu đến cuối không bị hẫng.
     * VI PHẠM (false): Có ít nhất 1 chỗ chuyển câu nhảy ý đột ngột khiến người đọc phải tự đoán mối liên hệ.
   - **R3 (Phép quy chiếu & Thay thế rõ gốc, không lặp danh từ thô — Clear Referencing & Substitution)**:
     * ĐẠT (true): Có sử dụng tự nhiên ít nhất 1–2 phép quy chiếu/thay thế ("this trend", "such policies", "this cost", "these figures", "doing so", "the former/latter", "respectively", "those who...") để nối câu VÀ mọi đại từ ("it, they, this, these, which") đều trỏ rõ ràng về đúng danh từ gốc (0 đại từ mơ hồ).
     * VI PHẠM (false): Lặp nguyên xi cùng một cụm danh từ làm chủ ngữ liên tiếp >= 3 câu mà không quy chiếu/thay thế, HOẶC dùng "it/this/they/which" mơ hồ không rõ gốc / sai số ít-nhiều.
   - **R4 (Kiểm soát mật độ từ nối — "Cohesion very rarely attracts attention / no mechanical overuse")**:
     * ĐẠT (true) KHI THỎA ĐỒNG THỜI 2 ĐIỀU KIỆN ĐẾM RÕ RÀNG:
       (a) **0 từ nối liệt kê/sáo rỗng máy móc đứng đầu câu**: CẤM dùng "Firstly,", "Secondly,", "Thirdly,", "First and foremost,", "Last but not least,", "In a nutshell,", "Moreover,", "Furthermore," ở đầu câu.
       (b) **Mật độ trạng từ nối đầu câu hợp lý**: ${maxInitialLinkersRule} (các câu còn lại nối bằng mệnh đề phụ thuộc While/Although/Whereas/Because, mệnh đề quan hệ ", which...", cụm giới từ "Beyond X, / Despite X,", hoặc danh từ quy chiếu "This shift...").
     * LƯU Ý CỐ ĐỊNH: Nếu học viên dùng 0 hoặc 1 từ nối tự nhiên hợp ngữ cảnh (VD: "By contrast,", "As a result,", "For instance,") và không dùng từ cấm ở mục (a) -> **BẮT BUỘC CHẤM R4 = true (ĐẠT)**, TUYỆT ĐỐI KHÔNG tự ý bắt lỗi "từ nối đầu câu" một cách cảm tính!
   - **R5 (Đúng 100% quan hệ logic & ngữ pháp của phép nối — Zero Misuse)**:
     * ĐẠT (true): Mọi liên từ/từ nối đều đúng bản chất quan hệ logic (đối lập/nguyên nhân-kết quả/nhượng bộ/ví dụ) VÀ đúng ngữ pháp câu nối (0 lỗi "Although... but...", 0 lỗi "Because... so...", 0 lỗi comma splice dùng ", however," nối 2 mệnh đề độc lập).
     * VI PHẠM (false): Dùng sai nghĩa từ nối hoặc nối câu sai ngữ pháp (comma splice / lặp liên từ).

   **CÔNG THỨC QUY ĐỔI ĐIỂM CC CỐ ĐỊNH (BẮT BUỘC TUÂN THỦ 100%)**:
   - Đạt **5/5** quy luật (R1..R5 đều true) => **CC = 8.5** (hoặc **9.0** nếu phép gói danh từ quy chiếu Rheme->Theme đặc biệt sắc sảo, tự nhiên tuyệt đối).
   - Đạt **4/5** quy luật (chỉ trượt đúng 1 quy luật) => **CC = 8.0** (hoặc **7.5** nếu lỗi trượt đó gây khựng mạch khá rõ).
   - Đạt **3/5** quy luật => **CC = 7.0 – 7.5**.
   - Đạt **<= 2/5** quy luật => **CC = 5.5 – 6.5**.
   -> Trong "criteria.cc.reason", BẮT BUỘC nêu rõ: *"Đạt X/5 quy luật CC chuẩn IELTS (trượt Quy luật ... vì ...)"* để học viên hiểu minh bạch 100% lý do điểm số!

2. TIÊU CHUẨN CHÍNH THỨC MAY 2023 CHO 3 TIÊU CHÍ CÒN LẠI:
   - **"${taskShort}" — MỤC TIÊU >= 8.0 (Official Band 8 Descriptor)**:
     * ${taskType === 'task1' ? 'Task 1 Band 8 TA: "Covers all requirements of the task appropriately, relevantly and sufficiently. Key features are skilfully selected, clearly presented, highlighted and illustrated." (Intro đủ chiều dữ liệu; Overview đủ 2 tầng xu hướng/đối lập không số liệu chi tiết; Detail gom nhóm thông minh, so sánh định lượng sắc bén, ĐÚNG 100% số liệu).' : 'Task 2 Band 8 TR: "The prompt is appropriately and sufficiently addressed. A clear and well-developed position is presented. Ideas are relevant, well extended and supported." (Trả lời đủ mọi vế đề hỏi, lập trường rõ xuyên suốt, luận điểm có cơ chế nhân-quả sâu + minh họa cụ thể thực tế, không nói chung chung hay bịa thống kê ảo).'}
   - **"gra" — Grammatical Range & Accuracy — MỤC TIÊU >= 8.0 (Official Band 8 Descriptor)**:
     * Band 8 GRA: *"A wide range of structures is flexibly and accurately used. The majority of sentences are error-free, and punctuation is well controlled."*
     * Phối hợp tự nhiên giữa Câu đơn (sắc gọn) và đa dạng Câu phức/ghép (While/Whereas/Although, mệnh đề quan hệ ", which + V", cụm phân từ, câu điều kiện, bị động, so sánh), với **trên 70–75% số câu hoàn toàn sạch lỗi ngữ pháp & dấu câu**.
   - **"lr" — Lexical Resource — MỤC TIÊU >= 7.5 (Official Band 7–8 Bridge Descriptor)**:
     * Band 7 LR: *"The resource is sufficient to allow some flexibility and precision. Some ability to use less common and/or idiomatic items. Awareness of style and collocation is evident."*
     * Band 8 LR: *"A wide resource is fluently and flexibly used to convey precise meanings within the scope of the task. Skilful use of uncommon and/or idiomatic items when appropriate."*
     * Để đạt **LR 7.5**: Học viên cần vốn từ **B2 vững + 2–3 cụm collocation học thuật tự nhiên sát đúng chủ đề đề bài (topic-specific collocations)**, xoay vòng paraphrase linh hoạt không lặp từ đơn giản, văn phong trang trọng chuẩn mực (không dùng từ khẩu ngữ như "kids, stuff, a lot of, big problem" lặp lại), và rất ít lỗi word choice / word formation / chính tả.
     * LƯU Ý QUAN TRỌNG CHO LR 7.5: Ưu tiên **độ chính xác sắc thái & collocation tự nhiên bám sát phạm vi đề ("within the scope of the task")** — VẪN CẤM nhồi từ C2 sáo rỗng/học vẹt dễ gây lệch đề ("memorised/pompous language" như *ubiquitous, exacerbate, ameliorate, unyielding supremacy, plethora, myriad, paradigm shift, skyrocket, plummet*).

3. QUY TẮC SỐNG CÒN CHỐNG SỬA NỬA VẾ LÀM SAI NGỮ PHÁP CẢ CÂU (BẮT BUỘC 100%):
   - TUYỆT ĐỐI CẤM chỉ cắt một nửa vế câu rồi đề xuất sửa riêng vế sau khiến học viên thay vào bị lỗi ngữ pháp (comma splice, mất động từ chính, dư "but" sau "although", đổi V sang V-ing làm cụt câu, đứt quy chiếu).
   - Mọi "currentText" / "currentSentence" và "improvedExample" / "fixedFullSentence" trong "mappings", "ccFlowAudit", "grammarErrors" BẮT BUỘC là **NGUYÊN VĂN TRỌN VẸN CẢ CÂU HOÀN CHỈNH** (đã tự kiểm tra 100% đúng Chủ–Vị, mạo từ, giới từ, dấu câu, liên từ; thay nguyên câu vào là khớp hoàn hảo!).
   - Với "vocabularyTips": "betterAlternative" BẮT BUỘC cùng từ loại, cùng chia thì và kèm đúng giới từ để thay 1-1 không làm hỏng câu.

4. ĐỒNG BỘ 4 TIÊU CHÍ & ĐOẠN CHỐT GIA SƯ TIẾNG VIỆT ("tutorClosingNote"):
   - Lập MỘT kế hoạch sửa duy nhất trên ${unitLabel} rồi ánh xạ đồng nhất trên ${taskShort}, CC, GRA, LR.
   - "tutorClosingNote": Đoạn chốt 160–240 từ tiếng Việt của GIA SƯ KÈM 1-1 (chia 3–4 đoạn bằng \\n\\n): (1) Chẩn đoán Band hiện tại & điểm sáng, (2) Bóc tách rõ vì sao đạt/chưa đạt mốc **8.0 ${taskShort} · 8.5 CC (X/5 quy luật) · 8.0 GRA · 7.5 LR** (đối chiếu bản cũ nếu có), (3) Thứ tự ưu tiên sửa 1 -> 2 -> 3 ngay lần tới, (4) Lời nhắc tư duy cốt lõi nâng Band 6 -> 8.
`;
}

export function buildCriterionJsonShape(critDesc: string, sampleBand = 7.5): string {
  return `{
      "band": ${sampleBand.toFixed(1)},
      "reason": "Chẩn đoán chi tiết bám sát Official IELTS Band Descriptors May 2023 (${critDesc}).",
      "mindsetShift": "Thay đổi tư duy (Band 6 -> mục tiêu): Hiện tại bạn đang viết theo thói quen [...], để đạt chuẩn giám khảo IELTS hãy chuyển sang [...].",
      "mappings": [
        {
          "targetLocation": "Vị trí chính xác (VD: 'Câu 1', 'Câu 2 → Câu 3', 'Sau Câu 2')",
          "issueType": "add | replace | fix_error",
          "currentText": "NGUYÊN VĂN TRỌN VẸN CẢ CÂU hiện tại của học viên (hoặc câu đứng trước nếu là slot 'add')",
          "actionGuide": "Giải thích RÕ RÀNG: sai/yếu ở chỗ nào theo IELTS Band Descriptors, cần sửa đồng bộ vế đầu và vế sau ra sao để đúng ngữ pháp & tự nhiên.",
          "suggestedPhrases": ["cụm collocation / phép quy chiếu / cấu trúc cụ thể 1", "cụm 2"],
          "improvedExample": "NGUYÊN VĂN TRỌN VẸN CẢ CÂU HOÀN CHỈNH sau khi sửa (đã kiểm tra 100% đúng ngữ pháp cả câu, thay vào chạy ngay; KHÔNG cắt nửa vế, KHÔNG viết lại cả đoạn mới!)"
        }
      ],
      "whatToStudy": ["Chủ điểm kiến thức / kỹ thuật cụ thể cần ôn thêm 1", "Chủ điểm 2"],
      "evidence": ["Trích dẫn ngắn các điểm chính từ bài viết"],
      "fixes": ["Tóm tắt 1 dòng hành động tương ứng từng mapping"]
    }`;
}

const CC_CHECKLIST_SCHEMA = `"ccChecklist": [
    {
      "ruleId": "R1",
      "ruleTitle": "Quy luật 1 — Một trọng tâm duy nhất & Trật tự câu logic (Paragraphing & Sequencing)",
      "passed": true,
      "evidence": "Trích dẫn ngắn chứng minh đoạn giữ 1 trọng tâm & đúng trật tự (hoặc chỉ rõ câu nào làm lệch trọng tâm/sai trật tự)",
      "fixAction": "Chỉ điền khi passed=false: Cần sắp xếp/cắt/gộp câu nào để đạt R1"
    },
    {
      "ruleId": "R2",
      "ruleTitle": "Quy luật 2 — Mạch tiến triển Cũ → Mới liền mạch, không nhảy ý (Linear Progression)",
      "passed": true,
      "evidence": "Chỉ rõ các câu nối ý Cũ -> Mới ra sao (hoặc cặp câu nào đang bị nhảy ý đột ngột)",
      "fixAction": "Chỉ điền khi passed=false: Cần thêm điểm neo ý nào ở đầu câu sau để hết nhảy ý"
    },
    {
      "ruleId": "R3",
      "ruleTitle": "Quy luật 3 — Có phép quy chiếu/thay thế rõ gốc, không lặp danh từ thô (Referencing & Substitution)",
      "passed": true,
      "evidence": "Liệt kê các cụm quy chiếu học viên đã dùng tốt (hoặc chỉ rõ từ bị lặp >=3 lần / đại từ it-this-they mơ hồ)",
      "fixAction": "Chỉ điền khi passed=false: Đổi danh từ lặp / đại từ mơ hồ ở Câu X thành cụm quy chiếu cụ thể nào"
    },
    {
      "ruleId": "R4",
      "ruleTitle": "Quy luật 4 — Kiểm soát từ nối: 0 Firstly/Moreover máy móc & đúng giới hạn trạng từ nối đầu câu",
      "passed": true,
      "evidence": "Đếm chính xác những từ nối đầu câu học viên đã dùng (0 hoặc 1 từ nối tự nhiên hợp ngữ cảnh = passed: true!)",
      "fixAction": "Chỉ điền khi passed=false: Bỏ từ nối máy móc nào ở Câu X và thay bằng cấu trúc/quy chiếu gì"
    },
    {
      "ruleId": "R5",
      "ruleTitle": "Quy luật 5 — Đúng 100% quan hệ logic & ngữ pháp của từ nối (0 sai nghĩa, 0 comma splice)",
      "passed": true,
      "evidence": "Xác nhận các liên từ/từ nối dùng đúng logic & dấu câu (hoặc chỉ rõ từ nối nào sai nghĩa / gây comma splice)",
      "fixAction": "Chỉ điền khi passed=false: Sửa liên từ / dấu câu ở Câu X như thế nào"
    }
  ]`;

const CC_FLOW_AUDIT_SCHEMA = `"ccFlowAudit": [
    {
      "transition": "Tên điểm nối (VD: 'Body trước → Câu 1', 'Câu 1 → Câu 2', 'Câu 2 → Câu 3', 'Câu 3 → Câu 4')",
      "status": "seamless | mechanical | abrupt | unclear_ref",
      "currentSentence": "Nguyên văn CẢ CÂU hiện tại của học viên tại điểm chuyển này",
      "diagnosis": "Phân tích cực rõ theo Official Band 8–9 CC Descriptors & quy luật R1–R5: điểm nối này đã mượt hay đang vướng quy luật nào?",
      "howToFix": "Hướng dẫn cụ thể cách nối lại (bắt lại ý cũ nào ở câu trước, dùng phép quy chiếu/liên từ nào để đạt CC >= 8.5)",
      "fixedFullSentence": "NGUYÊN VĂN CẢ CÂU HOÀN CHỈNH sau khi sửa nối CC 8.5+ (đã kiểm tra 100% đúng ngữ pháp cả câu; nếu status là 'seamless' thì giữ nguyên câu của học viên)"
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
    "task": ${buildCriterionJsonShape(`${taskShort} >= 8.0: Official Band 8 — covers all requirements appropriately, well-extended & supported`, 7.5)},
    "cc": ${buildCriterionJsonShape('CC >= 8.5: tính đúng theo 5 quy luật R1..R5 (5/5 = 8.5–9.0; 4/5 = 7.5–8.0; 3/5 = 7.0–7.5) — nêu rõ đạt bao nhiêu trên 5 quy luật!', 8.0)},
    "gra": ${buildCriterionJsonShape('GRA >= 8.0: Official Band 8 — wide range of structures flexibly used, majority of sentences error-free', 7.5)},
    "lr": ${buildCriterionJsonShape('LR >= 7.5: Official Band 7–8 bridge — flexible, precise B2 + natural topic-specific collocations within task scope, rare slips', 7.5)}
  },
  ${CC_CHECKLIST_SCHEMA},
  ${CC_FLOW_AUDIT_SCHEMA},
  ${extraFieldsSchema}
  "grammarErrors": [
    {
      "original": "NGUYÊN VĂN CẢ CÂU có lỗi ngữ pháp",
      "correction": "NGUYÊN VĂN CẢ CÂU HOÀN CHỈNH sau khi sửa sạch lỗi (đảm bảo 100% đúng chủ-vị, thì, mạo từ, dấu câu khi thay vào)",
      "explanation": "Giải thích rõ sai ở quy tắc nào và vì sao phải sửa đồng bộ cả câu như vậy"
    }
  ],
  "vocabularyTips": [
    {
      "studentWord": "Từ/cụm lặp, khẩu ngữ, sai collocation hoặc chưa đủ độ chính xác cho LR 7.5",
      "betterAlternative": "Collocation B2 / topic-specific tự nhiên CÙNG TỪ LOẠI & GIỚI TỪ (sát đề 100%, không dùng từ C2 sáo rỗng)",
      "reason": "Vì sao chính xác sắc thái hơn và giúp đạt chuẩn LR 7.5+"
    }
  ],
  "generalFeedback": "Tóm tắt ngắn gọn 2 câu tiếng Việt về trạng thái đạt/chưa đạt mục tiêu (${taskShort} 8.0 · CC 8.5 · GRA 8.0 · LR 7.5 — Overall 8.0).",
  "tutorClosingNote": "Đoạn chốt 160–240 từ tiếng Việt đóng vai gia sư Writing kèm 1-1: bóc tách điểm mạnh/nút thắt gốc rễ (nêu rõ kết quả X/5 quy luật CC & chất lượng collocation LR 7.5), lộ trình ưu tiên sửa 1-2-3 ngay lần tới, và lời nhắc tư duy nâng từ Band 6 lên Band 8 (dùng \\n\\n để tách đoạn rõ ràng).",
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
    "task": ${buildCriterionJsonShape(`${taskShort} >= 8.0: Official Band 8 — covers all requirements appropriately, well-extended & supported`, 7.5)},
    "cc": ${buildCriterionJsonShape('CC >= 8.5: tính đúng theo 5 quy luật R1..R5 (5/5 = 8.5–9.0; 4/5 = 7.5–8.0; 3/5 = 7.0–7.5) — nêu rõ đạt bao nhiêu trên 5 quy luật!', 8.0)}
  },
  ${CC_CHECKLIST_SCHEMA},
  ${CC_FLOW_AUDIT_SCHEMA}${extraFieldsSchema ? `,\n  ${extraFieldsSchema}` : ''}
}`;
}

export function buildGraLrPhaseSchema(): string {
  return `{
  "criteria": {
    "gra": ${buildCriterionJsonShape('GRA >= 8.0: Official Band 8 — wide range of structures flexibly used, majority of sentences error-free', 7.5)},
    "lr": ${buildCriterionJsonShape('LR >= 7.5: Official Band 7–8 bridge — flexible, precise B2 + natural topic-specific collocations within task scope, rare slips', 7.5)}
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
      "studentWord": "Từ/cụm lặp, khẩu ngữ, sai collocation hoặc chưa đủ độ chính xác cho LR 7.5",
      "betterAlternative": "Collocation B2 / topic-specific tự nhiên CÙNG TỪ LOẠI & GIỚI TỪ (sát đề 100%, không dùng từ C2 sáo rỗng)",
      "reason": "Vì sao chính xác sắc thái hơn và giúp đạt chuẩn LR 7.5+"
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
  ${paragraphSchema}"generalFeedback": "Tóm tắt ngắn gọn 2 câu tiếng Việt về trạng thái đạt/chưa đạt (${taskShort} 8.0 · CC 8.5 · GRA 8.0 · LR 7.5 — Overall 8.0).",
  "tutorClosingNote": "Đoạn chốt 160–240 từ tiếng Việt đóng vai gia sư Writing kèm 1-1: bóc tách điểm sáng, nút thắt gốc rễ (nêu rõ kết quả X/5 quy luật CC & độ chính xác LR 7.5), lộ trình ưu tiên sửa 1-2-3 ngay lần tới và tư duy bứt phá từ Band 6 lên Band 8 (dùng \\n\\n tách đoạn).",
  "modelUpgrade": "${modelUpgradeInstruction}"
}`;
}
