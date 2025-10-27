import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { MongoClient, ObjectId } from 'mongodb';

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

const client = new MongoClient(process.env.MONGO_URI);
let db, usersCol, assignmentsCol, submissionsCol;

async function init() {
  await client.connect();
  db = client.db('assignment_portal');
  usersCol = db.collection('users');
  assignmentsCol = db.collection('assignments');
  submissionsCol = db.collection('submissions');
  console.log('Connected to MongoDB Atlas');
}
init();

// JWT auth middleware
function auth(requiredRole) {
  return async (req, res, next) => {
    const header = req.headers.authorization;
    if (!header) return res.status(401).json({ message: 'No token' });
    try {
      const token = header.split(' ')[1];
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      req.user = payload;
      if (requiredRole && payload.role !== requiredRole)
        return res.status(403).json({ message: 'Forbidden' });
      next();
    } catch (err) {
      res.status(401).json({ message: 'Invalid token' });
    }
  };
}

// ===== AUTH =====
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password || !role)
    return res.status(400).json({ message: 'Missing fields' });

  const exist = await usersCol.findOne({ email });
  if (exist) return res.status(400).json({ message: 'Email already exists' });

  const hash = await bcrypt.hash(password, 10);
  const result = await usersCol.insertOne({ name, email, passwordHash: hash, role });
  const user = await usersCol.findOne({ _id: result.insertedId });
  res.json({ id: user._id, email: user.email });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await usersCol.findOne({ email });
  if (!user) return res.status(400).json({ message: 'Invalid credentials' });
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return res.status(400).json({ message: 'Invalid credentials' });
  const token = jwt.sign({ id: user._id, role: user.role, name: user.name }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, role: user.role, name: user.name });
});

// ===== ASSIGNMENTS =====
app.post('/api/assignments', auth('teacher'), async (req, res) => {
  const { title, description, dueDate } = req.body;
  const doc = {
    title,
    description,
    dueDate: dueDate ? new Date(dueDate) : null,
    status: 'Draft',
    teacherId: new ObjectId(req.user.id),
    createdAt: new Date()
  };
  const result = await assignmentsCol.insertOne(doc);
  res.json(await assignmentsCol.findOne({ _id: result.insertedId }));
});

app.get('/api/assignments', auth(), async (req, res) => {
  let filter = {};
  if (req.user.role === 'teacher') {
    filter.teacherId = new ObjectId(req.user.id);
    if (req.query.status) filter.status = req.query.status;
  } else {
    filter.status = 'Published';
  }
  const data = await assignmentsCol.find(filter).sort({ createdAt: -1 }).toArray();
  res.json(data);
});

app.post('/api/assignments/:id/status', auth('teacher'), async (req, res) => {
  const { status } = req.body;
  const a = await assignmentsCol.findOne({ _id: new ObjectId(req.params.id) });
  if (!a) return res.status(404).json({ message: 'Not found' });

  let valid = false;
  if (a.status === 'Draft' && status === 'Published') valid = true;
  if (a.status === 'Published' && status === 'Completed') valid = true;
  if (!valid) return res.status(400).json({ message: 'Invalid transition' });

  await assignmentsCol.updateOne({ _id: a._id }, { $set: { status } });
  res.json(await assignmentsCol.findOne({ _id: a._id }));
});

app.delete('/api/assignments/:id', auth('teacher'), async (req, res) => {
  const a = await assignmentsCol.findOne({ _id: new ObjectId(req.params.id) });
  if (!a) return res.status(404).json({ message: 'Not found' });
  if (a.status !== 'Draft') return res.status(400).json({ message: 'Only draft deletable' });
  await assignmentsCol.deleteOne({ _id: a._id });
  res.json({ message: 'Deleted' });
});

app.get('/api/assignments/:id/submissions', auth('teacher'), async (req, res) => {
  const subs = await submissionsCol.aggregate([
    { $match: { assignmentId: new ObjectId(req.params.id) } },
    { $lookup: { from: 'users', localField: 'studentId', foreignField: '_id', as: 'student' } },
    { $unwind: '$student' },
    { $project: { answer: 1, submittedAt: 1, 'student.name': 1, 'student.email': 1 } }
  ]).toArray();
  res.json(subs);
});

// ===== SUBMISSIONS =====
app.post('/api/submissions', auth('student'), async (req, res) => {
  const { assignmentId, answer } = req.body;
  const a = await assignmentsCol.findOne({ _id: new ObjectId(assignmentId) });
  if (!a || a.status !== 'Published') return res.status(400).json({ message: 'Assignment not available' });

  const exist = await submissionsCol.findOne({ assignmentId: new ObjectId(assignmentId), studentId: new ObjectId(req.user.id) });
  if (exist) return res.status(400).json({ message: 'Already submitted' });

  const doc = {
    assignmentId: new ObjectId(assignmentId),
    studentId: new ObjectId(req.user.id),
    answer,
    submittedAt: new Date()
  };
  const result = await submissionsCol.insertOne(doc);
  res.json(await submissionsCol.findOne({ _id: result.insertedId }));
});

app.get('/api/submissions/mine/:assignmentId', auth('student'), async (req, res) => {
  const s = await submissionsCol.findOne({
    assignmentId: new ObjectId(req.params.assignmentId),
    studentId: new ObjectId(req.user.id)
  });
  res.json(s || null);
});

// ===== SERVER =====
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log('Backend running on http://localhost:' + PORT));