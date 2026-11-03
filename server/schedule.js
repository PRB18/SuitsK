'use strict';
/**
 * schedule.js — Schedule events and universal calendar connector
 * Routes: /api/schedule/* and /api/calendar/*
 *
 * Calendar providers supported:
 *   - Google Calendar (OAuth2 via googleapis)
 *   - Apple Calendar  (iCal .ics export/import)
 *   - Outlook Calendar (iCal .ics export/import via Microsoft Graph or .ics)
 *
 * 2-way sync strategy:
 *   - Push: local events → external calendar (stores cal_event_id)
 *   - Pull: external calendar changes → update local events by cal_event_id
 *   - Conflict: if both changed, respond with conflict payload for frontend to resolve
 *
 * All routes protected by requireUnlocked middleware (mounted in index.js).
 */

const express        = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDb }      = require('./db');
const { validate }   = require('./middleware/validate');
const { idSchema, scheduleEventSchema, scheduleEventUpdateSchema } = require('./middleware/schemas');
const { safeJsonParse } = require('./middleware/safeJson');

const router = express.Router();

function isValidId(id) {
  return idSchema.safeParse(id).success;
}

const EVENT_TYPES  = ['trial', 'delivery', 'client_visit', 'other'];
const EVENT_STATUS = ['scheduled', 'completed', 'cancelled'];
const PROVIDERS    = ['google', 'apple', 'outlook'];

function now() { return new Date().toISOString(); }
function safe(str) { return typeof str === 'string' ? str.trim() : ''; }

// ────────────────────────────────────────────────────────────────────────────
// SCHEDULE EVENTS CRUD
// ────────────────────────────────────────────────────────────────────────────

