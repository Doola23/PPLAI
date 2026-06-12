const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { body, validationResult } = require('express-validator');
const { PutCommand, GetCommand, UpdateCommand, QueryCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');
const { CreateTableCommand, DescribeTableCommand } = require('@aws-sdk/client-dynamodb');
const { docClient } = require('../db');
const requireAuth = require('../middleware/auth');
const { writeAuditLog } = require('./admin');

const router = express.Router();
const TABLE = 'plai_users';

const JWT_EXPIRY = '15m';
const REFRESH_EXPIRY = '7d';
const REFRESH_COOKIE_MS = 7 * 24 * 60 * 60 * 1000;

function issueAccess(user) {
  return jwt.sign(
    { sub: user.userId, email: user.email, role: user.role, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: JWT_EXPIRY }
  );
}

function issueRefresh(userId, email) {
  return jwt.sign({ sub: userId, email }, process.env.JWT_REFRESH_SECRET, { expiresIn: REFRESH_EXPIRY });
}

function setRefreshCookie(res, token) {
  res.cookie('plai_refresh', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: REFRESH_COOKIE_MS,
    path: '/api/auth',
  });
}

function clearRefreshCookie(res) {
  res.clearCookie('plai_refresh', { httpOnly: true, sameSite: 'strict', path: '/api/auth' });
}

function safeUser(u) {
  return {
    id: u.userId,
    email: u.email,
    name: u.name,
    role: u.role,
    bio: u.bio || null,
    avatarColor: u.avatarColor || null,
    profileImage: u.profileImage || null,
    username: u.username || null,
    age: u.age ?? null,
    favoriteClub: u.favoriteClub || null,
    primaryGoal: u.primaryGoal || null,
    onboardingComplete: !!u.onboardingComplete,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  };
}

const VALID_ROLES = ['coach', 'analyst', 'scout', 'fan'];
const VALID_GOALS = ['win_more', 'find_talent', 'reduce_injuries', 'follow_team', 'analyze_data'];

const signupRules = [
  body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('email').normalizeEmail().isEmail().withMessage('Invalid email'),
  body('password')
    .isLength({ min: 8 }).withMessage('Min 8 characters')
    .matches(/[A-Z]/).withMessage('Add an uppercase letter')
    .matches(/[0-9]/).withMessage('Add a number'),
  body('role').optional({ values: 'falsy' }).isIn(VALID_ROLES).withMessage('Select a valid role'),
];

const loginRules = [
  body('email').normalizeEmail().isEmail().withMessage('Invalid email'),
  body('password').notEmpty().withMessage('Password required'),
];

