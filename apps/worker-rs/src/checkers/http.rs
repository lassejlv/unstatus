use std::collections::HashMap;
use std::time::Duration;

use serde::Deserialize;
use serde_json::Value;
use tracing::debug;

use crate::types::{CheckResult, WorkerMonitor, json_object};

const DEFAULT_USER_AGENT: &str = "Unstatus/1.0 (https://unstatus.app; monitor)";
const RETRY_DELAY_MS: u64 = 1_500;

#[derive(Debug, Clone, Deserialize)]
struct Rule {
    #[serde(rename = "type")]
    kind: String,
    operator: String,
    value: String,
}

pub async fn check_http(client: &reqwest::Client, monitor: &WorkerMonitor) -> CheckResult {
    let first = perform_http_check(client, monitor).await;
    if first.status != "down" {
        return first;
    }

    tokio::time::sleep(Duration::from_millis(RETRY_DELAY_MS)).await;
    perform_http_check(client, monitor).await
}

async fn perform_http_check(client: &reqwest::Client, monitor: &WorkerMonitor) -> CheckResult {
    let started = std::time::Instant::now();
    let mut headers = HashMap::from([
        ("User-Agent".to_string(), DEFAULT_USER_AGENT.to_string()),
        ("Accept".to_string(), "*/*".to_string()),
    ]);
    headers.extend(json_object(monitor.headers.as_ref()));

    let method = monitor.method.as_deref().unwrap_or("GET");
    let request_method =
        reqwest::Method::from_bytes(method.as_bytes()).unwrap_or(reqwest::Method::GET);
    let timeout = Duration::from_secs(monitor.timeout.max(1) as u64);

    let mut request = client
        .request(
            request_method.clone(),
            monitor.url.as_deref().unwrap_or_default(),
        )
        .timeout(timeout);

    for (name, value) in &headers {
        request = request.header(name, value);
    }

    if request_method != reqwest::Method::GET
        && let Some(body) = &monitor.body
    {
        request = request.body(body.clone());
    }

    let response = request.send().await;
    let latency = started.elapsed().as_millis() as i32;

    match response {
        Ok(response) => {
            let status_code = response.status().as_u16() as i32;
            let response_headers = response
                .headers()
                .iter()
                .filter_map(|(key, value)| {
                    value
                        .to_str()
                        .ok()
                        .map(|raw| (key.to_string(), raw.to_string()))
                })
                .collect::<HashMap<String, String>>();

            let response_body = match response.text().await {
                Ok(text) => Some(sanitize_response_body(&text)),
                Err(error) => {
                    debug!(error = %error, "failed to read http response body");
                    None
                }
            };

            let rules = parse_rules(monitor.rules.as_ref());
            let passed = evaluate_rules(
                &rules,
                status_code,
                &response_headers,
                response_body.as_deref(),
            );

            CheckResult {
                status: if passed { "up" } else { "degraded" }.to_string(),
                latency,
                status_code: Some(status_code),
                message: if passed {
                    None
                } else {
                    Some(format!("Rule check failed (HTTP {status_code})"))
                },
                response_headers: Some(
                    serde_json::to_value(response_headers).unwrap_or(Value::Null),
                ),
                response_body,
            }
        }
        Err(error) => CheckResult {
            status: "down".to_string(),
            latency,
            status_code: None,
            message: Some(format_error(&error)),
            response_headers: None,
            response_body: None,
        },
    }
}

fn sanitize_response_body(input: &str) -> String {
    let sanitized = input.replace('\0', "");
    if sanitized.len() > 64_000 {
        sanitized[..64_000].to_string()
    } else {
        sanitized
    }
}

fn parse_rules(value: Option<&Value>) -> Vec<Rule> {
    value
        .cloned()
        .and_then(|raw| serde_json::from_value::<Vec<Rule>>(raw).ok())
        .unwrap_or_default()
}

