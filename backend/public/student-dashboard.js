(()=>{
 const byId=id=>document.getElementById(id);
 const fmtDate=value=>{const date=new Date(value);return Number.isNaN(date.getTime())?'—':date.toLocaleDateString('ar-JO',{year:'numeric',month:'short',day:'numeric'})};
 const normalise=rows=>Array.isArray(rows)?rows:Object.values(rows||{}).filter(x=>x&&Number.isFinite(Number(x.score)));
 window.ASASStudentDashboard={render(profile,serverRows,localRows){
  if(!byId('studentHub'))return;
  const rows=[...normalise(serverRows),...normalise(localRows)].sort((a,b)=>new Date(b.completed_at||b.date||0)-new Date(a.completed_at||a.date||0));
  const total=rows.reduce((n,r)=>n+Number(r.total||0),0),score=rows.reduce((n,r)=>n+Number(r.score||0),0),pct=total?Math.round(score/total*100):0;
  const best=rows.reduce((m,r)=>Math.max(m,Number(r.total)?Math.round(Number(r.score)/Number(r.total)*100):0),0);
  const grade=Number(profile?.grade)>=11?'التوجيهي':`الصف ${profile?.grade||'—'}`;
  const cohort=profile?.cohort?`جيل ${profile.cohort}`:(profile?.track||'');
  byId('studentCardName').textContent=profile?.name||'الطالب';byId('studentCardGrade').textContent=[grade,cohort].filter(Boolean).join(' • ');
  byId('studentCardPhone').textContent=profile?.phone?`${profile.phone.slice(0,4)} •••• ${profile.phone.slice(-4)}`:'رقم الهاتف المسجّل';
  byId('studentAttemptsCount').textContent=String(rows.length);byId('studentAverage').textContent=`${pct}%`;byId('studentBest').textContent=`${best}%`;byId('studentQuestionsTotal').textContent=String(total);
  byId('studentProgressLabel').textContent=rows.length?`متوسط إنجازك في النماذج: ${pct}%`:'ابدأ أول نموذج ليظهر تقدّمك هنا.';
  const subjects={};for(const r of rows){const name=r.subject||'مادة';(subjects[name]||= {score:0,total:0,count:0});subjects[name].score+=Number(r.score||0);subjects[name].total+=Number(r.total||0);subjects[name].count++;}
  const progress=byId('studentSubjectProgress');progress.replaceChildren();
  for(const [name,v] of Object.entries(subjects)){const percent=v.total?Math.round(v.score/v.total*100):0;const item=document.createElement('div');item.className='student-subject-progress';item.innerHTML=`<div><b></b><span></span></div><i><em></em></i>`;item.querySelector('b').textContent=name;item.querySelector('span').textContent=`${percent}% • ${v.count} نموذج`;item.querySelector('em').style.width=`${percent}%`;progress.append(item)}
  if(!Object.keys(subjects).length)progress.innerHTML='<p class="student-empty">ستظهر متابعة المواد بعد حل أول نموذج.</p>';
  const history=byId('studentAttemptHistory');history.replaceChildren();
  for(const r of rows.slice(0,12)){const item=document.createElement('article');item.className='student-history-item';const title=document.createElement('strong');title.textContent=`${r.subject||'مادة'} — ${r.exam||r.title||'نموذج تدريبي'}`;const meta=document.createElement('span');meta.textContent=`النتيجة ${r.score}/${r.total} • ${Number(r.total)?Math.round(Number(r.score)/Number(r.total)*100):0}% • ${fmtDate(r.completed_at||r.date)}`;const detail=document.createElement('small');detail.textContent=[r.semester,r.unit,r.lesson].filter(Boolean).join(' • ');item.append(title,meta,detail);history.append(item)}
  if(!rows.length)history.innerHTML='<p class="student-empty">ما في محاولات سابقة. حلّ نموذجك الأول لتبدأ متابعة إنجازك.</p>';
  const mistakes=byId('studentMistakeReview');mistakes.replaceChildren();let errors=rows.flatMap(r=>(r.mistakes||[]).map(m=>({...m,subject:r.subject||'مادة',exam:r.exam||r.title||'نموذج'}))).slice(0,30);
  for(const m of errors){const item=document.createElement('article');item.className='student-mistake-item';const q=document.createElement('strong');q.textContent=m.question||m.prompt||'سؤال يحتاج مراجعة';const context=document.createElement('small');context.textContent=`${m.subject} • ${m.exam}`;const correction=document.createElement('p');correction.textContent=`إجابتك: ${m.selectedText||m.selected||'—'} | الصحيحة: ${m.correctText||m.correct||'—'}`;item.append(q,context,correction);if(m.explanation){const exp=document.createElement('span');exp.textContent=m.explanation;item.append(exp)}mistakes.append(item)}
  if(!errors.length)mistakes.innerHTML='<p class="student-empty">لا توجد أخطاء مسجلة بعد. ستجد هنا الأسئلة التي تحتاج مراجعة بعد حل النماذج.</p>';
 }};
})();
