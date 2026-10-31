//! Update checks against the GitHub release feed in tauri.conf.json.
//!
//! The dock checks once when it starts, and settings can check on request.
//! Nothing installs until someone presses the button. A portable copy does
//! not update: the feed only carries the installer, which would put a second
//! copy on the machine instead of replacing the one in the folder.

use std::time::Duration;

use parking_lot::Mutex;
use tauri::{AppHandle, State};
use tauri_plugin_updater::{Update, UpdaterExt};

use crate::core::{AeroError, AeroResult};

const CHECK_TIMEOUT: Duration = Duration::from_secs(15);

/// The update the last check found, kept for the install that follows it.
#[derive(Default)]
pub struct PendingUpdate(Mutex<Option<Update>>);

/// Ask the feed for a newer version. Returns its version number, if any.
#[tauri::command]
pub async fn check_for_update(
    app: AppHandle,
    pending: State<'_, PendingUpdate>,
) -> AeroResult<Option<String>> {
    if crate::core::paths::is_portable() {
        return Ok(None);
    }
    let updater = app
        .updater_builder()
        .timeout(CHECK_TIMEOUT)
        // The installer closes the app without running the exit handler, and
        // a hidden taskbar must not be left behind if it then fails.
        .on_before_exit(crate::platform::windows::taskbar::restore_taskbar)
        .build()
        .map_err(|e| AeroError::other(e.to_string()))?;
    let update = updater
        .check()
        .await
        .map_err(|e| AeroError::other(e.to_string()))?;
    let version = update.as_ref().map(|u| u.version.clone());
    *pending.0.lock() = update;
    Ok(version)
}

/// What the last check found, so settings can open with the right button
/// when the dock's startup check already found something.
#[tauri::command]
pub fn pending_update(pending: State<'_, PendingUpdate>) -> Option<String> {
    pending.0.lock().as_ref().map(|u| u.version.clone())
}

/// Download and run the installer. On success the app closes and the
/// installer starts the new version.
#[tauri::command]
pub async fn install_update(pending: State<'_, PendingUpdate>) -> AeroResult<()> {
    let update = pending
        .0
        .lock()
        .clone()
        .ok_or_else(|| AeroError::other("no update to install"))?;
    update
        .download_and_install(|_, _| {}, || {})
        .await
        .map_err(|e| AeroError::other(e.to_string()))
}
