/**
 * Minimal structured logger.
 * Writes JSON lines to stdout; in production swap for Winston/Pino.
 */

const isDev = process.env.NODE_ENV !== 'production';

function log(level, ...args) {
  const entry = {
    ts: new Date().toISOString(),
    level,
    msg: args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' '),
  };

  if (isDev) {
    const prefix = { info: '  ℹ', warn: '  ⚠', error: '  ✖', debug: '  ·' }[level] || '  ·';
    console.log(`${prefix} [${entry.ts}] ${entry.msg}`);
  } else {
    process.stdout.write(JSON.stringify(entry) + '\n');
  }
}

module.exports = {
  info:  (...a) => log('info',  ...a),
  warn:  (...a) => log('warn',  ...a),
  error: (...a) => log('error', ...a),
  debug: (...a) => log('debug', ...a),
};
