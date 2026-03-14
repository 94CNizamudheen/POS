CREATE TABLE IF NOT EXISTS queue_tokens (
  id text PRIMARY KEY NOT NULL,
  ticket_id text,
  ticket_number text,
  token_number integer NOT NULL,
  status text NOT NULL DEFAULT 'WAITING',
  source text,
  order_mode text,
  created_at text NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  called_at text,
  served_at text
);
