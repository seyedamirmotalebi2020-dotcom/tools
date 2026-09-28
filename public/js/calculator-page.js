// public/js/calculator-page.js
// Generic wiring for every calculator page on tools.land.me.uk.
// Dispatches by data-tool attribute on .tool-card.

import {
  percentage, age, dateDiff, tip, discount,
  unitConverter, bmi, loan, wordCounter,
  caseConverter, passwordGenerator,
} from './calculators.js';

// ══════════════════════════════════════════════════════════════════
// SHARED HELPERS
// ══════════════════════════════════════════════════════════════════

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function flash(btn, msg, kind = 'ok') {
  const original = btn.innerHTML;
  btn.innerHTML = msg;
  btn.classList.add('flash', kind);
  setTimeout(() => {
    btn.innerHTML = original;
    btn.classList.remove('flash', kind);
  }, 1400);
}

function fallbackCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand('copy'); } catch {}
  document.body.removeChild(ta);
}

async function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
  } else {
    fallbackCopy(text);
  }
}

function useResult(resultEl) {
  function set(result) {
    if (!resultEl) return;
    const valueEl   = resultEl.querySelector('[data-result-value]');
    const detailEl  = resultEl.querySelector('[data-result-detail]');
    const formulaEl = resultEl.querySelector('[data-result-formula]');

    if (!result) {
      resultEl.classList.remove('has-value');
      if (valueEl)   valueEl.textContent = '—';
      if (detailEl)  detailEl.textContent = '';
      if (formulaEl) { formulaEl.textContent = ''; formulaEl.classList.remove('show'); }
      delete resultEl.dataset.tone;
      return;
    }

    if (valueEl)   valueEl.textContent  = result.display ?? '—';
    if (detailEl)  detailEl.textContent = result.detail ?? '';
    if (formulaEl && result.formula) {
      formulaEl.textContent = result.formula;
      formulaEl.classList.add('show');
    }

    resultEl.classList.remove('has-value');
    void resultEl.offsetWidth;
    resultEl.classList.add('has-value');

    if (result.tone) resultEl.dataset.tone = result.tone;
    else delete resultEl.dataset.tone;
  }
  return { set };
}

function debounce(fn, ms = 120) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

function wireInputs(inputs, recalc) {
  inputs.forEach((el) => {
    if (!el) return;
    el.addEventListener('input', recalc);
    el.addEventListener('change', recalc);
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); recalc(); }
    });
  });
}

function simpleCalc(root, readFn) {
  const resultEl = root.querySelector('[data-result]');
  const copyBtn  = root.querySelector('[data-action="copy"]');
  const resetBtn = root.querySelector('[data-action="reset"]');
  const r = useResult(resultEl);

  const recalc = debounce(() => {
    const out = readFn();
    r.set(out);
  });

  const inputs = root.querySelectorAll('input, select');
  wireInputs([...inputs], recalc);

  copyBtn?.addEventListener('click', async () => {
    const out = readFn();
    if (!out) { flash(copyBtn, 'Nothing to copy', 'warn'); return; }
    try {
      await copyText(out.detail || out.display);
      flash(copyBtn, '<i class="fas fa-check"></i> Copied', 'ok');
    } catch {
      flash(copyBtn, 'Copy failed', 'warn');
    }
  });

  resetBtn?.addEventListener('click', () => {
    inputs.forEach((el) => {
      if (el.tagName === 'SELECT') el.selectedIndex = 0;
      else el.value = '';
    });
    root.querySelectorAll('[data-preset]').forEach((b) => b.classList.remove('active'));
    r.set(null);
    inputs[0]?.focus({ preventScroll: true });
    flash(resetBtn, '<i class="fas fa-check"></i> Cleared', 'ok');
  });

  recalc();
}

// ══════════════════════════════════════════════════════════════════
// PERCENTAGE — flagship calculator, six modes
// ══════════════════════════════════════════════════════════════════

function initPercentage(root) {
  const tabs      = root.querySelectorAll('.tool-tab');
  const panels    = root.querySelectorAll('.tool-panel');
  const resultEl  = root.querySelector('[data-result]');
  const copyBtn   = root.querySelector('[data-action="copy"]');
  const shareBtn  = root.querySelector('[data-action="share"]');
  const resetBtn  = root.querySelector('[data-action="reset"]');
  const historyEl = root.querySelector('[data-history]');
  const r = useResult(resultEl);

  const inputs = {
    of:        [root.querySelector('#pctOfPercent'),  root.querySelector('#pctOfNumber')],
    isWhat:    [root.querySelector('#pctIsNumber'),   root.querySelector('#pctIsTotal')],
    change:    [root.querySelector('#pctChangeFrom'), root.querySelector('#pctChangeTo')],
    increase:  [root.querySelector('#pctIncValue'),   root.querySelector('#pctIncPercent')],
    decrease:  [root.querySelector('#pctDecValue'),   root.querySelector('#pctDecPercent')],
    findWhole: [root.querySelector('#pctFwPart'),     root.querySelector('#pctFwPercent')],
  };

  const HISTORY_KEY = 'tools.pct.history';
  let mode = 'of';
  let calcHistory = readHistory();

  function setMode(next) {
    if (!inputs[next]) next = 'of';
    mode = next;
    tabs.forEach((t) => {
      const active = t.dataset.mode === mode;
      t.classList.toggle('active', active);
      t.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    panels.forEach((p) => p.classList.toggle('hidden', p.dataset.panel !== mode));
    recalc();
  }

  function read() {
    const [a, b] = inputs[mode] || [];
    const va = a?.value ?? '', vb = b?.value ?? '';
    switch (mode) {
      case 'of':        return percentage.of(va, vb);
      case 'isWhat':    return percentage.isWhat(va, vb);
      case 'change':    return percentage.change(va, vb);
      case 'increase':  return percentage.increaseBy(va, vb);
      case 'decrease':  return percentage.decreaseBy(va, vb);
      case 'findWhole': return percentage.findWhole(va, vb);
    }
    return null;
  }

  const recalc = debounce(() => {
    const out = read();
    r.set(out);
    syncUrl(out);
  });

  const recalcWithHistory = debounce(() => {
    const out = read();
    r.set(out);
    syncUrl(out);
    if (out) addToHistory(out);
  }, 500);

  function syncUrl(out) {
    try {
      const params = new URLSearchParams();
      if (out) {
        params.set('mode', mode);
        const [a, b] = inputs[mode] || [];
        const keys = {
          of:        ['percent', 'number'],
          isWhat:    ['number',  'total'],
          change:    ['from',    'to'],
          increase:  ['value',   'percent'],
          decrease:  ['value',   'percent'],
          findWhole: ['part',    'percent'],
        }[mode] || [];
        if (a?.value && keys[0]) params.set(keys[0], a.value);
        if (b?.value && keys[1]) params.set(keys[1], b.value);
      }
      const qs = params.toString();
      window.history.replaceState(null, '', qs ? `${location.pathname}?${qs}` : location.pathname);
    } catch { /* ignore */ }
  }

  function loadFromUrl() {
    const p = new URLSearchParams(location.search);
    const m = p.get('mode');
    if (m && inputs[m]) mode = m;

    if (mode === 'of') {
      if (p.get('percent') && inputs.of[0]) inputs.of[0].value = p.get('percent');
      if (p.get('number')  && inputs.of[1]) inputs.of[1].value = p.get('number');
    } else if (mode === 'isWhat') {
      if (p.get('number') && inputs.isWhat[0]) inputs.isWhat[0].value = p.get('number');
      if (p.get('total')  && inputs.isWhat[1]) inputs.isWhat[1].value = p.get('total');
    } else if (mode === 'change') {
      if (p.get('from') && inputs.change[0]) inputs.change[0].value = p.get('from');
      if (p.get('to')   && inputs.change[1]) inputs.change[1].value = p.get('to');
    } else if (mode === 'increase') {
      if (p.get('value')   && inputs.increase[0]) inputs.increase[0].value = p.get('value');
      if (p.get('percent') && inputs.increase[1]) inputs.increase[1].value = p.get('percent');
    } else if (mode === 'decrease') {
      if (p.get('value')   && inputs.decrease[0]) inputs.decrease[0].value = p.get('value');
      if (p.get('percent') && inputs.decrease[1]) inputs.decrease[1].value = p.get('percent');
    } else if (mode === 'findWhole') {
      if (p.get('part')    && inputs.findWhole[0]) inputs.findWhole[0].value = p.get('part');
      if (p.get('percent') && inputs.findWhole[1]) inputs.findWhole[1].value = p.get('percent');
    }

    tabs.forEach((t) => {
      const active = t.dataset.mode === mode;
      t.classList.toggle('active', active);
      t.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    panels.forEach((p2) => p2.classList.toggle('hidden', p2.dataset.panel !== mode));

    recalc();
  }

  tabs.forEach((t) => t.addEventListener('click', () => setMode(t.dataset.mode)));

  Object.values(inputs).flat().forEach((el) => {
    if (!el) return;
    el.addEventListener('input', recalcWithHistory);
    el.addEventListener('change', recalcWithHistory);
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); recalcWithHistory(); }
    });
  });

  root.querySelectorAll('[data-preset]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const panel = btn.closest('.tool-panel');
      const targetId = btn.dataset.presetTarget;
      const value = btn.dataset.preset;
      const input = targetId
        ? root.querySelector('#' + targetId)
        : panel?.querySelector('input[type="number"]');
      if (input) {
        input.value = value;
        panel?.querySelectorAll('[data-preset]').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        recalcWithHistory();
      }
    });
  });

  function readHistory() {
    try {
      const raw = sessionStorage.getItem(HISTORY_KEY);
      return raw ? JSON.parse(raw).slice(0, 5) : [];
    } catch { return []; }
  }

  function writeHistory() {
    try {
      sessionStorage.setItem(HISTORY_KEY, JSON.stringify(calcHistory.slice(0, 5)));
    } catch { /* storage disabled */ }
  }

  function addToHistory(out) {
    if (!out?.detail) return;
    if (calcHistory[0]?.text === out.detail) return;

    calcHistory.unshift({
      text: out.detail,
      mode,
      values: Object.fromEntries(
        (inputs[mode] || []).map((el, i) => [i, el?.value ?? ''])
      ),
    });
    calcHistory = calcHistory.slice(0, 5);
    writeHistory();
    renderHistory();
  }

  function renderHistory() {
    if (!historyEl) return;
    if (!calcHistory.length) {
      historyEl.classList.remove('show');
      historyEl.innerHTML = '';
      return;
    }
    historyEl.classList.add('show');
    historyEl.innerHTML = `
      <div class="tool-history__head">
        <span><i class="fas fa-clock-rotate-left"></i> Recent</span>
        <button type="button" class="tool-history__clear" aria-label="Clear history">
          <i class="fas fa-trash-can"></i> Clear
        </button>
      </div>
      <ul class="tool-history__list">
        ${calcHistory.map((h, i) => `
          <li>
            <button type="button" class="tool-history__item" data-history-index="${i}">
              <i class="fas fa-rotate-right"></i>
              <span>${escapeHtml(h.text)}</span>
            </button>
          </li>
        `).join('')}
      </ul>
    `;

    historyEl.querySelectorAll('[data-history-index]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.dataset.historyIndex);
        const h = calcHistory[idx];
        if (!h) return;
        Object.entries(h.values).forEach(([i, v]) => {
          const el = inputs[h.mode]?.[Number(i)];
          if (el) el.value = v;
        });
        setMode(h.mode);
      });
    });

    historyEl.querySelector('.tool-history__clear')?.addEventListener('click', () => {
      calcHistory = [];
      writeHistory();
      renderHistory();
    });
  }

  copyBtn?.addEventListener('click', async () => {
    const out = read();
    if (!out) { flash(copyBtn, 'Nothing to copy', 'warn'); return; }
    try {
      const text = out.detail + (out.formula ? '\n' + out.formula : '');
      await copyText(text);
      flash(copyBtn, '<i class="fas fa-check"></i> Copied', 'ok');
    } catch {
      flash(copyBtn, 'Copy failed', 'warn');
    }
  });

  shareBtn?.addEventListener('click', async () => {
    const out = read();
    if (!out) { flash(shareBtn, 'Nothing to share', 'warn'); return; }
    try {
      const url = location.href;
      if (navigator.share) {
        await navigator.share({ title: 'Percentage calculation', text: out.detail, url });
      } else {
        await copyText(url);
        flash(shareBtn, '<i class="fas fa-check"></i> Link copied', 'ok');
      }
    } catch { /* user cancelled */ }
  });

  resetBtn?.addEventListener('click', () => {
    Object.values(inputs).flat().forEach((el) => { if (el) el.value = ''; });
    root.querySelectorAll('[data-preset]').forEach((b) => b.classList.remove('active'));
    r.set(null);
    syncUrl(null);
    inputs[mode]?.[0]?.focus({ preventScroll: true });
    flash(resetBtn, '<i class="fas fa-check"></i> Cleared', 'ok');
  });

  renderHistory();
  loadFromUrl();
}
// ══════════════════════════════════════════════════════════════════
// PASSWORD GENERATOR
// ══════════════════════════════════════════════════════════════════

