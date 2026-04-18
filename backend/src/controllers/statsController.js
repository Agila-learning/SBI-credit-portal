const { format } = require('date-fns');
const Lead = require('../models/Lead');
const User = require('../models/User');
const Interaction = require('../models/Interaction');
const DailyReport = require('../models/DailyReport');
const LeaderboardHistory = require('../models/LeaderboardHistory');
const Task = require('../models/Task');
const Incentive = require('../models/Incentive');
const XLSX = require('xlsx');

// @desc    Get dashboard summary cards
// @route   GET /api/stats/dashboard
// @access  Private
const getDashboardStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    let empQuery = {};
    if (req.user.role === 'team_leader') {
      const reports = await User.find({ reportingTo: req.user._id }).select('_id');
      const reportIds = [req.user._id, ...reports.map(r => r._id)];
      empQuery.employee = { $in: reportIds };
    } else if (req.user.role === 'employee') {
      empQuery.employee = req.user._id;
    }

    // 1. Today's Stats from Live Activity
    // Use Lead creation for 'called' count (shows progress before batch submission)
    const todayCalled = await Lead.countDocuments({
      ...empQuery,
      createdAt: { $gte: today, $lte: endOfDay }
    });

    const todayInteractions = await Interaction.find({
      ...empQuery,
      createdAt: { $gte: today, $lte: endOfDay }
    });

    const todayStats = {
      called: todayCalled || 0,
      selected: todayInteractions.filter(i => i.stage === 'Selected').length || 0,
      rejected: todayInteractions.filter(i => i.stage === 'Rejected').length || 0,
      dispatched: todayInteractions.filter(i => i.stage === 'Dispatched').length || 0
    };

    // 2. Monthly Stats from DailyReports
    const monthlyReports = await DailyReport.find({
      ...empQuery,
      date: { $gte: firstDayOfMonth }
    });
    const monthStats = monthlyReports.reduce((acc, curr) => ({
      selected: (acc.selected || 0) + (curr.counts?.selected || 0),
      dispatched: (acc.dispatched || 0) + (curr.counts?.dispatched || 0)
    }), { selected: 0, dispatched: 0 });

    // 3. Overall Leads (Unique Customers)
    const overallTotalLeads = await Lead.countDocuments(empQuery);
    
    // 4. Overall Interactions (Total Activity)
    const overallInteractions = await Interaction.countDocuments(empQuery);

    let teamStats = [];
    if (req.user.role === 'admin' || req.user.role === 'team_leader') {
      let teamQuery = { isDeleted: false };
      if (req.user.role === 'team_leader') {
        teamQuery.reportingTo = req.user._id;
      } else {
        teamQuery.role = { $in: ['employee', 'team_leader'] };
      }

      const employees = await User.find(teamQuery).select('name employeeId');
      
      teamStats = await Promise.all(employees.map(async (emp) => {
        const empReports = await DailyReport.find({ employee: emp._id });
        const summary = empReports.reduce((acc, curr) => ({
          called: acc.called + (curr.counts?.callsDone || 0),
          selected: acc.selected + (curr.counts?.selected || 0),
          rejected: acc.rejected + (curr.counts?.rejected || 0),
          dispatched: acc.dispatched + (curr.counts?.dispatched || 0)
        }), { called: 0, selected: 0, rejected: 0, dispatched: 0 });

        return {
          _id: emp._id,
          name: emp.name,
          employeeId: emp.employeeId,
          counts: summary
        };
      }));
    }

    // 5. Tasks Stats
    const tasksQuery = { ...empQuery };
    const allTasks = await Task.find(tasksQuery);
    const tasksStats = {
      dueToday: allTasks.filter(t => format(new Date(t.dueDate), 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd') && t.status !== 'Completed').length,
      overdue: allTasks.filter(t => new Date(t.dueDate) < today && t.status !== 'Completed').length,
      active: allTasks.filter(t => t.status !== 'Completed').length
    };

    // 6. Pending Operational Counts
    const pendingDispatches = await Lead.countDocuments({ ...empQuery, status: 'Selected' });
    const pendingFollowups = await Interaction.countDocuments({ 
      ...empQuery, 
      callType: { $regex: /Follow-up/i } 
    });

    // 7. Incentive Intelligence (Current Month)
    const currentMonthStr = format(today, 'MM-yyyy');
    const incentiveQuery = { month: currentMonthStr, ...empQuery };
    const monthlyIncentives = await Incentive.find(incentiveQuery);
    const incentiveSummary = {
      monthlyTotal: monthlyIncentives.reduce((acc, curr) => acc + curr.incentiveAmount, 0),
      topEarner: monthlyIncentives.sort((a, b) => b.incentiveAmount - a.incentiveAmount)[0]?.employee || null,
      todayEstimate: (todayStats.dispatched * 150) // Baseline estimate
    };

    // 8. Calculate Rates (Safety from NaN)
    const conversionRate = todayStats.called > 0 
      ? ((todayStats.selected / todayStats.called) * 100).toFixed(1) 
      : 0;
    const dispatchRate = todayStats.selected > 0 
      ? ((todayStats.dispatched / todayStats.selected) * 100).toFixed(1) 
      : 0;

    // 9. 7-Day Trend Analysis
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      last7Days.push(d);
    }

    const trendData = await Promise.all(last7Days.map(async (date) => {
      const startOfDay = new Date(date);
      startOfDay.setHours(0,0,0,0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23,59,59,999);

      const dayReports = await DailyReport.find({
        ...empQuery,
        date: { $gte: startOfDay, $lte: endOfDay }
      });

      const totals = dayReports.reduce((acc, curr) => ({
        calls: acc.calls + curr.counts.callsDone,
        selected: acc.selected + curr.counts.selected,
        dispatched: acc.dispatched + curr.counts.dispatched
      }), { calls: 0, selected: 0, dispatched: 0 });

      return {
        date: format(date, 'MMM dd'),
        ...totals
      };
    }));

    res.json({
      today: {
        ...todayStats,
        conversionRate,
        dispatchRate
      },
      month: monthStats,
      overall: {
        totalLeads: overallTotalLeads,
        totalInteractions: overallInteractions,
        shortlisted: monthStats.selected,
        dispatched: monthStats.dispatched
      },
      pending: {
        dispatches: pendingDispatches,
        followups: pendingFollowups,
        tasksDueToday: tasksStats.dueToday,
        tasksOverdue: tasksStats.overdue
      },
      incentives: incentiveSummary,
      trend: trendData,
      teamStats
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get leaderboard
// @route   GET /api/stats/leaderboard
// @access  Private
const getLeaderboard = async (req, res) => {
  try {
    const { period } = req.query; // 'daily', 'weekly', 'monthly', 'overall'
    let dateFilter = {};

    const now = new Date();
    now.setHours(0,0,0,0);

    if (period === 'daily') {
      dateFilter = { date: now };
    } else if (period === 'yesterday') {
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      dateFilter = { date: yesterday };
    } else if (period === 'weekly') {
      const lastWeek = new Date(now);
      lastWeek.setDate(now.getDate() - 7);
      dateFilter = { date: { $gte: lastWeek } };
    } else if (period === 'monthly') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      dateFilter = { date: { $gte: firstDay } };
    }

    // Check if we have a historical snapshot for this date (if specific day)
    if (period === 'yesterday' || period === 'daily') {
      const history = await LeaderboardHistory.findOne(dateFilter).populate('rankings.employee', 'name employeeId');
      if (history) {
        // Map history to standard leaderboard format
        return res.json(history.rankings.map(r => ({
          _id: r.employee._id,
          employeeName: r.name,
          employeeId: r.employeeId,
          totalShortlisted: r.selectedCount,
          totalDispatched: r.dispatchedCount,
          totalCalled: r.callsDone,
          performanceScore: r.performanceScore,
          rank: r.rank
        })));
      }
    }

    let matchFilter = { ...dateFilter };
    if (req.user.role === 'team_leader') {
      const reports = await User.find({ reportingTo: req.user._id }).select('_id');
      const reportIds = [req.user._id, ...reports.map(r => r._id)];
      matchFilter.employee = { $in: reportIds };
    }

    // Default to aggregation for live periods (weekly, monthly, or if no history found)
    const leaderboard = await DailyReport.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: '$employee',
          totalShortlisted: { $sum: '$counts.selected' },
          totalDispatched: { $sum: '$counts.dispatched' },
          totalCalled: { $sum: '$counts.callsDone' }
        }
      },
      { $sort: { totalShortlisted: -1, totalDispatched: -1 } },
      { $limit: 10 }
    ]);

    // Populate employee names manually
    const inhabitedLeaderboard = await Promise.all(
      leaderboard.map(async (item) => {
        const user = await User.findById(item._id).select('name employeeId');
        return {
          ...item,
          employeeName: user ? user.name : 'Unknown',
          employeeId: user ? user.employeeId : 'N/A'
        };
      })
    );

    res.json(inhabitedLeaderboard);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get leaderboard history snapshots
