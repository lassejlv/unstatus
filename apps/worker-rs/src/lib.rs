pub mod checkers;
pub mod config;
pub mod db;
pub mod external_service_runner;
pub mod http;
pub mod incidents;
pub mod maintenance;
pub mod notifications;
pub mod runner;
pub mod scheduler;
pub mod types;

use std::sync::Arc;

use anyhow::Context;
use axum::Router;
use reqwest::redirect::Policy;
use sqlx::PgPool;
use sqlx::postgres::PgPoolOptions;
use tokio::net::TcpListener;
use tracing::info;

use crate::config::AppConfig;

#[derive(Clone)]
pub struct AppState {
    pub config: Arc<AppConfig>,
    pub db: PgPool,
    pub http: reqwest::Client,
}

pub async fn run() -> anyhow::Result<()> {
    init_tracing();
    dotenvy::dotenv().ok();

    let config = Arc::new(AppConfig::from_env()?);
    let db = PgPoolOptions::new()
        .max_connections(25)
        .connect(&config.database_url)
        .await
        .context("failed to connect to postgres")?;

    let http = reqwest::Client::builder()
        .redirect(Policy::limited(10))
        .build()
        .context("failed to build http client")?;

    let state = AppState {
        config: Arc::clone(&config),
        db,
        http,
    };

    scheduler::start_schedulers(state.clone());

    let router: Router = http::create_router(state);
    let listener = TcpListener::bind(("0.0.0.0", config.port))
        .await
        .with_context(|| format!("failed to bind port {}", config.port))?;

    info!(port = config.port, region = %config.region, "worker-rs listening");

    axum::serve(listener, router)
        .with_graceful_shutdown(shutdown_signal())
        .await
        .context("server exited with error")
}

fn init_tracing() {
    let _ = tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "worker_rs=info,sqlx=warn".into()),
        )
        .try_init();
}

async fn shutdown_signal() {
    #[cfg(unix)]
    {
        use tokio::signal::unix::{SignalKind, signal};

        let mut terminate =
            signal(SignalKind::terminate()).expect("failed to install SIGTERM handler");
        tokio::select! {
            _ = tokio::signal::ctrl_c() => {},
            _ = terminate.recv() => {},
        }
    }

    #[cfg(not(unix))]
    {
        let _ = tokio::signal::ctrl_c().await;
    }
}
