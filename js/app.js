/* ============================================================
   app.js — Main application controller for Ledger
   ============================================================ */

const App = (() => {

  let currentScreen = 'home';
  let calendarView = 'week'; // 'day' | 'week' | 'month'
  let calendarDate = new Date(); // reference date for calendar navigation
  let selectedDayDate = null;
  let addExpenseDate = null;
  let addSubItems = [];
  let expandedExpenseId = null;
  let insightsMonth = null; // { year, month }

  /* ===== BOOT ===== */
  function boot() {
    applyTheme();
    if (!Data.isOnboardingComplete()) {
      Onboarding.start();
    } else {
      init();
    }
  }

  function init() {
    document.getElementById('onboarding').classList.add('hidden');
    document.getElementById('main-app').classList.remove('hidden');
    applyTheme();
    navigate('home');
    checkMonthlyWrap();
  }

  function applyTheme() {
    const user = Data.getUser();
    const theme = user && user.theme === 'dark' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', theme);
  }

  /* ===== NAVIGATION ===== */
  function navigate(screen, options = {}) {
    if (screen === 'add') { openAddExpense(options.date || null); return; }

    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

    const el = document.getElementById('screen-' + screen);
    if (el) { el.classList.remove('hidden'); el.classList.add('animate-in'); }

    const navBtn = document.querySelector(`.nav-btn[data-screen="${screen}"]`);
    if (navBtn) navBtn.classList.add('active');

    currentScreen = screen;

    switch(screen) {
      case 'home': renderHome(); break;
      case 'day': renderDay(options.date || Data.getTodayStr()); break;
      case 'insights': renderInsights(); break;
      case 'goals': renderGoals(); break;
      case 'settings': renderSettings(); break;
    }
  }

  /* ===== HOME SCREEN ===== */
  function renderHome() {
    const el = document.getElementById('screen-home');
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const user = Data.getUser() || {};
    const totalSpent = Data.getMonthlyTotal(year, month);
    const income = parseFloat(user.income) || 0;
    const remaining = Math.max(0, income - totalSpent);
    const pct = income > 0 ? Math.min(100, Math.round((totalSpent / income) * 100)) : 0;

    const monthName = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    const recentExpenses = Data.getAllExpenses()
      .sort((a, b) => (b.date > a.date ? 1 : -1))
      .slice(0, 5);

    el.innerHTML = `
      <div class="page-header">
        <div class="page-subtitle">${monthName}</div>
        <div class="home-hero" style="padding: 8px 0 0;">
          <div>
            <div class="home-spent-label">spent so far</div>
            <div class="home-spent">${Data.formatCurrency(totalSpent)}</div>
          </div>
          <div class="home-remaining-card">
            <div class="home-remaining-amt">${Data.formatCurrency(remaining)}</div>
            <div class="home-remaining-label">remaining</div>
          </div>
        </div>
        <div class="progress-track" style="margin: 8px 0 0;">
          <div class="progress-fill ${pct >= 100 ? 'over' : pct >= 85 ? 'close' : ''}" style="width:${pct}%;"></div>
        </div>
      </div>

      <div class="cal-container">
        <div class="cal-view-toggle" style="margin-bottom:10px;">
          <button class="cal-view-btn ${calendarView==='day'?'active':''}" onclick="App.setCalView('day')">Day</button>
          <button class="cal-view-btn ${calendarView==='week'?'active':''}" onclick="App.setCalView('week')">Week</button>
          <button class="cal-view-btn ${calendarView==='month'?'active':''}" onclick="App.setCalView('month')">Month</button>
        </div>
        <div id="cal-body"></div>
      </div>

      <div class="section-label">Recent</div>
      <div id="recent-list">
        ${recentExpenses.length === 0
          ? `<div style="padding: 20px; text-align:center; color:var(--ink-muted); font-size:14px;">No expenses yet — tap + to add your first one.</div>`
          : recentExpenses.map(e => expenseItemHtml(e)).join('')}
      </div>
    `;

    renderCalendarBody();
  }

  function renderCalendarBody() {
    const body = document.getElementById('cal-body');
    if (!body) return;
    if (calendarView === 'week') body.innerHTML = renderWeekCal();
    else if (calendarView === 'month') body.innerHTML = renderMonthCal();
    else body.innerHTML = renderDayCal();
  }

  function renderWeekCal() {
    const today = new Date();
    const todayStr = Data.getTodayStr();

    // Get Mon of calendarDate's week
    const ref = new Date(calendarDate);
    const dow = ref.getDay();
    const mon = new Date(ref);
    mon.setDate(ref.getDate() - (dow === 0 ? 6 : dow - 1));

    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(mon);
      d.setDate(mon.getDate() + i);
      days.push(d);
    }

    const weekLabel = formatWeekLabel(days[0], days[6]);
    const headers = ['M','T','W','T','F','S','S'];

    const cells = days.map((d, i) => {
      const ds = dateToStr(d);
      const isToday = ds === todayStr;
      const hasSpend = Data.hasExpensesOnDate(ds);
      return `
        <div class="cal-day-cell ${isToday ? 'today' : ''}" onclick="App.dayTap('${ds}')">
          <div class="cal-day-num">${d.getDate()}</div>
          <div class="cal-dot ${hasSpend ? '' : 'hidden'}"></div>
        </div>
      `;
    }).join('');

    return `
      <div class="cal-nav">
        <button class="cal-nav-btn" onclick="App.calNav(-1)">‹</button>
        <span class="cal-nav-title">${weekLabel}</span>
        <button class="cal-nav-btn" onclick="App.calNav(1)">›</button>
      </div>
      <div class="cal-week-grid">
        ${headers.map(h => `<div class="cal-day-header">${h}</div>`).join('')}
        ${cells}
      </div>
    `;
  }

  function renderMonthCal() {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const todayStr = Data.getTodayStr();
    const monthName = calendarDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDow = firstDay.getDay();
    const offset = startDow === 0 ? 6 : startDow - 1;

    let cells = '';
    // Empty cells before
    for (let i = 0; i < offset; i++) {
      const prevDate = new Date(year, month, 1 - (offset - i));
      cells += `<div class="cal-month-cell other-month"><div class="cal-day-num">${prevDate.getDate()}</div></div>`;
    }
    // Days
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const ds = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const isToday = ds === todayStr;
      const hasSpend = Data.hasExpensesOnDate(ds);
      cells += `
        <div class="cal-month-cell ${isToday ? 'today' : ''}" onclick="App.dayTap('${ds}')">
          <div class="cal-day-num">${d}</div>
          ${hasSpend && !isToday ? '<div class="cal-dot"></div>' : ''}
        </div>
      `;
    }

    return `
      <div class="cal-nav">
        <button class="cal-nav-btn" onclick="App.calNav(-1)">‹</button>
        <span class="cal-nav-title">${monthName}</span>
        <button class="cal-nav-btn" onclick="App.calNav(1)">›</button>
      </div>
      <div class="cal-month-grid" style="margin-bottom:8px;">
        ${['M','T','W','T','F','S','S'].map(h => `<div class="cal-day-header" style="font-size:10px;">${h}</div>`).join('')}
        ${cells}
      </div>
    `;
  }

  function renderDayCal() {
    const todayStr = Data.getTodayStr();
    const ds = dateToStr(calendarDate);
    const d = new Date(calendarDate);
    const label = d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    const isToday = ds === todayStr;
    const total = Data.getDailyTotal(ds);

    return `
      <div class="cal-nav">
        <button class="cal-nav-btn" onclick="App.calNav(-1)">‹</button>
        <span class="cal-nav-title">${label}</span>
        <button class="cal-nav-btn" onclick="App.calNav(1)">›</button>
      </div>
      <div style="text-align:center; padding: 12px 0; cursor:pointer;" onclick="App.dayTap('${ds}')">
        <div style="font-size:32px; font-weight:500; color:${total > 0 ? 'var(--ink)' : 'var(--ink-muted)'};">${Data.formatCurrency(total)}</div>
        <div style="font-size:13px; color:var(--ink-muted);">${isToday ? 'Today' : 'total spent'}</div>
      </div>
    `;
  }

  function setCalView(view) {
    calendarView = view;
    calendarDate = new Date();
    renderHome();
  }

  function calNav(dir) {
    if (calendarView === 'week') {
      calendarDate.setDate(calendarDate.getDate() + dir * 7);
    } else if (calendarView === 'month') {
      calendarDate.setMonth(calendarDate.getMonth() + dir);
    } else {
      calendarDate.setDate(calendarDate.getDate() + dir);
    }
    renderCalendarBody();
  }

  function dayTap(dateStr) {
    navigate('day', { date: dateStr });
  }

  /* ===== DAY VIEW ===== */
  function renderDay(dateStr) {
    selectedDayDate = dateStr;
    const el = document.getElementById('screen-day');
    const d = new Date(dateStr + 'T12:00:00');
    const label = d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    const isToday = dateStr === Data.getTodayStr();
    const expenses = Data.getExpensesByDate(dateStr);
    const dayTotal = expenses.reduce((s, e) => s + e.amount, 0);
    const user = Data.getUser() || {};
    const year = d.getFullYear(), month = d.getMonth() + 1;
    const dailyAvg = Data.getDailyAverage(year, month);
    const diff = dayTotal - dailyAvg;
    const diffStr = diff > 0
      ? `+${Data.formatCurrency(diff)} over avg`
      : diff < 0
        ? `${Data.formatCurrency(Math.abs(diff))} under avg`
        : 'Right at your avg';
    const diffColor = diff > 0 ? 'var(--ink-red)' : diff < 0 ? 'var(--ink-green)' : 'var(--ink-muted)';

    const cats = ['Fixed','Groceries','Eating out','Hobbies','Gas','Other'];
    const limits = user.categoryLimits || {};
    const catBreakdown = cats.map(cat => {
      const spent = expenses.filter(e => e.category === cat).reduce((s,e) => s + e.amount, 0);
      if (spent === 0) return '';
      const limit = parseFloat(limits[cat]) || 0;
      const pct = limit > 0 ? Math.min(100, Math.round((spent/limit)*100)) : 100;
      return `
        <div style="margin-bottom:10px;">
          <div class="row-between" style="margin-bottom:4px;">
            <span style="font-size:13px; color:var(--ink);">${cat}</span>
            <span style="font-size:13px; font-weight:500; color:var(--accent);">${Data.formatCurrency(spent)}</span>
          </div>
          <div class="progress-track" style="margin:0;">
            <div class="progress-fill ${pct>=100?'over':pct>=85?'close':''}" style="width:${pct}%;"></div>
          </div>
        </div>
      `;
    }).join('');

    const expenseList = expenses.length === 0
      ? `<div style="padding:20px; text-align:center; color:var(--ink-muted); font-size:14px;">No expenses on this day.</div>`
      : expenses.map(e => expenseItemHtml(e, true)).join('');

    el.innerHTML = `
      <div class="day-header">
        <button class="day-back-btn" onclick="App.navigate('home')">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <div style="text-align:center;">
          <div style="font-size:15px; font-weight:500; color:var(--ink);">${isToday ? 'Today' : label}</div>
          ${!isToday ? `<div style="font-size:12px; color:var(--ink-muted);">${label}</div>` : ''}
        </div>
        <div style="text-align:right;">
          <div class="day-total">${Data.formatCurrency(dayTotal)}</div>
          <div class="day-total-label">spent</div>
        </div>
      </div>

      ${catBreakdown ? `
        <div class="section-label">Breakdown</div>
        <div class="card">${catBreakdown}</div>
      ` : ''}

      ${dailyAvg > 0 ? `
        <div class="day-avg-compare">
          <span style="color:var(--ink-muted); font-size:13px;">vs. daily average</span>
          <span style="font-weight:500; font-size:13px; color:${diffColor};">${diffStr}</span>
        </div>
      ` : ''}

      <div class="section-label">Expenses</div>
      <div id="day-expense-list">${expenseList}</div>

      <div style="padding: 16px 16px 0; display:flex; justify-content:center;">
        <button onclick="App.navigate('add', {date:'${dateStr}'})"
          style="background:var(--accent); color:#fff; border-radius:var(--radius-pill); padding:11px 24px; font-size:14px; font-weight:500; display:flex; align-items:center; gap:6px;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add to this day
        </button>
      </div>
    `;
  }

  function toggleExpenseExpand(id) {
    expandedExpenseId = expandedExpenseId === id ? null : id;
    if (selectedDayDate) renderDay(selectedDayDate);
  }

  function expenseItemHtml(e, expandable = false) {
    const isExpanded = expandable && expandedExpenseId === e.id;
    const hasSubItems = e.subItems && e.subItems.length > 0;

    let subHtml = '';
    if (isExpanded && hasSubItems) {
      subHtml = `
        <div class="expense-expand">
          ${e.subItems.map(si => `
            <div class="sub-item-row">
              <span>${si.name}</span>
              <span>${Data.formatCurrency(si.amount)}</span>
            </div>
          `).join('')}
          ${e.note ? `<div style="font-size:12px; color:var(--ink-muted); margin-top:6px; padding-top:6px; border-top:0.5px solid var(--divider);">${e.note}</div>` : ''}
        </div>
      `;
    } else if (isExpanded && e.note) {
      subHtml = `
        <div class="expense-expand">
          <div style="font-size:13px; color:var(--ink-muted);">${e.note}</div>
        </div>
      `;
    }

    const tapAction = expandable && (hasSubItems || e.note)
      ? `onclick="App.toggleExpenseExpand('${e.id}')"`
      : `onclick="App.dayTap('${e.date}')"`;

    return `
      <div class="expense-item" ${tapAction}>
        <div style="flex:1; min-width:0;">
          <div class="expense-title">${e.subject}</div>
          <div class="expense-meta">${e.category} · ${formatDisplayDate(e.date)}</div>
        </div>
        <div style="display:flex; align-items:center; gap:8px;">
          <div class="expense-amount">${Data.formatCurrency(e.amount)}</div>
          ${expandable && (hasSubItems || e.note) ? `<div style="color:var(--ink-muted); font-size:14px;">${isExpanded ? '▲' : '▾'}</div>` : ''}
        </div>
      </div>
      ${subHtml}
    `;
  }

  /* ===== ADD EXPENSE ===== */
  function openAddExpense(prefillDate = null) {
    addExpenseDate = prefillDate || Data.getTodayStr();
    addSubItems = [];

    let addEl = document.getElementById('add-expense-overlay');
    if (!addEl) {
      addEl = document.createElement('div');
      addEl.id = 'add-expense-overlay';
      addEl.className = 'add-screen';
      document.getElementById('app').appendChild(addEl);
    }

    addEl.innerHTML = buildAddExpenseHtml();
    requestAnimationFrame(() => {
      requestAnimationFrame(() => addEl.classList.add('open'));
    });
  }

  function closeAddExpense() {
    const addEl = document.getElementById('add-expense-overlay');
    if (addEl) {
      addEl.classList.remove('open');
      setTimeout(() => { if (addEl.parentNode) addEl.parentNode.removeChild(addEl); }, 400);
    }
  }

  function buildAddExpenseHtml() {
    const cats = Data.getCategories();
    return `
      <div class="add-header">
        <div class="add-header-title">Add expense</div>
        <button class="add-close-btn" onclick="App.closeAddExpense()">×</button>
      </div>
      <div class="add-body">
        <div class="add-step-label">What was it?</div>
        <input class="add-text-input" type="text" id="add-subject" placeholder="e.g. Date night, Golf, Trader Joe's" autocomplete="off" />

        <div class="add-step-label">Amount</div>
        <div class="add-amount-wrap">
          <span class="add-dollar">$</span>
          <input class="add-amount-input" type="number" id="add-amount" placeholder="0.00" inputmode="decimal" step="0.01" />
        </div>

        <div class="add-step-label">Category</div>
        <div class="cat-pills" id="cat-pills-container">
          ${cats.map((c, i) => `<button class="cat-pill ${i===0?'selected':''}" onclick="App.selectCat(this)">${c}</button>`).join('')}
          <button class="cat-pill" style="border-style:dashed;" onclick="App.addCustomCategoryPrompt()">+ New</button>
        </div>

        <div class="add-step-label">Date</div>
        <input class="add-date-input" type="date" id="add-date" value="${addExpenseDate}" />

        <div class="add-step-label">Note (optional)</div>
        <textarea class="add-note-input" id="add-note" placeholder="Any details..."></textarea>

        <div class="add-step-label">Split this expense? (optional)</div>
        <div class="sub-items-section">
          <div class="sub-item-add-row">
            <input type="text" id="sub-name" placeholder="e.g. Restaurant" autocomplete="off" />
            <input type="number" id="sub-amt" placeholder="$0" inputmode="decimal" />
            <button class="sub-item-add-btn" onclick="App.addSubItem()">+</button>
          </div>
          <div class="sub-items-list" id="sub-items-list"></div>
        </div>
      </div>
      <div class="add-footer">
        <button class="add-save-btn" onclick="App.saveExpense()">Save expense</button>
      </div>
    `;
  }

  function addCustomCategoryPrompt() {
    const backdrop = document.createElement('div');
    backdrop.className = 'edit-modal-backdrop';
    backdrop.id = 'custom-cat-modal';
    backdrop.innerHTML = `
      <div class="edit-modal">
        <div class="edit-modal-title">Add custom category</div>
        <input type="text" id="custom-cat-input" placeholder="e.g. Travel, Medical, Pet..."
          style="width:100%; background:var(--bg-card); border:0.5px solid var(--divider); border-radius:var(--radius-el); padding:12px 14px; font-size:16px; color:var(--ink); outline:none; margin-bottom:12px;" />
        <div class="edit-modal-actions">
          <button class="edit-modal-cancel" onclick="document.getElementById('custom-cat-modal').remove()">Cancel</button>
          <button class="edit-modal-save" onclick="App.saveCustomCategory()">Add</button>
        </div>
      </div>
    `;
    document.getElementById('app').appendChild(backdrop);
    setTimeout(() => backdrop.querySelector('input').focus(), 100);
  }

  function saveCustomCategory() {
    const val = (document.getElementById('custom-cat-input').value || '').trim();
    if (!val) return;
    Data.addCustomCategory(val);
    document.getElementById('custom-cat-modal').remove();
    // Rebuild category pills with new category selected
    const container = document.getElementById('cat-pills-container');
    if (container) {
      const cats = Data.getCategories();
      container.innerHTML = cats.map(c => `<button class="cat-pill ${c===val?'selected':''}" onclick="App.selectCat(this)">${c}</button>`).join('')
        + `<button class="cat-pill" style="border-style:dashed;" onclick="App.addCustomCategoryPrompt()">+ New</button>`;
    }
  }

  function selectCat(btn) {
    document.querySelectorAll('#add-expense-overlay .cat-pill').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
  }

  function addSubItem() {
    const name = document.getElementById('sub-name').value.trim();
    const amt = parseFloat(document.getElementById('sub-amt').value) || 0;
    if (!name || amt <= 0) return;
    addSubItems.push({ name, amount: amt });
    document.getElementById('sub-name').value = '';
    document.getElementById('sub-amt').value = '';
    renderSubItemsList();
  }

  function removeSubItem(i) {
    addSubItems.splice(i, 1);
    renderSubItemsList();
  }

  function renderSubItemsList() {
    const list = document.getElementById('sub-items-list');
    if (!list) return;
    list.innerHTML = addSubItems.map((si, i) => `
      <div class="sub-item-entry">
        <span>${si.name}</span>
        <div style="display:flex; align-items:center; gap:8px;">
          <span>${Data.formatCurrency(si.amount)}</span>
          <button class="sub-item-del" onclick="App.removeSubItem(${i})">×</button>
        </div>
      </div>
    `).join('');
  }

  function saveExpense() {
    const subject = (document.getElementById('add-subject').value || '').trim();
    const amount = parseFloat(document.getElementById('add-amount').value) || 0;
    const catEl = document.querySelector('#add-expense-overlay .cat-pill.selected');
    const category = catEl ? catEl.textContent : 'Other';
    const date = document.getElementById('add-date').value || Data.getTodayStr();
    const note = document.getElementById('add-note').value.trim();

    if (!subject) { document.getElementById('add-subject').focus(); return; }
    if (amount <= 0) { document.getElementById('add-amount').focus(); return; }

    Data.saveExpense({ subject, amount, category, date, note, subItems: addSubItems });
    Insights.updateMonthlyAverage();
    closeAddExpense();

    setTimeout(() => {
      if (currentScreen === 'home') renderHome();
      else if (currentScreen === 'day' && selectedDayDate === date) renderDay(date);
      else if (currentScreen === 'insights') renderInsights();
    }, 420);
  }

  /* ===== INSIGHTS ===== */
  function renderInsights() {
    const el = document.getElementById('screen-insights');
    const now = new Date();
    const month = insightsMonth || { year: now.getFullYear(), month: now.getMonth() + 1 };
    const data = Insights.calculate(month.year, month.month);
    const monthsWithData = Data.getMonthsWithData();

    const monthLabel = new Date(month.year, month.month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    const monthOptions = monthsWithData.map(ym => {
      const [y, m] = ym.split('-').map(Number);
      const label = new Date(y, m-1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      const selected = y === month.year && m === month.month ? 'selected' : '';
      return `<option value="${ym}" ${selected}>${label}</option>`;
    });

    const bigDay = data.streaks.biggestDay ? Insights.formatDate(data.streaks.biggestDay) : '—';
    const quietDay = data.streaks.quietestDay ? Insights.formatDate(data.streaks.quietestDay) : '—';

    el.innerHTML = `
      <div class="page-header">
        <div class="page-title">Insights</div>
      </div>
      <div class="month-selector">
        <select onchange="App.setInsightsMonth(this.value)" style="flex:1;">
          ${monthOptions.join('') || `<option value="${month.year}-${String(month.month).padStart(2,'0')}">${monthLabel}</option>`}
        </select>
      </div>

      <div class="section-label">Habit cards</div>

      <div class="insight-card">
        <div class="insight-icon">🛒</div>
        <div style="flex:1;">
          <div class="insight-title">Grocery runs</div>
          <div class="insight-detail">
            ${data.grocery.count > 0
              ? `Avg spend $${Math.round(data.grocery.avgSpend)}/trip${data.grocery.freqDays > 0 ? ` · every ${data.grocery.freqDays.toFixed(1)} days` : ''}`
              : 'No grocery trips yet'}
          </div>
        </div>
        <div class="insight-value">${data.grocery.count} trips</div>
      </div>

      <div class="insight-card">
        <div class="insight-icon">⛽</div>
        <div style="flex:1;">
          <div class="insight-title">Gas fill-ups</div>
          <div class="insight-detail">
            ${data.gas.count > 0
              ? `Avg $${Math.round(data.gas.avgSpend)}/fill${data.gas.freqDays > 0 ? ` · every ${data.gas.freqDays.toFixed(1)} days` : ''}`
              : 'No gas logged yet'}
          </div>
        </div>
        <div class="insight-value">${data.gas.count} fills</div>
      </div>

      <div class="insight-card">
        <div class="insight-icon">🎯</div>
        <div style="flex:1;">
          <div class="insight-title">Eating out</div>
          <div class="insight-detail">
            ${data.eatingOut.count > 0
              ? `${Data.formatCurrency(data.eatingOut.total)} total this month`
              : 'No eating out logged'}
          </div>
        </div>
        <div class="insight-value">${data.eatingOut.count}x</div>
      </div>

      ${data.hobbies.topHobby ? `
        <div class="insight-card">
          <div class="insight-icon">🏌️</div>
          <div style="flex:1;">
            <div class="insight-title">Top hobby: ${data.hobbies.topHobby.name}</div>
            <div class="insight-detail">${Data.formatCurrency(data.hobbies.total)} on hobbies total</div>
          </div>
          <div class="insight-value">${Data.formatCurrency(data.hobbies.topHobby.amount)}</div>
        </div>
      ` : ''}

      <div class="section-label">Spending streaks</div>
      <div class="streak-card">
        <span class="streak-label">Longest no eating-out streak</span>
        <span class="streak-value" style="color:var(--ink-green);">${data.streaks.longestNoEat} days</span>
      </div>
      <div class="streak-card">
        <span class="streak-label">Biggest single day</span>
        <span class="streak-value" style="color:var(--ink-red);">${bigDay} · ${Data.formatCurrency(data.streaks.biggestDayAmt)}</span>
      </div>
      <div class="streak-card">
        <span class="streak-label">Quietest day</span>
        <span class="streak-value" style="color:var(--ink-green);">${quietDay}${data.streaks.quietestDay ? ' · ' + Data.formatCurrency(data.streaks.quietestDayAmt) : ''}</span>
      </div>
      <div class="streak-card">
        <span class="streak-label">Daily average spend</span>
        <span class="streak-value" style="color:var(--accent);">${Data.formatCurrency(data.dailyAvg)}</span>
      </div>
    `;
  }

  function setInsightsMonth(ymStr) {
    const [y, m] = ymStr.split('-').map(Number);
    insightsMonth = { year: y, month: m };
    renderInsights();
  }

  /* ===== GOALS ===== */
  function renderGoals() {
    const el = document.getElementById('screen-goals');
    const user = Data.getUser() || {};
    const savingsTarget = Data.getSavingsTarget();
    const savingsBalance = parseFloat(user.savingsBalance) || 0;
    const pct = savingsTarget > 0 ? Math.min(100, Math.round((savingsBalance / savingsTarget) * 100)) : 0;
    const gap = Math.max(0, savingsTarget - savingsBalance);
    const cache = Data.getInsightsCache();
    const monthsCount = cache ? cache.dataMonthsCount || 0 : 0;

    const income = parseFloat(user.income) || 0;
    const now = new Date();
    const monthTotal = Data.getMonthlyTotal(now.getFullYear(), now.getMonth() + 1);
    const surplus = Math.max(0, income - monthTotal);

    // Estimate months to goal
    const monthsSaved = monthsCount >= 1 ? cache.monthlyAverageSpend || 0 : 0;
    const monthlySurplusEstimate = income - (savingsTarget / 12);
    const monthsToGoal = monthlySurplusEstimate > 0 && gap > 0
      ? Math.ceil(gap / monthlySurplusEstimate)
      : null;

    const cats = ['Groceries', 'Eating out', 'Hobbies', 'Gas', 'Other'];
    const limits = user.categoryLimits || {};

    const healthRows = cats.map(cat => {
      const limit = parseFloat(limits[cat]) || 0;
      if (limit === 0) return '';
      const spent = Data.getCategoryTotal(now.getFullYear(), now.getMonth() + 1, cat);
      const pct = Math.round((spent / limit) * 100);
      const color = pct >= 100 ? 'var(--ink-red)' : pct >= 85 ? 'var(--ink-amber)' : 'var(--ink-green)';
      const tag = pct >= 100 ? 'over' : pct >= 85 ? 'close' : 'on track';
      return `
        <div class="health-row">
          <span style="font-size:14px; color:var(--ink);">${cat}</span>
          <div style="display:flex; align-items:center; gap:10px;">
            <span style="font-size:13px; color:var(--ink-muted);">${Data.formatCurrency(spent)} / ${Data.formatCurrency(limit)}</span>
            <span style="font-size:12px; font-weight:500; color:${color};">${tag}</span>
          </div>
        </div>
      `;
    }).join('');

    el.innerHTML = `
      <div class="page-header">
        <div class="page-title">Goals</div>
        <div class="page-subtitle">1 year of expenses saved · ${monthsCount < 3 ? 'estimate (updates after 3 months)' : 'based on real data'}</div>
      </div>

      <div class="goals-hero">
        <div class="goals-hero-label">Savings target</div>
        <div class="goals-target">${Data.formatCurrency(savingsTarget)}</div>
        <div class="goals-current">Current balance: ${Data.formatCurrency(savingsBalance)}
          <button onclick="App.editSavingsBalance()" style="color:var(--accent); font-size:13px; margin-left:8px;">Update</button>
        </div>
        <div class="progress-track">
          <div class="progress-fill" style="width:${pct}%;"></div>
        </div>
        <div class="row-between" style="margin-top:4px;">
          <span class="goals-pct">${pct}% complete</span>
          <span class="goals-gap">${Data.formatCurrency(gap)} to go</span>
        </div>
        ${monthsToGoal ? `<div class="goals-months">At current pace, ~${monthsToGoal} months to reach goal</div>` : ''}
      </div>

      ${healthRows ? `
        <div class="section-label">This month's budget health</div>
        <div class="card">${healthRows}</div>
      ` : ''}

      <div class="section-label">Investment opportunity</div>
      <div class="invest-card">
        <div class="invest-label">Based on this month</div>
        <div class="invest-range">${Data.formatCurrency(surplus * 0.5)} – ${Data.formatCurrency(surplus)}</div>
        <div class="invest-note">You could comfortably put this away in investments this month if you want. Conservative = 50% of surplus, full = 100%.</div>
      </div>
    `;
  }

  function editSavingsBalance() {
    const user = Data.getUser() || {};
    const current = parseFloat(user.savingsBalance) || 0;

    const backdrop = document.createElement('div');
    backdrop.className = 'edit-modal-backdrop';
    backdrop.innerHTML = `
      <div class="edit-modal">
        <div class="edit-modal-title">Update savings balance</div>
        <div style="position:relative; margin-bottom:12px;">
          <span style="position:absolute; left:14px; top:50%; transform:translateY(-50%); color:var(--ink-muted);">$</span>
          <input type="number" id="modal-savings-input" value="${current}" inputmode="decimal"
            style="padding-left:28px; width:100%; background:var(--bg-card); border:0.5px solid var(--divider); border-radius:var(--radius-el); padding:12px 14px 12px 28px; font-size:16px; color:var(--ink); outline:none;" />
        </div>
        <div class="edit-modal-actions">
          <button class="edit-modal-cancel" onclick="App.closeModal()">Cancel</button>
          <button class="edit-modal-save" onclick="App.saveSavingsBalance()">Save</button>
        </div>
      </div>
    `;
    document.getElementById('app').appendChild(backdrop);
    setTimeout(() => backdrop.querySelector('input').focus(), 100);
  }

  function saveSavingsBalance() {
    const val = parseFloat(document.getElementById('modal-savings-input').value) || 0;
    Data.saveUser({ savingsBalance: val });
    closeModal();
    renderGoals();
  }

  function closeModal() {
    const m = document.querySelector('.edit-modal-backdrop');
    if (m) m.remove();
  }

  /* ===== SETTINGS ===== */
  function renderSettings() {
    const el = document.getElementById('screen-settings');
    const user = Data.getUser() || {};
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

    el.innerHTML = `
      <div class="page-header">
        <div class="page-title">Settings</div>
      </div>

      <div class="section-label">Profile</div>
      <div class="settings-section">
        <div class="settings-row" onclick="App.editSetting('name','Your name', '${user.name || ''}')">
          <span class="settings-row-label">Name</span>
          <div style="display:flex; align-items:center; gap:8px;">
            <span class="settings-row-value">${user.name || '—'}</span>
            <span class="settings-row-chevron">›</span>
          </div>
        </div>
        <div class="settings-row" onclick="App.editSetting('income','Monthly income', '${user.income || ''}', 'number')">
          <span class="settings-row-label">Monthly income</span>
          <div style="display:flex; align-items:center; gap:8px;">
            <span class="settings-row-value">${Data.formatCurrency(user.income || 0)}</span>
            <span class="settings-row-chevron">›</span>
          </div>
        </div>
      </div>

      <div class="section-label">Appearance</div>
      <div class="settings-section">
        <div class="settings-row">
          <span class="settings-row-label">Dark mode</span>
          <label class="toggle-switch">
            <input type="checkbox" ${isDark ? 'checked' : ''} onchange="App.toggleTheme(this.checked)" />
            <span class="toggle-slider"></span>
          </label>
        </div>
      </div>

      <div class="section-label">Budget limits</div>
      <div class="settings-section">
        ${['Groceries','Eating out','Hobbies','Gas','Other'].map(cat => `
          <div class="settings-row" onclick="App.editCatLimit('${cat}')">
            <span class="settings-row-label">${cat}</span>
            <div style="display:flex; align-items:center; gap:8px;">
              <span class="settings-row-value">${Data.formatCurrency((user.categoryLimits||{})[cat] || 0)}/mo</span>
              <span class="settings-row-chevron">›</span>
            </div>
          </div>
        `).join('')}
      </div>

      <div class="section-label">Data</div>
      <div class="settings-section">
        <div class="settings-row" onclick="App.exportData()">
          <span class="settings-row-label">Export my data</span>
          <span class="settings-row-chevron">›</span>
        </div>
        <div class="settings-row" onclick="App.downloadBlank()">
          <span class="settings-row-label">Download blank version</span>
          <span class="settings-row-value" style="font-size:12px;">for sharing</span>
        </div>
      </div>

      <div style="height:16px;"></div>
      <button class="settings-danger-btn" onclick="App.confirmReset()">Reset all data</button>
      <div style="height:8px;"></div>
    `;
  }

  function editSetting(key, label, current, type = 'text') {
    const backdrop = document.createElement('div');
    backdrop.className = 'edit-modal-backdrop';
    backdrop.innerHTML = `
      <div class="edit-modal">
        <div class="edit-modal-title">Edit ${label.toLowerCase()}</div>
        <input type="${type}" id="modal-edit-input" value="${current}"
          ${type === 'number' ? 'inputmode="decimal"' : ''}
          placeholder="${label}" />
        <div class="edit-modal-actions">
          <button class="edit-modal-cancel" onclick="App.closeModal()">Cancel</button>
          <button class="edit-modal-save" onclick="App.saveSettingEdit('${key}')">Save</button>
        </div>
      </div>
    `;
    document.getElementById('app').appendChild(backdrop);
    setTimeout(() => backdrop.querySelector('input').select(), 100);
  }

  function saveSettingEdit(key) {
    const val = document.getElementById('modal-edit-input').value;
    Data.saveUser({ [key]: key === 'income' ? parseFloat(val) || 0 : val });
    closeModal();
    renderSettings();
  }

  function editCatLimit(cat) {
    const user = Data.getUser() || {};
    const current = (user.categoryLimits || {})[cat] || 0;
    const backdrop = document.createElement('div');
    backdrop.className = 'edit-modal-backdrop';
    backdrop.innerHTML = `
      <div class="edit-modal">
        <div class="edit-modal-title">${cat} budget limit</div>
        <div style="position:relative; margin-bottom:12px;">
          <span style="position:absolute; left:14px; top:50%; transform:translateY(-50%); color:var(--ink-muted);">$</span>
          <input type="number" id="modal-cat-input" value="${current}" inputmode="decimal"
            style="padding-left:28px; width:100%; background:var(--bg-card); border:0.5px solid var(--divider); border-radius:var(--radius-el); padding:12px 14px 12px 28px; font-size:16px; color:var(--ink); outline:none;" />
        </div>
        <div class="edit-modal-actions">
          <button class="edit-modal-cancel" onclick="App.closeModal()">Cancel</button>
          <button class="edit-modal-save" onclick="App.saveCatLimit('${cat}')">Save</button>
        </div>
      </div>
    `;
    document.getElementById('app').appendChild(backdrop);
    setTimeout(() => backdrop.querySelector('input').select(), 100);
  }

  function saveCatLimit(cat) {
    const val = parseFloat(document.getElementById('modal-cat-input').value) || 0;
    const user = Data.getUser() || {};
    const limits = { ...(user.categoryLimits || {}) };
    limits[cat] = val;
    Data.saveUser({ categoryLimits: limits });
    closeModal();
    renderSettings();
  }

  function toggleTheme(isDark) {
    const theme = isDark ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', theme);
    Data.saveUser({ theme });
  }

  function exportData() {
    const data = Data.exportAllData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ledger-export-' + Data.getTodayStr() + '.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  function downloadBlank() {
    alert('To get a blank version of Ledger:\n\n1. Copy the /budget-app folder\n2. Delete budget_user, budget_expenses, and budget_insights_cache from localStorage\n3. Share the folder — the next person who opens it will go through fresh onboarding.');
  }

  function confirmReset() {
    if (confirm('This will delete all your data and restart the app. Are you sure?')) {
      Data.clearAllData();
      location.reload();
    }
  }

  /* ===== MONTHLY WRAP ===== */
  function checkMonthlyWrap() {
    const now = new Date();
    const user = Data.getUser();
    if (!user) return;

    const summaryDate = user.summaryDate;
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const targetDay = summaryDate === 'last' ? lastDay : parseInt(summaryDate);
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    if (now.getDate() === targetDay && !Data.isMonthlyDismissed(year, month)) {
      setTimeout(() => showMonthlyWrap(year, month), 800);
    }
  }

  function showMonthlyWrap(year, month) {
    const summary = Data.getMonthlySummary(year, month);
    if (!summary) return;

    const monthName = new Date(year, month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const insights = Insights.calculate(year, month);
    const user = Data.getUser() || {};
    const income = parseFloat(user.income) || 0;

    const backdrop = document.createElement('div');
    backdrop.className = 'monthly-modal';
    backdrop.id = 'monthly-modal';

    // Split categories into fixed vs variable
    const fixedEntries = Object.entries(summary.byCategory).filter(([, d]) => d.isFixed);
    const varEntries = Object.entries(summary.byCategory).filter(([, d]) => !d.isFixed && d.spent > 0);

    function catRow(cat, data) {
      const diff = data.limit > 0 ? data.spent - data.limit : null;
      const pct = data.limit > 0 ? Math.min(100, Math.round((data.spent / data.limit) * 100)) : null;
      const overColor = diff > 0 ? 'var(--ink-red)' : 'var(--ink-green)';
      const diffLabel = diff !== null
        ? (diff > 0
          ? `<span style="font-size:11px; color:var(--ink-red);">+${Data.formatCurrency(diff)} over</span>`
          : `<span style="font-size:11px; color:var(--ink-green);">${Data.formatCurrency(Math.abs(diff))} under</span>`)
        : '';
      const bar = pct !== null ? `
        <div style="height:3px; background:var(--divider); border-radius:2px; margin-top:4px;">
          <div style="height:3px; width:${pct}%; background:${diff > 0 ? 'var(--ink-red)' : 'var(--accent)'}; border-radius:2px;"></div>
        </div>` : '';
      return `
        <div class="monthly-cat-row">
          <div style="flex:1;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <span style="color:var(--ink); font-size:14px;">${cat}</span>
              <div style="display:flex; align-items:center; gap:8px;">
                <span style="font-weight:500; color:var(--ink); font-size:14px;">${Data.formatCurrency(data.spent)}</span>
                ${data.limit > 0 ? `<span style="font-size:11px; color:var(--ink-muted);">of ${Data.formatCurrency(data.limit)}</span>` : ''}
              </div>
            </div>
            ${diffLabel}
            ${bar}
          </div>
        </div>
      `;
    }

    const fixedRows = fixedEntries.map(([cat, data]) => catRow(cat, data)).join('');
    const varRows = varEntries.map(([cat, data]) => catRow(cat, data)).join('');

    const surplusPositive = summary.surplus > 0;

    backdrop.innerHTML = `
      <div class="monthly-sheet">
        <div class="monthly-handle"></div>

        <div style="font-size:22px; font-weight:500; color:var(--ink); margin-bottom:2px;">${monthName}</div>
        <div style="font-size:13px; color:var(--ink-muted); margin-bottom:20px;">Monthly wrap-up</div>

        <!-- Top stats -->
        <div class="monthly-stat-grid" style="margin-bottom:20px;">
          <div class="monthly-stat">
            <div class="monthly-stat-label">Total spent</div>
            <div class="monthly-stat-val">${Data.formatCurrency(summary.total)}</div>
            <div style="font-size:11px; color:var(--ink-muted); margin-top:2px;">of ${Data.formatCurrency(income)} income</div>
          </div>
          <div class="monthly-stat">
            <div class="monthly-stat-label">${surplusPositive ? 'Surplus' : 'Over budget'}</div>
            <div class="monthly-stat-val" style="color:${surplusPositive ? 'var(--ink-green)' : 'var(--ink-red)'};">${Data.formatCurrency(Math.abs(summary.surplus))}</div>
            <div style="font-size:11px; color:var(--ink-muted); margin-top:2px;">${surplusPositive ? 'left over' : 'over income'}</div>
          </div>
        </div>

        <!-- Overall progress bar -->
        <div style="margin-bottom:20px;">
          <div style="display:flex; justify-content:space-between; font-size:12px; color:var(--ink-muted); margin-bottom:4px;">
            <span>Budget used</span>
            <span>${income > 0 ? Math.round((summary.total/income)*100) : 0}%</span>
          </div>
          <div style="height:6px; background:var(--divider); border-radius:4px;">
            <div style="height:6px; width:${income > 0 ? Math.min(100,Math.round((summary.total/income)*100)) : 0}%; background:${surplusPositive ? 'var(--accent)' : 'var(--ink-red)'}; border-radius:4px;"></div>
          </div>
        </div>

        <!-- Fixed costs -->
        ${fixedRows ? `
          <div style="font-size:11px; color:var(--ink-muted); text-transform:uppercase; letter-spacing:0.06em; margin-bottom:6px;">Fixed costs</div>
          <div style="background:var(--bg-card); border-radius:var(--radius-card); padding:4px 16px; margin-bottom:16px;">
            ${fixedRows}
            <div style="display:flex; justify-content:space-between; padding:8px 0 4px; border-top:0.5px solid var(--divider); margin-top:4px;">
              <span style="font-size:12px; color:var(--ink-muted);">Fixed total</span>
              <span style="font-size:12px; font-weight:500; color:var(--ink);">${Data.formatCurrency(summary.fixedTotal)}</span>
            </div>
          </div>
        ` : ''}

        <!-- Variable spending -->
        ${varRows ? `
          <div style="font-size:11px; color:var(--ink-muted); text-transform:uppercase; letter-spacing:0.06em; margin-bottom:6px;">Variable spending</div>
          <div style="background:var(--bg-card); border-radius:var(--radius-card); padding:4px 16px; margin-bottom:16px;">${varRows}</div>
        ` : ''}

        <!-- Habit highlights -->
        <div style="font-size:11px; color:var(--ink-muted); text-transform:uppercase; letter-spacing:0.06em; margin-bottom:6px;">Habit highlights</div>
        <div style="background:var(--bg-card); border-radius:var(--radius-card); padding:10px 16px; margin-bottom:16px;">
          <div style="display:flex; justify-content:space-between; padding:5px 0; border-bottom:0.5px solid var(--divider); font-size:13px;">
            <span style="color:var(--ink-muted);">🛒 Grocery trips</span>
            <span style="color:var(--ink); font-weight:500;">${insights.grocery.count} trips · avg ${Data.formatCurrency(insights.grocery.avgSpend)}</span>
          </div>
          <div style="display:flex; justify-content:space-between; padding:5px 0; border-bottom:0.5px solid var(--divider); font-size:13px;">
            <span style="color:var(--ink-muted);">🍽 Eating out</span>
            <span style="color:var(--ink); font-weight:500;">${insights.eatingOut.count}x · ${Data.formatCurrency(insights.eatingOut.total)}</span>
          </div>
          <div style="display:flex; justify-content:space-between; padding:5px 0; border-bottom:0.5px solid var(--divider); font-size:13px;">
            <span style="color:var(--ink-muted);">⛽ Gas fill-ups</span>
            <span style="color:var(--ink); font-weight:500;">${insights.gas.count} fills · ${Data.formatCurrency(insights.gas.total)}</span>
          </div>
          ${insights.hobbies.topHobby ? `
          <div style="display:flex; justify-content:space-between; padding:5px 0; font-size:13px;">
            <span style="color:var(--ink-muted);">🎯 Top hobby</span>
            <span style="color:var(--ink); font-weight:500;">${insights.hobbies.topHobby.name} · ${Data.formatCurrency(insights.hobbies.topHobby.amount)}</span>
          </div>` : ''}
        </div>

        <!-- Investment suggestion -->
        <div style="background:var(--bg-card); border-radius:var(--radius-card); padding:16px; margin-bottom:20px; border-left:3px solid var(--accent); border-top-left-radius:0; border-bottom-left-radius:0;">
          <div style="font-size:12px; color:var(--ink-muted); margin-bottom:4px; text-transform:uppercase; letter-spacing:0.05em;">Investment opportunity</div>
          <div style="font-size:26px; font-weight:500; color:var(--accent); margin:6px 0;">${Data.formatCurrency(summary.investLow)} – ${Data.formatCurrency(summary.investHigh)}</div>
          <div style="font-size:12px; color:var(--ink-muted); line-height:1.5;">You could comfortably put this away in investments this month if you want. Based on ${surplusPositive ? 'your ' + Data.formatCurrency(summary.surplus) + ' surplus' : 'this month\'s spend'}.</div>
        </div>

        <div class="monthly-actions">
          <button class="monthly-action-btn monthly-action-secondary" onclick="App.dismissMonthly(${year}, ${month})">Dismiss</button>
          <button class="monthly-action-btn monthly-action-primary" onclick="App.dismissMonthly(${year}, ${month})">Start next month</button>
        </div>
      </div>
    `;

    document.getElementById('app').appendChild(backdrop);
  }

  function dismissMonthly(year, month) {
    Data.dismissMonthly(year, month);
    const m = document.getElementById('monthly-modal');
    if (m) m.remove();
  }

  /* ===== UTILS ===== */
  function dateToStr(d) {
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }

  function formatDisplayDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T12:00:00');
    const today = new Date();
    const todayStr = Data.getTodayStr();
    if (dateStr === todayStr) return 'Today';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  function formatWeekLabel(start, end) {
    const sMonth = start.toLocaleDateString('en-US', { month: 'short' });
    const eMonth = end.toLocaleDateString('en-US', { month: 'short' });
    if (sMonth === eMonth) {
      return `${sMonth} ${start.getDate()}–${end.getDate()}`;
    }
    return `${sMonth} ${start.getDate()} – ${eMonth} ${end.getDate()}`;
  }

  return {
    boot, init, navigate,
    setCalView, calNav, dayTap,
    toggleExpenseExpand,
    openAddExpense, closeAddExpense,
    selectCat, addSubItem, removeSubItem, saveExpense,
    addCustomCategoryPrompt, saveCustomCategory,
    renderInsights, setInsightsMonth,
    renderGoals, editSavingsBalance, saveSavingsBalance,
    editSetting, saveSettingEdit, editCatLimit, saveCatLimit,
    toggleTheme, exportData, downloadBlank, confirmReset,
    checkMonthlyWrap, showMonthlyWrap, dismissMonthly,
    closeModal
  };
})();

// Boot on DOM ready
document.addEventListener('DOMContentLoaded', () => App.boot());