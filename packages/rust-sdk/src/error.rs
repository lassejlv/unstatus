use reqwest::StatusCode;
use serde_json::Value;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum UnstatusError {
    #[error("{message}")]
    Api {
        status: StatusCode,
        code: String,
        message: String,
        payload: Option<Value>,
    },
    #[error("transport error: {0}")]
    Transport(#[from] reqwest::Error),
    #[error("serialization error: {0}")]
    Serialization(#[from] serde_json::Error),
    #[error("invalid base URL: {0}")]
    InvalidBaseUrl(String),
}

impl UnstatusError {
    pub fn status(&self) -> Option<StatusCode> {
        match self {
            Self::Api { status, .. } => Some(*status),
            _ => None,
        }
    }

    pub fn code(&self) -> Option<&str> {
        match self {
            Self::Api { code, .. } => Some(code.as_str()),
            _ => None,
        }
    }
}
