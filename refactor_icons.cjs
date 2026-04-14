const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

const map = {
  '🔍': '<i data-lucide=\"search\"></i>',
  '📞': '<i data-lucide=\"phone\"></i>',
  '👤': '<i data-lucide=\"user\"></i>',
  '📋': '<i data-lucide=\"clipboard\"></i>',
  '🎨': '<i data-lucide=\"palette\"></i>',
  '🔔': '<i data-lucide=\"bell\"></i>',
  '💾': '<i data-lucide=\"save\"></i>',
  '🔒': '<i data-lucide=\"lock\"></i>',
  '☁️': '<i data-lucide=\"cloud\"></i>',
  '🚪': '<i data-lucide=\"log-out\"></i>',
  '📊': '<i data-lucide=\"bar-chart-2\"></i>',
  '✏️': '<i data-lucide=\"pencil\"></i>',
  '📥': '<i data-lucide=\"download\"></i>',
  '🔗': '<i data-lucide=\"link\"></i>',
  '🗑️': '<i data-lucide=\"trash\"></i>',
  '✖️': '<i data-lucide=\"x\"></i>',
  '✨': '<i data-lucide=\"sparkles\"></i>',
  '⚙️': '<i data-lucide=\"settings\"></i>',
  '🚘': '<i data-lucide=\"car\"></i>',
  '🏎️': '<i data-lucide=\"circle-dashed\"></i>',
  '🛑': '<i data-lucide=\"octagon\"></i>',
  '🔧': '<i data-lucide=\"wrench\"></i>',
  '⚡': '<i data-lucide=\"zap\"></i>',
  '🔋': '<i data-lucide=\"battery\"></i>',
  '🚜': '<i data-lucide=\"tractor\"></i>',
  '💰': '<i data-lucide=\"indian-rupee\"></i>',
  '📅': '<i data-lucide=\"calendar\"></i>',
  '📍': '<i data-lucide=\"map-pin\"></i>',
  '📖': '<i data-lucide=\"book-open\"></i>',
  '📸': '<i data-lucide=\"camera\"></i>',
  '✅': '<i data-lucide=\"check-circle\"></i>',
  '📄': '<i data-lucide=\"file-text\"></i>',
  '🔄': '<i data-lucide=\"refresh-cw\"></i>',
  '📤': '<i data-lucide=\"share-2\"></i>',
  '📉': '<i data-lucide=\"trending-down\"></i>',
  '💬': '<i data-lucide=\"message-square\"></i>',
  '📩': '<i data-lucide=\"mail\"></i>',
  '📂': '<i data-lucide=\"folder\"></i>'
};

const regex = new RegExp(Object.keys(map).join('|'), 'g');
html = html.replace(regex, match => map[match]);

html = html.split('<span class=\"sr-arrow\">></span>').join('<span class=\"sr-arrow\"><i data-lucide=\"chevron-right\"></i></span>');

if(!html.includes('const obsv = new MutationObserver(')) {
  const inject = `
  <script>
  // Auto init Lucide icons
  document.addEventListener('DOMContentLoaded', () => {
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
      const obsv = new MutationObserver(() => {
         lucide.createIcons();
      });
      obsv.observe(document.body, { childList: true, subtree: true });
    }
  });
  </script>\n`;
  html = html.replace('</head>', inject + '</head>');
}

fs.writeFileSync('index.html', html);
console.log('Icons replaced successfully.');
