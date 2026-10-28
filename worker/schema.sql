-- Cloudflare D1 schema for Kargul Workspace.
-- Every row belongs to a user; the API always scopes reads and writes by the
-- session user id.

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'employee', -- employee | manager | admin
  manager_id TEXT,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

CREATE TABLE IF NOT EXISTS profiles (
  user_id TEXT PRIMARY KEY,
  name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  initials TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  job_title TEXT NOT NULL DEFAULT '',
  department TEXT NOT NULL DEFAULT '',
  manager TEXT NOT NULL DEFAULT '',
  location TEXT NOT NULL DEFAULT '',
  start_date TEXT NOT NULL DEFAULT '',
  birthday TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  emergency_contact TEXT NOT NULL DEFAULT '',
  bio TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS user_settings (
  user_id TEXT PRIMARY KEY,
  language TEXT NOT NULL DEFAULT 'zh',
  week_starts_on INTEGER NOT NULL DEFAULT 0,
  time_format TEXT NOT NULL DEFAULT '24h',
  day_start_hour INTEGER NOT NULL DEFAULT 6,
  contract_days REAL NOT NULL DEFAULT 12,
  carryover_days REAL NOT NULL DEFAULT 4,
  show_weekends INTEGER NOT NULL DEFAULT 1,
  email_notifications INTEGER NOT NULL DEFAULT 1,
  push_notifications INTEGER NOT NULL DEFAULT 0,
  weekly_digest INTEGER NOT NULL DEFAULT 1,
  active_workspace_id TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS workspaces (
  id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  PRIMARY KEY (user_id, id)
);
CREATE INDEX IF NOT EXISTS idx_workspaces_user ON workspaces(user_id);

CREATE TABLE IF NOT EXISTS events (
  id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  day TEXT NOT NULL,
  start_min INTEGER NOT NULL DEFAULT 0,
  end_min INTEGER NOT NULL DEFAULT 0,
  all_day INTEGER NOT NULL DEFAULT 0,
  color TEXT NOT NULL DEFAULT 'blue',
  note TEXT,
  location TEXT,
  request_id TEXT,
  created_at TEXT NOT NULL,
  PRIMARY KEY (user_id, id)
);
CREATE INDEX IF NOT EXISTS idx_events_user_day ON events(user_id, day);

CREATE TABLE IF NOT EXISTS leave_requests (
  id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  type TEXT NOT NULL DEFAULT 'Time off',
  duration TEXT NOT NULL DEFAULT '',
  days REAL NOT NULL DEFAULT 0,
  date_from TEXT NOT NULL,
  date_to TEXT NOT NULL,
  all_day INTEGER NOT NULL DEFAULT 1,
  start_min INTEGER,
  end_min INTEGER,
  notes TEXT NOT NULL DEFAULT '',
  submitted_at TEXT NOT NULL,
  PRIMARY KEY (user_id, id)
);
CREATE INDEX IF NOT EXISTS idx_requests_user ON leave_requests(user_id, submitted_at DESC);

CREATE TABLE IF NOT EXISTS holidays (
  id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  day TEXT NOT NULL,
  name TEXT NOT NULL,
  PRIMARY KEY (user_id, id)
);
CREATE INDEX IF NOT EXISTS idx_holidays_user ON holidays(user_id, day);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  read INTEGER NOT NULL DEFAULT 0,
  href TEXT,
  PRIMARY KEY (user_id, id)
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS documents (
  id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'Other',
  size INTEGER NOT NULL DEFAULT 0,
  uploaded_at TEXT NOT NULL,
  data_url TEXT,
  starred INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, id)
);
CREATE INDEX IF NOT EXISTS idx_documents_user ON documents(user_id, uploaded_at DESC);

CREATE TABLE IF NOT EXISTS time_entries (
  id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  day TEXT NOT NULL,
  project TEXT NOT NULL DEFAULT '',
  task TEXT NOT NULL DEFAULT '',
  minutes INTEGER NOT NULL DEFAULT 0,
  billable INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, id)
);
CREATE INDEX IF NOT EXISTS idx_time_entries_user ON time_entries(user_id, day DESC);

CREATE TABLE IF NOT EXISTS timers (
  user_id TEXT PRIMARY KEY,
  running INTEGER NOT NULL DEFAULT 0,
  started_at INTEGER,
  project TEXT NOT NULL DEFAULT '',
  task TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS invoices (
  id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  number TEXT NOT NULL,
  client TEXT NOT NULL DEFAULT '',
  issue_date TEXT NOT NULL,
  due_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  notes TEXT NOT NULL DEFAULT '',
  currency TEXT NOT NULL DEFAULT 'USD',
  PRIMARY KEY (user_id, id)
);
CREATE INDEX IF NOT EXISTS idx_invoices_user ON invoices(user_id, issue_date DESC);

CREATE TABLE IF NOT EXISTS invoice_items (
  id TEXT NOT NULL,
  invoice_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  quantity REAL NOT NULL DEFAULT 0,
  rate REAL NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, id)
);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON invoice_items(user_id, invoice_id);

CREATE TABLE IF NOT EXISTS withdrawal_methods (
  id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'bank',
  label TEXT NOT NULL DEFAULT '',
  holder TEXT NOT NULL DEFAULT '',
  last4 TEXT NOT NULL DEFAULT '',
  currency TEXT NOT NULL DEFAULT 'USD',
  is_default INTEGER NOT NULL DEFAULT 0,
  added_at TEXT NOT NULL,
  PRIMARY KEY (user_id, id)
);
CREATE INDEX IF NOT EXISTS idx_withdrawal_user ON withdrawal_methods(user_id);

CREATE TABLE IF NOT EXISTS benefits (
  id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  provider TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'Health',
  description TEXT NOT NULL DEFAULT '',
  budget REAL NOT NULL DEFAULT 0,
  used REAL NOT NULL DEFAULT 0,
  enrolled INTEGER NOT NULL DEFAULT 0,
  renews_on TEXT NOT NULL DEFAULT '',
  PRIMARY KEY (user_id, id)
);
CREATE INDEX IF NOT EXISTS idx_benefits_user ON benefits(user_id);
