/* ============================================================
   insights.js — Habit tracking & insights engine for Ledger
   ============================================================ */

const Insights = (() => {

  function calculate(year, month) {
    const expenses = Data.getExpensesByMonth(year, month);
    const now = new Date();
    const daysInMonth = new Date(year, month, 0).getDate();
    const daysElapsed = (year === now.getFullYear() && month === now.getMonth() + 1)
      ? now.getDate()
      : daysInMonth;

    /* ---- GROCERY TRIPS ---- */
    const groceryDays = [...new Set(
      expenses.filter(e => e.category === 'Groceries').map(e => e.date)
    )].sort();
    const groceryCount = groceryDays.length;
    const groceryTotal = expenses.filter(e => e.category === 'Groceries')
      .reduce((s, e) => s + e.amount, 0);
    const groceryAvgSpend = groceryCount > 0 ? groceryTotal / groceryCount : 0;
    let groceryFreqDays = 0;
    if (groceryCount > 1) {
      const diffs = [];
      for (let i = 1; i < groceryDays.length; i++) {
        const a = new Date(groceryDays[i-1]);
        const b = new Date(groceryDays[i]);
        diffs.push((b - a) / 86400000);
      }
      groceryFreqDays = diffs.reduce((s, d) => s + d, 0) / diffs.length;
    }

    /* ---- GAS ---- */
    const gasDays = [...new Set(
      expenses.filter(e => e.category === 'Gas').map(e => e.date)
    )].sort();
    const gasCount = gasDays.length;
    const gasTotal = expenses.filter(e => e.category === 'Gas')
      .reduce((s, e) => s + e.amount, 0);
    const gasAvgSpend = gasCount > 0 ? gasTotal / gasCount : 0;
    let gasFreqDays = 0;
    if (gasCount > 1) {
      const diffs = [];
      for (let i = 1; i < gasDays.length; i++) {
        const a = new Date(gasDays[i-1]);
        const b = new Date(gasDays[i]);
        diffs.push((b - a) / 86400000);
      }
      gasFreqDays = diffs.reduce((s, d) => s + d, 0) / diffs.length;
    }

    /* ---- HOBBIES ---- */
    const hobbyExpenses = expenses.filter(e => e.category === 'Hobbies');
    const hobbyTotal = hobbyExpenses.reduce((s, e) => s + e.amount, 0);
    const hobbyBySubject = {};
    hobbyExpenses.forEach(e => {
      hobbyBySubject[e.subject] = (hobbyBySubject[e.subject] || 0) + e.amount;
    });
    const topHobby = Object.entries(hobbyBySubject).sort((a, b) => b[1] - a[1])[0] || null;

    /* ---- EATING OUT ---- */
    const eatOutDays = [...new Set(
      expenses.filter(e => e.category === 'Eating out').map(e => e.date)
    )];
    const eatOutCount = eatOutDays.length;
    const eatOutTotal = expenses.filter(e => e.category === 'Eating out')
      .reduce((s, e) => s + e.amount, 0);

    /* ---- DAILY TOTALS ---- */
    const dailyTotals = {};
    expenses.forEach(e => {
      dailyTotals[e.date] = (dailyTotals[e.date] || 0) + e.amount;
    });

    /* ---- BIGGEST DAY ---- */
    let biggestDay = null;
    let biggestDayAmt = 0;
    Object.entries(dailyTotals).forEach(([date, amt]) => {
      if (amt > biggestDayAmt) { biggestDayAmt = amt; biggestDay = date; }
    });

    /* ---- QUIETEST DAY (days with spending) ---- */
    let quietestDay = null;
    let quietestDayAmt = Infinity;
    Object.entries(dailyTotals).forEach(([date, amt]) => {
      if (amt > 0 && amt < quietestDayAmt) { quietestDayAmt = amt; quietestDay = date; }
    });
    if (quietestDayAmt === Infinity) quietestDayAmt = 0;

    /* ---- NO EATING OUT STREAK ---- */
    let longestNoEatStreak = 0;
    let currentStreak = 0;
    const eatOutSet = new Set(eatOutDays);
    for (let d = 1; d <= daysElapsed; d++) {
      const dateStr = `${year}-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      if (!eatOutSet.has(dateStr)) {
        currentStreak++;
        if (currentStreak > longestNoEatStreak) longestNoEatStreak = currentStreak;
      } else {
        currentStreak = 0;
      }
    }

    /* ---- DAILY AVERAGE ---- */
    const totalSpend = expenses.reduce((s, e) => s + e.amount, 0);
    const dailyAvg = daysElapsed > 0 ? totalSpend / daysElapsed : 0;

    /* ---- UPDATE MONTHS COUNT & SAVINGS TARGET ---- */
    updateMonthlyAverage();

    return {
      grocery: { count: groceryCount, total: groceryTotal, avgSpend: groceryAvgSpend, freqDays: groceryFreqDays },
      gas: { count: gasCount, total: gasTotal, avgSpend: gasAvgSpend, freqDays: gasFreqDays },
      hobbies: { total: hobbyTotal, topHobby: topHobby ? { name: topHobby[0], amount: topHobby[1] } : null },
      eatingOut: { count: eatOutCount, total: eatOutTotal },
      streaks: {
        longestNoEat: longestNoEatStreak,
        biggestDay: biggestDay,
        biggestDayAmt: biggestDayAmt,
        quietestDay: quietestDay,
        quietestDayAmt: quietestDayAmt
      },
      dailyAvg,
      totalSpend
    };
  }

  function updateMonthlyAverage() {
    const monthsWithData = Data.getMonthsWithData();
    if (monthsWithData.length < 3) {
      const cache = Data.getInsightsCache() || {};
      Data.saveInsightsCache({ ...cache, dataMonthsCount: monthsWithData.length });
      return;
    }

    const totals = monthsWithData.slice(0, 3).map(ym => {
      const [y, m] = ym.split('-').map(Number);
      return Data.getMonthlyTotal(y, m);
    });
    const avg = totals.reduce((s, t) => s + t, 0) / totals.length;
    Data.saveInsightsCache({
      monthlyAverageSpend: avg,
      dataMonthsCount: monthsWithData.length
    });
  }

  function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  return { calculate, updateMonthlyAverage, formatDate };
})();
