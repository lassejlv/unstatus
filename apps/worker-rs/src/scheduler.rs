use std::future::Future;
use std::sync::Arc;
use std::sync::atomic::{AtomicBool, Ordering};
use std::time::Duration;

use tracing::{error, info};

use crate::AppState;
use crate::db::maintenance as maintenance_db;
use crate::external_service_runner;
use crate::maintenance;
use crate::runner;

pub fn start_schedulers(state: AppState) {
    let poll_interval = Duration::from_secs(state.config.poll_interval_secs);
    let external_poll_interval = Duration::from_secs(state.config.ext_poll_interval_secs);
    let maintenance_interval = Duration::from_secs(30);
    let perf_interval = Duration::from_secs(6 * 60 * 60);

    info!(
        poll_interval_secs = state.config.poll_interval_secs,
        "worker polling configured"
    );
    info!(
        external_poll_interval_secs = state.config.ext_poll_interval_secs,
        "external polling configured"
    );

    let initial_state = state.clone();
    tokio::spawn(async move {
        if let Err(error) = maintenance_db::run_monitor_perf_maintenance(&initial_state.db).await {
            error!(%error, "initial perf maintenance failed");
        }
    });

    spawn_guarded_loop("monitor-checks", poll_interval, false, {
        let state = state.clone();
        move || {
            let state = state.clone();
            async move {
                runner::run_checks(&state).await?;
                Ok::<(), anyhow::Error>(())
            }
        }
    });

    spawn_guarded_loop("perf-maintenance", perf_interval, false, {
        let state = state.clone();
        move || {
            let state = state.clone();
            async move {
                maintenance_db::run_monitor_perf_maintenance(&state.db).await?;
                external_service_runner::run_external_service_maintenance(&state).await?;
                Ok::<(), anyhow::Error>(())
            }
        }
    });

    spawn_guarded_loop("maintenance-windows", maintenance_interval, false, {
        let state = state.clone();
        move || {
            let state = state.clone();
            async move {
                maintenance::process_maintenance_windows(&state).await?;
                Ok::<(), anyhow::Error>(())
            }
        }
    });

    spawn_guarded_loop("external-services", external_poll_interval, false, {
        move || {
            let state = state.clone();
            async move {
                external_service_runner::run_external_service_checks(&state).await?;
                Ok::<(), anyhow::Error>(())
            }
        }
    });
}

fn spawn_guarded_loop<F, Fut>(
    name: &'static str,
    interval: Duration,
    run_immediately: bool,
    task: F,
) where
    F: Fn() -> Fut + Send + Sync + 'static,
    Fut: Future<Output = anyhow::Result<()>> + Send + 'static,
{
    let running = Arc::new(AtomicBool::new(false));
    let task = Arc::new(task);

    tokio::spawn(async move {
        let mut ticker = tokio::time::interval(interval);
        ticker.set_missed_tick_behavior(tokio::time::MissedTickBehavior::Delay);

        if run_immediately {
            run_guarded(name, &running, &task).await;
        }

        ticker.tick().await;
        loop {
            ticker.tick().await;
            run_guarded(name, &running, &task).await;
        }
    });
}

async fn run_guarded<F, Fut>(name: &str, running: &AtomicBool, task: &Arc<F>)
where
    F: Fn() -> Fut + Send + Sync + 'static,
    Fut: Future<Output = anyhow::Result<()>> + Send + 'static,
{
    if running
        .compare_exchange(false, true, Ordering::SeqCst, Ordering::SeqCst)
        .is_err()
    {
        return;
    }

    if let Err(error) = (task.as_ref())().await {
        error!(task = name, %error, "scheduled task failed");
    }

    running.store(false, Ordering::SeqCst);
}
