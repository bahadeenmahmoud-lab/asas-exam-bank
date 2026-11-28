-- ربط أي طالب سُجّل أثناء التحديث بحسابه
INSERT INTO accounts (teacher_slug, phone)
SELECT DISTINCT teacher_slug, phone FROM students WHERE account_id IS NULL
ON CONFLICT (teacher_slug, phone) DO NOTHING;
UPDATE students s SET account_id = a.id
FROM accounts a WHERE a.teacher_slug = s.teacher_slug AND a.phone = s.phone AND s.account_id IS NULL;
-- السماح بأكثر من طالب (إخوة) على نفس رقم الهاتف
DROP INDEX IF EXISTS students_teacher_phone_uq;
