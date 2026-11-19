const appConfig = window.ASAS_CONFIG || { slug: 'asas', grades: Array.from({length:12}, (_, i) => ({value:String(i+1), label:'الصف '+(i+1)})) };
const grades = appConfig.grades;
const profileStorageKey = `asas-exam-profile-${appConfig.slug}`;
const resultsStorageKey = `asas-exam-results-${appConfig.slug}`;
function studentResultsStorageKey(profile){
 const p=profile||{};const identity=String(p.id||p.phone||p.name||'guest');const basis=`${identity}|${p.grade||''}|${p.cohort||''}`;
 let hash=2166136261;for(let i=0;i<basis.length;i++){hash^=basis.charCodeAt(i);hash=Math.imul(hash,16777619)}
 return `${resultsStorageKey}-${(hash>>>0).toString(36)}`;
}
const apiHeaders = {'content-type':'application/json','x-teacher-slug':appConfig.slug};
if (appConfig.theme) document.body.dataset.theme = appConfig.theme;
if (appConfig.teacherName) {
  document.title = `بنك أسئلة ${appConfig.teacherName} | منصة أساس`;
  const banner = document.getElementById('teacherBanner');
  if (banner) {
    banner.hidden = false;
    banner.querySelector('img').src = appConfig.photo;
    banner.querySelector('img').alt = appConfig.teacherName;
    banner.querySelector('[data-teacher-name]').textContent = appConfig.teacherName;
    banner.querySelector('[data-subject]').textContent = appConfig.subject;
    banner.querySelector('[data-grades]').textContent = appConfig.gradeCaption;
    banner.querySelector('[data-bio]').textContent = appConfig.bio;
    document.querySelector('.hero-trust').innerHTML = `<span>✓</span> المادة ${appConfig.subject} <b>•</b> ${appConfig.gradeCaption} <b>•</b> منصة أساس التعليمية`;
  }
}
const subjectMap = {
  '1':['اللغة العربية','اللغة الإنجليزية','الرياضيات','التربية الإسلامية','العلوم'],
  '2':['اللغة العربية','اللغة الإنجليزية','الرياضيات','التربية الإسلامية','العلوم'],
  '3':['اللغة العربية','اللغة الإنجليزية','الرياضيات','التربية الإسلامية','العلوم','الدراسات الاجتماعية'],
  '4':['اللغة العربية','اللغة الإنجليزية','الرياضيات','التربية الإسلامية','العلوم','الدراسات الاجتماعية'],
  '5':['اللغة العربية','اللغة الإنجليزية','الرياضيات','التربية الإسلامية','العلوم','الدراسات الاجتماعية'],
  '6':['اللغة العربية','اللغة الإنجليزية','الرياضيات','التربية الإسلامية','العلوم','الدراسات الاجتماعية'],
  '7':['اللغة العربية','اللغة الإنجليزية','الرياضيات','التربية الإسلامية','العلوم','الدراسات الاجتماعية','المهارات الرقمية'],
  '8':['اللغة العربية','اللغة الإنجليزية','الرياضيات','التربية الإسلامية','العلوم','الدراسات الاجتماعية','المهارات الرقمية'],
  '9':['اللغة العربية','اللغة الإنجليزية','الرياضيات','التربية الإسلامية','الفيزياء','الكيمياء','الأحياء','تاريخ الأردن'],
  '10':['اللغة العربية','اللغة الإنجليزية','الرياضيات','التربية الإسلامية','الفيزياء','الكيمياء','الأحياء','تاريخ الأردن'],
  '11':['اللغة العربية','اللغة الإنجليزية','الرياضيات','التربية الإسلامية','الفيزياء','الكيمياء','الأحياء','علوم الأرض','تاريخ الأردن'],
  '12':['اللغة العربية','اللغة الإنجليزية','الرياضيات','التربية الإسلامية','الفيزياء','الكيمياء','الأحياء','علوم الأرض','تاريخ الأردن']
};
const questionSets = [
 {subject:'الرياضيات',title:'تدريب سريع في الرياضيات',type:'practice',description:'راجع مهاراتك الأساسية بأسئلة قصيرة.',questions:[
  {text:'ما ناتج ٣ × ٤؟',answers:['٧','١٢','١٦','١٠'],correct:1,explain:'٣ × ٤ = ١٢.'},
  {text:'إذا كان معك ١٥ ديناراً واشتريت كتاباً بـ ٦ دنانير، كم يتبقى؟',answers:['٩ دنانير','٨ دنانير','١٠ دنانير','٧ دنانير'],correct:0,explain:'١٥ − ٦ = ٩.'},
  {text:'أي كسر يساوي النصف؟',answers:['١⁄٣','٢⁄٣','٢⁄٤','٣⁄٤'],correct:2,explain:'٢⁄٤ تبسّط إلى ١⁄٢.'},
  {text:'ما محيط مربع طول ضلعه ٥ سم؟',answers:['١٠ سم','٢٠ سم','٢٥ سم','١٥ سم'],correct:1,explain:'محيط المربع = ٤ × طول الضلع.'},
  {text:'ما العدد الزوجي؟',answers:['١٣','١٧','٢٢','٢٥'],correct:2,explain:'العدد الزوجي يقبل القسمة على ٢ دون باقٍ.'}]},
 {subject:'اللغة العربية',title:'تدريب في اللغة العربية',type:'practice',description:'تدريب لغوي قصير على المفردات.',questions:[
  {text:'ما جمع كلمة «كتاب»؟',answers:['كتّاب','مكتبة','كتب','كاتبون'],correct:2,explain:'جمع كتاب هو كتب.'},
  {text:'أي الكلمات الآتية فعل؟',answers:['مدرسة','يكتب','قلم','واسع'],correct:1,explain:'يكتب فعل مضارع.'},
  {text:'ما ضد كلمة «قريب»؟',answers:['سريع','بعيد','جميل','قصير'],correct:1,explain:'ضد قريب هو بعيد.'},
  {text:'أي جملة تنتهي بعلامة استفهام؟',answers:['ما أجمل الربيع','أين كتابك؟','عاد الطالب إلى البيت','الصدق فضيلة'],correct:1,explain:'الجملة التي تسأل تنتهي بعلامة استفهام.'},
  {text:'ما نوع كلمة «المدرسة»؟',answers:['اسم','فعل','حرف','صفة'],correct:0,explain:'المدرسة اسم.'}]},
 {subject:'العلوم',title:'تدريب في العلوم',type:'practice',description:'أسئلة عامة للتدريب على المفاهيم العلمية.',questions:[
  {text:'ما الجزء الذي يمتص الماء من التربة في النبات؟',answers:['الورقة','الجذر','الزهرة','الثمرة'],correct:1,explain:'تمتص الجذور الماء والأملاح من التربة.'},
  {text:'أيّ مما يلي مصدر طبيعي للضوء؟',answers:['القمر','الشمس','المرآة','المصباح'],correct:1,explain:'الشمس مصدر طبيعي للضوء.'},
  {text:'في أي حالة تكون المياه على شكل بخار؟',answers:['الصلبة','السائلة','الغازية','المتجمدة'],correct:2,explain:'بخار الماء هو الحالة الغازية للماء.'},
  {text:'ما العضو الذي يضخ الدم إلى أنحاء الجسم؟',answers:['الرئة','القلب','المعدة','الدماغ'],correct:1,explain:'القلب يضخ الدم إلى أنحاء الجسم.'},
  {text:'أيّ الكائنات التالية يصنع غذاءه بنفسه غالباً؟',answers:['النبات الأخضر','السمكة','القط','العصفور'],correct:0,explain:'تصنع النباتات غذاءها باستخدام ضوء الشمس.'}]},
 {subject:'اللغة الإنجليزية',title:'تدريب باللغة الإنجليزية',type:'practice',description:'مفردات وقواعد أساسية.',questions:[
  {text:'Choose the correct plural of “book”.',answers:['bookes','books','bookies','book'],correct:1,explain:'The regular plural of book is books.'},
  {text:'Complete: She ___ to school every day.',answers:['go','goes','going','gone'],correct:1,explain:'With she/he/it in the present simple, add -s.'},
  {text:'What is the opposite of “hot”?',answers:['warm','cold','fast','new'],correct:1,explain:'The opposite of hot is cold.'},
  {text:'Choose the correct article: ___ apple.',answers:['A','An','The a','No article'],correct:1,explain:'Use “an” before a vowel sound.'},
  {text:'Which word is a color?',answers:['table','blue','run','school'],correct:1,explain:'Blue is a color.'}]},
 {subject:'التربية الإسلامية',title:'تدريب في التربية الإسلامية',type:'practice',description:'أسئلة مراجعة عامة.',questions:[
  {text:'كم عدد أركان الإسلام؟',answers:['ثلاثة','أربعة','خمسة','ستة'],correct:2,explain:'أركان الإسلام خمسة.'},
  {text:'ما الكتاب الذي أُنزل على النبي محمد ﷺ؟',answers:['التوراة','الإنجيل','الزبور','القرآن الكريم'],correct:3,explain:'القرآن الكريم أُنزل على النبي محمد ﷺ.'},
  {text:'أيّ مما يلي من آداب الحوار؟',answers:['مقاطعة الآخرين','الإنصات باحترام','رفع الصوت','السخرية'],correct:1,explain:'الإنصات واحترام الآخر من آداب الحوار.'},
  {text:'ما أول شهر في التقويم الهجري؟',answers:['رمضان','محرم','شوال','رجب'],correct:1,explain:'محرم هو أول شهور التقويم الهجري.'},
  {text:'ما اسم الصلاة التي تؤدى عند طلوع الفجر؟',answers:['الظهر','العصر','الفجر','العشاء'],correct:2,explain:'صلاة الفجر تؤدى بعد طلوع الفجر وقبل الشروق.'}]}
 ,{subject:'الأحياء',cohort:'2008',semester:'الفصل الأول',unit:'الوحدة الأولى: التكاثر',lesson:'الانقسام المنصف',title:'تدريب تجريبي — توجيهي 2008',type:'practice',description:'الفصل الأول • الوحدة الأولى: التكاثر • درس الانقسام المنصف',questions:[
  {text:'ما النتيجة الأساسية للانقسام المنصف في الخلايا التناسلية؟',answers:['خليتان متماثلتان ثنائيتا المجموعة الكروموسومية','أربع خلايا أحادية المجموعة الكروموسومية','خلية واحدة رباعية المجموعة الكروموسومية','خليتان أحاديتان متماثلتان'],correct:1,explain:'ينتج الانقسام المنصف أربع خلايا أحادية المجموعة الكروموسومية.'},
  {text:'في أي مرحلة يحدث العبور الوراثي غالباً؟',answers:['الطور التمهيدي الأول','الطور الاستوائي الثاني','الطور الانفصالي الثاني','الطور النهائي الأول'],correct:0,explain:'يحدث العبور الوراثي خلال الطور التمهيدي الأول من الانقسام المنصف.'},
  {text:'إذا كان العدد الكروموسومي في خلية جسمية 2n=14، فما عدد الكروموسومات في المشيج؟',answers:['14','28','7','21'],correct:2,explain:'يحتوي المشيج على نصف العدد الكروموسومي؛ أي 7 كروموسومات.'}]}
 ,{subject:'الأحياء',cohort:'2009',semester:'الفصل الثاني',unit:'الوحدة الثانية: الوراثة',lesson:'الوراثة المندلية',title:'تدريب تجريبي — توجيهي 2009',type:'practice',description:'الفصل الثاني • الوحدة الثانية: الوراثة • درس الوراثة المندلية',questions:[
  {text:'عند تهجين فردين غير متماثلي اللاقحة لصفة سائدة، ما النسبة الشكلية المتوقعة في النسل؟',answers:['1:1','3:1','1:2:1','9:3:3:1'],correct:1,explain:'في تهجين Aa × Aa تكون النسبة الشكلية 3 سائد : 1 متنحٍ.'},
  {text:'ما المقصود بالأليل المتنحي؟',answers:['أليل يظهر أثره بوجود نسخة واحدة','أليل لا يظهر أثره إلا عند غياب الأليل السائد','صفة مكتسبة من البيئة','كروموسوم جنسي'],correct:1,explain:'يظهر أثر الأليل المتنحي عندما يكون الفرد متماثل اللاقحة له.'},
  {text:'إذا كان تركيب الفرد Aa، فماذا يسمى بالنسبة لهذه الصفة؟',answers:['متماثل اللاقحة سائد','متماثل اللاقحة متنحٍ','غير متماثل اللاقحة','عديم الأليل'],correct:2,explain:'يحمل الفرد Aa أليلين مختلفين، لذلك يسمى غير متماثل اللاقحة.'}]}

];
const el = (id)=>document.getElementById(id);
const registerForm=el('registerForm'),verifyForm=el('verifyForm'),gradeSelect=el('gradeSelect'),trackField=el('trackField'),trackSelect=el('trackSelect');
let backendReady=false,serverExams=[],serverResults=[],answerSelections=[],currentMistakes=[];
function renderStudentHub(profile){const current=profile||{};const stored=JSON.parse(localStorage.getItem(studentResultsStorageKey(current))||'[]');window.ASASStudentDashboard?.render(current,serverResults,stored);}
const backendProbe=fetch('/api/health',{cache:'no-store',headers:apiHeaders}).then(r=>r.ok).catch(()=>false);
backendProbe.then(ready=>{backendReady=ready;if(ready&&localStorage.getItem(profileStorageKey))loadServerExams()});
grades.forEach(g=>{const o=document.createElement('option');o.value=g.value;o.textContent=g.label;gradeSelect.append(o)});if(appConfig.slug==='mohammad-bataineh'&&grades.length===1){gradeSelect.value=grades[0].value;gradeSelect.closest('.field').hidden=true;gradeSelect.closest('.field').style.display='none'}
function updateTrackField(){if(!trackField||!trackSelect)return;const enabled=['10','11','12'].includes(gradeSelect.value)&&appConfig.requireTrack!==false;trackField.hidden=!enabled;trackField.style.display=enabled?'':'none';trackSelect.required=enabled;if(!enabled)trackSelect.value=''}
gradeSelect.addEventListener('change',updateTrackField);
updateTrackField();
el('startBtn').addEventListener('click',()=>el('registration').scrollIntoView({behavior:'smooth'}));
function setError(id,msg){const node=el(id);node.textContent=msg;node.hidden=false}function clearError(id){el(id).hidden=true}
registerForm.addEventListener('submit',async(e)=>{e.preventDefault();clearError('formError');if(!registerForm.reportValidity())return;backendReady=await backendProbe;const fd=new FormData(registerForm);const profile={name:fd.get('name').trim(),phone:'+962'+fd.get('phone'),grade:fd.get('grade'),cohort:fd.get('cohort')||'',track:appConfig.trackValue||fd.get('track')||''};if(backendReady){try{const r=await fetch('/api/auth/request-code',{method:'POST',headers:apiHeaders,body:JSON.stringify(profile)});const result=await r.json();if(!r.ok)throw new Error(result.error||'تعذر تجهيز رمز الدخول التجريبي.');el('demoOtpNote').innerHTML='<span>ⓘ</span> رمز الدخول التجريبي: <strong>1223456</strong>';el('demoOtpNote').hidden=false}catch(error){setError('formError',error.message);return}}else{setError('formError','تعذّر الاتصال بالخادم. حاول مرة أخرى لاحقاً.');return}sessionStorage.setItem('asas-pending-profile',JSON.stringify(profile));if(el('phonePreview'))el('phonePreview').textContent=profile.phone;registerForm.hidden=true;verifyForm.hidden=false;el('stepOne').classList.remove('active');el('stepTwo').classList.add('active');verifyForm.elements.otp.focus()});
el('backBtn').addEventListener('click',()=>{verifyForm.hidden=true;registerForm.hidden=false;el('stepTwo').classList.remove('active');el('stepOne').classList.add('active')});
verifyForm.addEventListener('submit',async(e)=>{e.preventDefault();clearError('verifyError');const p=JSON.parse(sessionStorage.getItem('asas-pending-profile')||'{}');if(!p.name){setError('verifyError','انتهت الجلسة. ارجع وأدخل بياناتك من جديد.');return}if(backendReady){try{const r=await fetch('/api/auth/verify-code',{method:'POST',headers:apiHeaders,body:JSON.stringify({...p,code:verifyForm.elements.otp.value})});const result=await r.json();if(!r.ok)throw new Error(result.error||'رمز التحقق غير صحيح.');localStorage.setItem(profileStorageKey,JSON.stringify({...p,...result.student}));sessionStorage.removeItem('asas-pending-profile');showDashboard({...p,...result.student});return}catch(error){setError('verifyError',error.message);return}}setError('verifyError','تعذّر التحقق من الرمز. حاول مرة أخرى.');});
function showDashboard(p){el('hero').hidden=true;el('how').hidden=true;el('registration').hidden=true;el('dashboard').hidden=false;el('questionView').hidden=true;el('profileBtn').hidden=false;el('profileName').textContent=p.name;el('welcomeText').textContent=`أهلاً ${p.name}، هاي نماذج الأحياء لـ ${p.cohort?'توجيهي '+p.cohort:gradeLabel(p.grade)}${p.track?' — '+p.track:''}.`;serverResults=[];renderStudentHub(p);const subjects=appConfig.subject?[appConfig.subject]:(subjectMap[p.grade]||[]);const sel=el('subjectSelect');sel.innerHTML='<option value="">كل المواد</option>';subjects.forEach(s=>{const o=document.createElement('option');o.value=s;o.textContent=s;sel.append(o)});if(backendReady)loadServerExams();else{refreshStudyFilters();renderExams()}window.scrollTo({top:0,behavior:'smooth'})}
async function loadServerExams(){try{const p=JSON.parse(localStorage.getItem(profileStorageKey)||'{}');const [r,rr]=await Promise.all([fetch(`/api/catalog?grade=${encodeURIComponent(p.grade)}`,{cache:'no-store',headers:apiHeaders}),fetch('/api/results',{cache:'no-store',headers:apiHeaders})]);if(!r.ok)throw new Error();const data=await r.json(),resultData=rr.ok?await rr.json():{results:[]};serverExams=data.exams||[];serverResults=resultData.results||[];const results=serverResults,summary=el('studentResults');summary.hidden=!results.length;if(results.length)el('studentResultsText').textContent=`أنهيت ${results.length} نموذجاً. آخر نتيجة: ${results[0].score}/${results[0].total} في ${results[0].subject}.`;renderStudentHub(p);const sel=el('subjectSelect');sel.innerHTML='<option value="">كل المواد</option>';[...new Set(serverExams.map(x=>x.subject))].forEach(s=>{const o=document.createElement('option');o.value=s;o.textContent=s;sel.append(o)});refreshStudyFilters();renderExams()}catch{backendReady=false;refreshStudyFilters();renderExams()}}
function gradeLabel(g){return g==='11'?'الأول الثانوي':g==='12'?'التوجيهي':'الصف '+g}
function renderExams(){
 const p=JSON.parse(localStorage.getItem(profileStorageKey)||'{}');
 const selected=el('subjectSelect')?.value||'';const type=el('typeSelect')?.value||'all';
 const semester=el('semesterSelect')?.value||'';const unit=el('unitSelect')?.value||'';const lesson=el('lessonSelect')?.value||'';
 const grid=el('examGrid');grid.innerHTML='';
 const local=questionSets.filter(q=>(!appConfig.subject||q.subject===appConfig.subject)&&(!q.cohort||q.cohort===p.cohort)&&(!selected||q.subject===selected)&&(type==='all'||q.type===type)&&(!semester||q.semester===semester)&&(!unit||q.unit===unit)&&(!lesson||q.lesson===lesson));
 const remote=backendReady?serverExams.filter(q=>(!selected||q.subject===selected)&&(type==='all'||type==='exam')&&(!semester||q.semester===semester)&&(!unit||q.unit===unit)&&(!lesson||q.lesson===lesson)):[];
 if(!local.length&&!remote.length){grid.innerHTML='<div class="empty-state">لا توجد نماذج مطابقة لهذه الاختيارات حالياً.</div>';return}
 remote.forEach(q=>{const card=document.createElement('article');card.className='exam-card';card.innerHTML=`<div class="exam-card-top"><span class="subject-icon">${q.subject.slice(0,1)}</span><span class="exam-tag">${q.semester}</span></div><h3>${q.title}</h3><p>${q.subject} — ${gradeLabel(q.grade)}${q.unit?` — ${q.unit}`:''}${q.lesson?` — ${q.lesson}`:''}</p><div class="exam-meta"><span>${q.question_count} سؤالاً</span><span>النموذج ${q.model}</span><span>امتحان تفاعلي</span></div><button class="primary-btn">ابدأ الحل</button>`;card.querySelector('button').addEventListener('click',()=>startServerExam(q));grid.append(card)});
 local.forEach(q=>{const card=document.createElement('article');card.className='exam-card';const done=JSON.parse(localStorage.getItem(studentResultsStorageKey(p))||'{}')[p.grade+'|'+p.cohort+'|'+q.subject+'|'+q.title];card.innerHTML=`<div class="exam-card-top"><span class="subject-icon">${q.subject.slice(0,1)}</span><span class="exam-tag">${q.semester} • تدريب تجريبي</span></div><h3>${q.title}</h3><p>${q.description}</p><div class="exam-meta"><span>${q.questions.length} أسئلة</span><span>${q.unit}</span><span>${q.lesson}</span></div><button class="primary-btn">ابدأ الحل <span>←</span></button>`;card.querySelector('button').addEventListener('click',()=>startExam(q));grid.append(card)});
}
function refreshStudyFilters(){
 const p=JSON.parse(localStorage.getItem(profileStorageKey)||'{}');const values=[...questionSets.filter(q=>(!appConfig.subject||q.subject===appConfig.subject)&&(!q.cohort||q.cohort===p.cohort)),...(backendReady?serverExams:[])];
 for(const [id,key,label] of [['unitSelect','unit','كل الوحدات'],['lessonSelect','lesson','كل الدروس']]){const select=el(id);if(!select)continue;const prior=select.value;const filtered=values.filter(q=>(!el('semesterSelect')?.value||q.semester===el('semesterSelect').value)&&(!el('unitSelect')?.value||id==='unitSelect'||q.unit===el('unitSelect').value));const options=[...new Set(filtered.map(q=>q[key]).filter(Boolean))];select.innerHTML=`<option value="">${label}</option>`+options.map(v=>`<option>${v}</option>`).join('');if(options.includes(prior))select.value=prior;}
}
el('subjectSelect')?.addEventListener('change',renderExams);el('typeSelect')?.addEventListener('change',renderExams);for(const id of ['semesterSelect','unitSelect','lessonSelect'])el(id)?.addEventListener('change',()=>{refreshStudyFilters();renderExams()});el('profileBtn').addEventListener('click',()=>el('dashboard').scrollIntoView({behavior:'smooth'}));el('logoutBtn').addEventListener('click',async()=>{if(backendReady)await fetch('/api/auth/logout',{method:'POST',headers:apiHeaders}).catch(()=>{});localStorage.removeItem(profileStorageKey);serverResults=[];renderStudentHub({});el('dashboard').hidden=true;el('hero').hidden=false;el('how').hidden=false;el('registration').hidden=false;el('profileBtn').hidden=true;window.scrollTo({top:0,behavior:'smooth'})});
let activeExam=null,questionIndex=0,selectedAnswer=null,answered=false,score=0;
async function startServerExam(meta){try{const r=await fetch(`/api/exams/${meta.id}`,{cache:'no-store',headers:apiHeaders});const result=await r.json();if(!r.ok)throw new Error(result.error||'تعذر فتح الامتحان.');activeExam={...meta,questions:result.questions,backend:true};answerSelections=[];currentMistakes=[];questionIndex=0;score=0;el('dashboard').hidden=true;el('questionView').hidden=false;showQuestion();window.scrollTo({top:0,behavior:'smooth'})}catch(error){showToast(error.message)}}
function startExam(q){activeExam={...q,backend:false};answerSelections=[];currentMistakes=[];questionIndex=0;score=0;el('dashboard').hidden=true;el('questionView').hidden=false;showQuestion();window.scrollTo({top:0,behavior:'smooth'})}
function showQuestion(){selectedAnswer=null;answered=false;const q=activeExam.questions[questionIndex],choices=q.options||q.answers;el('questionSubject').textContent=activeExam.subject;el('questionCount').textContent=`السؤال ${questionIndex+1} من ${activeExam.questions.length}`;el('questionText').textContent=q.prompt||q.text;el('progressBar').style.width=((questionIndex+1)/activeExam.questions.length*100)+'%';el('feedback').hidden=true;el('nextQuestion').disabled=true;el('nextQuestion').innerHTML=activeExam.backend?'تثبيت الإجابة <span>←</span>':'تحقق من الإجابة <span>←</span>';const box=el('answers');box.innerHTML='';choices.forEach((a,i)=>{const b=document.createElement('button');b.className='answer-option';b.innerHTML=`<i>${String.fromCharCode(65+i)}</i><span>${a}</span>`;b.addEventListener('click',()=>{if(answered)return;selectedAnswer=i;el('nextQuestion').disabled=false;document.querySelectorAll('.answer-option').forEach(x=>x.classList.remove('selected'));b.classList.add('selected')});box.append(b)})}
el('nextQuestion').addEventListener('click',async()=>{if(selectedAnswer===null)return;if(answered){if(questionIndex===activeExam.questions.length-1){await finishExam();return}questionIndex++;showQuestion();return}answered=true;const q=activeExam.questions[questionIndex];if(activeExam.backend){answerSelections.push({questionId:q.id,selectedIndex:selectedAnswer});const f=el('feedback');f.className='answer-feedback good';f.textContent='تم تسجيل إجابتك. نتيجتك تظهر بعد إنهاء النموذج.';f.hidden=false}else{document.querySelectorAll('.answer-option').forEach((b,i)=>{if(i===q.correct)b.classList.add('correct');else if(i===selectedAnswer)b.classList.add('wrong')});const good=selectedAnswer===q.correct;if(good)score++;else currentMistakes.push({question:q.prompt||q.text,selectedText:(q.options||q.answers)[selectedAnswer],correctText:(q.options||q.answers)[q.correct],explanation:q.explanation||q.explain||''});const f=el('feedback');f.className='answer-feedback '+(good?'good':'bad');f.textContent=(good?'إجابة صحيحة! ':'الإجابة الصحيحة: '+q.answers[q.correct]+'. ')+q.explain;f.hidden=false}el('nextQuestion').innerHTML=questionIndex===activeExam.questions.length-1?'عرض النتيجة <span>←</span>':'السؤال التالي <span>←</span>'});
async function finishExam(){const p=JSON.parse(localStorage.getItem(profileStorageKey)||'{}');let finalScore=score,total=activeExam.questions.length;if(activeExam.backend){try{const requestHeaders=typeof apiHeaders!=='undefined'?apiHeaders:{'content-type':'application/json'};const r=await fetch('/api/attempts',{method:'POST',headers:requestHeaders,body:JSON.stringify({examId:activeExam.id,answers:answerSelections})});const result=await r.json();if(!r.ok)throw new Error(result.error||'تعذر حفظ النتيجة.');finalScore=Number(result.result.score);total=Number(result.result.total)}catch(error){showToast(error.message);return}}else{const saved=JSON.parse(localStorage.getItem(studentResultsStorageKey(p))||'[]');const records=Array.isArray(saved)?saved:Object.values(saved).filter(x=>x&&Number.isFinite(Number(x.score)));records.unshift({subject:activeExam.subject,exam:activeExam.title||activeExam.name||'نموذج تدريبي',semester:activeExam.semester||'',unit:activeExam.unit||'',lesson:activeExam.lesson||'',score,total,date:new Date().toISOString(),mistakes:currentMistakes});localStorage.setItem(studentResultsStorageKey(p),JSON.stringify(records))}el('questionView').hidden=true;el('dashboard').hidden=false;if(backendReady)await loadServerExams();else{serverResults=[];renderStudentHub(p);renderExams()}window.scrollTo({top:0,behavior:'smooth'});showToast(`خلصت التدريب! نتيجتك ${finalScore}/${total} (${Math.round(finalScore/total*100)}%)`)}
el('backToExams').addEventListener('click',()=>{el('questionView').hidden=true;el('dashboard').hidden=false;window.scrollTo({top:0,behavior:'smooth'})});
let toastTimer;function showToast(message){const t=el('toast');t.textContent=message;t.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('show'),3200)}
const saved=localStorage.getItem(profileStorageKey);if(saved){try{const existing=JSON.parse(saved);if(appConfig.slug==='mohammad-bataineh'&&!existing.cohort){localStorage.removeItem(profileStorageKey)}else showDashboard(existing)}catch{localStorage.removeItem(profileStorageKey)}}
