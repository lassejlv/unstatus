use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct Pagination {
    pub total: u64,
    pub limit: u64,
    pub offset: u64,
    pub has_more: bool,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Paginated<T> {
    pub items: Vec<T>,
    pub pagination: Pagination,
}

#[derive(Debug, Clone, Default, Serialize)]
pub struct PaginationParams {
    pub limit: Option<u64>,
    pub offset: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum MonitorType {
    Http,
    Tcp,
    Ping,
}

impl Default for MonitorType {
    fn default() -> Self {
        Self::Http
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum MonitorStatus {
    Up,
    Down,
    Degraded,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum Region {
    Eu,
    Us,
    Asia,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum IncidentStatus {
    Investigating,
    Identified,
    Monitoring,
    Resolved,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum IncidentSeverity {
    Minor,
    Major,
    Critical,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum NotificationChannelType {
    Discord,
    Email,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum MaintenanceStatus {
    Scheduled,
    InProgress,
    Completed,
    Cancelled,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum Plan {
    Free,
    Pro,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct MonitorRule {
    pub r#type: String,
    pub operator: String,
    pub value: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Monitor {
    pub id: String,
    pub organization_id: String,
    pub name: String,
    pub r#type: MonitorType,
    pub active: bool,
    pub interval: u64,
    pub timeout: u64,
    pub url: Option<String>,
    pub method: Option<String>,
    pub headers: Option<HashMap<String, String>>,
    pub body: Option<String>,
    pub host: Option<String>,
    pub port: Option<u16>,
    pub rules: Option<Vec<MonitorRule>>,
    pub regions: Vec<Region>,
    pub auto_incidents: bool,
    pub created_at: String,
    pub updated_at: String,
    pub last_checked_at: Option<String>,
    pub next_check_at: Option<String>,
    pub last_status: Option<String>,
    pub last_latency: Option<i64>,
    pub last_status_code: Option<u16>,
    pub last_region: Option<String>,
    pub last_message: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct MonitorCheck {
    pub id: String,
    pub monitor_id: String,
    pub status: MonitorStatus,
    pub latency: i64,
    pub status_code: Option<u16>,
    pub message: Option<String>,
    pub region: Option<String>,
    pub response_headers: Option<HashMap<String, String>>,
    pub response_body: Option<String>,
    pub checked_at: String,
}

pub type MonitorRunResult = MonitorCheck;

#[derive(Debug, Clone, Default, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateMonitorInput {
    pub name: String,
    pub r#type: MonitorType,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub interval: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub timeout: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub method: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub headers: Option<HashMap<String, String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub body: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub host: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub port: Option<u16>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub rules: Option<Vec<MonitorRule>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub regions: Option<Vec<Region>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub auto_incidents: Option<bool>,
}

#[derive(Debug, Clone, Default, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateMonitorInput {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub r#type: Option<MonitorType>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub interval: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub timeout: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub method: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub headers: Option<HashMap<String, String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub body: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub host: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub port: Option<u16>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub rules: Option<Vec<MonitorRule>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub regions: Option<Vec<Region>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub auto_incidents: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub active: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct IncidentMonitorRef {
    pub monitor: IncidentMonitorSummary,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct IncidentMonitorSummary {
    pub id: String,
    pub name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct IncidentUpdate {
    pub id: String,
    pub incident_id: String,
    pub status: IncidentStatus,
    pub message: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct IncidentListMonitor {
    pub name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct IncidentListItem {
    pub id: String,
    pub monitor_id: String,
    pub title: String,
    pub status: IncidentStatus,
    pub severity: IncidentSeverity,
    pub started_at: String,
    pub resolved_at: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    pub monitor: IncidentListMonitor,
    pub monitors: Vec<IncidentMonitorRef>,
    pub updates: Vec<IncidentUpdate>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct Incident {
    pub id: String,
    pub monitor_id: String,
    pub title: String,
    pub status: IncidentStatus,
    pub severity: IncidentSeverity,
    pub started_at: String,
    pub resolved_at: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    pub monitors: Vec<IncidentMonitorRef>,
    pub updates: Vec<IncidentUpdate>,
}

#[derive(Debug, Clone, Serialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct CreateIncidentInput {
    pub monitor_ids: Vec<String>,
    pub title: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub status: Option<IncidentStatus>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub severity: Option<IncidentSeverity>,
    pub message: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateIncidentInput {
    pub status: IncidentStatus,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct StatusPageMonitor {
    pub id: String,
    pub status_page_id: String,
    pub monitor_id: String,
    pub sort_order: i64,
    pub display_name: Option<String>,
    pub group_name: Option<String>,
    pub monitor: IncidentMonitorSummary,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct StatusPage {
    pub id: String,
    pub organization_id: String,
    pub name: String,
    pub slug: String,
    pub custom_domain: Option<String>,
    pub is_public: bool,
    pub logo_url: Option<String>,
    pub favicon_url: Option<String>,
    pub brand_color: Option<String>,
    pub header_text: Option<String>,
    pub footer_text: Option<String>,
    pub custom_css: Option<String>,
    pub custom_js: Option<String>,
    pub show_response_times: bool,
    pub show_dependencies: bool,
    pub created_at: String,
    pub updated_at: String,
    #[serde(default)]
    pub monitors: Vec<StatusPageMonitor>,
}

#[derive(Debug, Clone, Default, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateStatusPageInput {
    pub name: String,
    pub slug: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub custom_domain: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub is_public: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub logo_url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub favicon_url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub brand_color: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub header_text: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub footer_text: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub custom_css: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub custom_js: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub show_response_times: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub show_dependencies: Option<bool>,
}

#[derive(Debug, Clone, Default, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateStatusPageInput {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub slug: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub custom_domain: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub is_public: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub logo_url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub favicon_url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub brand_color: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub header_text: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub footer_text: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub custom_css: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub custom_js: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub show_response_times: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub show_dependencies: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct NotificationChannel {
    pub id: String,
    pub organization_id: String,
    pub name: String,
    pub r#type: NotificationChannelType,
    pub webhook_url: Option<String>,
    pub recipient_email: Option<String>,
    pub enabled: bool,
    pub on_incident_created: bool,
    pub on_incident_resolved: bool,
    pub on_incident_updated: bool,
    pub on_monitor_down: bool,
    pub on_monitor_recovered: bool,
    pub on_maintenance_scheduled: bool,
    pub on_maintenance_started: bool,
    pub on_maintenance_completed: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Default, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NotificationChannelSettings {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub on_incident_created: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub on_incident_resolved: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub on_incident_updated: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub on_monitor_down: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub on_monitor_recovered: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub on_maintenance_scheduled: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub on_maintenance_started: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub on_maintenance_completed: Option<bool>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(tag = "type")]
pub enum CreateNotificationInput {
    #[serde(rename = "discord")]
    Discord {
        name: String,
        #[serde(rename = "webhookUrl")]
        webhook_url: String,
        #[serde(rename = "recipientEmail", skip_serializing_if = "Option::is_none")]
        recipient_email: Option<String>,
        #[serde(flatten)]
        settings: NotificationChannelSettings,
    },
    #[serde(rename = "email")]
    Email {
        name: String,
        #[serde(rename = "recipientEmail")]
        recipient_email: String,
        #[serde(rename = "webhookUrl", skip_serializing_if = "Option::is_none")]
        webhook_url: Option<String>,
        #[serde(flatten)]
        settings: NotificationChannelSettings,
    },
}

#[derive(Debug, Clone, Default, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateNotificationInput {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub webhook_url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub recipient_email: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub enabled: Option<bool>,
    #[serde(flatten)]
    pub settings: NotificationChannelSettings,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct MaintenanceWindowMonitor {
    pub monitor: IncidentMonitorSummary,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct MaintenanceWindow {
    pub id: String,
    pub organization_id: String,
    pub title: String,
    pub description: Option<String>,
    pub scheduled_start: String,
    pub scheduled_end: String,
    pub actual_start: Option<String>,
    pub actual_end: Option<String>,
    pub status: MaintenanceStatus,
    pub created_at: String,
    pub updated_at: String,
    pub monitors: Vec<MaintenanceWindowMonitor>,
}

#[derive(Debug, Clone, Default, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateMaintenanceInput {
    pub title: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    pub scheduled_start: String,
    pub scheduled_end: String,
    pub monitor_ids: Vec<String>,
}

#[derive(Debug, Clone, Default, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateMaintenanceInput {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub title: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub scheduled_start: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub scheduled_end: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub monitor_ids: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct Organization {
    pub id: String,
    pub name: String,
    pub slug: String,
    pub logo: Option<String>,
    pub created_at: String,
    pub subscription_active: bool,
    pub subscription_plan_name: Option<String>,
    pub cancel_at_period_end: bool,
    pub plan: Plan,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct DeleteResult {
    pub deleted: bool,
}
