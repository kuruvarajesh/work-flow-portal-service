const express = require('express');
const auth = require('../middleware/authMiddleware');
const Submission = require('../models/Submission');
const Assignment = require('../models/Assignment');
const router = express.Router();

router.post('/', auth, async (req, res) => {
  if (req.user.role !== 'student') return res.status(403).json({ message: 'Forbidden' });
  const { assignmentId, answer } = req.body;
  const a = await Assignment.findById(assignmentId);
  if (!a || a.status !== 'Published') return res.status(400).json({ message: 'Assignment not available' });
  const exist = await Submission.findOne({ assignment: assignmentId, student: req.user._id });
  if (exist) return res.status(400).json({ message: 'Already submitted' });
  const s = await Submission.create({ assignment: assignmentId, student: req.user._id, answer });
  res.json(s);
});

router.get('/mine/:assignmentId', auth, async (req, res) => {
  const s = await Submission.findOne({ assignment: req.params.assignmentId, student: req.user._id });
  res.json(s || null);
});

router.post('/:id/review', auth, async (req, res) => {
  if (req.user.role !== 'teacher') return res.status(403).json({ message: 'Forbidden' });
  const s = await Submission.findById(req.params.id);
  if (!s) return res.status(404).json({ message: 'Not found' });
  s.reviewed = true;
  await s.save();
  res.json(s);
});

module.exports = router;
