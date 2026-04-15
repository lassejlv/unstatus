use std::io::ErrorKind;
use std::time::Duration;

use tokio::net::TcpStream;
use url::Url;

use crate::types::{CheckResult, WorkerMonitor};

const RETRY_DELAY_MS: u64 = 1_500;

pub async fn check_ping(monitor: &WorkerMonitor) -> CheckResult {
    let first = perform_ping(monitor).await;
    if first.status != "down" {
        return first;
    }

    tokio::time::sleep(Duration::from_millis(RETRY_DELAY_MS)).await;
    perform_ping(monitor).await
}

async fn perform_ping(monitor: &WorkerMonitor) -> CheckResult {
    let started = std::time::Instant::now();
    let Some(host) = extract_host(monitor) else {
        return CheckResult {
            status: "down".to_string(),
            latency: 0,
            status_code: None,
            message: Some("No host configured".to_string()),
            response_headers: None,
            response_body: None,
        };
    };

    let timeout = Duration::from_secs(monitor.timeout.max(1) as u64);
    let primary = connect_with_timeout(&host, 443, timeout).await;
    let latency = started.elapsed().as_millis() as i32;

    match primary {
        Ok(()) => ok_latency(latency),
        Err(ErrorKind::ConnectionRefused) => match connect_with_timeout(&host, 80, timeout).await {
            Ok(()) => ok_latency(latency),
            Err(kind) => down_latency(latency, format_ping_error(kind)),
        },
        Err(kind) => down_latency(latency, format_ping_error(kind)),
    }
}

async fn connect_with_timeout(host: &str, port: u16, timeout: Duration) -> Result<(), ErrorKind> {
    match tokio::time::timeout(timeout, TcpStream::connect((host, port))).await {
        Ok(Ok(stream)) => {
            drop(stream);
            Ok(())
        }
        Ok(Err(error)) => Err(error.kind()),
        Err(_) => Err(ErrorKind::TimedOut),
    }
}

fn extract_host(monitor: &WorkerMonitor) -> Option<String> {
    if let Some(host) = monitor.host.as_deref() {
        let trimmed = host.trim();
        if !trimmed.is_empty() {
            return Some(trimmed.to_string());
        }
    }

    monitor.url.as_deref().and_then(|raw| {
        Url::parse(raw)
            .ok()
            .and_then(|parsed| parsed.host_str().map(ToOwned::to_owned))
            .or_else(|| {
                Some(
                    raw.replace("http://", "")
                        .replace("https://", "")
                        .split('/')
                        .next()?
                        .to_string(),
                )
            })
    })
}

fn ok_latency(latency: i32) -> CheckResult {
    CheckResult {
        status: "up".to_string(),
        latency,
        status_code: None,
        message: None,
        response_headers: None,
        response_body: None,
    }
}

fn down_latency(latency: i32, message: String) -> CheckResult {
    CheckResult {
        status: "down".to_string(),
        latency,
        status_code: None,
        message: Some(message),
        response_headers: None,
        response_body: None,
    }
}

fn format_ping_error(kind: ErrorKind) -> String {
    match kind {
        ErrorKind::NotFound => "DNS resolution failed".to_string(),
        ErrorKind::ConnectionRefused => "Host refused connection".to_string(),
        ErrorKind::TimedOut => "Connection timed out".to_string(),
        ErrorKind::AddrNotAvailable => "Host unreachable".to_string(),
        other => other.to_string(),
    }
}
