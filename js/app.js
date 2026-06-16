const App = (() => {

  let currentScreen = 'home';
  let calendarView = 'week';
  let calendarDate = new Date();
  let selectedDayDate = null;
  let addExpenseDate = null;
  let addSubItems = [];
  let expandedExpenseId = null;
  let insightsMonth = null;

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

  function navigate(screen, options) {
    options = options || {};
    if (screen === 'add') { openAddExpense(options.date || null); return; }
    document.querySelectorAll('.screen').forEach(function(s) { s.classList.add('hidden'); });
    document.querySelectorAll('.nav-btn').forEach(function(b) { b.classList.remove('active'); });
    const el = document.getElementById('screen-' + screen);
    if (el) { el.classList.remove('hidden'); el.classList.add('animate-in'); }
    const navBtn = document.querySelector('.nav-btn[data-screen="' + screen + '"]');
    if (navBtn) navBtn.classList.add('active');
    currentScreen = screen;
    if (screen === 'home') renderHome();
    else if (screen === 'day') renderDay(options.date || Data.getTodayStr());
    else if (screen === 'insights') renderInsights();
    else if (screen === 'goals') renderGoals();
    else if (screen === 'loans') renderLoans();
    else if (screen === 'settings') renderSettings();
  }

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
    const recentExpenses = Data.getAllExpenses().sort(function(a, b) { return b.date > a.date ? 1 : -1; }).slice(0, 5);
    const overClass = pct >= 100 ? 'over' : pct >= 85 ? 'close' : '';
    let recentHtml = '';
    if (recentExpenses.length === 0) {
      recentHtml = '<div style="padding:20px;text-align:center;color:var(--ink-muted);font-size:14px;">No expenses yet — tap + to add your first one.</div>';
    } else {
      recentExpenses.forEach(function(e) { recentHtml += expenseItemHtml(e, false); });
    }
    el.innerHTML = '<div class="page-header">'
      + '<div class="page-subtitle">' + monthName + '</div>'
      + '<div class="home-hero" style="padding:8px 0 0;">'
      + '<div><div class="home-spent-label">spent so far</div><div class="home-spent">' + Data.formatCurrency(totalSpent) + '</div></div>'
      + '<div class="home-remaining-card"><div class="home-remaining-amt">' + Data.formatCurrency(remaining) + '</div><div class="home-remaining-label">remaining</div></div>'
      + '</div>'
      + '<div class="progress-track" style="margin:8px 0 0;"><div class="progress-fill ' + overClass + '" style="width:' + pct + '%;"></div></div>'
      + '</div>'
      + '<div class="cal-container">'
      + '<div class="cal-view-toggle" style="margin-bottom:10px;">'
      + '<button class="cal-view-btn ' + (calendarView === 'day' ? 'active' : '') + '" onclick="App.setCalView(\'day\')">Day</button>'
      + '<button class="cal-view-btn ' + (calendarView === 'week' ? 'active' : '') + '" onclick="App.setCalView(\'week\')">Week</button>'
      + '<button class="cal-view-btn ' + (calendarView === 'month' ? 'active' : '') + '" onclick="App.setCalView(\'month\')">Month</button>'
      + '</div><div id="cal-body"></div></div>'
      + '<div class="section-label">Recent</div>'
      + '<div id="recent-list">' + recentHtml + '</div>';
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
    const todayStr = Data.getTodayStr();
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
    let cells = '';
    const headers = ['M','T','W','T','F','S','S'];
    headers.forEach(function(h) { cells += '<div class="cal-day-header">' + h + '</div>'; });
    days.forEach(function(d) {
      const ds = dateToStr(d);
      const isToday = ds === todayStr;
      const hasSpend = Data.hasExpensesOnDate(ds);
      cells += '<div class="cal-day-cell ' + (isToday ? 'today' : '') + '" onclick="App.dayTap(\'' + ds + '\')">'
        + '<div class="cal-day-num">' + d.getDate() + '</div>'
        + '<div class="cal-dot ' + (hasSpend ? '' : 'hidden') + '"></div>'
        + '</div>';
    });
    return '<div class="cal-nav">'
      + '<button class="cal-nav-btn" onclick="App.calNav(-1)">&#8249;</button>'
      + '<span class="cal-nav-title">' + weekLabel + '</span>'
      + '<button class="cal-nav-btn" onclick="App.calNav(1)">&#8250;</button>'
      + '</div><div class="cal-week-grid">' + cells + '</div>';
  }

  function renderMonthCal() {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const todayStr = Data.getTodayStr();
    const monthName = calendarDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const offset = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
    let cells = '';
    const headers = ['M','T','W','T','F','S','S'];
    headers.forEach(function(h) { cells += '<div class="cal-day-header" style="font-size:10px;">' + h + '</div>'; });
    for (let i = 0; i < offset; i++) {
      const pd = new Date(year, month, 1 - (offset - i));
      cells += '<div class="cal-month-cell other-month"><div class="cal-day-num">' + pd.getDate() + '</div></div>';
    }
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const ds = year + '-' + String(month + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
      const isToday = ds === todayStr;
      const hasSpend = Data.hasExpensesOnDate(ds);
      cells += '<div class="cal-month-cell ' + (isToday ? 'today' : '') + '" onclick="App.dayTap(\'' + ds + '\')">'
        + '<div class="cal-day-num">' + d + '</div>'
        + (hasSpend && !isToday ? '<div class="cal-dot"></div>' : '')
        + '</div>';
    }
    return '<div class="cal-nav">'
      + '<button class="cal-nav-btn" onclick="App.calNav(-1)">&#8249;</button>'
      + '<span class="cal-nav-title">' + monthName + '</span>'
      + '<button class="cal-nav-btn" onclick="App.calNav(1)">&#8250;</button>'
      + '</div><div class="cal-month-grid" style="margin-bottom:8px;">' + cells + '</div>';
  }

  function renderDayCal() {
    const todayStr = Data.getTodayStr();
    const ds = dateToStr(calendarDate);
    const label = new Date(calendarDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    const total = Data.getDailyTotal(ds);
    const totalColor = total > 0 ? 'var(--ink)' : 'var(--ink-muted)';
    const dayLabel = ds === todayStr ? 'Today' : 'total spent';
    return '<div class="cal-nav">'
      + '<button class="cal-nav-btn" onclick="App.calNav(-1)">&#8249;</button>'
      + '<span class="cal-nav-title">' + label + '</span>'
      + '<button class="cal-nav-btn" onclick="App.calNav(1)">&#8250;</button>'
      + '</div>'
      + '<div style="text-align:center;padding:12px 0;cursor:pointer;" onclick="App.dayTap(\'' + ds + '\')">'
      + '<div style="font-size:32px;font-weight:500;color:' + totalColor + ';">' + Data.formatCurrency(total) + '</div>'
      + '<div style="font-size:13px;color:var(--ink-muted);">' + dayLabel + '</div>'
      + '</div>';
  }

  function setCalView(view) { calendarView = view; calendarDate = new Date(); renderHome(); }

  function calNav(dir) {
    if (calendarView === 'week') calendarDate.setDate(calendarDate.getDate() + dir * 7);
    else if (calendarView === 'month') calendarDate.setMonth(calendarDate.getMonth() + dir);
    else calendarDate.setDate(calendarDate.getDate() + dir);
    renderCalendarBody();
  }

  function dayTap(dateStr) { navigate('day', { date: dateStr }); }

  function renderDay(dateStr) {
    selectedDayDate = dateStr;
    const el = document.getElementById('screen-day');
    const d = new Date(dateStr + 'T12:00:00');
    const label = d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    const isToday = dateStr === Data.getTodayStr();
    const expenses = Data.getExpensesByDate(dateStr);
    const dayTotal = expenses.reduce(function(s, e) { return s + e.amount; }, 0);
    const user = Data.getUser() || {};
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const dailyAvg = Data.getDailyAverage(year, month);
    const diff = dayTotal - dailyAvg;
    let diffStr, diffColor;
    if (diff > 0) { diffStr = '+' + Data.formatCurrency(diff) + ' over avg'; diffColor = 'var(--ink-red)'; }
    else if (diff < 0) { diffStr = Data.formatCurrency(Math.abs(diff)) + ' under avg'; diffColor = 'var(--ink-green)'; }
    else { diffStr = 'Right at your avg'; diffColor = 'var(--ink-muted)'; }
    const categories = Data.getCategories();
    const limits = user.categoryLimits || {};
    const fixedCosts = user.fixedCosts || [];
    let catBreakdown = '';
    categories.forEach(function(cat) {
      const spent = expenses.filter(function(e) { return e.category === cat; }).reduce(function(s, e) { return s + e.amount; }, 0);
      if (spent === 0) return;
      const isFixed = fixedCosts.some(function(f) { return f.name === cat; });
      const fixedMatch = fixedCosts.find(function(f) { return f.name === cat; });
      const limit = isFixed ? (parseFloat((fixedMatch || {}).amount) || 0) : (parseFloat(limits[cat]) || 0);
      const pct = limit > 0 ? Math.min(100, Math.round((spent / limit) * 100)) : 100;
      const fillClass = pct >= 100 ? 'over' : pct >= 85 ? 'close' : '';
      catBreakdown += '<div style="margin-bottom:10px;">'
        + '<div class="row-between" style="margin-bottom:4px;">'
        + '<span style="font-size:13px;color:var(--ink);">' + cat + '</span>'
        + '<span style="font-size:13px;font-weight:500;color:var(--accent);">' + Data.formatCurrency(spent) + '</span>'
        + '</div>'
        + '<div class="progress-track" style="margin:0;"><div class="progress-fill ' + fillClass + '" style="width:' + pct + '%;"></div></div>'
        + '</div>';
    });
    let expenseList = '';
    if (expenses.length === 0) {
      expenseList = '<div style="padding:20px;text-align:center;color:var(--ink-muted);font-size:14px;">No expenses on this day.</div>';
    } else {
      expenses.forEach(function(e) { expenseList += expenseItemHtml(e, true); });
    }
    const headerDate = isToday ? 'Today' : label;
    const subDate = !isToday ? '<div style="font-size:12px;color:var(--ink-muted);">' + label + '</div>' : '';
    const breakdownHtml = catBreakdown ? '<div class="section-label">Breakdown</div><div class="card">' + catBreakdown + '</div>' : '';
    const avgHtml = dailyAvg > 0
      ? '<div class="day-avg-compare"><span style="color:var(--ink-muted);font-size:13px;">vs. daily average</span><span style="font-weight:500;font-size:13px;color:' + diffColor + ';">' + diffStr + '</span></div>'
      : '';
    el.innerHTML = '<div class="day-header">'
      + '<button class="day-back-btn" onclick="App.navigate(\'home\')">'
      + '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>'
      + '</button>'
      + '<div style="text-align:center;"><div style="font-size:15px;font-weight:500;color:var(--ink);">' + headerDate + '</div>' + subDate + '</div>'
      + '<div style="text-align:right;"><div class="day-total">' + Data.formatCurrency(dayTotal) + '</div><div class="day-total-label">spent</div></div>'
      + '</div>'
      + breakdownHtml + avgHtml
      + '<div class="section-label">Expenses</div>'
      + '<div id="day-expense-list">' + expenseList + '</div>'
      + '<div style="padding:16px 16px 0;display:flex;justify-content:center;">'
      + '<button onclick="App.navigate(\'add\',{date:\'' + dateStr + '\'})" style="background:var(--accent);color:#fff;border-radius:var(--radius-pill);padding:11px 24px;font-size:14px;font-weight:500;display:flex;align-items:center;gap:6px;">'
      + '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>'
      + 'Add to this day</button></div>';
  }

  function toggleExpenseExpand(id) {
    expandedExpenseId = expandedExpenseId === id ? null : id;
    if (selectedDayDate) renderDay(selectedDayDate);
  }

  function expenseItemHtml(e, expandable) {
    expandable = expandable || false;
    const isExpanded = expandable && expandedExpenseId === e.id;
    const hasSubItems = e.subItems && e.subItems.length > 0;
    let subHtml = '';
    if (isExpanded && hasSubItems) {
      let rows = '';
      e.subItems.forEach(function(si) {
        rows += '<div class="sub-item-row"><span>' + si.name + '</span><span>' + Data.formatCurrency(si.amount) + '</span></div>';
      });
      const noteHtml = e.note ? '<div style="font-size:12px;color:var(--ink-muted);margin-top:6px;padding-top:6px;border-top:.5px solid var(--divider);">' + e.note + '</div>' : '';
      subHtml = '<div class="expense-expand">' + rows + noteHtml + '</div>';
    } else if (isExpanded && e.note) {
      subHtml = '<div class="expense-expand"><div style="font-size:13px;color:var(--ink-muted);">' + e.note + '</div></div>';
    }
    let tapAction;
    if (expandable && (hasSubItems || e.note)) {
      tapAction = 'onclick="App.toggleExpenseExpand(\'' + e.id + '\')"';
    } else {
      tapAction = 'onclick="App.dayTap(\'' + e.date + '\')"';
    }
    const arrow = expandable && (hasSubItems || e.note) ? '<div style="color:var(--ink-muted);font-size:14px;">' + (isExpanded ? '▲' : '▾') + '</div>' : '';
    return '<div class="expense-item" ' + tapAction + '>'
      + '<div style="flex:1;min-width:0;">'
      + '<div class="expense-title">' + e.subject + '</div>'
      + '<div class="expense-meta">' + e.category + ' · ' + formatDisplayDate(e.date) + '</div>'
      + '</div>'
      + '<div style="display:flex;align-items:center;gap:8px;">'
      + '<div class="expense-amount">' + Data.formatCurrency(e.amount) + '</div>'
      + arrow + '</div></div>' + subHtml;
  }

  function openAddExpense(prefillDate) {
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
    requestAnimationFrame(function() { requestAnimationFrame(function() { addEl.classList.add('open'); }); });
  }

  function closeAddExpense() {
    const addEl = document.getElementById('add-expense-overlay');
    if (addEl) {
      addEl.classList.remove('open');
      setTimeout(function() { if (addEl.parentNode) addEl.parentNode.removeChild(addEl); }, 400);
    }
  }

  function buildAddExpenseHtml() {
    const cats = Data.getCategories();
    let pillsHtml = '';
    cats.forEach(function(c, i) {
      pillsHtml += '<button class="cat-pill ' + (i === 0 ? 'selected' : '') + '" onclick="App.selectCat(this)">' + c + '</button>';
    });
    pillsHtml += '<button class="cat-pill" style="border-style:dashed;" onclick="App.addCustomCategoryPrompt()">+ New</button>';
    return '<div class="add-header">'
      + '<div class="add-header-title">Add expense</div>'
      + '<button class="add-close-btn" onclick="App.closeAddExpense()">&#215;</button>'
      + '</div>'
      + '<div class="add-body">'
      + '<div class="add-step-label">What was it?</div>'
      + '<input class="add-text-input" type="text" id="add-subject" placeholder="e.g. Date night, Golf, Trader Joe\'s" autocomplete="off" />'
      + '<div class="add-step-label">Amount</div>'
      + '<div class="add-amount-wrap"><span class="add-dollar">$</span>'
      + '<input class="add-amount-input" type="number" id="add-amount" placeholder="0.00" inputmode="decimal" step="0.01" /></div>'
      + '<div class="add-step-label">Category</div>'
      + '<div class="cat-pills" id="cat-pills-container">' + pillsHtml + '</div>'
      + '<div class="add-step-label">Date</div>'
      + '<input class="add-date-input" type="date" id="add-date" value="' + addExpenseDate + '" />'
      + '<div class="add-step-label">Note (optional)</div>'
      + '<textarea class="add-note-input" id="add-note" placeholder="Any details..."></textarea>'
      + '<div class="add-step-label">Split this expense? (optional)</div>'
      + '<div class="sub-items-section">'
      + '<div class="sub-item-add-row">'
      + '<input type="text" id="sub-name" placeholder="e.g. Restaurant" autocomplete="off" />'
      + '<input type="number" id="sub-amt" placeholder="$0" inputmode="decimal" />'
      + '<button class="sub-item-add-btn" onclick="App.addSubItem()">+</button>'
      + '</div><div class="sub-items-list" id="sub-items-list"></div></div></div>'
      + '<div class="add-footer"><button class="add-save-btn" onclick="App.saveExpense()">Save expense</button></div>';
  }

  function addCustomCategoryPrompt() {
    const backdrop = document.createElement('div');
    backdrop.className = 'edit-modal-backdrop';
    backdrop.id = 'custom-cat-modal';
    backdrop.innerHTML = '<div class="edit-modal">'
      + '<div class="edit-modal-title">Add custom category</div>'
      + '<input type="text" id="custom-cat-input" placeholder="e.g. Travel, Medical, Pet..." style="width:100%;background:var(--bg-card);border:.5px solid var(--divider);border-radius:var(--radius-el);padding:12px 14px;font-size:16px;color:var(--ink);outline:none;margin-bottom:12px;" />'
      + '<div class="edit-modal-actions">'
      + '<button class="edit-modal-cancel" onclick="document.getElementById(\'custom-cat-modal\').remove()">Cancel</button>'
      + '<button class="edit-modal-save" onclick="App.saveCustomCategory()">Add</button>'
      + '</div></div>';
    document.getElementById('app').appendChild(backdrop);
    setTimeout(function() { backdrop.querySelector('input').focus(); }, 100);
  }

  function saveCustomCategory() {
    const val = (document.getElementById('custom-cat-input').value || '').trim();
    if (!val) return;
    Data.addCustomCategory(val);
    document.getElementById('custom-cat-modal').remove();
    const container = document.getElementById('cat-pills-container');
    if (container) {
      const cats = Data.getCategories();
      let html = '';
      cats.forEach(function(c) {
        html += '<button class="cat-pill ' + (c === val ? 'selected' : '') + '" onclick="App.selectCat(this)">' + c + '</button>';
      });
      html += '<button class="cat-pill" style="border-style:dashed;" onclick="App.addCustomCategoryPrompt()">+ New</button>';
      container.innerHTML = html;
    }
  }

  function selectCat(btn) {
    document.querySelectorAll('#add-expense-overlay .cat-pill').forEach(function(b) { b.classList.remove('selected'); });
    btn.classList.add('selected');
  }

  function addSubItem() {
    const name = document.getElementById('sub-name').value.trim();
    const amt = parseFloat(document.getElementById('sub-amt').value) || 0;
    if (!name || amt <= 0) return;
    addSubItems.push({ name: name, amount: amt });
    document.getElementById('sub-name').value = '';
    document.getElementById('sub-amt').value = '';
    renderSubItemsList();
  }

  function removeSubItem(i) { addSubItems.splice(i, 1); renderSubItemsList(); }

  function renderSubItemsList() {
    const list = document.getElementById('sub-items-list');
    if (!list) return;
    let html = '';
    addSubItems.forEach(function(si, i) {
      html += '<div class="sub-item-entry">'
        + '<span>' + si.name + '</span>'
        + '<div style="display:flex;align-items:center;gap:8px;">'
        + '<span>' + Data.formatCurrency(si.amount) + '</span>'
        + '<button class="sub-item-del" onclick="App.removeSubItem(' + i + ')">&#215;</button>'
        + '</div></div>';
    });
    list.innerHTML = html;
  }

  function saveExpense() {
    const subject = (document.getElementById('add-subject').value || '').trim();
    const amount = parseFloat(document.getElementById('add-amount').value) || 0;
    const catEl = document.querySelector('#add-expense-overlay .cat-pill.selected');
    const category = catEl ? catEl.textContent.trim() : 'Other';
    const date = document.getElementById('add-date').value || Data.getTodayStr();
    const note = document.getElementById('add-note').value.trim();
    if (!subject) { document.getElementById('add-subject').focus(); return; }
    if (amount <= 0) { document.getElementById('add-amount').focus(); return; }
    Data.saveExpense({ subject: subject, amount: amount, category: category, date: date, note: note, subItems: addSubItems });
    Insights.updateMonthlyAverage();
    closeAddExpense();
    setTimeout(function() {
      if (currentScreen === 'home') renderHome();
      else if (currentScreen === 'day' && selectedDayDate === date) renderDay(date);
      else if (currentScreen === 'insights') renderInsights();
    }, 420);
  }

  function renderInsights() {
    const el = document.getElementById('screen-insights');
    const now = new Date();
    const month = insightsMonth || { year: now.getFullYear(), month: now.getMonth() + 1 };
    const data = Insights.calculate(month.year, month.month);
    const monthsWithData = Data.getMonthsWithData();
    const monthLabel = new Date(month.year, month.month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    let monthOptions = '';
    if (monthsWithData.length === 0) {
      monthOptions = '<option value="' + month.year + '-' + String(month.month).padStart(2, '0') + '">' + monthLabel + '</option>';
    } else {
      monthsWithData.forEach(function(ym) {
        const parts = ym.split('-').map(Number);
        const y = parts[0];
        const m = parts[1];
        const label = new Date(y, m - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        const sel = (y === month.year && m === month.month) ? 'selected' : '';
        monthOptions += '<option value="' + ym + '" ' + sel + '>' + label + '</option>';
      });
    }

    const bigDay = data.streaks.biggestDay ? Insights.formatDate(data.streaks.biggestDay) : '—';
    const quietDay = data.streaks.quietestDay ? Insights.formatDate(data.streaks.quietestDay) : '—';

    let groceryDetail;
    if (data.grocery.count > 0) {
      groceryDetail = 'Avg $' + Math.round(data.grocery.avgSpend) + '/trip';
      if (data.grocery.freqDays > 0) groceryDetail += ' · every ' + data.grocery.freqDays.toFixed(1) + ' days';
    } else {
      groceryDetail = 'No grocery trips yet';
    }

    let gasDetail;
    if (data.gas.count > 0) {
      gasDetail = 'Avg $' + Math.round(data.gas.avgSpend) + '/fill';
      if (data.gas.freqDays > 0) gasDetail += ' · every ' + data.gas.freqDays.toFixed(1) + ' days';
    } else {
      gasDetail = 'No gas logged yet';
    }

    const eatDetail = data.eatingOut.count > 0
      ? Data.formatCurrency(data.eatingOut.total) + ' total this month'
      : 'No eating out logged';

    const bigDayDisplay = bigDay + ' · ' + Data.formatCurrency(data.streaks.biggestDayAmt);
    const quietDayDisplay = quietDay + (data.streaks.quietestDay ? ' · ' + Data.formatCurrency(data.streaks.quietestDayAmt) : '');

    let hobbyCard = '';
    if (data.hobbies.topHobby) {
      hobbyCard = '<div class="insight-card">'
        + '<div class="insight-icon">&#127919;</div>'
        + '<div style="flex:1;">'
        + '<div class="insight-title">Top hobby: ' + data.hobbies.topHobby.name + '</div>'
        + '<div class="insight-detail">' + Data.formatCurrency(data.hobbies.total) + ' on hobbies total</div>'
        + '</div>'
        + '<div class="insight-value">' + Data.formatCurrency(data.hobbies.topHobby.amount) + '</div>'
        + '</div>';
    }

    el.innerHTML = '<div class="page-header"><div class="page-title">Insights</div></div>'
      + '<div class="month-selector"><select onchange="App.setInsightsMonth(this.value)" style="flex:1;">' + monthOptions + '</select></div>'
      + '<div class="section-label">Habit cards</div>'
      + '<div class="insight-card"><div class="insight-icon">&#128722;</div>'
      + '<div style="flex:1;"><div class="insight-title">Grocery runs</div><div class="insight-detail">' + groceryDetail + '</div></div>'
      + '<div class="insight-value">' + data.grocery.count + ' trips</div></div>'
      + '<div class="insight-card"><div class="insight-icon">&#9981;</div>'
      + '<div style="flex:1;"><div class="insight-title">Gas fill-ups</div><div class="insight-detail">' + gasDetail + '</div></div>'
      + '<div class="insight-value">' + data.gas.count + ' fills</div></div>'
      + '<div class="insight-card"><div class="insight-icon">&#127374;</div>'
      + '<div style="flex:1;"><div class="insight-title">Eating out</div><div class="insight-detail">' + eatDetail + '</div></div>'
      + '<div class="insight-value">' + data.eatingOut.count + 'x</div></div>'
      + hobbyCard
      + '<div class="section-label">Spending streaks</div>'
      + '<div class="streak-card"><span class="streak-label">Longest no eating-out streak</span><span class="streak-value" style="color:var(--ink-green);">' + data.streaks.longestNoEat + ' days</span></div>'
      + '<div class="streak-card"><span class="streak-label">Biggest single day</span><span class="streak-value" style="color:var(--ink-red);">' + bigDayDisplay + '</span></div>'
      + '<div class="streak-card"><span class="streak-label">Quietest day</span><span class="streak-value" style="color:var(--ink-green);">' + quietDayDisplay + '</span></div>'
      + '<div class="streak-card"><span class="streak-label">Daily average spend</span><span class="streak-value" style="color:var(--accent);">' + Data.formatCurrency(data.dailyAvg) + '</span></div>';
  }

  function setInsightsMonth(ymStr) {
    const parts = ymStr.split('-').map(Number);
    insightsMonth = { year: parts[0], month: parts[1] };
    renderInsights();
  }

  function renderLoans() {
    const el = document.getElementById('screen-loans');
    const loans = Data.getLoans();
    const totalDebt = loans.reduce(function(s, l) { return s + l.remainingBalance; }, 0);
    const totalMonthly = loans.reduce(function(s, l) { return s + l.monthlyPayment; }, 0);

    let summaryHtml = '';
    if (loans.length > 0) {
      summaryHtml = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:0 16px;margin-bottom:16px;">'
        + '<div style="background:var(--bg-card);border-radius:10px;padding:12px;">'
        + '<div style="font-size:11px;color:var(--ink-muted);margin-bottom:4px;">Total remaining debt</div>'
        + '<div style="font-size:20px;font-weight:500;color:var(--ink-red);">' + Data.formatCurrency(totalDebt) + '</div>'
        + '</div>'
        + '<div style="background:var(--bg-card);border-radius:10px;padding:12px;">'
        + '<div style="font-size:11px;color:var(--ink-muted);margin-bottom:4px;">Monthly payments</div>'
        + '<div style="font-size:20px;font-weight:500;color:var(--ink);">' + Data.formatCurrency(totalMonthly) + '</div>'
        + '</div></div>';
    }

    let loanCards = '';
    if (loans.length === 0) {
      loanCards = '<div style="padding:30px 20px;text-align:center;color:var(--ink-muted);font-size:14px;line-height:1.6;">No loans added yet.<br>Tap below to add your first one.</div>';
    } else {
      loans.forEach(function(loan) {
        const stats = Data.getLoanStats(loan);
        const rateHtml = loan.interestRate > 0 ? loan.interestRate + '% interest' : '';
        const monthsHtml = stats.monthsLeft > 0 ? '<div style="font-size:12px;color:var(--ink-muted);margin-top:6px;">~' + stats.monthsLeft + ' months to pay off at current rate</div>' : '';
        loanCards += '<div class="card" style="margin-bottom:12px;">'
          + '<div class="row-between" style="margin-bottom:10px;">'
          + '<div><div style="font-size:16px;font-weight:500;color:var(--ink);">' + loan.name + '</div>'
          + '<div style="font-size:12px;color:var(--ink-muted);margin-top:2px;">' + rateHtml + '</div></div>'
          + '<button onclick="App.deleteLoanConfirm(\'' + loan.id + '\')" style="color:var(--ink-muted);font-size:18px;padding:4px;background:none;border:none;cursor:pointer;">&#215;</button>'
          + '</div>'
          + '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:12px;">'
          + '<div style="background:var(--bg-card-2);border-radius:8px;padding:8px;text-align:center;">'
          + '<div style="font-size:10px;color:var(--ink-muted);margin-bottom:2px;">Original</div>'
          + '<div style="font-size:13px;font-weight:500;color:var(--ink);">' + Data.formatCurrency(loan.totalAmount) + '</div></div>'
          + '<div style="background:var(--bg-card-2);border-radius:8px;padding:8px;text-align:center;">'
          + '<div style="font-size:10px;color:var(--ink-muted);margin-bottom:2px;">Remaining</div>'
          + '<div style="font-size:13px;font-weight:500;color:var(--ink-red);">' + Data.formatCurrency(loan.remainingBalance) + '</div></div>'
          + '<div style="background:var(--bg-card-2);border-radius:8px;padding:8px;text-align:center;">'
          + '<div style="font-size:10px;color:var(--ink-muted);margin-bottom:2px;">Monthly</div>'
          + '<div style="font-size:13px;font-weight:500;color:var(--ink);">' + Data.formatCurrency(loan.monthlyPayment) + '</div></div>'
          + '</div>'
          + '<div style="margin-bottom:6px;">'
          + '<div class="row-between" style="margin-bottom:4px;">'
          + '<span style="font-size:12px;color:var(--ink-muted);">Paid off</span>'
          + '<span style="font-size:12px;font-weight:500;color:var(--ink-green);">' + stats.pct + '% · ' + Data.formatCurrency(stats.paid) + '</span>'
          + '</div>'
          + '<div class="progress-track" style="margin:0;"><div class="progress-fill" style="width:' + stats.pct + '%;background:var(--ink-green);"></div></div>'
          + '</div>'
          + monthsHtml
          + '<div style="margin-top:12px;display:flex;gap:8px;">'
          + '<button onclick="App.recordPaymentPrompt(\'' + loan.id + '\')" style="flex:1;background:var(--accent);color:#fff;border-radius:8px;padding:10px;font-size:13px;font-weight:500;border:none;cursor:pointer;">Record payment</button>'
          + '<button onclick="App.updateBalancePrompt(\'' + loan.id + '\',' + loan.remainingBalance + ')" style="flex:1;background:var(--bg-card-2);color:var(--ink);border-radius:8px;padding:10px;font-size:13px;border:none;cursor:pointer;">Update balance</button>'
          + '</div></div>';
      });
    }

    el.innerHTML = '<div class="page-header">'
      + '<div class="page-title">Loans & Debt</div>'
      + '<div class="page-subtitle">Track balances, payments, and payoff progress</div>'
      + '</div>'
      + summaryHtml
      + '<div class="section-label">Your loans</div>'
      + loanCards
      + '<div style="padding:0 16px 16px;">'
      + '<button onclick="App.addLoanPrompt()" style="width:100%;background:var(--accent);color:#fff;border-radius:12px;padding:14px;font-size:15px;font-weight:500;border:none;cursor:pointer;">+ Add loan or debt</button>'
      + '</div>';
  }

  function addLoanPrompt() {
    const backdrop = document.createElement('div');
    backdrop.className = 'edit-modal-backdrop';
    backdrop.id = 'loan-modal';
    const inputStyle = 'width:100%;background:var(--bg-card);border:.5px solid var(--divider);border-radius:var(--radius-el);padding:10px 12px;font-size:15px;color:var(--ink);outline:none;';
    const prefixStyle = 'width:100%;background:var(--bg-card);border:.5px solid var(--divider);border-radius:var(--radius-el);padding:10px 12px 10px 26px;font-size:15px;color:var(--ink);outline:none;';
    backdrop.innerHTML = '<div class="edit-modal" style="max-height:85vh;overflow-y:auto;">'
      + '<div class="edit-modal-title">Add loan or debt</div>'
      + '<div style="margin-bottom:10px;"><div style="font-size:12px;color:var(--ink-muted);margin-bottom:4px;">Name</div>'
      + '<input type="text" id="loan-name" placeholder="e.g. Car loan, Student loan" style="' + inputStyle + '" /></div>'
      + '<div style="margin-bottom:10px;"><div style="font-size:12px;color:var(--ink-muted);margin-bottom:4px;">Original loan amount</div>'
      + '<div style="position:relative;"><span style="position:absolute;left:10px;top:50%;transform:translateY(-50%);color:var(--ink-muted);">$</span>'
      + '<input type="number" id="loan-total" placeholder="0" inputmode="decimal" style="' + prefixStyle + '" /></div></div>'
      + '<div style="margin-bottom:10px;"><div style="font-size:12px;color:var(--ink-muted);margin-bottom:4px;">Current remaining balance</div>'
      + '<div style="position:relative;"><span style="position:absolute;left:10px;top:50%;transform:translateY(-50%);color:var(--ink-muted);">$</span>'
      + '<input type="number" id="loan-remaining" placeholder="0" inputmode="decimal" style="' + prefixStyle + '" /></div></div>'
      + '<div style="margin-bottom:10px;"><div style="font-size:12px;color:var(--ink-muted);margin-bottom:4px;">Monthly payment</div>'
      + '<div style="position:relative;"><span style="position:absolute;left:10px;top:50%;transform:translateY(-50%);color:var(--ink-muted);">$</span>'
      + '<input type="number" id="loan-payment" placeholder="0" inputmode="decimal" style="' + prefixStyle + '" /></div></div>'
      + '<div style="margin-bottom:16px;"><div style="font-size:12px;color:var(--ink-muted);margin-bottom:4px;">Interest rate (optional)</div>'
      + '<div style="position:relative;">'
      + '<input type="number" id="loan-rate" placeholder="0.0" inputmode="decimal" style="' + inputStyle + '" />'
      + '<span style="position:absolute;right:10px;top:50%;transform:translateY(-50%);color:var(--ink-muted);">%</span></div></div>'
      + '<div class="edit-modal-actions">'
      + '<button class="edit-modal-cancel" onclick="document.getElementById(\'loan-modal\').remove()">Cancel</button>'
      + '<button class="edit-modal-save" onclick="App.saveLoan()">Add loan</button>'
      + '</div></div>';
    document.getElementById('app').appendChild(backdrop);
    setTimeout(function() { backdrop.querySelector('input').focus(); }, 100);
  }

  function saveLoan() {
    const name = (document.getElementById('loan-name').value || '').trim();
    const totalAmount = parseFloat(document.getElementById('loan-total').value) || 0;
    const remainingBalance = parseFloat(document.getElementById('loan-remaining').value) || 0;
    const monthlyPayment = parseFloat(document.getElementById('loan-payment').value) || 0;
    const interestRate = parseFloat(document.getElementById('loan-rate').value) || 0;
    if (!name || totalAmount <= 0 || monthlyPayment <= 0) return;
    Data.saveLoan({ name: name, totalAmount: totalAmount, remainingBalance: remainingBalance, monthlyPayment: monthlyPayment, interestRate: interestRate });
    document.getElementById('loan-modal').remove();
    renderLoans();
  }

  function recordPaymentPrompt(loanId) {
    const loans = Data.getLoans();
    const loan = loans.find(function(l) { return l.id === loanId; });
    if (!loan) return;
    const backdrop = document.createElement('div');
    backdrop.className = 'edit-modal-backdrop';
    backdrop.id = 'payment-modal';
    backdrop.innerHTML = '<div class="edit-modal">'
      + '<div class="edit-modal-title">Record payment — ' + loan.name + '</div>'
      + '<div style="font-size:13px;color:var(--ink-muted);margin-bottom:10px;">Remaining balance: ' + Data.formatCurrency(loan.remainingBalance) + '</div>'
      + '<div style="position:relative;margin-bottom:12px;">'
      + '<span style="position:absolute;left:14px;top:50%;transform:translateY(-50%);color:var(--ink-muted);">$</span>'
      + '<input type="number" id="payment-amount" value="' + loan.monthlyPayment + '" inputmode="decimal" style="padding-left:28px;width:100%;background:var(--bg-card);border:.5px solid var(--divider);border-radius:var(--radius-el);padding:12px 14px 12px 28px;font-size:16px;color:var(--ink);outline:none;" /></div>'
      + '<div class="edit-modal-actions">'
      + '<button class="edit-modal-cancel" onclick="document.getElementById(\'payment-modal\').remove()">Cancel</button>'
      + '<button class="edit-modal-save" onclick="App.savePayment(\'' + loanId + '\')">Save</button>'
      + '</div></div>';
    document.getElementById('app').appendChild(backdrop);
    setTimeout(function() { backdrop.querySelector('input').select(); }, 100);
  }

  function savePayment(loanId) {
    const amount = parseFloat(document.getElementById('payment-amount').value) || 0;
    if (amount <= 0) return;
    Data.recordLoanPayment(loanId, amount);
    document.getElementById('payment-modal').remove();
    renderLoans();
  }

  function updateBalancePrompt(loanId, current) {
    const backdrop = document.createElement('div');
    backdrop.className = 'edit-modal-backdrop';
    backdrop.id = 'balance-modal';
    backdrop.innerHTML = '<div class="edit-modal">'
      + '<div class="edit-modal-title">Update remaining balance</div>'
      + '<div style="position:relative;margin-bottom:12px;">'
      + '<span style="position:absolute;left:14px;top:50%;transform:translateY(-50%);color:var(--ink-muted);">$</span>'
      + '<input type="number" id="balance-input" value="' + current + '" inputmode="decimal" style="padding-left:28px;width:100%;background:var(--bg-card);border:.5px solid var(--divider);border-radius:var(--radius-el);padding:12px 14px 12px 28px;font-size:16px;color:var(--ink);outline:none;" /></div>'
      + '<div class="edit-modal-actions">'
      + '<button class="edit-modal-cancel" onclick="document.getElementById(\'balance-modal\').remove()">Cancel</button>'
      + '<button class="edit-modal-save" onclick="App.saveBalance(\'' + loanId + '\')">Save</button>'
      + '</div></div>';
    document.getElementById('app').appendChild(backdrop);
    setTimeout(function() { backdrop.querySelector('input').select(); }, 100);
  }

  function saveBalance(loanId) {
    const val = parseFloat(document.getElementById('balance-input').value) || 0;
    Data.updateLoan(loanId, { remainingBalance: val });
    document.getElementById('balance-modal').remove();
    renderLoans();
  }

  function deleteLoanConfirm(loanId) {
    if (confirm('Delete this loan? This cannot be undone.')) {
      Data.deleteLoan(loanId);
      renderLoans();
    }
  }

  function renderGoals() {
    const el = document.getElementById('screen-goals');
    const user = Data.getUser() || {};
    const savingsTarget = Data.getSavingsTarget();
    const savingsBalance = parseFloat(user.savingsBalance) || 0;
    const pct = savingsTarget > 0 ? Math.min(100, Math.round((savingsBalance / savingsTarget) * 100)) : 0;
    const gap = Math.max(0, savingsTarget - savingsBalance);
    const cache = Data.getInsightsCache();
    const monthsCount = cache ? (cache.dataMonthsCount || 0) : 0;
    const income = parseFloat(user.income) || 0;
    const now = new Date();
    const monthTotal = Data.getMonthlyTotal(now.getFullYear(), now.getMonth() + 1);
    const surplus = Math.max(0, income - monthTotal);
    const monthlySurplusEstimate = income - (savingsTarget / 12);
    const monthsToGoal = (monthlySurplusEstimate > 0 && gap > 0) ? Math.ceil(gap / monthlySurplusEstimate) : null;
    const categories = Data.getCategories();
    const limits = user.categoryLimits || {};
    const fixedCosts = user.fixedCosts || [];
    let healthRows = '';
    categories.forEach(function(cat) {
      const isFixed = fixedCosts.some(function(f) { return f.name === cat; });
      const fixedMatch = fixedCosts.find(function(f) { return f.name === cat; });
      const limit = isFixed ? (parseFloat((fixedMatch || {}).amount) || 0) : (parseFloat(limits[cat]) || 0);
      if (limit === 0) return;
      const spent = Data.getCategoryTotal(now.getFullYear(), now.getMonth() + 1, cat);
      const p = Math.round((spent / limit) * 100);
      const color = p >= 100 ? 'var(--ink-red)' : p >= 85 ? 'var(--ink-amber)' : 'var(--ink-green)';
      const tag = p >= 100 ? 'over' : p >= 85 ? 'close' : 'on track';
      healthRows += '<div class="health-row">'
        + '<span style="font-size:14px;color:var(--ink);">' + cat + '</span>'
        + '<div style="display:flex;align-items:center;gap:10px;">'
        + '<span style="font-size:13px;color:var(--ink-muted);">' + Data.formatCurrency(spent) + ' / ' + Data.formatCurrency(limit) + '</span>'
        + '<span style="font-size:12px;font-weight:500;color:' + color + ';">' + tag + '</span>'
        + '</div></div>';
    });
    const goalMonthsHtml = monthsToGoal ? '<div class="goals-months">At current pace, ~' + monthsToGoal + ' months to reach goal</div>' : '';
    const healthHtml = healthRows ? '<div class="section-label">This month\'s budget health</div><div class="card">' + healthRows + '</div>' : '';
    const dataLabel = monthsCount < 3 ? 'estimate' : 'based on real data';
    el.innerHTML = '<div class="page-header">'
      + '<div class="page-title">Goals</div>'
      + '<div class="page-subtitle">1 year of expenses saved · ' + dataLabel + '</div>'
      + '</div>'
      + '<div class="goals-hero">'
      + '<div class="goals-hero-label">Savings target</div>'
      + '<div class="goals-target">' + Data.formatCurrency(savingsTarget) + '</div>'
      + '<div class="goals-current">Current balance: ' + Data.formatCurrency(savingsBalance)
      + '<button onclick="App.editSavingsBalance()" style="color:var(--accent);font-size:13px;margin-left:8px;">Update</button></div>'
      + '<div class="progress-track"><div class="progress-fill" style="width:' + pct + '%;"></div></div>'
      + '<div class="row-between" style="margin-top:4px;">'
      + '<span class="goals-pct">' + pct + '% complete</span>'
      + '<span class="goals-gap">' + Data.formatCurrency(gap) + ' to go</span>'
      + '</div>' + goalMonthsHtml + '</div>'
      + healthHtml
      + '<div class="section-label">Investment opportunity</div>'
      + '<div class="invest-card">'
      + '<div class="invest-label">Based on this month</div>'
      + '<div class="invest-range">' + Data.formatCurrency(surplus * 0.5) + ' – ' + Data.formatCurrency(surplus) + '</div>'
      + '<div class="invest-note">You could comfortably put this away in investments this month if you want.</div>'
      + '</div>';
  }

  function editSavingsBalance() {
    const user = Data.getUser() || {};
    const current = parseFloat(user.savingsBalance) || 0;
    const backdrop = document.createElement('div');
    backdrop.className = 'edit-modal-backdrop';
    backdrop.innerHTML = '<div class="edit-modal">'
      + '<div class="edit-modal-title">Update savings balance</div>'
      + '<div style="position:relative;margin-bottom:12px;">'
      + '<span style="position:absolute;left:14px;top:50%;transform:translateY(-50%);color:var(--ink-muted);">$</span>'
      + '<input type="number" id="modal-savings-input" value="' + current + '" inputmode="decimal" style="padding-left:28px;width:100%;background:var(--bg-card);border:.5px solid var(--divider);border-radius:var(--radius-el);padding:12px 14px 12px 28px;font-size:16px;color:var(--ink);outline:none;" /></div>'
      + '<div class="edit-modal-actions">'
      + '<button class="edit-modal-cancel" onclick="App.closeModal()">Cancel</button>'
      + '<button class="edit-modal-save" onclick="App.saveSavingsBalance()">Save</button>'
      + '</div></div>';
    document.getElementById('app').appendChild(backdrop);
    setTimeout(function() { backdrop.querySelector('input').focus(); }, 100);
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

  function renderSettings() {
    const el = document.getElementById('screen-settings');
    const user = Data.getUser() || {};
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const categories = Data.getCategories();
    const fixedCosts = user.fixedCosts || [];
    const limits = user.categoryLimits || {};
    let catRows = '';
    categories.forEach(function(cat) {
      const isFixed = fixedCosts.some(function(f) { return f.name === cat; });
      const fixedMatch = fixedCosts.find(function(f) { return f.name === cat; });
      const val = isFixed ? (parseFloat((fixedMatch || {}).amount) || 0) : (parseFloat(limits[cat]) || 0);
      const fixedTag = isFixed ? '<span style="font-size:10px;color:var(--ink-muted);"> fixed</span>' : '';
      catRows += '<div class="settings-row" onclick="App.editCatLimit(\'' + cat + '\')">'
        + '<span class="settings-row-label">' + cat + fixedTag + '</span>'
        + '<div style="display:flex;align-items:center;gap:8px;">'
        + '<span class="settings-row-value">' + Data.formatCurrency(val) + '/mo</span>'
        + '<span class="settings-row-chevron">&#8250;</span>'
        + '</div></div>';
    });
    el.innerHTML = '<div class="page-header"><div class="page-title">Settings</div></div>'
      + '<div class="section-label">Profile</div>'
      + '<div class="settings-section">'
      + '<div class="settings-row" onclick="App.editSetting(\'name\',\'Your name\',\'' + (user.name || '') + '\')">'
      + '<span class="settings-row-label">Name</span>'
      + '<div style="display:flex;align-items:center;gap:8px;"><span class="settings-row-value">' + (user.name || '—') + '</span><span class="settings-row-chevron">&#8250;</span></div></div>'
      + '<div class="settings-row" onclick="App.editSetting(\'income\',\'Monthly income\',\'' + (user.income || '') + '\',\'number\')">'
      + '<span class="settings-row-label">Monthly income</span>'
      + '<div style="display:flex;align-items:center;gap:8px;"><span class="settings-row-value">' + Data.formatCurrency(user.income || 0) + '</span><span class="settings-row-chevron">&#8250;</span></div></div>'
      + '</div>'
      + '<div class="section-label">Appearance</div>'
      + '<div class="settings-section"><div class="settings-row">'
      + '<span class="settings-row-label">Dark mode</span>'
      + '<label class="toggle-switch"><input type="checkbox" ' + (isDark ? 'checked' : '') + ' onchange="App.toggleTheme(this.checked)" /><span class="toggle-slider"></span></label>'
      + '</div></div>'
      + '<div class="section-label">Budget limits</div>'
      + '<div class="settings-section">' + catRows + '</div>'
      + '<div class="section-label">Data</div>'
      + '<div class="settings-section">'
      + '<div class="settings-row" onclick="App.exportData()"><span class="settings-row-label">Export my data</span><span class="settings-row-chevron">&#8250;</span></div>'
      + '</div>'
      + '<div style="height:16px;"></div>'
      + '<button class="settings-danger-btn" onclick="App.confirmReset()">Reset all data</button>'
      + '<div style="height:8px;"></div>';
  }

  function editSetting(key, label, current, type) {
    type = type || 'text';
    const backdrop = document.createElement('div');
    backdrop.className = 'edit-modal-backdrop';
    backdrop.innerHTML = '<div class="edit-modal">'
      + '<div class="edit-modal-title">Edit ' + label.toLowerCase() + '</div>'
      + '<input type="' + type + '" id="modal-edit-input" value="' + current + '" ' + (type === 'number' ? 'inputmode="decimal"' : '') + ' placeholder="' + label + '" />'
      + '<div class="edit-modal-actions">'
      + '<button class="edit-modal-cancel" onclick="App.closeModal()">Cancel</button>'
      + '<button class="edit-modal-save" onclick="App.saveSettingEdit(\'' + key + '\')">Save</button>'
      + '</div></div>';
    document.getElementById('app').appendChild(backdrop);
    setTimeout(function() { backdrop.querySelector('input').select(); }, 100);
  }

  function saveSettingEdit(key) {
    const val = document.getElementById('modal-edit-input').value;
    const update = {};
    update[key] = key === 'income' ? (parseFloat(val) || 0) : val;
    Data.saveUser(update);
    closeModal();
    renderSettings();
  }

  function editCatLimit(cat) {
    const user = Data.getUser() || {};
    const fixedCosts = user.fixedCosts || [];
    const isFixed = fixedCosts.some(function(f) { return f.name === cat; });
    const fixedMatch = fixedCosts.find(function(f) { return f.name === cat; });
    const current = isFixed ? (parseFloat((fixedMatch || {}).amount) || 0) : (parseFloat((user.categoryLimits || {})[cat]) || 0);
    const backdrop = document.createElement('div');
    backdrop.className = 'edit-modal-backdrop';
    backdrop.innerHTML = '<div class="edit-modal">'
      + '<div class="edit-modal-title">' + cat + ' budget limit</div>'
      + '<div style="position:relative;margin-bottom:12px;">'
      + '<span style="position:absolute;left:14px;top:50%;transform:translateY(-50%);color:var(--ink-muted);">$</span>'
      + '<input type="number" id="modal-cat-input" value="' + current + '" inputmode="decimal" style="padding-left:28px;width:100%;background:var(--bg-card);border:.5px solid var(--divider);border-radius:var(--radius-el);padding:12px 14px 12px 28px;font-size:16px;color:var(--ink);outline:none;" /></div>'
      + '<div class="edit-modal-actions">'
      + '<button class="edit-modal-cancel" onclick="App.closeModal()">Cancel</button>'
      + '<button class="edit-modal-save" onclick="App.saveCatLimit(\'' + cat + '\',' + isFixed + ')">Save</button>'
      + '</div></div>';
    document.getElementById('app').appendChild(backdrop);
    setTimeout(function() { backdrop.querySelector('input').select(); }, 100);
  }

  function saveCatLimit(cat, isFixed) {
    const val = parseFloat(document.getElementById('modal-cat-input').value) || 0;
    const user = Data.getUser() || {};
    if (isFixed) {
      const fixedCosts = (user.fixedCosts || []).map(function(f) { return f.name === cat ? Object.assign({}, f, { amount: val }) : f; });
      Data.saveUser({ fixedCosts: fixedCosts });
    } else {
      const limits = Object.assign({}, user.categoryLimits || {});
      limits[cat] = val;
      Data.saveUser({ categoryLimits: limits });
    }
    closeModal();
    renderSettings();
  }

  function toggleTheme(isDark) {
    const theme = isDark ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', theme);
    Data.saveUser({ theme: theme });
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

  function confirmReset() {
    if (confirm('This will delete all your data and restart the app. Are you sure?')) {
      Data.clearAllData();
      location.reload();
    }
  }

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
      setTimeout(function() { showMonthlyWrap(year, month); }, 800);
    }
  }

  function showMonthlyWrap(year, month) {
    const summary = Data.getMonthlySummary(year, month);
    if (!summary) return;
    const monthName = new Date(year, month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const insights = Insights.calculate(year, month);
    const user = Data.getUser() || {};
    const income = parseFloat(user.income) || 0;
    const surplusPositive = summary.surplus > 0;
    const backdrop = document.createElement('div');
    backdrop.className = 'monthly-modal';
    backdrop.id = 'monthly-modal';

    const fixedEntries = Object.entries(summary.byCategory).filter(function(e) { return e[1].isFixed; });
    const varEntries = Object.entries(summary.byCategory).filter(function(e) { return !e[1].isFixed && e[1].spent > 0; });

    function catRow(cat, data) {
      const diff = data.limit > 0 ? data.spent - data.limit : null;
      const pct = data.limit > 0 ? Math.min(100, Math.round((data.spent / data.limit) * 100)) : null;
      let diffHtml = '';
      if (diff !== null) {
        if (diff > 0) {
          diffHtml = '<div style="font-size:11px;color:var(--ink-red);">$' + Math.round(Math.abs(diff)).toLocaleString() + ' over</div>';
        } else {
          diffHtml = '<div style="font-size:11px;color:var(--ink-green);">$' + Math.round(Math.abs(diff)).toLocaleString() + ' under</div>';
        }
      }
      let barHtml = '';
      if (pct !== null) {
        const barColor = diff > 0 ? 'var(--ink-red)' : 'var(--acc)';
        barHtml = '<div style="height:3px;background:var(--divider);border-radius:2px;margin-top:5px;"><div style="height:3px;width:' + pct + '%;background:' + barColor + ';border-radius:2px;"></div></div>';
      }
      const limitHtml = data.limit > 0 ? '<span style="font-size:11px;color:var(--ink-muted);">of ' + Data.formatCurrency(data.limit) + '</span>' : '';
      return '<div style="padding:10px 0;border-bottom:.5px solid var(--divider);">'
        + '<div style="display:flex;justify-content:space-between;align-items:center;">'
        + '<span style="font-size:14px;color:var(--ink);">' + cat + '</span>'
        + '<div style="display:flex;align-items:center;gap:6px;">'
        + '<span style="font-size:14px;font-weight:500;color:var(--ink);">' + Data.formatCurrency(data.spent) + '</span>'
        + limitHtml + '</div></div>'
        + diffHtml + barHtml + '</div>';
    }

    let fixedRowsHtml = '';
    if (fixedEntries.length > 0) {
      let rows = '';
      fixedEntries.forEach(function(entry) { rows += catRow(entry[0], entry[1]); });
      fixedRowsHtml = '<div style="font-size:11px;color:var(--ink-muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px;">Fixed costs</div>'
        + '<div style="background:var(--bg-card);border-radius:var(--radius-card);padding:0 16px;margin-bottom:16px;">'
        + rows
        + '<div style="display:flex;justify-content:space-between;padding:8px 0 6px;border-top:.5px solid var(--divider);margin-top:2px;">'
        + '<span style="font-size:12px;color:var(--ink-muted);">Fixed total</span>'
        + '<span style="font-size:12px;font-weight:500;color:var(--ink);">' + Data.formatCurrency(summary.fixedTotal) + '</span>'
        + '</div></div>';
    }

    let varRowsHtml = '';
    if (varEntries.length > 0) {
      let rows = '';
      varEntries.forEach(function(entry) { rows += catRow(entry[0], entry[1]); });
      varRowsHtml = '<div style="font-size:11px;color:var(--ink-muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px;">Variable spending</div>'
        + '<div style="background:var(--bg-card);border-radius:var(--radius-card);padding:0 16px;margin-bottom:16px;">' + rows + '</div>';
    }

    const budgetUsedPct = income > 0 ? Math.min(100, Math.round((summary.total / income) * 100)) : 0;
    const barBg = surplusPositive ? 'var(--accent)' : 'var(--ink-red)';
    const surplusColor = surplusPositive ? 'var(--ink-green)' : 'var(--ink-red)';
    const surplusLabel = surplusPositive ? 'Surplus' : 'Over budget';
    const surplusSubLabel = surplusPositive ? 'left over' : 'over income';

    let hobbyHtml = '';
    if (insights.hobbies.topHobby) {
      hobbyHtml = '<div style="display:flex;justify-content:space-between;padding:7px 0;font-size:13px;">'
        + '<span style="color:var(--ink-muted);">&#127919; Top hobby</span>'
        + '<span style="font-weight:500;color:var(--ink);">' + insights.hobbies.topHobby.name + ' · ' + Data.formatCurrency(insights.hobbies.topHobby.amount) + '</span>'
        + '</div>';
    }

    backdrop.innerHTML = '<div class="monthly-sheet">'
      + '<div class="monthly-handle"></div>'
      + '<div style="font-size:22px;font-weight:500;color:var(--ink);margin-bottom:2px;">' + monthName + '</div>'
      + '<div style="font-size:13px;color:var(--ink-muted);margin-bottom:20px;">Monthly wrap-up</div>'
      + '<div class="monthly-stat-grid" style="margin-bottom:16px;">'
      + '<div class="monthly-stat"><div class="monthly-stat-label">Total spent</div><div class="monthly-stat-val">' + Data.formatCurrency(summary.total) + '</div><div style="font-size:11px;color:var(--ink-muted);margin-top:2px;">of ' + Data.formatCurrency(income) + '</div></div>'
      + '<div class="monthly-stat"><div class="monthly-stat-label">' + surplusLabel + '</div><div class="monthly-stat-val" style="color:' + surplusColor + ';">' + Data.formatCurrency(Math.abs(summary.surplus)) + '</div><div style="font-size:11px;color:var(--ink-muted);margin-top:2px;">' + surplusSubLabel + '</div></div>'
      + '</div>'
      + '<div style="margin-bottom:20px;">'
      + '<div style="display:flex;justify-content:space-between;font-size:12px;color:var(--ink-muted);margin-bottom:4px;"><span>Budget used</span><span>' + budgetUsedPct + '%</span></div>'
      + '<div style="height:6px;background:var(--divider);border-radius:4px;"><div style="height:6px;width:' + budgetUsedPct + '%;background:' + barBg + ';border-radius:4px;"></div></div>'
      + '</div>'
      + fixedRowsHtml + varRowsHtml
      + '<div style="font-size:11px;color:var(--ink-muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px;">Habit highlights</div>'
      + '<div style="background:var(--bg-card);border-radius:var(--radius-card);padding:0 16px;margin-bottom:16px;">'
      + '<div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:.5px solid var(--divider);font-size:13px;"><span style="color:var(--ink-muted);">&#128722; Grocery trips</span><span style="font-weight:500;color:var(--ink);">' + insights.grocery.count + ' trips · avg ' + Data.formatCurrency(insights.grocery.avgSpend) + '</span></div>'
      + '<div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:.5px solid var(--divider);font-size:13px;"><span style="color:var(--ink-muted);">&#127374; Eating out</span><span style="font-weight:500;color:var(--ink);">' + insights.eatingOut.count + 'x · ' + Data.formatCurrency(insights.eatingOut.total) + '</span></div>'
      + '<div style="display:flex;justify-content:space-between;padding:7px 0;' + (insights.hobbies.topHobby ? 'border-bottom:.5px solid var(--divider);' : '') + 'font-size:13px;"><span style="color:var(--ink-muted);">&#9981; Gas fill-ups</span><span style="font-weight:500;color:var(--ink);">' + insights.gas.count + ' fills · ' + Data.formatCurrency(insights.gas.total) + '</span></div>'
      + hobbyHtml + '</div>'
      + '<div style="background:var(--bg-card);border-radius:0 var(--radius-card) var(--radius-card) 0;border-left:3px solid var(--accent);padding:16px;margin-bottom:20px;">'
      + '<div style="font-size:11px;color:var(--ink-muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px;">Investment opportunity</div>'
      + '<div style="font-size:26px;font-weight:500;color:var(--accent);margin:6px 0;">' + Data.formatCurrency(summary.investLow) + ' – ' + Data.formatCurrency(summary.investHigh) + '</div>'
      + '<div style="font-size:12px;color:var(--ink-muted);line-height:1.5;">You could comfortably put this away in investments this month if you want.</div>'
      + '</div>'
      + '<div class="monthly-actions">'
      + '<button class="monthly-action-btn monthly-action-secondary" onclick="App.dismissMonthly(' + year + ',' + month + ')">Dismiss</button>'
      + '<button class="monthly-action-btn monthly-action-primary" onclick="App.dismissMonthly(' + year + ',' + month + ')">Start next month</button>'
      + '</div></div>';
    document.getElementById('app').appendChild(backdrop);
  }

  function dismissMonthly(year, month) {
    Data.dismissMonthly(year, month);
    const m = document.getElementById('monthly-modal');
    if (m) m.remove();
  }

  function dateToStr(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function formatDisplayDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T12:00:00');
    if (dateStr === Data.getTodayStr()) return 'Today';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  function formatWeekLabel(start, end) {
    const sM = start.toLocaleDateString('en-US', { month: 'short' });
    const eM = end.toLocaleDateString('en-US', { month: 'short' });
    if (sM === eM) return sM + ' ' + start.getDate() + '–' + end.getDate();
    return sM + ' ' + start.getDate() + ' – ' + eM + ' ' + end.getDate();
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
    renderLoans, addLoanPrompt, saveLoan,
    recordPaymentPrompt, savePayment,
    updateBalancePrompt, saveBalance, deleteLoanConfirm,
    editSetting, saveSettingEdit, editCatLimit, saveCatLimit,
    toggleTheme, exportData, confirmReset,
    checkMonthlyWrap, showMonthlyWrap, dismissMonthly,
    closeModal
  };
})();

document.addEventListener('DOMContentLoaded', function() { App.boot(); });