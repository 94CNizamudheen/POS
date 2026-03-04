use tauri::Manager;

// ─── Commands ────────────────────────────────────────────────────────────────
// Add your Rust commands here.
// Call from frontend: invoke("command_name", { arg: value })

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello from Rust, {}!", name)
}

// Example with struct return:
// #[tauri::command]
// fn get_something() -> Result<MyStruct, String> { ... }

// ─── Entry point ─────────────────────────────────────────────────────────────

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet
            // add more commands here
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
