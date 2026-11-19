ALTER TABLE students ADD COLUMN IF NOT EXISTS teacher_slug TEXT NOT NULL DEFAULT 'asas';
ALTER TABLE students DROP CONSTRAINT IF EXISTS students_phone_key;
ALTER TABLE students DROP CONSTRAINT IF EXISTS students_grade_check;
ALTER TABLE students ADD CONSTRAINT students_grade_check CHECK (grade BETWEEN 1 AND 12);
CREATE UNIQUE INDEX IF NOT EXISTS students_teacher_phone_uq ON students (teacher_slug, phone);

ALTER TABLE verification_codes ADD COLUMN IF NOT EXISTS teacher_slug TEXT NOT NULL DEFAULT 'asas';
ALTER TABLE verification_codes DROP CONSTRAINT IF EXISTS verification_codes_pkey;
ALTER TABLE verification_codes ADD CONSTRAINT verification_codes_pkey PRIMARY KEY (teacher_slug, phone);

ALTER TABLE admin_sessions ADD COLUMN IF NOT EXISTS teacher_slug TEXT NOT NULL DEFAULT 'asas';

ALTER TABLE subjects ADD COLUMN IF NOT EXISTS teacher_slug TEXT NOT NULL DEFAULT 'asas';
ALTER TABLE subjects DROP CONSTRAINT IF EXISTS subjects_grade_check;
ALTER TABLE subjects ADD CONSTRAINT subjects_grade_check CHECK (grade BETWEEN 1 AND 12);
ALTER TABLE subjects DROP CONSTRAINT IF EXISTS subjects_grade_name_key;
CREATE UNIQUE INDEX IF NOT EXISTS subjects_teacher_grade_name_uq ON subjects (teacher_slug, grade, name);

ALTER TABLE exams ADD COLUMN IF NOT EXISTS teacher_slug TEXT NOT NULL DEFAULT 'asas';
ALTER TABLE exams DROP CONSTRAINT IF EXISTS exams_grade_check;
ALTER TABLE exams ADD CONSTRAINT exams_grade_check CHECK (grade BETWEEN 1 AND 12);
ALTER TABLE exams DROP CONSTRAINT IF EXISTS exams_grade_subject_id_semester_academic_year_model_key;
CREATE UNIQUE INDEX IF NOT EXISTS exams_teacher_grade_subject_semester_year_model_uq
  ON exams (teacher_slug, grade, subject_id, semester, academic_year, model);

CREATE INDEX IF NOT EXISTS exams_teacher_grade_status_idx ON exams (teacher_slug, grade, status);
