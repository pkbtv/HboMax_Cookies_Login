// HBO Max Cookie Login — by Telegram @PKBTV @sackion
//
// HBO Max auth is a single JWT cookie named `st`. The user can paste the FULL
// cookie (JSON export, Netscape, raw header) or just the bare token — this popup
// finds the `st` token by itself, hands it to the background service worker, which
// injects `Cookie: st=<token>` on every api.hbomax.com request, then opens Max.

const btn          = document.getElementById('btn');
const btnClearTok  = document.getElementById('btn-clear-token');
const statusEl     = document.getElementById('status');
const jsonInput    = document.getElementById('json-input');
const dropEl       = document.getElementById('drop');
const fileInput    = document.getElementById('file-input');
const folderInput  = document.getElementById('folder-input');
const btnLoad      = document.getElementById('btn-load');
const btnClearF    = document.getElementById('btn-clear-folder');
const fileListWrap = document.getElementById('file-list-wrap');
const fileListEl   = document.getElementById('file-list');
const fileCountEl  = document.getElementById('file-count');

const HBOMAX_URL = 'https://play.hbomax.com/';

let folderFiles = [];

function setStatus(msg, cls) {
  statusEl.textContent = msg;
  statusEl.className = cls || '';
}

// ── st-token extraction ──────────────────────────────────────────────────────
// A valid st token is a 3-segment JWT beginning "eyJ". We accept it from:
//   • a JSON cookie array/object  → the entry whose name is "st"
//   • Netscape lines             → the row whose 6th column is "st"
//   • a `st:` or `st=` pair
//   • a bare eyJ… token pasted on its own
function looksLikeJwt(v) {
  return typeof v === 'string' && v.startsWith('eyJ') && v.split('.').length === 3;
}

function stFromJson(text) {
  let data;
  try { data = JSON.parse(text); } catch { return null; }
  const arr = Array.isArray(data) ? data : (Array.isArray(data.cookies) ? data.cookies : [data]);
  // Prefer an entry literally named "st".
  for (const c of arr) {
    if (c && typeof c === 'object' && String(c.name).toLowerCase() === 'st' && c.value) {
      return String(c.value).trim();
    }
  }
  // {name:value} object form.
  if (!Array.isArray(data) && data && typeof data === 'object' && looksLikeJwt(data.st)) {
    return String(data.st).trim();
  }
  // Fallback: any value that looks like the JWT.
  for (const c of arr) {
    if (c && typeof c === 'object' && looksLikeJwt(c.value)) return String(c.value).trim();
  }
  return null;
}

