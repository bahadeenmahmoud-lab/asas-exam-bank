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

  function sparkline(points) {
    if (points.length < 2) return '<p class="sd-empty">حلّ نموذجين أو أكثر ليظهر خط تقدّمك هنا.</p>';
    var w = 320, h = 110, pad = 14;
    var step = (w - pad * 2) / (points.length - 1);
    var xy = points.map(function (p, i) {
      return [pad + i * step, h - pad - (p.v / 100) * (h - pad * 2)];
    });
    var line = xy.map(function (q) { return q[0].toFixed(1) + ',' + q[1].toFixed(1); }).join(' ');
    var area = pad + ',' + (h - pad) + ' ' + line + ' ' + xy[xy.length - 1][0].toFixed(1) + ',' + (h - pad);
    var dots = xy.map(function (q, i) {
      return '<circle cx="' + q[0].toFixed(1) + '" cy="' + q[1].toFixed(1) + '" r="3.5"><title>' +
        esc(points[i].label) + ': ' + points[i].v + '%</title></circle>';
    }).join('');
    // خط الهدف 75%
    var gy = (h - pad - 0.75 * (h - pad * 2)).toFixed(1);
    return '<svg class="sd-spark" viewBox="0 0 ' + w + ' ' + h + '" role="img" aria-label="تطور علاماتك في آخر النماذج">' +
      '<line class="sd-goal" x1="' + pad + '" x2="' + (w - pad) + '" y1="' + gy + '" y2="' + gy + '"/>' +
      '<polygon class="sd-area" points="' + area + '"/>' +
      '<polyline class="sd-line" points="' + line + '"/>' + dots + '</svg>' +
      '<div class="sd-spark-legend"><span>الأقدم</span><span class="sd-goal-key">الخط المتقطع: هدف 75%</span><span>الأحدث</span></div>';
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
      var next = s.exams.filter(function (e) { return !(e.title in s.best); })
        .sort(function (a, b) { return (a.model || 0) - (b.model || 0); })[0] || null;
      return { name: s.name, done: done, total: total, avg: avg, next: next, attempts: s.attempts.length };
    }).sort(function (a, b) { return a.name.localeCompare(b.name, 'ar'); });

    var sorted = results.slice().sort(function (a, b) { return new Date(when(a)) - new Date(when(b)); });
    var allPct = sorted.map(function (r) { return pct(r.score, r.total); });
    var avgAll = allPct.length ? Math.round(allPct.reduce(function (a, b) { return a + b; }, 0) / allPct.length) : null;
    var doneTotal = subjects.reduce(function (a, s) { return a + s.done; }, 0);
    var examTotal = subjects.reduce(function (a, s) { return a + s.total; }, 0);
    var coverage = examTotal ? Math.round(doneTotal / examTotal * 100) : 0;
    var rated = subjects.filter(function (s) { return s.avg !== null; });
    var best = rated.slice().sort(function (a, b) { return b.avg - a.avg; })[0];
    var weak = rated.slice().sort(function (a, b) { return a.avg - b.avg; })[0];

    // اقتراح النموذج التالي: من أضعف مادة أولًا، ثم أي مادة لم تبدأها
    var suggestion = null;
    if (weak && weak.next && weak.avg < 75) suggestion = { s: weak, why: 'لتقوية علامتك في ' + weak.name };
    if (!suggestion) {
      var untouched = subjects.filter(function (s) { return s.done === 0 && s.next; })[0];
      if (untouched) suggestion = { s: untouched, why: 'مادة لم تبدأ التدريب عليها بعد' };
    }
    if (!suggestion) {
      var any = subjects.filter(function (s) { return s.next; })[0];
      if (any) suggestion = { s: any, why: 'تابع إكمال نماذج ' + any.name };
    }

    var spark = sorted.slice(-10).map(function (r) {
      return { v: pct(r.score, r.total), label: (r.subject || '') + ' — ' + fmtDate(when(r)) };
    });
    var recent = sorted.slice(-5).reverse();
    var lv = avgAll === null ? null : level(avgAll);

    var h = '';
    h += '<div class="sd-head">';
    h += '<div class="sd-avatar" aria-hidden="true">' + esc((profile.full_name || profile.name || '؟').trim().charAt(0)) + '</div>';
    h += '<div class="sd-id"><h3>' + esc(profile.full_name || profile.name || 'الطالب') + '</h3><p>' + esc(gradeName(profile.grade)) +
      (profile.track ? ' — ' + esc(profile.track) : '') +
      (profile.phone ? ' <span class="sd-dot">•</span> <span dir="ltr">' + esc(maskPhone(profile.phone)) + '</span>' : '') + '</p></div>';
    if (lv) h += '<span class="sd-badge ' + lv.c + '">' + lv.t + '</span>';
    h += '</div>';

    h += '<div class="sd-kpis">';
    h += kpi(results.length, 'محاولة');
    h += kpi(avgAll === null ? '—' : avgAll + '%', 'معدّلك العام');
    h += kpi(doneTotal + '/' + examTotal, 'نموذج أنجزته');
    h += kpi(best ? best.name : '—', 'أقوى مادة', true);
    h += '</div>';

    h += '<div class="sd-cover"><div class="sd-cover-top"><span>إنجازك من نماذج صفك</span><strong>' + coverage + '%</strong></div>' +
      '<div class="sd-bar"><i style="width:' + coverage + '%"></i></div></div>';

    if (suggestion) {
      h += '<div class="sd-next"><div><small>النموذج المقترح التالي</small><strong>' + esc(suggestion.s.next.title) + '</strong>' +
        '<span>' + esc(suggestion.why) + '</span></div>' +
        '<button type="button" class="sd-go" data-subject="' + esc(suggestion.s.name) + '">ابدأ ←</button></div>';
    }

    h += '<div class="sd-cols">';
    h += '<div class="sd-card"><h4>تقدّمك في كل مادة</h4>';
    if (!subjects.length) h += '<p class="sd-empty">لا توجد نماذج منشورة لصفك بعد.</p>';
    subjects.forEach(function (s) {
      var w = s.total ? Math.round(s.done / s.total * 100) : 0;
      var l = s.avg === null ? null : level(s.avg);
      h += '<div class="sd-subj"><div class="sd-subj-top"><span>' + esc(s.name) + '</span>' +
        '<span class="sd-subj-meta">' + s.done + '/' + s.total + ' نماذج' +
        (s.avg === null ? '' : ' · <b class="' + l.c + '">' + s.avg + '%</b>') + '</span></div>' +
        '<div class="sd-bar sd-bar-sm"><i style="width:' + w + '%"></i></div></div>';
    });
    h += '</div>';

    h += '<div class="sd-card"><h4>تطوّر علاماتك</h4>' + sparkline(spark);
    h += '<h4 class="sd-mt">آخر المحاولات</h4>';
    if (!recent.length) h += '<p class="sd-empty">ما حلّيت أي نموذج بعد. اختار مادة من تحت وابدأ!</p>';
    else {
      h += '<ul class="sd-recent">';
      recent.forEach(function (r) {
        var p = pct(r.score, r.total), l = level(p);
        h += '<li><div><strong>' + esc(r.subject) + '</strong><span>' + esc(r.exam || '') + '</span></div>' +
          '<div class="sd-recent-score"><b class="' + l.c + '">' + esc(r.score) + '/' + esc(r.total) + '</b><small>' + esc(fmtDate(when(r))) + '</small></div></li>';
      });
      h += '</ul>';
    }
    h += '</div></div>';

    if (weak && best && weak !== best && weak.avg < 75) {
      h += '<p class="sd-tip">💡 علامتك في <b>' + esc(weak.name) + '</b> (' + weak.avg + '%) أقل من باقي المواد. أعد حل نماذجها وراجع تفسير الإجابات بعد كل محاولة.</p>';
    }
    return h;
  }
  function kpi(v, label, small) {
    return '<div class="sd-kpi"><strong' + (small ? ' class="sd-kpi-txt"' : '') + '>' + esc(v) + '</strong><span>' + label + '</span></div>';
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
