// حماية محتوى الأسئلة في صفحات الطلاب: منع النسخ والطباعة والكليك اليمين والسحب.
(() => {
  const editable = (e) => e.target && e.target.closest && e.target.closest('input, textarea, select, [contenteditable="true"]');
  ['copy', 'cut', 'contextmenu', 'dragstart', 'selectstart'].forEach((type) => {
    document.addEventListener(type, (e) => { if (!editable(e)) e.preventDefault(); });
  });
  document.addEventListener('keydown', (e) => {
    const key = (e.key || '').toLowerCase();
    if ((e.ctrlKey || e.metaKey) && ['c', 'x', 'p', 's', 'u', 'a'].includes(key) && !editable(e)) e.preventDefault();
    if (key === 'printscreen' && navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText('').catch(() => {});
  });
  const style = document.createElement('style');
  style.textContent = 'body{-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}' +
    'input,textarea,select,[contenteditable="true"]{-webkit-user-select:text;user-select:text}' +
    'img{-webkit-user-drag:none;user-drag:none}' +
    '@media print{body{display:none!important}}';
  document.head.appendChild(style);
})();
