use futures::stream::{self, StreamExt};
use maud::{DOCTYPE, Markup, html};
use reqwest::StatusCode;
use serde_json::json;
use tracing::{error, warn};

use crate::config::Config;
use crate::models::{NotificationChannelRow, NotificationEvent};
use crate::repo;

#[derive(Clone)]
pub struct Notifier {
    client: reqwest::Client,
    enabled: bool,
    inbound_api_key: Option<String>,
    inbound_from: Option<String>,
    inbound_base_url: String,
}

impl Notifier {
    pub fn new(client: reqwest::Client, config: &Config) -> Self {
        Self {
            client,
            enabled: config.mode.is_active(),
            inbound_api_key: config.inbound_api_key.clone(),
            inbound_from: config.inbound_from.clone(),
            inbound_base_url: config.inbound_base_url.trim_end_matches('/').to_string(),
        }
    }

    pub async fn send(
        &self,
        pool: &sqlx::PgPool,
        organization_id: &str,
        event: NotificationEvent,
    ) -> anyhow::Result<()> {
        if !self.enabled {
            return Ok(());
        }

        let channels =
            repo::list_notification_channels(pool, organization_id, event.flag_column()).await?;
        stream::iter(channels)
            .for_each_concurrent(Some(8), |channel| {
                let event = event.clone();
                async move {
                    if let Err(error) = self.send_to_channel(channel, &event).await {
                        error!(error = ?error, event = event.event_type(), "notification delivery failed");
                    }
                }
            })
            .await;

        Ok(())
    }

    async fn send_to_channel(
        &self,
        channel: NotificationChannelRow,
        event: &NotificationEvent,
    ) -> anyhow::Result<()> {
        match channel.channel_type.as_str() {
            "discord" => {
                if let Some(webhook_url) = channel.webhook_url {
                    self.send_discord(&channel.id, &webhook_url, event).await?;
                }
            }
            "email" => {
                self.send_email(channel.recipient_email, event).await?;
            }
            _ => {}
        }

        Ok(())
    }

    async fn send_discord(
        &self,
        channel_id: &str,
        webhook_url: &str,
        event: &NotificationEvent,
    ) -> anyhow::Result<()> {
        let response = self
            .client
            .post(webhook_url)
            .json(&json!({ "embeds": [build_discord_embed(event)] }))
            .send()
            .await?;

        if response.status().is_success() {
            return Ok(());
        }

        warn!(
            channel_id,
            status = response.status().as_u16(),
            "discord webhook returned non-success status"
        );
        Ok(())
    }

    async fn send_email(
        &self,
        recipients: Option<String>,
        event: &NotificationEvent,
    ) -> anyhow::Result<()> {
        let Some(recipients) = recipients else {
            return Ok(());
        };
        let Some(from) = self.inbound_from.as_deref() else {
            return Ok(());
        };
        let Some(api_key) = self.inbound_api_key.as_deref() else {
            return Ok(());
        };

        let recipients: Vec<String> = recipients
            .split(',')
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .map(ToOwned::to_owned)
            .collect();

        if recipients.is_empty() {
            return Ok(());
        }

        let html = build_email_html(event).into_string();
        let text = build_email_text(event);
        let endpoint = format!("{}/api/e2/emails", self.inbound_base_url);

        let response = self
            .client
            .post(endpoint)
            .bearer_auth(api_key)
            .json(&json!({
                "from": from,
                "to": recipients,
                "subject": build_email_subject(event),
                "html": html,
                "text": text,
            }))
            .send()
            .await?;

        if response.status() == StatusCode::OK || response.status() == StatusCode::CREATED {
            return Ok(());
        }

        warn!(
            status = response.status().as_u16(),
            "email provider returned non-success status"
        );
        Ok(())
    }
}

