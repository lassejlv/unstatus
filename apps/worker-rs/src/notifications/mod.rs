pub mod discord;
pub mod email;
pub mod templates;

use anyhow::Result;
use chrono::Utc;
use futures::future::join_all;
use sqlx::{FromRow, PgPool};
use tracing::{error, warn};

use crate::AppState;

use self::discord::{DiscordEmbed, DiscordEmbedField};
use self::email::send_inbound_email;
use self::templates::{render_notification_html, render_notification_text};

#[derive(Debug, Clone)]
pub enum NotifyEvent {
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

#[derive(Debug, FromRow)]
struct NotificationChannelRow {
    id: String,
    kind: String,
    webhook_url: Option<String>,
    recipient_email: Option<String>,
}

pub async fn send_notifications(
    state: &AppState,
    organization_id: &str,
    event: NotifyEvent,
) -> Result<()> {
    let channels =
        list_notification_channels(&state.db, organization_id, flag_for_event(&event)).await?;
    let futures = channels.into_iter().map(|channel| {
        let client = state.http.clone();
        let config = state.config.clone();
        let event = event.clone();

        async move {
            match channel.kind.as_str() {
                "discord" => {
                    if let Some(webhook_url) = channel.webhook_url {
                        let embed = build_embed(&event);
                        if let Err(error) = discord::send_discord_webhook(&client, &webhook_url, embed).await {
                            error!(channel_id = %channel.id, %error, "discord notification failed");
                        }
                    }
                }
                "email" => {
                    if let (Some(recipient_email), Some(api_key), Some(from)) = (
                        channel.recipient_email,
                        config.inbound_api_key.as_deref(),
                        config.inbound_from.as_deref(),
                    ) {
                        let recipients = recipient_email
                            .split(',')
                            .map(str::trim)
                            .filter(|entry| !entry.is_empty())
                            .map(ToOwned::to_owned)
                            .collect::<Vec<_>>();
                        let subject = build_email_subject(&event);
                        let html = render_notification_html(&event);
                        let text = render_notification_text(&event);

                        if let Err(error) = send_inbound_email(
                            &client,
                            api_key,
                            from,
                            &recipients,
                            &subject,
                            &html,
                            &text,
                        )
                        .await
                        {
                            error!(channel_id = %channel.id, %error, "email notification failed");
                        }
                    }
                }
                other => warn!(channel_id = %channel.id, kind = other, "unsupported notification channel"),
            }
        }
    });

    join_all(futures).await;
    Ok(())
}

async fn list_notification_channels(
    pool: &PgPool,
    organization_id: &str,
    flag: &str,
) -> Result<Vec<NotificationChannelRow>> {
    let sql = format!(
        r#"
        SELECT
          id,
          type AS kind,
          "webhookUrl" AS webhook_url,
          "recipientEmail" AS recipient_email
        FROM notification_channel
        WHERE "organizationId" = $1
          AND enabled = true
          AND "{flag}" = true
        "#
    );

    sqlx::query_as::<_, NotificationChannelRow>(&sql)
        .bind(organization_id)
        .fetch_all(pool)
        .await
        .map_err(Into::into)
}

fn flag_for_event(event: &NotifyEvent) -> &'static str {
    match event {
        NotifyEvent::MonitorDown { .. } => "onMonitorDown",
        NotifyEvent::MonitorRecovered { .. } => "onMonitorRecovered",
        NotifyEvent::IncidentCreated { .. } => "onIncidentCreated",
        NotifyEvent::IncidentResolved { .. } => "onIncidentResolved",
        NotifyEvent::IncidentUpdated { .. } => "onIncidentUpdated",
        NotifyEvent::MaintenanceScheduled { .. } => "onMaintenanceScheduled",
        NotifyEvent::MaintenanceStarted { .. } => "onMaintenanceStarted",
        NotifyEvent::MaintenanceCompleted { .. } => "onMaintenanceCompleted",
    }
}

