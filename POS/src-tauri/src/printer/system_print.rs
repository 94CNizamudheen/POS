
#[cfg(target_os = "android")]
use std::path::PathBuf;

#[cfg(target_os = "android")]
pub fn launch_print_intent(file_path: PathBuf) -> Result<(), String> {

    use std::process::Command;

    let file_str = file_path
        .to_str()
        .ok_or("Invalid file path")?;

    // CloudCode / Android POS Print Intent
    // This triggers the built-in Print Service
    let uri = format!("file://{}", file_str);

    Command::new("am")
        .args([
            "start",
            "-a",
            "android.intent.action.VIEW",
            "-t",
            "application/octet-stream",
            "-d",
            &uri,
        ])
        .spawn()
        .map_err(|e| format!("Failed to launch Android print intent: {}", e))?;

    Ok(())
}
