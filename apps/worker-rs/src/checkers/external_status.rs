use std::collections::HashMap;
use std::time::Duration;

use anyhow::{Result, anyhow};
use serde::Deserialize;

use crate::types::{ExternalStatusComponent, ExternalStatusResult};

#[derive(Debug, Deserialize)]
struct AtlassianSummary {
    status: Option<AtlassianOverallStatus>,
    #[serde(default)]
    components: Vec<AtlassianComponent>,
    #[serde(default)]
    incidents: Vec<AtlassianIncident>,
}

#[derive(Debug, Deserialize)]
struct AtlassianOverallStatus {
    indicator: Option<String>,
    description: Option<String>,
}

#[derive(Debug, Deserialize)]
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
) -> ExternalStatusResult {
    match parser_type {
        "atlassian" => match parse_atlassian_statuspage(client, api_url).await {
            Ok(result) => result,
            Err(error) => ExternalStatusResult {
                overall_status: "unknown".to_string(),
                description: error.to_string(),
                components: Vec::new(),
                active_incident_name: None,
            },
        },
        other => ExternalStatusResult {
            overall_status: "unknown".to_string(),
            description: format!("Unsupported parser type: {other}"),
            components: Vec::new(),
            active_incident_name: None,
        },
    }
}

async fn parse_atlassian_statuspage(
    client: &reqwest::Client,
    url: &str,
) -> Result<ExternalStatusResult> {
    let response = client
        .get(url)
        .header("Accept", "application/json")
        .timeout(Duration::from_secs(15))
        .send()
        .await?;

    if !response.status().is_success() {
        return Err(anyhow!("HTTP {} from {url}", response.status().as_u16()));
    }

    let data = response.json::<AtlassianSummary>().await?;
    let group_names = data
        .components
        .iter()
        .filter(|component| component.group)
        .map(|component| (component.id.clone(), component.name.clone()))
        .collect::<HashMap<_, _>>();

    let components = data
        .components
        .iter()
        .filter(|component| !component.group)
        .map(|component| ExternalStatusComponent {
            external_id: component.id.clone(),
            name: component.name.clone(),
            status: map_component_status(&component.status).to_string(),
            description: component.description.clone(),
            group_name: component
                .group_id
                .as_ref()
                .and_then(|group_id| group_names.get(group_id).cloned()),
        })
        .collect::<Vec<_>>();

    let active_incident_name = data
        .incidents
        .iter()
        .find(|incident| incident.status != "resolved" && incident.status != "postmortem")
        .map(|incident| incident.name.clone());

    Ok(ExternalStatusResult {
        overall_status: map_overall_status(
            data.status
                .as_ref()
                .and_then(|status| status.indicator.as_deref())
                .unwrap_or("unknown"),
        )
        .to_string(),
        description: data
            .status
            .and_then(|status| status.description)
            .unwrap_or_default(),
        components,
        active_incident_name,
    })
}

fn map_overall_status(indicator: &str) -> &'static str {
    match indicator {
        "none" => "operational",
        "minor" => "degraded_performance",
        "major" => "partial_outage",
        "critical" => "major_outage",
        "maintenance" => "maintenance",
        _ => "unknown",
    }
}

fn map_component_status(status: &str) -> &'static str {
    match status {
        "operational" => "operational",
        "degraded_performance" => "degraded_performance",
        "partial_outage" => "partial_outage",
        "major_outage" => "major_outage",
        "under_maintenance" => "maintenance",
        _ => "unknown",
    }
}

#[cfg(test)]
mod tests {
    use super::{map_component_status, map_overall_status};

    #[test]
    fn atlaskit_status_mapping_matches_worker() {
        assert_eq!(map_overall_status("none"), "operational");
        assert_eq!(map_component_status("under_maintenance"), "maintenance");
    }
}