// GET /api/trial-sheet — recorded client visits and trial/client-visit events
router.get('/trial-sheet', async (req, res) => {
  try {
    const db = getDb();
    const result = await db.execute(`
      SELECT 'visit' AS source, v.id, v.client_id, '' AS project_id, v.order_id,
             'client_visit' AS event_type, v.purpose AS title, '' AS description,
             v.visit_date AS event_date, '' AS event_time, 'completed' AS status,
             v.created_at, c.name AS client_name, c.client_ref, o.order_ref,
             '' AS garment_type
      FROM client_visits v
      JOIN clients c ON c.id = v.client_id
      LEFT JOIN orders o ON o.id = v.order_id

      UNION ALL

      SELECT 'schedule' AS source, e.id,
             COALESCE(NULLIF(e.client_id, ''), p.client_id) AS client_id,
             e.project_id, COALESCE(NULLIF(p.order_id, ''), '') AS order_id,
             e.event_type, e.title, e.description, e.event_date, e.event_time,
             e.status, e.created_at, c.name AS client_name, c.client_ref,
             o.order_ref, p.garment_type
      FROM schedule_events e
      LEFT JOIN projects p ON p.id = e.project_id
      LEFT JOIN clients c ON c.id = COALESCE(NULLIF(e.client_id, ''), p.client_id)
      LEFT JOIN orders o ON o.id = p.order_id
      WHERE e.event_type IN ('trial', 'client_visit') AND e.status != 'cancelled'

      ORDER BY event_date DESC, event_time DESC, created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('[schedule] trial sheet error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/schedule — list events (optional ?month=YYYY-MM or ?client_id=)
router.get('/schedule', async (req, res) => {
  try {
    const db = getDb();
    let sql  = `SELECT e.*, c.name as client_name, c.client_ref
                FROM schedule_events e
                LEFT JOIN clients c ON c.id = e.client_id
                WHERE 1=1`;
    const args = [];

    if (req.query.month) {
      sql += ' AND e.event_date LIKE ?';
      args.push(`${req.query.month}%`);
    }
    if (req.query.client_id) {
      sql += ' AND e.client_id = ?';
      args.push(req.query.client_id);
    }

    sql += ' ORDER BY e.event_date ASC, e.event_time ASC';
    const result = await db.execute({ sql, args });
    res.json(result.rows);
  } catch (err) {
    console.error('[schedule] GET / error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/schedule/upcoming — next 7 days
router.get('/schedule/upcoming', async (req, res) => {
  try {
    const db    = getDb();
    const today = new Date().toISOString().split('T')[0];
    const next7 = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const result = await db.execute({
      sql:  `SELECT e.*, c.name as client_name FROM schedule_events e
             LEFT JOIN clients c ON c.id = e.client_id
             WHERE e.event_date >= ? AND e.event_date <= ? AND e.status = 'scheduled'
             ORDER BY e.event_date ASC`,
      args: [today, next7],
    });
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/schedule — create event
router.post('/schedule', validate(scheduleEventSchema), async (req, res) => {
  const {
    client_id = '', project_id = '', event_type = 'other',
    title, description = '', event_date,
    event_time = '', all_day = 1,
  } = req.body;

  try {
    const db = getDb();
    const id = uuidv4();
    const ts = now();

    await db.execute({
      sql:  `INSERT INTO schedule_events
               (id, client_id, project_id, event_type, title, description,
                event_date, event_time, all_day, status, cal_provider, cal_event_id, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'scheduled', '', '', ?, ?)`,
      args: [id, safe(client_id), safe(project_id), event_type, safe(title), safe(description),
             safe(event_date), safe(event_time), all_day ? 1 : 0, ts, ts],
    });

    res.status(201).json({ id, client_id: safe(client_id), project_id: safe(project_id), event_type, title: safe(title), description: safe(description), event_date: safe(event_date), event_time: safe(event_time), all_day: all_day ? 1 : 0, status: 'scheduled', cal_provider: '', cal_event_id: '', created_at: ts, updated_at: ts });
  } catch (err) {
    console.error('[schedule] POST / error:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/schedule/:id
router.put('/schedule/:id', validate(scheduleEventUpdateSchema), async (req, res) => {
  if (!isValidId(req.params.id)) return res.status(404).json({ error: 'Not found' });
  try {
    const db = getDb();
    const existing = await db.execute({ sql: 'SELECT * FROM schedule_events WHERE id=?', args: [req.params.id] });
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Event not found.' });
    const row = existing.rows[0];
    const { client_id, project_id, event_type, title, description, event_date, event_time, all_day, status } = req.body;

    const ts = now();
    await db.execute({
      sql:  `UPDATE schedule_events SET client_id=?, project_id=?, event_type=?, title=?, description=?,
             event_date=?, event_time=?, all_day=?, status=?, updated_at=? WHERE id=?`,
      args: [
        client_id   !== undefined ? safe(client_id)   : row.client_id,
        project_id  !== undefined ? safe(project_id)  : row.project_id,
        event_type  !== undefined ? event_type         : row.event_type,
        title       !== undefined ? safe(title)        : row.title,
        description !== undefined ? safe(description)  : row.description,
        event_date  !== undefined ? safe(event_date)   : row.event_date,
        event_time  !== undefined ? safe(event_time)   : row.event_time,
        all_day     !== undefined ? (all_day ? 1 : 0)  : row.all_day,
        status      !== undefined ? status              : row.status,
        ts, req.params.id,
      ],
    });

    const updated = await db.execute({ sql: 'SELECT * FROM schedule_events WHERE id=?', args: [req.params.id] });
    res.json(updated.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/schedule/:id
router.delete('/schedule/:id', async (req, res) => {
  if (!isValidId(req.params.id)) return res.status(404).json({ error: 'Not found' });
  try {
    const db = getDb();
    const result = await db.execute({ sql: 'DELETE FROM schedule_events WHERE id=?', args: [req.params.id] });
    if (result.rowsAffected === 0) return res.status(404).json({ error: 'Event not found.' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ────────────────────────────────────────────────────────────────────────────
// CALENDAR CONNECTOR ROUTES  /api/calendar/*
// ────────────────────────────────────────────────────────────────────────────

// GET /api/calendar/status — which providers are connected
router.get('/calendar/status', async (req, res) => {
  try {
    const db = getDb();
    const result = await db.execute('SELECT provider, updated_at FROM calendar_tokens');
    const connected = {};
    for (const row of result.rows) connected[row.provider] = { connected: true, updated_at: row.updated_at };
    res.json({ connected });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/calendar/connect — initiate OAuth or save token
// For Google: returns the OAuth URL to redirect the user to.
// For Apple/Outlook: accepts a .ics subscription URL or access token directly.
router.post('/calendar/connect', async (req, res) => {
  const { provider } = req.body;
  if (!PROVIDERS.includes(provider))
    return res.status(400).json({ error: `provider must be one of: ${PROVIDERS.join(', ')}` });

  if (provider === 'google') {
    // Google OAuth2 — requires GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET + GOOGLE_REDIRECT_URI
    try {
      const { google } = require('googleapis');
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI || `${req.protocol}://${req.get('host')}/api/calendar/callback/google`
      );
      const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        prompt: 'consent',
        scope: ['https://www.googleapis.com/auth/calendar'],
      });
      res.json({ auth_url: authUrl, provider: 'google' });
    } catch (err) {
      // googleapis not installed yet
      res.status(503).json({ error: 'Google Calendar integration requires the googleapis package. Run: npm install googleapis', details: err.message });
    }
  } else {
    // Apple / Outlook: user provides a CalDAV URL or .ics export URL
    const { ics_url, access_token } = req.body;
    if (!ics_url && !access_token)
      return res.status(400).json({ error: `For ${provider}, provide ics_url or access_token.` });
    try {
      const db = getDb();
      const ts = now();
      const tokens = JSON.stringify({ ics_url: ics_url || '', access_token: access_token || '', provider });
      await db.execute({
        sql:  'INSERT OR REPLACE INTO calendar_tokens (provider, tokens, updated_at) VALUES (?, ?, ?)',
        args: [provider, tokens, ts],
      });
      res.json({ ok: true, provider, connected: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
});

// GET /api/calendar/callback/google — OAuth2 callback
router.get('/calendar/callback/google', async (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).send('Missing authorization code.');

  try {
    const { google } = require('googleapis');
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI || `${req.protocol}://${req.get('host')}/api/calendar/callback/google`
    );
    const { tokens } = await oauth2Client.getToken(code);
    const db = getDb();
    const ts = now();
    await db.execute({
      sql:  'INSERT OR REPLACE INTO calendar_tokens (provider, tokens, updated_at) VALUES (?, ?, ?)',
      args: ['google', JSON.stringify(tokens), ts],
    });
    // Close the popup / redirect back to the app
    res.send(`<html><body><script>window.opener?.postMessage({type:'cal_connected',provider:'google'},'*');window.close();</script><p>Google Calendar connected. You can close this tab.</p></body></html>`);
  } catch (err) {
    console.error('[calendar] Google callback error:', err);
    res.status(500).send('Calendar connection failed: ' + err.message);
  }
});