// POST /api/auth/signup
router.post('/signup', signupRules, async (req, res) => {
  const errs = validationResult(req);
  if (!errs.isEmpty()) {
    return res.status(400).json({ error: errs.array()[0].msg });
  }

  const { name, email, password, role } = req.body;
  const userRole = role || 'fan';

  try {
    const existing = await docClient.send(new GetCommand({ TableName: TABLE, Key: { email } }));
    if (existing.Item) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const userId = uuidv4();
    const passwordHash = await bcrypt.hash(password, 12);
    const now = new Date().toISOString();

    const refreshToken = issueRefresh(userId, email);
    const refreshHash = await bcrypt.hash(refreshToken, 10);

    const item = {
      userId, email, name,
      role: userRole,
      favoriteClub: null,
      primaryGoal: null,
      onboardingComplete: false,
      passwordHash, refreshHash,
      createdAt: now, updatedAt: now,
    };

    await docClient.send(new PutCommand({ TableName: TABLE, Item: item }));

    const accessToken = issueAccess({ userId, email, name, role: userRole });
    setRefreshCookie(res, refreshToken);

    writeAuditLog({ userId, userEmail: email, userName: name, actionType: 'auth', action: 'Signed up' });
    return res.status(201).json({ token: accessToken, user: safeUser(item) });
  } catch (err) {
    console.error('Signup error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/login
router.post('/login', loginRules, async (req, res) => {
  const errs = validationResult(req);
  if (!errs.isEmpty()) {
    return res.status(400).json({ error: errs.array()[0].msg });
  }

  const { email, password } = req.body;

  try {
    const result = await docClient.send(new GetCommand({ TableName: TABLE, Key: { email } }));
    if (!result.Item) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.Item;
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const refreshToken = issueRefresh(user.userId, user.email);
    const refreshHash = await bcrypt.hash(refreshToken, 10);

    await docClient.send(new UpdateCommand({
      TableName: TABLE,
      Key: { email },
      UpdateExpression: 'SET refreshHash = :rh, updatedAt = :u',
      ExpressionAttributeValues: { ':rh': refreshHash, ':u': new Date().toISOString() },
    }));

    const accessToken = issueAccess(user);
    setRefreshCookie(res, refreshToken);

    writeAuditLog({ userId: user.userId, userEmail: user.email, userName: user.name, actionType: 'auth', action: 'Logged in' });
    return res.json({ token: accessToken, user: safeUser(user) });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/refresh
router.post('/refresh', async (req, res) => {
  const token = req.cookies?.plai_refresh;
  if (!token) return res.status(401).json({ error: 'No refresh token' });

  try {
    const payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    const { email } = payload;

    const result = await docClient.send(new GetCommand({ TableName: TABLE, Key: { email } }));
    if (!result.Item) return res.status(401).json({ error: 'User not found' });

    const user = result.Item;
    const hashMatch = await bcrypt.compare(token, user.refreshHash || '');
    if (!hashMatch) return res.status(401).json({ error: 'Refresh token revoked' });

    const newRefresh = issueRefresh(user.userId, user.email);
    const newHash = await bcrypt.hash(newRefresh, 10);

    await docClient.send(new UpdateCommand({
      TableName: TABLE,
      Key: { email },
      UpdateExpression: 'SET refreshHash = :rh, updatedAt = :u',
      ExpressionAttributeValues: { ':rh': newHash, ':u': new Date().toISOString() },
    }));

    const accessToken = issueAccess(user);
    setRefreshCookie(res, newRefresh);

    return res.json({ token: accessToken });
  } catch {
    clearRefreshCookie(res);
    return res.status(401).json({ error: 'Invalid refresh token' });
  }
});

// POST /api/auth/logout
router.post('/logout', async (req, res) => {
  const token = req.cookies?.plai_refresh;
  if (token) {
    try {
      const payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
      await docClient.send(new UpdateCommand({
        TableName: TABLE,
        Key: { email: payload.email },
        UpdateExpression: 'REMOVE refreshHash',
      }));
    } catch {
      // token already invalid — still clear the cookie
    }
  }
  clearRefreshCookie(res);
  if (req.user) {
    writeAuditLog({ userId: req.user.userId, userEmail: req.user.email, userName: req.user.name, actionType: 'auth', action: 'Logged out' });
  }
  return res.json({ ok: true });
});

// GET /api/auth/me
router.get('/me', requireAuth, async (req, res) => {
  try {
    const result = await docClient.send(new GetCommand({ TableName: TABLE, Key: { email: req.user.email } }));
    if (!result.Item) return res.status(404).json({ error: 'User not found' });
    return res.json({ user: safeUser(result.Item) });
  } catch (err) {
    console.error('Me error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/auth/me — onboarding + profile updates
router.patch('/me', requireAuth, async (req, res) => {
  const { role, favoriteClub, primaryGoal, onboardingComplete, name, bio, avatarColor, profileImage, username, age } = req.body;
  const updates = [];
  const values = { ':u': new Date().toISOString() };
  const names = {};

  if (role !== undefined) {
    if (!VALID_ROLES.includes(role)) return res.status(400).json({ error: 'Invalid role' });
    updates.push('#r = :r'); values[':r'] = role; names['#r'] = 'role';
  }
  if (favoriteClub !== undefined) { updates.push('favoriteClub = :fc'); values[':fc'] = favoriteClub; }
  if (primaryGoal !== undefined) {
    if (primaryGoal && !VALID_GOALS.includes(primaryGoal)) return res.status(400).json({ error: 'Invalid goal' });
    updates.push('primaryGoal = :pg'); values[':pg'] = primaryGoal;
  }
  if (onboardingComplete !== undefined) { updates.push('onboardingComplete = :oc'); values[':oc'] = !!onboardingComplete; }
  if (name !== undefined) { updates.push('#n = :nm'); values[':nm'] = name; names['#n'] = 'name'; }
  if (bio !== undefined) { updates.push('bio = :bio'); values[':bio'] = bio; }
  if (avatarColor !== undefined) { updates.push('avatarColor = :ac'); values[':ac'] = avatarColor; }
  if (profileImage !== undefined) { updates.push('profileImage = :pi'); values[':pi'] = profileImage; }
  if (username !== undefined) { updates.push('username = :un'); values[':un'] = username; }
  if (age !== undefined) {
    const n = age === null ? null : Number(age);
    if (n !== null && (isNaN(n) || n < 13 || n > 120)) return res.status(400).json({ error: 'Age must be between 13 and 120' });
    updates.push('age = :age'); values[':age'] = n;
  }

  if (!updates.length) return res.status(400).json({ error: 'No fields to update' });
  updates.push('updatedAt = :u');

  try {
    const result = await docClient.send(new UpdateCommand({
      TableName: TABLE,
      Key: { email: req.user.email },
      UpdateExpression: 'SET ' + updates.join(', '),
      ExpressionAttributeValues: values,
      ...(Object.keys(names).length ? { ExpressionAttributeNames: names } : {}),
      ReturnValues: 'ALL_NEW',
    }));
    // Re-issue access token if role/name changed (claims out of date)
    const updated = result.Attributes;
    const newAccess = (role || name || bio !== undefined || avatarColor !== undefined || profileImage !== undefined) ? issueAccess(updated) : null;
    return res.json({ user: safeUser(updated), ...(newAccess ? { token: newAccess } : {}) });
  } catch (err) {
    console.error('Patch me error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/auth/me — permanently delete account
router.delete('/me', requireAuth, async (req, res) => {
  try {
    await docClient.send(new DeleteCommand({ TableName: TABLE, Key: { email: req.user.email } }));
    clearRefreshCookie(res);
    return res.json({ ok: true });
  } catch (err) {
    console.error('Delete account error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
