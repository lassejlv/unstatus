use axum::extract::{Path, State};
use axum::http::HeaderMap;
use axum::routing::{get, post};
use axum::{Json, Router};
use serde_json::json;

use crate::error::AppError;
use crate::models::{RunChecksResult, RunExternalChecksResult};
use crate::{SharedState, services};

pub fn router(state: SharedState) -> Router {
    Router::new()
        .route("/health", get(health))
        .route("/run", post(run_checks))
        .route("/run-external", post(run_external))
        .route("/run/{monitor_id}", post(run_single))
        .with_state(state)
}

async fn health() -> Json<serde_json::Value> {
    Json(json!({ "status": "ok" }))
}

async fn run_checks(
    State(state): State<SharedState>,
    headers: HeaderMap,
) -> Result<Json<RunChecksResult>, AppError> {
    authorize(&headers, &state)?;
    Ok(Json(services::run_checks(state).await?))
}

async fn run_external(
    State(state): State<SharedState>,
    headers: HeaderMap,
) -> Result<Json<RunExternalChecksResult>, AppError> {
    authorize(&headers, &state)?;
    Ok(Json(services::run_external_service_checks(state).await?))
}

async fn run_single(
    State(state): State<SharedState>,
    Path(monitor_id): Path<String>,
    headers: HeaderMap,
) -> Result<Json<crate::models::MonitorCheckApi>, AppError> {
    authorize(&headers, &state)?;
    Ok(Json(services::run_single_check(state, &monitor_id).await?))
}

fn authorize(headers: &HeaderMap, state: &SharedState) -> Result<(), AppError> {
    let secret = headers
        .get("x-worker-secret")
        .and_then(|value| value.to_str().ok())
        .unwrap_or_default();

    if secret == state.config.worker_secret {
        return Ok(());
    }

    Err(AppError::Unauthorized)
}
