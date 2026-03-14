CREATE TABLE IF NOT EXISTS kds_tickets (
  id text PRIMARY KEY NOT NULL,
  ticket_number text NOT NULL,
  order_id text,
  order_mode_name text,
  status text NOT NULL DEFAULT 'PENDING',
  items text NOT NULL,
  total_amount integer,
  token_number integer,
  created_at text NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at text NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
