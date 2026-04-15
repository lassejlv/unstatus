use axum::extract::{Path, State};
use axum::http::{HeaderMap, StatusCode};
use axum::routing::{get, post};
use axum::{Json, Router};
use serde_json::json;
use tracing::error;

use crate::AppState;
use crate::external_service_runner;
use crate::runner;

pub fn create_router(state: AppState) -> Router {
    Router::new()
        .route("/health", get(health))
        .route("/run", post(run_all))
        .route("/run-external", post(run_external))
        .route("/run/{monitor_id}", post(run_single))
        .with_state(state)
}

async fn health() -> Json<serde_json::Value> {
    Json(json!({ "status": "ok" }))
}

async fn run_all(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> (StatusCode, Json<serde_json::Value>) {
    if !authorized(&state, &headers) {
        return unauthorized();
    }

    match runner::run_checks(&state).await {
        Ok(result) => (
            StatusCode::OK,
            Json(serde_json::to_value(result).unwrap_or_else(|_| json!({}))),
        ),
        Err(error) => {
            error!(%error, "scheduled run failed");
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "error": error.to_string() })),
            )
        }
    }
}

async fn run_external(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> (StatusCode, Json<serde_json::Value>) {
    if !authorized(&state, &headers) {
        return unauthorized();
    }

    match external_service_runner::run_external_service_checks(&state).await {
        Ok(result) => (
            StatusCode::OK,
            Json(serde_json::to_value(result).unwrap_or_else(|_| json!({}))),
        ),
        Err(error) => {
            error!(%error, "external run failed");
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "error": error.to_string() })),
            )
        }
    }
}

async fn run_single(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(monitor_id): Path<String>,
) -> (StatusCode, Json<serde_json::Value>) {
    if !authorized(&state, &headers) {
        return unauthorized();
    }

    match runner::run_single_check(&state, &monitor_id).await {
        Ok(result) => (
            StatusCode::OK,
            Json(serde_json::to_value(result).unwrap_or_else(|_| json!({}))),
        ),
        Err(error) => {
            error!(%error, monitor_id = %monitor_id, "manual check failed");
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "error": error.to_string() })),
            )
        }
    }
}

fn authorized(state: &AppState, headers: &HeaderMap) -> bool {
    headers
        .get("x-worker-secret")
        .and_then(|value| value.to_str().ok())
        .is_some_and(|secret| secret == state.config.worker_secret)
}

fn unauthorized() -> (StatusCode, Json<serde_json::Value>) {
    (
        StatusCode::UNAUTHORIZED,
        Json(json!({ "error": "unauthorized" })),
    )
}

#[cfg(test)]
mod tests {
    use std::sync::Arc;

    use axum::body::{Body, to_bytes};
    use axum::http::{Request, StatusCode};
    use tower::ServiceExt;

    use crate::config::AppConfig;
    use crate::{AppState, http};

    fn test_state() -> AppState {
        AppState {
            config: Arc::new(AppConfig {
                database_url: "postgres://postgres:postgres@localhost/unstatus".to_string(),
                worker_secret: "secret".to_string(),
                port: 3001,
                region: "eu".to_string(),
                poll_interval_secs: 10,
                ext_poll_interval_secs: 60,
                check_concurrency: 20,
                inbound_api_key: None,
                inbound_from: None,
            }),
            db: sqlx::postgres::PgPoolOptions::new()
                .connect_lazy("postgres://postgres:postgres@localhost/unstatus")
                .expect("lazy pool should build"),
            http: reqwest::Client::new(),
        }
    }

    #[tokio::test]
    async fn health_route_returns_ok() {
        let response = http::create_router(test_state())
            .oneshot(
                Request::builder()
                    .uri("/health")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .expect("router should respond");

        assert_eq!(response.status(), StatusCode::OK);
        let body = to_bytes(response.into_body(), usize::MAX)
            .await
            .expect("body should read");
        let body = String::from_utf8(body.to_vec()).expect("body should be utf8");
        assert_eq!(body, r#"{"status":"ok"}"#);
    }

    #[tokio::test]
    async fn run_route_rejects_missing_secret() {
        let response = http::create_router(test_state())
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri("/run")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .expect("router should respond");

        assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    }
}