function stFromText(text) {
  const lines = text.split('\n');
  // Netscape: domain \t flag \t path \t secure \t expiry \t name \t value
  for (const raw of lines) {
    const line = raw.startsWith('#HttpOnly_') ? raw.slice(10) : raw;
    if (line.trim().startsWith('#')) continue;
    const cols = line.split('\t');
    if (cols.length >= 7 && cols[5].trim() === 'st') return cols[6].trim();
  }
  // `st: <token>` / `st=<token>` anywhere.
  let m = text.match(/^st:\s*(eyJ[A-Za-z0-9_\-.]+)/m);
  if (m) return m[1];
  m = text.match(/st=([^;\s"']+)/);
  if (m && looksLikeJwt(m[1])) return m[1];
  // Bare JWT anywhere in the text.
  m = text.match(/(eyJ[A-Za-z0-9_\-.]+)/);
  if (m && looksLikeJwt(m[1])) return m[1];
  return null;
}

function extractST(raw) {
  const t = (raw || '').trim();
  if (!t) return null;
  if (t.startsWith('[') || t.startsWith('{')) {
    const j = stFromJson(t);
    if (j) return j;
  }
  return stFromText(t);
}

// ── Folder loading (bulk switch) ─────────────────────────────────────────────
function readFilesToMemory(fileList) {
  const files = Array.from(fileList)
    .filter(f => f.name.endsWith('.txt') || f.name.endsWith('.json'))
    .sort((a, b) => a.name.localeCompare(b.name));
  if (!files.length) { setStatus('No .txt/.json files found.', 'err'); return; }
  folderFiles = files.map(f => ({ name: f.name, file: f }));
  renderFileList();
  setStatus(`Loaded ${files.length} files`, 'ok');
  chrome.storage.local.set({
    folderFileNames: folderFiles.map(f => f.name),
    folderPath: folderInput.value,
  });
}

function renderFileList(restoreScroll) {
  const prev = restoreScroll !== undefined ? restoreScroll : fileListWrap.scrollTop;
  fileListEl.innerHTML = '';
  fileCountEl.textContent = `${folderFiles.length} file${folderFiles.length !== 1 ? 's' : ''}`;
  folderFiles.forEach((f, i) => {
    const div = document.createElement('div');
    div.className = 'file-item';
    div.textContent = f.name;
    div.title = f.name;
    div.dataset.index = i;
    div.addEventListener('click', () => {
      if (!f.file) { setStatus('Click Load to pick the folder again.', 'err'); return; }
      document.querySelectorAll('.file-item').forEach(el => el.classList.remove('active'));
      div.classList.add('active');
      chrome.storage.local.set({ folderScrollTop: fileListWrap.scrollTop });
      const reader = new FileReader();
      reader.onload = ev => { jsonInput.value = ev.target.result; login(); };
      reader.readAsText(f.file);
    });
    fileListEl.appendChild(div);
  });
  fileListWrap.classList.add('visible');
  requestAnimationFrame(() => { fileListWrap.scrollTop = prev; });
}

const folderPicker = document.createElement('input');
folderPicker.type = 'file';
folderPicker.accept = '.txt,.json';
folderPicker.multiple = true;
folderPicker.setAttribute('webkitdirectory', '');

btnLoad.addEventListener('click', () => folderPicker.click());

folderPicker.addEventListener('change', () => {
  if (!folderPicker.files.length) return;
  const first = folderPicker.files[0];
  const parts = (first.webkitRelativePath || first.name).split('/');
  folderInput.value = parts[0] || 'Selected folder';
  readFilesToMemory(folderPicker.files);
});

btnClearF.addEventListener('click', () => {
  folderFiles = [];
  fileListEl.innerHTML = '';
  fileListWrap.classList.remove('visible');
  folderInput.value = '';
  chrome.storage.local.remove(['folderFileNames', 'folderPath', 'folderScrollTop']);
  setStatus('', '');
});

// ── Drag & drop / browse ─────────────────────────────────────────────────────
dropEl.addEventListener('dragover', e => { e.preventDefault(); dropEl.classList.add('over'); });
dropEl.addEventListener('dragleave', () => dropEl.classList.remove('over'));
dropEl.addEventListener('drop', e => {
  e.preventDefault();
  dropEl.classList.remove('over');

  const items = Array.from(e.dataTransfer.items || []);
  const dirEntry = items.map(i => i.webkitGetAsEntry && i.webkitGetAsEntry()).find(en => en && en.isDirectory);

  if (dirEntry) {
    folderInput.value = dirEntry.name;
    const dirReader = dirEntry.createReader();
    const all = [];
    const readAll = cb => {
      dirReader.readEntries(entries => {
        if (!entries.length) { cb(all); return; }
        all.push(...entries);
        readAll(cb);
      });
    };
    readAll(entries => {
      Promise.all(
        entries
          .filter(en => !en.isDirectory && (en.name.endsWith('.txt') || en.name.endsWith('.json')))
          .map(en => new Promise(res => en.file(f => res(f))))
      ).then(files => readFilesToMemory(files));
    });
  } else {
    const file = e.dataTransfer.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => { jsonInput.value = ev.target.result; login(); };
    reader.readAsText(file);
  }
});

dropEl.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', () => {
  if (!fileInput.files[0]) return;
  const reader = new FileReader();
  reader.onload = e => { jsonInput.value = e.target.result; login(); };
  reader.readAsText(fileInput.files[0]);
});

// ── Login: extract st → inject via background → open Max ──────────────────────
function login() {
  const raw = jsonInput.value.trim();
  if (!raw) { setStatus('Drop, paste, or select a cookie first.', 'err'); return; }

  const st = extractST(raw);
  if (!st) { setStatus('No st token found in that cookie.', 'err'); return; }

  btn.disabled = true;
  setStatus('Injecting st token…', 'info');

  chrome.runtime.sendMessage({ type: 'SET_ST', st }, res => {
    if (chrome.runtime.lastError || !res || !res.ok) {
      btn.disabled = false;
      setStatus('Injection failed' + (res && res.error ? `: ${res.error}` : ''), 'err');
      return;
    }
    setStatus('Opening HBO Max…', 'info');
    chrome.tabs.query({ url: 'https://play.hbomax.com/*' }, tabs => {
      if (tabs.length) chrome.tabs.update(tabs[0].id, { url: HBOMAX_URL, active: true }, () => chrome.runtime.lastError);
      else chrome.tabs.create({ url: HBOMAX_URL });
      btn.disabled = false;
      setStatus('Done — logged in with the st token.', 'ok');
    });
  });
}

btn.addEventListener('click', () => login());

btnClearTok.addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'CLEAR_ST' }, () => {
    setStatus('Active token cleared.', 'info');
  });
});

// ── Restore folder state on open ─────────────────────────────────────────────
chrome.storage.local.get(['folderFileNames', 'folderPath', 'folderScrollTop'], res => {
  if (folderFiles.length) {
    renderFileList(res.folderScrollTop || 0);
  } else if (res.folderPath) {
    folderInput.value = res.folderPath;
    if (res.folderFileNames && res.folderFileNames.length) {
      folderFiles = res.folderFileNames.map(name => ({ name, file: null }));
      renderFileList(res.folderScrollTop || 0);
      setStatus(`Click Load to reload "${res.folderPath}"`, 'info');
    }
  }
});
