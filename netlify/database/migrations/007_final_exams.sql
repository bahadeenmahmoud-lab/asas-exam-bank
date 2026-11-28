-- الامتحان النهائي: النموذج 4 لكل مادة، ويحتوي 30 سؤالاً
ALTER TABLE exams DROP CONSTRAINT IF EXISTS exams_model_check;
ALTER TABLE exams ADD CONSTRAINT exams_model_check CHECK (model BETWEEN 1 AND 4);
ALTER TABLE questions DROP CONSTRAINT IF EXISTS questions_position_check;
ALTER TABLE questions ADD CONSTRAINT questions_position_check CHECK (position BETWEEN 1 AND 30);
