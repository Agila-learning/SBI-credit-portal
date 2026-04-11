const Incentive = require('../models/Incentive');
const User = require('../models/User');
const DailyReport = require('../models/DailyReport');
const IncentiveSlab = require('../models/IncentiveSlab');
const { format, startOfMonth, endOfMonth } = require('date-fns');

// @desc    Get all incentives or my incentives
// @route   GET /api/incentives
const getIncentives = async (req, res) => {
  try {
    let query = {};
    if (req.user.role === 'employee') {
      query.employee = req.user._id;
    }

    const incentives = await Incentive.find(query)
      .populate('employee', 'name employeeId role profilePicture')
      .populate('slabUsed')
      .sort({ createdAt: -1 });

    res.json(incentives);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Calculate and Upsert incentive (Automatic)
// @route   POST /api/incentives/calculate
const calculateIncentive = async (req, res) => {
  try {
    const { employeeId, month } = req.body; // month: "MM-YYYY"
    
    // Parse month to find date range
    const [mm, yyyy] = month.split('-').map(Number);
    const startDate = new Date(yyyy, mm - 1, 1);
    const endDate = endOfMonth(startDate);

    // 1. Aggregate performance from DailyReport
    const reports = await DailyReport.find({
      employee: employeeId,
      date: { $gte: startDate, $lte: endDate }
    });

    const stats = reports.reduce((acc, curr) => ({
      called: acc.called + curr.counts.callsDone,
      selected: acc.selected + curr.counts.selected,
      rejected: acc.rejected + curr.counts.rejected,
      dispatched: acc.dispatched + curr.counts.dispatched
    }), { called: 0, selected: 0, rejected: 0, dispatched: 0 });

    // 2. Match with Slab
    const slabs = await IncentiveSlab.find({ isActive: true }).sort({ minCards: 1 });
    const matchedSlab = slabs.find(s => stats.dispatched >= s.minCards && stats.dispatched <= s.maxCards);

    let baseAmount = 0;
    let rateUsed = 0;
    let bonusApplied = 0;

    if (matchedSlab) {
      rateUsed = matchedSlab.ratePerCard;
      bonusApplied = matchedSlab.bonusAmount;
      baseAmount = (stats.dispatched * rateUsed) + bonusApplied;
    }

    // 3. Upsert into Incentive
    let incentive = await Incentive.findOne({ employee: employeeId, month });

    const payload = {
      employee: employeeId,
      month,
      dispatchedCards: stats.dispatched,
      selectedApps: stats.selected,
      totalCalls: stats.called,
      totalRejected: stats.rejected,
      slabUsed: matchedSlab ? matchedSlab._id : null,
      rateApplied: rateUsed,
      bonusApplied: bonusApplied,
      incentiveAmount: baseAmount,
      updatedBy: req.user._id
    };

    if (incentive) {
      // Don't overwrite Approved/Paid status automatically unless forced?
      // For now, only update if Pending
      if (incentive.status === 'Pending') {
        Object.assign(incentive, payload);
        await incentive.save();
      }
    } else {
      incentive = await Incentive.create(payload);
    }

    res.json(await incentive.populate('slabUsed'));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Bulk Generate Incentives
// @route   POST /api/incentives/bulk
const bulkGenerate = async (req, res) => {
  try {
    const { month } = req.body;
    const employees = await User.find({ role: 'employee', status: 'active' });
    
    const results = [];
    for (const emp of employees) {
      // Internal calculation logic call
      try {
        // Prepare a mock request object for internal use or refactor logic
        // For simplicity here, we'll repeat the logic but ideally it should be a service
        const employeeId = emp._id;
        
        const [mm, yyyy] = month.split('-').map(Number);
        const startDate = new Date(yyyy, mm - 1, 1);
        const endDate = endOfMonth(startDate);

        const reports = await DailyReport.find({
          employee: employeeId,
          date: { $gte: startDate, $lte: endDate }
        });

        const stats = reports.reduce((acc, curr) => ({
          called: acc.called + (curr.counts?.callsDone || 0),
          selected: acc.selected + (curr.counts?.selected || 0),
          rejected: acc.rejected + (curr.counts?.rejected || 0),
          dispatched: acc.dispatched + (curr.counts?.dispatched || 0)
        }), { called: 0, selected: 0, rejected: 0, dispatched: 0 });

        const slabs = await IncentiveSlab.find({ isActive: true }).sort({ minCards: 1 });
        const matchedSlab = slabs.find(s => stats.dispatched >= s.minCards && stats.dispatched <= s.maxCards);

        let baseAmount = 0;
        let rateUsed = 0;
        let bonusApplied = 0;

        if (matchedSlab) {
          rateUsed = matchedSlab.ratePerCard;
          bonusApplied = matchedSlab.bonusAmount;
          baseAmount = (stats.dispatched * rateUsed) + bonusApplied;
        }

        const payload = {
          employee: employeeId,
          month,
          dispatchedCards: stats.dispatched,
          selectedApps: stats.selected,
          totalCalls: stats.called,
          totalRejected: stats.rejected,
          slabUsed: matchedSlab ? matchedSlab._id : null,
          rateApplied: rateUsed,
          bonusApplied: bonusApplied,
          incentiveAmount: baseAmount,
          updatedBy: req.user._id
        };

        let incentive = await Incentive.findOne({ employee: employeeId, month });
        if (incentive) {
          if (incentive.status === 'Pending') {
            Object.assign(incentive, payload);
            await incentive.save();
          }
        } else {
          await Incentive.create(payload);
        }
        results.push(emp._id);
      } catch (err) {
        console.error(`Incentive calculation failed for ${emp.name}:`, err);
      }
    }

    res.json({ message: `Calculated incentives for ${results.length} employees for cycle ${month}`, count: results.length });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update Payout Status / Adjustments
// @route   PUT /api/incentives/:id
const updateIncentive = async (req, res) => {
  try {
    const { adjustments, status, payoutDate, remarks, incentiveAmount } = req.body;
    const incentive = await Incentive.findById(req.params.id);
    
    if (!incentive) return res.status(404).json({ message: 'Record not found' });

    if (adjustments) incentive.adjustments = adjustments;
    if (status) incentive.status = status;
    if (payoutDate) incentive.payoutDate = payoutDate;
    if (remarks) incentive.remarks = remarks;
    if (incentiveAmount !== undefined) incentive.incentiveAmount = incentiveAmount;

    incentive.updatedBy = req.user._id;
    await incentive.save();
    
    res.json(incentive);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Export to CSV
// @route   GET /api/incentives/export
const exportIncentives = async (req, res) => {
  try {
    const { month } = req.query;
    const query = month ? { month } : {};
    const records = await Incentive.find(query).populate('employee', 'name employeeId');

    let csv = 'Employee,ID,Month,Dispatched,Total Amount,Status\n';
    records.forEach(r => {
      csv += `${r.employee.name},${r.employee.employeeId},${r.month},${r.dispatchedCards},${r.incentiveAmount},${r.status}\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.attachment(`Incentives_${month || 'All'}.csv`);
    res.send(csv);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteIncentive = async (req, res) => {
  try {
    const incentive = await Incentive.findByIdAndDelete(req.params.id);
    if (!incentive) return res.status(404).json({ message: 'Record not found' });
    res.json({ message: 'Record removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getIncentives,
  calculateIncentive,
  bulkGenerate,
  updateIncentive,
  exportIncentives,
  deleteIncentive
};
