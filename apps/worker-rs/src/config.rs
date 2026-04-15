use std::env;

use anyhow::{Context, Result, anyhow};

#[derive(Debug)]
pub struct AppConfig {
    pub database_url: String,
    pub worker_secret: String,
    pub port: u16,
    pub region: String,
    pub poll_interval_secs: u64,
    pub ext_poll_interval_secs: u64,
    pub check_concurrency: usize,
    pub inbound_api_key: Option<String>,
    pub inbound_from: Option<String>,
}

impl AppConfig {
    pub fn from_env() -> Result<Self> {
        let database_url = required("DATABASE_URL")?;
        let worker_secret = required("WORKER_SECRET")?;
        let port = parse("PORT", 3001_u16)?;
        let region = env::var("REGION").unwrap_or_else(|_| "eu".to_string());
        let poll_interval_secs = parse("POLL_INTERVAL", 10_u64)?;
        let ext_poll_interval_secs = parse("EXT_POLL_INTERVAL", 60_u64)?;
        let check_concurrency = parse("CHECK_CONCURRENCY", 20_usize)?;
        let inbound_api_key = optional("INBOUND_API_KEY");
        let inbound_from = optional("INBOUND_FROM");

        Ok(Self {
            database_url,
            worker_secret,
            port,
            region,
            poll_interval_secs,
            ext_poll_interval_secs,
            check_concurrency,
            inbound_api_key,
            inbound_from,
        })
    }
}

fn required(name: &str) -> Result<String> {
    env::var(name).with_context(|| format!("missing required env var {name}"))
}

fn optional(name: &str) -> Option<String> {
    env::var(name).ok().filter(|value| !value.trim().is_empty())
}

fn parse<T>(name: &str, default: T) -> Result<T>
where
    T: std::str::FromStr,
    T::Err: std::fmt::Display,
{
    match env::var(name) {
        Ok(value) => value
            .parse::<T>()
            .map_err(|error| anyhow!("invalid {name}: {error}")),
        Err(env::VarError::NotPresent) => Ok(default),
        Err(error) => Err(anyhow!("failed to read {name}: {error}")),
    }
}

#[cfg(test)]
mod tests {
    use super::parse;

    #[test]
    fn parse_uses_default_when_missing() {
        let value = parse("WORKER_RS_MISSING_TEST", 42_u64).expect("default should parse");
        assert_eq!(value, 42);
    }
}
