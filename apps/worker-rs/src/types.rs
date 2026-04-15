use std::collections::HashMap;

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use sqlx::FromRow;

pub const RAW_RETENTION_DAYS: i64 = 30;
pub const HOURLY_RETENTION_DAYS: i64 = 35;
pub const DAILY_BACKFILL_DAYS: i64 = 120;
pub const HOURLY_BACKFILL_DAYS: i64 = 35;
pub const DUE_BATCH_SIZE: i64 = 500;

#[derive(Debug, Clone, FromRow)]
pub struct WorkerMonitor {
    pub id: String,
    pub organization_id: String,
    pub name: String,
    pub kind: String,
    pub active: bool,
    pub interval: i32,
    pub timeout: i32,
    pub url: Option<String>,
    pub method: Option<String>,
    pub headers: Option<Value>,
    pub body: Option<String>,
    pub host: Option<String>,
    pub port: Option<i32>,
    pub rules: Option<Value>,
    pub regions: Value,
    pub auto_incidents: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub last_checked_at: Option<DateTime<Utc>>,
    pub next_check_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, FromRow)]
pub struct OpenIncident {
    pub id: String,
    pub monitor_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CheckResult {
    pub status: String,
    pub latency: i32,
    #[serde(rename = "statusCode")]
    pub status_code: Option<i32>,
    pub message: Option<String>,
    #[serde(rename = "responseHeaders")]
    pub response_headers: Option<Value>,
    #[serde(rename = "responseBody")]
    pub response_body: Option<String>,
}

#[derive(Debug, Clone, Serialize, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct MonitorCheckRecord {
    pub id: String,
    pub monitor_id: String,
    pub status: String,
    pub latency: i32,
    pub status_code: Option<i32>,
    pub message: Option<String>,
    pub region: Option<String>,
    pub response_headers: Option<Value>,
    pub response_body: Option<String>,
    pub checked_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize)]
pub struct RunChecksResponse {
    pub total: usize,
    pub failed: usize,
}

#[derive(Debug, Clone, Serialize)]
pub struct RunExternalResponse {
    pub checked: usize,
}

#[derive(Debug, Clone, FromRow)]
pub struct MaintenanceWindowRow {
    pub id: String,
    pub organization_id: String,
    pub title: String,
}

#[derive(Debug, Clone, FromRow)]
pub struct ExternalServiceRow {
    pub id: String,
    pub name: String,
    pub status_page_api_url: Option<String>,
    pub parser_type: String,
    pub parser_config: Option<Value>,
    pub poll_interval: i32,
    pub next_fetch_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExternalStatusComponent {
    pub external_id: String,
    pub name: String,
    pub status: String,
    pub description: Option<String>,
    pub group_name: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExternalStatusResult {
    pub overall_status: String,
    pub description: String,
    pub components: Vec<ExternalStatusComponent>,
    pub active_incident_name: Option<String>,
}

#[derive(Debug, Clone)]
pub struct AutoIncidentMonitor {
    pub id: String,
    pub name: String,
    pub organization_id: String,
    pub auto_incidents: bool,
}

pub fn get_next_check_at(interval_seconds: i32, checked_at: DateTime<Utc>) -> DateTime<Utc> {
    checked_at + chrono::TimeDelta::seconds(interval_seconds as i64)
}

pub fn get_status_count(status: &str, expected: &str) -> i32 {
    i32::from(status == expected)
}

pub fn regions_from_json(value: &Value) -> Vec<String> {
    value
        .as_array()
        .into_iter()
        .flatten()
        .filter_map(|entry| entry.as_str().map(ToOwned::to_owned))
        .collect()
}

pub fn json_object(value: Option<&Value>) -> HashMap<String, String> {
    value
        .and_then(Value::as_object)
        .map(|map| {
            map.iter()
                .filter_map(|(key, value)| value.as_str().map(|raw| (key.clone(), raw.to_string())))
                .collect()
        })
        .unwrap_or_default()
}

pub fn is_missing_monitor_perf_schema(error: &dyn std::error::Error) -> bool {
    let message = error.to_string();
    message.contains("monitor_check_hourly_rollup")
        || message.contains("monitor_check_daily_rollup")
        || message.contains("nextCheckAt")
        || message.contains("lastStatus")
        || message.contains("does not exist")
        || message.contains("42P01")
        || message.contains("42703")
}

#[cfg(test)]
mod tests {
    use std::io;

    use super::{get_status_count, is_missing_monitor_perf_schema, regions_from_json};

    #[test]
    fn status_count_matches_expected_status() {
        assert_eq!(get_status_count("up", "up"), 1);
        assert_eq!(get_status_count("down", "up"), 0);
    }

    #[test]
    fn missing_schema_classifier_matches_known_messages() {
        let error = io::Error::other("relation \"monitor_check_hourly_rollup\" does not exist");
        assert!(is_missing_monitor_perf_schema(&error));
    }

    #[test]
    fn regions_are_parsed_from_json_array() {
        let regions = regions_from_json(&serde_json::json!(["eu", "us"]));
        assert_eq!(regions, vec!["eu".to_string(), "us".to_string()]);
    }
}
