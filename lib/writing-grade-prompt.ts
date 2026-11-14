// lib/writing-grade-prompt.ts
// Shared prompt guidelines enforcing aligned 4-criterion coaching & explicit revision mapping

export function buildAlignedCriteriaDirectives(params: {
  taskType: 'task1' | 'task2';
  isFullEssay: boolean;
}): string {
  const { taskType, isFullEssay } = params;
  const taskShort = taskType === 'task1' ? 'TA' : 'TR';
  const unitLabel = isFullEssay ? 'toàn bài (từng đoạn)' : 'Body hiện tại';

  return `
=== NGUYÊN TẮC VÀNG KHI PHẢN HỒI 4 TIÊU CHÍ (BẮT BUỘC ĐỒNG BỘ 100%, KHÔNG ĐƯỢC MỖI TIÊU CHÍ MỘT KIỂU) ===
Tuyệt đối KHÔNG nhận xét chung chung rồi đưa một đoạn văn/câu mới viết sẵn để học viên học thuộc!
Thay vào đó, trước khi xuất JSON, hãy lập MỘT KẾ HOẠCH SỬA DUY NHẤT bám thẳng vào đúng các câu học viên đã viết trong ${unitLabel} (gọi rõ: "Câu 1", "Câu 2", "Sau câu cuối"...), rồi ánh xạ KHỚP NHAU trên cả 4 tiêu chí theo ĐÚNG CÙNG MỘT ĐỊNH DẠNG "mappings":

1. TÍNH NHẤT QUÁN & KHỚP NHAU GIỮA 4 TIÊU CHÍ:
   - Nếu "${taskShort}" chỉ ra chỗ X bị thiếu ý / thiếu ${taskType === 'task1' ? 'số liệu hoặc đối chiếu' : 'cơ chế nhân-quả hoặc ví dụ thực tế'} (VD: "Ngay sau Câu 2 '...'") và yêu cầu học viên tự viết thêm:
     * "${taskShort}" (issueType: "add"): Chỉ rõ bổ sung ý gì ngay chỗ đó + hướng triển khai (tự diễn đạt theo ý gì) + 2–4 cụm vocab B1–B2 gợi ý trong "suggestedPhrases".
     * "CC" (issueType: "add" hoặc "replace"): Bắt buộc PHỐI HỢP với đúng chỗ đó! Chỉ rõ cần **dùng từ nối / phép quy chiếu gì** (VD: thay "Moreover" -> "This shift" / "As a result" / "By contrast") để gắn phần mới thêm vào câu trước cho mượt, và giải thích VÌ SAO cách nối cũ gượng gạo/máy móc.
     * "LR" (issueType: "replace" hoặc "add"): Bắt buộc KHỚP CÙNG BỘ VOCAB với ${taskShort}, CC và "vocabularyTips"! Chỉ rõ từng cụm/từ của học viên chưa tự nhiên hoặc dịch word-by-word ("currentText" -> "improvedExample" dùng **collocation B1–B2 bản xứ** + vì sao tự nhiên hơn), ĐỒNG THỜI liệt kê bộ cụm vocab B1–B2 phù hợp để học viên dùng khi tự viết thêm phần ${taskShort} vừa yêu cầu!
     * "GRA" (issueType: "fix_error" hoặc "add"): Bắt buộc KHỚP với các câu học viên đang sửa & bổ sung! Chỉ rõ ngữ pháp đang sai ở đúng câu/cụm nào ("currentText" -> sửa lại thế nào trong "improvedExample" + giải thích lỗi mạo từ/thì/cấu trúc), ĐỒNG THỜI đề xuất mẫu câu ngữ pháp Band 7.0 (while / whereas / , which + V / although / passive) để học viên lắp ý khi viết phần thêm ở trên!
   - TUYỆT ĐỐI KHÔNG tự mâu thuẫn giữa các tiêu chí (ví dụ LR bảo đổi từ A thành B nhưng GRA hay ${taskShort} lại viết câu dùng từ C khác, hoặc mỗi tiêu chí chọn format feedback khác nhau!).
   - Cả 4 tiêu chí TRONG MỌI TRƯỜNG HỢP đều bắt buộc có trường "mappings" (2–4 mục cụ thể/tiêu chí), theo CÙNG MỘT SCHEMA ĐỒNG NHẤT.

2. CẤM ĐƯA ĐOẠN VĂN HOÀN TOÀN MỚI ĐỂ HỌC THUỘC KHI CHƯA ĐẠT:
   - Nếu bài viết đang thiếu quá nhiều hoặc quá ngắn: KHÔNG viết hộ 1 đoạn hoàn chỉnh mới trong "mappings" / "reason" / "fixes"! Thay vào đó, tách thành các slot "add" cụ thể: *"Sau câu ... -> Cần viết thêm câu giải thích [ý gì] theo hướng [...], dùng các cụm B1–B2: [...]"* để học viên TỰ VIẾT & TỰ NÂNG BAND.
   - "improvedExample" CHỈ là cụm từ thay thế ngắn hoặc khung sửa 1 lỗi/câu ngắn, TUYỆT ĐỐI không dán lại nguyên đoạn mới!
   - "vocabularyTips" phải ánh xạ 1-1 với các cặp thay thế trong "LR.mappings"; "grammarErrors" phải ánh xạ 1-1 với các lỗi sửa trong "GRA.mappings".
`;
}