fn build_discord_embed(event: &NotificationEvent) -> serde_json::Value {
    match event {
        NotificationEvent::MonitorDown {
            monitor_name,
            message,
        } => json!({
            "title": format!("{monitor_name} is down"),
            "description": message.clone().unwrap_or_else(|| "Monitor is not responding.".to_string()),
            "color": 0xef4444_u32,
            "timestamp": chrono::Utc::now().to_rfc3339(),
        }),
        NotificationEvent::MonitorRecovered { monitor_name } => json!({
            "title": format!("{monitor_name} recovered"),
            "description": "Monitor is back up and responding normally.",
            "color": 0x22c55e_u32,
            "timestamp": chrono::Utc::now().to_rfc3339(),
        }),
        NotificationEvent::IncidentCreated {
            monitor_name,
            title,
            severity,
            message,
        } => json!({
            "title": format!("Incident: {title}"),
            "description": message,
            "color": severity_color(severity),
            "fields": [
                { "name": "Monitor", "value": monitor_name, "inline": true },
                { "name": "Severity", "value": severity, "inline": true }
            ],
            "timestamp": chrono::Utc::now().to_rfc3339(),
        }),
        NotificationEvent::IncidentResolved {
            monitor_name,
            title,
        } => json!({
            "title": format!("Resolved: {title}"),
            "description": format!("Incident for {monitor_name} has been resolved."),
            "color": 0x22c55e_u32,
            "timestamp": chrono::Utc::now().to_rfc3339(),
        }),
        NotificationEvent::IncidentUpdated {
            monitor_name,
            title,
            status,
            message,
        } => json!({
            "title": format!("Updated: {title}"),
            "description": message,
            "color": 0x3b82f6_u32,
            "fields": [
                { "name": "Monitor", "value": monitor_name, "inline": true },
                { "name": "Status", "value": status, "inline": true }
            ],
            "timestamp": chrono::Utc::now().to_rfc3339(),
        }),
        NotificationEvent::MaintenanceScheduled {
            title,
            scheduled_start,
            scheduled_end,
            monitor_names,
        } => json!({
            "title": format!("Maintenance Scheduled: {title}"),
            "description": format!("From {scheduled_start} to {scheduled_end}"),
            "color": 0x3b82f6_u32,
            "fields": [{ "name": "Affected Monitors", "value": monitor_names.join(", "), "inline": false }],
            "timestamp": chrono::Utc::now().to_rfc3339(),
        }),
        NotificationEvent::MaintenanceStarted {
            title,
            monitor_names,
        } => json!({
            "title": format!("Maintenance Started: {title}"),
            "description": format!("Affected monitors: {}", monitor_names.join(", ")),
            "color": 0xf59e0b_u32,
            "timestamp": chrono::Utc::now().to_rfc3339(),
        }),
        NotificationEvent::MaintenanceCompleted {
            title,
            monitor_names,
        } => json!({
            "title": format!("Maintenance Completed: {title}"),
            "description": format!("Affected monitors: {}", monitor_names.join(", ")),
            "color": 0x22c55e_u32,
            "timestamp": chrono::Utc::now().to_rfc3339(),
        }),
    }
}

fn build_email_subject(event: &NotificationEvent) -> String {
    match event {
        NotificationEvent::MonitorDown { monitor_name, .. } => {
            format!("[Unstatus] {monitor_name} is down")
        }
        NotificationEvent::MonitorRecovered { monitor_name } => {
            format!("[Unstatus] {monitor_name} recovered")
        }
        NotificationEvent::IncidentCreated { title, .. } => format!("[Unstatus] Incident: {title}"),
        NotificationEvent::IncidentResolved { title, .. } => {
            format!("[Unstatus] Resolved: {title}")
        }
        NotificationEvent::IncidentUpdated { title, .. } => format!("[Unstatus] Updated: {title}"),
        NotificationEvent::MaintenanceScheduled { title, .. } => {
            format!("[Unstatus] Maintenance Scheduled: {title}")
        }
        NotificationEvent::MaintenanceStarted { title, .. } => {
            format!("[Unstatus] Maintenance Started: {title}")
        }
        NotificationEvent::MaintenanceCompleted { title, .. } => {
            format!("[Unstatus] Maintenance Completed: {title}")
        }
    }
}

