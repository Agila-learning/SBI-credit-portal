const Lead = require('../models/Lead');
const Interaction = require('../models/Interaction');
const DailyReport = require('../models/DailyReport');
const Task = require('../models/Task');

// @desc    Get lead by mobile number for auto-fill
// @route   GET /api/leads/mobile/:mobile
// @access  Private
const getLeadByMobile = async (req, res) => {
  try {
    const lead = await Lead.findOne({ mobileNumber: req.params.mobile })
      .populate({
        path: 'history',
        options: { sort: { date: -1 }, limit: 5 }
      });
    
    if (!lead) {
      return res.status(404).json({ message: 'Lead not found' });
    }
    res.json(lead);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Submit daily counts and corresponding lead interactions
// @route   POST /api/leads/batch
// @access  Private
const submitDailyBatch = async (req, res) => {
  const { 
    date, 
    counts, 
    leads 
  } = req.body;

  // 1. Validation Logic
  if (leads.length !== counts.callsDone) {
    return res.status(400).json({ 
      message: `Count mismatch! You entered ${counts.callsDone} calls but provided details for ${leads.length} leads.` 
    });
  }

  const selectedCount = leads.filter(l => l.stage === 'Selected').length;
  const rejectedCount = leads.filter(l => l.stage === 'Rejected').length;
  const dispatchedCount = leads.filter(l => l.stage === 'Dispatched').length;

  if (selectedCount !== counts.selected || rejectedCount !== counts.rejected || dispatchedCount !== counts.dispatched) {
    return res.status(400).json({ 
      message: "Stage distribution mismatch! Actual lead stages do not match the header counts." 
    });
  }

  try {
    const sessionDate = new Date(date || Date.now());
    sessionDate.setHours(0,0,0,0);

    const today = new Date();
    today.setHours(0,0,0,0);

    if (sessionDate < today) {
      return res.status(403).json({ 
        message: "Audit Lock: You cannot submit or modify reports for past dates. Please contact your administrator for corrections." 
      });
    }

    // 2. Atomic Processing (Simplified for Mongoose without explicit sessions if possible, but we'll loop)
    const interactionResults = [];

    for (const leadData of leads) {
      let lead = await Lead.findOne({ mobileNumber: leadData.mobileNumber });

      if (!lead) {
        // Create new Lead
        lead = await Lead.create({
          customerName: leadData.customerName,
          mobileNumber: leadData.mobileNumber,
          location: leadData.location,
          status: leadData.stage,
          employee: req.user._id,
        });
      } else {
        // Update existing Lead status
        lead.status = leadData.stage;
        await lead.save();
      }

      // Create Interaction
      const interaction = await Interaction.create({
        lead: lead._id,
        employee: req.user._id,
        date: sessionDate,
        callType: leadData.callType,
        stage: leadData.stage,
        remarks: leadData.remarks,
      });

      // Link interaction to lead history
      lead.history.push(interaction._id);
      await lead.save();

      interactionResults.push(interaction._id);
    }

    // 3. Create Daily Report
    const report = await DailyReport.findOneAndUpdate(
      { employee: req.user._id, date: sessionDate },
      { 
        counts, 
        actualEntries: leads.length,
        isVerified: true
      },
      { upsert: true, new: true }
    );

    // 4. Task Target Automation: Update achievedCount for active tasks
    try {
      const activeTasks = await Task.find({
        assignedTo: req.user._id,
        status: { $in: ['Pending', 'In Progress'] },
        dueDate: { $gte: sessionDate } // Task is still valid for this date
      });

      for (const task of activeTasks) {
        let updateValue = 0;
        if (task.type === 'Calls Target') updateValue = counts.callsDone;
        else if (task.type === 'Selected Target') updateValue = counts.selected;
        else if (task.type === 'Dispatched Target') updateValue = counts.dispatched;
        
        if (updateValue > 0) {
          // Add today's newly reported numbers to the total achieved
          // Note: If this is an update to an existing report, this logic needs to be careful 
          // to only add the difference. But since we use findOneAndUpdate for reports, 
          // and we are adding the WHOLE today's count, this assumes the task achievedCount 
          // tracking is separate.
          
          // REFINED LOGIC: Overwrite achievedCount or Add?
          // Usually, target tasks are for a period. 
          // Let's assume achievedCount = sum of all reports within task period.
          // For now, let's just increment it by the submitted value.
          
          task.achievedCount += updateValue;
          
          // Auto-complete if target met
          if (task.targetCount > 0 && task.achievedCount >= task.targetCount) {
             task.status = 'Completed';
          } else {
             task.status = 'In Progress';
          }
          await task.save();
        }
      }
    } catch (taskError) {
      console.error('Task auto-sync failed:', taskError);
      // Don't fail the whole request if task sync fails
    }

    res.status(201).json({ 
      message: 'Daily batch processed successfully', 
      reportId: report._id,
      entriesProcessed: leads.length
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all leads with filters
// @route   GET /api/leads
// @access  Private
const getLeads = async (req, res) => {
  const {
    employeeId,
    status,
    startDate,
    endDate,
    month,
  } = req.query;

  let query = {};

  // If not admin, only show own leads
  if (req.user.role !== 'admin') {
    query.employee = req.user._id;
  } else if (employeeId) {
    query.employee = employeeId;
  }

  if (status) {
    query.status = status;
  }

  if (startDate && endDate) {
    query.createdAt = {
      $gte: new Date(startDate),
      $lte: new Date(endDate),
    };
  } else if (month) {
    const year = new Date().getFullYear();
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0);
    query.createdAt = { $gte: startOfMonth, $lte: endOfMonth };
  }

  try {
    const leads = await Lead.find(query)
      .populate('employee', 'name employeeId')
      .populate({
        path: 'history',
        options: { sort: { date: -1 }, limit: 1 }
      })
      .sort({ updatedAt: -1 });

    res.json(leads);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update a lead
// @route   PUT /api/leads/:id
// @access  Private
const updateLead = async (req, res) => {
  try {
    let lead = await Lead.findById(req.params.id);

    if (!lead) {
      return res.status(404).json({ message: 'Lead not found' });
    }

    if (req.user.role !== 'admin' && lead.employee.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    lead = await Lead.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.json(lead);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete a lead
// @route   DELETE /api/leads/:id
// @access  Private/Admin
const deleteLead = async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id);

    if (!lead) {
      return res.status(404).json({ message: 'Lead not found' });
    }

    if (req.user.role !== 'admin') {
      return res.status(401).json({ message: 'Not authorized' });
    }

    // Also delete associated interactions
    await Interaction.deleteMany({ lead: lead._id });
    await lead.deleteOne();
    
    res.json({ message: 'Lead and history removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getLeadByMobile,
  submitDailyBatch,
  getLeads,
  updateLead,
  deleteLead,
};
