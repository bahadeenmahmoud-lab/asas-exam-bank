const $ = (id) => document.getElementById(id);
let bankResults = [];
let bankStudents = [];
const teacherSlug = new URLSearchParams(location.search).get("teacher") || "asas";
const apiHeaders = { "content-type": "application/json", "x-teacher-slug": teacherSlug };

async function api(path, options = {}) {
  const response = await fetch(path, { credentials: "same-origin", ...options, headers: { ...apiHeaders, ...(options.headers || {}) } });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "تعذر تنفيذ الطلب.");
  return payload;
}

function csvDownload(filename, rows) {
  const quote = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  const csv = "\uFEFF" + rows.map((row) => row.map(quote).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a"); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url);
}

function showAdmin(data) {
  $("loginPanel").hidden = true;
  $("adminPanel").hidden = false;
  $("studentCount").textContent = data.counts.students;
  $("attemptCount").textContent = data.counts.attempts;
  $("examCount").textContent = data.counts.exams;
  bankResults = data.results || [];
  const tbody = $("resultsBody"); tbody.replaceChildren();
  for (const row of bankResults) {
    const tr = document.createElement("tr");
    [row.full_name, row.phone, `الصف ${row.grade}`, row.subject, row.exam, `${row.score}/${row.total}`, new Date(row.completed_at).toLocaleString("ar-JO")].forEach((value) => {
      const td = document.createElement("td"); td.textContent = value; tr.append(td);
    });
    tbody.append(tr);
  }
}

async function refreshAdmin() {
  const [overview, students] = await Promise.all([api("/api/admin/overview"), api("/api/admin/students")]);
  bankStudents = students.students || [];
  showAdmin(overview);
}

const gradeSelect = $("examGrade");
const textbookPages = { 1: 68, 2: 69, 3: 70, 4: 71, 5: 72, 6: 73, 7: 74, 8: 75, 9: 76, 10: 77 };
const gradeValues = teacherSlug === "mohammad-bataineh" ? [12] : teacherSlug === "maher-abu-bakr" ? [11, 12] : Array.from({length:12}, (_, i) => i + 1);
for (const grade of gradeValues) {
  const option = document.createElement("option"); option.value = String(grade); option.textContent = `الصف ${grade}`; gradeSelect.append(option);
}
gradeSelect.addEventListener("change", () => { const page = textbookPages[gradeSelect.value]; $("sourceReference").value = page ? `https://nccd.gov.jo/ar/pages/TextBooksGrade/${page}` : ""; });
for (let number = 1; number <= 15; number++) {
  const fieldset = document.createElement("fieldset");
  fieldset.innerHTML = `<legend>السؤال ${number}</legend>
    <label>نص السؤال<textarea class="q-prompt" required></textarea></label>
    <label>الخيارات الأربعة — كل خيار في سطر<textarea class="q-options" required placeholder="الخيار الأول\nالخيار الثاني\nالخيار الثالث\nالخيار الرابع"></textarea></label>
    <label>الإجابة الصحيحة<select class="q-answer"><option value="0">الخيار الأول</option><option value="1">الخيار الثاني</option><option value="2">الخيار الثالث</option><option value="3">الخيار الرابع</option></select></label>
    <label>تفسير الإجابة<textarea class="q-explanation"></textarea></label>`;
  $("questionEditor").append(fieldset);
}

$("examForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const status = $("adminStatus"); status.className = "status-line"; status.textContent = "جارٍ حفظ النموذج…";
  try {
    const questions = [...document.querySelectorAll("#questionEditor fieldset")].map((field) => {
      const options = field.querySelector(".q-options").value.split("\n").map((item) => item.trim()).filter(Boolean);
      return { prompt: field.querySelector(".q-prompt").value.trim(), options, correctIndex: Number(field.querySelector(".q-answer").value), explanation: field.querySelector(".q-explanation").value.trim() };
    });
    const payload = { grade: Number($("examGrade").value), subject: $("examSubject").value.trim(), semester: $("examSemester").value, academicYear: $("academicYear").value.trim(), sourceReference: $("sourceReference").value.trim(), model: Number($("examModel").value), questions };
    await api("/api/admin/import-exam", { method: "POST", body: JSON.stringify(payload) });
    status.textContent = "تم حفظ النموذج ونشره.";
    $("examForm").reset();
    await refreshAdmin();
  } catch (error) { status.textContent = error.message; status.classList.add("error"); }
});

$("loginForm").addEventListener("submit", async (event) => {
  event.preventDefault(); $("loginError").hidden = true;
  try {
    await api("/api/admin/login", { method: "POST", body: JSON.stringify({ password: $("adminPassword").value }) });
    await refreshAdmin();
  } catch (error) { $("loginError").textContent = error.message; $("loginError").hidden = false; }
});

$("importBtn").addEventListener("click", async () => {
  const file = $("importFile").files[0];
  const status = $("adminStatus"); status.className = "status-line";
  if (!file) { status.textContent = "اختار ملف JSON أولاً."; status.classList.add("error"); return; }
  try {
    const payload = JSON.parse(await file.text());
    const result = await api("/api/admin/import-bank", { method: "POST", body: JSON.stringify(payload) });
    status.textContent = `تم استيراد ${result.imported} نموذج بنجاح.`;
    await refreshAdmin();
  } catch (error) { status.textContent = error.message; status.classList.add("error"); }
});

$("studentsCsv").addEventListener("click", () => csvDownload("طلاب-بنك-الامتحانات.csv", [["الاسم", "الهاتف", "الصف", "المسار", "عدد المحاولات", "تاريخ التسجيل"], ...bankStudents.map((s) => [s.full_name, s.phone, s.grade, s.track, s.attempts, s.created_at])]));
$("resultsCsv").addEventListener("click", () => csvDownload("نتائج-بنك-الامتحانات.csv", [["الطالب", "الهاتف", "الصف", "المادة", "النموذج", "العلامة", "العلامة الكاملة", "التاريخ"], ...bankResults.map((r) => [r.full_name, r.phone, r.grade, r.subject, r.exam, r.score, r.total, r.completed_at])]));
$("logoutBtn").addEventListener("click", async () => { await api("/api/admin/logout", { method: "POST", body: "{}" }).catch(() => {}); location.reload(); });
