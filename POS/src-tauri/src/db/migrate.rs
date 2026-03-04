use rusqlite::Connection;
use std::{fs, path::PathBuf, sync::Once};
use tauri::{AppHandle, Manager};

include!(concat!(env!("OUT_DIR"), "/migrations_gen.rs"));

static INIT: Once = Once::new();

pub fn db_path(app: &AppHandle) -> PathBuf {
    let dir = app
        .path()
        .app_data_dir()
        .expect("app_data_dir not available");

    fs::create_dir_all(&dir).ok();
    dir.join("local.db")
}

fn open_conn(app: &AppHandle) -> Connection {
    let conn = Connection::open(db_path(app))
        .expect("Failed to open SQLite");

    // Mobile-safe pragmas
    conn.pragma_update(None, "journal_mode", "WAL").ok();
    conn.pragma_update(None, "synchronous", "NORMAL").ok();

    conn
}

/// Clean Drizzle-generated SQL for SQLite compatibility
fn clean_drizzle_sql(sql: &str) -> String {
    sql
        // Remove statement breakpoint comments
        .replace("--> statement-breakpoint", "")
        // Remove backticks (MySQL/Postgres syntax)
        .replace('`', "")
        // Fix CURRENT_TIMESTAMP for SQLite
        .replace("DEFAULT CURRENT_TIMESTAMP", "DEFAULT (strftime('%s', 'now'))")
        .trim()
        .to_string()
}

pub fn run_migrations_once(app: &AppHandle) {
    INIT.call_once(|| {
        let conn = open_conn(app);

        log::info!("📜 Running embedded migrations");

        for (name, sql) in MIGRATIONS {
            log::info!("➡ Applying migration: {}", name);

            // Clean Drizzle SQL for SQLite compatibility
            let cleaned_sql = clean_drizzle_sql(sql);

            for stmt in cleaned_sql.split(';') {
                let stmt = stmt.trim();
                if stmt.is_empty() {
                    continue;
                }

                if let Err(err) = conn.execute(stmt, []) {
                    let msg = err.to_string();

                    if msg.contains("already exists") || msg.contains("duplicate column") {
                        continue;
                    }

                    panic!(
                        "❌ Migration failed: {}\n{}\nSQL:\n{}",
                        name, err, stmt
                    );
                }
            }
        }

        log::info!("✅ All migrations applied");
    });
}

pub fn connection(app: &AppHandle) -> Connection {
    open_conn(app)
}