fn format_error(error: &reqwest::Error) -> String {
    if error.is_timeout() {
        return "Request timed out".to_string();
    }

    let message = error.to_string();
    if message.contains("Connection refused") {
        "Connection refused".to_string()
    } else if message.contains("dns error")
        || message.contains("failed to lookup address information")
    {
        "DNS resolution failed".to_string()
    } else if message.contains("certificate") {
        format!("TLS/SSL error: {message}")
    } else {
        message
    }
}

fn evaluate_rules(
    rules: &[Rule],
    status_code: i32,
    headers: &HashMap<String, String>,
    body: Option<&str>,
) -> bool {
    if rules.is_empty() {
        return (200..300).contains(&status_code);
    }

    rules.iter().all(|rule| match rule.kind.as_str() {
        "status" => compare(&status_code.to_string(), &rule.operator, &rule.value),
        "header" => {
            let (header_name, expected) = split_rule_value(&rule.value);
            let actual = headers.get(header_name).map(String::as_str).unwrap_or("");
            compare(actual, &rule.operator, expected)
        }
        "json_body" => {
            let Some(body) = body else {
                return false;
            };
            let Ok(json) = serde_json::from_str::<Value>(body) else {
                return false;
            };
            let (path, expected) = split_rule_value(&rule.value);
            let actual = get_json_path(&json, path)
                .map(|value| match value {
                    Value::String(text) => text.clone(),
                    other => other.to_string(),
                })
                .unwrap_or_default();
            compare(&actual, &rule.operator, expected)
        }
        _ => true,
    })
}

fn split_rule_value(input: &str) -> (&str, &str) {
    match input.split_once(':') {
        Some((left, right)) => (left.trim(), right.trim()),
        None => (input.trim(), ""),
    }
}

fn get_json_path<'a>(value: &'a Value, path: &str) -> Option<&'a Value> {
    path.split('.').try_fold(value, |current, segment| {
        if let Some((field, index)) = parse_indexed_segment(segment) {
            current.get(field)?.get(index)
        } else {
            current.get(segment)
        }
    })
}

fn parse_indexed_segment(segment: &str) -> Option<(&str, usize)> {
    let open = segment.find('[')?;
    let close = segment.find(']')?;
    let field = &segment[..open];
    let index = segment[open + 1..close].parse::<usize>().ok()?;
    Some((field, index))
}

fn compare(actual: &str, operator: &str, expected: &str) -> bool {
    match operator {
        "eq" => actual == expected,
        "neq" => actual != expected,
        "contains" => actual.contains(expected),
        _ => actual == expected,
    }
}

#[cfg(test)]
mod tests {
    use super::{compare, evaluate_rules, get_json_path, parse_rules, sanitize_response_body};

    #[test]
    fn compare_supports_expected_operators() {
        assert!(compare("200", "eq", "200"));
        assert!(compare("500", "neq", "200"));
        assert!(compare("partial outage", "contains", "outage"));
    }

    #[test]
    fn json_path_supports_array_indexes() {
        let json = serde_json::json!({ "items": [{ "status": "ok" }] });
        let value = get_json_path(&json, "items[0].status").and_then(|entry| entry.as_str());
        assert_eq!(value, Some("ok"));
    }

    #[test]
    fn rules_default_to_http_ok_when_none_exist() {
        let passed = evaluate_rules(&[], 204, &std::collections::HashMap::new(), None);
        assert!(passed);
    }

    #[test]
    fn body_is_truncated_and_null_bytes_removed() {
        let input = format!("foo\0{}", "a".repeat(70_000));
        let output = sanitize_response_body(&input);
        assert!(!output.contains('\0'));
        assert_eq!(output.len(), 64_000);
    }

    #[test]
    fn parse_rules_handles_json_input() {
        let rules = parse_rules(Some(
            &serde_json::json!([{ "type": "status", "operator": "eq", "value": "200" }]),
        ));
        assert_eq!(rules.len(), 1);
    }
}
