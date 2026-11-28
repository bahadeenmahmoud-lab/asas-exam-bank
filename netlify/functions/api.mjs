import { getDatabase } from "@netlify/database";
import { createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto";

const db = getDatabase();
const SESSION_DAYS = 30;
const OTP_MINUTES = 5;
const json = (data, status = 200, headers = {}) => new Response(JSON.stringify(data), {
  status,
  headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers }
});
const fail = (message, status = 400) => json({ error: message }, status);
const env = (name) => Netlify.env.get(name) || "";
const isLocalOtpDemo = () => env("NETLIFY_DEV") === "true" && env("CONTEXT") === "dev";
// Until an SMS provider is configured, every student uses the fixed code 123456.
// Setting SMS_WEBHOOK_URL and SMS_WEBHOOK_TOKEN switches to real random codes automatically.
const DEMO_OTP = "123456";
const smsConfigured = () => Boolean(env("SMS_WEBHOOK_URL") && env("SMS_WEBHOOK_TOKEN"));
const otpDemoMode = () => isLocalOtpDemo() || !smsConfigured();
const otpSalt = () => env("OTP_SECRET") || (otpDemoMode() ? "temporary-demo-mode" : "");
const hash = (value) => createHash("sha256").update(value).digest("hex");
const secureEqual = (a, b) => {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  return left.length === right.length && timingSafeEqual(left, right);
};
const parseBody = async (req) => {
  try { return await req.json(); } catch { return null; }
};
const phoneOnly = (value) => String(value || "").replace(/\D/g, "").replace(/^00962/, "").replace(/^962/, "").replace(/^0/, "");
const validPhone = (phone) => /^7[789][0-9]{7}$/.test(phone);
const cookieValue = (req, name) => (req.headers.get("cookie") || "").split(";").map((part) => part.trim()).find((part) => part.startsWith(`${name}=`))?.slice(name.length + 1) || "";
const setCookie = (name, value, maxAge) => `${name}=${value}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`;
const clearCookie = (name) => `${name}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`;
const clientIp = (req) => req.headers.get("x-nf-client-connection-ip")
  || (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "unknown";
const intEnv = (name, fallback) => {
  const value = Number.parseInt(env(name), 10);
  return Number.isInteger(value) && value > 0 ? value : fallback;
};
// Counts one attempt in a bucket and reports whether the bucket is over its limit.
// Buckets are hashed so raw IPs and phone numbers are never stored here.
async function overLimit(bucket, max, windowSeconds) {
  const key = hash(`rl:${bucket}`);
  const rows = await db.sql`SELECT COUNT(*)::int AS count FROM rate_limit_events
    WHERE bucket = ${key} AND created_at > NOW() - (${windowSeconds} * INTERVAL '1 second')`;
  if (rows[0].count >= max) return true;
  await db.sql`INSERT INTO rate_limit_events (bucket) VALUES (${key})`;
  if (Math.random() < 0.02) await db.sql`DELETE FROM rate_limit_events WHERE created_at < NOW() - INTERVAL '2 days'`;
  return false;
}
const tooMany = (message = "طلبات كثيرة. حاول مرة ثانية بعد شوي.") => fail(message, 429);
const teacherSlugs = new Set(["asas", "mohammad-bataineh", "maher-abu-bakr"]);
const teacherFor = (req) => {
  const value = req.headers.get("x-teacher-slug") || "asas";
  return teacherSlugs.has(value) ? value : "asas";
};
const validGradeForTeacher = (slug, grade) => slug === "mohammad-bataineh"
  ? Number(grade) === 12
  : slug === "maher-abu-bakr"
    ? [11, 12].includes(Number(grade))
    : Number(grade) >= 1 && Number(grade) <= 10;
const subjectForTeacher = (slug) => slug === "mohammad-bataineh" ? "الأحياء"
  : slug === "maher-abu-bakr" ? "اللغة العربية" : "";

async function studentSession(req) {
  const token = cookieValue(req, "asas_student");
  if (!token) return null;
  const rows = await db.sql`SELECT s.id, s.full_name, s.phone, s.grade, s.track, s.teacher_slug
    FROM student_sessions ss JOIN students s ON s.id = ss.student_id
    WHERE ss.token_hash = ${hash(token)} AND ss.expires_at > NOW()`;
  if (rows[0]?.teacher_slug !== teacherFor(req)) return null;
  return rows[0] || null;
}

async function requireAdmin(req) {
  const token = cookieValue(req, "asas_admin");
  if (!token) return false;
  const rows = await db.sql`SELECT token_hash FROM admin_sessions
    WHERE token_hash = ${hash(token)} AND teacher_slug = ${teacherFor(req)} AND expires_at > NOW()`;
  return Boolean(rows[0]);
}

async function upsertExam(payload, teacherSlug = "asas") {
  const { grade, subject, semester = "الفصل الأول", unit = "", lesson = "", academicYear = "2026-2027", sourceReference = "", model, questions } = payload || {};
  if (!Number.isInteger(Number(grade)) || Number(grade) < 1 || Number(grade) > 12) throw new Error("الصف يجب أن يكون من 1 إلى 12.");
  if (!String(subject || "").trim()) throw new Error("اسم المادة مطلوب.");
  if (!String(unit || "").trim()) throw new Error("اسم الوحدة مطلوب.");
  if (!String(lesson || "").trim()) throw new Error("اسم الدرس مطلوب.");
  if (!validGradeForTeacher(teacherSlug, grade) || (subjectForTeacher(teacherSlug) && subject.trim() !== subjectForTeacher(teacherSlug))) throw new Error("الصف أو المادة غير متاحان لهذه النسخة.");
  if (!Number.isInteger(Number(model)) || Number(model) < 1 || Number(model) > 3) throw new Error("رقم النموذج يجب أن يكون من 1 إلى 3.");
  if (!Array.isArray(questions) || questions.length !== 15) throw new Error("يجب أن يحتوي كل نموذج على 15 سؤالاً.");
  for (const [i, q] of questions.entries()) {
    if (!String(q.prompt || "").trim() || !Array.isArray(q.options) || q.options.length !== 4 || !Number.isInteger(q.correctIndex) || q.correctIndex < 0 || q.correctIndex > 3) {
      throw new Error(`بيانات السؤال ${i + 1} غير مكتملة.`);
    }
  }
  const sub = await db.sql`INSERT INTO subjects (teacher_slug, grade, name) VALUES (${teacherSlug}, ${Number(grade)}, ${String(subject).trim()})
    ON CONFLICT (teacher_slug, grade, name) DO UPDATE SET active = TRUE RETURNING id`;
  const exam = await db.sql`INSERT INTO exams (teacher_slug, grade, subject_id, title, semester, unit, lesson, academic_year, source_reference, model, status)
    VALUES (${teacherSlug}, ${Number(grade)}, ${sub[0].id}, ${`النموذج ${model} — ${subject}`}, ${semester}, ${String(unit)}, ${String(lesson)}, ${String(academicYear)}, ${String(sourceReference)}, ${Number(model)}, 'published')
    ON CONFLICT (teacher_slug, grade, subject_id, semester, academic_year, model) DO UPDATE SET title = EXCLUDED.title, unit = EXCLUDED.unit, lesson = EXCLUDED.lesson, source_reference = EXCLUDED.source_reference, status = 'published'
    RETURNING id`;
  await db.sql`DELETE FROM questions WHERE exam_id = ${exam[0].id}`;
  for (const [i, q] of questions.entries()) {
    await db.sql`INSERT INTO questions (exam_id, position, prompt, options, correct_index, explanation, lesson)
      VALUES (${exam[0].id}, ${i + 1}, ${String(q.prompt).trim()}, ${JSON.stringify(q.options)}::jsonb, ${q.correctIndex}, ${String(q.explanation || "")}, ${String(q.lesson || "").trim()})`;
  }
  return exam[0].id;
}

export default async (req) => {
  try {
    const url = new URL(req.url);
    const path = url.pathname.replace(/\/$/, "") || "/";
    const teacherSlug = teacherFor(req);

    if (req.method === "GET" && path === "/api/health") {
      await db.sql`SELECT 1`;
      return json({ ok: true, service: "asas-exam-bank-api" });
    }

    if (req.method === "POST" && path === "/api/auth/request-code") {
      const body = await parseBody(req);
      const phone = phoneOnly(body?.phone);
      const grade = Number(body?.grade);
      const name = String(body?.name || "").trim().slice(0, 100);
      if (!name || !validPhone(phone) || !Number.isInteger(grade) || !validGradeForTeacher(teacherSlug, grade)) return fail("أدخل الاسم ورقم هاتف أردني وصفاً متاحاً بشكل صحيح.");
      if (teacherSlug === "mohammad-bataineh" && body?.track && body.track !== "الأكاديمي") return fail("نسخة الأحياء مخصصة للمسار الأكاديمي.");
      const sentRecently = await db.sql`SELECT phone FROM verification_codes WHERE teacher_slug = ${teacherSlug} AND phone = ${phone} AND created_at > NOW() - INTERVAL '60 seconds'`;
      if (sentRecently.length) return fail("انتظر دقيقة قبل طلب رمز جديد.", 429);
      const ip = clientIp(req);
      if (await overLimit(`otp-ip:${ip}`, intEnv("OTP_MAX_PER_IP_HOUR", 20), 3600)) return tooMany();
      if (await overLimit(`otp-phone:${phone}`, intEnv("OTP_MAX_PER_PHONE_DAY", 5), 86400)) return tooMany("وصلت للحد اليومي لرسائل التحقق لهذا الرقم. حاول بكرا.");
      if (await overLimit("otp-global", intEnv("OTP_MAX_GLOBAL_HOUR", 300), 3600)) return fail("الخدمة مضغوطة حالياً. حاول بعد شوي.", 503);
      const smsUrl = env("SMS_WEBHOOK_URL");
      const smsToken = env("SMS_WEBHOOK_TOKEN");
      const localDemo = otpDemoMode();
      const code = localDemo ? DEMO_OTP : String(randomInt(100000, 1000000));
      const salt = otpSalt();
      if (!salt) return fail("إعداد التحقق غير مكتمل على الخادم.", 503);
      const codeHash = hash(`${teacherSlug}:${phone}:${code}:${salt}`);
      await db.sql`INSERT INTO verification_codes (teacher_slug, phone, code_hash, expires_at, attempts)
        VALUES (${teacherSlug}, ${phone}, ${codeHash}, NOW() + (${OTP_MINUTES} * INTERVAL '1 minute'), 0)
        ON CONFLICT (teacher_slug, phone) DO UPDATE SET code_hash = EXCLUDED.code_hash, expires_at = EXCLUDED.expires_at, attempts = 0, created_at = NOW()`;
      if (localDemo) return json({ ok: true, demo: true, message: `رمز التفعيل المؤقت: ${DEMO_OTP}` });
      const sms = await fetch(smsUrl, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${smsToken}` }, body: JSON.stringify({ to: `+962${phone}`, message: `رمز التحقق لبنك الأسئلة الأردني: ${code}. صالح لمدة 5 دقائق. لا تعطِ الرمز لأي شخص.` }) });
      if (!sms.ok) return fail("تعذر إرسال رمز التحقق حالياً.", 502);
      return json({ ok: true, message: "تم إرسال رمز التحقق." });
    }

    if (req.method === "POST" && path === "/api/auth/verify-code") {
      const body = await parseBody(req);
      const phone = phoneOnly(body?.phone);
      const code = String(body?.code || "").replace(/\D/g, "").slice(0, 6);
      if (await overLimit(`verify-ip:${clientIp(req)}`, intEnv("VERIFY_MAX_PER_IP_10MIN", 60), 600)) return tooMany();
      if (!validPhone(phone) || code.length !== 6) return fail("رمز التحقق غير صحيح.", 401);
      const rows = await db.sql`SELECT code_hash FROM verification_codes WHERE teacher_slug = ${teacherSlug} AND phone = ${phone} AND expires_at > NOW() AND attempts < 5`;
      if (!rows[0]) return fail("انتهت صلاحية الرمز أو تجاوزت عدد المحاولات.", 401);
      const expected = hash(`${teacherSlug}:${phone}:${code}:${otpSalt()}`);
      if (!secureEqual(rows[0].code_hash, expected)) {
        await db.sql`UPDATE verification_codes SET attempts = attempts + 1 WHERE teacher_slug = ${teacherSlug} AND phone = ${phone}`;
        return fail("رمز التحقق غير صحيح.", 401);
      }
      const prior = await db.sql`SELECT full_name, grade, track FROM students WHERE teacher_slug = ${teacherSlug} AND phone = ${phone}`;
      const name = String(body?.name || prior[0]?.full_name || "").trim().slice(0, 100);
      const grade = Number(body?.grade || prior[0]?.grade);
      if (!name || !Number.isInteger(grade) || !validGradeForTeacher(teacherSlug, grade)) return fail("بيانات الطالب غير مكتملة.");
      if (teacherSlug === "mohammad-bataineh" && body?.track && body.track !== "الأكاديمي") return fail("نسخة الأحياء مخصصة للمسار الأكاديمي.");
      const track = teacherSlug === "mohammad-bataineh" ? "الأكاديمي" : "";
      const student = await db.sql`INSERT INTO students (teacher_slug, full_name, phone, grade, track) VALUES (${teacherSlug}, ${name}, ${phone}, ${grade}, ${track})
        ON CONFLICT (teacher_slug, phone) DO UPDATE SET full_name = EXCLUDED.full_name, grade = EXCLUDED.grade, track = EXCLUDED.track, last_seen_at = NOW()
        RETURNING id, full_name, phone, grade, track`;
      await db.sql`DELETE FROM verification_codes WHERE teacher_slug = ${teacherSlug} AND phone = ${phone}`;
      const token = randomBytes(32).toString("base64url");
      const ttl = SESSION_DAYS * 24 * 60 * 60;
      await db.sql`INSERT INTO student_sessions (token_hash, student_id, expires_at) VALUES (${hash(token)}, ${student[0].id}, NOW() + (${ttl} * INTERVAL '1 second'))`;
      return json({ ok: true, student: student[0] }, 200, { "set-cookie": setCookie("asas_student", token, ttl) });
    }

    if (req.method === "POST" && path === "/api/auth/logout") {
      const token = cookieValue(req, "asas_student");
      if (token) await db.sql`DELETE FROM student_sessions WHERE token_hash = ${hash(token)}`;
      return json({ ok: true }, 200, { "set-cookie": clearCookie("asas_student") });
    }

    if (req.method === "GET" && path === "/api/catalog") {
      const grade = Number(url.searchParams.get("grade"));
      if (!Number.isInteger(grade) || !validGradeForTeacher(teacherSlug, grade)) return fail("صف غير صالح.");
      const exams = await db.sql`SELECT e.id, e.grade, s.name AS subject, e.title, e.semester, e.unit, e.lesson, e.model,
          (SELECT COUNT(*) FROM questions q WHERE q.exam_id = e.id) AS question_count
        FROM exams e JOIN subjects s ON s.id = e.subject_id WHERE e.teacher_slug = ${teacherSlug} AND e.grade = ${grade} AND e.status = 'published'
        ORDER BY s.name, e.semester, e.model`;
      return json({ grade, exams });
    }

    if (req.method === "GET" && path === "/api/results") {
      const student = await studentSession(req);
      if (!student) return fail("سجّل الدخول أولاً.", 401);
      const results = await db.sql`SELECT sub.name AS subject, e.title AS exam, a.score, a.total, a.completed_at
        FROM exam_attempts a JOIN exams e ON e.id = a.exam_id JOIN subjects sub ON sub.id = e.subject_id
        WHERE a.student_id = ${student.id} AND e.teacher_slug = ${teacherSlug} ORDER BY a.completed_at DESC LIMIT 100`;
      return json({ results });
    }

    // أسئلة أخطأ فيها الطالب: من آخر محاولة له في كل نموذج، مع الإجابة الصحيحة ودرس السؤال
    if (req.method === "GET" && path === "/api/mistakes") {
      const student = await studentSession(req);
      if (!student) return fail("سجّل الدخول أولاً.", 401);
      const mistakes = await db.sql`WITH latest AS (
          SELECT DISTINCT ON (a.exam_id) a.id, a.exam_id, a.completed_at
          FROM exam_attempts a JOIN exams e ON e.id = a.exam_id
          WHERE a.student_id = ${student.id} AND e.teacher_slug = ${teacherSlug}
          ORDER BY a.exam_id, a.completed_at DESC
        )
        SELECT sub.name AS subject, e.title AS exam, e.model, e.unit,
          COALESCE(NULLIF(q.lesson, ''), e.lesson) AS lesson, (q.lesson <> '') AS exact_lesson,
          q.position, q.prompt, q.options, aa.selected_index, q.correct_index, q.explanation, l.completed_at
        FROM latest l
        JOIN attempt_answers aa ON aa.attempt_id = l.id AND aa.is_correct = FALSE
        JOIN questions q ON q.id = aa.question_id
        JOIN exams e ON e.id = l.exam_id
        JOIN subjects sub ON sub.id = e.subject_id
        ORDER BY sub.name, e.model, q.position
        LIMIT 500`;
      return json({ mistakes });
    }

    if (req.method === "GET" && path.startsWith("/api/exams/")) {
      const examId = Number(path.split("/").pop());
      const student = await studentSession(req);
      if (!student) return fail("سجّل الدخول أولاً.", 401);
      const exams = await db.sql`SELECT id, grade FROM exams WHERE id = ${examId} AND teacher_slug = ${teacherSlug} AND status = 'published'`;
      if (!exams[0] || Number(exams[0].grade) !== Number(student.grade)) return fail("الامتحان غير متاح لهذا الصف.", 404);
      const questions = await db.sql`SELECT id, position, prompt, options FROM questions WHERE exam_id = ${examId} ORDER BY position`;
      return json({ examId, questions });
    }

    if (req.method === "POST" && path === "/api/attempts") {
      const student = await studentSession(req);
      if (!student) return fail("سجّل الدخول أولاً.", 401);
      const body = await parseBody(req);
      const examId = Number(body?.examId);
      const answers = body?.answers;
      if (!Number.isInteger(examId) || !Array.isArray(answers)) return fail("بيانات الامتحان غير مكتملة.");
      const questions = await db.sql`SELECT q.id, q.correct_index FROM questions q JOIN exams e ON e.id = q.exam_id
        WHERE e.id = ${examId} AND e.teacher_slug = ${teacherSlug} AND e.grade = ${student.grade} AND e.status = 'published' ORDER BY q.position`;
      if (!questions.length || answers.length !== questions.length) return fail("الامتحان أو الإجابات غير مكتملة.");
      const byId = new Map(answers.map((a) => [Number(a.questionId), Number(a.selectedIndex)]));
      const scored = questions.map((q) => ({ id: Number(q.id), choice: byId.get(Number(q.id)), correct: Number(q.correct_index) }));
      if (scored.some((a) => !Number.isInteger(a.choice) || a.choice < 0 || a.choice > 3)) return fail("إجابة غير صالحة.");
      const score = scored.filter((a) => a.choice === a.correct).length;
      const attempt = await db.sql`INSERT INTO exam_attempts (student_id, exam_id, score, total)
        VALUES (${student.id}, ${examId}, ${score}, ${scored.length}) RETURNING id, score, total, completed_at`;
      for (const a of scored) await db.sql`INSERT INTO attempt_answers (attempt_id, question_id, selected_index, is_correct)
        VALUES (${attempt[0].id}, ${a.id}, ${a.choice}, ${a.choice === a.correct})`;
      return json({ ok: true, result: attempt[0] });
    }

    if (req.method === "POST" && path === "/api/admin/login") {
      const body = await parseBody(req);
      const password = String(body?.password || "").slice(0, 200);
      if (await overLimit(`admin-ip:${clientIp(req)}`, 5, 900)) return tooMany("محاولات دخول كثيرة. استنى ربع ساعة وجرّب مرة ثانية.");
      if (await overLimit("admin-global", 30, 3600)) return tooMany("محاولات دخول كثيرة. جرّب لاحقاً.");
      const configured = env("ADMIN_PASSWORD");
      if (!configured) return fail("لم تُضبط كلمة مرور الإدارة بعد.", 503);
      if (!secureEqual(hash(password), hash(configured))) return fail("كلمة المرور غير صحيحة.", 401);
      const token = randomBytes(32).toString("base64url");
      const ttl = 8 * 60 * 60;
      await db.sql`INSERT INTO admin_sessions (token_hash, teacher_slug, expires_at) VALUES (${hash(token)}, ${teacherSlug}, NOW() + (${ttl} * INTERVAL '1 second'))`;
      return json({ ok: true }, 200, { "set-cookie": setCookie("asas_admin", token, ttl) });
    }

    if (path.startsWith("/api/admin/") && !(await requireAdmin(req))) return fail("يلزم تسجيل دخول الإدارة.", 401);

    if (req.method === "GET" && path === "/api/admin/overview") {
      const [students, attempts, exams] = await Promise.all([
        db.sql`SELECT COUNT(*)::int AS count FROM students WHERE teacher_slug = ${teacherSlug}`,
        db.sql`SELECT COUNT(*)::int AS count FROM exam_attempts a JOIN students s ON s.id = a.student_id WHERE s.teacher_slug = ${teacherSlug}`,
        db.sql`SELECT COUNT(*)::int AS count FROM exams WHERE teacher_slug = ${teacherSlug}`
      ]);
      const results = await db.sql`SELECT s.full_name, s.phone, s.grade, sub.name AS subject, e.title AS exam,
          e.semester, e.unit, e.lesson, a.score, a.total, a.completed_at
        FROM exam_attempts a JOIN students s ON s.id = a.student_id JOIN exams e ON e.id = a.exam_id
        JOIN subjects sub ON sub.id = e.subject_id WHERE e.teacher_slug = ${teacherSlug} ORDER BY a.completed_at DESC LIMIT 500`;
      return json({ counts: { students: students[0].count, attempts: attempts[0].count, exams: exams[0].count }, results });
    }

    if (req.method === "GET" && path === "/api/admin/students") {
      const students = await db.sql`SELECT s.full_name, s.phone, s.grade, s.track, s.created_at,
          COUNT(a.id)::int AS attempts, COALESCE(MAX(a.completed_at), s.created_at) AS last_activity
        FROM students s LEFT JOIN exam_attempts a ON a.student_id = s.id
        WHERE s.teacher_slug = ${teacherSlug} GROUP BY s.id ORDER BY s.created_at DESC LIMIT 5000`;
      return json({ students });
    }

    if (req.method === "POST" && path === "/api/admin/import-exam") {
      const body = await parseBody(req);
      try { const examId = await upsertExam(body, teacherSlug); return json({ ok: true, examId }); }
      catch (error) { return fail(error.message); }
    }

    if (req.method === "POST" && path === "/api/admin/import-bank") {
      const body = await parseBody(req);
      if (!Array.isArray(body?.exams) || !body.exams.length) return fail("ملف الاستيراد يجب أن يحتوي على قائمة exams.");
      const imported = [];
      for (const exam of body.exams) {
        try { imported.push(await upsertExam(exam, teacherSlug)); }
        catch (error) { return fail(`تعذر استيراد نموذج ${exam?.model || "؟"}: ${error.message}`); }
      }
      return json({ ok: true, imported: imported.length });
    }

    if (req.method === "POST" && path === "/api/admin/logout") {
      const token = cookieValue(req, "asas_admin");
      if (token) await db.sql`DELETE FROM admin_sessions WHERE token_hash = ${hash(token)}`;
      return json({ ok: true }, 200, { "set-cookie": clearCookie("asas_admin") });
    }

    return fail("المسار غير موجود.", 404);
  } catch (error) {
    console.error("Asas API error", error);
    return fail("حدث خطأ في الخادم.", 500);
  }
};

export const config = { path: "/api/*" };
