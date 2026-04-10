const cron = require('node-cron');
const DailyReport = require('../models/DailyReport');
const LeaderboardHistory = require('../models/LeaderboardHistory');
const User = require('../models/User');

const setupDailyLeaderboardSnapshot = () => {
  // CRON Schedule: 20:30 (8:30 PM) every day
  cron.schedule('30 20 * * *', async () => {
    console.log('--- RUNNING DAILY LEADERBOARD SNAPSHOT (8:30 PM) ---');
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // 1. Get all employees
      const employees = await User.find({ role: 'employee', isDeleted: false });

      const rankings = await Promise.all(employees.map(async (emp) => {
        const report = await DailyReport.findOne({ employee: emp._id, date: today });
        const stats = report ? report.counts : { callsDone: 0, selected: 0, rejected: 0, dispatched: 0 };
        
        // Performance Score Calculation
        // Weightage: Dispatch: 10 pts, Selected: 5 pts, Calls: 1 pt
        const score = (stats.dispatched * 10) + (stats.selected * 5) + (stats.callsDone * 1);

        return {
          employee: emp._id,
          name: emp.name,
          employeeId: emp.employeeId,
          callsDone: stats.callsDone,
          selectedCount: stats.selected,
          rejectedCount: stats.rejected,
          dispatchedCount: stats.dispatched,
          performanceScore: score
        };
      }));

      // 2. Sort rankings (Strict Priority: Dispatch > Selected > Calls)
      rankings.sort((a, b) => {
        if (b.dispatchedCount !== a.dispatchedCount) return b.dispatchedCount - a.dispatchedCount;
        if (b.selectedCount !== a.selectedCount) return b.selectedCount - a.selectedCount;
        if (b.callsDone !== a.callsDone) return b.callsDone - a.callsDone;
        return b.performanceScore - a.performanceScore;
      });

      // 3. Assign Ranks
      rankings.forEach((r, idx) => { r.rank = idx + 1; });

      // 4. Totals
      const totals = rankings.reduce((acc, curr) => ({
        calls: acc.calls + curr.callsDone,
        selected: acc.selected + curr.selectedCount,
        rejected: acc.rejected + curr.rejectedCount,
        dispatched: acc.dispatched + curr.dispatchedCount
      }), { calls: 0, selected: 0, rejected: 0, dispatched: 0 });

      // 5. Save Snapshot
      await LeaderboardHistory.findOneAndUpdate(
        { date: today },
        {
          date: today,
          rankings,
          totalCalls: totals.calls,
          totalSelected: totals.selected,
          totalRejected: totals.rejected,
          totalDispatched: totals.dispatched,
          topPerformer: rankings[0]?.employee
        },
        { upsert: true, new: true }
      );

      console.log('--- LEADERBOARD SNAPSHOT SAVED SUCCESSFULLY ---');
    } catch (error) {
      console.error('CRON ERROR:', error);
    }
  });
};

module.exports = { setupDailyLeaderboardSnapshot };
