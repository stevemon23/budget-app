/* ============================================================
   data.js — All localStorage operations for Ledger
   ============================================================ */

const Data = (() => {

  const KEYS = {
    USER: 'budget_user',
    EXPENSES: 'budget_expenses',
    INSIGHTS_CACHE: 'budget_insights_cache',
    MONTHLY_DISMISSED: 'budget_monthly_dismissed'
  };

  /* ---- USER ---- */
  function getUser() {
    try {
      return JSON.parse(localStorage.getItem(KEYS.USER)) || null;
    } catch { return null; }
  }

  function saveUser(data) {
    const existing = getUser() || {};
    const merged = { ...existing, ...data };
    localStorage.setItem(KEYS.USER, JSON.stringify(merged));
    return merged;
  }

  function isOnboardingComplete() {
    const u = getUser();
    return u && u.onboardingComplete === true;
  }

  /* ---- EXPENSES ---- */
  function getAllExpenses() {
    try {
      return JSON.parse(localStorage.getItem(KEYS.EXPENSES)) || [];
    } catch { return []; }
  }

  function saveExpense(expense) {
    const expenses = getAllExpenses();
    const newExpense = {
      id: 'exp_' + Date.now() + '_' + Math.random().toString(36).substr(2,5),
      date: expense.date || getTodayStr(),
      subject: expense.subject || '',
      category: expense.category || 'Other',
      amount: parseFloat(expense.amount) || 0,
      note: expense.note || '',
      subItems: expense.subItems || [],
      createdAt: new Date().toISOString()
    };
    expenses.push(newExpense);
    localStorage.setItem(KEYS.EXPENSES, JSON.stringify(expenses));
    return newExpense;
  }

  function deleteExpense(id) {
    const expenses = getAllExpenses().filter(e => e.id !== id);
    localStorage.setItem(KEYS.EXPENSES, JSON.stringify(expenses));
  }

  function getExpensesByDate(dateStr) {
    return getAllExpenses().filter(e => e.date === dateStr);
  }

  function getExpensesByMonth(year, month) {
    const prefix = `${year}-${String(month).padStart(2,'0')}`;
    return getAllExpenses().filter(e => e.date && e.date.startsWith(prefix));
  }

  function getMonthlyTotal(year, month) {
    return getExpensesByMonth(year, month)
      .reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
  }

  function getCategoryTotal(year, month, category) {
    return getExpensesByMonth(year, month)
      .filter(e => e.category === category)
      .reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
  }

  function getDailyTotal(dateStr) {
    return getExpensesByDate(dateStr)
      .reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
  }

  function hasExpensesOnDate(dateStr) {
    return getAllExpenses().some(e => e.date === dateStr);
  }

  /* ---- MONTHLY SUMMARY ---- */
  function getMonthlySummary(year, month) {
    const user = getUser();
    if (!user) return null;

    const expenses = getExpensesByMonth(year, month);
    const total = expenses.reduce((s, e) => s + e.amount, 0);
    const categories = ['Fixed', 'Groceries', 'Eating out', 'Hobbies', 'Gas', 'Other'];
    const limits = user.categoryLimits || {};
    const income = parseFloat(user.income) || 0;

    const byCategory = {};
    categories.forEach(cat => {
      byCategory[cat] = {
        spent: getCategoryTotal(year, month, cat),
        limit: parseFloat(limits[cat]) || 0
      };
    });

    const fixedTotal = (user.fixedCosts || []).reduce((s, f) => s + (parseFloat(f.amount) || 0), 0);
    const totalBudget = income;
    const surplus = income - total;

    return {
      year, month, total, totalBudget,
      surplus: Math.max(0, surplus),
      byCategory,
      expenseCount: expenses.length,
      investLow: Math.round(Math.max(0, surplus) * 0.5),
      investHigh: Math.round(Math.max(0, surplus))
    };
  }

  /* ---- SAVINGS & GOALS ---- */
  function getSavingsTarget() {
    const cache = getInsightsCache();
    const user = getUser();
    if (!user) return 0;

    if (cache && cache.dataMonthsCount >= 3 && cache.monthlyAverageSpend > 0) {
      return Math.round(cache.monthlyAverageSpend * 12);
    }
    const estimate = parseFloat(user.savingsGoalEstimate) || 0;
    return Math.round(estimate * 12);
  }

  function getInvestmentSuggestion() {
    const now = new Date();
    const summary = getMonthlySummary(now.getFullYear(), now.getMonth() + 1);
    if (!summary) return { low: 0, high: 0 };
    return { low: summary.investLow, high: summary.investHigh };
  }

  /* ---- INSIGHTS CACHE ---- */
  function getInsightsCache() {
    try {
      return JSON.parse(localStorage.getItem(KEYS.INSIGHTS_CACHE)) || null;
    } catch { return null; }
  }

  function saveInsightsCache(data) {
    localStorage.setItem(KEYS.INSIGHTS_CACHE, JSON.stringify({ ...data, lastUpdated: new Date().toISOString() }));
  }

  /* ---- MONTHLY WRAP DISMISSED ---- */
  function isMonthlyDismissed(year, month) {
    try {
      const d = JSON.parse(localStorage.getItem(KEYS.MONTHLY_DISMISSED)) || [];
      return d.includes(`${year}-${month}`);
    } catch { return false; }
  }

  function dismissMonthly(year, month) {
    try {
      const d = JSON.parse(localStorage.getItem(KEYS.MONTHLY_DISMISSED)) || [];
      d.push(`${year}-${month}`);
      localStorage.setItem(KEYS.MONTHLY_DISMISSED, JSON.stringify(d));
    } catch {}
  }

  /* ---- UTILS ---- */
  function getTodayStr() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }

  function formatCurrency(amount) {
    return '$' + Math.round(parseFloat(amount) || 0).toLocaleString('en-US');
  }

  function formatCurrencyDecimal(amount) {
    return '$' + (parseFloat(amount) || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  function clearAllData() {
    localStorage.removeItem(KEYS.USER);
    localStorage.removeItem(KEYS.EXPENSES);
    localStorage.removeItem(KEYS.INSIGHTS_CACHE);
    localStorage.removeItem(KEYS.MONTHLY_DISMISSED);
  }

  function exportAllData() {
    return {
      user: getUser(),
      expenses: getAllExpenses(),
      insightsCache: getInsightsCache(),
      exportedAt: new Date().toISOString()
    };
  }

  function getMonthsWithData() {
    const expenses = getAllExpenses();
    const months = new Set();
    expenses.forEach(e => {
      if (e.date) months.add(e.date.substr(0, 7));
    });
    return Array.from(months).sort().reverse();
  }

  function getDailyAverage(year, month) {
    const now = new Date();
    const isCurrentMonth = now.getFullYear() === year && (now.getMonth() + 1) === month;
    const daysElapsed = isCurrentMonth ? now.getDate() : new Date(year, month, 0).getDate();
    const total = getMonthlyTotal(year, month);
    return daysElapsed > 0 ? total / daysElapsed : 0;
  }

  return {
    getUser, saveUser, isOnboardingComplete,
    getAllExpenses, saveExpense, deleteExpense,
    getExpensesByDate, getExpensesByMonth,
    getMonthlyTotal, getCategoryTotal, getDailyTotal,
    hasExpensesOnDate, getMonthlySummary,
    getSavingsTarget, getInvestmentSuggestion,
    getInsightsCache, saveInsightsCache,
    isMonthlyDismissed, dismissMonthly,
    getTodayStr, formatCurrency, formatCurrencyDecimal,
    clearAllData, exportAllData, getMonthsWithData, getDailyAverage
  };
})();
