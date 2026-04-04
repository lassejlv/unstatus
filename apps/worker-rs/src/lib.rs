pub mod api;
pub mod checks;
pub mod config;
pub mod error;
pub mod models;
pub mod notifier;
pub mod repo;
pub mod scheduler;
pub mod services;

use std::sync::Arc;

use anyhow::Context;
use axum::Router;
use config::Config;
use notifier::Notifier;
use reqwest::redirect::Policy;
use sqlx::postgres::PgPoolOptions;
use tokio::net::TcpListener;
use tokio::sync::Mutex;
use tracing::info;

pub type SharedState = Arc<AppState>;

pub struct AppState {
    pub config: Config,
    pub pool: sqlx::PgPool,
    pub http_client: reqwest::Client,
    pub notifier: Notifier,
    pub perf_maintenance_lock: Mutex<()>,
}

pub async fn run() -> anyhow::Result<()> {
    init_tracing();

    let config = Config::from_env()?;
    let http_client = build_http_client()?;
    let pool = PgPoolOptions::new()
        .max_connections(10)
        .connect(&config.database_url)
        .await
        .context("failed to connect to PostgreSQL")?;

    let state = Arc::new(AppState {
        notifier: Notifier::new(http_client.clone(), &config),
        config,
        pool,
        http_client,
        perf_maintenance_lock: Mutex::new(()),
    });

    if state.config.mode.is_active() {
        scheduler::spawn(state.clone());
        info!("worker mode=active, schedulers enabled");
    } else {
        info!("worker mode=shadow, schedulers disabled");
    }

    let app = Router::new().merge(api::router(state.clone()));
    let listener = TcpListener::bind(("0.0.0.0", state.config.port))
        .await
        .context("failed to bind worker listener")?;

    info!(port = state.config.port, region = %state.config.region, "worker-rs listening");

    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown_signal())
        .await
        .context("worker server failed")?;

    Ok(())
}

fn init_tracing() {
    let filter = tracing_subscriber::EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| "worker_rs=info,sqlx=warn".into());

    tracing_subscriber::fmt()
        .with_env_filter(filter)
        .with_target(false)
        .compact()
        .init();
}

fn build_http_client() -> anyhow::Result<reqwest::Client> {
    reqwest::Client::builder()
        .redirect(Policy::limited(10))
        .user_agent("Unstatus/worker-rs")
        .build()
        .context("failed to build reqwest client")
}

async fn shutdown_signal() {
    let ctrl_c = async {
        let _ = tokio::signal::ctrl_c().await;
    };

    #[cfg(unix)]
    let terminate = async {
        if let Ok(mut signal) =
            tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate())
        {
            signal.recv().await;
        }
    };

    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        _ = ctrl_c => {},
        _ = terminate => {},
    }
}