function initPasswordGenerator(root) {
  const tabs        = root.querySelectorAll('.tool-tab');
  const panels      = root.querySelectorAll('.tool-panel');

  // Password panel
  const lengthInput = root.querySelector('#pwLength');
  const lengthLabel = root.querySelector('#pwLengthLabel');
  const optLower    = root.querySelector('#pwLower');
  const optUpper    = root.querySelector('#pwUpper');
  const optDigits   = root.querySelector('#pwDigits');
  const optSymbols  = root.querySelector('#pwSymbols');
  const optSimilar  = root.querySelector('#pwSimilar');
  const optAmbigu   = root.querySelector('#pwAmbiguous');
  const optGuarantee = root.querySelector('#pwGuarantee');
    const genOutputs   = root.querySelector('#pwGenerateOutputs');
  const checkInput   = root.querySelector('#pwCheckInput');
  const checkEye     = root.querySelector('#pwCheckEye');
  const checkResult  = root.querySelector('#pwCheckResult');

  // Passphrase panel
  const wordsInput  = root.querySelector('#phWords');
  const wordsLabel  = root.querySelector('#phWordsLabel');
  const sepSelect   = root.querySelector('#phSep');
  const optCap      = root.querySelector('#phCap');
  const optNum      = root.querySelector('#phNum');

  // Shared outputs
  const outputEl    = root.querySelector('[data-pw-output]');
  const strengthBar = root.querySelector('[data-pw-bar]');
  const strengthLbl = root.querySelector('[data-pw-strength-label]');
  const strengthVal = root.querySelector('[data-pw-strength-value]');
  const entropyEl   = root.querySelector('[data-pw-entropy]');
  const crackEl     = root.querySelector('[data-pw-crack]');
  const copyBtn     = root.querySelector('[data-action="copy"]');
  const regenBtn    = root.querySelector('[data-action="regen"]');
  const batchList   = root.querySelector('[data-pw-batch]');
  const batchSection = root.querySelector('[data-pw-batch-section]');

  let mode = 'password';
  let currentValue = '';

  // ── Mode switching ──
  function setMode(next) {
    if (!['password', 'passphrase', 'check'].includes(next)) next = 'password';
    mode = next;
    tabs.forEach((t) => {
      const active = t.dataset.mode === mode;
      t.classList.toggle('active', active);
      t.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    panels.forEach((p) => p.classList.toggle('hidden', p.dataset.panel !== mode));

    // Hide the generate outputs when in check mode
    if (genOutputs) genOutputs.classList.toggle('hidden', mode === 'check');

    if (mode === 'check') {
      checkInput?.focus({ preventScroll: true });
      renderCheck();
    } else {
      generate();
    }
  }

  tabs.forEach((t) => t.addEventListener('click', () => setMode(t.dataset.mode)));

  // ── Options readers ──
  function readPasswordOpts() {
    return {
      length: Number(lengthInput?.value) || 16,
      lowercase: !!optLower?.checked,
      uppercase: !!optUpper?.checked,
      digits:    !!optDigits?.checked,
      symbols:   !!optSymbols?.checked,
      excludeSimilar:  !!optSimilar?.checked,
      excludeAmbiguous: !!optAmbigu?.checked,
      guaranteeEach:   !!optGuarantee?.checked,
    };
  }

  function readPassphraseOpts() {
    return {
      words: Number(wordsInput?.value) || 6,
      separator: sepSelect?.value ?? '-',
      capitalize: !!optCap?.checked,
      addNumber:  !!optNum?.checked,
    };
  }

  // ── Generate and render ──
  function generate() {
    let value = '';
    let bits = 0;
    let extra = '';

    if (mode === 'password') {
      const opts = readPasswordOpts();
      if (!opts.lowercase && !opts.uppercase && !opts.digits && !opts.symbols) {
        // Nothing selected — force lowercase
        if (optLower) optLower.checked = true;
        opts.lowercase = true;
      }
      const gen = passwordGenerator.generate(opts);
      if (!gen) return;
      value = gen;
      const analysis = passwordGenerator.analyzePassword(opts);
      bits = analysis.bits;
      extra = `${analysis.charsetSize} possible characters per position`;
    } else {
      const opts = readPassphraseOpts();
      value = passwordGenerator.generatePassphrase(opts);
      const analysis = passwordGenerator.analyzePassphrase(opts);
      bits = analysis.bits;
      extra = `${analysis.wordCount} words from a ${analysis.wordListSize.toLocaleString()}-word list`;
    }

    currentValue = value;

    // Output
    if (outputEl) {
      outputEl.textContent = value;
      outputEl.classList.remove('has-value');
      void outputEl.offsetWidth;
      outputEl.classList.add('has-value');
    }

    // Strength
    const s = passwordGenerator.strength(bits);
    if (strengthBar) {
      strengthBar.style.width = s.pct + '%';
      strengthBar.dataset.tone = s.tone;
    }
    if (strengthLbl) strengthLbl.textContent = s.label;
    if (strengthVal) strengthVal.textContent = passwordGenerator.entropy(bits) + ' bits';

    if (entropyEl) entropyEl.textContent = extra;
    if (crackEl) {
      crackEl.textContent = passwordGenerator.crackTime(bits);
    }

    // Regenerate batch of 5 for password mode
    if (mode === 'password' && batchSection && batchList) {
      const opts = readPasswordOpts();
      const batch = passwordGenerator.generateBatch(opts, 5);
      batchList.innerHTML = batch.map((p, i) => `
        <li class="pw-batch__item">
          <code class="pw-batch__value">${escapeHtml(p)}</code>
          <button type="button" class="pw-batch__copy" data-pw-copy="${i}" aria-label="Copy">
            <i class="fas fa-copy"></i>
          </button>
        </li>
      `).join('');

      batchList.querySelectorAll('[data-pw-copy]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const idx = Number(btn.dataset.pwCopy);
          const p = batch[idx];
          if (!p) return;
          try {
            await copyText(p);
            flash(btn, '<i class="fas fa-check"></i>', 'ok');
          } catch { flash(btn, '!', 'warn'); }
        });
      });
    } else if (batchSection) {
      batchSection.classList.add('hidden');
    }
  }
    // ── Check rendering ──
  function renderCheck() {
    if (!checkResult) return;
    const val = checkInput?.value ?? '';

    if (!val) {
      checkResult.innerHTML = `
        <div class="pw-check-empty">
          <i class="fas fa-magnifying-glass"></i>
          <p>Type or paste a password to see how strong it is.</p>
        </div>
      `;
      return;
    }

    const r = passwordGenerator.check(val);
    if (!r) return;

    // Character classes tags
    const classTags = [
      { key: 'lower',   label: 'a–z',    active: r.hasLower   },
      { key: 'upper',   label: 'A–Z',    active: r.hasUpper   },
      { key: 'digits',  label: '0–9',    active: r.hasDigits  },
      { key: 'symbols', label: '!@#',    active: r.hasSymbols },
    ];

    const warningsHtml = r.warnings.length
      ? r.warnings.map((w) => `
          <li class="pw-check-warning">
            <i class="fas fa-triangle-exclamation"></i>
            <span>${escapeHtml(w.text)}</span>
          </li>
        `).join('')
      : `<li class="pw-check-ok"><i class="fas fa-circle-check"></i> <span>No obvious weaknesses detected.</span></li>`;

    const suggestionsHtml = r.suggestions.length
      ? r.suggestions.map((s) => `
          <li class="pw-check-suggestion">
            <i class="fas fa-lightbulb"></i>
            <span>${escapeHtml(s)}</span>
          </li>
        `).join('')
      : '';

    // Common password warning gets extra emphasis
    const commonBanner = r.isCommon
      ? `<div class="pw-check-common"><i class="fas fa-circle-exclamation"></i> This is a well-known password. Change it immediately.</div>`
      : '';

    checkResult.innerHTML = `
      <div class="pw-check-strength">
        <div class="pw-check-strength__head">
          <span class="pw-check-strength__label">${escapeHtml(r.strength.label)}</span>
          <span class="pw-check-strength__bits">${r.bits.toFixed(1)} bits</span>
        </div>
        <div class="pw-strength__track">
          <div class="pw-strength__fill" data-tone="${r.strength.tone}" style="width:${r.strength.pct}%"></div>
        </div>
      </div>

      ${commonBanner}

      <div class="pw-check-crack">
        <i class="fas fa-hourglass-half"></i>
        <span>Time to crack: <strong>${escapeHtml(r.crackTime)}</strong></span>
        <span class="pw-strength__note">(assumes 10 billion guesses per second)</span>
      </div>

      <div class="pw-check-classes">
        ${classTags.map((t) => `
          <span class="pw-check-class ${t.active ? 'active' : ''}">
            <i class="fas ${t.active ? 'fa-circle-check' : 'fa-circle-xmark'}"></i>
            ${escapeHtml(t.label)}
          </span>
        `).join('')}
        <span class="pw-check-class pw-check-class--plain">
          ${r.length} char${r.length === 1 ? '' : 's'}
        </span>
      </div>

      <div class="pw-check-block">
        <div class="pw-check-block__title">
          <i class="fas fa-triangle-exclamation"></i> Weaknesses
        </div>
        <ul class="pw-check-list">
          ${warningsHtml}
        </ul>
      </div>

      ${suggestionsHtml ? `
        <div class="pw-check-block">
          <div class="pw-check-block__title">
            <i class="fas fa-lightbulb"></i> Suggestions
          </div>
          <ul class="pw-check-list">
            ${suggestionsHtml}
          </ul>
        </div>
      ` : ''}
    `;
  }

  checkInput?.addEventListener('input', renderCheck);

  checkEye?.addEventListener('click', () => {
    const showing = checkInput.type === 'text';
    checkInput.type = showing ? 'password' : 'text';
    const icon = checkEye.querySelector('i');
    if (icon) icon.className = showing ? 'fas fa-eye' : 'fas fa-eye-slash';
    checkEye.setAttribute('aria-label', showing ? 'Show password' : 'Hide password');
    checkInput.focus({ preventScroll: true });
  });

  // ── Wire controls ──
  lengthInput?.addEventListener('input', () => {
    if (lengthLabel) lengthLabel.textContent = lengthInput.value;
    generate();
  });

  wordsInput?.addEventListener('input', () => {
    if (wordsLabel) wordsLabel.textContent = wordsInput.value;
    generate();
  });

  [optLower, optUpper, optDigits, optSymbols, optSimilar, optAmbigu, optGuarantee].forEach((el) => {
    el?.addEventListener('change', generate);
  });

  [sepSelect, optCap, optNum].forEach((el) => {
    el?.addEventListener('change', generate);
  });

  // ── Copy ──
  copyBtn?.addEventListener('click', async () => {
    if (!currentValue) { flash(copyBtn, 'Nothing to copy', 'warn'); return; }
    try {
      await copyText(currentValue);
      flash(copyBtn, '<i class="fas fa-check"></i> Copied', 'ok');
    } catch {
      flash(copyBtn, 'Copy failed', 'warn');
    }
  });

  // ── Regenerate ──
  regenBtn?.addEventListener('click', () => {
    generate();
    regenBtn.classList.add('spin');
    setTimeout(() => regenBtn.classList.remove('spin'), 400);
  });

  // ── Boot ──
  generate();
}
// ══════════════════════════════════════════════════════════════════
// QR CODE GENERATOR
// ══════════════════════════════════════════════════════════════════