export function buildUnifiedGradeJsonSchema(params: {
  taskShort: 'TA' | 'TR';
  extraFieldsSchema?: string;
  modelUpgradeInstruction: string;
}): string {
  const { taskShort, extraFieldsSchema = '', modelUpgradeInstruction } = params;

  const criterionShape = (critDesc: string) => `{
      "band": 7.0,
      "reason": "Nhận xét ngắn gọn bằng tiếng Việt theo cùng mạch đánh giá chung (${critDesc}).",
      "mappings": [
        {
          "targetLocation": "Gọi chính xác vị trí trong bài học viên (VD: 'Câu 1', 'Sau Câu 2 (...)', 'Cụm ... ở Câu 3')",
          "issueType": "add | replace | fix_error",
          "currentText": "Trích cụm/câu/từ nối hiện tại của học viên (hoặc ghi '' nếu là slot 'add' chỗ còn thiếu)",
          "actionGuide": "Hướng dẫn cụ thể CẦN LÀM GÌ và VÌ SAO: thêm ý gì theo hướng nào / đổi linking word nào sang gì vì sao / sửa lỗi ngữ pháp nào hợp lý (KHÔNG viết sẵn cả đoạn mới).",
          "suggestedPhrases": ["cụm vocab B1-B2 / từ nối / mẫu ngữ pháp 1", "cụm 2", "cụm 3"],
          "improvedExample": "CHỈ ghi cụm đổi tự nhiên hoặc 1 khung câu ngắn minh họa đúng chỗ này (TUYỆT ĐỐI không viết lại nguyên đoạn mới)"
        }
      ],
      "evidence": ["Trích dẫn ngắn các điểm chính từ mappings để tương thích"],
      "fixes": ["Tóm tắt 1 dòng hành động tương ứng từng mapping"]
    }`;

  return `{
  "criteria": {
    "task": ${criterionShape(`${taskShort} >= 8.0: bám đề, độ sâu/số liệu, phần thiếu cần tự viết thêm`)},
    "cc": ${criterionShape('CC >= 8.0: linking words/referencing cụ thể cần đổi & điểm nối cho phần viết thêm')},
    "lr": ${criterionShape('LR >= 7.0: ánh xạ từ chưa tự nhiên -> collocation B1-B2 & vocab cho phần thêm')},
    "gra": ${criterionShape('GRA >= 7.0: lỗi ngữ pháp cụ thể cần sửa & mẫu câu Band 7.0 cho phần sửa/thêm')}
  },
  ${extraFieldsSchema}
  "grammarErrors": [
    {
      "original": "Đúng cụm/câu lỗi đã nêu ở GRA.mappings",
      "correction": "Cách sửa hợp lý, chuẩn Band 7.0",
      "explanation": "Giải thích rõ sai ở điểm ngữ pháp nào và vì sao sửa như vậy"
    }
  ],
  "vocabularyTips": [
    {
      "studentWord": "Đúng từ/cụm thiếu tự nhiên đã nêu ở LR.mappings",
      "betterAlternative": "Collocation B1–B2 bản xứ tương ứng (chỉ dùng C1–C2 nếu không có cụm B1–B2 phù hợp)",
      "reason": "Vì sao tự nhiên hơn và khớp với ngữ cảnh của ý đang viết"
    }
  ],
  "generalFeedback": "Tổng kết 2–3 câu bằng tiếng Việt nêu rõ bài đã đạt chuẩn (${taskShort} >= 8.0, CC >= 8.0, LR >= 7.0, GRA >= 7.0) chưa và thứ tự 2–3 bước tự sửa ngay trên bài viết hiện tại.",
  "modelUpgrade": "${modelUpgradeInstruction}"
}`;
}
