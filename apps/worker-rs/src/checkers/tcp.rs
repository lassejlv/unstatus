use std::time::Duration;

use tokio::net::TcpStream;

use crate::types::{CheckResult, WorkerMonitor};

pub async fn check_tcp(monitor: &WorkerMonitor) -> CheckResult {
    let started = std::time::Instant::now();
    let host = monitor.host.as_deref().unwrap_or_default();
    let port = monitor.port.unwrap_or_default() as u16;
    let timeout = Duration::from_secs(monitor.timeout.max(1) as u64);

    let result = tokio::time::timeout(timeout, TcpStream::connect((host, port))).await;
    let latency = started.elapsed().as_millis() as i32;

    match result {
        Ok(Ok(stream)) => {
            drop(stream);
            CheckResult {
                status: "up".to_string(),
                latency,
                status_code: None,
                message: None,
                response_headers: None,
                response_body: None,
            }
        }
        Ok(Err(error)) => CheckResult {
            status: "down".to_string(),
            latency,
            status_code: None,
            message: Some(error.to_string()),
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
