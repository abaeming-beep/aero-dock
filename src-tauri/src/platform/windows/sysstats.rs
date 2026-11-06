//! CPU and memory for the system stats widget.
//!
//! CPU load is not a number Windows hands out; it is a ratio between two
//! samples of how much time the machine spent idle. The previous sample
//! is kept here so each call reports the load since the last one, which
//! is what a widget polling on an interval actually wants.

use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::OnceLock;

use serde::Serialize;
use windows::Win32::Foundation::{CloseHandle, FILETIME, HANDLE};
use windows::Win32::Security::Authentication::Identity::{
    LsaFreeReturnBuffer, LsaGetLogonSessionData, SECURITY_LOGON_SESSION_DATA,
};
use windows::Win32::Security::{
    GetTokenInformation, TokenStatistics, TOKEN_QUERY, TOKEN_STATISTICS,
};
use windows::Win32::System::SystemInformation::{
    GetSystemTimeAsFileTime, GetTickCount64, GlobalMemoryStatusEx, MEMORYSTATUSEX,
};
use windows::Win32::System::Threading::{GetCurrentProcess, GetSystemTimes, OpenProcessToken};

#[derive(Debug, Clone, Copy, Serialize, Default, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct SystemLoad {
    /// 0..=100, averaged over the gap since the previous reading.
    pub cpu_percent: u8,
    /// 0..=100 of physical memory in use.
    pub memory_percent: u8,
    pub memory_used_mb: u64,
    pub memory_total_mb: u64,
    /// Seconds since this Windows sign-in started (see `sign_in_time`).
    pub uptime_seconds: u64,
}

/// The previous CPU sample, packed so it can live in atomics rather than
/// a lock: reading stats must never block the UI thread.
static LAST_IDLE: AtomicU64 = AtomicU64::new(0);
static LAST_BUSY: AtomicU64 = AtomicU64::new(0);

fn filetime_to_u64(ft: FILETIME) -> u64 {
    ((ft.dwHighDateTime as u64) << 32) | ft.dwLowDateTime as u64
}

/// Load since the previous call. The first call after start has no
/// previous sample, so it reports zero rather than a made-up figure.
pub fn read() -> SystemLoad {
    let mut out = SystemLoad::default();

    unsafe {
        let mut idle = FILETIME::default();
        let mut kernel = FILETIME::default();
        let mut user = FILETIME::default();
        if GetSystemTimes(Some(&mut idle), Some(&mut kernel), Some(&mut user)).is_ok() {
            let idle_t = filetime_to_u64(idle);
            // kernel time includes idle time, so busy is everything minus idle
            let total = filetime_to_u64(kernel) + filetime_to_u64(user);
            let busy_t = total.saturating_sub(idle_t);

            let prev_idle = LAST_IDLE.swap(idle_t, Ordering::Relaxed);
            let prev_busy = LAST_BUSY.swap(busy_t, Ordering::Relaxed);

            if prev_idle != 0 || prev_busy != 0 {
                let d_idle = idle_t.saturating_sub(prev_idle);
                let d_busy = busy_t.saturating_sub(prev_busy);
                if let Some(pct) = (d_busy * 100).checked_div(d_idle + d_busy) {
                    out.cpu_percent = pct.min(100) as u8;
                }
            }
        }

        let mut mem = MEMORYSTATUSEX {
            dwLength: std::mem::size_of::<MEMORYSTATUSEX>() as u32,
            ..Default::default()
        };
        if GlobalMemoryStatusEx(&mut mem).is_ok() {
            out.memory_percent = mem.dwMemoryLoad.min(100) as u8;
            out.memory_total_mb = mem.ullTotalPhys / (1024 * 1024);
            out.memory_used_mb =
                (mem.ullTotalPhys.saturating_sub(mem.ullAvailPhys)) / (1024 * 1024);
        }

        out.uptime_seconds = match *SIGN_IN_TIME.get_or_init(sign_in_time) {
            Some(start) => {
                let now = GetSystemTimeAsFileTime();
                filetime_to_u64(now).saturating_sub(start) / 10_000_000
            }
            None => GetTickCount64() / 1000,
        };
    }

    out
}

/// Sign-in time, as FILETIME ticks. Fixed for the life of the process,
/// since the dock runs inside one sign-in.
static SIGN_IN_TIME: OnceLock<Option<u64>> = OnceLock::new();

/// When the current Windows sign-in started.
///
/// This stands in for "since the PC was turned on". Windows' own uptime
/// does not reset on shutdown while Fast Startup is on, because shutdown
/// then hibernates the kernel, but it does sign the user out.
fn sign_in_time() -> Option<u64> {
    unsafe {
        let mut token = HANDLE::default();
        OpenProcessToken(GetCurrentProcess(), TOKEN_QUERY, &mut token).ok()?;
        let mut stats = TOKEN_STATISTICS::default();
        let mut len = 0u32;
        let read = GetTokenInformation(
            token,
            TokenStatistics,
            Some((&mut stats as *mut TOKEN_STATISTICS).cast()),
            std::mem::size_of::<TOKEN_STATISTICS>() as u32,
            &mut len,
        );
        let _ = CloseHandle(token);
        read.ok()?;

        let mut data: *mut SECURITY_LOGON_SESSION_DATA = std::ptr::null_mut();
        if LsaGetLogonSessionData(&stats.AuthenticationId, &mut data).is_err() || data.is_null() {
            return None;
        }
        let logon = (*data).LogonTime;
        let _ = LsaFreeReturnBuffer(data.cast());
        (logon > 0).then_some(logon as u64)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn reported_numbers_stay_inside_their_ranges() {
        // first call primes the CPU baseline
        let _ = read();
        std::thread::sleep(std::time::Duration::from_millis(120));
        let s = read();
        assert!(s.cpu_percent <= 100, "cpu {}", s.cpu_percent);
        assert!(s.memory_percent <= 100, "mem {}", s.memory_percent);
        assert!(s.memory_total_mb > 0, "a machine has some memory");
        assert!(
            s.memory_used_mb <= s.memory_total_mb,
            "used {} of {}",
            s.memory_used_mb,
            s.memory_total_mb
        );
    }

    #[test]
    fn uptime_moves_forward() {
        let a = read().uptime_seconds;
        assert!(a > 0, "the machine has been up for some time");
    }

    #[test]
    fn uptime_counts_from_sign_in_not_from_boot() {
        assert!(sign_in_time().is_some(), "a test run has a sign-in session");
        let since_sign_in = read().uptime_seconds;
        let since_boot = unsafe { GetTickCount64() } / 1000;
        // sign-in can only come after boot; a little slack for rounding
        assert!(since_sign_in <= since_boot + 1, "{since_sign_in} > {since_boot}");
    }
}