function initQRGenerator(root) {
  // qrcode-generator library is loaded as a global by /js/vendor/qrcode.js
  if (typeof qrcode !== 'function') {
    console.error('[qr] qrcode-generator library not loaded');
    return;
  }

  const tabs      = root.querySelectorAll('.tool-tab');
  const panels    = root.querySelectorAll('.tool-panel');
  const canvas    = root.querySelector('#qrCanvas');
  const placeholder = root.querySelector('#qrPlaceholder');
  const encoding  = root.querySelector('#qrEncoding');

  const pngBtn    = root.querySelector('[data-action="download-png"]');
  const svgBtn    = root.querySelector('[data-action="download-svg"]');
  const copyImgBtn = root.querySelector('[data-action="copy-image"]');
  const resetBtn  = root.querySelector('[data-action="reset"]');

  const sizeSlider = root.querySelector('#qrSize');
  const sizeLabel  = root.querySelector('#qrSizeLabel');
  const fgInput    = root.querySelector('#qrFg');
  const fgHex      = root.querySelector('#qrFgHex');
  const bgInput    = root.querySelector('#qrBg');
  const bgHex      = root.querySelector('#qrBgHex');
  const eclSelect  = root.querySelector('#qrEcl');
  const quietCheck = root.querySelector('#qrQuiet');

  // Text / URL inputs
  const textInput  = root.querySelector('#qrText');

  // Wi-Fi inputs
  const wifiSsid   = root.querySelector('#qrWifiSsid');
  const wifiPass   = root.querySelector('#qrWifiPass');
  const wifiEnc    = root.querySelector('#qrWifiEnc');
  const wifiHidden = root.querySelector('#qrWifiHidden');

  // vCard inputs
  const vcFirst = root.querySelector('#qrVcFirst');
  const vcLast  = root.querySelector('#qrVcLast');
  const vcPhone = root.querySelector('#qrVcPhone');
  const vcEmail = root.querySelector('#qrVcEmail');
  const vcOrg   = root.querySelector('#qrVcOrg');
  const vcUrl   = root.querySelector('#qrVcUrl');

  // Email inputs
  const emailTo      = root.querySelector('#qrEmailTo');
  const emailSubject = root.querySelector('#qrEmailSubject');
  const emailBody    = root.querySelector('#qrEmailBody');

  // SMS inputs
  const smsTo   = root.querySelector('#qrSmsTo');
  const smsBody = root.querySelector('#qrSmsBody');

  let mode = 'text';
  let currentQR = null;   // last qr object
  let currentData = '';   // last encoded string
  let currentOpts = { size: 320, fg: '#0f172a', bg: '#ffffff', ecl: 'M', quiet: true };

  // ── Escape for special formats ──
  function escapeWifi(s) {
    // Escape \;, \,, \", \\, \: per Wi-Fi QR spec
    return String(s ?? '').replace(/([\\;,:"])/g, '\\$1');
  }

  // ── Build the data string from the current mode ──
  function buildData() {
    if (mode === 'text') {
      return textInput?.value ?? '';
    }

    if (mode === 'wifi') {
      const ssid = wifiSsid?.value ?? '';
      if (!ssid) return '';
      const enc = wifiEnc?.value || 'WPA';
      const pass = wifiPass?.value ?? '';
      const hidden = wifiHidden?.checked ? 'true' : 'false';
      const passPart = enc === 'nopass' ? '' : `P:${escapeWifi(pass)};`;
      const hiddenPart = hidden === 'true' ? `H:true;` : '';
      return `WIFI:T:${enc};S:${escapeWifi(ssid)};${passPart}${hiddenPart};`;
    }

    if (mode === 'vcard') {
      const first = vcFirst?.value?.trim() ?? '';
      const last  = vcLast?.value?.trim() ?? '';
      if (!first && !last) return '';
      const lines = [
        'BEGIN:VCARD',
        'VERSION:3.0',
        `N:${last};${first};;;`,
        `FN:${[first, last].filter(Boolean).join(' ')}`,
      ];
      if (vcOrg?.value?.trim())   lines.push(`ORG:${vcOrg.value.trim()}`);
      if (vcPhone?.value?.trim()) lines.push(`TEL;TYPE=CELL:${vcPhone.value.trim()}`);
      if (vcEmail?.value?.trim()) lines.push(`EMAIL:${vcEmail.value.trim()}`);
      if (vcUrl?.value?.trim())   lines.push(`URL:${vcUrl.value.trim()}`);
      lines.push('END:VCARD');
      return lines.join('\n');
    }

    if (mode === 'email') {
      const to = emailTo?.value?.trim() ?? '';
      if (!to) return '';
      const subject = emailSubject?.value?.trim() ?? '';
      const body    = emailBody?.value?.trim() ?? '';
      const params = [];
      if (subject) params.push('subject=' + encodeURIComponent(subject));
      if (body)    params.push('body=' + encodeURIComponent(body));
      return `mailto:${to}${params.length ? '?' + params.join('&') : ''}`;
    }

    if (mode === 'sms') {
      const to = smsTo?.value?.trim() ?? '';
      if (!to) return '';
      const body = smsBody?.value?.trim() ?? '';
      return body ? `SMSTO:${to}:${body}` : `SMSTO:${to}`;
    }

    return '';
  }

  // ── Read the appearance options ──
  function readAppearance() {
    return {
      size: Number(sizeSlider?.value) || 320,
      fg:   fgInput?.value || '#0f172a',
      bg:   bgInput?.value || '#ffffff',
      ecl:  eclSelect?.value || 'M',
      quiet: !!quietCheck?.checked,
    };
  }

  // ── Render the QR to the canvas ──
  function render() {
    const data = buildData();
    currentData = data;

    if (!data.trim()) {
      if (placeholder) placeholder.classList.remove('hidden');
      if (canvas) canvas.classList.add('hidden');
      if (encoding) encoding.textContent = '';
      currentQR = null;
      return;
    }

    if (placeholder) placeholder.classList.add('hidden');
    if (canvas) canvas.classList.remove('hidden');

    const opts = readAppearance();
    currentOpts = opts;

    let qr;
    try {
      qr = qrcode(0, opts.ecl); // type 0 = auto-detect version
      qr.addData(data);
      qr.make();
    } catch (err) {
      if (encoding) {
        encoding.textContent = 'Too much data for a QR code. Shorten the content or use a lower error-correction level.';
        encoding.style.color = 'var(--red)';
      }
      currentQR = null;
      return;
    }

    currentQR = qr;
    drawCanvas(qr, opts);

    const moduleCount = qr.getModuleCount();
    if (encoding) {
      const bytes = new Blob([data]).size;
      encoding.textContent = `${moduleCount}×${moduleCount} modules · ${bytes} byte${bytes === 1 ? '' : 's'} · error correction ${opts.ecl}`;
      encoding.style.color = '';
    }
  }

  // ── Draw QR to the canvas ──
  function drawCanvas(qr, opts) {
    if (!canvas) return;
    const moduleCount = qr.getModuleCount();
    const quietModules = opts.quiet ? 4 : 0;
    const totalModules = moduleCount + quietModules * 2;

    // Snap size so each module is an integer number of pixels
    const sizePx = opts.size;
    const moduleSize = Math.max(1, Math.floor(sizePx / totalModules));
    const drawnSize = moduleSize * totalModules;

    canvas.width  = drawnSize;
    canvas.height = drawnSize;
    canvas.style.width  = drawnSize + 'px';
    canvas.style.height = drawnSize + 'px';

    const ctx = canvas.getContext('2d');
    ctx.fillStyle = opts.bg;
    ctx.fillRect(0, 0, drawnSize, drawnSize);

    ctx.fillStyle = opts.fg;
    for (let row = 0; row < moduleCount; row++) {
      for (let col = 0; col < moduleCount; col++) {
        if (qr.isDark(row, col)) {
          const x = (col + quietModules) * moduleSize;
          const y = (row + quietModules) * moduleSize;
          ctx.fillRect(x, y, moduleSize, moduleSize);
        }
      }
    }
  }

  // ── Build SVG string ──
  function buildSVG(qr, opts) {
    const moduleCount = qr.getModuleCount();
    const quietModules = opts.quiet ? 4 : 0;
    const totalModules = moduleCount + quietModules * 2;
    const sizePx = opts.size;

    const parts = [];
    parts.push(`<?xml version="1.0" encoding="UTF-8"?>`);
    parts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${sizePx}" height="${sizePx}" viewBox="0 0 ${totalModules} ${totalModules}" shape-rendering="crispEdges">`);
    parts.push(`<rect width="${totalModules}" height="${totalModules}" fill="${opts.bg}"/>`);
    parts.push(`<g fill="${opts.fg}">`);
    for (let row = 0; row < moduleCount; row++) {
      for (let col = 0; col < moduleCount; col++) {
        if (qr.isDark(row, col)) {
          const x = col + quietModules;
          const y = row + quietModules;
          parts.push(`<rect x="${x}" y="${y}" width="1" height="1"/>`);
        }
      }
    }
    parts.push(`</g>`);
    parts.push(`</svg>`);
    return parts.join('');
  }

  // ── Download helpers ──
  function download(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  function timestamp() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
  }

  // ── Mode switching ──
  function setMode(next) {
    if (!['text', 'wifi', 'vcard', 'email', 'sms'].includes(next)) next = 'text';
    mode = next;
    tabs.forEach((t) => {
      const active = t.dataset.mode === mode;
      t.classList.toggle('active', active);
      t.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    panels.forEach((p) => p.classList.toggle('hidden', p.dataset.panel !== mode));
    render();
  }

  tabs.forEach((t) => t.addEventListener('click', () => setMode(t.dataset.mode)));

  // ── Wire all inputs ──
  const allInputs = [
    textInput, wifiSsid, wifiPass, wifiEnc, wifiHidden,
    vcFirst, vcLast, vcPhone, vcEmail, vcOrg, vcUrl,
    emailTo, emailSubject, emailBody,
    smsTo, smsBody,
  ].filter(Boolean);

  const debouncedRender = debounce(render, 200);

  allInputs.forEach((el) => {
    el.addEventListener('input', debouncedRender);
    el.addEventListener('change', debouncedRender);
  });

  // Appearance changes render immediately (no debounce)
  [sizeSlider, fgInput, bgInput, eclSelect, quietCheck].forEach((el) => {
    el?.addEventListener('input', () => {
      if (el === sizeSlider && sizeLabel) sizeLabel.textContent = sizeSlider.value;
      render();
    });
    el?.addEventListener('change', () => {
      if (el === sizeSlider && sizeLabel) sizeLabel.textContent = sizeSlider.value;
      render();
    });
  });

  // Colour ↔ hex sync
  fgInput?.addEventListener('input', () => { if (fgHex) fgHex.value = fgInput.value; });
  bgInput?.addEventListener('input', () => { if (bgHex) bgHex.value = bgInput.value; });
  fgHex?.addEventListener('input', () => {
    if (/^#[0-9a-f]{6}$/i.test(fgHex.value)) fgInput.value = fgHex.value;
  });
  bgHex?.addEventListener('input', () => {
    if (/^#[0-9a-f]{6}$/i.test(bgHex.value)) bgInput.value = bgHex.value;
  });

  // ── Download PNG ──
  pngBtn?.addEventListener('click', () => {
    if (!currentQR) { flash(pngBtn, 'Nothing to download', 'warn'); return; }
    canvas.toBlob((blob) => {
      if (!blob) { flash(pngBtn, 'Failed', 'warn'); return; }
      download(blob, `qr-${mode}-${timestamp()}.png`);
      flash(pngBtn, '<i class="fas fa-check"></i> Saved', 'ok');
    }, 'image/png');
  });

  // ── Download SVG ──
  svgBtn?.addEventListener('click', () => {
    if (!currentQR) { flash(svgBtn, 'Nothing to download', 'warn'); return; }
    const svg = buildSVG(currentQR, currentOpts);
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    download(blob, `qr-${mode}-${timestamp()}.svg`);
    flash(svgBtn, '<i class="fas fa-check"></i> Saved', 'ok');
  });

  // ── Copy image to clipboard ──
  copyImgBtn?.addEventListener('click', async () => {
    if (!currentQR) { flash(copyImgBtn, 'Nothing to copy', 'warn'); return; }
    try {
      if (!navigator.clipboard || !window.ClipboardItem) {
        flash(copyImgBtn, 'Not supported', 'warn');
        return;
      }
      const blob = await new Promise((res) => canvas.toBlob(res, 'image/png'));
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      flash(copyImgBtn, '<i class="fas fa-check"></i> Copied', 'ok');
    } catch {
      flash(copyImgBtn, 'Copy failed', 'warn');
    }
  });

  // ── Reset ──
  resetBtn?.addEventListener('click', () => {
    allInputs.forEach((el) => {
      if (el.tagName === 'SELECT') el.selectedIndex = 0;
      else if (el.type === 'checkbox') el.checked = false;
      else el.value = '';
    });
    if (sizeSlider) sizeSlider.value = 320;
    if (sizeLabel) sizeLabel.textContent = '320';
    if (fgInput) { fgInput.value = '#0f172a'; if (fgHex) fgHex.value = '#0f172a'; }
    if (bgInput) { bgInput.value = '#ffffff'; if (bgHex) bgHex.value = '#ffffff'; }
    if (eclSelect) eclSelect.value = 'M';
    if (quietCheck) quietCheck.checked = true;
    render();
    flash(resetBtn, '<i class="fas fa-check"></i> Cleared', 'ok');
  });

  // ── Boot ──
  render();
}
// ══════════════════════════════════════════════════════════════════
// AGE — expanded with full stats grid
// ══════════════════════════════════════════════════════════════════

function initAge(root) {
  const dobInput   = root.querySelector('#ageDob');
  const refInput   = root.querySelector('#ageRef');
  const resultEl   = root.querySelector('[data-result]');
  const statsEl    = root.querySelector('[data-age-stats]');
  const emptyEl    = root.querySelector('[data-age-empty]');
  const copyBtn    = root.querySelector('[data-action="copy"]');
  const shareBtn   = root.querySelector('[data-action="share"]');
  const resetBtn   = root.querySelector('[data-action="reset"]');
  const todayBtn   = root.querySelector('[data-action="today"]');
  const r = useResult(resultEl);

  // Set the "as of" field to today by default
  if (refInput && !refInput.value) {
    refInput.value = new Date().toISOString().slice(0, 10);
  }

  function read() {
    return age.calculate(dobInput?.value, refInput?.value);
  }

  const recalc = debounce(() => {
    const out = read();
    r.set(out);
    syncUrl(out);
    renderStats(out);
  });

  function renderStats(out) {
    if (!statsEl) return;
    if (!out) {
      statsEl.classList.add('hidden');
      emptyEl?.classList.remove('hidden');
      return;
    }
    emptyEl?.classList.add('hidden');
    statsEl.classList.remove('hidden');

    const set = (key, value) => {
      const el = statsEl.querySelector(`[data-age-stat="${key}"] [data-age-value]`);
      if (el) el.textContent = value;
    };

    set('totalMonths', out.fmt.totalMonths);
    set('totalWeeks',  out.fmt.totalWeeks);
    set('totalDays',   out.fmt.totalDays);
    set('totalHours',  out.fmt.totalHours);
    set('totalMins',   out.fmt.totalMins);
    set('totalSecs',   out.fmt.totalSecs);
    set('bornOn',      out.bornOn);
    set('zodiac',      out.zodiac);

    const bdEl = statsEl.querySelector('[data-age-birthday]');
    if (bdEl) {
      if (out.isBirthdayToday) {
        bdEl.textContent = '🎂 Happy birthday!';
        bdEl.classList.add('celebrate');
      } else {
        bdEl.textContent = `${out.fmt.nextBdayDays} day${out.nextBdayDays === 1 ? '' : 's'} until your next birthday`;
        bdEl.classList.remove('celebrate');
      }
    }
  }

  function syncUrl(out) {
    try {
      const params = new URLSearchParams();
      if (out && dobInput?.value) {
        params.set('dob', dobInput.value);
        if (refInput?.value) params.set('ref', refInput.value);
      }
      const qs = params.toString();
      window.history.replaceState(null, '', qs ? `${location.pathname}?${qs}` : location.pathname);
    } catch { /* ignore */ }
  }

  function loadFromUrl() {
    const p = new URLSearchParams(location.search);
    if (p.get('dob') && dobInput) dobInput.value = p.get('dob');
    if (p.get('ref') && refInput) refInput.value = p.get('ref');
    recalc();
  }

  wireInputs([dobInput, refInput], recalc);

  // "Today" button — reset the as-of date
  todayBtn?.addEventListener('click', () => {
    if (refInput) refInput.value = new Date().toISOString().slice(0, 10);
    recalc();
    flash(todayBtn, '<i class="fas fa-check"></i> Today', 'ok');
  });

  copyBtn?.addEventListener('click', async () => {
    const out = read();
    if (!out) { flash(copyBtn, 'Nothing to copy', 'warn'); return; }
    const text = [
      `Age: ${out.display}`,
      `Total months: ${out.fmt.totalMonths}`,
      `Total weeks: ${out.fmt.totalWeeks}`,
      `Total days: ${out.fmt.totalDays}`,
      `Total hours: ${out.fmt.totalHours}`,
      `Born on a ${out.bornOn}`,
      `Zodiac: ${out.zodiac}`,
    ].join('\n');
    try {
      await copyText(text);
      flash(copyBtn, '<i class="fas fa-check"></i> Copied', 'ok');
    } catch {
      flash(copyBtn, 'Copy failed', 'warn');
    }
  });

  shareBtn?.addEventListener('click', async () => {
    const out = read();
    if (!out) { flash(shareBtn, 'Nothing to share', 'warn'); return; }
    try {
      const url = location.href;
      if (navigator.share) {
        await navigator.share({ title: 'Age calculation', text: out.detail, url });
      } else {
        await copyText(url);
        flash(shareBtn, '<i class="fas fa-check"></i> Link copied', 'ok');
      }
    } catch { /* cancelled */ }
  });

  resetBtn?.addEventListener('click', () => {
    if (dobInput) dobInput.value = '';
    if (refInput) refInput.value = new Date().toISOString().slice(0, 10);
    r.set(null);
    syncUrl(null);
    renderStats(null);
    dobInput?.focus({ preventScroll: true });
    flash(resetBtn, '<i class="fas fa-check"></i> Cleared', 'ok');
  });

  loadFromUrl();
}

// ══════════════════════════════════════════════════════════════════
// DATE DIFFERENCE — expanded with full stats grid
// ══════════════════════════════════════════════════════════════════

function initDateDiff(root) {
  const fromInput = root.querySelector('#diffFrom');
  const toInput   = root.querySelector('#diffTo');
  const resultEl  = root.querySelector('[data-result]');
  const statsEl   = root.querySelector('[data-diff-stats]');
  const emptyEl   = root.querySelector('[data-diff-empty]');
  const warnEl    = root.querySelector('[data-diff-warning]');
  const copyBtn   = root.querySelector('[data-action="copy"]');
  const shareBtn  = root.querySelector('[data-action="share"]');
  const resetBtn  = root.querySelector('[data-action="reset"]');
  const swapBtn   = root.querySelector('[data-action="swap"]');
  const r = useResult(resultEl);

  // Default: today for both fields
  const today = new Date().toISOString().slice(0, 10);
  if (fromInput && !fromInput.value) fromInput.value = today;
  if (toInput   && !toInput.value)   toInput.value   = today;

  function read() {
    return dateDiff.calculate(fromInput?.value, toInput?.value);
  }

  const recalc = debounce(() => {
    const out = read();
    r.set(out);
    syncUrl(out);
    renderStats(out);
    renderWarning(out);
  });

  function renderWarning(out) {
    if (!warnEl) return;
    if (out && out.reversed) {
      warnEl.textContent = 'Note: the second date is earlier than the first. The result shows the absolute difference.';
      warnEl.classList.remove('hidden');
    } else {
      warnEl.classList.add('hidden');
      warnEl.textContent = '';
    }
  }

  function renderStats(out) {
    if (!statsEl) return;
    if (!out) {
      statsEl.classList.add('hidden');
      emptyEl?.classList.remove('hidden');
      return;
    }
    emptyEl?.classList.add('hidden');
    statsEl.classList.remove('hidden');

    const set = (key, value) => {
      const el = statsEl.querySelector(`[data-diff-stat="${key}"] [data-diff-value]`);
      if (el) el.textContent = value;
    };

    set('years',         out.fmt.years);
    set('months',        out.fmt.months);
    set('dayPart',       out.fmt.dayPart);
    set('totalMonths',   out.fmt.totalMonths);
    set('weeks',         out.fmt.weeks);
    set('remDays',       out.fmt.remDays);
    set('totalDays',     out.fmt.days);
    set('inclusiveDays', out.fmt.inclusiveDays);
    set('businessDays',  out.fmt.businessDays);
    set('weekendDays',   out.fmt.weekendDays);
    set('totalHours',    out.fmt.totalHours);
    set('totalMins',     out.fmt.totalMins);
    set('totalSecs',     out.fmt.totalSecs);
  }

  function syncUrl(out) {
    try {
      const params = new URLSearchParams();
      if (out && fromInput?.value && toInput?.value) {
        params.set('from', fromInput.value);
        params.set('to',   toInput.value);
      }
      const qs = params.toString();
      window.history.replaceState(null, '', qs ? `${location.pathname}?${qs}` : location.pathname);
    } catch { /* ignore */ }
  }

  function loadFromUrl() {
    const p = new URLSearchParams(location.search);
    if (p.get('from') && fromInput) fromInput.value = p.get('from');
    if (p.get('to')   && toInput)   toInput.value   = p.get('to');
    recalc();
  }

  // Presets
  root.querySelectorAll('[data-diff-preset]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const preset = btn.dataset.diffPreset;
      const today = new Date();
      let from = fromInput?.value;
      let to   = toInput?.value;

      switch (preset) {
        case 'today-today':
          from = to = today.toISOString().slice(0, 10);
          break;
        case 'week':
          from = today.toISOString().slice(0, 10);
          to   = new Date(today.getTime() + 7 * 86400000).toISOString().slice(0, 10);
          break;
        case 'month':
          from = today.toISOString().slice(0, 10);
          to   = new Date(today.getFullYear(), today.getMonth() + 1, today.getDate())
                   .toISOString().slice(0, 10);
          break;
        case 'year':
          from = today.toISOString().slice(0, 10);
          to   = new Date(today.getFullYear() + 1, today.getMonth(), today.getDate())
                   .toISOString().slice(0, 10);
          break;
        case 'start-year': {
          const y = today.getFullYear();
          from = `${y}-01-01`;
          to   = today.toISOString().slice(0, 10);
          break;
        }
        case 'end-year': {
          const y = today.getFullYear();
          from = today.toISOString().slice(0, 10);
          to   = `${y}-12-31`;
          break;
        }
      }

      if (fromInput) fromInput.value = from;
      if (toInput)   toInput.value   = to;

      // Visual selection state
      root.querySelectorAll('[data-diff-preset]').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');

      recalc();
    });
  });

  wireInputs([fromInput, toInput], recalc);

  // Swap dates
  swapBtn?.addEventListener('click', () => {
    if (!fromInput || !toInput) return;
    const a = fromInput.value;
    fromInput.value = toInput.value;
    toInput.value = a;
    recalc();
    flash(swapBtn, '<i class="fas fa-check"></i> Swapped', 'ok');
  });

  copyBtn?.addEventListener('click', async () => {
    const out = read();
    if (!out) { flash(copyBtn, 'Nothing to copy', 'warn'); return; }
    const text = [
      `From: ${fromInput.value}`,
      `To: ${toInput.value}`,
      `Total days: ${out.fmt.days}`,
      `Weeks + days: ${out.fmt.weeks} weeks ${out.fmt.remDays} days`,
      `Calendar: ${out.human}`,
      `Business days: ${out.fmt.businessDays}`,
      `Weekend days: ${out.fmt.weekendDays}`,
      `Total hours: ${out.fmt.totalHours}`,
    ].join('\n');
    try {
      await copyText(text);
      flash(copyBtn, '<i class="fas fa-check"></i> Copied', 'ok');
    } catch {
      flash(copyBtn, 'Copy failed', 'warn');
    }
  });

  shareBtn?.addEventListener('click', async () => {
    const out = read();
    if (!out) { flash(shareBtn, 'Nothing to share', 'warn'); return; }
    try {
      const url = location.href;
      if (navigator.share) {
        await navigator.share({ title: 'Date difference', text: out.detail, url });
      } else {
        await copyText(url);
        flash(shareBtn, '<i class="fas fa-check"></i> Link copied', 'ok');
      }
    } catch { /* cancelled */ }
  });

  resetBtn?.addEventListener('click', () => {
    if (fromInput) fromInput.value = today;
    if (toInput)   toInput.value   = today;
    root.querySelectorAll('[data-diff-preset]').forEach((b) => b.classList.remove('active'));
    r.set(null);
    syncUrl(null);
    renderStats(null);
    renderWarning(null);
    fromInput?.focus({ preventScroll: true });
    flash(resetBtn, '<i class="fas fa-check"></i> Reset', 'ok');
  });

  loadFromUrl();
}

// ══════════════════════════════════════════════════════════════════
// TIP — expanded with full stats grid and presets
// ══════════════════════════════════════════════════════════════════

function initTip(root) {
  const billInput   = root.querySelector('#tipBill');
  const pctInput    = root.querySelector('#tipPercent');
  const splitInput  = root.querySelector('#tipSplit');
  const roundToggle = root.querySelector('#tipRound');
  const resultEl    = root.querySelector('[data-result]');
  const statsEl     = root.querySelector('[data-tip-stats]');
  const emptyEl     = root.querySelector('[data-tip-empty]');
  const copyBtn     = root.querySelector('[data-action="copy"]');
  const shareBtn    = root.querySelector('[data-action="share"]');
  const resetBtn    = root.querySelector('[data-action="reset"]');
  const r = useResult(resultEl);

  // Default tip percentage
  if (pctInput && !pctInput.value) pctInput.value = '15';
  if (splitInput && !splitInput.value) splitInput.value = '1';

  function read() {
    return tip.calculate(
      billInput?.value,
      pctInput?.value,
      splitInput?.value || 1,
      roundToggle?.checked || false,
    );
  }

  const recalc = debounce(() => {
    const out = read();
    r.set(out);
    syncUrl(out);
    renderStats(out);
  });

  function renderStats(out) {
    if (!statsEl) return;
    if (!out) {
      statsEl.classList.add('hidden');
      emptyEl?.classList.remove('hidden');
      return;
    }
    emptyEl?.classList.add('hidden');
    statsEl.classList.remove('hidden');

    const set = (key, value) => {
      const el = statsEl.querySelector(`[data-tip-stat="${key}"] [data-tip-value]`);
      if (el) el.textContent = value;
    };

    set('tip',              out.fmt.tip);
    set('total',            out.fmt.total);
    set('perPerson',        out.fmt.perPerson);
    set('tipPerPerson',     out.fmt.tipPerPerson);
    set('effectivePercent', out.fmt.effectivePercent);
    set('splitCount',       out.fmt.splitCount);

    // Show rounding row only when active
    const roundingRow = statsEl.querySelector('[data-tip-stat="roundingAdd"]');
    if (roundingRow) {
      if (out.roundingAdd > 0) {
        roundingRow.classList.remove('hidden');
        const val = roundingRow.querySelector('[data-tip-value]');
        if (val) val.textContent = out.fmt.roundingAdd;
      } else {
        roundingRow.classList.add('hidden');
      }
    }
  }

  function syncUrl(out) {
    try {
      const params = new URLSearchParams();
      if (out) {
        if (billInput?.value)  params.set('bill',  billInput.value);
        if (pctInput?.value)   params.set('tip',   pctInput.value);
        if (splitInput?.value && splitInput.value !== '1') params.set('split', splitInput.value);
        if (roundToggle?.checked) params.set('round', '1');
      }
      const qs = params.toString();
      window.history.replaceState(null, '', qs ? `${location.pathname}?${qs}` : location.pathname);
    } catch { /* ignore */ }
  }

  function loadFromUrl() {
    const p = new URLSearchParams(location.search);
    if (p.get('bill')  && billInput)  billInput.value  = p.get('bill');
    if (p.get('tip')   && pctInput)   pctInput.value   = p.get('tip');
    if (p.get('split') && splitInput) splitInput.value = p.get('split');
    if (p.get('round') === '1' && roundToggle) roundToggle.checked = true;

    // Highlight matching preset if the value matches one
    const currentPct = pctInput?.value;
    if (currentPct) {
      root.querySelectorAll('[data-tip-preset]').forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.tipPreset === currentPct);
      });
    }

    recalc();
  }

  // ── Tip percentage presets ──
  root.querySelectorAll('[data-tip-preset]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (!pctInput) return;
      pctInput.value = btn.dataset.tipPreset;
      root.querySelectorAll('[data-tip-preset]').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      recalc();
    });
  });

  // ── Split presets ──
  root.querySelectorAll('[data-split-preset]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (!splitInput) return;
      splitInput.value = btn.dataset.splitPreset;
      root.querySelectorAll('[data-split-preset]').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      recalc();
    });
  });

  // ── Toggle for round up ──
  roundToggle?.addEventListener('change', recalc);

  wireInputs([billInput, pctInput, splitInput], recalc);

  copyBtn?.addEventListener('click', async () => {
    const out = read();
    if (!out) { flash(copyBtn, 'Nothing to copy', 'warn'); return; }
    const text = [
      `Bill: ${moneyFormat(billInput.value)}`,
      `Tip: ${pctInput.value}%`,
      `Tip amount: ${out.fmt.tip}`,
      `Total: ${out.fmt.total}`,
      out.split > 1 ? `Split between: ${out.fmt.splitCount}` : null,
      out.split > 1 ? `Per person: ${out.fmt.perPerson}` : null,
      out.split > 1 ? `Tip per person: ${out.fmt.tipPerPerson}` : null,
      out.roundingAdd > 0 ? `Rounded up by: ${out.fmt.roundingAdd}` : null,
    ].filter(Boolean).join('\n');
    try {
      await copyText(text);
      flash(copyBtn, '<i class="fas fa-check"></i> Copied', 'ok');
    } catch {
      flash(copyBtn, 'Copy failed', 'warn');
    }
  });

  shareBtn?.addEventListener('click', async () => {
    const out = read();
    if (!out) { flash(shareBtn, 'Nothing to share', 'warn'); return; }
    try {
      const url = location.href;
      if (navigator.share) {
        await navigator.share({ title: 'Tip calculation', text: out.detail, url });
      } else {
        await copyText(url);
        flash(shareBtn, '<i class="fas fa-check"></i> Link copied', 'ok');
      }
    } catch { /* cancelled */ }
  });

  resetBtn?.addEventListener('click', () => {
    if (billInput) billInput.value = '';
    if (pctInput)  pctInput.value  = '15';
    if (splitInput) splitInput.value = '1';
    if (roundToggle) roundToggle.checked = false;
    root.querySelectorAll('[data-tip-preset]').forEach((b) => b.classList.remove('active'));
    root.querySelectorAll('[data-split-preset]').forEach((b) => b.classList.remove('active'));
    r.set(null);
    syncUrl(null);
    renderStats(null);
    billInput?.focus({ preventScroll: true });
    flash(resetBtn, '<i class="fas fa-check"></i> Reset', 'ok');
  });

  loadFromUrl();
}

