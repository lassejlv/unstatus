use std::collections::HashMap;
use std::time::Duration;

use reqwest::header::{ACCEPT, HeaderMap, HeaderName, HeaderValue, USER_AGENT};
use tokio::time::sleep;

use crate::models::{CheckResult, RESPONSE_BODY_LIMIT, Rule, WorkerMonitorRow};

const DEFAULT_USER_AGENT: &str = "Unstatus/1.0 (https://unstatus.app; monitor)";
const RETRY_DELAY_MS: u64 = 1_500;

pub async fn check_http(
    client: &reqwest::Client,
    monitor: &WorkerMonitorRow,
) -> anyhow::Result<CheckResult> {
    let first = perform_http_check(client, monitor).await;
    if first.status != "down" {
        return Ok(first);
    }

    sleep(Duration::from_millis(RETRY_DELAY_MS)).await;
    Ok(perform_http_check(client, monitor).await)
}

async fn perform_http_check(client: &reqwest::Client, monitor: &WorkerMonitorRow) -> CheckResult {
    let start = std::time::Instant::now();
    let mut headers = HeaderMap::new();
    headers.insert(USER_AGENT, HeaderValue::from_static(DEFAULT_USER_AGENT));
    headers.insert(ACCEPT, HeaderValue::from_static("*/*"));

    if let Some(user_headers) = monitor
        .headers
        .as_ref()
        .and_then(|value| serde_json::from_value::<HashMap<String, String>>(value.clone()).ok())
    {
        for (key, value) in user_headers {
            if let (Ok(name), Ok(value)) = (
                HeaderName::try_from(key.as_str()),
                HeaderValue::try_from(value.as_str()),
            ) {
                headers.insert(name, value);
            }
        }
    }

    let method = monitor.method.as_deref().unwrap_or("GET");
    let Some(url) = monitor.url.as_deref() else {
        return CheckResult {
            status: "down".to_string(),
            latency: 0,
            status_code: None,
            message: Some("No URL configured".to_string()),
            response_headers: None,
            response_body: None,
        };
    };

    let mut request = client
        .request(method.parse().unwrap_or(reqwest::Method::GET), url)
        .headers(headers)
        .timeout(Duration::from_secs(monitor.timeout.max(1) as u64));

    if method != "GET" {
        if let Some(body) = monitor.body.clone() {
            request = request.body(body);
        }
    }

    match request.send().await {
        Ok(response) => {
            let latency = start.elapsed().as_millis() as i32;
            let status_code = response.status().as_u16() as i32;
            let passed = evaluate_rules(
                monitor
                    .rules
                    .as_ref()
                    .and_then(|value| serde_json::from_value::<Vec<Rule>>(value.clone()).ok())
                    .unwrap_or_default()
                    .as_slice(),
                &response,
            );

            let mut response_headers = HashMap::new();
            for (name, value) in response.headers() {
                if let Ok(value) = value.to_str() {
                    response_headers.insert(name.to_string(), value.to_string());
                }
            }

            let response_body = response
                .text()
                .await
                .ok()
                .map(|body| truncate_body(body, RESPONSE_BODY_LIMIT));

            CheckResult {
                status: if passed { "up" } else { "degraded" }.to_string(),
                latency,
                status_code: Some(status_code),
                message: (!passed).then(|| format!("Rule check failed (HTTP {status_code})")),
                response_headers: Some(serde_json::to_value(response_headers).unwrap_or_default()),
                response_body,
            }
        }
        Err(error) => CheckResult {
            status: "down".to_string(),
            latency: start.elapsed().as_millis() as i32,
            status_code: None,
            message: Some(format_http_error(&error)),
            response_headers: None,
            response_body: None,
        },
    }
}

fn evaluate_rules(rules: &[Rule], response: &reqwest::Response) -> bool {
    if rules.is_empty() {
        return response.status().is_success();
    }

    rules.iter().all(|rule| match rule.r#type.as_str() {
        "status" => compare(
            response.status().as_u16().to_string().as_str(),
            &rule.operator,
            &rule.value,
        ),
        "header" => {
            let (header_name, expected) = rule.value.split_once(':').unwrap_or((&rule.value, ""));
            let actual = response
                .headers()
                .get(header_name.trim())
                .and_then(|value| value.to_str().ok())
                .unwrap_or("");

            compare(actual, &rule.operator, expected.trim())
        }
        _ => true,
    })
}

fn compare(actual: &str, operator: &str, expected: &str) -> bool {
    match operator {
        "eq" => actual == expected,
        "neq" => actual != expected,
        "contains" => actual.contains(expected),
        _ => actual == expected,
    }
}

fn format_http_error(error: &reqwest::Error) -> String {
    let message = error.to_string();

    if error.is_timeout() || message.contains("timed out") {
        return "Request timed out".to_string();
    }

    if message.contains("dns") || message.contains("failed to lookup address information") {
        return "DNS resolution failed".to_string();
    }

    if message.contains("Connection refused") || message.contains("connection refused") {
        return "Connection refused".to_string();
    }

    if message.contains("Connection reset") || message.contains("connection reset") {
        return "Connection reset".to_string();
    }

    if message.contains("certificate") || message.contains("tls") || message.contains("TLS") {
        return format!("TLS/SSL error: {message}");
    }

    if message.contains("Host unreachable") || message.contains("host is unreachable") {
        return "Host unreachable".to_string();
    }

    message
}

fn truncate_body(body: String, max_len: usize) -> String {
    if body.len() <= max_len {
        return body;
    }

    body.chars().take(max_len).collect()
}

#[cfg(test)]
mod tests {
    use super::{Rule, compare};

    #[test]
    fn compare_supports_known_operators() {
        assert!(compare("200", "eq", "200"));
        assert!(compare("200", "neq", "500"));
        assert!(compare("text/plain", "contains", "plain"));
        assert!(!compare("200", "eq", "201"));
    }

    #[test]
    fn rule_deserializes() {
        let rule = serde_json::from_value::<Rule>(serde_json::json!({
            "type": "status",
            "operator": "eq",
            "value": "200"
        }))
        .unwrap();

        assert_eq!(rule.r#type, "status");
    }
}
