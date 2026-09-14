/* RecoverRevenue Portal — install.js
   Drop-in PWA install helper. Include with: <script src="install.js"></script>
   - Registers ./sw.js (https or localhost only)
   - Injects a themed "Install the app" modal (hidden until opened)
   - Exposes window.RRInstall = { open, close, canPrompt, isStandalone }
   - Does nothing at all in ?embed=1 iframe demo mode */

(function () {
  'use strict';

  try {
    // ---------- embed mode: bail out entirely (no DOM, no SW) ----------
    if (/(^|[?&])embed=1(&|$)/.test(window.location.search)) {
      // Still expose a no-op API so callers never throw.
      window.RRInstall = {
        open: function () {},
        close: function () {},
        canPrompt: function () { return false; },
        isStandalone: function () { return false; }
      };
      return;
    }

    var deferredPrompt = null;
    var modalEl = null;
    var lastFocus = null;

    // ---------- environment checks ----------
    function isSecureContextForSW() {
      var p = window.location.protocol;
      var h = window.location.hostname;
      return p === 'https:' || h === 'localhost' || h === '127.0.0.1';
    }

    function isStandalone() {
      try {
        if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) return true;
      } catch (e) { /* ignore */ }
      return window.navigator.standalone === true;
    }

    function isIOS() {
      var ua = navigator.userAgent || '';
      if (/iPhone|iPad|iPod/i.test(ua)) return true;
      // iPadOS 13+ reports as Macintosh but has touch points.
      return /Macintosh/i.test(ua) && navigator.maxTouchPoints > 1;
    }

    function isAndroid() {
      return /Android/i.test(navigator.userAgent || '');
    }

    // ---------- service worker registration ----------
    if ('serviceWorker' in navigator && isSecureContextForSW()) {
      window.addEventListener('load', function () {
        navigator.serviceWorker.register('./sw.js').catch(function () {
          // Registration failure is non-fatal; portal works without it.
        });
      });
    }

    // ---------- beforeinstallprompt capture ----------
    window.addEventListener('beforeinstallprompt', function (e) {
      e.preventDefault();
      deferredPrompt = e;
      if (modalEl) {
        var btn = modalEl.querySelector('.rr-install-now');
        if (btn) btn.style.display = 'inline-flex';
      }
    });

    window.addEventListener('appinstalled', function () {
      deferredPrompt = null;
      closeModal();
    });

    // ---------- modal markup ----------
    var CSS = [
      '.rr-install-scrim{position:fixed;inset:0;z-index:9999;display:none;align-items:flex-end;justify-content:center;',
      '  background:rgba(0,0,0,.5);-webkit-backdrop-filter:blur(3px);backdrop-filter:blur(3px);padding:16px;}',
      '.rr-install-scrim.rr-open{display:flex;}',
      '@media (min-width:521px){.rr-install-scrim{align-items:center;}}',
      '.rr-install-sheet{width:100%;max-width:380px;max-height:85vh;overflow-y:auto;',
      '  background:var(--bg,#f6f5f1);color:var(--ink,#16181d);',
      '  border:1px solid var(--line,rgba(22,24,29,.1));border-radius:24px;padding:24px 22px 22px;',
      '  box-shadow:0 24px 64px rgba(0,0,0,.35);',
      '  font-family:Inter,-apple-system,BlinkMacSystemFont,sans-serif;',
      '  animation:rr-install-up .26s ease;}',
      '@keyframes rr-install-up{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}',
      '.rr-install-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;}',
      '.rr-install-title{font-family:"Bricolage Grotesque",Inter,sans-serif;font-size:21px;font-weight:800;letter-spacing:-.02em;}',
      '.rr-install-close{background:none;border:1px solid var(--line,rgba(22,24,29,.1));border-radius:50%;',
      '  width:30px;height:30px;font-size:14px;line-height:1;color:var(--dim,#6d7078);cursor:pointer;',
      '  display:flex;align-items:center;justify-content:center;font-family:inherit;}',
      '.rr-install-sub{font-size:13px;color:var(--dim,#6d7078);margin-bottom:16px;}',
      '.rr-install-now{display:none;width:100%;margin:0 0 16px;padding:13px 16px;border:none;border-radius:14px;',
      '  background:var(--blue,#1b48c8);color:#fff;font-size:14px;font-weight:700;cursor:pointer;',
      '  font-family:inherit;align-items:center;justify-content:center;gap:8px;}',
      '.rr-install-block{border:1px solid var(--line,rgba(22,24,29,.1));border-radius:16px;padding:14px 16px;margin-bottom:10px;}',
      '.rr-install-block.rr-hl{border-color:var(--blue,#1b48c8);box-shadow:0 0 0 1px var(--blue,#1b48c8);}',
      '.rr-install-label{font-family:"Space Mono",monospace;font-size:10px;font-weight:700;',
      '  letter-spacing:.18em;text-transform:uppercase;color:var(--dim,#6d7078);margin-bottom:8px;}',
      '.rr-install-block.rr-hl .rr-install-label{color:var(--blue,#1b48c8);}',
      '.rr-install-steps{list-style:none;margin:0;padding:0;counter-reset:rr-step;}',
      '.rr-install-steps li{counter-increment:rr-step;position:relative;padding:3px 0 3px 30px;font-size:13.5px;line-height:1.45;}',
      '.rr-install-steps li::before{content:counter(rr-step);position:absolute;left:0;top:4px;',
      '  width:20px;height:20px;border-radius:50%;background:var(--ink,#16181d);color:var(--bg,#f6f5f1);',
      '  font-family:"Space Mono",monospace;font-size:11px;font-weight:700;',
      '  display:flex;align-items:center;justify-content:center;}',
      '.rr-install-note{font-size:12px;color:var(--dim,#6d7078);margin-top:8px;}',
      '.rr-install-done{display:none;text-align:center;padding:26px 8px 18px;}',
      '.rr-install-done .rr-check{font-size:34px;color:var(--blue,#1b48c8);}',
      '.rr-install-done .rr-msg{font-family:"Bricolage Grotesque",Inter,sans-serif;font-size:18px;font-weight:800;margin-top:10px;}',
      '.rr-install-done .rr-msgsub{font-size:13px;color:var(--dim,#6d7078);margin-top:4px;}',
      '.rr-install-scrim.rr-standalone .rr-install-done{display:block;}',
      '.rr-install-scrim.rr-standalone .rr-install-block,',
      '.rr-install-scrim.rr-standalone .rr-install-sub,',
      '.rr-install-scrim.rr-standalone .rr-install-now{display:none !important;}'
    ].join('\n');

    var HTML = [
      '<div class="rr-install-sheet" role="dialog" aria-modal="true" aria-label="Install the app">',
      '  <div class="rr-install-head">',
      '    <div class="rr-install-title">Install the app</div>',
      '    <button type="button" class="rr-install-close" aria-label="Close">&#10005;</button>',
      '  </div>',
      '  <div class="rr-install-sub">Add the portal to your device for one-tap access.</div>',
      '  <button type="button" class="rr-install-now">Install now</button>',
      '  <div class="rr-install-done">',
      '    <div class="rr-check">&#10003;</div>',
      '    <div class="rr-msg">You&#39;re in the app</div>',
      '    <div class="rr-msgsub">The portal is already installed and running standalone.</div>',
      '  </div>',
      '  <div class="rr-install-block" data-platform="ios">',
      '    <div class="rr-install-label">iPhone / iPad</div>',
      '    <ol class="rr-install-steps">',
      '      <li>Open this page in <strong>Safari</strong></li>',
      '      <li>Tap the <strong>Share</strong> button</li>',
      '      <li>Tap <strong>Add to Home Screen</strong></li>',
      '    </ol>',
      '  </div>',
      '  <div class="rr-install-block" data-platform="android">',
      '    <div class="rr-install-label">Android</div>',
      '    <ol class="rr-install-steps">',
      '      <li>Open this page in <strong>Chrome</strong></li>',
      '      <li>Tap the <strong>&#8942;</strong> menu (top right)</li>',
      '      <li>Tap <strong>Add to Home screen</strong> / <strong>Install app</strong></li>',
      '    </ol>',
      '  </div>',
      '  <div class="rr-install-block" data-platform="desktop">',
      '    <div class="rr-install-label">Desktop &mdash; Mac / PC</div>',
      '    <ol class="rr-install-steps">',
      '      <li>Open this page in <strong>Chrome</strong> or <strong>Edge</strong></li>',
      '      <li>Click the <strong>install icon</strong> in the address bar</li>',
      '      <li>The portal opens in its own window &mdash; this <strong>is</strong> the desktop app</li>',
      '    </ol>',
      '  </div>',
      '</div>'
    ].join('\n');

    // ---------- build / open / close ----------
    function buildModal() {
      if (modalEl || !document.body) return;

      var style = document.createElement('style');
      style.textContent = CSS;
      document.head.appendChild(style);

      modalEl = document.createElement('div');
      modalEl.className = 'rr-install-scrim';
      modalEl.innerHTML = HTML;
      document.body.appendChild(modalEl);

      // Highlight the block for the current platform.
      var platform = isIOS() ? 'ios' : (isAndroid() ? 'android' : 'desktop');
      var block = modalEl.querySelector('.rr-install-block[data-platform="' + platform + '"]');
      if (block) {
        block.classList.add('rr-hl');
        // Move the highlighted block to the top of the list.
        var firstBlock = modalEl.querySelector('.rr-install-block');
        if (firstBlock && firstBlock !== block) {
          firstBlock.parentNode.insertBefore(block, firstBlock);
        }
      }

      // Native prompt button (Chrome/Edge, when beforeinstallprompt already fired).
      var installBtn = modalEl.querySelector('.rr-install-now');
      if (installBtn) {
        if (deferredPrompt) installBtn.style.display = 'inline-flex';
        installBtn.addEventListener('click', function () {
          if (!deferredPrompt) return;
          var p = deferredPrompt;
          deferredPrompt = null;
          installBtn.style.display = 'none';
          try {
            p.prompt();
            if (p.userChoice && p.userChoice.then) {
              p.userChoice.then(function (choice) {
                if (choice && choice.outcome === 'accepted') closeModal();
              }).catch(function () {});
            }
          } catch (e) { /* ignore */ }
        });
      }

      var closeBtn = modalEl.querySelector('.rr-install-close');
      if (closeBtn) closeBtn.addEventListener('click', closeModal);

      // Scrim click closes (sheet clicks don't bubble-close).
      modalEl.addEventListener('click', function (e) {
        if (e.target === modalEl) closeModal();
      });

      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && modalEl && modalEl.classList.contains('rr-open')) closeModal();
      });
    }

    function openModal() {
      buildModal();
      if (!modalEl) return;
      modalEl.classList.toggle('rr-standalone', isStandalone());
      lastFocus = document.activeElement;
      modalEl.classList.add('rr-open');
      var closeBtn = modalEl.querySelector('.rr-install-close');
      if (closeBtn && closeBtn.focus) closeBtn.focus();
    }

    function closeModal() {
      if (!modalEl) return;
      modalEl.classList.remove('rr-open');
      if (lastFocus && lastFocus.focus) {
        try { lastFocus.focus(); } catch (e) { /* ignore */ }
      }
      lastFocus = null;
    }

    // Build lazily on DOM ready so the script can be included from <head> too.
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', buildModal);
    } else {
      buildModal();
    }

    // ---------- public API ----------
    window.RRInstall = {
      open: openModal,
      close: closeModal,
      canPrompt: function () { return !!deferredPrompt; },
      isStandalone: isStandalone
    };
  } catch (err) {
    // Absolute last resort: never let install UI break the portal.
    window.RRInstall = window.RRInstall || {
      open: function () {},
      close: function () {},
      canPrompt: function () { return false; },
      isStandalone: function () { return false; }
    };
  }
})();
