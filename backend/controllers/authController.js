const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('../config/db').db;
const { sendEmail } = require('../utils/emailService');

// ─── Helper ───────────────────────────────────────────────────────────────────
const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });

const now = () => new Date().toISOString();

// ─────────────────────────────────────────────
// @route  POST /api/auth/register
// @access Public
// ─────────────────────────────────────────────
const register = async (req, res, next) => {
  try {
    const { name, email, password, role, department } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, and password are required' });
    }

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      return res.status(409).json({ success: false, message: 'Email already registered' });
    }

    // Security: public registration can NEVER create admin accounts.
    // 'admin' sent from the client is silently downgraded to 'user'.
    const allowedRole = role === 'staff' ? 'staff' : 'user';

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const ts = now();

    const result = db.prepare(`
      INSERT INTO users (name, email, password, role, department, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(name, email, hashedPassword, allowedRole, department || '', ts, ts);

    const userId = result.lastInsertRowid;

    // Welcome notification
    db.prepare(`
      INSERT INTO notifications (recipient, title, message, type, createdAt)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      userId,
      'Welcome to Smart Complaint System!',
      `Hi ${name}, your account has been created. You can now submit and track complaints.`,
      'general',
      now()
    );

    // Welcome email (non-blocking)
    sendEmail({
      to: email,
      subject: '🎉 Welcome to Smart Complaint Management System',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px;background:#f9fafb;border-radius:8px;">
          <h2 style="color:#1e40af;">Welcome, ${name}!</h2>
          <p>Your account has been successfully created on the <strong>Smart Complaint Management System</strong>.</p>
          <p>You can now log in to submit, track, and manage complaints.</p>
          <br/>
          <p style="color:#6b7280;font-size:12px;">SZABIST — Smart Complaint Management System</p>
        </div>
      `,
    });

    const token = generateToken(userId);

    return res.status(201).json({
      success: true,
      message: 'Account created successfully',
      token,
      user: { _id: userId, name, email, role: allowedRole, department: department || '' },
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// @route  POST /api/auth/login
// @access Public
// ─────────────────────────────────────────────
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }
    if (!user.isActive) {
      return res.status(401).json({ success: false, message: 'Account has been deactivated' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    // Update last login
    db.prepare('UPDATE users SET lastLogin = ?, updatedAt = ? WHERE id = ?').run(now(), now(), user.id);

    const token = generateToken(user.id);

    return res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        _id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// @route  GET /api/auth/profile
// @access Private
// ─────────────────────────────────────────────
const getProfile = async (req, res, next) => {
  try {
    const user = db.prepare(
      'SELECT id, name, email, role, department, isActive, lastLogin, createdAt, updatedAt FROM users WHERE id = ?'
    ).get(req.user.id);

    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    return res.json({ success: true, user: { ...user, _id: user.id } });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// @route  PUT /api/auth/profile
// @access Private
// ─────────────────────────────────────────────
const updateProfile = async (req, res, next) => {
  try {
    const { name, department, password } = req.body;

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    let newName = name || user.name;
    let newDept = department !== undefined ? department : user.department;
    let newPassword = user.password;

    if (password) {
      if (password.length < 6) {
        return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
      }
      const salt = await bcrypt.genSalt(10);
      newPassword = await bcrypt.hash(password, salt);
    }

    db.prepare(`
      UPDATE users SET name = ?, department = ?, password = ?, updatedAt = ? WHERE id = ?
    `).run(newName, newDept, newPassword, now(), user.id);

    return res.json({
      success: true,
      message: 'Profile updated successfully',
      user: { _id: user.id, name: newName, email: user.email, role: user.role, department: newDept },
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// @route  GET /api/auth/users
// @access Private/Admin
// ─────────────────────────────────────────────
const getAllUsers = async (req, res, next) => {
  try {
    const users = db.prepare(
      'SELECT id, name, email, role, department, isActive, lastLogin, createdAt, updatedAt FROM users ORDER BY createdAt DESC'
    ).all().map((u) => ({ ...u, _id: u.id }));

    return res.json({ success: true, count: users.length, users });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// @route  PUT /api/auth/users/:id
// @access Private/Admin
// ─────────────────────────────────────────────
const updateUser = async (req, res, next) => {
  try {
    const { role, department, isActive } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);

    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const newRole = role || user.role;
    const newDept = department !== undefined ? department : user.department;
    const newActive = isActive !== undefined ? (isActive ? 1 : 0) : user.isActive;

    db.prepare(`
      UPDATE users SET role = ?, department = ?, isActive = ?, updatedAt = ? WHERE id = ?
    `).run(newRole, newDept, newActive, now(), user.id);

    const updated = db.prepare(
      'SELECT id, name, email, role, department, isActive, createdAt, updatedAt FROM users WHERE id = ?'
    ).get(user.id);

    return res.json({ success: true, message: 'User updated', user: { ...updated, _id: updated.id } });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// @route  GET /api/auth/staff
// @access Private/Admin
// ─────────────────────────────────────────────
const getStaffMembers = async (req, res, next) => {
  try {
    const staff = db.prepare(
      "SELECT id, name, email, department FROM users WHERE role = 'staff' AND isActive = 1"
    ).all().map((s) => ({ ...s, _id: s.id }));

    return res.json({ success: true, staff });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// @route  POST /api/auth/create-admin
// @access Private/Admin — the ONLY way to create an admin account
// ─────────────────────────────────────────────
const createAdmin = async (req, res, next) => {
  try {
    const { name, email, password, department } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, and password are required' });
    }

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      return res.status(409).json({ success: false, message: 'Email already registered' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const ts = now();

    const result = db.prepare(`
      INSERT INTO users (name, email, password, role, department, createdAt, updatedAt)
      VALUES (?, ?, ?, 'admin', ?, ?, ?)
    `).run(name, email, hashedPassword, department || '', ts, ts);

    const userId = result.lastInsertRowid;

    db.prepare(`
      INSERT INTO notifications (recipient, title, message, type, createdAt)
      VALUES (?, ?, ?, 'general', ?)
    `).run(
      userId,
      'Admin Account Created',
      `Admin account for ${name} was created by ${req.user.name}.`,
      now()
    );

    return res.status(201).json({
      success: true,
      message: 'Admin account created successfully',
      user: { _id: userId, name, email, role: 'admin', department: department || '' },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { register, login, getProfile, updateProfile, getAllUsers, updateUser, getStaffMembers, createAdmin };
