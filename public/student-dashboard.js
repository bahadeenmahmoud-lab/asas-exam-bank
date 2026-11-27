/* لوحة الطالب: معلوماتي ونتائجي وتقدّمي
   تعمل فوق app.js دون تعديله، وتعتمد على /api/catalog و /api/results الموجودتين. */
(function () {
  'use strict';
  var cfg = window.ASAS_CONFIG || { slug: 'asas' };
  var headers = { 'content-type': 'application/json', 'x-teacher-slug': cfg.slug };
  var profileKey = 'asas-exam-profile-' + cfg.slug;

  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function pct(score, total) { total = Number(total) || 0; return total ? Math.round((Number(score) || 0) / total * 100) : 0; }
  function gradeName(g) {
    g = String(g);
    if (g === '11') return 'الأول الثانوي';
    if (g === '12') return 'التوجيهي';
    return 'الصف ' + g;
  }
  function level(p) {
    if (p >= 90) return { t: 'ممتاز', c: 'lv-top' };
    if (p >= 75) return { t: 'جيد جدًا', c: 'lv-good' };
    if (p >= 60) return { t: 'جيد', c: 'lv-mid' };
    return { t: 'يحتاج تدريب', c: 'lv-low' };
  }
  function fmtDate(d) {
    var x = new Date(d);
    if (isNaN(x)) return '';
    return x.toLocaleDateString('ar-JO', { day: 'numeric', month: 'short' });
  }
  function maskPhone(p) {
    p = String(p || '');
    return p.length > 4 ? '•••• ' + p.slice(-4) : p;
  }
  function getProfile() {
    try { return JSON.parse(localStorage.getItem(profileKey) || '{}'); } catch (e) { return {}; }
  }
  function when(r) { return r.completed_at || r.completedAt || r.created_at || r.date || ''; }

  var PALETTE = [
    ['عرب', '📖', '#ff5c8a', '#fff0f4'], ['رياض', '🔢', '#3a86ff', '#eef4ff'], ['علوم', '🔬', '#1fc77e', '#e9fbf3'],
    ['إنجليز', '🔤', '#7c4dff', '#f3eeff'], ['إسلام', '🕌', '#12b5cb', '#e7f9fc'], ['اجتماع', '🌍', '#ff9f1c', '#fff5e6'],
    ['مهني', '🛠️', '#8d6e63', '#f6f0ed'], ['رقمي', '💻', '#0ea5e9', '#e8f6fd'], ['فيزياء', '⚡', '#f59e0b', '#fff7e6'],
    ['كيمياء', '⚗️', '#10b981', '#e7faf3'], ['أحياء', '🧬', '#22c55e', '#ebfbf0'], ['تاريخ', '🏛️', '#a16207', '#fbf4e6']
  ];
  function look(name) {
    name = String(name || '');
    for (var i = 0; i < PALETTE.length; i++) if (name.indexOf(PALETTE[i][0]) !== -1) return { ic: PALETTE[i][1], c: PALETTE[i][2], bg: PALETTE[i][3] };
    return { ic: '📘', c: '#3a86ff', bg: '#eef4ff' };
  }
  function stars(p) { var n = p >= 90 ? 3 : p >= 75 ? 2 : p >= 60 ? 1 : 0; return '⭐'.repeat(n) + '<span style="opacity:.25">' + '⭐'.repeat(3 - n) + '</span>'; }
  function starCount(p) { return p >= 90 ? 3 : p >= 75 ? 2 : p >= 60 ? 1 : 0; }
  function cheer(avg, attempts, name) {
    var first = String(name || '').trim().split(/\s+/)[0] || 'بطل';
    if (!attempts) return '👋 أهلًا ' + first + '! ابدأ أول نموذج اليوم واجمع نجومك الأولى ⭐';
    if (avg >= 90) return '🏆 رائع يا ' + first + '! أنت من الأبطال، حافظ على هذا المستوى!';
    if (avg >= 75) return '🚀 أداؤك ممتاز يا ' + first + '! خطوة صغيرة وتصل للقمة.';
    if (avg >= 60) return '💪 أنت على الطريق الصحيح يا ' + first + '، كل نموذج يقرّبك من هدفك!';
    return '🌱 كل بطل بدأ من هنا يا ' + first + '! أعد المحاولة وستتفاجأ بتقدّمك.';
  }

  function sparkline(points) {
    if (points.length < 2) return '<p class="sd-empty">📈 حلّ نموذجين أو أكثر ليظهر خط تقدّمك هنا.</p>';
    var w = 320, h = 120, pad = 14;
    var step = (w - pad * 2) / (points.length - 1);
    // من اليمين (الأقدم) إلى اليسار (الأحدث) لتناسب القراءة العربية
    var xy = points.map(function (p, i) { return [w - pad - i * step, h - pad - (p.v / 100) * (h - pad * 2)]; });
    var line = xy.map(function (q) { return q[0].toFixed(1) + ',' + q[1].toFixed(1); }).join(' ');
    var area = (w - pad) + ',' + (h - pad) + ' ' + line + ' ' + xy[xy.length - 1][0].toFixed(1) + ',' + (h - pad);
    var dots = xy.map(function (q, i) {
      return '<circle cx="' + q[0].toFixed(1) + '" cy="' + q[1].toFixed(1) + '" r="4.5"><title>' + esc(points[i].label) + ': ' + points[i].v + '%</title></circle>';
    }).join('');
    var gy = (h - pad - 0.75 * (h - pad * 2)).toFixed(1);
    return '<svg class="sd-spark" viewBox="0 0 ' + w + ' ' + h + '" role="img" aria-label="تطور علاماتك في آخر النماذج">' +
      '<defs><linearGradient id="sdGrad" x1="1" x2="0"><stop offset="0" stop-color="#ff5c8a"/><stop offset=".5" stop-color="#7c4dff"/><stop offset="1" stop-color="#12b5cb"/></linearGradient>' +
      '<linearGradient id="sdArea" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#7c4dff" stop-opacity=".22"/><stop offset="1" stop-color="#7c4dff" stop-opacity="0"/></linearGradient></defs>' +
      '<line class="sd-goal" x1="' + pad + '" x2="' + (w - pad) + '" y1="' + gy + '" y2="' + gy + '"/>' +
      '<polygon class="sd-area" points="' + area + '"/><polyline class="sd-line" points="' + line + '"/>' + dots + '</svg>' +
      '<div class="sd-spark-legend"><span>الأقدم</span><span>🎯 الخط المتقطع: هدفك 75%</span><span>الأحدث</span></div>';
  }

  function build(profile, exams, results) {
    var bySubject = {};
    exams.forEach(function (e) {
      var s = bySubject[e.subject] || (bySubject[e.subject] = { name: e.subject, exams: [], best: {}, attempts: [] });
      s.exams.push(e);
    });
    results.forEach(function (r) {
      var s = bySubject[r.subject] || (bySubject[r.subject] = { name: r.subject, exams: [], best: {}, attempts: [] });
      var p = pct(r.score, r.total);
      s.attempts.push(p);
      var key = r.exam || r.title || '';
      if (!(key in s.best) || p > s.best[key]) s.best[key] = p;
    });

    var subjects = Object.keys(bySubject).map(function (k) {
      var s = bySubject[k];
      var done = Object.keys(s.best).length;
      var total = Math.max(s.exams.length, done);
      var bests = Object.keys(s.best).map(function (x) { return s.best[x]; });
      var avg = bests.length ? Math.round(bests.reduce(function (a, b) { return a + b; }, 0) / bests.length) : null;
      var st = bests.reduce(function (a, b) { return a + starCount(b); }, 0);
      var next = s.exams.filter(function (e) { return !(e.title in s.best); })
        .sort(function (a, b) { return (a.model || 0) - (b.model || 0); })[0] || null;
      return { name: s.name, done: done, total: total, avg: avg, next: next, attempts: s.attempts.length, stars: st };
    }).sort(function (a, b) { return a.name.localeCompare(b.name, 'ar'); });

    var sorted = results.slice().sort(function (a, b) { return new Date(when(a)) - new Date(when(b)); });
    var allPct = sorted.map(function (r) { return pct(r.score, r.total); });
    var avgAll = allPct.length ? Math.round(allPct.reduce(function (a, b) { return a + b; }, 0) / allPct.length) : null;
    var doneTotal = subjects.reduce(function (a, s) { return a + s.done; }, 0);
    var examTotal = subjects.reduce(function (a, s) { return a + s.total; }, 0);
    var starTotal = subjects.reduce(function (a, s) { return a + s.stars; }, 0);
    var coverage = examTotal ? Math.round(doneTotal / examTotal * 100) : 0;
    var rated = subjects.filter(function (s) { return s.avg !== null; });
    var best = rated.slice().sort(function (a, b) { return b.avg - a.avg; })[0];
    var weak = rated.slice().sort(function (a, b) { return a.avg - b.avg; })[0];
    var perfect = allPct.some(function (p) { return p === 100; });
    var tried = rated.length;
    var completedSubject = subjects.some(function (s) { return s.total && s.done >= s.total; });
    var starSubject = rated.some(function (s) { return s.avg >= 90; });
    var improved = allPct.length >= 2 && allPct[allPct.length - 1] > allPct[allPct.length - 2];

    var suggestion = null;
    if (weak && weak.next && weak.avg < 75) suggestion = { s: weak, why: 'لتقوية علامتك في ' + weak.name };
    if (!suggestion) { var untouched = subjects.filter(function (s) { return s.done === 0 && s.next; })[0]; if (untouched) suggestion = { s: untouched, why: 'مغامرة جديدة: مادة لم تجرّبها بعد!' }; }
    if (!suggestion) { var any = subjects.filter(function (s) { return s.next; })[0]; if (any) suggestion = { s: any, why: 'كمّل نماذج ' + any.name + ' واجمع نجومًا أكثر' }; }

    var spark = sorted.slice(-10).map(function (r) { return { v: pct(r.score, r.total), label: (r.subject || '') + ' — ' + fmtDate(when(r)) }; });
    var recent = sorted.slice(-5).reverse();
    var name = profile.full_name || profile.name || 'الطالب';

    var h = '';
    // البطاقة الرئيسية
    h += '<div class="sd-hero"><span class="sd-shape s1">⭐</span><span class="sd-shape s2">✏️</span><span class="sd-shape s3">✨</span>';
    h += '<div class="sd-hero-row"><div class="sd-avatar" aria-hidden="true">' + esc(name.trim().charAt(0)) + '</div>';
    h += '<div class="sd-id"><h3>' + esc(name) + '</h3><p>' + esc(gradeName(profile.grade)) + (profile.track ? ' — ' + esc(profile.track) : '') +
      (avgAll === null ? '' : ' · ' + level(avgAll).t) + '</p></div>';
    h += '<div class="sd-ring" style="--p:' + coverage + '"><div class="sd-ring-in"><b>' + coverage + '%</b><small>إنجازك</small></div></div></div>';
    h += '<p class="sd-cheer">' + esc(cheer(avgAll, results.length, name)) + '</p></div>';

    // الأرقام
    h += '<div class="sd-kpis">';
    h += kpi('⭐', starTotal, 'نجمة جمعتها', 'sd-k4');
    h += kpi('🎯', avgAll === null ? '—' : avgAll + '%', 'معدّلك', 'sd-k2');
    h += kpi('📚', doneTotal + '/' + examTotal, 'نموذج أنجزته', 'sd-k3');
    h += kpi('🏅', best ? best.name : '—', 'أقوى مادة', 'sd-k1', true);
    h += '</div>';

    if (suggestion) {
      h += '<div class="sd-next"><span class="sd-rocket" aria-hidden="true">🚀</span><div class="sd-next-txt"><small>مهمّتك التالية</small><strong>' +
        esc(suggestion.s.next.title) + '</strong><span>' + esc(suggestion.why) + '</span></div>' +
        '<button type="button" class="sd-go" data-subject="' + esc(suggestion.s.name) + '">يلّا نبدأ!</button></div>';
    }

    // المواد
    h += '<div class="sd-card"><h4>📊 تقدّمك في كل مادة</h4>';
    if (!subjects.length) h += '<p class="sd-empty">لا توجد نماذج منشورة لصفك بعد.</p>';
    else {
      h += '<div class="sd-subjects">';
      subjects.forEach(function (s) {
        var w = s.total ? Math.round(s.done / s.total * 100) : 0, L = look(s.name);
        h += '<div class="sd-subj" style="--c:' + L.c + ';--bg:' + L.bg + '"><div class="sd-subj-ic" aria-hidden="true">' + L.ic + '</div><div class="sd-subj-body">' +
          '<div class="sd-subj-name">' + esc(s.name) + '</div>' +
          '<div class="sd-subj-meta"><span>' + s.done + '/' + s.total + ' نماذج</span>' + (s.avg === null ? '<span>ابدأ الآن ✨</span>' : '<span class="sd-stars">' + stars(s.avg) + '</span><b>' + s.avg + '%</b>') + '</div>' +
          '<div class="sd-bar"><i data-w="' + w + '"></i></div></div></div>';
      });
      h += '</div>';
    }
    h += '</div>';

    // الأوسمة + التطور
    var badges = [
      ['🌟', 'أول خطوة', 'حلّ أول نموذج', results.length >= 1],
      ['🔥', 'متدرّب نشيط', '5 محاولات', results.length >= 5],
      ['🧭', 'مستكشف', 'جرّب 3 مواد', tried >= 3],
      ['💯', 'العلامة الكاملة', 'علامة 100%', perfect],
      ['👑', 'نجم المادة', 'معدّل 90% بمادة', starSubject],
      ['🏆', 'بطل الإنجاز', 'أنهِ كل نماذج مادة', completedSubject]
    ];
    h += '<div class="sd-cols"><div class="sd-card"><h4>🏅 أوسمتي</h4><div class="sd-badges">';
    badges.forEach(function (b) {
      h += '<div class="sd-badge' + (b[3] ? ' new' : ' locked') + '" title="' + esc(b[2]) + '"><span class="sd-bi">' + b[0] + '</span><b>' + b[1] + '</b><small>' + (b[3] ? 'حصلت عليه!' : '🔒 ' + b[2]) + '</small></div>';
    });
    h += '</div></div>';

    h += '<div class="sd-card"><h4>📈 تطوّر علاماتك' + (improved ? ' <span style="font-size:13px;color:#0c8a4f">↑ تحسّنت!</span>' : '') + '</h4>' + sparkline(spark);
    if (recent.length) {
      h += '<ul class="sd-recent">';
      recent.forEach(function (r) {
        var p = pct(r.score, r.total), l = level(p), L = look(r.subject);
        h += '<li style="--c:' + L.c + '"><span class="sd-dotc"></span><div class="sd-rt"><strong>' + L.ic + ' ' + esc(r.subject) + '</strong><span>' + esc(r.exam || '') + ' · ' + esc(fmtDate(when(r))) + '</span></div>' +
          '<span class="sd-score ' + l.c + '">' + esc(r.score) + '/' + esc(r.total) + '</span></li>';
      });
      h += '</ul>';
    }
    h += '</div></div>';
    return h;
  }
  function kpi(ic, v, label, cls, small) {
    return '<div class="sd-kpi ' + cls + '"><span class="sd-ic" aria-hidden="true">' + ic + '</span><strong' + (small ? ' class="sd-kpi-txt"' : '') + '>' + esc(v) + '</strong><span>' + label + '</span></div>';
  }
  function animateBars(box) {
    requestAnimationFrame(function () { requestAnimationFrame(function () {
      Array.prototype.forEach.call(box.querySelectorAll('.sd-bar i[data-w]'), function (i) { i.style.width = i.getAttribute('data-w') + '%'; });
    }); });
  }

  function container() {
    var box = document.getElementById('myProgress');
    if (box) return box;
    var dash = document.getElementById('dashboard');
    if (!dash) return null;
    box = document.createElement('section');
    box.id = 'myProgress';
    box.className = 'student-dashboard';
    box.setAttribute('aria-label', 'لوحتي: معلوماتي ونتائجي وتقدّمي');
    var anchor = document.getElementById('studentResults') || dash.querySelector('.subject-chips');
    if (anchor) anchor.parentNode.insertBefore(box, anchor); else dash.appendChild(box);
    box.addEventListener('click', function (e) {
      var b = e.target.closest('.sd-go');
      if (!b) return;
      var subj = b.getAttribute('data-subject');
      var chip = Array.prototype.filter.call(document.querySelectorAll('#subjectChips button'), function (x) {
        return x.textContent.trim() === subj;
      })[0];
      if (chip) chip.click();
      var grid = document.getElementById('examGrid');
      if (grid) grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    return box;
  }

  var busy = false;
  async function refresh() {
    if (busy) return;
    var dash = document.getElementById('dashboard');
    if (!dash || dash.hidden) return;
    var profile = getProfile();
    if (!profile.grade) return;
    busy = true;
    var box = container();
    try {
      var q = String.fromCharCode(63) + 'grade=' + encodeURIComponent(profile.grade);
      var res = await Promise.all([
        fetch('/api/catalog' + q, { cache: 'no-store', headers: headers }),
        fetch('/api/results', { cache: 'no-store', headers: headers })
      ]);
      if (!res[0].ok) throw new Error('catalog');
      var cat = await res[0].json();
      var rs = res[1].ok ? await res[1].json() : { results: [] };
      var exams = cat.exams || [];
      var gradeSubjects = {};
      exams.forEach(function (e) { gradeSubjects[e.subject] = 1; });
      // نعرض نتائج مواد الصف الحالي فقط
      var results = (rs.results || []).filter(function (r) { return !exams.length || gradeSubjects[r.subject]; });
      box.innerHTML = build(profile, exams, results);
      animateBars(box);
      box.hidden = false;
      var old = document.getElementById('studentResults');
      if (old) old.classList.add('sd-hide-old');
    } catch (e) {
      if (box) box.hidden = true;
    } finally { busy = false; }
  }

  // نعيد الرسم كلما ظهرت لوحة المواد (بعد الدخول أو بعد إنهاء امتحان)
  function watch() {
    var dash = document.getElementById('dashboard');
    if (!dash) return;
    var last = dash.hidden;
    new MutationObserver(function () {
      if (last && !dash.hidden) refresh();
      last = dash.hidden;
    }).observe(dash, { attributes: true, attributeFilter: ['hidden'] });
    if (!dash.hidden) refresh();
  }
  if (typeof window.loadServerExams === 'function') {
    var orig = window.loadServerExams;
    window.loadServerExams = async function () { var r = await orig.apply(this, arguments); refresh(); return r; };
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', watch); else watch();
  window.refreshStudentDashboard = refresh;
})();