fn build_email_text(event: &NotificationEvent) -> String {
    match event {
        NotificationEvent::MonitorDown {
            monitor_name,
            message,
        } => format!(
            "{monitor_name} is down\n\n{}",
            message.as_deref().unwrap_or("Monitor is not responding.")
        ),
        NotificationEvent::MonitorRecovered { monitor_name } => {
            format!("{monitor_name} recovered\n\nMonitor is back up and responding normally.")
        }
        NotificationEvent::IncidentCreated {
            monitor_name,
            title,
            severity,
            message,
        } => {
            format!("Incident: {title}\nMonitor: {monitor_name}\nSeverity: {severity}\n\n{message}")
        }
        NotificationEvent::IncidentResolved {
            monitor_name,
            title,
        } => format!("Resolved: {title}\n\nIncident for {monitor_name} has been resolved."),
        NotificationEvent::IncidentUpdated {
            monitor_name,
            title,
            status,
            message,
        } => format!("Updated: {title}\nMonitor: {monitor_name}\nStatus: {status}\n\n{message}"),
        NotificationEvent::MaintenanceScheduled {
            title,
            scheduled_start,
            scheduled_end,
            monitor_names,
        } => format!(
            "Maintenance Scheduled: {title}\nFrom {scheduled_start} to {scheduled_end}\nAffected monitors: {}",
            monitor_names.join(", ")
        ),
        NotificationEvent::MaintenanceStarted {
            title,
            monitor_names,
        } => format!(
            "Maintenance Started: {title}\nAffected monitors: {}",
            monitor_names.join(", ")
        ),
        NotificationEvent::MaintenanceCompleted {
            title,
            monitor_names,
        } => format!(
            "Maintenance Completed: {title}\nAffected monitors: {}",
            monitor_names.join(", ")
        ),
    }
}

fn build_email_html(event: &NotificationEvent) -> Markup {
    let heading = build_email_heading(event);
    let description = build_email_description(event);

    let (label, accent, background) = match event {
        NotificationEvent::MonitorDown { .. } => ("Monitor Down", "#ef4444", "#fef2f2"),
        NotificationEvent::MonitorRecovered { .. } => ("Monitor Recovered", "#22c55e", "#f0fdf4"),
        NotificationEvent::IncidentCreated { .. } => ("Incident Created", "#ef4444", "#fef2f2"),
        NotificationEvent::IncidentResolved { .. } => ("Incident Resolved", "#22c55e", "#f0fdf4"),
        NotificationEvent::IncidentUpdated { .. } => ("Incident Updated", "#3b82f6", "#eff6ff"),
        NotificationEvent::MaintenanceScheduled { .. } => {
            ("Maintenance Scheduled", "#3b82f6", "#eff6ff")
        }
        NotificationEvent::MaintenanceStarted { .. } => {
            ("Maintenance Started", "#f59e0b", "#fffbeb")
        }
        NotificationEvent::MaintenanceCompleted { .. } => {
            ("Maintenance Completed", "#22c55e", "#f0fdf4")
        }
    };
    let badge_style = format!(
        "padding:12px 16px;border-left:4px solid {accent};background:{background};border-radius:6px;margin-bottom:24px;color:{accent};font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;"
    );

    html! {
        (DOCTYPE)
        html {
            head {
                meta charset="utf-8";
                meta name="viewport" content="width=device-width, initial-scale=1";
                title { (heading) }
            }
            body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#111827;" {
                div style="max-width:560px;margin:0 auto;padding:40px 20px;" {
                    p style="font-size:18px;font-weight:700;margin:0 0 24px 0;" { "Unstatus" }
                    div style=(badge_style) {
                        (label)
                    }
                    div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:8px;padding:24px;" {
                        h1 style="font-size:18px;font-weight:600;margin:0 0 8px 0;" { (heading) }
                        p style="font-size:14px;line-height:1.6;color:#4b5563;margin:0;" { (description) }
                        @for line in build_detail_lines(event) {
                            p style="font-size:13px;line-height:1.6;color:#111827;margin:12px 0 0 0;" { (line) }
                        }
                    }
                    p style="font-size:12px;color:#9ca3af;margin:16px 0 0 0;" { "Sent by Unstatus." }
                }
            }
        }
    }
}

