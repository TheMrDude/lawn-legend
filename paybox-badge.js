/*!
 * PayBox Badge — "🤖 AI agents can pay here"
 *
 * Drop-in client for sites that accept x402 payments (e.g. via the tip-jar
 * server in ../server/x402-tipjar.js). It renders a small badge; clicking it
 * opens a card that gives the visitor a copy-paste prompt for their AI
 * assistant — anyone with MoonPay PayBox connected to Claude or ChatGPT can
 * pay by pasting it. No wallet code runs in this page; payment happens
 * agent-side over x402.
 *
 * Usage:
 *   <script src="paybox-badge.js"></script>
 *   <script>
 *     PayBoxBadge.init({
 *       endpoint: 'https://tips.example.com/tip',  // your x402 endpoint
 *       amounts: [2, 5, 10],
 *       name: 'the Lawn Legend dev'
 *     });
 *   </script>
 */
(function (global) {
  'use strict';

  var cfg = null;
  var els = { badge: null, modal: null };

  var DEFAULTS = {
    endpoint: '',              // x402-payable URL; badge won't render while empty
    amounts: [2, 5, 10],       // USD choices shown in the card
    name: 'the developer',     // who the tip goes to
    label: '🤖 Agents can pay here',
    position: 'bottom-right',  // 'bottom-right' | 'bottom-left'
    accent: '#52b788',
    zIndex: 9998,
    attach: true               // false = no badge; call PayBoxBadge.openModal() yourself
  };

  function merge(a, b) {
    var o = {}, k;
    for (k in a) o[k] = a[k];
    for (k in b || {}) if (b[k] !== undefined) o[k] = b[k];
    return o;
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function promptFor(amount) {
    return 'Please pay $' + amount + ' USDC to this x402 endpoint: ' +
      cfg.endpoint + '?amount=' + amount +
      ' — it’s a tip for ' + cfg.name + '.';
  }

  function copy(text, btn) {
    var done = function () {
      var old = btn.textContent;
      btn.textContent = '✓ Copied';
      setTimeout(function () { btn.textContent = old; }, 1500);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () { fallback(); });
    } else fallback();
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); done(); } catch (e) {}
      document.body.removeChild(ta);
    }
  }

  function buildModal() {
    var wrap = document.createElement('div');
    wrap.id = 'paybox-badge-modal';
    wrap.style.cssText =
      'position:fixed;inset:0;z-index:' + (cfg.zIndex + 1) + ';display:flex;' +
      'align-items:center;justify-content:center;background:rgba(0,0,0,0.6);' +
      'font-family:system-ui,sans-serif;';
    wrap.addEventListener('click', function (e) { if (e.target === wrap) PayBoxBadge.closeModal(); });

    var rows = cfg.amounts.map(function (a) {
      return '<div style="display:flex;gap:8px;align-items:center;margin-top:8px">' +
        '<button data-pb-amount="' + a + '" style="flex:0 0 auto;padding:8px 14px;border:none;' +
        'border-radius:8px;cursor:pointer;font-weight:700;background:' + esc(cfg.accent) + ';color:#fff">' +
        'Copy $' + a + ' prompt</button>' +
        '<code style="flex:1;font-size:0.68rem;color:#9ab;overflow:hidden;text-overflow:ellipsis;' +
        'white-space:nowrap">' + esc(promptFor(a)) + '</code></div>';
    }).join('');

    wrap.innerHTML =
      '<div style="max-width:440px;width:calc(100% - 32px);background:#0d1b2a;color:#e0e0e0;' +
      'border:1px solid rgba(255,255,255,0.12);border-radius:14px;padding:20px;box-shadow:0 20px 60px rgba(0,0,0,0.5)">' +
      '<div style="display:flex;justify-content:space-between;align-items:center">' +
      '<strong style="font-size:1.05rem">🤖💚 Tip via your AI agent</strong>' +
      '<button id="paybox-badge-close" style="background:none;border:none;color:#9ab;font-size:1.2rem;cursor:pointer">✕</button></div>' +
      '<p style="font-size:0.8rem;line-height:1.5;color:#9ab;margin:10px 0 4px">' +
      'Have a payment-enabled AI assistant — like <strong>MoonPay PayBox</strong> connected to Claude or ChatGPT? ' +
      'Copy a prompt below, paste it to your assistant, and approve the payment there. ' +
      'It pays in USDC over the open <a href="https://x402.org" target="_blank" rel="noopener" style="color:' + esc(cfg.accent) + '">x402</a> standard.</p>' +
      rows +
      '<p style="font-size:0.66rem;color:#667;margin:12px 0 0">Endpoint: <code>' + esc(cfg.endpoint) + '</code></p>' +
      '</div>';

    document.body.appendChild(wrap);
    wrap.querySelector('#paybox-badge-close').onclick = PayBoxBadge.closeModal;
    Array.prototype.forEach.call(wrap.querySelectorAll('[data-pb-amount]'), function (btn) {
      btn.onclick = function () { copy(promptFor(btn.getAttribute('data-pb-amount')), btn); };
    });
    return wrap;
  }

  var PayBoxBadge = {
    init: function (options) {
      cfg = merge(DEFAULTS, options);
      if (!cfg.endpoint) return PayBoxBadge; // not configured yet — render nothing
      if (cfg.attach) {
        var b = document.createElement('button');
        b.type = 'button';
        b.id = 'paybox-badge';
        b.textContent = cfg.label;
        b.style.cssText =
          'position:fixed;' + (cfg.position === 'bottom-left' ? 'left:14px;' : 'right:14px;') +
          'bottom:14px;z-index:' + cfg.zIndex + ';padding:8px 13px;border:1px solid rgba(255,255,255,0.2);' +
          'border-radius:999px;cursor:pointer;font:600 12px/1 system-ui,sans-serif;color:#fff;' +
          'background:rgba(13,27,42,0.92);backdrop-filter:blur(4px);box-shadow:0 4px 14px rgba(0,0,0,0.35)';
        b.onclick = PayBoxBadge.openModal;
        var mount = function () { document.body.appendChild(b); };
        if (document.body) mount(); else document.addEventListener('DOMContentLoaded', mount);
        els.badge = b;
      }
      return PayBoxBadge;
    },
    openModal: function () {
      if (!cfg || !cfg.endpoint) return;
      if (!els.modal) els.modal = buildModal();
      els.modal.style.display = 'flex';
    },
    closeModal: function () {
      if (els.modal) els.modal.style.display = 'none';
    },
    remove: function () {
      if (els.badge && els.badge.parentNode) els.badge.parentNode.removeChild(els.badge);
      if (els.modal && els.modal.parentNode) els.modal.parentNode.removeChild(els.modal);
      els.badge = els.modal = null;
    }
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = PayBoxBadge;
  global.PayBoxBadge = PayBoxBadge;

})(typeof window !== 'undefined' ? window : this);