// Small helper used only in tip copy
function moneyFormat(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return '$0.00';
  return '$' + n.toLocaleString(undefined, {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  });
}

// ══════════════════════════════════════════════════════════════════
// DISCOUNT — expanded, two modes
// ══════════════════════════════════════════════════════════════════

function initDiscount(root) {
  const tabs        = root.querySelectorAll('.tool-tab');
  const panels      = root.querySelectorAll('.tool-panel');
  const resultEl    = root.querySelector('[data-result]');
  const statsEl     = root.querySelector('[data-disc-stats]');
  const emptyEl     = root.querySelector('[data-disc-empty]');
  const copyBtn     = root.querySelector('[data-action="copy"]');
  const shareBtn    = root.querySelector('[data-action="share"]');
  const resetBtn    = root.querySelector('[data-action="reset"]');
  const r = useResult(resultEl);

  const inputs = {
    fromPrice:    [root.querySelector('#discPrice'),  root.querySelector('#discPercent')],
    findOriginal: [root.querySelector('#discSale'),   root.querySelector('#discOrigPercent')],
  };

  let mode = 'fromPrice';

  function setMode(next) {
    if (!inputs[next]) next = 'fromPrice';
    mode = next;
    tabs.forEach((t) => {
      const active = t.dataset.mode === mode;
      t.classList.toggle('active', active);
      t.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    panels.forEach((p) => p.classList.toggle('hidden', p.dataset.panel !== mode));
    recalc();
  }

  function read() {
    const [a, b] = inputs[mode] || [];
    const va = a?.value ?? '', vb = b?.value ?? '';
    if (mode === 'fromPrice')    return discount.fromPrice(va, vb);
    if (mode === 'findOriginal') return discount.findOriginal(va, vb);
    return null;
  }

  const recalc = debounce(() => {
    const out = read();
    r.set(out);
    syncUrl(out);
    renderStats(out);
  });

  function renderStats(out) {
    if (!statsEl) return;
    if (!out) {
      statsEl.classList.add('hidden');
      emptyEl?.classList.remove('hidden');
      return;
    }
    emptyEl?.classList.add('hidden');
    statsEl.classList.remove('hidden');

    // In fromPrice mode, show salePrice / savings / original / percent
    // In findOriginal mode, show original / savings / salePrice / percent
    const set = (key, value) => {
      const el = statsEl.querySelector(`[data-disc-stat="${key}"] [data-disc-value]`);
      if (el) el.textContent = value;
    };

    set('original',  out.fmt.original);
    set('savings',   out.fmt.savings);
    set('salePrice', out.fmt.salePrice);
    set('percent',   out.fmt.percent);
  }

  function syncUrl(out) {
    try {
      const params = new URLSearchParams();
      if (out) {
        params.set('mode', mode);
        const [a, b] = inputs[mode] || [];
        const keys = mode === 'fromPrice'
          ? ['price', 'percent']
          : ['sale',  'percent'];
        if (a?.value && keys[0]) params.set(keys[0], a.value);
        if (b?.value && keys[1]) params.set(keys[1], b.value);
      }
      const qs = params.toString();
      window.history.replaceState(null, '', qs ? `${location.pathname}?${qs}` : location.pathname);
    } catch { /* ignore */ }
  }

  function loadFromUrl() {
    const p = new URLSearchParams(location.search);
    const m = p.get('mode');
    if (m && inputs[m]) mode = m;

    if (mode === 'fromPrice') {
      if (p.get('price') && inputs.fromPrice[0]) inputs.fromPrice[0].value = p.get('price');
      if (p.get('percent') && inputs.fromPrice[1]) inputs.fromPrice[1].value = p.get('percent');
    } else if (mode === 'findOriginal') {
      if (p.get('sale') && inputs.findOriginal[0]) inputs.findOriginal[0].value = p.get('sale');
      if (p.get('percent') && inputs.findOriginal[1]) inputs.findOriginal[1].value = p.get('percent');
    }

    tabs.forEach((t) => {
      const active = t.dataset.mode === mode;
      t.classList.toggle('active', active);
      t.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    panels.forEach((p2) => p2.classList.toggle('hidden', p2.dataset.panel !== mode));

    recalc();
  }

  // ── Tabs ──
  tabs.forEach((t) => t.addEventListener('click', () => setMode(t.dataset.mode)));

  // ── Wire inputs ──
  Object.values(inputs).flat().forEach((el) => {
    if (!el) return;
    el.addEventListener('input', recalc);
    el.addEventListener('change', recalc);
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); recalc(); }
    });
  });

  // ── Preset buttons ──
  root.querySelectorAll('[data-disc-preset]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const panel = btn.closest('.tool-panel');
      const targetId = btn.dataset.presetTarget;
      const value = btn.dataset.discPreset;
      const input = targetId
        ? root.querySelector('#' + targetId)
        : panel?.querySelector('input[type="number"]:last-of-type');
      if (input) {
        input.value = value;
        panel?.querySelectorAll('[data-disc-preset]').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        recalc();
      }
    });
  });

  // ── Actions ──
  copyBtn?.addEventListener('click', async () => {
    const out = read();
    if (!out) { flash(copyBtn, 'Nothing to copy', 'warn'); return; }

    let text = '';
    if (mode === 'fromPrice') {
      text = [
        `Original price: ${out.fmt.original}`,
        `Discount: ${out.fmt.percent}`,
        `Sale price: ${out.fmt.salePrice}`,
        `You save: ${out.fmt.savings}`,
      ].join('\n');
    } else {
      text = [
        `Sale price: ${out.fmt.salePrice}`,
        `Discount: ${out.fmt.percent}`,
        `Original price: ${out.fmt.original}`,
        `You saved: ${out.fmt.savings}`,
      ].join('\n');
    }
    try {
      await copyText(text);
      flash(copyBtn, '<i class="fas fa-check"></i> Copied', 'ok');
    } catch {
      flash(copyBtn, 'Copy failed', 'warn');
    }
  });

  shareBtn?.addEventListener('click', async () => {
    const out = read();
    if (!out) { flash(shareBtn, 'Nothing to share', 'warn'); return; }
    try {
      const url = location.href;
      if (navigator.share) {
        await navigator.share({ title: 'Discount calculation', text: out.detail, url });
      } else {
        await copyText(url);
        flash(shareBtn, '<i class="fas fa-check"></i> Link copied', 'ok');
      }
    } catch { /* cancelled */ }
  });

  resetBtn?.addEventListener('click', () => {
    Object.values(inputs).flat().forEach((el) => { if (el) el.value = ''; });
    root.querySelectorAll('[data-disc-preset]').forEach((b) => b.classList.remove('active'));
    r.set(null);
    syncUrl(null);
    renderStats(null);
    inputs[mode]?.[0]?.focus({ preventScroll: true });
    flash(resetBtn, '<i class="fas fa-check"></i> Cleared', 'ok');
  });

  // ── Boot ──
  loadFromUrl();
}