// POST /api/calendar/sync — push local events to connected calendar(s)
router.post('/calendar/sync', async (req, res) => {
  try {
    const db     = getDb();
    const tokens = await db.execute('SELECT * FROM calendar_tokens');
    if (tokens.rows.length === 0)
      return res.status(400).json({ error: 'No calendar connected. Connect a calendar first.' });

    const events = await db.execute(
      `SELECT * FROM schedule_events WHERE status = 'scheduled' ORDER BY event_date ASC`
    );

    const results = { synced: 0, errors: [] };

    for (const tokenRow of tokens.rows) {
      const providerTokens = safeJsonParse(tokenRow.tokens, {});
      if (tokenRow.provider === 'google') {
        await syncToGoogle(db, events.rows, providerTokens, results);
      } else {
        // Apple/Outlook: generate .ics — these are read-only push (no external write API without extra setup)
        results.errors.push({ provider: tokenRow.provider, message: `${tokenRow.provider} sync currently exports .ics only.` });
      }
    }

    res.json({ ok: true, ...results });
  } catch (err) {
    console.error('[calendar] sync error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/calendar/pull — pull changes from connected calendar
router.post('/calendar/pull', async (req, res) => {
  try {
    const db     = getDb();
    const tokens = await db.execute('SELECT * FROM calendar_tokens WHERE provider = ?', ['google']);
    if (tokens.rows.length === 0)
      return res.json({ ok: true, pulled: 0, message: 'No Google Calendar connected.' });

    const providerTokens = safeJsonParse(tokens.rows[0].tokens, {});
    const pulled = await pullFromGoogle(db, providerTokens);
    res.json({ ok: true, ...pulled });
  } catch (err) {
    console.error('[calendar] pull error:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/calendar/disconnect?provider=google
router.delete('/calendar/disconnect', async (req, res) => {
  const { provider } = req.query;
  if (!provider) return res.status(400).json({ error: 'provider query param required.' });
  try {
    const db = getDb();
    await db.execute({ sql: 'DELETE FROM calendar_tokens WHERE provider=?', args: [provider] });
    res.json({ ok: true, provider, disconnected: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/calendar/export.ics — download all scheduled events as .ics file
router.get('/calendar/export.ics', async (req, res) => {
  try {
    const db = getDb();
    const result = await db.execute(
      `SELECT * FROM schedule_events WHERE status = 'scheduled' ORDER BY event_date ASC`
    );
    const ics = buildICS(result.rows);
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="krishna-suits-schedule.ics"');
    res.send(ics);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Google Calendar helpers ───────────────────────────────────────────────────
async function syncToGoogle(db, events, tokens, results) {
  try {
    const { google } = require('googleapis');
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
    oauth2Client.setCredentials(tokens);
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    for (const event of events) {
      const gEvent = buildGoogleEvent(event);
      try {
        if (event.cal_event_id && event.cal_provider === 'google') {
          // Update existing
          await calendar.events.update({ calendarId: 'primary', eventId: event.cal_event_id, requestBody: gEvent });
        } else {
          // Create new
          const created = await calendar.events.insert({ calendarId: 'primary', requestBody: gEvent });
          await db.execute({
            sql:  `UPDATE schedule_events SET cal_provider='google', cal_event_id=?, updated_at=? WHERE id=?`,
            args: [created.data.id, now(), event.id],
          });
        }
        results.synced++;
      } catch (e) {
        results.errors.push({ event_id: event.id, message: e.message });
      }
    }

    // Refresh tokens if needed
    const newTokens = oauth2Client.credentials;
    if (newTokens.access_token !== tokens.access_token) {
      await db.execute({
        sql:  'UPDATE calendar_tokens SET tokens=?, updated_at=? WHERE provider=?',
        args: [JSON.stringify(newTokens), now(), 'google'],
      });
    }
  } catch (err) {
    results.errors.push({ provider: 'google', message: err.message });
  }
}

async function pullFromGoogle(db, tokens) {
  const result = { pulled: 0, conflicts: [], errors: [] };
  try {
    const { google } = require('googleapis');
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
    oauth2Client.setCredentials(tokens);
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const gEvents = await calendar.events.list({
      calendarId: 'primary', timeMin: since, singleEvents: true, orderBy: 'updated',
    });

    for (const gEv of (gEvents.data.items || [])) {
      const localResult = await db.execute({
        sql: 'SELECT * FROM schedule_events WHERE cal_event_id=? AND cal_provider=?',
        args: [gEv.id, 'google'],
      });

      if (localResult.rows.length === 0) continue; // Unknown event, skip

      const local = localResult.rows[0];
      const gDate = gEv.start?.date || gEv.start?.dateTime?.split('T')[0] || '';
      const gTitle = gEv.summary || local.title;

      // Conflict detection: both changed after last sync
      const localUpdated = new Date(local.updated_at).getTime();
      const gUpdated     = new Date(gEv.updated).getTime();

      if (Math.abs(localUpdated - gUpdated) > 60000) {
        // Both differ — flag as conflict for frontend
        result.conflicts.push({
          local_event_id: local.id,
          google_event_id: gEv.id,
          local: { title: local.title, event_date: local.event_date },
          remote: { title: gTitle, event_date: gDate },
        });
      } else {
        // Remote is source of truth — update local
        await db.execute({
          sql:  'UPDATE schedule_events SET title=?, event_date=?, updated_at=? WHERE id=?',
          args: [gTitle, gDate, now(), local.id],
        });
        result.pulled++;
      }
    }
  } catch (err) {
    result.errors.push({ provider: 'google', message: err.message });
  }
  return result;
}

function buildGoogleEvent(event) {
  const startDate = event.event_date;
  return {
    summary:     event.title,
    description: event.description || '',
    start: event.all_day ? { date: startDate } : { dateTime: `${startDate}T${event.event_time || '09:00'}:00`, timeZone: 'Asia/Kolkata' },
    end:   event.all_day ? { date: startDate } : { dateTime: `${startDate}T${event.event_time || '10:00'}:00`, timeZone: 'Asia/Kolkata' },
    extendedProperties: { private: { krishna_event_id: event.id } },
  };
}

function buildICS(events) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Krishna Suits Custom//Schedule//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];
  for (const ev of events) {
    const dtStamp = now().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const dtStart = ev.event_date.replace(/-/g, '');
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${ev.id}@krishna-suits`);
    lines.push(`DTSTAMP:${dtStamp}`);
    lines.push(`DTSTART;VALUE=DATE:${dtStart}`);
    lines.push(`DTEND;VALUE=DATE:${dtStart}`);
    lines.push(`SUMMARY:${ev.title}`);
    if (ev.description) lines.push(`DESCRIPTION:${ev.description.replace(/\n/g, '\\n')}`);
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

module.exports = router;
