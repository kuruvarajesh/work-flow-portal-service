const express = require('express');
const Assignment = require('../models/Assignment');
const Submission = require('../models/Submission');
const auth = require('../middleware/authMiddleware');
const router = express.Router();

router.post('/', auth, async (req, res) => {
  if (req.user.role !== 'teacher') return res.status(403).json({ message: 'Forbidden' });
  const { title, description, dueDate } = req.body;
  const assignment = await Assignment.create({ title, description, dueDate, teacher: req.user._id });
  res.json(assignment);
});

router.get('/', auth, async (req, res) => {
  const { status } = req.query;
  let q = {};
  if (req.user.role === 'teacher') {
    q.teacher = req.user._id;
    if (status) q.status = status;
  } else q.status = 'Published';
  const assignments = await Assignment.find(q).sort({ createdAt: -1 });
  res.json(assignments);
});

router.put('/:id', auth, async (req, res) => {
  if (req.user.role !== 'teacher') return res.status(403).json({ message: 'Forbidden' });
  const a = await Assignment.findById(req.params.id);
  if (!a) return res.status(404).json({ message: 'Not found' });
  if (a.status !== 'Draft') return res.status(400).json({ message: 'Only Draft editable' });
  Object.assign(a, req.body);
  await a.save();
  res.json(a);
});

router.delete('/:id', auth, async (req, res) => {
  if (req.user.role !== 'teacher') return res.status(403).json({ message: 'Forbidden' });
  const a = await Assignment.findById(req.params.id);
  if (!a) return res.status(404).json({ message: 'Not found' });
  if (a.status !== 'Draft') return res.status(400).json({ message: 'Only Draft deletable' });
  await a.deleteOne();
  res.json({ message: 'Deleted' });
});

router.post('/:id/status', auth, async (req, res) => {
  if (req.user.role !== 'teacher') return res.status(403).json({ message: 'Forbidden' });
  const { status } = req.body;
  const a = await Assignment.findById(req.params.id);
  if (!a) return res.status(404).json({ message: 'Not found' });
  if (a.status === 'Draft' && status === 'Published') a.status = 'Published';
  else if (a.status === 'Published' && status === 'Completed') a.status = 'Completed';
  else return res.status(400).json({ message: 'Invalid transition' });
  await a.save();
  res.json(a);
});

router.get('/:id/submissions', auth, async (req, res) => {
  if (req.user.role !== 'teacher') return res.status(403).json({ message: 'Forbidden' });
  const subs = await Submission.find({ assignment: req.params.id }).populate('student', 'name email');
  res.json(subs);
});

module.exports = router;
