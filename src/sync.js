import { supabase } from './supabase.js';
import { fetchRecentMessages } from './google.js';
import { extractOffer } from './groq.js';
import { mapLimit } from './util.js';

// Bỏ dấu tiếng Việt để so khớp không phụ thuộc cách gõ dấu (NFC/NFD) hay thiếu dấu.
function noAccent(s) {
  return (s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase();
}

// Lọc thô bằng từ khoá (đã bỏ dấu): email không có dấu hiệu "thư mời/trúng tuyển"
// thì bỏ qua luôn, KHÔNG gọi Groq => nhanh hơn nhiều.
const OFFER_KEYWORDS = [
  'trung tuyen', 'thu moi nhan viec', 'nhan viec', 'thu viec', 'thu thach',
  'hoi dong tuyen dung', 'moi nhan viec', 'offer', 'onboard',
].map(noAccent);

function looksLikeOffer(message) {
  const text = noAccent(`${message.subject || ''}\n${message.body || ''}`);
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
  const stats = {
    scanned: messages.length, candidates: 0, alreadySaved: 0,
    offers: 0, saved: 0, skipped: 0, failed: 0,
  };

  // Bước 1: lọc thô bằng từ khoá (không tốn LLM)
  let candidates = messages.filter(looksLikeOffer);
  stats.candidates = candidates.length;
  stats.skipped = messages.length - candidates.length;

  // CHẨN ĐOÁN: cho xem tiêu đề của TẤT CẢ mail Gmail trả về + có qua được lọc từ khoá không.
  console.log(`[sync] === PHỄU LỌC ===`);
  console.log(`[sync] Gmail trả về ${messages.length} mail. Xét từng cái:`);
  messages.forEach((m, i) => {
    const pass = looksLikeOffer(m);
    console.log(`[sync]  ${String(i + 1).padStart(2)}. [${pass ? 'GIỮ ' : 'LOẠI'}] "${m.subject}" — từ ${m.from}`);
  });
  console.log(`[sync] => ${stats.candidates}/${messages.length} mail qua lọc từ khoá`);

  // Bước 1b: bỏ qua email đã có trong DB => KHÔNG gọi lại Groq (tiết kiệm hạn mức AI)
  const ids = candidates.map((m) => m.id);
  if (ids.length) {
    const { data: existing } = await supabase
      .from('job_offers')
      .select('gmail_id')
      .in('gmail_id', ids);
    const seen = new Set((existing || []).map((r) => r.gmail_id));
    const before = candidates.length;
    candidates = candidates.filter((m) => !seen.has(m.id));
    stats.alreadySaved = before - candidates.length;
  }

  console.log(`[sync] quét ${messages.length} email, ${stats.candidates} nghi là thư mời, ` +
    `${stats.alreadySaved} đã có sẵn, ${candidates.length} email mới cần trích xuất`);
  candidates.forEach((m) => console.log(`   • "${m.subject}"`));

  // Bước 2+3: trích xuất RỒI LƯU NGAY từng email.
  // Lưu ngay (thay vì gom cuối) để nếu Groq hết hạn mức giữa chừng thì phần đã
  // xong vẫn nằm trong DB — lần đồng bộ sau chỉ chạy tiếp phần còn thiếu.
  // Luồng để thấp vì gói free Groq giới hạn theo token/phút; chạy nhiều luồng
  // chỉ khiến 429 sớm hơn chứ không nhanh hơn.
  const concurrency = Number(process.env.GROQ_CONCURRENCY || 2);
  let done = 0;

  await mapLimit(candidates, concurrency, async (m) => {
    let extracted;
    try {
      extracted = await extractOffer(`Tiêu đề: ${m.subject}\n\n${m.body}`);
    } catch (e) {
      // Một email lỗi KHÔNG được làm chết cả mẻ — bỏ qua, lần sau quét lại.
      stats.failed++;
      console.error(`[sync] trích xuất lỗi "${m.subject}": ${e.message}`);
      return;
    }

    if (!extracted.is_offer) {
      stats.skipped++;
      console.log(`[sync] Groq cho rằng KHÔNG phải thư mời: "${m.subject}"`);
      return;
    }

    stats.offers++;
    const { error } = await supabase
      .from('job_offers')
      .upsert(toRow({ email, message: m, extracted }), { onConflict: 'gmail_id' });
    if (error) console.error('[sync] upsert lỗi:', error.message);
    else stats.saved++;

    done++;
    if (done % 10 === 0 || done === candidates.length) {
      console.log(`[sync] tiến độ ${done}/${candidates.length} email đã xử lý`);
    }
  });

  console.log('[sync] kết quả:', stats);
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
