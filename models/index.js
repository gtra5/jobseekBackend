/**
 * Model Registry
 * Imports and registers all Mongoose models in a deterministic order so that
 * populate()/ref resolution works regardless of require order elsewhere.
 */

const User = require('./User');
const Job = require('./Job');
const Application = require('./Application');
const Notification = require('./Notification');
const RefreshToken = require('./RefreshToken');
const OTP = require('./OTP');

module.exports = {
  User,
  Job,
  Application,
  Notification,
  RefreshToken,
  OTP,
};
