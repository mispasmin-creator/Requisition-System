import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { CONFIG } from './config.js';
import { sheetsService } from './sheetsService.js';

// Predefined users matching the live Master tab requesters and workflow owners (fallback seed)
const USERS = [
  {
    id: 'usr_vivek',
    username: 'vivek',
    passwordHash: bcrypt.hashSync('vivek123', 8),
    displayName: 'Vivek Mishra',
    role: 'requester',
    requesterName: 'Vivek Mishra',
  },
  {
    id: 'usr_hareram',
    username: 'hareram',
    passwordHash: bcrypt.hashSync('hareram123', 8),
    displayName: 'Hareram Maurya',
    role: 'requester',
    requesterName: 'Hareram Maurya',
  },
  {
    id: 'usr_suryakant',
    username: 'suryakant',
    passwordHash: bcrypt.hashSync('suryakant123', 8),
    displayName: 'Suryakant Verma',
    role: 'requester',
    requesterName: 'Suryakant Verma',
  },
  {
    id: 'usr_prince',
    username: 'prince',
    passwordHash: bcrypt.hashSync('prince123', 8),
    displayName: 'Prince Nagpal',
    role: 'requester',
    requesterName: 'Prince Nagpal',
  },
  {
    id: 'usr_uttam',
    username: 'uttam',
    passwordHash: bcrypt.hashSync('uttam123', 8),
    displayName: 'Uttam Sahu (Truck)',
    role: 'requester',
    requesterName: 'Uttam Sahu (Truck)',
  },
  {
    id: 'usr_sanjay',
    username: 'sanjay',
    passwordHash: bcrypt.hashSync('sanjay123', 8),
    displayName: 'Sanjay Singh',
    role: 'requester',
    requesterName: 'Sanjay Singh',
  },
  {
    id: 'usr_ea',
    username: 'ea',
    passwordHash: bcrypt.hashSync('ea123', 8),
    displayName: 'Executive Assistant (Management)',
    role: 'ea',
  },
  {
    id: 'usr_priyank',
    username: 'priyank',
    passwordHash: bcrypt.hashSync('priyank123', 8),
    displayName: 'Priyank (Posting)',
    role: 'posting',
  },
  {
    id: 'usr_rahul',
    username: 'rahul',
    passwordHash: bcrypt.hashSync('rahul123', 8),
    displayName: 'Rahul (Payment)',
    role: 'payment',
  },
  {
    id: 'usr_auditor',
    username: 'auditor',
    passwordHash: bcrypt.hashSync('auditor123', 8),
    displayName: 'Financial Auditor',
    role: 'auditor',
  },
  {
    id: 'usr_admin',
    username: 'admin',
    passwordHash: bcrypt.hashSync('admin123', 8),
    displayName: 'System Admin (Full Access)',
    role: 'admin',
  },
];

export function isSuperAdmin(user) {
  if (!user) return false;
  const role = (user.role || '').toLowerCase();
  const username = (user.username || '').toLowerCase();
  return (
    role === 'admin' ||
    role === 'super_admin' ||
    role === 'super admin' ||
    role === 'superadmin' ||
    username === 'admin'
  );
}

function authenticateSeedUser(trimmedUser, trimmedPass) {
  const user = USERS.find((candidate) => candidate.username.toLowerCase() === trimmedUser);
  if (!user) return null;

  let match = bcrypt.compareSync(trimmedPass, user.passwordHash);
  if (!match && user.username === 'admin' && (trimmedPass === 'admin' || trimmedPass === 'admin123')) {
    match = true;
  }
  if (!match) return null;

  const permissions = {
    dashboard: 'Full',
    approval: user.role === 'admin' || user.role === 'ea' ? 'Full' : 'No',
    posting: user.role === 'admin' || user.role === 'posting' ? 'Full' : 'No',
    payment: user.role === 'admin' || user.role === 'payment' ? 'Full' : 'No',
    audit: user.role === 'admin' || user.role === 'auditor' ? 'Full' : 'No',
    history: 'Full',
    admin: user.role === 'admin' ? 'Full' : 'No',
  };
  const profile = {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    role: user.role,
    requesterName: user.requesterName,
    isSuperAdmin: user.role === 'admin',
    firmAccess: 'ALL',
    permissions,
  };

  return {
    token: jwt.sign(profile, CONFIG.JWT_SECRET, { expiresIn: CONFIG.JWT_EXPIRES_IN }),
    user: profile,
  };
}

