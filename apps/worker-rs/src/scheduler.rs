use tokio::time::{Instant, interval_at};
use tracing::error;

use crate::{SharedState, services};

pub fn spawn(state: SharedState) {
    spawn_run_checks(state.clone());
    spawn_perf_maintenance(state.clone());
    spawn_maintenance_windows(state.clone());
    spawn_external_checks(state);
}

fn spawn_run_checks(state: SharedState) {
    tokio::spawn(async move {
        let mut interval = interval_at(
            Instant::now() + state.config.poll_interval,
            state.config.poll_interval,
        );
        loop {
            interval.tick().await;
            if let Err(error) = services::run_checks(state.clone()).await {
                error!(error = ?error, "scheduled monitor checks failed");
            }
        }
    });
}

fn spawn_perf_maintenance(state: SharedState) {
    tokio::spawn(async move {
        if let Err(error) = services::run_monitor_perf_maintenance(state.clone()).await {
            error!(error = ?error, "initial perf maintenance failed");
        }

        let mut interval = interval_at(
            Instant::now() + state.config.maintenance_interval,
            state.config.maintenance_interval,
        );

        loop {
            interval.tick().await;
            if let Err(error) = services::run_monitor_perf_maintenance(state.clone()).await {
                error!(error = ?error, "scheduled perf maintenance failed");
            }
            if let Err(error) = services::run_external_service_maintenance(state.clone()).await {
                error!(error = ?error, "scheduled external service maintenance failed");
            }
        }
    });
}

fn spawn_maintenance_windows(state: SharedState) {
    tokio::spawn(async move {
        let mut interval = interval_at(
            Instant::now() + state.config.maintenance_poll_interval,
            state.config.maintenance_poll_interval,
        );
        loop {
            interval.tick().await;
            if let Err(error) = services::process_maintenance_windows(state.clone()).await {
                error!(error = ?error, "maintenance window processing failed");
            }
        }
    });
}

fn spawn_external_checks(state: SharedState) {
    tokio::spawn(async move {
        let mut interval = interval_at(
            Instant::now() + state.config.ext_poll_interval,
            state.config.ext_poll_interval,
        );
        loop {
            interval.tick().await;
            if let Err(error) = services::run_external_service_checks(state.clone()).await {
                error!(error = ?error, "scheduled external service checks failed");
            }
        }
    });
}
