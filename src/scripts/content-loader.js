// 动态加载 PartTwo 文本内容脚本
async function loadJSON(path) {
    const res = await fetch(path);
    if (!res.ok) throw new Error('加载失败 ' + path);
    return res.json();
}

async function initTimeline() {
    const shell = document.querySelector('#page-live .timeline-header');
    if (!shell) return;
    try {
        const data = await loadJSON('/json/timeline.json');
        const titleEl = shell.querySelector('.timeline-title');
        const subEl = shell.querySelector('.timeline-subtitle');
        if (titleEl) titleEl.textContent = data.header.title;
        if (subEl) subEl.textContent = data.header.subtitle;
    } catch (e) { console.error(e); }
}

async function initAbout() {
    const container = document.querySelector('#page-about #card-section');
    if (!container) return;
    try {
        const data = await loadJSON('/json/about.json');
        const cards = data.cards || [];
        container.innerHTML = cards.map(c => `\n<div id="card${c.id}" class="card">\n  <div class="card-small-title">${c.smallTitle}</div>\n  <div class="card-title">${c.title}</div>\n  <div class="card-content">${c.content}</div>\n  <div class="card-img"><img src="${c.image}" alt="" /></div>\n</div>`).join('\n');
    } catch (e) { console.error(e); }
}

async function initActivity() {
    const wrap = document.querySelector('#page-activity .activity-container');
    if (!wrap) return;
    try {
        const data = await loadJSON('/json/activity.json');
        const book2 = wrap.querySelector('.book-2 .book-content');
        if (book2) {
            book2.innerHTML = `\n<h1 class="activity-title">${data.title}</h1>\n<div class="activity-description">${data.description}</div>\n<div class="submission-section">\n  <h2 class="section-title">视频提交</h2>\n  <form id="submission-form">\n    ${data.form.fields.map(f => f.type === 'file' ? `\n    <div class=\"form-group\">\n      <label>${f.label}</label>\n      <button type=\"button\" class=\"custom-file-btn\" id=\"file-upload-btn\"><i class=\"fas fa-video\"></i><span>选择视频文件</span></button>\n      <span class=\"file-name\" id=\"file-name\">未选择文件</span>\n      <small class=\"file-hint\">${f.hint || ''}</small>\n    </div>` : `\n    <div class=\"form-group\">\n      <label for=\"${f.name}\">${f.label}</label>\n      <input type=\"${f.type}\" id=\"${f.name === 'video' ? 'video-file' : f.name}\" name=\"${f.name}\" ${f.placeholder ? `placeholder=\"${f.placeholder}\"` : ''} ${f.required ? 'required' : ''}/>\n    </div>`).join('')}\n  </form>\n  <button type="submit" class="submit-btn">${data.form.submitText}</button>\n</div>`;
        }
        const bg = wrap.querySelector('.book-1');
        if (bg) bg.style.backgroundImage = `url(${data.backgroundImage})`;
    } catch (e) { console.error(e); }
}

function init() {
    initTimeline();
    initAbout();
    initActivity();
}

document.addEventListener('DOMContentLoaded', init);