export async function authenticate(username, password) {
  const trimmedUser = (username || '').trim().toLowerCase();
  const trimmedPass = (password || '').trim();

  // Admin must never wait for Google Sheets/network warm-up. Invalid admin
  // credentials still fall through to the dynamic Login sheet check.
  if (trimmedUser === 'admin') {
    const immediateAdmin = authenticateSeedUser(trimmedUser, trimmedPass);
    if (immediateAdmin) return immediateAdmin;
  }

  // 1. Try to find user in dynamic Login page sheet
  let sheetUsers = [];
  try {
    sheetUsers = await sheetsService.fetchLoginUsers();
  } catch (err) {
    console.warn('[Auth] Warning fetching dynamic sheet users:', err.message);
  }

  const dynamicUser = sheetUsers.find((u) => u.username.toLowerCase() === trimmedUser);
  if (dynamicUser) {
    if (dynamicUser.status && dynamicUser.status.toLowerCase() === 'inactive') {
      throw new Error('This account is marked Inactive. Please contact System Administrator.');
    }

    let match = false;
    if (dynamicUser.password) {
      if (dynamicUser.password === trimmedPass) match = true;
      else {
        try {
          match = bcrypt.compareSync(trimmedPass, dynamicUser.password);
        } catch {
          match = false;
        }
      }
    }
    // Admin fallback password
    if (!match && dynamicUser.username === 'admin' && (trimmedPass === 'admin' || trimmedPass === 'admin123')) {
      match = true;
    }

    if (!match) return null;

    const isSuper = isSuperAdmin(dynamicUser);
    const finalPermissions = isSuper
      ? {
          dashboard: 'Full',
          approval: 'Full',
          posting: 'Full',
          payment: 'Full',
          audit: 'Full',
          history: 'Full',
          admin: 'Full',
        }
      : (dynamicUser.permissions || {});

    const finalFirmAccess = isSuper ? 'ALL' : (dynamicUser.firmAccess || 'ALL');
    const finalRole = isSuper ? 'admin' : dynamicUser.role;
    const requesterName = dynamicUser.fullName || dynamicUser.username;

    const token = jwt.sign(
      {
        id: dynamicUser.id,
        username: dynamicUser.username,
        displayName: dynamicUser.fullName || dynamicUser.username,
        role: finalRole,
        requesterName,
        isSuperAdmin: isSuper,
        firmAccess: finalFirmAccess,
        permissions: finalPermissions,
      },
      CONFIG.JWT_SECRET,
      { expiresIn: CONFIG.JWT_EXPIRES_IN }
    );

    return {
      token,
      user: {
        id: dynamicUser.id,
        username: dynamicUser.username,
        displayName: dynamicUser.fullName || dynamicUser.username,
        role: finalRole,
        requesterName,
        isSuperAdmin: isSuper,
        firmAccess: finalFirmAccess,
        permissions: finalPermissions,
      },
    };
  }

  // 2. Fallback to predefined seed users
  return authenticateSeedUser(trimmedUser, trimmedPass);
}

export function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized. Bearer token required.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, CONFIG.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Token expired or invalid.' });
  }
}

/**
 * Filter list of requisitions according to authenticated user scope and firm access
 */
export function filterRequisitionsForUser(requisitions, user) {
  if (!user) return [];

  // Super Admin has absolute authority across ALL firms and ALL stages
  if (isSuperAdmin(user)) {
    return requisitions;
  }

  let result = requisitions;

  // Granular Firm Access check: if not 'ALL', only show matching firm
  if (user.firmAccess && user.firmAccess !== 'ALL' && user.firmAccess !== 'All Firms') {
    const targetFirm = user.firmAccess.trim().toLowerCase();
    result = result.filter(
      (r) => r.firmName && r.firmName.trim().toLowerCase() === targetFirm
    );
  }

  if (user.role === 'admin') {
    return result;
  }

  // Login-page workflow permissions are the source of truth for cross-requester
  // visibility. A user assigned to a stage must be able to see that stage's
  // queue even when their legacy role is still "requester". Firm access above
  // remains enforced. Dashboard/history permissions intentionally do not widen
  // record scope, so ordinary requesters continue to see only their own rows.
  const workflowPermissionKeys = ['approval', 'posting', 'payment', 'audit'];
  const hasWorkflowAccess = workflowPermissionKeys.some((key) => {
    const level = user.permissions?.[key];
    return level === 'Full' || level === 'View';
  });

  if (hasWorkflowAccess) {
    return result;
  }

  if (user.role === 'requester') {
    return result.filter(
      (r) =>
        r.requesterName &&
        r.requesterName.trim().toLowerCase() === user.requesterName?.trim().toLowerCase()
    );
  }
  if (user.role === 'ea') {
    return result;
  }
  if (user.role === 'posting') {
    return result.filter((r) => r.actualApproval || r.actualPosting);
  }
  if (user.role === 'payment') {
    return result.filter((r) => r.actualPosting || r.actualPayment);
  }
  if (user.role === 'auditor') {
    return result.filter((r) => r.actualPayment || r.actualAudit);
  }
  return result;
}

export function getAllUsers() {
  const list = USERS.map((u) => ({
    id: u.id,
    username: u.username,
    displayName: u.displayName,
    role: u.role,
    requesterName: u.requesterName,
  }));
  const adminIndex = list.findIndex((u) => u.username === 'admin');
  if (adminIndex > 0) {
    const [adminUser] = list.splice(adminIndex, 1);
    list.unshift(adminUser);
  }
  return list;
}