fn build_email_heading(event: &NotificationEvent) -> String {
    match event {
        NotificationEvent::MonitorDown { monitor_name, .. } => format!("{monitor_name} is down"),
        NotificationEvent::MonitorRecovered { monitor_name } => format!("{monitor_name} recovered"),
        NotificationEvent::IncidentCreated { title, .. } => format!("Incident: {title}"),
        NotificationEvent::IncidentResolved { title, .. } => format!("Resolved: {title}"),
        NotificationEvent::IncidentUpdated { title, .. } => format!("Updated: {title}"),
        NotificationEvent::MaintenanceScheduled { title, .. } => {
            format!("Maintenance Scheduled: {title}")
        }
        NotificationEvent::MaintenanceStarted { title, .. } => {
            format!("Maintenance Started: {title}")
        }
        NotificationEvent::MaintenanceCompleted { title, .. } => {
            format!("Maintenance Completed: {title}")
        }
    }
}

fn build_email_description(event: &NotificationEvent) -> String {
    match event {
        NotificationEvent::MonitorDown { message, .. } => message
            .clone()
            .unwrap_or_else(|| "Monitor is not responding.".to_string()),
        NotificationEvent::MonitorRecovered { .. } => {
            "Monitor is back up and responding normally.".to_string()
        }
        NotificationEvent::IncidentCreated { message, .. } => message.clone(),
        NotificationEvent::IncidentResolved { monitor_name, .. } => {
            format!("Incident for {monitor_name} has been resolved.")
        }
        NotificationEvent::IncidentUpdated { message, .. } => message.clone(),
        NotificationEvent::MaintenanceScheduled {
            scheduled_start,
            scheduled_end,
            ..
        } => format!("From {scheduled_start} to {scheduled_end}"),
        NotificationEvent::MaintenanceStarted { monitor_names, .. } => {
            format!("Affected monitors: {}", monitor_names.join(", "))
        }
        NotificationEvent::MaintenanceCompleted { monitor_names, .. } => {
            format!("Affected monitors: {}", monitor_names.join(", "))
        }
    }
}

fn build_detail_lines(event: &NotificationEvent) -> Vec<String> {
    match event {
        NotificationEvent::MonitorDown { monitor_name, .. }
        | NotificationEvent::MonitorRecovered { monitor_name } => {
            vec![format!("Monitor: {monitor_name}")]
        }
        NotificationEvent::IncidentCreated {
            monitor_name,
            severity,
            ..
        } => vec![
            format!("Monitor: {monitor_name}"),
            format!("Severity: {severity}"),
        ],
        NotificationEvent::IncidentResolved { monitor_name, .. } => {
            vec![format!("Monitor: {monitor_name}")]
        }
        NotificationEvent::IncidentUpdated {
            monitor_name,
            status,
            ..
        } => vec![
            format!("Monitor: {monitor_name}"),
            format!("Status: {status}"),
        ],
        NotificationEvent::MaintenanceScheduled { monitor_names, .. }
        | NotificationEvent::MaintenanceStarted { monitor_names, .. }
        | NotificationEvent::MaintenanceCompleted { monitor_names, .. } => {
            vec![format!("Affected monitors: {}", monitor_names.join(", "))]
        }
    }
}

fn severity_color(severity: &str) -> u32 {
    match severity {
        "critical" => 0xef4444,
        "major" => 0xf97316,
        "minor" => 0xeab308,
        _ => 0xef4444,
    }
}

#[cfg(test)]
mod tests {
    use crate::models::NotificationEvent;

    use super::{build_email_subject, build_email_text};

    #[test]
    fn builds_monitor_subject() {
        let subject = build_email_subject(&NotificationEvent::MonitorDown {
            monitor_name: "API".to_string(),
            message: None,
        });

        assert_eq!(subject, "[Unstatus] API is down");
    }

    #[test]
    fn builds_maintenance_text() {
        let text = build_email_text(&NotificationEvent::MaintenanceStarted {
            title: "Database upgrade".to_string(),
            monitor_names: vec!["API".to_string(), "Dashboard".to_string()],
        });

        assert!(text.contains("Database upgrade"));
        assert!(text.contains("API, Dashboard"));
    }
}
