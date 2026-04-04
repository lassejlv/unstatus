use std::collections::HashMap;

use chrono::{NaiveDateTime, SecondsFormat};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use sqlx::FromRow;

pub const DUE_BATCH_SIZE: i64 = 500;
pub const EXTERNAL_DUE_BATCH_SIZE: i64 = 50;
pub const RAW_RETENTION_DAYS: i64 = 30;
pub const HOURLY_RETENTION_DAYS: i64 = 35;
pub const DAILY_BACKFILL_DAYS: i64 = 120;
pub const HOURLY_BACKFILL_DAYS: i64 = 35;
pub const STATUS_RETENTION_DAYS: i64 = 90;
pub const RESPONSE_BODY_LIMIT: usize = 64_000;

#[derive(Debug, Clone, Deserialize, PartialEq, Eq)]
pub struct Rule {
    pub r#type: String,
    pub operator: String,
    pub value: String,
}

#[derive(Debug, Clone, FromRow)]
pub struct WorkerMonitorRow {
    pub id: String,
    #[sqlx(rename = "organizationId")]
    pub organization_id: String,
    pub name: String,
    #[sqlx(rename = "type")]
    pub monitor_type: String,
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
    #[sqlx(rename = "autoIncidents")]
    pub auto_incidents: bool,
    #[sqlx(rename = "lastCheckedAt")]
    pub last_checked_at: Option<NaiveDateTime>,
    #[sqlx(rename = "nextCheckAt")]
    pub next_check_at: Option<NaiveDateTime>,
}

#[derive(Debug, Clone, FromRow)]
pub struct ExternalServiceRow {
    pub id: String,
    pub name: String,
    #[sqlx(rename = "statusPageApiUrl")]
    pub status_page_api_url: Option<String>,
    #[sqlx(rename = "parserType")]
    pub parser_type: String,
    #[sqlx(rename = "parserConfig")]
    pub parser_config: Option<Value>,
    #[sqlx(rename = "pollInterval")]
    pub poll_interval: i32,
    #[sqlx(rename = "nextFetchAt")]
    pub next_fetch_at: Option<NaiveDateTime>,
}

#[derive(Debug, Clone, FromRow)]
pub struct NotificationChannelRow {
    pub id: String,
    #[sqlx(rename = "type")]
    pub channel_type: String,
    #[sqlx(rename = "webhookUrl")]
    pub webhook_url: Option<String>,
    #[sqlx(rename = "recipientEmail")]
    pub recipient_email: Option<String>,
}

#[derive(Debug, Clone, FromRow)]
pub struct MaintenanceWindowRow {
    pub id: String,
    #[sqlx(rename = "organizationId")]
    pub organization_id: String,
    pub title: String,
}

#[derive(Debug, Clone, FromRow)]
pub struct MonitorNameRow {
    pub name: String,
}

#[derive(Debug, Clone, FromRow)]
pub struct IncidentRow {
    pub id: String,
}

#[derive(Debug, Clone, FromRow)]
pub struct MonitorCheckRow {
    pub id: String,
    #[sqlx(rename = "monitorId")]
    pub monitor_id: String,
    pub status: String,
    pub latency: i32,
    #[sqlx(rename = "statusCode")]
    pub status_code: Option<i32>,
    pub message: Option<String>,
    pub region: Option<String>,
    #[sqlx(rename = "responseHeaders")]
    pub response_headers: Option<Value>,
    #[sqlx(rename = "responseBody")]
    pub response_body: Option<String>,
    #[sqlx(rename = "checkedAt")]
    pub checked_at: NaiveDateTime,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MonitorCheckApi {
    pub id: String,
    pub monitor_id: String,
    pub status: String,
    pub latency: i32,
    pub status_code: Option<i32>,
    pub message: Option<String>,
    pub region: Option<String>,
    pub response_headers: Option<HashMap<String, String>>,
    pub response_body: Option<String>,
    pub checked_at: String,
}

impl From<MonitorCheckRow> for MonitorCheckApi {
    fn from(value: MonitorCheckRow) -> Self {
        Self {
            id: value.id,
            monitor_id: value.monitor_id,
            status: value.status,
            latency: value.latency,
            status_code: value.status_code,
            message: value.message,
            region: value.region,
            response_headers: value
                .response_headers
                .and_then(|json| serde_json::from_value::<HashMap<String, String>>(json).ok()),
            response_body: value.response_body,
            checked_at: serialize_timestamp(value.checked_at),
        }
    }
}

#[derive(Debug, Clone, Serialize)]
pub struct RunChecksResult {
    pub total: usize,
    pub failed: usize,
}

#[derive(Debug, Clone, Serialize)]
pub struct RunExternalChecksResult {
    pub checked: usize,
}

#[derive(Debug, Clone)]
pub struct CheckResult {
    pub status: String,
    pub latency: i32,
    pub status_code: Option<i32>,
    pub message: Option<String>,
    pub response_headers: Option<Value>,
    pub response_body: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ExternalStatusResult {
    pub overall_status: String,
    pub description: String,
    pub components: Vec<ExternalComponentStatus>,
    pub active_incident_name: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ExternalComponentStatus {
    pub external_id: String,
    pub name: String,
    pub status: String,
    pub description: Option<String>,
    pub group_name: Option<String>,
}

#[derive(Debug, Clone)]
pub enum NotificationEvent {
    MonitorDown {
        monitor_name: String,
        message: Option<String>,
    },
    MonitorRecovered {
        monitor_name: String,
    },
    IncidentCreated {
        monitor_name: String,
        title: String,
        severity: String,
        message: String,
    },
    IncidentResolved {
        monitor_name: String,
        title: String,
    },
    IncidentUpdated {
        monitor_name: String,
        title: String,
        status: String,
        message: String,
    },
    MaintenanceScheduled {
        title: String,
        scheduled_start: String,
        scheduled_end: String,
        monitor_names: Vec<String>,
    },
    MaintenanceStarted {
        title: String,
        monitor_names: Vec<String>,
    },
    MaintenanceCompleted {
        title: String,
        monitor_names: Vec<String>,
    },
}

impl NotificationEvent {
    pub fn flag_column(&self) -> &'static str {
        match self {
            Self::MonitorDown { .. } => "onMonitorDown",
            Self::MonitorRecovered { .. } => "onMonitorRecovered",
            Self::IncidentCreated { .. } => "onIncidentCreated",
            Self::IncidentResolved { .. } => "onIncidentResolved",
            Self::IncidentUpdated { .. } => "onIncidentUpdated",
            Self::MaintenanceScheduled { .. } => "onMaintenanceScheduled",
            Self::MaintenanceStarted { .. } => "onMaintenanceStarted",
            Self::MaintenanceCompleted { .. } => "onMaintenanceCompleted",
        }
    }

    pub fn event_type(&self) -> &'static str {
        match self {
            Self::MonitorDown { .. } => "monitor.down",
            Self::MonitorRecovered { .. } => "monitor.recovered",
            Self::IncidentCreated { .. } => "incident.created",
            Self::IncidentResolved { .. } => "incident.resolved",
            Self::IncidentUpdated { .. } => "incident.updated",
            Self::MaintenanceScheduled { .. } => "maintenance.scheduled",
            Self::MaintenanceStarted { .. } => "maintenance.started",
            Self::MaintenanceCompleted { .. } => "maintenance.completed",
        }
    }
}

pub fn serialize_timestamp(value: NaiveDateTime) -> String {
    value.and_utc().to_rfc3339_opts(SecondsFormat::Millis, true)
}
