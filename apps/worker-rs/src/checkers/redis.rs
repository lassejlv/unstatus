use std::time::Duration;

use redis::AsyncCommands;
use url::Url;

use crate::types::{CheckResult, WorkerMonitor};

const RETRY_DELAY_MS: u64 = 1_500;

pub async fn check_redis(monitor: &WorkerMonitor) -> CheckResult {
    let first = perform_redis_check(monitor).await;
    if first.status != "down" {
        return first;
    }

    tokio::time::sleep(Duration::from_millis(RETRY_DELAY_MS)).await;
    perform_redis_check(monitor).await
}

async fn perform_redis_check(monitor: &WorkerMonitor) -> CheckResult {
    let started = std::time::Instant::now();
    let Some(url) = monitor.url.as_deref() else {
        return CheckResult {
            status: "down".to_string(),
            latency: 0,
            status_code: None,
            message: Some("No connection URL configured".to_string()),
            response_headers: None,
            response_body: None,
        };
    };

    let timeout = Duration::from_secs(monitor.timeout.max(1) as u64);
    let work = async {
        let client = redis::Client::open(url)?;
        let mut connection = client.get_multiplexed_async_connection().await?;

        if let Some(command_text) = monitor
            .body
            .as_deref()
            .map(str::trim)
            .filter(|value| !value.is_empty())
        {
            let parts = command_text.split_whitespace().collect::<Vec<_>>();
            let mut command = redis::cmd(parts[0]);
            for argument in parts.iter().skip(1) {
                command.arg(argument);
            }
            let _: redis::Value = command.query_async(&mut connection).await?;
        } else {
            let _: String = connection.ping().await?;
        }

        Ok::<(), redis::RedisError>(())
    };

    let latency = started.elapsed().as_millis() as i32;
    match tokio::time::timeout(timeout, work).await {
        Ok(Ok(())) => CheckResult {
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
            message: Some(format_error(&error.to_string(), url)),
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

fn format_error(error: &str, url: &str) -> String {
    error.replace(url, &strip_credentials(url))
}

fn strip_credentials(url: &str) -> String {
    match Url::parse(url) {
        Ok(mut parsed) => {
            if !parsed.username().is_empty() || parsed.password().is_some() {
                let _ = parsed.set_username("***");
                let _ = parsed.set_password(Some("***"));
            }
            parsed.to_string()
        }
        Err(_) => "[invalid url]".to_string(),
    }
}