// @route   GET /api/stats/history
// @access  Private
const getLeaderboardHistory = async (req, res) => {
  try {
    const history = await LeaderboardHistory.find()
      .select('date totalCalls totalSelected totalDispatched topPerformer')
      .populate('topPerformer', 'name')
      .sort('-date');
    res.json(history);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get team report data for team leader / admin
// @route   GET /api/stats/team-report
// @access  Private (team_leader, admin)
const getTeamReport = async (req, res) => {
  try {
    const { startDate, endDate, employeeId } = req.query;

    // Build employee query based on role
    let memberIds = [];
    if (req.user.role === 'team_leader') {
      const members = await User.find({ reportingTo: req.user._id, isDeleted: false }).select('_id name employeeId');
      memberIds = [req.user._id, ...members.map(m => m._id)];
    } else if (req.user.role === 'admin') {
      const members = await User.find({ role: { $in: ['employee', 'team_leader'] }, isDeleted: false }).select('_id name employeeId');
      memberIds = members.map(m => m._id);
    } else {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Filter by specific employee if requested
    let filteredIds = employeeId ? [employeeId] : memberIds;

    // Date range filter
    let dateFilter = {};
    if (startDate && endDate) {
      dateFilter = {
        date: {
          $gte: new Date(startDate),
          $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999))
        }
      };
    } else {
      // Default: current month
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      dateFilter = { date: { $gte: firstDay } };
    }

    // Fetch all members with their report summaries
    const members = await User.find({ _id: { $in: filteredIds }, isDeleted: false }).select('name employeeId phone location joiningDate role');

    const reportData = await Promise.all(members.map(async (member) => {
      const reports = await DailyReport.find({
        employee: member._id,
        ...dateFilter
      }).sort({ date: 1 });

      const summary = reports.reduce((acc, r) => ({
        totalCalls: acc.totalCalls + (r.counts?.callsDone || 0),
        totalSelected: acc.totalSelected + (r.counts?.selected || 0),
        totalRejected: acc.totalRejected + (r.counts?.rejected || 0),
        totalDispatched: acc.totalDispatched + (r.counts?.dispatched || 0),
        reportDays: acc.reportDays + 1,
      }), { totalCalls: 0, totalSelected: 0, totalRejected: 0, totalDispatched: 0, reportDays: 0 });

      const conversionRate = summary.totalCalls > 0
        ? ((summary.totalSelected / summary.totalCalls) * 100).toFixed(1)
        : '0.0';

      const dispatchRate = summary.totalSelected > 0
        ? ((summary.totalDispatched / summary.totalSelected) * 100).toFixed(1)
        : '0.0';

      // Daily breakdown
      const dailyBreakdown = reports.map(r => ({
        date: format(new Date(r.date), 'dd MMM yyyy'),
        calls: r.counts?.callsDone || 0,
        selected: r.counts?.selected || 0,
        rejected: r.counts?.rejected || 0,
        dispatched: r.counts?.dispatched || 0,
      }));

      return {
        _id: member._id,
        name: member.name,
        employeeId: member.employeeId || 'N/A',
        phone: member.phone || 'N/A',
        role: member.role,
        location: member.location || 'N/A',
        joiningDate: member.joiningDate ? format(new Date(member.joiningDate), 'dd MMM yyyy') : 'N/A',
        summary: { ...summary, conversionRate, dispatchRate },
        dailyBreakdown,
      };
    }));

    res.json(reportData);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Export team report as Excel
// @route   GET /api/stats/team-report/export
// @access  Private (team_leader, admin)
const exportTeamReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let memberIds = [];
    if (req.user.role === 'team_leader') {
      const members = await User.find({ reportingTo: req.user._id, isDeleted: false }).select('_id');
      memberIds = [req.user._id, ...members.map(m => m._id)];
    } else if (req.user.role === 'admin') {
      const members = await User.find({ role: { $in: ['employee', 'team_leader'] }, isDeleted: false }).select('_id');
      memberIds = members.map(m => m._id);
    } else {
      return res.status(403).json({ message: 'Not authorized' });
    }

    let dateFilter = {};
    let rangeLabel = 'Current Month';
    if (startDate && endDate) {
      dateFilter = {
        date: {
          $gte: new Date(startDate),
          $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999))
        }
      };
      rangeLabel = `${startDate} to ${endDate}`;
    } else {
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      dateFilter = { date: { $gte: firstDay } };
      rangeLabel = format(now, 'MMMM yyyy');
    }

    const members = await User.find({ _id: { $in: memberIds }, isDeleted: false }).select('name employeeId phone location role');

    const wb = XLSX.utils.book_new();

    // Sheet 1: Summary
    const summaryData = [['Team Report - ' + rangeLabel], ['']];
    summaryData.push(['Employee Name', 'Employee ID', 'Phone', 'Role', 'Location', 'Days Reported', 'Total Calls', 'Total Selected', 'Total Rejected', 'Total Dispatched', 'Conversion Rate (%)', 'Dispatch Rate (%)']);

    for (const member of members) {
      const reports = await DailyReport.find({ employee: member._id, ...dateFilter });
      const summary = reports.reduce((acc, r) => ({
        totalCalls: acc.totalCalls + (r.counts?.callsDone || 0),
        totalSelected: acc.totalSelected + (r.counts?.selected || 0),
        totalRejected: acc.totalRejected + (r.counts?.rejected || 0),
        totalDispatched: acc.totalDispatched + (r.counts?.dispatched || 0),
        reportDays: acc.reportDays + 1,
      }), { totalCalls: 0, totalSelected: 0, totalRejected: 0, totalDispatched: 0, reportDays: 0 });

      const conversionRate = summary.totalCalls > 0
        ? parseFloat(((summary.totalSelected / summary.totalCalls) * 100).toFixed(1))
        : 0;
      const dispatchRate = summary.totalSelected > 0
        ? parseFloat(((summary.totalDispatched / summary.totalSelected) * 100).toFixed(1))
        : 0;

      summaryData.push([
        member.name,
        member.employeeId || 'N/A',
        member.phone || 'N/A',
        member.role,
        member.location || 'N/A',
        summary.reportDays,
        summary.totalCalls,
        summary.totalSelected,
        summary.totalRejected,
        summary.totalDispatched,
        conversionRate,
        dispatchRate,
      ]);
    }

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, summarySheet, 'Team Summary');

    // Sheet 2: Daily Breakdown (all members)
    const dailyData = [['Daily Activity Breakdown'], ['']];
    dailyData.push(['Employee Name', 'Employee ID', 'Date', 'Calls Done', 'Selected', 'Rejected', 'Dispatched']);

    for (const member of members) {
      const reports = await DailyReport.find({ employee: member._id, ...dateFilter }).sort({ date: 1 });
      for (const r of reports) {
        dailyData.push([
          member.name,
          member.employeeId || 'N/A',
          format(new Date(r.date), 'dd MMM yyyy'),
          r.counts?.callsDone || 0,
          r.counts?.selected || 0,
          r.counts?.rejected || 0,
          r.counts?.dispatched || 0,
        ]);
      }
    }

    const dailySheet = XLSX.utils.aoa_to_sheet(dailyData);
    XLSX.utils.book_append_sheet(wb, dailySheet, 'Daily Breakdown');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const filename = `Team_Report_${rangeLabel.replace(/ /g, '_').replace(/to/g, '-')}.xlsx`;

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getDashboardStats,
  getLeaderboard,
  getLeaderboardHistory,
  getTeamReport,
  exportTeamReport,
};
