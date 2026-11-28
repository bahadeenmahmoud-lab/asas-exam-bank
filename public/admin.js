const $ = (id) => document.getElementById(id);
let bankResults = [];
let bankStudents = [];
const teacherSlug = new URLSearchParams(location.search).get('teacher') || 'asas';
const apiHeaders = { 'content-type': 'application/json', 'x-teacher-slug': teacherSlug };

async function api(path, options = {}) {
  const response = await fetch(path, { credentials: 'same-origin', ...options, headers: { ...apiHeaders, ...(options.headers || {}) } });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'تعذر تنفيذ الطلب.');
  return payload;
}

function csvDownload(filename, rows) {
  const quote = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
  const csv = '\uFEFF' + rows.map((row) => row.map(quote).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url);
}

function excelDownload(filename, sheetName, headers, rows) {
  if (!window.XLSX) return csvDownload(filename.replace(/\.xlsx$/i, '.csv'), [headers, ...rows]);
  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const workbook = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, filename);
}

function showAdmin(data) {
  $('loginPanel').hidden = true; $('adminPanel').hidden = false;
  $('studentCount').textContent = data.counts.students;
  $('attemptCount').textContent = data.counts.attempts;
  $('examCount').textContent = data.counts.exams;
  bankResults = data.results || [];
  const tbody = $('resultsBody'); tbody.replaceChildren();
  for (const row of bankResults) {
    const tr = document.createElement('tr');
    [row.full_name, row.phone, row.grade === 11 ? 'الأول الثانوي' : row.grade === 12 ? 'التوجيهي' : `الصف ${row.grade}`, row.subject, row.exam, `${row.score}/${row.total}`, new Date(row.completed_at).toLocaleString('ar-JO')].forEach((value) => { const td = document.createElement('td'); td.textContent = value; tr.append(td); });
    tbody.append(tr);
  }
}

async function refreshAdmin() {
  const [overview, students] = await Promise.all([api('/api/admin/overview'), api('/api/admin/students')]);
  bankStudents = students.students || []; showAdmin(overview);
}

const gradeSelect = $('examGrade');
const textbookPages = { 1: 68, 2: 69, 3: 70, 4: 71, 5: 72, 6: 73, 7: 74, 8: 75, 9: 76, 10: 77 };
const gradeValues = teacherSlug === 'mohammad-bataineh' ? [12] : teacherSlug === 'maher-abu-bakr' ? [11, 12] : Array.from({ length: 10 }, (_, i) => i + 1);
for (const grade of gradeValues) { const option = document.createElement('option'); option.value = String(grade); option.textContent = grade === 11 ? 'الأول الثانوي' : grade === 12 ? 'التوجيهي' : `الصف ${grade}`; gradeSelect.append(option); }
gradeSelect.addEventListener('change', () => { const page = textbookPages[gradeSelect.value]; $('sourceReference').value = page ? `https://nccd.gov.jo/ar/pages/TextBooksGrade/${page}` : ''; });
for (let number = 1; number <= 30; number++) {
  const fieldset = document.createElement('fieldset');
  if (number > 15) fieldset.dataset.finalOnly = 'true';
  fieldset.innerHTML = `<legend>السؤال ${number}</legend><label>نص السؤال<textarea class="q-prompt" required></textarea></label><label>الخيارات الأربعة — كل خيار في سطر<textarea class="q-options" required placeholder="الخيار الأول\nالخيار الثاني\nالخيار الثالث\nالخيار الرابع"></textarea></label><label>الإجابة الصحيحة<select class="q-answer"><option value="0">الخيار الأول</option><option value="1">الخيار الثاني</option><option value="2">الخيار الثالث</option><option value="3">الخيار الرابع</option></select></label><label>تفسير الإجابة<textarea class="q-explanation"></textarea></label>`;
  $('questionEditor').append(fieldset);
}

function syncQuestionCount() {
  const isFinal = $('examModel').value === '4';
  document.querySelectorAll('#questionEditor fieldset').forEach((field) => {
    const hidden = field.dataset.finalOnly === 'true' && !isFinal;
    field.hidden = hidden; field.disabled = hidden;
  });
}
$('examModel').addEventListener('change', syncQuestionCount); syncQuestionCount();
for (const grade of gradeValues) { const option = document.createElement('option'); option.value = String(grade); option.textContent = `الصف ${grade}`; $('finalGrade')?.append(option); }
$('buildFinalsBtn')?.addEventListener('click', async () => {
  const status = $('adminStatus'); status.className = 'status-line';
  const grade = Number($('finalGrade').value);
  status.textContent = 'جارٍ بناء الامتحانات النهائية…';
  try {
    const result = await api('/api/admin/build-finals', { method: 'POST', body: JSON.stringify({ grade, semester: 'الفصل الأول' }) });
    status.textContent = `تم بناء ${result.built.length} امتحان نهائي${result.built.length ? ': ' + result.built.join('، ') : ''}.${result.skipped.length ? ' تم تخطي: ' + result.skipped.join('، ') : ''}`;
    await refreshAdmin();
  } catch (error) { status.textContent = error.message; status.classList.add('error'); }
});

