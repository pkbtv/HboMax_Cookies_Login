// HBO Max Cookie Login — by Telegram @PKBTV @sackion
//
// HBO Max / Max authenticate every API call with a single session token cookie
// named `st` (a JWT) sent to api.hbomax.com. Instead of writing browser cookies
// (which the site's CSP + host-only scoping make unreliable), this extension
// rewrites the outgoing `Cookie` header on every *api.hbomax.com* request to
// `st=<token>` using declarativeNetRequest. That single header carries the whole
// session, so the site loads straight into the account.
//
// The popup extracts the `st` JWT from a full cookie file/paste and hands it here
// via SET_ST; we install one dynamic rule (id 1). CLEAR_ST removes it. The active
// token is persisted so it survives browser/service-worker restarts.

const ST_RULE_ID = 1;
// Substring match (not ||domain-anchored): HBO Max also uses REGIONAL API hosts
// like default.beam-amer.prd.api.hbomax.com — a "||api.hbomax.com" anchor would
// miss those. "*api.hbomax.com*" catches api.hbomax.com AND every *.api.hbomax.com.
const API_FILTER = '*api.hbomax.com*';

// Open the panel as a full tab (reuse an existing one if already open) so the
// folder file-list has room — mirrors the google/outlook login extensions.
chrome.action.onClicked.addListener(() => {
  const panelUrl = chrome.runtime.getURL('popup.html');
  chrome.tabs.query({ url: panelUrl }, tabs => {
    if (tabs.length) {
      chrome.tabs.update(tabs[0].id, { active: true });
      chrome.windows.update(tabs[0].windowId, { focused: true });
    } else {
      chrome.tabs.create({ url: panelUrl });
    }
  });
});

// Install (or replace) the single st-injection rule for api.hbomax.com.
function applySTRule(st) {
  return chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: [ST_RULE_ID],
    addRules: [{
      id: ST_RULE_ID,
      priority: 1,
      action: {
        type: 'modifyHeaders',
        requestHeaders: [{ header: 'Cookie', operation: 'set', value: 'st=' + st }],
      },
      condition: {
        urlFilter: API_FILTER,
        resourceTypes: ['xmlhttprequest', 'main_frame', 'sub_frame', 'other'],
      },
    }],
  });
}

function clearSTRule() {
  return chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: [ST_RULE_ID] });
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || !msg.type) return;

  if (msg.type === 'SET_ST') {
    const st = (msg.st || '').trim();
    if (!st) { sendResponse({ ok: false, error: 'empty token' }); return true; }
    applySTRule(st).then(() => {
      chrome.storage.local.set({ st }, () => sendResponse({ ok: true }));
    }).catch(err => sendResponse({ ok: false, error: String(err) }));
    return true; // async response
  }

  if (msg.type === 'CLEAR_ST') {
    clearSTRule().then(() => {
      chrome.storage.local.remove('st', () => sendResponse({ ok: true }));
    }).catch(err => sendResponse({ ok: false, error: String(err) }));
    return true;
  }

  if (msg.type === 'GET_ST') {
    chrome.storage.local.get('st', data => sendResponse({ st: data.st || null }));
    return true;
  }
});

// Re-install the active rule after a browser or service-worker restart — dynamic
// rules persist across restarts, but re-applying is idempotent and self-heals if
// the ruleset was ever cleared.
function restore() {
  chrome.storage.local.get('st', data => {
    if (data.st) applySTRule(data.st);
  });
}
chrome.runtime.onStartup.addListener(restore);
chrome.runtime.onInstalled.addListener(restore);
