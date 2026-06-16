/* ============================================================
   onboarding.js — Step-by-step onboarding for Ledger
   ============================================================ */

const Onboarding = (() => {

  let currentStep = 0;
  let userData = {
    name: '',
    income: 0,
    fixedCosts: [],
    debtItems: [],
    categoryLimits: { Groceries: 0, 'Eating out': 0, Hobbies: 0, Gas: 0, Other: 0 },
    hasSavings: false,
    savingsBalance: 0,
    savingsGoalEstimate: 0,
    summaryDate: 'last',
    onboardingComplete: false,
    theme: 'light'
  };

  const TOTAL_STEPS = 10;

  function start() {
    document.getElementById('onboarding').classList.remove('hidden');
    document.getElementById('main-app').classList.add('hidden');
    showStep(0);
  }

  function setProgress(step) {
    const pct = Math.round((step / TOTAL_STEPS) * 100);
    document.getElementById('ob-progress-fill').style.width = pct + '%';
  }

  function showStep(step) {
    currentStep = step;
    setProgress(step);
    const container = document.getElementById('ob-screens');

    const existing = container.querySelector('.ob-screen.active');
    if (existing) {
      existing.classList.remove('active');
      existing.classList.add('exit');
      setTimeout(() => existing.remove(), 400);
    }

    const screen = buildStep(step);
    if (!screen) return;
    container.appendChild(screen);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => screen.classList.add('active'));
    });
  }

  function buildStep(step) {
    switch(step) {
      case 0: return buildWelcome();
      case 1: return buildName();
      case 2: return buildIncome();
      case 3: return buildFixedCosts();
      case 4: return buildDebt();
      case 5: return buildCategoryLimits();
      case 6: return buildSavings();
      case 7: return buildSavingsGoal();
      case 8: return buildSummaryDate();
      case 9: return buildReview();
      default: return null;
    }
  }

  /* ---- STEP 0: Welcome ---- */
  function buildWelcome() {
    const s = makeScreen();
    s.innerHTML = `
      <div style="flex:1; display:flex; flex-direction:column; justify-content:center; align-items:center; text-align:center;">
        <div style="width:72px; height:72px; background:var(--accent); border-radius:20px; display:flex; align-items:center; justify-content:center; margin-bottom:28px;">
          <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
        </div>
        <h1 style="font-size:32px; font-weight:500; color:var(--ink); margin-bottom:10px;">Ledger</h1>
        <p style="font-size:17px; color:var(--ink-muted); line-height:1.6; max-width:280px;">Your personal budget, built like a calendar. Know where every dollar goes.</p>
      </div>
      <button class="ob-btn" onclick="Onboarding.next()">Let's get you set up</button>
    `;
    return s;
  }

  /* ---- STEP 1: Name ---- */
  function buildName() {
    const s = makeScreen();
    s.innerHTML = `
      <p class="ob-label">Step 1 of 9</p>
      <h2 class="ob-title">What's your name?</h2>
      <p class="ob-subtitle">So Ledger can greet you properly.</p>
      <input class="ob-input" type="text" id="ob-name" placeholder="Your first name" value="${userData.name}" autocomplete="given-name" />
      <button class="ob-btn" onclick="Onboarding.saveName()">Continue</button>
    `;
    setTimeout(() => s.querySelector('#ob-name').focus(), 400);
    return s;
  }

  /* ---- STEP 2: Income ---- */
  function buildIncome() {
    const s = makeScreen();
    s.innerHTML = `
      <p class="ob-label">Step 2 of 9</p>
      <h2 class="ob-title">Monthly take-home income</h2>
      <p class="ob-subtitle">After tax. This is what you actually have to work with each month.</p>
      <div class="ob-input-prefix">
        <span>$</span>
        <input type="number" id="ob-income" placeholder="0" value="${userData.income || ''}" inputmode="decimal" />
      </div>
      <button class="ob-btn" onclick="Onboarding.saveIncome()">Continue</button>
      <button class="ob-btn-secondary" onclick="Onboarding.back()">Back</button>
    `;
    setTimeout(() => s.querySelector('#ob-income').focus(), 400);
    return s;
  }

  /* ---- STEP 3: Fixed Costs ---- */
  function buildFixedCosts() {
    const s = makeScreen();
    const suggestions = ['Rent', 'WiFi', 'Phone', 'Subscriptions', 'Insurance'];
    const added = suggestions.filter(sg => userData.fixedCosts.some(f => f.name === sg));

    const listHtml = userData.fixedCosts.map((f, i) => `
      <div class="ob-fixed-item">
        <div>
          <div class="ob-fixed-item-left">${f.name}</div>
        </div>
        <div style="display:flex; align-items:center; gap:8px;">
          <span class="ob-fixed-item-amount">$${Math.round(f.amount)}</span>
          <button class="ob-fixed-item-remove" onclick="Onboarding.removeFixed(${i})">×</button>
        </div>
      </div>
    `).join('');

    const total = userData.fixedCosts.reduce((s, f) => s + parseFloat(f.amount || 0), 0);

    const suggestHtml = suggestions.map(sg => {
      const isAdded = userData.fixedCosts.some(f => f.name === sg);
      return isAdded ? '' : `<button class="ob-suggest-pill" onclick="Onboarding.suggestFixed('${sg}')">${sg}</button>`;
    }).join('');

    s.innerHTML = `
      <p class="ob-label">Step 3 of 9</p>
      <h2 class="ob-title">Fixed monthly costs</h2>
      <p class="ob-subtitle">These go out every month no matter what — rent, subscriptions, insurance.</p>
      <div class="ob-suggest-row">${suggestHtml}</div>
      <div class="ob-add-row">
        <input type="text" id="ob-fixed-name" placeholder="Name (e.g. Gym)" />
        <input type="number" id="ob-fixed-amt" placeholder="$0" inputmode="decimal" style="max-width:90px;" />
        <button class="ob-add-row-btn" onclick="Onboarding.addFixed()">Add</button>
      </div>
      <div class="ob-fixed-list">${listHtml}</div>
      ${total > 0 ? `<div class="ob-total-row"><span>Total fixed costs</span><span>$${Math.round(total)}/mo</span></div>` : ''}
      <button class="ob-btn" onclick="Onboarding.next()" style="margin-top:auto;">${userData.fixedCosts.length === 0 ? 'Skip for now' : 'Continue'}</button>
      <button class="ob-btn-secondary" onclick="Onboarding.back()">Back</button>
    `;
    return s;
  }

  /* ---- STEP 4: Debt ---- */
  function buildDebt() {
    const s = makeScreen();
    const hasDebt = userData.debtItems.length > 0;

    const listHtml = userData.debtItems.map((d, i) => `
      <div class="ob-fixed-item">
        <div>
          <div class="ob-fixed-item-left">${d.name}</div>
          <div style="font-size:11px; color:var(--ink-muted);">Min payment</div>
        </div>
        <div style="display:flex; align-items:center; gap:8px;">
          <span class="ob-fixed-item-amount">$${Math.round(d.payment)}/mo</span>
          <button class="ob-fixed-item-remove" onclick="Onboarding.removeDebt(${i})">×</button>
        </div>
      </div>
    `).join('');

    s.innerHTML = `
      <p class="ob-label">Step 4 of 9</p>
      <h2 class="ob-title">Any debt?</h2>
      <p class="ob-subtitle">Car payments, student loans, credit cards. This helps track your real financial picture.</p>
      <div class="ob-yes-no" style="margin-bottom:${hasDebt ? '16px' : '0'};">
        <button class="ob-choice ${hasDebt ? 'selected' : ''}" onclick="Onboarding.toggleDebt(true)">Yes</button>
        <button class="ob-choice ${!hasDebt && userData.debtChecked ? 'selected' : ''}" onclick="Onboarding.toggleDebt(false)">No</button>
      </div>
      <div id="ob-debt-section" style="display:${hasDebt ? 'block' : 'none'}">
        <div class="ob-add-row">
          <input type="text" id="ob-debt-name" placeholder="e.g. Car loan" />
          <input type="number" id="ob-debt-amt" placeholder="$0" inputmode="decimal" style="max-width:90px;" />
          <button class="ob-add-row-btn" onclick="Onboarding.addDebt()">Add</button>
        </div>
        <div class="ob-fixed-list">${listHtml}</div>
      </div>
      <button class="ob-btn" onclick="Onboarding.next()" style="margin-top:auto;">Continue</button>
      <button class="ob-btn-secondary" onclick="Onboarding.back()">Back</button>
    `;
    return s;
  }

  /* ---- STEP 5: Category Limits ---- */
  function buildCategoryLimits() {
    const cats = ['Groceries', 'Eating out', 'Hobbies', 'Gas', 'Other'];
    const s = makeScreen();
    const rows = cats.map(cat => `
      <div class="ob-cat-row">
        <label class="ob-cat-label">${cat}</label>
        <div style="position:relative; display:inline-block;">
          <span style="position:absolute; left:10px; top:50%; transform:translateY(-50%); color:var(--ink-muted); font-size:15px; pointer-events:none;">$</span>
          <input class="ob-cat-input" type="number" id="ob-cat-${cat.replace(' ','_')}" placeholder="0"
            value="${userData.categoryLimits[cat] || ''}" inputmode="decimal" />
        </div>
      </div>
    `).join('');

    s.innerHTML = `
      <p class="ob-label">Step 5 of 9</p>
      <h2 class="ob-title">Monthly budget limits</h2>
      <p class="ob-subtitle">Set a spending limit for each category. Ledger will track you against these.</p>
      <div style="background:var(--bg-card); border-radius:var(--radius-card); padding:4px 16px; margin-bottom:16px;">
        ${rows}
      </div>
      <button class="ob-btn" onclick="Onboarding.saveCategoryLimits()">Continue</button>
      <button class="ob-btn-secondary" onclick="Onboarding.back()">Back</button>
    `;
    return s;
  }

  /* ---- STEP 6: Savings Account ---- */
  function buildSavings() {
    const s = makeScreen();
    s.innerHTML = `
      <p class="ob-label">Step 6 of 9</p>
      <h2 class="ob-title">High-yield savings account?</h2>
      <p class="ob-subtitle">Ledger will track your progress toward a savings goal. Do you already have a savings account?</p>
      <div class="ob-yes-no">
        <button class="ob-choice ${userData.hasSavings ? 'selected' : ''}" onclick="Onboarding.toggleSavings(true)">Yes</button>
        <button class="ob-choice ${!userData.hasSavings && userData.savingsChecked ? 'selected' : ''}" onclick="Onboarding.toggleSavings(false)">No</button>
      </div>
      <div id="ob-savings-section" style="display:${userData.hasSavings ? 'block' : 'none'}">
        <p style="font-size:14px; color:var(--ink-muted); margin-bottom:8px;">Current balance</p>
        <div class="ob-input-prefix">
          <span>$</span>
          <input type="number" id="ob-savings-bal" placeholder="0" value="${userData.savingsBalance || ''}" inputmode="decimal" />
        </div>
      </div>
      <button class="ob-btn" onclick="Onboarding.saveSavings()" style="margin-top:auto;">Continue</button>
      <button class="ob-btn-secondary" onclick="Onboarding.back()">Back</button>
    `;
    return s;
  }

  /* ---- STEP 7: Savings Goal ---- */
  function buildSavingsGoal() {
    const s = makeScreen();
    s.innerHTML = `
      <p class="ob-label">Step 7 of 9</p>
      <h2 class="ob-title">Your savings goal</h2>
      <p class="ob-subtitle">Ledger's target is <strong style="color:var(--accent); font-weight:500;">1 year of living expenses</strong> in your savings account. After 3 months of tracking, it'll calculate your exact number automatically. For now, estimate your monthly expenses.</p>
      <p style="font-size:14px; color:var(--ink-muted); margin-bottom:8px; margin-top:8px;">Estimated monthly expenses</p>
      <div class="ob-input-prefix">
        <span>$</span>
        <input type="number" id="ob-goal-est" placeholder="0" value="${userData.savingsGoalEstimate || ''}" inputmode="decimal" />
      </div>
      <div id="ob-goal-preview" style="background:var(--bg-card); border-radius:var(--radius-el); padding:12px 16px; margin-bottom:16px; display:none;">
        <div style="font-size:12px; color:var(--ink-muted); margin-bottom:4px;">Initial savings target</div>
        <div id="ob-goal-preview-amt" style="font-size:22px; font-weight:500; color:var(--accent);"></div>
        <div style="font-size:12px; color:var(--ink-muted); margin-top:2px;">We'll refine this after 3 months of real data</div>
      </div>
      <button class="ob-btn" onclick="Onboarding.saveSavingsGoal()" style="margin-top:auto;">Continue</button>
      <button class="ob-btn-secondary" onclick="Onboarding.back()">Back</button>
    `;

    setTimeout(() => {
      const input = s.querySelector('#ob-goal-est');
      input.addEventListener('input', () => {
        const val = parseFloat(input.value) || 0;
        const preview = s.querySelector('#ob-goal-preview');
        const amt = s.querySelector('#ob-goal-preview-amt');
        if (val > 0) {
          preview.style.display = 'block';
          amt.textContent = '$' + Math.round(val * 12).toLocaleString() + ' target';
        } else {
          preview.style.display = 'none';
        }
      });
      if (userData.savingsGoalEstimate > 0) input.dispatchEvent(new Event('input'));
    }, 100);

    return s;
  }

  /* ---- STEP 8: Summary Date ---- */
  function buildSummaryDate() {
    const s = makeScreen();
    s.innerHTML = `
      <p class="ob-label">Step 8 of 9</p>
      <h2 class="ob-title">Monthly wrap-up date</h2>
      <p class="ob-subtitle">When do you want to see your monthly summary? Ledger will show you a full breakdown on this day.</p>
      <div class="ob-yes-no" style="margin-bottom:24px;">
        <button class="ob-choice ${userData.summaryDate === 'last' ? 'selected' : ''}" onclick="Onboarding.setSummaryDate('last', this)">Last day<br><span style="font-size:11px; font-weight:400;">of month</span></button>
        <button class="ob-choice ${userData.summaryDate !== 'last' ? 'selected' : ''}" onclick="Onboarding.setSummaryDate('custom', this)">Custom date</button>
      </div>
      <div id="ob-custom-date" style="display:${userData.summaryDate !== 'last' ? 'block' : 'none'}">
        <p style="font-size:14px; color:var(--ink-muted); margin-bottom:8px;">Day of month (1–28)</p>
        <input class="ob-input" type="number" id="ob-summary-day" min="1" max="28" placeholder="e.g. 25" value="${userData.summaryDate !== 'last' ? userData.summaryDate : ''}" inputmode="numeric" />
      </div>
      <button class="ob-btn" onclick="Onboarding.saveSummaryDate()" style="margin-top:auto;">Continue</button>
      <button class="ob-btn-secondary" onclick="Onboarding.back()">Back</button>
    `;
    return s;
  }

  /* ---- STEP 9: Review ---- */
  function buildReview() {
    const fixedTotal = userData.fixedCosts.reduce((s,f) => s + parseFloat(f.amount||0), 0);
    const catLimitsTotal = Object.values(userData.categoryLimits).reduce((s,v) => s + parseFloat(v||0), 0);
    const savingsTarget = (parseFloat(userData.savingsGoalEstimate) || 0) * 12;

    const s = makeScreen();
    s.innerHTML = `
      <p class="ob-label">All set</p>
      <h2 class="ob-title">Here's your setup</h2>
      <p class="ob-subtitle">Everything looks good. You can always edit this later in Settings.</p>

      <div class="ob-summary-card">
        <div class="ob-summary-row"><span>Name</span><span>${userData.name || '—'}</span></div>
        <div class="ob-summary-row"><span>Monthly income</span><span>$${Math.round(userData.income).toLocaleString()}</span></div>
        <div class="ob-summary-row"><span>Fixed costs</span><span>$${Math.round(fixedTotal).toLocaleString()}/mo</span></div>
        <div class="ob-summary-row"><span>Debt items</span><span>${userData.debtItems.length === 0 ? 'None' : userData.debtItems.length + ' item(s)'}</span></div>
        <div class="ob-summary-row"><span>Category budgets</span><span>$${Math.round(catLimitsTotal).toLocaleString()}/mo</span></div>
        <div class="ob-summary-row"><span>Savings balance</span><span>${userData.hasSavings ? '$' + Math.round(userData.savingsBalance).toLocaleString() : 'No account yet'}</span></div>
        <div class="ob-summary-row"><span>Savings target</span><span>${savingsTarget > 0 ? '$' + Math.round(savingsTarget).toLocaleString() : 'TBD after 3 months'}</span></div>
        <div class="ob-summary-row"><span>Monthly summary</span><span>${userData.summaryDate === 'last' ? 'Last day of month' : 'Day ' + userData.summaryDate}</span></div>
      </div>

      <button class="ob-btn" onclick="Onboarding.complete()">Start tracking</button>
      <button class="ob-btn-secondary" onclick="Onboarding.back()">Edit something</button>
    `;
    return s;
  }

  /* ---- HELPERS ---- */
  function makeScreen() {
    const div = document.createElement('div');
    div.className = 'ob-screen';
    return div;
  }

  /* ---- PUBLIC ACTIONS ---- */
  function next() { showStep(currentStep + 1); }
  function back() { if (currentStep > 0) showStep(currentStep - 1); }

  function saveName() {
    const val = document.getElementById('ob-name').value.trim();
    userData.name = val;
    next();
  }

  function saveIncome() {
    const val = parseFloat(document.getElementById('ob-income').value) || 0;
    userData.income = val;
    next();
  }

  function suggestFixed(name) {
    if (userData.fixedCosts.some(f => f.name === name)) return;
    const s = document.getElementById('ob-fixed-name');
    if (s) { s.value = name; s.focus(); }
  }

  function addFixed() {
    const nameEl = document.getElementById('ob-fixed-name');
    const amtEl = document.getElementById('ob-fixed-amt');
    const name = nameEl.value.trim();
    const amount = parseFloat(amtEl.value) || 0;
    if (!name || amount <= 0) return;
    userData.fixedCosts.push({ name, amount });
    showStep(3);
  }

  function removeFixed(i) {
    userData.fixedCosts.splice(i, 1);
    showStep(3);
  }

  function toggleDebt(val) {
    userData.debtChecked = true;
    const section = document.getElementById('ob-debt-section');
    if (val) {
      section.style.display = 'block';
      document.querySelectorAll('.ob-choice').forEach((b, i) => {
        b.classList.toggle('selected', i === 0);
      });
    } else {
      section.style.display = 'none';
      userData.debtItems = [];
      document.querySelectorAll('.ob-choice').forEach((b, i) => {
        b.classList.toggle('selected', i === 1);
      });
    }
  }

  function addDebt() {
    const nameEl = document.getElementById('ob-debt-name');
    const amtEl = document.getElementById('ob-debt-amt');
    const name = nameEl.value.trim();
    const payment = parseFloat(amtEl.value) || 0;
    if (!name || payment <= 0) return;
    userData.debtItems.push({ name, payment });
    showStep(4);
  }

  function removeDebt(i) {
    userData.debtItems.splice(i, 1);
    showStep(4);
  }

  function saveCategoryLimits() {
    const cats = ['Groceries', 'Eating out', 'Hobbies', 'Gas', 'Other'];
    cats.forEach(cat => {
      const el = document.getElementById('ob-cat-' + cat.replace(' ','_'));
      if (el) userData.categoryLimits[cat] = parseFloat(el.value) || 0;
    });
    next();
  }

  function toggleSavings(val) {
    userData.savingsChecked = true;
    const section = document.getElementById('ob-savings-section');
    const btns = document.querySelectorAll('.ob-choice');
    if (val) {
      userData.hasSavings = true;
      section.style.display = 'block';
      btns[0].classList.add('selected'); btns[1].classList.remove('selected');
    } else {
      userData.hasSavings = false;
      section.style.display = 'none';
      btns[1].classList.add('selected'); btns[0].classList.remove('selected');
    }
  }

  function saveSavings() {
    if (userData.hasSavings) {
      const el = document.getElementById('ob-savings-bal');
      userData.savingsBalance = parseFloat(el ? el.value : 0) || 0;
    }
    next();
  }

  function saveSavingsGoal() {
    const el = document.getElementById('ob-goal-est');
    userData.savingsGoalEstimate = parseFloat(el.value) || 0;
    next();
  }

  function setSummaryDate(val, btn) {
    userData.summaryDate = val === 'last' ? 'last' : '';
    document.querySelectorAll('.ob-choice').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    const custom = document.getElementById('ob-custom-date');
    if (custom) custom.style.display = val === 'custom' ? 'block' : 'none';
  }

  function saveSummaryDate() {
    if (userData.summaryDate !== 'last') {
      const el = document.getElementById('ob-summary-day');
      const day = parseInt(el ? el.value : 0);
      userData.summaryDate = (day >= 1 && day <= 28) ? day : 'last';
    }
    next();
  }

  function complete() {
    userData.onboardingComplete = true;
    Data.saveUser(userData);
    document.getElementById('onboarding').classList.add('hidden');
    App.init();
  }

  return {
    start, next, back,
    saveName, saveIncome,
    suggestFixed, addFixed, removeFixed,
    toggleDebt, addDebt, removeDebt,
    saveCategoryLimits,
    toggleSavings, saveSavings,
    saveSavingsGoal,
    setSummaryDate, saveSummaryDate,
    complete
  };
})();
