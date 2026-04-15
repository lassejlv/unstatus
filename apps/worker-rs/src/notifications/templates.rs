use crate::notifications::NotifyEvent;

pub fn render_notification_html(event: &NotifyEvent) -> String {
    let heading = event_heading(event);
    let description = event_description(event);
    let details = event_details(event)
        .into_iter()
        .map(|(label, value)| format!("<tr><td style=\"padding:4px 0;color:#6b7280;width:120px;\">{}</td><td style=\"padding:4px 0;color:#111827;font-weight:500;\">{}</td></tr>", escape_html(label), escape_html(&value)))
        .collect::<String>();

    format!(
        "<!doctype html><html><body style=\"background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;margin:0;padding:24px;\"><div style=\"max-width:560px;margin:0 auto;\"><p style=\"font-size:18px;font-weight:700;color:#111827;\">Unstatus</p><div style=\"background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:24px;\"><h1 style=\"font-size:18px;color:#111827;margin:0 0 8px;\">{}</h1><p style=\"font-size:14px;line-height:1.6;color:#4b5563;margin:0 0 16px;\">{}</p><table style=\"width:100%;font-size:13px;\">{}</table></div></div></body></html>",
        escape_html(&heading),
        escape_html(&description),
        details
    )
}

pub fn render_notification_text(event: &NotifyEvent) -> String {
    let mut lines = vec![event_heading(event), event_description(event)];
    for (label, value) in event_details(event) {
        lines.push(format!("{label}: {value}"));
    }
    lines.join("\n")
}

fn event_heading(event: &NotifyEvent) -> String {
    match event {
        NotifyEvent::MonitorDown { monitor_name, .. } => format!("{monitor_name} is down"),
        NotifyEvent::MonitorRecovered { monitor_name } => format!("{monitor_name} recovered"),
        NotifyEvent::IncidentCreated { title, .. } => format!("Incident: {title}"),
        NotifyEvent::IncidentResolved { title, .. } => format!("Resolved: {title}"),
        NotifyEvent::IncidentUpdated { title, .. } => format!("Updated: {title}"),
        NotifyEvent::MaintenanceScheduled { title, .. } => {
            format!("Maintenance Scheduled: {title}")
        }
        NotifyEvent::MaintenanceStarted { title, .. } => format!("Maintenance Started: {title}"),
        NotifyEvent::MaintenanceCompleted { title, .. } => {
            format!("Maintenance Completed: {title}")
        }
    }
}

fn event_description(event: &NotifyEvent) -> String {
    match event {
        NotifyEvent::MonitorDown { message, .. } => message
            .clone()
            .unwrap_or_else(|| "Monitor is not responding.".to_string()),
        NotifyEvent::MonitorRecovered { .. } => {
            "Monitor is back up and responding normally.".to_string()
        }
        NotifyEvent::IncidentCreated { message, .. } => message.clone(),
        NotifyEvent::IncidentResolved { monitor_name, .. } => {
            format!("Incident for {monitor_name} has been resolved.")
        }
        NotifyEvent::IncidentUpdated { message, .. } => message.clone(),
        NotifyEvent::MaintenanceScheduled {
            scheduled_start,
            scheduled_end,
            ..
        } => format!("Scheduled from {scheduled_start} to {scheduled_end}."),
        NotifyEvent::MaintenanceStarted { monitor_names, .. } => {
            format!("Affected monitors: {}", monitor_names.join(", "))
        }
        NotifyEvent::MaintenanceCompleted { monitor_names, .. } => {
            format!("Affected monitors: {}", monitor_names.join(", "))
        }
    }
}

fn event_details(event: &NotifyEvent) -> Vec<(&'static str, String)> {
    match event {
        NotifyEvent::MonitorDown { monitor_name, .. } => vec![("Monitor", monitor_name.clone())],
        NotifyEvent::MonitorRecovered { monitor_name } => vec![("Monitor", monitor_name.clone())],
        NotifyEvent::IncidentCreated {
            monitor_name,
            severity,
            ..
        } => vec![
            ("Monitor", monitor_name.clone()),
            ("Severity", severity.clone()),
        ],
        NotifyEvent::IncidentResolved { monitor_name, .. } => {
            vec![("Monitor", monitor_name.clone())]
        }
        NotifyEvent::IncidentUpdated {
            monitor_name,
            status,
            ..
        } => vec![
            ("Monitor", monitor_name.clone()),
            ("Status", status.clone()),
        ],
        NotifyEvent::MaintenanceScheduled { monitor_names, .. }
        | NotifyEvent::MaintenanceStarted { monitor_names, .. }
        | NotifyEvent::MaintenanceCompleted { monitor_names, .. } => {
            vec![("Affected Monitors", monitor_names.join(", "))]
        }
    }
}

fn escape_html(input: &str) -> String {
    input
        .replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&#39;")
}

#[cfg(test)]
mod tests {
    use crate::notifications::NotifyEvent;

    use super::{render_notification_html, render_notification_text};

    #[test]
    fn templates_render_monitor_event() {
        let event = NotifyEvent::MonitorDown {
            monitor_name: "API".to_string(),
            message: Some("Request timed out".to_string()),
        };

        let html = render_notification_html(&event);
        let text = render_notification_text(&event);

        assert!(html.contains("API is down"));
        assert!(text.contains("Request timed out"));
    }
}