// ══════════════════════════════════════════════════════════════════
// UNIT CONVERTER
// ══════════════════════════════════════════════════════════════════

function initUnitConverter(root) {
  const catSelect  = root.querySelector('#unitCategory');
  const fromSelect = root.querySelector('#unitFrom');
  const toSelect   = root.querySelector('#unitTo');
  const valueInput = root.querySelector('#unitValue');
  const swapBtn    = root.querySelector('[data-action="swap"]');

  const UNITS = {
    length:      { mm: 'Millimeter', cm: 'Centimeter', m: 'Meter', km: 'Kilometer', in: 'Inch', ft: 'Foot', yd: 'Yard', mi: 'Mile' },
    weight:      { mg: 'Milligram', g: 'Gram', kg: 'Kilogram', t: 'Tonne', oz: 'Ounce', lb: 'Pound', st: 'Stone' },
    temperature: { c: 'Celsius', f: 'Fahrenheit', k: 'Kelvin' },
    volume:      { ml: 'Milliliter', l: 'Liter', cup: 'Cup (US)', pint: 'Pint (US)', quart: 'Quart (US)', gallon: 'Gallon (US)', floz: 'Fluid ounce (US)' },
    speed:       { mps: 'Metres per second', kph: 'Kilometres per hour', mph: 'Miles per hour', knot: 'Knot' },
  };

  function populate(category) {
    const units = UNITS[category] || {};
    const opts = Object.entries(units).map(([k, v]) => `<option value="${k}">${v}</option>`).join('');
    if (fromSelect) fromSelect.innerHTML = opts;
    if (toSelect)   toSelect.innerHTML   = opts;
    if (fromSelect) fromSelect.selectedIndex = 0;
    if (toSelect && toSelect.options.length > 1) toSelect.selectedIndex = 1;
  }

  catSelect?.addEventListener('change', () => {
    populate(catSelect.value);
    valueInput?.dispatchEvent(new Event('input', { bubbles: true }));
  });

  swapBtn?.addEventListener('click', () => {
    if (!fromSelect || !toSelect) return;
    const a = fromSelect.value;
    fromSelect.value = toSelect.value;
    toSelect.value = a;
    valueInput?.dispatchEvent(new Event('input', { bubbles: true }));
  });

  populate(catSelect?.value || 'length');

  simpleCalc(root, () => unitConverter.convert(
    catSelect?.value || 'length',
    fromSelect?.value || 'm',
    toSelect?.value || 'km',
    valueInput?.value,
  ));
}