fn build_embed(event: &NotifyEvent) -> DiscordEmbed {
    match event {
        NotifyEvent::MonitorDown {
            monitor_name,
            message,
        } => DiscordEmbed {
            title: format!("{monitor_name} is down"),
            description: message
                .clone()
                .unwrap_or_else(|| "Monitor is not responding.".to_string()),
            color: 0xef4444,
            fields: Vec::new(),
            timestamp: Utc::now().to_rfc3339(),
        },
        NotifyEvent::MonitorRecovered { monitor_name } => DiscordEmbed {
            title: format!("{monitor_name} recovered"),
            description: "Monitor is back up and responding normally.".to_string(),
            color: 0x22c55e,
            fields: Vec::new(),
            timestamp: Utc::now().to_rfc3339(),
        },
        NotifyEvent::IncidentCreated {
            monitor_name,
            title,
            severity,
            message,
        } => DiscordEmbed {
            title: format!("Incident: {title}"),
            description: message.clone(),
            color: severity_color(severity),
            fields: vec![
                DiscordEmbedField {
                    name: "Monitor".to_string(),
                    value: monitor_name.clone(),
                    inline: true,
                },
                DiscordEmbedField {
                    name: "Severity".to_string(),
                    value: severity.clone(),
                    inline: true,
                },
            ],
            timestamp: Utc::now().to_rfc3339(),
        },
        NotifyEvent::IncidentResolved {
            monitor_name,
            title,
        } => DiscordEmbed {
            title: format!("Resolved: {title}"),
            description: format!("Incident for {monitor_name} has been resolved."),
            color: 0x22c55e,
            fields: Vec::new(),
            timestamp: Utc::now().to_rfc3339(),
        },
        NotifyEvent::IncidentUpdated {
            monitor_name,
            title,
            status,
            message,
        } => DiscordEmbed {
            title: format!("Updated: {title}"),
            description: message.clone(),
            color: 0x3b82f6,
            fields: vec![
                DiscordEmbedField {
                    name: "Monitor".to_string(),
                    value: monitor_name.clone(),
                    inline: true,
                },
                DiscordEmbedField {
                    name: "Status".to_string(),
                    value: status.clone(),
                    inline: true,
                },
            ],
            timestamp: Utc::now().to_rfc3339(),
        },
        NotifyEvent::MaintenanceScheduled {
            title,
            scheduled_start,
            scheduled_end,
            monitor_names,
        } => DiscordEmbed {
            title: format!("Maintenance Scheduled: {title}"),
            description: format!("From {scheduled_start} to {scheduled_end}"),
            color: 0x3b82f6,
            fields: vec![DiscordEmbedField {
                name: "Affected Monitors".to_string(),
                value: monitor_names.join(", "),
                inline: false,
            }],
            timestamp: Utc::now().to_rfc3339(),
        },
        NotifyEvent::MaintenanceStarted {
            title,
            monitor_names,
        } => DiscordEmbed {
            title: format!("Maintenance Started: {title}"),
            description: format!("Affected monitors: {}", monitor_names.join(", ")),
            color: 0xf59e0b,
            fields: Vec::new(),
            timestamp: Utc::now().to_rfc3339(),
        },
        NotifyEvent::MaintenanceCompleted {
            title,
            monitor_names,
        } => DiscordEmbed {
            title: format!("Maintenance Completed: {title}"),
            description: format!("Affected monitors: {}", monitor_names.join(", ")),
            color: 0x22c55e,
            fields: Vec::new(),
            timestamp: Utc::now().to_rfc3339(),
        },
    }
}

fn build_email_subject(event: &NotifyEvent) -> String {
    match event {
        NotifyEvent::MonitorDown { monitor_name, .. } => {
            format!("[Unstatus] {monitor_name} is down")
        }
        NotifyEvent::MonitorRecovered { monitor_name } => {
            format!("[Unstatus] {monitor_name} recovered")
        }
        NotifyEvent::IncidentCreated { title, .. } => format!("[Unstatus] Incident: {title}"),
        NotifyEvent::IncidentResolved { title, .. } => format!("[Unstatus] Resolved: {title}"),
        NotifyEvent::IncidentUpdated { title, .. } => format!("[Unstatus] Updated: {title}"),
        NotifyEvent::MaintenanceScheduled { title, .. } => {
            format!("[Unstatus] Maintenance Scheduled: {title}")
        }
        NotifyEvent::MaintenanceStarted { title, .. } => {
            format!("[Unstatus] Maintenance Started: {title}")
        }
        NotifyEvent::MaintenanceCompleted { title, .. } => {
            format!("[Unstatus] Maintenance Completed: {title}")
        }
    }
}

fn severity_color(severity: &str) -> u32 {
    match severity {
        "critical" => 0xef4444,
        "major" => 0xf97316,
        "degraded" => 0xf59e0b,
        "minor" => 0xeab308,
        "maintenance" => 0x6b7280,
        _ => 0xef4444,
    }
}

#[cfg(test)]
mod tests {
    use super::{NotifyEvent, build_email_subject, flag_for_event};

    #[test]
    fn event_flags_match_existing_notification_columns() {
        assert_eq!(
            flag_for_event(&NotifyEvent::MaintenanceCompleted {
                title: "DB work".to_string(),
                monitor_names: vec!["API".to_string()],
            }),
            "onMaintenanceCompleted"
        );
    }

    #[test]
    fn email_subject_matches_monitor_event() {
        let subject = build_email_subject(&NotifyEvent::MonitorRecovered {
            monitor_name: "API".to_string(),
        });
        assert_eq!(subject, "[Unstatus] API recovered");
    }
}
