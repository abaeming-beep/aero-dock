//! Keeps the "start at sign-in" entry in step with the setting.
//!
//! The setting is only a record of what the user asked for; the entry in
//! the HKCU Run key is what Windows acts on. The two drift apart: the
//! installer deletes the entry whenever it uninstalls a previous version
//! (anything but an in-app update), and a moved copy leaves it pointing at
//! the old path. So on every start the entry is put back when it is gone
//! or points somewhere else.

use tauri::AppHandle;
use tauri_plugin_autostart::ManagerExt;
use windows::core::PCWSTR;
use windows::Win32::System::Registry::{RegGetValueW, HKEY_CURRENT_USER, RRF_RT_REG_SZ};

use super::util::{from_wide, to_wide};

const RUN_KEY: &str = r"Software\Microsoft\Windows\CurrentVersion\Run";

/// The command line Windows will run for this value, if there is one.
fn run_entry(name: &str) -> Option<String> {
    let key = to_wide(RUN_KEY);
    let value = to_wide(name);
    let mut buf = vec![0u16; 1024];
    let mut len = (buf.len() * 2) as u32;
    let status = unsafe {
        RegGetValueW(
            HKEY_CURRENT_USER,
            PCWSTR(key.as_ptr()),
            PCWSTR(value.as_ptr()),
            RRF_RT_REG_SZ,
            None,
            Some(buf.as_mut_ptr().cast()),
            Some(&mut len),
        )
    };
    status.is_ok().then(|| from_wide(&buf))
}

/// Whether a Run command line starts the given executable.
fn launches(command: &str, exe: &str) -> bool {
    let command = command.trim().trim_start_matches('"');
    command.to_lowercase().starts_with(&exe.to_lowercase())
}

/// Put the entry back if the setting is on and the entry is missing or
/// stale. Only ever adds: turning it off stays with the settings toggle,
/// and an entry disabled in Task Manager stays disabled.
pub fn repair(app: &AppHandle) {
    let Ok(exe) = std::env::current_exe() else {
        return;
    };
    let exe = exe.to_string_lossy();
    let name = &app.package_info().name;
    if run_entry(name).is_some_and(|cmd| launches(&cmd, &exe)) {
        return;
    }
    match app.autolaunch().enable() {
        Ok(()) => log::info!("restored the start-at-sign-in entry"),
        Err(e) => log::warn!("could not restore the start-at-sign-in entry: {e}"),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_quoted_command_with_arguments_matches_its_exe() {
        assert!(launches(
            r#""C:\Users\a\AppData\Local\AB Dock\aero-dock.exe" --minimized"#,
            r"C:\Users\a\AppData\Local\AB Dock\aero-dock.exe"
        ));
    }

    #[test]
    fn a_command_for_another_copy_does_not_match() {
        assert!(!launches(
            r"C:\dev\aero-dock\target\debug\aero-dock.exe",
            r"C:\Users\a\AppData\Local\AB Dock\aero-dock.exe"
        ));
    }
}
