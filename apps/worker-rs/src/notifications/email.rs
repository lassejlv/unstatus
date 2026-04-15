use anyhow::{Result, anyhow};
use serde::Serialize;

#[derive(Debug, Serialize)]
struct EmailRequest<'a> {
    from: &'a str,
    to: &'a [String],
    subject: &'a str,
    html: &'a str,
    text: &'a str,
}

pub async fn send_inbound_email(
    client: &reqwest::Client,
    api_key: &str,
    from: &str,
    recipients: &[String],
    subject: &str,
    html: &str,
    text: &str,
) -> Result<()> {
    if recipients.is_empty() {
        return Ok(());
    }

    let response = client
        .post("https://api.inbound.new/v2/emails")
        .bearer_auth(api_key)
        .json(&EmailRequest {
            from,
            to: recipients,
            subject,
            html,
            text,
        })
        .send()
        .await?;

    if response.status().is_success() {
        Ok(())
    } else {
        Err(anyhow!("inbound email failed with {}", response.status()))
    }
}
