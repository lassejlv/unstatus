use std::io::ErrorKind;
use std::time::Duration;

use tokio::net::TcpStream;
use tokio::time::{sleep, timeout};

use crate::models::{CheckResult, WorkerMonitorRow};

const RETRY_DELAY_MS: u64 = 1_500;

pub async fn check_ping(monitor: &WorkerMonitorRow) -> anyhow::Result<CheckResult> {
    let first = perform_ping(monitor).await;
    if first.status != "down" {
        return Ok(first);
    }

    sleep(Duration::from_millis(RETRY_DELAY_MS)).await;
    Ok(perform_ping(monitor).await)
}

async fn perform_ping(monitor: &WorkerMonitorRow) -> CheckResult {
    let Some(host) = normalize_host(monitor) else {
        return CheckResult {
            status: "down".to_string(),
            latency: 0,
            status_code: None,
            message: Some("No host configured".to_string()),
            response_headers: None,
            response_body: None,
        };
    };

    let timeout_duration = Duration::from_secs(monitor.timeout.max(1) as u64);
    let first_attempt = connect_host(&host, 443, timeout_duration).await;
    if first_attempt.status == "up" {
        return first_attempt;
    }

    if matches!(
        first_attempt.message.as_deref(),
        Some("Host refused connection")
    ) {
        let second_attempt = connect_host(&host, 80, timeout_duration).await;
        if second_attempt.status == "up" {
            return second_attempt;
        }
    }

    first_attempt
}

async fn connect_host(host: &str, port: u16, timeout_duration: Duration) -> CheckResult {
    let start = std::time::Instant::now();
    let result = timeout(timeout_duration, TcpStream::connect((host, port))).await;
    let latency = start.elapsed().as_millis() as i32;

    match result {
        Ok(Ok(_)) => CheckResult {
            status: "up".to_string(),
            latency,
            status_code: None,
            message: None,
            response_headers: None,
            response_body: None,
        },
        Ok(Err(error)) => CheckResult {
            status: "down".to_string(),
            latency,
            status_code: None,
            message: Some(format_ping_error(&error)),
            response_headers: None,
            response_body: None,
        },
        Err(_) => CheckResult {
            status: "down".to_string(),
            latency,
            status_code: None,
            message: Some("Connection timed out".to_string()),
            response_headers: None,
            response_body: None,
        },
    }
}

fn normalize_host(monitor: &WorkerMonitorRow) -> Option<String> {
    let raw = monitor
        .host
        .clone()
        .or_else(|| monitor.url.clone())
        .unwrap_or_default();

    let stripped = raw
        .trim()
        .trim_start_matches("http://")
        .trim_start_matches("https://");
    let host = stripped
        .split('/')
        .next()
        .unwrap_or("")
        .split(':')
        .next()
        .unwrap_or("");
    (!host.is_empty()).then(|| host.to_string())
}

fn format_ping_error(error: &std::io::Error) -> String {
    match error.kind() {
        ErrorKind::NotFound => "DNS resolution failed".to_string(),
        ErrorKind::ConnectionRefused => "Host refused connection".to_string(),
        ErrorKind::TimedOut => "Connection timed out".to_string(),
        ErrorKind::AddrNotAvailable => "Host unreachable".to_string(),
        ErrorKind::NetworkUnreachable => "Network unreachable".to_string(),
        _ => error.to_string(),
    }
}

#[cfg(test)]
mod tests {
    use crate::models::WorkerMonitorRow;

    use super::normalize_host;

    #[test]
    fn normalize_host_strips_scheme_and_path() {
        let monitor = WorkerMonitorRow {
            id: "monitor_1".to_string(),
            organization_id: "org_1".to_string(),
            name: "API".to_string(),
            monitor_type: "ping".to_string(),
            interval: 60,
            timeout: 10,
            url: Some("https://example.com/status?x=1".to_string()),
            method: None,
            headers: None,
            body: None,
            host: None,
            port: None,
            rules: None,
            regions: serde_json::json!(["eu"]),
            auto_incidents: false,
            last_checked_at: None,
            next_check_at: None,
        };

        assert_eq!(normalize_host(&monitor).as_deref(), Some("example.com"));
    }
}
