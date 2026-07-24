import { google } from 'googleapis';
import { mapLimit } from './util.js';

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
];

export function createOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI,
  );
}

export function getAuthUrl() {
  const oauth2 = createOAuthClient();
  return oauth2.generateAuthUrl({
    access_type: 'offline',      // xin refresh_token để đồng bộ lâu dài
    prompt: 'consent',           // luôn trả refresh_token
    scope: SCOPES,
  });
}

// Đổi authorization code -> tokens + thông tin user
export async function exchangeCode(code) {
  const oauth2 = createOAuthClient();
  const { tokens } = await oauth2.getToken(code);
  oauth2.setCredentials(tokens);

  const oauth2api = google.oauth2({ version: 'v2', auth: oauth2 });
  const { data: profile } = await oauth2api.userinfo.get();

  return { tokens, profile };
}

// Tạo Gmail client từ token đã lưu của account
export function gmailClientFromAccount(account) {
  const oauth2 = createOAuthClient();
  oauth2.setCredentials({
    access_token: account.access_token,
    refresh_token: account.refresh_token,
    expiry_date: account.token_expiry ? new Date(account.token_expiry).getTime() : undefined,
  });
  return { gmail: google.gmail({ version: 'v1', auth: oauth2 }), oauth2 };
}

// Giải mã 1 phần thân email dạng base64url
function decodeBody(data) {
  if (!data) return '';
  return Buffer.from(data, 'base64').toString('utf-8');
}

// Duyệt đệ quy payload để lấy text (ưu tiên text/plain)
function extractText(payload) {
  if (!payload) return '';
  if (payload.mimeType === 'text/plain' && payload.body?.data) {
    return decodeBody(payload.body.data);
  }
  if (payload.parts?.length) {
    // Ưu tiên text/plain
    const plain = payload.parts.find((p) => p.mimeType === 'text/plain');
    if (plain?.body?.data) return decodeBody(plain.body.data);
    // Gộp các part con
    return payload.parts.map(extractText).filter(Boolean).join('\n');
  }
  if (payload.mimeType === 'text/html' && payload.body?.data) {
    // Bỏ thẻ HTML thô
    return decodeBody(payload.body.data).replace(/<[^>]+>/g, ' ');
  }
  return '';
}

function header(headers, name) {
  return headers?.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value || '';
}

// Lấy N email gần nhất, trả về [{ id, subject, from, date, body }]
export async function fetchRecentMessages(account, { maxResults = 25, query = '' } = {}) {
  const { gmail } = gmailClientFromAccount(account);

  // Gmail KHÔNG đảm bảo trả đủ maxResults trong 1 trang: khi có bộ lọc `q`,
  // nó quét từng khối và thường trả về một phần kèm nextPageToken.
  // => phải lặp theo token cho tới khi đủ số lượng hoặc hết mail.
  console.log(`[gmail] === BẮT ĐẦU LẤY MAIL ===`);
  console.log(`[gmail] maxResults=${maxResults}`);
  console.log(`[gmail] query (q gửi Gmail) = ${query ? JSON.stringify(query) : '(trống — lấy mail gần nhất)'}`);

  const messages = [];
  let pageToken;
  let pages = 0;
  do {
    const perPage = Math.min(500, maxResults - messages.length); // Gmail cap 500/trang
    const list = await gmail.users.messages.list({
      userId: 'me',
      maxResults: perPage,
      q: query || undefined,
      pageToken,
    });
    const batch = list.data.messages || [];
    messages.push(...batch);
    pageToken = list.data.nextPageToken;
    pages++;
    console.log(`[gmail] trang ${pages}: yêu cầu ${perPage}, nhận ${batch.length} mail, ` +
      `resultSizeEstimate=${list.data.resultSizeEstimate ?? '?'}, ` +
      `nextPageToken=${pageToken ? 'CÓ (còn trang sau)' : 'KHÔNG (hết)'}, ` +
      `tổng gom được=${messages.length}`);
  } while (pageToken && messages.length < maxResults);

  console.log(`[gmail] === KẾT THÚC: ${messages.length} email khớp bộ lọc sau ${pages} trang ===`);
  if (pageToken) console.log('[gmail] (dừng vì đã đủ maxResults, Gmail vẫn còn mail — tăng GMAIL_MAX_RESULTS nếu muốn lấy hết)');
  if (messages.length <= 10 && pages === 1 && !pageToken && query) {
    console.log('[gmail] ⚠️  Chỉ 1 trang và không có trang sau => Gmail thật sự chỉ tìm thấy bấy nhiêu mail KHỚP QUERY.');
    console.log('[gmail] ⚠️  Vấn đề nằm ở CÂU QUERY, KHÔNG phải phân trang. Thử dán query này vào ô tìm kiếm Gmail để kiểm chứng:');
    console.log(`[gmail] ⚠️      ${query}`);
  }

  // Lấy nội dung các email song song (tối đa 8 luồng) cho nhanh
  return mapLimit(messages, 8, async (m) => {
    const full = await gmail.users.messages.get({
      userId: 'me',
      id: m.id,
      format: 'full',
    });
    const payload = full.data.payload;
    const headers = payload?.headers || [];
    return {
      id: m.id,
      subject: header(headers, 'Subject'),
      from: header(headers, 'From'),
      date: header(headers, 'Date'),
      body: extractText(payload).trim(),
    };
  });
}