// ══════════════════════════════════════════════════════════════════
// BMI — expanded with scale, healthy range and full stats
// ══════════════════════════════════════════════════════════════════

function initBMI(root) {
  const unitToggle  = root.querySelectorAll('[data-bmi-unit]');
  const weightInput = root.querySelector('#bmiWeight');
  const heightInput = root.querySelector('#bmiHeight');
  const resultEl    = root.querySelector('[data-result]');
  const statsEl     = root.querySelector('[data-bmi-stats]');
  const emptyEl     = root.querySelector('[data-bmi-empty]');
  const scaleEl     = root.querySelector('[data-bmi-scale]');
  const markerEl    = root.querySelector('[data-bmi-marker]');
  const copyBtn     = root.querySelector('[data-action="copy"]');
  const shareBtn    = root.querySelector('[data-action="share"]');
  const resetBtn    = root.querySelector('[data-action="reset"]');
  const r = useResult(resultEl);

  let unit = 'metric';

  function updateLabels() {
    const wSuffix = root.querySelector('[data-bmi-weight-suffix]');
    const hSuffix = root.querySelector('[data-bmi-height-suffix]');
    const wLabel  = root.querySelector('[data-bmi-weight-label]');
    const hLabel  = root.querySelector('[data-bmi-height-label]');
    const wPlace  = weightInput?.getAttribute('placeholder');
    const hPlace  = heightInput?.getAttribute('placeholder');

    if (unit === 'metric') {
      if (wSuffix) wSuffix.textContent = 'kg';
      if (hSuffix) hSuffix.textContent = 'cm';
      if (wLabel)  wLabel.textContent = 'Weight';
      if (hLabel)  hLabel.textContent = 'Height';
      if (weightInput) weightInput.placeholder = '70';
      if (heightInput) heightInput.placeholder = '175';
    } else {
      if (wSuffix) wSuffix.textContent = 'lb';
      if (hSuffix) hSuffix.textContent = 'in';
      if (wLabel)  wLabel.textContent = 'Weight';
      if (hLabel)  hLabel.textContent = 'Height';
      if (weightInput) weightInput.placeholder = '155';
      if (heightInput) heightInput.placeholder = '69';
    }
  }

  function read() {
    const w = Number(weightInput?.value);
    const h = Number(heightInput?.value);
    if (!w || !h) return null;
    if (unit === 'metric') return bmi.calculate(w, h);
    return bmi.calculateImperial(w, h);
  }

  const recalc = debounce(() => {
    const out = read();
    r.set(out);
    syncUrl(out);
    renderStats(out);
    renderScale(out);
  });

  function renderStats(out) {
    if (!statsEl) return;
    if (!out) {
      statsEl.classList.add('hidden');
      emptyEl?.classList.remove('hidden');
      if (scaleEl) scaleEl.classList.add('hidden');
      return;
    }
    emptyEl?.classList.add('hidden');
    statsEl.classList.remove('hidden');
    if (scaleEl) scaleEl.classList.remove('hidden');

    const set = (key, value) => {
      const el = statsEl.querySelector(`[data-bmi-stat="${key}"] [data-bmi-value]`);
      if (el) el.textContent = value;
    };

    set('category',      out.fmt.category);
    set('healthyMin',    out.fmt.minHealthyKg);
    set('healthyMax',    out.fmt.maxHealthyKg);
    set('primeWeight',   out.fmt.primeWeight);
    set('percentFromMid', out.fmt.percentFromMid);

    // Weight change row — dynamic label
    const changeRow = statsEl.querySelector('[data-bmi-stat="weightToChange"]');
    if (changeRow) {
      const labelEl = changeRow.querySelector('.wc-stat__label');
      const valueEl = changeRow.querySelector('[data-bmi-value]');
      if (out.weightToChange > 0) {
        changeRow.classList.remove('hidden');
        if (labelEl) labelEl.textContent = out.weightToChangeDir === 'lose' ? 'Lose to healthy' : 'Gain to healthy';
        if (valueEl) valueEl.textContent = out.fmt.weightToChange;
      } else {
        changeRow.classList.add('hidden');
      }
    }
  }

  function renderScale(out) {
    if (!markerEl) return;
    if (!out) {
      markerEl.style.left = '';
      return;
    }
    // markerPct is 0–100
    markerEl.style.left = `${out.markerPct}%`;
    markerEl.dataset.tone = out.tone || '';
  }

  function syncUrl(out) {
    try {
      const params = new URLSearchParams();
      if (out) {
        params.set('unit', unit);
        if (weightInput?.value) params.set('w', weightInput.value);
        if (heightInput?.value) params.set('h', heightInput.value);
      }
      const qs = params.toString();
      window.history.replaceState(null, '', qs ? `${location.pathname}?${qs}` : location.pathname);
    } catch { /* ignore */ }
  }

  function loadFromUrl() {
    const p = new URLSearchParams(location.search);
    const u = p.get('unit');
    if (u === 'imperial') {
      unit = 'imperial';
      unitToggle.forEach((b) => b.classList.toggle('active', b.dataset.bmiUnit === 'imperial'));
    }
    if (p.get('w') && weightInput) weightInput.value = p.get('w');
    if (p.get('h') && heightInput) heightInput.value = p.get('h');
    updateLabels();
    recalc();
  }

  // ── Unit toggle ──
  unitToggle.forEach((btn) => {
    btn.addEventListener('click', () => {
      unit = btn.dataset.bmiUnit;
      unitToggle.forEach((b) => b.classList.toggle('active', b === btn));
      updateLabels();
      recalc();
    });
  });

  wireInputs([weightInput, heightInput], recalc);

  // ── Copy ──
  copyBtn?.addEventListener('click', async () => {
    const out = read();
    if (!out) { flash(copyBtn, 'Nothing to copy', 'warn'); return; }
    const text = [
      `BMI: ${out.fmt.value}`,
      `Category: ${out.fmt.category}`,
      `Healthy weight range: ${out.fmt.minHealthyKg} – ${out.fmt.maxHealthyKg}`,
      `Prime weight (BMI 22): ${out.fmt.primeWeight}`,
      out.weightToChange > 0
        ? `${out.weightToChangeDir === 'lose' ? 'Lose' : 'Gain'} to healthy: ${out.fmt.weightToChange}`
        : null,
    ].filter(Boolean).join('\n');
    try {
      await copyText(text);
      flash(copyBtn, '<i class="fas fa-check"></i> Copied', 'ok');
    } catch {
      flash(copyBtn, 'Copy failed', 'warn');
    }
  });

  // ── Share ──
  shareBtn?.addEventListener('click', async () => {
    const out = read();
    if (!out) { flash(shareBtn, 'Nothing to share', 'warn'); return; }
    try {
      const url = location.href;
      if (navigator.share) {
        await navigator.share({ title: 'BMI calculation', text: out.detail, url });
      } else {
        await copyText(url);
        flash(shareBtn, '<i class="fas fa-check"></i> Link copied', 'ok');
      }
    } catch { /* cancelled */ }
  });

  // ── Reset ──
  resetBtn?.addEventListener('click', () => {
    if (weightInput) weightInput.value = '';
    if (heightInput) heightInput.value = '';
    r.set(null);
    syncUrl(null);
    renderStats(null);
    renderScale(null);
    weightInput?.focus({ preventScroll: true });
    flash(resetBtn, '<i class="fas fa-check"></i> Cleared', 'ok');
  });

  // ── Boot ──
  updateLabels();
  loadFromUrl();
}
// ══════════════════════════════════════════════════════════════════
// LOAN — expanded with amortization schedule
// ══════════════════════════════════════════════════════════════════

