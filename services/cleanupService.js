/**
 * Cleanup Service
 * Permanently removes accounts that were soft-deleted more than N days ago,
 * cascading deletion of the user's dependent records (applications,
 * notifications, assessment results, refresh tokens, chat data, employer
 * job postings). Also exposes the shared cascade used by the on-demand and
 * admin-triggered permanent-delete endpoints.
 *
 * Soft-delete (see controllers/userController.js deleteAccount) remains the
 * default for accidental/reversible deletion. This service is the hard-delete
 * path for verified erasure requests.
 */

const User = require('../models/User');
const Application = require('../models/Application');
const Notification = require('../models/Notification');
const AssessmentResult = require('../models/AssessmentResult');
const RefreshToken = require('../models/RefreshToken');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Job = require('../models/Job');

// Default retention window before a soft-deleted account is purged.
const DEFAULT_RETENTION_DAYS = Number(process.env.ACCOUNT_RETENTION_DAYS) || 30;

/**
 * Permanently remove a user and their dependent records.
 * Never removes a document for an admin account.
 *
 * @param {string|object} user  User document or _id of the account to purge.
 * @returns {Promise<{deleted: boolean}>}
 */
const purgeUser = async (user) => {
  const target =
    typeof user === 'string' ? await User.findById(user) : await User.findById(user._id);

  if (!target) return { deleted: false };

  // Safety: never hard-delete an admin account.
  if (target.role === 'admin') {
    throw new Error('Cannot permanently delete an admin account');
  }

  const userId = target._id;

  // Applications both created by (job seeker) and received by (employer) the user.
  await Application.deleteMany({ $or: [{ jobSeeker: userId }, { employer: userId }] });

  // Chat: conversations the user is a participant in, and their messages.
  const conversationIds = await Conversation.find({ participants: userId }).distinct('_id');
  await Message.deleteMany({ $or: [{ conversation: { $in: conversationIds } }, { sender: userId }] });
  await Conversation.deleteMany({ participants: userId });

  // Other recorded per-user data.
  await Notification.deleteMany({ recipient: userId });
  await AssessmentResult.deleteMany({ user: userId });
  await RefreshToken.deleteMany({ userId });

  // Employer job postings: close them so nothing downstream references a
  // removed owner. Jobs are shared resources (applications point at them), so
  // they are soft-closed rather than physically removed.
  await Job.updateMany({ employer: userId }, { isDeleted: true, isActive: false });

  // Finally, remove the account itself.
  await User.deleteOne({ _id: userId });

  return { deleted: true };
};

/**
 * Sweep for accounts that were soft-deleted more than `olderThanDays` ago and
 * hard-delete them. Returns a summary of purged account ids.
 *
 * @param {object} opts
 * @param {number} [opts.olderThanDays]  Retention window in days.
 * @returns {Promise<{purged: string[]}>}
 */
const purgeSoftDeletedAccounts = async ({ olderThanDays = DEFAULT_RETENTION_DAYS } = {}) => {
  const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);

  // Only accounts flagged deleted with a known deletion time before the cutoff.
  const candidates = await User.find({
    isDeleted: true,
    deletedAt: { $ne: null, $lt: cutoff },
  }).select('_id');

  const purged = [];
  for (const user of candidates) {
    try {
      await purgeUser(user);
      purged.push(String(user._id));
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(`[cleanup] Failed to purge account ${user._id}:`, err.message);
    }
  }

  return { purged };
};

/**
 * Start the periodic sweep. Idempotent; safe to call once on server boot.
 * Runs every `intervalHours` (default 24h), plus an initial run shortly after
 * boot so retention is honored promptly on deploy.
 *
 * @param {object} opts
 * @param {number} [opts.intervalHours]
 * @param {number} [opts.initialDelayMs]
 */
const startAccountSweep = ({
  intervalHours = 24,
  initialDelayMs = 60 * 1000,
} = {}) => {
  const run = async () => {
    try {
      const { purged } = await purgeSoftDeletedAccounts();
      if (purged.length > 0) {
        // eslint-disable-next-line no-console
        console.log(`[cleanup] Purged ${purged.length} soft-deleted account(s)`);
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[cleanup] Sweep failed:', err.message);
    }
  };

  const initial = setTimeout(run, initialDelayMs);
  const interval = setInterval(run, intervalHours * 60 * 60 * 1000);

  // Allow the timers to be cleared (e.g. in tests).
  initial.unref?.();
  interval.unref?.();

  return { stop: () => { clearTimeout(initial); clearInterval(interval); } };
};

module.exports = {
  purgeUser,
  purgeSoftDeletedAccounts,
  startAccountSweep,
  DEFAULT_RETENTION_DAYS,
};
