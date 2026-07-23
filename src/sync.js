import { supabase } from './supabase.js';
import { fetchRecentMessages } from './google.js';
import { extractOffer } from './groq.js';
import { mapLimit } from './util.js';

// Lọc thô bằng từ khoá: email không chứa dấu hiệu "thư mời/trúng tuyển"
// thì bỏ qua luôn, KHÔNG gọi Groq => nhanh hơn nhiều.
const OFFER_KEYWORDS = [
  'trúng tuyển', 'thư mời nhận việc', 'nhận việc', 'thử việc', 'thử thách',
  'hội đồng tuyển dụng', 'mời nhận việc', 'offer', 'onboard',
];

function looksLikeOffer(message) {
  const text = `${message.subject || ''}\n${message.body || ''}`.toLowerCase();
  return OFFER_KEYWORDS.some((k) => text.includes(k));
}

// Chuyển 1 email + kết quả LLM thành 1 dòng job_offers
function toRow({ email, message, extracted }) {
  return {
    gmail_id: message.id,
    account_email: email,
    email_subject: message.subject,
    email_from: message.from,
    email_date: message.date ? new Date(message.date).toISOString() : null,
    candidate_name: extracted.candidate_name,
    position: extracted.position,
    company: extracted.company,
    direct_manager: extracted.direct_manager,
    workplace: extracted.workplace,
    start_date: extracted.start_date,
    probation_period: extracted.probation_period,
    probation_salary: extracted.probation_salary,
    official_salary: extracted.official_salary,
    benefits: extracted.benefits,
    documents_required: extracted.documents_required,
    contact_person: extracted.contact_person,
    contact_phone: extracted.contact_phone,
    response_deadline: extracted.response_deadline,
    summary: extracted.summary,
    raw_body: message.body,
  };
}

// Xử lý 1 danh sách message: chạy Groq, chỉ giữ thư mời, upsert vào Supabase.
// Upsert theo gmail_id => mail cũ không bị trùng, mail mới tự thêm.
export async function processMessages(email, messages) {
  const stats = { scanned: messages.length, offers: 0, saved: 0, skipped: 0 };

  // Bước 1: lọc thô bằng từ khoá (không tốn LLM)
  const candidates = messages.filter(looksLikeOffer);
  stats.skipped = messages.length - candidates.length;

  // Bước 2: gọi Groq song song (tối đa 5 luồng để tránh giới hạn tốc độ)
  const extractedList = await mapLimit(candidates, 5, (m) => extractOffer(m.body));

  // Bước 3: chỉ giữ cái Groq xác nhận là thư mời, upsert song song
  const rows = [];
  extractedList.forEach((extracted, i) => {
    if (extracted.is_offer) {
      stats.offers++;
      rows.push(toRow({ email, message: candidates[i], extracted }));
    } else {
      stats.skipped++;
    }
  });

  await mapLimit(rows, 5, async (row) => {
    const { error } = await supabase
      .from('job_offers')
      .upsert(row, { onConflict: 'gmail_id' });
    if (error) console.error('[sync] upsert lỗi:', error.message);
    else stats.saved++;
  });

  return stats;
}

// Đồng bộ thật: đọc Gmail của account -> xử lý
export async function syncAccount(email) {
  const { data: account, error } = await supabase
    .from('accounts')
    .select('*')
    .eq('email', email)
    .single();
  if (error || !account) throw new Error('Không tìm thấy tài khoản Google đã lưu');

  const messages = await fetchRecentMessages(account, {
    maxResults: Number(process.env.GMAIL_MAX_RESULTS || 25),
    query: process.env.GMAIL_QUERY || '',
  });

  return processMessages(email, messages);
}
