CREATE TABLE IF NOT EXISTS kds_stations (
  id text PRIMARY KEY NOT NULL,
  name text NOT NULL,
  is_master integer NOT NULL DEFAULT 0,
  group_ids text NOT NULL DEFAULT '[]',
  sort_order integer NOT NULL DEFAULT 0,
  active integer NOT NULL DEFAULT 1,
  created_at text NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at text NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
