use serde::Deserialize;

use crate::models::{ExternalComponentStatus, ExternalStatusResult};

const ATLASSIAN_STATUS_MAP: &[(&str, &str)] = &[
    ("none", "operational"),
    ("minor", "degraded_performance"),
    ("major", "partial_outage"),
    ("critical", "major_outage"),
    ("maintenance", "maintenance"),
];

const ATLASSIAN_COMPONENT_STATUS_MAP: &[(&str, &str)] = &[
    ("operational", "operational"),
    ("degraded_performance", "degraded_performance"),
    ("partial_outage", "partial_outage"),
    ("major_outage", "major_outage"),
    ("under_maintenance", "maintenance"),
];

#[derive(Debug, Deserialize)]
struct AtlassianSummary {
    status: AtlassianPageStatus,
    components: Vec<AtlassianComponent>,
    incidents: Vec<AtlassianIncident>,
}

#[derive(Debug, Deserialize)]
struct AtlassianPageStatus {
    indicator: Option<String>,
    description: Option<String>,
}

#[derive(Debug, Deserialize, Clone)]
struct AtlassianComponent {
    id: String,
    name: String,
    status: String,
    description: Option<String>,
    group_id: Option<String>,
    group: bool,
}

#[derive(Debug, Deserialize)]
struct AtlassianIncident {
    name: String,
    status: String,
}

pub async fn check_external_service(
    client: &reqwest::Client,
    parser_type: &str,
    api_url: &str,
) -> anyhow::Result<ExternalStatusResult> {
    match parser_type {
        "atlassian" => parse_atlassian_statuspage(client, api_url).await,
        unsupported => Ok(ExternalStatusResult {
            overall_status: "unknown".to_string(),
            description: format!("Unsupported parser type: {unsupported}"),
            components: Vec::new(),
            active_incident_name: None,
        }),
    }
}

async fn parse_atlassian_statuspage(
    client: &reqwest::Client,
    api_url: &str,
) -> anyhow::Result<ExternalStatusResult> {
    let response = client
        .get(api_url)
        .header(reqwest::header::ACCEPT, "application/json")
        .timeout(std::time::Duration::from_secs(15))
        .send()
        .await?;

    let response = response.error_for_status()?;
    let summary = response.json::<AtlassianSummary>().await?;

    Ok(parse_atlassian_summary(summary))
}

fn parse_atlassian_summary(summary: AtlassianSummary) -> ExternalStatusResult {
    let overall_status = lookup_map(
        summary.status.indicator.as_deref().unwrap_or(""),
        ATLASSIAN_STATUS_MAP,
        "unknown",
    )
    .to_string();

    let components = summary
        .components
        .iter()
        .filter(|component| !component.group)
        .map(|component| ExternalComponentStatus {
            external_id: component.id.clone(),
            name: component.name.clone(),
            status: lookup_map(
                component.status.as_str(),
                ATLASSIAN_COMPONENT_STATUS_MAP,
                "unknown",
            )
            .to_string(),
            description: component.description.clone(),
            group_name: component
                .group_id
                .as_ref()
                .and_then(|group_id| summary.components.iter().find(|item| &item.id == group_id))
                .map(|group| group.name.clone()),
        })
        .collect();

    let active_incident_name = summary
        .incidents
        .into_iter()
        .find(|incident| incident.status != "resolved" && incident.status != "postmortem")
        .map(|incident| incident.name);

    ExternalStatusResult {
        overall_status,
        description: summary.status.description.unwrap_or_default(),
        components,
        active_incident_name,
    }
}

fn lookup_map<'a>(key: &str, items: &'a [(&str, &str)], default: &'a str) -> &'a str {
    items
        .iter()
        .find_map(|(candidate, value)| (*candidate == key).then_some(*value))
        .unwrap_or(default)
}

#[cfg(test)]
mod tests {
    use super::{AtlassianSummary, parse_atlassian_summary};

    #[test]
    fn parses_atlassian_summary() {
        let summary = serde_json::from_value::<AtlassianSummary>(serde_json::json!({
            "status": { "indicator": "major", "description": "Partial outage" },
            "components": [
                { "id": "group_1", "name": "Core", "status": "operational", "description": null, "group_id": null, "group": true },
                { "id": "component_1", "name": "API", "status": "partial_outage", "description": "Errors", "group_id": "group_1", "group": false }
            ],
            "incidents": [
                { "name": "API outage", "status": "investigating" }
            ]
        }))
        .unwrap();

        let result = parse_atlassian_summary(summary);
        assert_eq!(result.overall_status, "partial_outage");
        assert_eq!(result.components[0].group_name.as_deref(), Some("Core"));
        assert_eq!(result.active_incident_name.as_deref(), Some("API outage"));
    }
}
