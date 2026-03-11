use rusqlite::{params, Connection, Result};
use super::printer::Printer;

pub struct PrinterRepo;

impl PrinterRepo {
    pub fn save(conn: &Connection, printer: &Printer) -> Result<()> {
        conn.execute(
            "INSERT OR REPLACE INTO printers
             (id, name, printer_type, ip_address, port, bluetooth_address, paper_width, chars_per_line, is_active, print_templates, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, CURRENT_TIMESTAMP)",
            params![
                printer.id,
                printer.name,
                printer.printer_type,
                printer.ip_address,
                printer.port,
                printer.bluetooth_address,
                printer.paper_width,
                printer.chars_per_line,
                printer.is_active as i32,
                printer.print_templates,
            ],
        )?;
        Ok(())
    }

    pub fn get_all(conn: &Connection) -> Result<Vec<Printer>> {
        let mut stmt = conn.prepare(
            "SELECT id, name, printer_type, ip_address, port, bluetooth_address, paper_width, chars_per_line, is_active, print_templates, created_at, updated_at
             FROM printers
             ORDER BY created_at DESC"
        )?;

        let printers = stmt.query_map([], |row| {
            Ok(Printer {
                id: row.get(0)?,
                name: row.get(1)?,
                printer_type: row.get(2)?,
                ip_address: row.get(3)?,
                port: row.get(4)?,
                bluetooth_address: row.get(5)?,
                paper_width: row.get(6)?,
                chars_per_line: row.get(7)?,
                is_active: row.get::<_, i32>(8)? != 0,
                print_templates: row.get(9)?,
                created_at: row.get(10)?,
                updated_at: row.get(11)?,
            })
        })?;

        printers.collect()
    }

    pub fn get_by_id(conn: &Connection, id: &str) -> Result<Option<Printer>> {
        let mut stmt = conn.prepare(
            "SELECT id, name, printer_type, ip_address, port, bluetooth_address, paper_width, chars_per_line, is_active, print_templates, created_at, updated_at
             FROM printers
             WHERE id = ?1"
        )?;

        let mut rows = stmt.query(params![id])?;

        if let Some(row) = rows.next()? {
            Ok(Some(Printer {
                id: row.get(0)?,
                name: row.get(1)?,
                printer_type: row.get(2)?,
                ip_address: row.get(3)?,
                port: row.get(4)?,
                bluetooth_address: row.get(5)?,
                paper_width: row.get(6)?,
                chars_per_line: row.get(7)?,
                is_active: row.get::<_, i32>(8)? != 0,
                print_templates: row.get(9)?,
                created_at: row.get(10)?,
                updated_at: row.get(11)?,
            }))
        } else {
            Ok(None)
        }
    }

    pub fn get_active(conn: &Connection) -> Result<Vec<Printer>> {
        let mut stmt = conn.prepare(
            "SELECT id, name, printer_type, ip_address, port, bluetooth_address, paper_width, chars_per_line, is_active, print_templates, created_at, updated_at
             FROM printers
             WHERE is_active = 1
             ORDER BY created_at DESC"
        )?;

        let printers = stmt.query_map([], |row| {
            Ok(Printer {
                id: row.get(0)?,
                name: row.get(1)?,
                printer_type: row.get(2)?,
                ip_address: row.get(3)?,
                port: row.get(4)?,
                bluetooth_address: row.get(5)?,
                paper_width: row.get(6)?,
                chars_per_line: row.get(7)?,
                is_active: row.get::<_, i32>(8)? != 0,
                print_templates: row.get(9)?,
                created_at: row.get(10)?,
                updated_at: row.get(11)?,
            })
        })?;

        printers.collect()
    }

    pub fn delete(conn: &Connection, id: &str) -> Result<()> {
        conn.execute("DELETE FROM printers WHERE id = ?1", params![id])?;
        Ok(())
    }

    pub fn set_active(conn: &Connection, id: &str, is_active: bool) -> Result<()> {
        conn.execute(
            "UPDATE printers SET is_active = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
            params![is_active as i32, id],
        )?;
        Ok(())
    }
}
