use std::io::ErrorKind;
use std::time::Duration;

use tokio::net::TcpStream;
use tokio::time::timeout;

use crate::models::{CheckResult, WorkerMonitorRow};

pub async fn check_tcp(monitor: &WorkerMonitorRow) -> anyhow::Result<CheckResult> {
    let start = std::time::Instant::now();
    let Some(host) = monitor.host.as_deref() else {
        return Ok(CheckResult {
            status: "down".to_string(),
            latency: 0,
            status_code: None,
            message: Some("No host configured".to_string()),
            response_headers: None,
            response_body: None,
        });
    };
    let Some(port) = monitor.port else {
        return Ok(CheckResult {
            status: "down".to_string(),
            latency: 0,
            status_code: None,
            message: Some("No port configured".to_string()),
            response_headers: None,
            response_body: None,
        });
    };

    let connect = timeout(
        Duration::from_secs(monitor.timeout.max(1) as u64),
        TcpStream::connect((host, port as u16)),
    )
    .await;

    let latency = start.elapsed().as_millis() as i32;

    Ok(match connect {
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
            message: Some(format_tcp_error(&error)),
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
    })
}

fn format_tcp_error(error: &std::io::Error) -> String {
    match error.kind() {
        ErrorKind::ConnectionRefused => "Connection refused".to_string(),
        ErrorKind::ConnectionReset => "Connection reset".to_string(),
        ErrorKind::TimedOut => "Connection timed out".to_string(),
        ErrorKind::NotFound => "DNS resolution failed".to_string(),
        ErrorKind::AddrNotAvailable => "Host unreachable".to_string(),
        _ => error.to_string(),
    }
}
