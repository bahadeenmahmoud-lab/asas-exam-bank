-- حسابات بكلمة سر: حساب واحد لكل رقم هاتف، وعليه أكثر من طالب (إخوة)
CREATE TABLE IF NOT EXISTS accounts (
  id BIGSERIAL PRIMARY KEY,
  teacher_slug TEXT NOT NULL DEFAULT 'asas',
  phone TEXT NOT NULL,
  password_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS accounts_teacher_phone_uq ON accounts (teacher_slug, phone);

ALTER TABLE students ADD COLUMN IF NOT EXISTS account_id BIGINT REFERENCES accounts(id) ON DELETE CASCADE;

-- ربط الطلاب الحاليين بحسابات (بدون كلمة سر؛ يعيّنونها من «نسيت كلمة السر»)
INSERT INTO accounts (teacher_slug, phone)
SELECT DISTINCT teacher_slug, phone FROM students
ON CONFLICT (teacher_slug, phone) DO NOTHING;
UPDATE students s SET account_id = a.id
FROM accounts a WHERE a.teacher_slug = s.teacher_slug AND a.phone = s.phone AND s.account_id IS NULL;

CREATE INDEX IF NOT EXISTS students_account_idx ON students (account_id);
CREATE INDEX IF NOT EXISTS students_teacher_phone_idx ON students (teacher_slug, phone);

ALTER TABLE student_sessions ADD COLUMN IF NOT EXISTS account_id BIGINT REFERENCES accounts(id) ON DELETE CASCADE;
UPDATE student_sessions ss SET account_id = s.account_id
FROM students s WHERE s.id = ss.student_id AND ss.account_id IS NULL;
CREATE INDEX IF NOT EXISTS student_sessions_account_idx ON student_sessions (account_id);
