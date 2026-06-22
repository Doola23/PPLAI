const jwt = require('jsonwebtoken');

function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing token' });
  }
  const token = header.slice(7);
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Decodes the token if one is present, but never blocks the request -- used on
// routes that stay public for anonymous visitors (e.g. the landing page teaser)
// while still letting logged-in-only checks (like blockRole) see req.user.
function optionalAuth(req, res, next) {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    try {
      req.user = jwt.verify(header.slice(7), process.env.JWT_SECRET);
    } catch {
      // Invalid/expired token on an otherwise-public route -- treat as anonymous
      // rather than rejecting, so a stale token can't break public access.
    }
  }
  next();
}

// Blocks only logged-in users with one of the given roles. Anonymous requests
// (no req.user, e.g. the public landing page) are left untouched.
function blockRole(...roles) {
  return (req, res, next) => {
    if (req.user && roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Not available on this account type' });
    }
    next();
  };
}

module.exports = requireAuth;
module.exports.requireAuth = requireAuth;
module.exports.optionalAuth = optionalAuth;
module.exports.blockRole = blockRole;
