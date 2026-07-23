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

// Gọi Groq, tự thử lại khi bị giới hạn tốc độ (429) — quan trọng với gói free.
async function callWithRetry(params, tries = 4) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await groq.chat.completions.create(params);
    } catch (e) {
      const status = e?.status || e?.response?.status;
      if (status === 429 && attempt < tries) {
        // Ưu tiên thời gian chờ Groq gợi ý, nếu không thì backoff tăng dần
        const retryAfter = Number(e?.headers?.['retry-after']) || attempt * 3;
        console.warn(`[groq] 429 rate limit, chờ ${retryAfter}s rồi thử lại (lần ${attempt})`);
        await sleep(retryAfter * 1000);
        continue;
      }
      throw e;
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
