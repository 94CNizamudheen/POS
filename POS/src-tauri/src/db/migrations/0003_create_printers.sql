CREATE TABLE IF NOT EXISTS printers (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    printer_type TEXT NOT NULL,
    ip_address TEXT,
    port INTEGER,
    bluetooth_address TEXT,
    paper_width TEXT,
    chars_per_line INTEGER,
    is_active INTEGER NOT NULL DEFAULT 1,
    print_templates TEXT,
    created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    updated_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
