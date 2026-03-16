-- Migrate app_state from key-value rows to a structured single-row table.
-- Drop old key-value table first, then recreate with named columns.
DROP TABLE IF EXISTS app_state;

CREATE TABLE IF NOT EXISTS app_state (
    id INTEGER PRIMARY KEY,

    -- KDS settings
    kds_ws_url TEXT DEFAULT '',
    kds_terminal_id TEXT DEFAULT '',
    kds_display_settings TEXT DEFAULT '{}',
    kds_groups TEXT DEFAULT '[]',

    -- Queue Display settings
    queue_ws_url TEXT DEFAULT '',
    queue_terminal_id TEXT DEFAULT '',

    -- Customer Display settings
    cd_ws_url TEXT DEFAULT '',
    cd_terminal_id TEXT DEFAULT '',
    cd_settings TEXT DEFAULT '{}',

    -- Kiosk settings
    kiosk_pos_url TEXT DEFAULT '',
    kiosk_terminal_id TEXT DEFAULT '',
    kiosk_position TEXT DEFAULT 'DISTANCE',

    -- Device role
    device_role TEXT DEFAULT '',

    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Seed the single always-present row
INSERT OR IGNORE INTO app_state (id) VALUES (1);
