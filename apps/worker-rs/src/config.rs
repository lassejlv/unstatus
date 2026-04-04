use std::env;
use std::time::Duration;

use anyhow::{Context, Result, bail};

#[derive(Debug, Clone, Copy, Eq, PartialEq)]
pub enum WorkerMode {
    Active,
    Shadow,
}

impl WorkerMode {
    pub fn is_active(self) -> bool {
        matches!(self, Self::Active)
    }
}

#[derive(Debug, Clone)]
pub struct Config {
    pub database_url: String,
    pub worker_secret: String,
    pub region: String,
    pub port: u16,
    pub poll_interval: Duration,
    pub ext_poll_interval: Duration,
    pub maintenance_poll_interval: Duration,
    pub maintenance_interval: Duration,
    pub mode: WorkerMode,
    pub inbound_api_key: Option<String>,
    pub inbound_from: Option<String>,
    pub inbound_base_url: String,
}

impl Config {
    pub fn from_env() -> Result<Self> {
        let database_url = required("DATABASE_URL")?;
        let worker_secret = required("WORKER_SECRET")?;
        let region = env::var("REGION").unwrap_or_else(|_| "eu".to_string());
        let port = parse_u16("PORT", 3001)?;
        let poll_interval = Duration::from_secs(parse_u64("POLL_INTERVAL", 10)?);
        let ext_poll_interval = Duration::from_secs(parse_u64("EXT_POLL_INTERVAL", 60)?);
        let maintenance_poll_interval = Duration::from_secs(30);
        let maintenance_interval = Duration::from_secs(6 * 60 * 60);
        let mode = parse_mode(env::var("WORKER_MODE").ok().as_deref())?;
        let inbound_api_key = env::var("INBOUND_API_KEY")
            .ok()
            .filter(|value| !value.is_empty());
        let inbound_from = env::var("INBOUND_FROM")
            .ok()
            .filter(|value| !value.is_empty());
        let inbound_base_url = env::var("INBOUND_BASE_URL")
            .ok()
            .filter(|value| !value.is_empty())
            .unwrap_or_else(|| "https://inbound.new".to_string());

        Ok(Self {
            database_url,
            worker_secret,
            region,
            port,
            poll_interval,
            ext_poll_interval,
            maintenance_poll_interval,
            maintenance_interval,
            mode,
            inbound_api_key,
            inbound_from,
            inbound_base_url,
        })
    }
}

fn required(name: &str) -> Result<String> {
    let value = env::var(name).with_context(|| format!("missing required env var {name}"))?;
    if value.trim().is_empty() {
        bail!("{name} cannot be empty");
    }
    Ok(value)
}

fn parse_u16(name: &str, default: u16) -> Result<u16> {
    match env::var(name) {
        Ok(value) => value
            .parse()
            .with_context(|| format!("invalid {name}, expected u16")),
        Err(_) => Ok(default),
    }
}

fn parse_u64(name: &str, default: u64) -> Result<u64> {
    match env::var(name) {
        Ok(value) => value
            .parse()
            .with_context(|| format!("invalid {name}, expected u64")),
        Err(_) => Ok(default),
    }
}

fn parse_mode(value: Option<&str>) -> Result<WorkerMode> {
    match value
        .unwrap_or("shadow")
        .trim()
        .to_ascii_lowercase()
        .as_str()
    {
        "active" => Ok(WorkerMode::Active),
        "shadow" => Ok(WorkerMode::Shadow),
        other => bail!("invalid WORKER_MODE {other}, expected active or shadow"),
    }
}