function initLoan(root) {
  const amountInput = root.querySelector('#loanAmount');
  const rateInput   = root.querySelector('#loanRate');
  const yearsInput  = root.querySelector('#loanYears');
  const resultEl    = root.querySelector('[data-result]');
  const statsEl     = root.querySelector('[data-loan-stats]');
  const emptyEl     = root.querySelector('[data-loan-empty]');
  const scheduleEl  = root.querySelector('[data-loan-schedule]');
  const scheduleBody = root.querySelector('[data-loan-schedule-body]');
  const copyBtn     = root.querySelector('[data-action="copy"]');
  const shareBtn    = root.querySelector('[data-action="share"]');
  const resetBtn    = root.querySelector('[data-action="reset"]');
  const r = useResult(resultEl);

  function read() {
    return loan.calculate(amountInput?.value, rateInput?.value, yearsInput?.value);
  }

  const recalc = debounce(() => {
    const out = read();
    r.set(out);
    syncUrl(out);
    renderStats(out);
    renderSchedule(out);
  });

  function renderStats(out) {
    if (!statsEl) return;
    if (!out) {
      statsEl.classList.add('hidden');
      emptyEl?.classList.remove('hidden');
      return;
    }
    emptyEl?.classList.add('hidden');
    statsEl.classList.remove('hidden');

    const set = (key, value) => {
      const el = statsEl.querySelector(`[data-loan-stat="${key}"] [data-loan-value]`);
      if (el) el.textContent = value;
    };

    set('principal',       out.fmt.principal);
    set('totalInterest',   out.fmt.totalInterest);
    set('totalPaid',       out.fmt.totalPaid);
    set('interestPercent', out.fmt.interestPercent);
    set('months',          out.fmt.months);
    set('firstPayment',    `${out.fmt.firstInterest} / ${out.fmt.firstPrincipal}`);
    set('lastPayment',     `${out.fmt.lastInterest} / ${out.fmt.lastPrincipal}`);
  }

  function renderSchedule(out) {
    if (!scheduleEl || !scheduleBody) return;
    if (!out || !out.yearlySchedule.length) {
      scheduleEl.classList.add('hidden');
      return;
    }
    scheduleEl.classList.remove('hidden');

    scheduleBody.innerHTML = out.yearlySchedule.map((row) => `
      <tr>
        <td>Year ${row.year}</td>
        <td>${moneyFormat(row.interestPaid)}</td>
        <td>${moneyFormat(row.principalPaid)}</td>
        <td><strong>${moneyFormat(row.balance)}</strong></td>
      </tr>
    `).join('');
  }

  function syncUrl(out) {
    try {
      const params = new URLSearchParams();
      if (out) {
        if (amountInput?.value) params.set('amount', amountInput.value);
        if (rateInput?.value)   params.set('rate', rateInput.value);
        if (yearsInput?.value)  params.set('years', yearsInput.value);
      }
      const qs = params.toString();
      window.history.replaceState(null, '', qs ? `${location.pathname}?${qs}` : location.pathname);
    } catch { /* ignore */ }
  }

  function loadFromUrl() {
    const p = new URLSearchParams(location.search);
    if (p.get('amount') && amountInput) amountInput.value = p.get('amount');
    if (p.get('rate')   && rateInput)   rateInput.value   = p.get('rate');
    if (p.get('years')  && yearsInput)  yearsInput.value  = p.get('years');
    recalc();
  }

  // ── Presets ──
  root.querySelectorAll('[data-loan-preset]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const preset = btn.dataset.loanPreset;
      const values = {
        mortgage25:  { amount: 250000, rate: 5.5,  years: 25 },
        mortgage30:  { amount: 300000, rate: 6.0,  years: 30 },
        car5:        { amount: 25000,  rate: 6.5,  years: 5  },
        car3:        { amount: 18000,  rate: 5.0,  years: 3  },
        personal:    { amount: 10000,  rate: 9.0,  years: 3  },
        student:     { amount: 40000,  rate: 5.0,  years: 10 },
      }[preset];
      if (!values) return;

      if (amountInput) amountInput.value = values.amount;
      if (rateInput)   rateInput.value   = values.rate;
      if (yearsInput)  yearsInput.value  = values.years;

      root.querySelectorAll('[data-loan-preset]').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      recalc();
    });
  });

  wireInputs([amountInput, rateInput, yearsInput], recalc);

  // ── Copy ──
  copyBtn?.addEventListener('click', async () => {
    const out = read();
    if (!out) { flash(copyBtn, 'Nothing to copy', 'warn'); return; }
    const text = [
      `Loan amount: ${out.fmt.principal}`,
      `Annual rate: ${rateInput.value}%`,
      `Term: ${out.fmt.years} years (${out.fmt.months} months)`,
      `Monthly payment: ${out.fmt.monthly}`,
      `Total interest: ${out.fmt.totalInterest}`,
      `Total paid: ${out.fmt.totalPaid}`,
      `Interest as % of principal: ${out.fmt.interestPercent}`,
    ].join('\n');
    try {
      await copyText(text);
      flash(copyBtn, '<i class="fas fa-check"></i> Copied', 'ok');
    } catch {
      flash(copyBtn, 'Copy failed', 'warn');
    }
  });

  // ── Share ──
  shareBtn?.addEventListener('click', async () => {
    const out = read();
    if (!out) { flash(shareBtn, 'Nothing to share', 'warn'); return; }
    try {
      const url = location.href;
      if (navigator.share) {
        await navigator.share({ title: 'Loan calculation', text: out.detail, url });
      } else {
        await copyText(url);
        flash(shareBtn, '<i class="fas fa-check"></i> Link copied', 'ok');
      }
    } catch { /* cancelled */ }
  });

  // ── Reset ──
  resetBtn?.addEventListener('click', () => {
    [amountInput, rateInput, yearsInput].forEach((el) => { if (el) el.value = ''; });
    root.querySelectorAll('[data-loan-preset]').forEach((b) => b.classList.remove('active'));
    r.set(null);
    syncUrl(null);
    renderStats(null);
    renderSchedule(null);
    amountInput?.focus({ preventScroll: true });
    flash(resetBtn, '<i class="fas fa-check"></i> Cleared', 'ok');
  });

  // ── Boot ──
  loadFromUrl();
}

