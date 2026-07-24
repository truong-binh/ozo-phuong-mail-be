import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import { getAuthUrl, exchangeCode } from './google.js';
import { supabase } from './supabase.js';
import { signToken, requireAuth } from './auth.js';
import { syncAccount, processMessages } from './sync.js';
import { DEMO_EMAILS } from './fixtures.js';

const app = express();
app.use(cors({ origin: process.env.WEB_URL || 'http://localhost:5173' }));
app.use(express.json({ limit: '2mb' }));

const WEB_URL = process.env.WEB_URL || 'http://localhost:5173';

app.get('/health', (_req, res) => res.json({ ok: true }));

// ============ AUTH: Google OAuth + JWT ============

// 1) Bắt đầu đăng nhập -> chuyển sang trang consent của Google
app.get('/auth/google', (_req, res) => {
  res.redirect(getAuthUrl());
});

// 2) Google gọi lại kèm code -> đổi lấy token, lưu account, ký JWT, về web
app.get('/auth/google/callback', async (req, res) => {
  try {
    const { code } = req.query;
    if (!code) return res.status(400).send('Thiếu code');

    const { tokens, profile } = await exchangeCode(code);
    const email = profile.email;

    // Lưu/cập nhật account (giữ refresh_token cũ nếu lần này Google không trả)
    const { data: existing } = await supabase
      .from('accounts').select('refresh_token').eq('email', email).single();

    await supabase.from('accounts').upsert({
      email,
      name: profile.name,
      picture: profile.picture,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || existing?.refresh_token || null,
      token_expiry: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'email' });

    const jwtToken = signToken({ email, name: profile.name, picture: profile.picture });
    // Trả token về frontend qua URL hash (frontend lưu vào localStorage)
    res.redirect(`${WEB_URL}/#token=${jwtToken}`);
  } catch (e) {
    console.error('[auth callback]', e);
    res.status(500).send('Đăng nhập thất bại: ' + e.message);
  }
});

// Thông tin user hiện tại (kiểm tra token còn hạn)
app.get('/api/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

// ============ DỮ LIỆU ============

// Danh sách thư mời của tài khoản đang đăng nhập
app.get('/api/offers', requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('job_offers')
    .select('*')
    .eq('account_email', req.user.email)
    .order('email_date', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ offers: data });
});

// Đồng bộ Gmail thật -> trích xuất -> lưu
// Lần quét đầu có thể mất 10-20 phút (Groq free giới hạn token/phút), trong khi
// web tự gọi lại mỗi 60s => phải khoá, không cho 1 tài khoản chạy 2 lượt cùng lúc.
const syncing = new Set();

app.post('/api/sync', requireAuth, async (req, res) => {
  const email = req.user.email;
  if (syncing.has(email)) {
    return res.json({ ok: true, running: true, stats: { scanned: 0, saved: 0 } });
  }
  syncing.add(email);
  try {
    const stats = await syncAccount(email);
    res.json({ ok: true, stats });
  } catch (e) {
    console.error('[sync]', e);
    res.status(500).json({ error: e.message });
  } finally {
    syncing.delete(email);
  }
});

// Nạp 2 email DEMO (không cần Gmail) -> để test nhanh
app.post('/api/sync/demo', requireAuth, async (req, res) => {
  try {
    // Bảo đảm có bản ghi account cho email đang đăng nhập (khoá ngoại)
    await supabase.from('accounts').upsert(
      { email: req.user.email, name: req.user.name, picture: req.user.picture },
      { onConflict: 'email' },
    );
    const stats = await processMessages(req.user.email, DEMO_EMAILS);
    res.json({ ok: true, stats });
  } catch (e) {
    console.error('[sync demo]', e);
    res.status(500).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 8787;
app.listen(PORT, () => console.log(`[server] chạy tại http://localhost:${PORT}`));
