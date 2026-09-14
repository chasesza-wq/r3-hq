/* ============================================================================
 * RecoverRevenue Client Portal — auth + onboarding state engine (window.RRState)
 * INTEGRATION CONTRACT:
 *   1. Include this file BEFORE the inline <script> in portal/index.html:  <script src="app-state.js"></script>
 *   2. Gate the UI: if (!RRState.isDemo() && !RRState.getSession()) show the login screen, else the app.
 *   3. Drive onboarding from the chat/UI: RRState.signIn(...), markWelcomed(), markAgreementViewed(),
 *      signAgreement(typedName), markPaid(); render numbers from RRState.metrics(); RRState.onChange(cb)
 *      re-renders on every mutation AND on cross-tab 'storage' events (PWA window <-> browser tab sync).
 * All state is a localStorage mock under "rr_portal_v1" — swap load/save internals for a real API later.
 * ?embed=1 or ?demo=1 => completed demo persona (Sarah Reyes), in-memory only, storage never touched.
 * ========================================================================== */
(function () {
  "use strict";

  /* Resolve the global object: browser window, or Node's global (for _selfTest). */
  var root;
  if (typeof window !== "undefined") { root = window; }
  else if (typeof global !== "undefined") { root = global; }
  else { root = this; }

  var STORAGE_KEY = "rr_portal_v1";
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  var DEFAULT_PLAN = "Visibility+";

  /* Demo dataset — what the portal dashboard shows once the client is live/paid. */
  var LIVE_METRICS = { recovered: 4180, deltaPct: 18, calls: 23, reviews: 19, quotes: 38, locked: false };
  var LOCKED_METRICS = { recovered: 0, deltaPct: 0, calls: 0, reviews: 0, quotes: 0, locked: true };

  /* In-memory fallback store (Node / storage-blocked browsers) + demo-mode state. */
  var memStore = {};
  var demoMem = null;      /* demo persona state, memory only — never persisted   */
  var listeners = [];      /* onChange subscribers                                 */
  var testOverrides = null;/* set by _selfTest: { search, storage } shims          */

  /* ---------------------------------------------------------------- helpers */

  function nowISO() { return new Date().toISOString(); }

  function getSearch() {
    if (testOverrides && typeof testOverrides.search === "string") return testOverrides.search;
    try {
      if (root.location && root.location.search) return String(root.location.search);
    } catch (e) { /* ignore */ }
    return "";
  }

  function isDemo() {
    var q = "&" + getSearch().replace(/^\?/, "") + "&";
    return q.indexOf("&embed=1&") > -1 || q.indexOf("&demo=1&") > -1;
  }

  /* Raw storage access — real localStorage when available, memory shim otherwise.
   * Every call is try/catch'd: quota errors / privacy modes must never throw out. */
  function rawGet() {
    if (testOverrides && testOverrides.storage) {
      try { return testOverrides.storage.getItem(STORAGE_KEY); } catch (e) { return null; }
    }
    try {
      if (root.localStorage) return root.localStorage.getItem(STORAGE_KEY);
    } catch (e) { /* fall through */ }
    return Object.prototype.hasOwnProperty.call(memStore, STORAGE_KEY) ? memStore[STORAGE_KEY] : null;
  }

  function rawSet(str) {
    if (testOverrides && testOverrides.storage) {
      try { testOverrides.storage.setItem(STORAGE_KEY, str); } catch (e) { /* ignore */ }
      return;
    }
    try {
      if (root.localStorage) { root.localStorage.setItem(STORAGE_KEY, str); return; }
    } catch (e) { /* fall through */ }
    memStore[STORAGE_KEY] = str;
  }

  function rawRemove() {
    if (testOverrides && testOverrides.storage) {
      try { testOverrides.storage.removeItem(STORAGE_KEY); } catch (e) { /* ignore */ }
      return;
    }
    try {
      if (root.localStorage) { root.localStorage.removeItem(STORAGE_KEY); return; }
    } catch (e) { /* fall through */ }
    delete memStore[STORAGE_KEY];
  }

  function freshOnboarding() {
    return {
      welcomedAt: null,
      agreementViewedAt: null,
      signedName: null,
      signedAt: null,
      paidAt: null,
      liveAt: null
    };
  }

  /* Completed demo persona — mirrors the static portal copy (signed Jun 5, live Jun 12, 2026). */
  function demoState() {
    return {
      session: {
        email: "sarah@radiancemedspa.com",
        name: "Sarah Reyes",
        business: "Radiance Med Spa",
        plan: "Visibility+",
        createdAt: "2026-06-05T14:00:00.000Z"
      },
      onboarding: {
        welcomedAt: "2026-06-05T14:05:00.000Z",
        agreementViewedAt: "2026-06-05T14:10:00.000Z",
        signedName: "Sarah Reyes",
        signedAt: "2026-06-05T14:12:00.000Z",
        paidAt: "2026-06-05T14:15:00.000Z",
        liveAt: "2026-06-12T16:00:00.000Z"
      }
    };
  }

  /* The current pending stage, derived from timestamps (single source of truth). */
  function computeStep(ob) {
    if (ob.paidAt) return "live";
    if (ob.signedAt) return "payment";
    if (ob.welcomedAt) return "agreement";
    return "welcome";
  }

  function copy(obj) {
    if (!obj) return null;
    var out = {}, k;
    for (k in obj) { if (Object.prototype.hasOwnProperty.call(obj, k)) out[k] = obj[k]; }
    return out;
  }

  function validSession(s) {
    return !!(s && typeof s === "object" && typeof s.email === "string" && s.email);
  }

  /* Defensive load: corrupt / missing / non-object JSON => signed-out state, never throws. */
  function loadState() {
    if (isDemo()) {
      if (!demoMem) demoMem = demoState();
      return demoMem;
    }
    var raw = rawGet(), parsed = null;
    if (raw !== null && raw !== undefined) {
      try { parsed = JSON.parse(raw); } catch (e) { parsed = null; }
    }
    if (!parsed || typeof parsed !== "object") {
      return { session: null, onboarding: freshOnboarding() };
    }
    var ob = (parsed.onboarding && typeof parsed.onboarding === "object") ? parsed.onboarding : {};
    var base = freshOnboarding(), k;
    for (k in base) {
      if (Object.prototype.hasOwnProperty.call(ob, k)) base[k] = ob[k];
    }
    return {
      session: validSession(parsed.session) ? parsed.session : null,
      onboarding: base
    };
  }

  /* Persist + notify. Demo mode: memory only — localStorage is never written. */
  function saveState(state) {
    if (isDemo()) {
      demoMem = state;
    } else {
      try { rawSet(JSON.stringify(state)); } catch (e) { /* never throw */ }
    }
    notify();
  }

  function notify() {
    var snap = publicSnapshot(), i, list = listeners.slice();
    for (i = 0; i < list.length; i++) {
      try { list[i](snap); } catch (e) { /* subscriber errors must not break the engine */ }
    }
  }

  function publicSnapshot() {
    return { session: getSession(), onboarding: getOnboarding(), metrics: metrics() };
  }

  function norm(name) {
    return String(name || "").replace(/\s+/g, " ").replace(/^\s+|\s+$/g, "").toLowerCase();
  }

  /* -------------------------------------------------------------- public API */

  function getSession() {
    var s = loadState().session;
    return s ? copy(s) : null;
  }

  /* Returns the session object on success, null on invalid input (no mutation). */
  function signIn(opts) {
    opts = opts || {};
    var email = typeof opts.email === "string" ? opts.email.replace(/^\s+|\s+$/g, "") : "";
    var name = typeof opts.name === "string" ? opts.name.replace(/^\s+|\s+$/g, "") : "";
    var business = typeof opts.business === "string" ? opts.business.replace(/^\s+|\s+$/g, "") : "";
    var plan = (typeof opts.plan === "string" && opts.plan.replace(/^\s+|\s+$/g, "")) || DEFAULT_PLAN;
    if (!EMAIL_RE.test(email) || !name || !business) return null;
    var state = {
      session: { email: email, name: name, business: business, plan: plan, createdAt: nowISO() },
      onboarding: freshOnboarding()
    };
    saveState(state);
    return copy(state.session);
  }

  function signOut() {
    if (isDemo()) { demoMem = null; }
    else { try { rawRemove(); } catch (e) { /* ignore */ } }
    notify();
  }

  function getOnboarding() {
    var ob = loadState().onboarding;
    var out = copy(ob);
    out.step = computeStep(ob);
    return out;
  }

  /* Idempotent stage stamps: only write (and notify) when something changes. */

  function markWelcomed() {
    var state = loadState();
    if (!state.onboarding.welcomedAt) {
      state.onboarding.welcomedAt = nowISO();
      saveState(state);
    }
    return { ok: true, state: publicSnapshot() };
  }

  function markAgreementViewed() {
    var state = loadState();
    if (!state.onboarding.agreementViewedAt) {
      state.onboarding.agreementViewedAt = nowISO();
      saveState(state);
    }
    return { ok: true, state: publicSnapshot() };
  }

  function signAgreement(typedName) {
    var name = typeof typedName === "string" ? typedName.replace(/^\s+|\s+$/g, "") : "";
    if (!name) return { ok: false, error: "Type your full name to sign." };
    var state = loadState();
    if (state.session && norm(name) !== norm(state.session.name)) {
      return { ok: false, error: "Signature must match the account name (" + state.session.name + ")." };
    }
    if (!state.onboarding.signedAt) {
      state.onboarding.signedAt = nowISO();
      state.onboarding.signedName = name;
      saveState(state);
    }
    return { ok: true, state: publicSnapshot() };
  }

  function markPaid() {
    var state = loadState();
    if (!state.onboarding.signedAt) return { ok: false, error: "sign first" };
    if (!state.onboarding.paidAt) {
      var ts = nowISO();
      state.onboarding.paidAt = ts;
      state.onboarding.liveAt = ts; /* systems go live on payment */
      saveState(state);
    }
    return { ok: true, state: publicSnapshot() };
  }

  function onChange(cb) {
    if (typeof cb !== "function") return function () {};
    listeners.push(cb);
    return function unsubscribe() {
      var i = listeners.indexOf(cb);
      if (i > -1) listeners.splice(i, 1);
    };
  }

  function metrics() {
    var ob = loadState().onboarding;
    return ob.paidAt ? copy(LIVE_METRICS) : copy(LOCKED_METRICS);
  }

  function reset() {
    demoMem = null;
    try { rawRemove(); } catch (e) { /* ignore */ }
    notify();
  }

  /* Cross-tab sync: an installed PWA window and a browser tab share localStorage;
   * the 'storage' event re-notifies subscribers when the other context mutates. */
  if (root.addEventListener) {
    try {
      root.addEventListener("storage", function (e) {
        if (!e || !e.key || e.key === STORAGE_KEY) notify();
      });
    } catch (e) { /* ignore */ }
  }

  /* ---------------------------------------------------------------- selfTest */

  function _selfTest() {
    var details = [], passed = 0, failed = 0;

    function check(name, cond, info) {
      var ok = !!cond;
      if (ok) passed++; else failed++;
      details.push({ name: name, pass: ok, info: info || "" });
    }

    function makeStorageShim() {
      return {
        data: {}, writes: 0,
        getItem: function (k) { return Object.prototype.hasOwnProperty.call(this.data, k) ? this.data[k] : null; },
        setItem: function (k, v) { this.writes++; this.data[k] = String(v); },
        removeItem: function (k) { this.writes++; delete this.data[k]; }
      };
    }

    /* Snapshot real module state, then run entirely against shims. */
    var savedListeners = listeners, savedDemoMem = demoMem;
    listeners = [];
    demoMem = null;
    var shim = makeStorageShim();
    testOverrides = { search: "", storage: shim };

    try {
      /* 1 — fresh signIn lands on step "welcome" */
      reset();
      var sess = signIn({ email: "sarah@radiancemedspa.com", name: "Sarah Reyes", business: "Radiance Med Spa" });
      check("signIn returns session", sess && sess.email === "sarah@radiancemedspa.com" && sess.name === "Sarah Reyes", JSON.stringify(sess));
      check("plan defaults to Visibility+", sess && sess.plan === "Visibility+");
      check("fresh signIn -> step welcome", getOnboarding().step === "welcome", "step=" + getOnboarding().step);
      check("metrics locked before paid", metrics().locked === true && metrics().recovered === 0);

      /* 2 — invalid signIn rejected, no mutation */
      var bad = signIn({ email: "not-an-email", name: "X", business: "Y" });
      check("invalid email signIn -> null", bad === null);
      check("invalid signIn did not clobber session", getSession() && getSession().name === "Sarah Reyes");

      /* 3 — markPaid before sign rejected */
      var pre = markPaid();
      check("markPaid before sign rejected", pre.ok === false && pre.error === "sign first", JSON.stringify(pre));

      /* 4 — signAgreement name mismatch rejected */
      var mm = signAgreement("Someone Else");
      check("signAgreement mismatch rejected", mm.ok === false && !!mm.error, JSON.stringify(mm.error));
      var empty = signAgreement("   ");
      check("signAgreement empty rejected", empty.ok === false);

      /* 5 — full happy path to "live" */
      var w = markWelcomed();
      check("markWelcomed ok -> step agreement", w.ok === true && getOnboarding().step === "agreement");
      var av = markAgreementViewed();
      check("agreementViewedAt stamped, step stays agreement", av.ok === true && !!getOnboarding().agreementViewedAt && getOnboarding().step === "agreement");
      var sg = signAgreement("  sarah reyes  "); /* loose match: case-insensitive, trimmed */
      check("signAgreement loose match ok -> step payment", sg.ok === true && getOnboarding().step === "payment", JSON.stringify(sg.error || ""));
      var pd = markPaid();
      check("markPaid ok -> step live", pd.ok === true && getOnboarding().step === "live");
      check("liveAt stamped on pay", !!getOnboarding().liveAt && !!getOnboarding().paidAt);
      var m = metrics();
      check("metrics unlocked after paid", m.locked === false && m.recovered === 4180 && m.deltaPct === 18 && m.calls === 23 && m.reviews === 19 && m.quotes === 38, JSON.stringify(m));

      /* 6 — idempotency: double-calls don't corrupt */
      var t1 = getOnboarding();
      markWelcomed(); markAgreementViewed(); signAgreement("Sarah Reyes"); markPaid();
      var t2 = getOnboarding();
      check("idempotent double-calls keep timestamps",
        t1.welcomedAt === t2.welcomedAt && t1.signedAt === t2.signedAt && t1.paidAt === t2.paidAt && t1.liveAt === t2.liveAt && t2.step === "live",
        JSON.stringify(t2));

      /* 7 — corrupt storage treated as signed-out, never throws */
      shim.data[STORAGE_KEY] = "{corrupt json!!";
      var corrupt = null, threw = false;
      try { corrupt = getSession(); } catch (e) { threw = true; }
      check("corrupt storage -> signed out, no throw", threw === false && corrupt === null && getOnboarding().step === "welcome");

      /* 8 — onChange fires on mutation; unsubscribe stops it */
      reset();
      var fires = 0;
      var un = onChange(function () { fires++; });
      signIn({ email: "a@b.co", name: "A B", business: "Biz" });
      markWelcomed();
      var afterTwo = fires;
      un();
      markAgreementViewed();
      check("onChange fires on mutations", afterTwo >= 2, "fires=" + afterTwo);
      check("unsubscribe stops notifications", fires === afterTwo, "fires=" + fires);

      /* 9 — demo mode: completed persona, memory only, storage untouched */
      reset();
      var writesBefore = shim.writes;
      testOverrides.search = "?embed=1&x=2";
      demoMem = null;
      check("isDemo true with embed=1", isDemo() === true);
      var ds = getSession();
      check("demo session is Sarah / Visibility+", ds && ds.name === "Sarah Reyes" && ds.business === "Radiance Med Spa" && ds.plan === "Visibility+", JSON.stringify(ds));
      var dob = getOnboarding();
      check("demo onboarding complete -> step live", dob.step === "live" && !!dob.signedAt && !!dob.paidAt && !!dob.liveAt);
      check("demo timestamps in June 2026", String(dob.signedAt).indexOf("2026-06") === 0 && String(dob.paidAt).indexOf("2026-06") === 0, dob.signedAt + " / " + dob.paidAt);
      check("demo metrics unlocked", metrics().locked === false && metrics().recovered === 4180);
      markWelcomed(); signAgreement("Sarah Reyes"); markPaid(); /* mutations stay in memory */
      check("demo mode never writes storage", shim.writes === writesBefore, "writes=" + (shim.writes - writesBefore));
      testOverrides.search = "?demo=1";
      check("isDemo true with demo=1", isDemo() === true);
      testOverrides.search = "";
      check("isDemo false without flags", isDemo() === false);
    } finally {
      /* Restore real module state no matter what. */
      testOverrides = null;
      listeners = savedListeners;
      demoMem = savedDemoMem;
    }

    return { passed: passed, failed: failed, details: details };
  }

  /* ------------------------------------------------------------------ expose */

  root.RRState = {
    STORAGE_KEY: STORAGE_KEY,
    isDemo: isDemo,
    getSession: getSession,
    signIn: signIn,
    signOut: signOut,
    getOnboarding: getOnboarding,
    markWelcomed: markWelcomed,
    markAgreementViewed: markAgreementViewed,
    signAgreement: signAgreement,
    markPaid: markPaid,
    onChange: onChange,
    metrics: metrics,
    reset: reset,
    _selfTest: _selfTest
  };
})();
