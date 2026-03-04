use std::{env, fs, path::Path};

fn main() {
    println!("🛠️ build.rs started");

    // Re-run build if migrations change
    println!("cargo:rerun-if-changed=src/db/migrations");

    let out_dir = env::var("OUT_DIR").unwrap();
    println!("📦 OUT_DIR = {}", out_dir);

    let dest_path = Path::new(&out_dir).join("migrations_gen.rs");
    println!("🧬 Generating migrations file at: {:?}", dest_path);

    let migrations_dir = Path::new("src/db/migrations");
    println!("📁 Reading migrations from: {:?}", migrations_dir);

    let mut contents = String::new();
    contents.push_str("pub const MIGRATIONS: &[(&str, &str)] = &[\n");

    if migrations_dir.exists() {
        let mut entries: Vec<_> = fs::read_dir(migrations_dir)
            .expect("Failed to read migrations directory")
            .filter_map(|e| e.ok())
            .collect();

        entries.sort_by_key(|e| e.path());

        for entry in entries {
            let path = entry.path();

            if path.extension().and_then(|s| s.to_str()) == Some("sql") {
                let name = path.file_name().unwrap().to_string_lossy();
                println!("➕ Embedding migration: {}", name);

                let sql = fs::read_to_string(&path).expect("Failed to read migration file");

                contents.push_str(&format!("    (\"{}\", r#\"{}\"#),\n", name, sql));
            }
        }
    } else {
        println!("⚠️ migrations directory NOT found");
    }

    contents.push_str("];\n");

    fs::write(&dest_path, contents).expect("Failed to write migrations_gen.rs");

    println!("✅ migrations_gen.rs written");

    // Platform flags
    println!("cargo::rustc-check-cfg=cfg(mobile)");

    let target = env::var("TARGET").unwrap_or_default();
    println!("🎯 TARGET = {}", target);

    if target.contains("android") || target.contains("ios") {
        println!("📱 Building for MOBILE");
        println!("cargo::rustc-cfg=mobile");
    } else {
        println!("🖥️ Building for DESKTOP");
        println!("cargo::rustc-cfg=desktop");
    }

    tauri_build::build();
}
