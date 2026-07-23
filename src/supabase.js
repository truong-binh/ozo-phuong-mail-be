import { createClient } from '@supabase/supabase-js';

const { SUPABASE_URL, SUPABASE_SERVICE_KEY } = process.env;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.warn('[supabase] Thiếu SUPABASE_URL hoặc SUPABASE_SERVICE_KEY trong .env');
}

// Dùng service_role key ở backend => bỏ qua RLS, toàn quyền đọc/ghi.
export const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});
