/**
 * Column mapper — translates raw CSV/Excel header names to normalized field names.
 *
 * Strategy:
 *  - Case-insensitive matching with trimmed, collapsed whitespace
 *  - First matching alias wins (columns appearing earlier take precedence)
 *  - Unrecognized columns on recipient uploads go into `_extra` (→ metadata)
 *  - Unrecognized columns on sender uploads are silently ignored (logged)
 */

// ─── Alias tables ─────────────────────────────────────────────────────────────

const SENDER_ALIASES = {
  email: [
    'email', 'e-mail', 'email address', 'e-mail address',
    'from email', 'from', 'sender email', 'sender',
    'from_email', 'sender_email',
  ],
  name: [
    'name', 'sender name', 'from name', 'display name',
    'full name', 'sender_name', 'from_name', 'display_name',
  ],
  reply_to: [
    'reply_to', 'reply to', 'replyto', 'reply-to',
    'reply to email', 'reply_to_email',
  ],
};

const RECIPIENT_ALIASES = {
  email: [
    'email', 'e-mail', 'email address', 'e-mail address',
    'recipient email', 'contact email', 'email_address',
    'recipient_email',
  ],
  name: [
    'name', 'full name', 'recipient name', 'contact name',
    'full_name', 'recipient_name', 'contact_name',
  ],
  tags: [
    'tags', 'tag', 'segments', 'segment',
    'lists', 'list', 'groups', 'group',
    'categories', 'category',
  ],
};

// ─── Build reverse lookup maps ────────────────────────────────────────────────

function normalize(header) {
  return String(header)
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');        // collapse multiple spaces
}

function buildReverseMap(aliases) {
  const map = new Map();
  for (const [field, headers] of Object.entries(aliases)) {
    for (const h of headers) {
      const key = normalize(h);
      if (!map.has(key)) map.set(key, field); // first definition wins
    }
  }
  return map;
}

const SENDER_MAP    = buildReverseMap(SENDER_ALIASES);
const RECIPIENT_MAP = buildReverseMap(RECIPIENT_ALIASES);

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Map raw rows (from XLSX) to normalized field names.
 *
 * @param {object[]} rawRows   Array of plain objects from XLSX.utils.sheet_to_json
 * @param {'senders'|'recipients'} type
 * @returns {{ mappedRows: object[], unmappedHeaders: string[] }}
 */
function mapColumns(rawRows, type) {
  if (!rawRows || rawRows.length === 0) {
    return { mappedRows: [], unmappedHeaders: [] };
  }

  const reverseMap = type === 'senders' ? SENDER_MAP : RECIPIENT_MAP;

  // Collect all unique raw headers (preserve order from first row)
  const rawHeaders = Object.keys(rawRows[0]);

  // Determine which headers are unmapped
  const unmappedHeaders = rawHeaders.filter(h => !reverseMap.has(normalize(h)));

  // Map every row
  const mappedRows = rawRows.map(row => {
    const mapped  = {};
    const extra   = {};
    const seen    = new Set(); // track which normalized fields we've already assigned

    for (const rawHeader of rawHeaders) {
      const normHeader = normalize(rawHeader);
      const field      = reverseMap.get(normHeader);
      const rawValue   = row[rawHeader];

      if (field) {
        // Known field — first column occurrence wins
        if (!seen.has(field)) {
          mapped[field] = rawValue;
          seen.add(field);
        }
      } else {
        // Unknown column — collect for metadata (recipients only)
        extra[rawHeader] = rawValue;
      }
    }

    if (Object.keys(extra).length > 0) {
      mapped._extra = extra;
    }

    return mapped;
  });

  return { mappedRows, unmappedHeaders };
}

module.exports = { mapColumns };
