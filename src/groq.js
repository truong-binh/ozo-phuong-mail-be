import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

const SYSTEM_PROMPT = `Bạn là trợ lý trích xuất thông tin từ email tiếng Việt.
Nhiệm vụ: đọc nội dung một email và xác định xem đó có phải là "Thư mời nhận việc / thư báo trúng tuyển" hay không, nếu đúng thì tách các thông tin quan trọng.

Lưu ý cách viết có thể khác nhau giữa các email:
- "Thời gian thử việc" hoặc "Thời gian thử thách" đều là probation_period.
- "Thu nhập chính thức", "Mức thu nhập/hỗ trợ", "Mức lương" đều có thể là official_salary.
- "hưởng 85% thu nhập trong thời gian thử việc" => probation_salary = "85% thu nhập".
- Nếu một trường không có trong email, trả về chuỗi rỗng "" (hoặc mảng rỗng []).
- Không bịa thông tin. Chỉ lấy đúng những gì có trong email.

Chỉ trả về JSON đúng theo schema, không thêm giải thích.`;

// Mô tả schema để model bám theo (JSON mode)
const SCHEMA_HINT = `Trả về JSON với các khóa:
{
  "is_offer": boolean,              // true nếu là thư mời nhận việc/trúng tuyển
  "candidate_name": string,         // Họ tên ứng viên được gửi
  "position": string,               // Vị trí công việc
  "company": string,                // Tên công ty
  "direct_manager": string,         // Quản lý trực tiếp
  "workplace": string,              // Nơi làm việc
  "start_date": string,             // Ngày nhận việc (giữ nguyên như trong email)
  "probation_period": string,       // Thời gian thử việc/thử thách
  "probation_salary": string,       // Thu nhập trong thời gian thử việc
  "official_salary": string,        // Thu nhập chính thức / mức hỗ trợ
  "benefits": string[],             // Các phúc lợi (gửi xe, thiết bị, BHXH...)
  "documents_required": string[],   // Danh sách giấy tờ cần nộp
  "contact_person": string,         // Người liên hệ
  "contact_phone": string,          // Số điện thoại liên hệ
  "response_deadline": string,      // Hạn phản hồi
  "summary": string                 // Tóm tắt 1 câu
}`;

const EMPTY = {
  is_offer: false,
  candidate_name: '', position: '', company: '', direct_manager: '',
  workplace: '', start_date: '', probation_period: '', probation_salary: '',
  official_salary: '', benefits: [], documents_required: [],
  contact_person: '', contact_phone: '', response_deadline: '', summary: '',
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Đọc thời gian chờ Groq gợi ý. Header có thể là "12" hoặc "7.66s".
function retryAfterSeconds(e) {
  const h = e?.headers || {};
  const raw = h['retry-after'] ?? h['x-ratelimit-reset-tokens'] ?? h['x-ratelimit-reset-requests'];
  const n = parseFloat(String(raw));
  return Number.isFinite(n) && n > 0 ? Math.min(n + 1, 90) : 0;
}

// Gọi Groq, tự thử lại khi bị giới hạn tốc độ (429) hoặc lỗi tạm thời (5xx).
// Gói free giới hạn theo TOKEN/PHÚT, nên quét nhiều mail bắt buộc phải chờ —
// thử lại nhiều lần với thời gian Groq trả về, thay vì bỏ cuộc sớm.
async function callWithRetry(params, tries = 8) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await groq.chat.completions.create(params);
    } catch (e) {
      const status = e?.status || e?.response?.status;
      const retryable = status === 429 || (status >= 500 && status < 600);
      if (!retryable || attempt >= tries) throw e;

      // Ưu tiên thời gian chờ Groq gợi ý, nếu không thì backoff tăng dần (tối đa 60s)
      const wait = retryAfterSeconds(e) || Math.min(2 ** attempt, 60);
      console.warn(`[groq] ${status}, chờ ${wait}s rồi thử lại (lần ${attempt}/${tries})`);
      await sleep(wait * 1000);
    }
  }
}

export async function extractOffer(emailText) {
  if (!emailText || emailText.trim().length < 20) return { ...EMPTY };

  const completion = await callWithRetry({
    model: MODEL,
    temperature: 0,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `${SCHEMA_HINT}\n\n--- NỘI DUNG EMAIL ---\n${emailText}`,
      },
    ],
  });

  const raw = completion.choices?.[0]?.message?.content || '{}';
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ...EMPTY };
  }

  // Chuẩn hoá: đảm bảo đủ khóa và đúng kiểu
  const out = { ...EMPTY, ...parsed };
  out.benefits = Array.isArray(out.benefits) ? out.benefits : [];
  out.documents_required = Array.isArray(out.documents_required) ? out.documents_required : [];
  out.is_offer = Boolean(out.is_offer);
  return out;
}
