use anyhow::{Result, anyhow};
use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
pub struct DiscordEmbedField {
    pub name: String,
    pub value: String,
    pub inline: bool,
}

#[derive(Debug, Clone, Serialize)]
pub struct DiscordEmbed {
    pub title: String,
    pub description: String,
    pub color: u32,
    #[serde(skip_serializing_if = "Vec::is_empty", default)]
    pub fields: Vec<DiscordEmbedField>,
    pub timestamp: String,
}

#[derive(Debug, Serialize)]
struct DiscordPayload {
    embeds: Vec<DiscordEmbed>,
}

pub async fn send_discord_webhook(
    client: &reqwest::Client,
    webhook_url: &str,
    embed: DiscordEmbed,
) -> Result<()> {
    let response = client
        .post(webhook_url)
        .header("Content-Type", "application/json")
        .json(&DiscordPayload {
            embeds: vec![embed],
        })
        .send()
        .await?;

    if response.status().is_success() {
        Ok(())
    } else {
        Err(anyhow!("discord webhook failed with {}", response.status()))
    }
}
