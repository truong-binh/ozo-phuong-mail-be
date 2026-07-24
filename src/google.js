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
  const messages = [];
  let pageToken;
  let pages = 0;
  do {
    const list = await gmail.users.messages.list({
      userId: 'me',
      maxResults: Math.min(500, maxResults - messages.length), // Gmail cap 500/trang
      q: query || undefined,
      pageToken,
    });
    messages.push(...(list.data.messages || []));
    pageToken = list.data.nextPageToken;
    pages++;
  } while (pageToken && messages.length < maxResults);

  console.log(`[gmail] ${messages.length} email khớp bộ lọc (${pages} trang)` +
    `${pageToken ? ', vẫn còn nữa — tăng GMAIL_MAX_RESULTS nếu muốn lấy hết' : ''}`);

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