$('examForm').addEventListener('submit', async (event) => {
  event.preventDefault(); const status = $('adminStatus'); status.className = 'status-line'; status.textContent = 'جارٍ حفظ النموذج…';
  try {
    const questions = [...document.querySelectorAll('#questionEditor fieldset:not([disabled])')].map((field) => ({ prompt: field.querySelector('.q-prompt').value.trim(), options: field.querySelector('.q-options').value.split('\n').map((item) => item.trim()).filter(Boolean), correctIndex: Number(field.querySelector('.q-answer').value), explanation: field.querySelector('.q-explanation').value.trim() }));
    const payload = { grade: Number($('examGrade').value), subject: $('examSubject').value.trim(), semester: $('examSemester').value, unit: $('examUnit').value.trim(), lesson: $('examLesson').value.trim(), academicYear: $('academicYear').value.trim(), sourceReference: $('sourceReference').value.trim(), model: Number($('examModel').value), questions };
    await api('/api/admin/import-exam', { method: 'POST', body: JSON.stringify(payload) }); status.textContent = 'تم حفظ النموذج ونشره.'; $('examForm').reset(); syncQuestionCount(); await refreshAdmin();
  } catch (error) { status.textContent = error.message; status.classList.add('error'); }
});

$('loginForm').addEventListener('submit', async (event) => {
  event.preventDefault(); $('loginError').hidden = true;
  try { await api('/api/admin/login', { method: 'POST', body: JSON.stringify({ password: $('adminPassword').value }) }); await refreshAdmin(); }
  catch (error) { $('loginError').textContent = error.message; $('loginError').hidden = false; }
});

function field(row, arabic, english) { return row[arabic] ?? row[english] ?? ''; }
function xlsxRowsToExams(rows) {
  const groups = new Map();
  for (const row of rows) {
    const grade = Number(field(row, 'الصف', 'grade'));
    const subject = String(field(row, 'المادة', 'subject')).trim();
    const semester = String(field(row, 'الفصل', 'semester') || 'الفصل الأول').trim();
    const unit = String(field(row, 'الوحدة', 'unit')).trim();
    const lesson = String(field(row, 'الدرس', 'lesson')).trim();
    const model = Number(field(row, 'رقم النموذج', 'model'));
    const academicYear = String(field(row, 'السنة الدراسية', 'academicYear') || '2026-2027').trim();
    const sourceReference = String(field(row, 'مرجع المنهاج', 'sourceReference')).trim();
    const prompt = String(field(row, 'نص السؤال', 'prompt')).trim();
    if (!prompt) continue;
    const key = JSON.stringify([grade, subject, semester, unit, lesson, model, academicYear]);
    if (!groups.has(key)) groups.set(key, { grade, subject, semester, unit, lesson, model, academicYear, sourceReference, questions: [] });
    const correctRaw = field(row, 'الإجابة الصحيحة (1-4)', 'correctIndex');
    const correctIndex = row.correctIndex !== undefined ? Number(row.correctIndex) : Number(correctRaw) - 1;
    groups.get(key).questions.push({ prompt, options: [1,2,3,4].map((n) => String(field(row, `الخيار ${n}`, `option${n}`)).trim()), correctIndex, explanation: String(field(row, 'تفسير الإجابة', 'explanation')).trim() });
  }
  return [...groups.values()];
}

$('importBtn').addEventListener('click', async () => {
  const file = $('importFile').files[0]; const status = $('adminStatus'); status.className = 'status-line';
  if (!file) { status.textContent = 'اختار ملف Excel أو JSON أولاً.'; status.classList.add('error'); return; }
  try {
    let exams;
    if (/\.json$/i.test(file.name)) { const payload = JSON.parse(await file.text()); exams = payload.exams; }
    else { if (!window.XLSX) throw new Error('تعذر تحميل قارئ Excel. نزّل الملف بصيغة CSV أو أعد المحاولة.'); const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' }); const sheet = workbook.Sheets[workbook.SheetNames[0]]; exams = xlsxRowsToExams(XLSX.utils.sheet_to_json(sheet, { defval: '' })); }
    if (!Array.isArray(exams) || !exams.length) throw new Error('لم أجد نماذج صالحة في الملف.');
    const result = await api('/api/admin/import-bank', { method: 'POST', body: JSON.stringify({ exams }) }); status.textContent = `تم رفع ${result.imported} نموذج بنجاح.`; await refreshAdmin();
  } catch (error) { status.textContent = error.message; status.classList.add('error'); }
});

$('templateExcel').addEventListener('click', () => {
  const headers = ['الصف','المادة','الفصل','الوحدة','الدرس','السنة الدراسية','رقم النموذج','مرجع المنهاج','رقم السؤال','نص السؤال','الخيار 1','الخيار 2','الخيار 3','الخيار 4','الإجابة الصحيحة (1-4)','تفسير الإجابة'];
  const rows = Array.from({ length: 15 }, (_, i) => ['', '', 'الفصل الأول', '', '', '2026-2027', 1, '', i + 1, '', '', '', '', '', '', '']);
  excelDownload('قالب-أسئلة-الامتحانات.xlsx', 'الأسئلة', headers, rows);
});

$('studentsCsv').addEventListener('click', () => excelDownload('بيانات-الطلاب.xlsx', 'الطلاب', ['الاسم','الهاتف','الصف','المسار','عدد المحاولات','تاريخ التسجيل','آخر نشاط'], bankStudents.map((s) => [s.full_name, s.phone, s.grade === 11 ? 'الأول الثانوي' : s.grade === 12 ? 'التوجيهي' : s.grade, s.track, s.attempts, s.created_at, s.last_activity])));
$('resultsCsv').addEventListener('click', () => excelDownload('نتائج-الطلاب.xlsx', 'النتائج', ['الطالب','الهاتف','الصف','المادة','الفصل','الوحدة','الدرس','الامتحان','العلامة','العلامة الكاملة','التاريخ'], bankResults.map((r) => [r.full_name, r.phone, r.grade === 11 ? 'الأول الثانوي' : r.grade === 12 ? 'التوجيهي' : r.grade, r.subject, r.semester, r.unit, r.lesson, r.exam, r.score, r.total, r.completed_at])));
$('logoutBtn').addEventListener('click', async () => { await api('/api/admin/logout', { method: 'POST', body: '{}' }).catch(() => {}); location.reload(); });