// moneyFormat was defined earlier for the tip calculator.
// If it is not in scope, it is already a top-level function.
// ══════════════════════════════════════════════════════════════════
// CASE CONVERTER — all styles at once
// ══════════════════════════════════════════════════════════════════

function initCaseConverter(root) {
  const textarea   = root.querySelector('#ccText');
  const emptyEl    = root.querySelector('[data-cc-empty]');
  const statsEl    = root.querySelector('[data-cc-stats]');
  const tableEl    = root.querySelector('[data-cc-table]');
  const tableBody  = root.querySelector('[data-cc-table-body]');
  const copyAllBtn = root.querySelector('[data-action="copy-all"]');
  const pasteBtn   = root.querySelector('[data-action="paste"]');
  const sampleBtn  = root.querySelector('[data-action="sample"]');
  const clearBtn   = root.querySelector('[data-action="clear"]');

  if (!textarea) return;

  const SAMPLE = 'The quick brown fox jumps over the lazy dog. Every good developer writes clean, readable code every day.';

  let currentRows = [];

  const analyze = debounce(() => {
    const text = textarea.value;

    if (!text.trim()) {
      emptyEl?.classList.remove('hidden');
      statsEl?.classList.add('hidden');
      tableEl?.classList.add('hidden');
      currentRows = [];
      return;
    }

    emptyEl?.classList.add('hidden');
    statsEl?.classList.remove('hidden');

    // Stats
    const trimmed = text.trim();
    const words = trimmed.split(/\s+/).filter(Boolean).length;
    const chars = text.length;
    const charsNoSpace = text.replace(/\s/g, '').length;

    const setStat = (key, value) => {
      const el = statsEl.querySelector(`[data-cc-stat="${key}"] [data-cc-value]`);
      if (el) el.textContent = value;
    };
    setStat('words',     words.toLocaleString());
    setStat('chars',     chars.toLocaleString());
    setStat('charsNoSpace', charsNoSpace.toLocaleString());

    // All case rows
    currentRows = caseConverter.all(text);
    tableEl?.classList.remove('hidden');

    if (tableBody) {
      tableBody.innerHTML = currentRows.map((row, i) => {
        // Trim preview for very long text
        const preview = row.value.length > 200
          ? row.value.slice(0, 200) + '…'
          : row.value;

        return `
          <tr class="cc-row" data-cc-index="${i}">
            <td class="cc-name">
              <span class="cc-name__main">${escapeHtml(row.name)}</span>
              <span class="cc-name__desc">${escapeHtml(row.desc)}</span>
            </td>
            <td class="cc-preview">${escapeHtml(preview) || '<em>(empty)</em>'}</td>
            <td class="cc-action">
              <button type="button" class="cc-copy" data-cc-copy="${i}" aria-label="Copy ${escapeHtml(row.name)}">
                <i class="fas fa-copy"></i>
                <span>Copy</span>
              </button>
            </td>
          </tr>
        `;
      }).join('');
    }

    // Wire per-row copy
    tableBody?.querySelectorAll('[data-cc-copy]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const idx = Number(btn.dataset.ccCopy);
        const row = currentRows[idx];
        if (!row) return;
        try {
          await copyText(row.value);
          flash(btn, '<i class="fas fa-check"></i> Copied', 'ok');
        } catch {
          flash(btn, 'Failed', 'warn');
        }
      });
    });
  }, 180);

  textarea.addEventListener('input', analyze);

  // Copy all cases at once
  copyAllBtn?.addEventListener('click', async () => {
    if (!currentRows.length) { flash(copyAllBtn, 'Nothing to copy', 'warn'); return; }
    const text = currentRows
      .map((r) => `${r.name}: ${r.value}`)
      .join('\n\n');
    try {
      await copyText(text);
      flash(copyAllBtn, '<i class="fas fa-check"></i> All copied', 'ok');
    } catch {
      flash(copyAllBtn, 'Copy failed', 'warn');
    }
  });

  pasteBtn?.addEventListener('click', async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text) { flash(pasteBtn, 'Clipboard empty', 'warn'); return; }
      textarea.value = text;
      analyze();
      flash(pasteBtn, '<i class="fas fa-check"></i> Pasted', 'ok');
    } catch {
      flash(pasteBtn, 'Paste not allowed', 'warn');
    }
  });

  sampleBtn?.addEventListener('click', () => {
    textarea.value = SAMPLE;
    analyze();
    flash(sampleBtn, '<i class="fas fa-check"></i> Loaded', 'ok');
  });

  clearBtn?.addEventListener('click', () => {
    textarea.value = '';
    analyze();
    textarea.focus({ preventScroll: true });
    flash(clearBtn, '<i class="fas fa-check"></i> Cleared', 'ok');
  });

  // Boot
  analyze();
}

// ══════════════════════════════════════════════════════════════════
// WORD COUNTER
// ══════════════════════════════════════════════════════════════════

function initWordCounter(root) {
  const textarea   = root.querySelector('#wcText');
  const statsEl    = root.querySelector('[data-wc-stats]');
  const keywordsEl = root.querySelector('[data-wc-keywords]');
  const emptyState = root.querySelector('[data-wc-empty]');
  const copyBtn    = root.querySelector('[data-action="copy"]');
  const clearBtn   = root.querySelector('[data-action="clear"]');
  const pasteBtn   = root.querySelector('[data-action="paste"]');
  const sampleBtn  = root.querySelector('[data-action="sample"]');

  if (!textarea) return;

  const SAMPLE = `The best tools are the ones you never have to think about. You open the page, you type, and the answer appears. No accounts. No popups. No distractions. Just the thing you came for, working exactly the way you expected.

That is the idea behind Tools.land. Every calculator on this site does one thing, and it does it well. Fast to load. Clear to use. Free to keep.`;

  const analyze = debounce(() => {
    const text = textarea.value;
    const result = wordCounter.analyze(text);

    if (!text.trim()) {
      emptyState?.classList.remove('hidden');
      statsEl?.classList.add('hidden');
      keywordsEl?.classList.add('hidden');
      return;
    }

    emptyState?.classList.add('hidden');
    statsEl?.classList.remove('hidden');

    if (statsEl) {
      statsEl.querySelectorAll('[data-stat]').forEach((el) => {
        const key = el.dataset.stat;
        const numEl = el.querySelector('[data-stat-value]');
        if (!numEl) return;
        const value = result[key];
        if (typeof value === 'number') {
          numEl.textContent = value.toLocaleString();
        } else {
          numEl.textContent = value ?? '—';
        }
      });
    }

    if (keywordsEl) {
      if (result.keywords.length === 0) {
        keywordsEl.classList.add('hidden');
      } else {
        keywordsEl.classList.remove('hidden');
        const list = keywordsEl.querySelector('[data-wc-keyword-list]');
        if (list) {
          list.innerHTML = result.keywords.map((k) => `
            <li class="wc-keyword">
              <span class="wc-keyword__word">${escapeHtml(k.word)}</span>
              <span class="wc-keyword__count">${k.count}</span>
            </li>
          `).join('');
        }
        const density = keywordsEl.querySelector('[data-wc-density]');
        if (density) {
          density.textContent = result.topDensity
            ? `Top keyword density: ${result.topDensity}%`
            : '';
        }
      }
    }
  }, 180);

  textarea.addEventListener('input', analyze);

  copyBtn?.addEventListener('click', async () => {
    const text = textarea.value;
    if (!text.trim()) { flash(copyBtn, 'Nothing to copy', 'warn'); return; }
    const r = wordCounter.analyze(text);
    const summary = [
      `Words: ${r.wordCount}`,
      `Characters: ${r.charCount}`,
      `Characters (no spaces): ${r.charNoSpaces}`,
      `Sentences: ${r.sentenceCount}`,
      `Paragraphs: ${r.paragraphCount}`,
      `Reading time: ${r.readingTime}`,
      `Speaking time: ${r.speakingTime}`,
    ].join('\n');
    try {
      await copyText(summary);
      flash(copyBtn, '<i class="fas fa-check"></i> Copied', 'ok');
    } catch {
      flash(copyBtn, 'Copy failed', 'warn');
    }
  });

  clearBtn?.addEventListener('click', () => {
    textarea.value = '';
    analyze();
    textarea.focus({ preventScroll: true });
    flash(clearBtn, '<i class="fas fa-check"></i> Cleared', 'ok');
  });

  pasteBtn?.addEventListener('click', async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text) { flash(pasteBtn, 'Clipboard empty', 'warn'); return; }
      textarea.value = text;
      analyze();
      flash(pasteBtn, '<i class="fas fa-check"></i> Pasted', 'ok');
    } catch {
      flash(pasteBtn, 'Paste not allowed', 'warn');
    }
  });

  sampleBtn?.addEventListener('click', () => {
    textarea.value = SAMPLE;
    analyze();
    flash(sampleBtn, '<i class="fas fa-check"></i> Loaded', 'ok');
  });

  analyze();
}

// ══════════════════════════════════════════════════════════════════
// DISPATCH — must be last, after every handler is defined
// ══════════════════════════════════════════════════════════════════

(function dispatch() {
  const card = document.querySelector('.tool-card[data-tool]');
  if (!card) return;

  const tool = card.dataset.tool;

const HANDLERS = {
  percentage: initPercentage,
  age:        initAge,
  dateDiff:   initDateDiff,
  tip:        initTip,
  discount:   initDiscount,
  unit:       initUnitConverter,
  bmi:        initBMI,
  loan:       initLoan,
  word:       initWordCounter,
  case:       initCaseConverter,
  password:   initPasswordGenerator,
  qr:         initQRGenerator,
};

  const fn = HANDLERS[tool];
  if (typeof fn === 'function') {
    fn(card);
  } else {
    console.warn(`[calculator-page] No handler for tool: ${tool}`);
  }
})();