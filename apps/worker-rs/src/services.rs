use chrono::{Duration, Utc};
use futures::stream::{self, StreamExt};
use tracing::{error, info};

use crate::checks::{external_status, http, ping, tcp};
use crate::models::{
    CheckResult, DAILY_BACKFILL_DAYS, ExternalServiceRow, HOURLY_BACKFILL_DAYS,
    HOURLY_RETENTION_DAYS, NotificationEvent, RAW_RETENTION_DAYS, RunChecksResult,
    RunExternalChecksResult, STATUS_RETENTION_DAYS, WorkerMonitorRow,
};
use crate::{SharedState, repo};

pub async fn run_single_check(
    state: SharedState,
    monitor_id: &str,
) -> anyhow::Result<crate::models::MonitorCheckApi> {
    let monitor = repo::get_monitor_by_id(&state.pool, monitor_id).await?;
    let result = run_monitor_check(&state, &monitor).await?;
    let checked_at = Utc::now().naive_utc();
    let check = repo::record_monitor_check(
        &state.pool,
        &monitor,
        &result,
        &state.config.region,
        checked_at,
    )
    .await?;

    handle_auto_incident(&state, &monitor, &result.status).await?;
    Ok(check)
}

pub async fn run_checks(state: SharedState) -> anyhow::Result<RunChecksResult> {
    let now = Utc::now().naive_utc();
    match repo::list_due_monitors(&state.pool, now, &state.config.region).await {
        Ok(monitors) => process_due_monitors(state, monitors, false).await,
        Err(error) if repo::is_missing_monitor_perf_schema(&error) => {
            let monitors =
                repo::list_legacy_due_monitors(&state.pool, now, &state.config.region).await?;
            process_due_monitors(state, monitors, true).await
        }
        Err(error) => Err(error.into()),
    }
}

pub async fn run_external_service_checks(
    state: SharedState,
) -> anyhow::Result<RunExternalChecksResult> {
    let now = Utc::now().naive_utc();
    let services = repo::list_due_external_services(&state.pool, now).await?;
    if services.is_empty() {
        return Ok(RunExternalChecksResult { checked: 0 });
    }

    let results = stream::iter(services.into_iter())
        .map(|service| {
            let state = state.clone();
            async move { process_external_service(state, service, now).await }
        })
        .buffer_unordered(16)
        .collect::<Vec<_>>()
        .await;

    let checked = results
        .iter()
        .filter(|result| matches!(result, Ok(true)))
        .count();
    for result in results {
        if let Err(error) = result {
            error!(error = ?error, "external service run failed");
        }
    }

    if checked > 0 {
        info!(checked, "checked external services");
    }

    Ok(RunExternalChecksResult { checked })
}

pub async fn run_external_service_maintenance(state: SharedState) -> anyhow::Result<()> {
    let cutoff = Utc::now().naive_utc() - Duration::days(STATUS_RETENTION_DAYS);
    repo::delete_old_external_service_statuses(&state.pool, cutoff).await
}

pub async fn run_monitor_perf_maintenance(state: SharedState) -> anyhow::Result<()> {
    let Ok(_guard) = state.perf_maintenance_lock.try_lock() else {
        return Ok(());
    };

    let now = Utc::now().naive_utc();
    let raw_cutoff = now - Duration::days(RAW_RETENTION_DAYS);
    let hourly_cutoff = now - Duration::days(HOURLY_RETENTION_DAYS);
    let hourly_backfill_cutoff = now - Duration::days(HOURLY_BACKFILL_DAYS);
    let daily_backfill_cutoff = now - Duration::days(DAILY_BACKFILL_DAYS);

    match repo::run_monitor_perf_maintenance_queries(
        &state.pool,
        now,
        raw_cutoff,
        hourly_cutoff,
        hourly_backfill_cutoff,
        daily_backfill_cutoff,
    )
    .await
    {
        Ok(()) => Ok(()),
        Err(error) if repo::is_missing_monitor_perf_schema(&error) => Ok(()),
        Err(error) => Err(error.into()),
    }
}

pub async fn process_maintenance_windows(state: SharedState) -> anyhow::Result<()> {
    let now = Utc::now().naive_utc();
    let to_start = repo::list_scheduled_maintenance_window_ids(&state.pool, now).await?;
    let mut started = 0usize;
    for maintenance_window_id in to_start {
        if let Some(window) =
            repo::start_maintenance_window(&state.pool, &maintenance_window_id, now).await?
        {
            let monitor_names =
                repo::list_monitor_names_for_maintenance_window(&state.pool, &window.id).await?;
            state
                .notifier
                .send(
                    &state.pool,
                    &window.organization_id,
                    NotificationEvent::MaintenanceStarted {
                        title: window.title.clone(),
                        monitor_names,
                    },
                )
                .await?;
            started += 1;
        }
    }

    let to_complete = repo::list_in_progress_maintenance_window_ids(&state.pool, now).await?;
    let mut completed = 0usize;
    for maintenance_window_id in to_complete {
        if let Some(window) =
            repo::complete_maintenance_window(&state.pool, &maintenance_window_id, now).await?
        {
            let monitor_names =
                repo::list_monitor_names_for_maintenance_window(&state.pool, &window.id).await?;
            state
                .notifier
                .send(
                    &state.pool,
                    &window.organization_id,
                    NotificationEvent::MaintenanceCompleted {
                        title: window.title.clone(),
                        monitor_names,
                    },
                )
                .await?;
            completed += 1;
        }
    }

    if started > 0 || completed > 0 {
        info!(started, completed, "maintenance transitions processed");
    }

    Ok(())
}

async fn process_due_monitors(
    state: SharedState,
    monitors: Vec<WorkerMonitorRow>,
    legacy: bool,
) -> anyhow::Result<RunChecksResult> {
    let now = Utc::now().naive_utc();
    let total = monitors.len();
    let results = stream::iter(monitors.into_iter())
        .map(|monitor| {
            let state = state.clone();
            async move {
                let claimed = if legacy {
                    repo::claim_legacy_monitor(&state.pool, &monitor, now).await?
                } else {
                    repo::claim_due_monitor(&state.pool, &monitor, now).await?
                };

                if !claimed {
                    return Ok::<(), anyhow::Error>(());
                }

                let result = run_monitor_check(&state, &monitor).await?;
                let checked_at = Utc::now().naive_utc();
                repo::record_monitor_check(
                    &state.pool,
                    &monitor,
                    &result,
                    &state.config.region,
                    checked_at,
                )
                .await?;
                handle_auto_incident(&state, &monitor, &result.status).await?;
                Ok(())
            }
        })
        .buffer_unordered(32)
        .collect::<Vec<_>>()
        .await;

    let failed = results.iter().filter(|result| result.is_err()).count();
    for result in results {
        if let Err(error) = result {
            error!(error = ?error, "monitor check failed");
        }
    }

    Ok(RunChecksResult { total, failed })
}

async fn process_external_service(
    state: SharedState,
    service: ExternalServiceRow,
    now: chrono::NaiveDateTime,
) -> anyhow::Result<bool> {
    if !repo::claim_external_service(&state.pool, &service, now).await? {
        return Ok(false);
    }

    match external_status::check_external_service(
        &state.http_client,
        &service.parser_type,
        service.status_page_api_url.as_deref().unwrap_or_default(),
    )
    .await
    {
        Ok(result) => {
            repo::record_external_service_status(&state.pool, &service, &result, now).await?;
            Ok(true)
        }
        Err(error) => {
            let message = error.to_string();
            error!(service = %service.name, error = %message, "external service check failed");
            repo::record_external_service_error(&state.pool, &service.id, &message, now).await?;
            Ok(false)
        }
    }
}

async fn run_monitor_check(
    state: &SharedState,
    monitor: &WorkerMonitorRow,
) -> anyhow::Result<CheckResult> {
    match monitor.monitor_type.as_str() {
        "tcp" => tcp::check_tcp(monitor).await,
        "ping" => ping::check_ping(monitor).await,
        _ => http::check_http(&state.http_client, monitor).await,
    }
}

async fn handle_auto_incident(
    state: &SharedState,
    monitor: &WorkerMonitorRow,
    status: &str,
) -> anyhow::Result<()> {
    if !monitor.auto_incidents {
        return Ok(());
    }

    if status == "down" {
        if repo::create_incident_if_missing(&state.pool, monitor).await? {
            state
                .notifier
                .send(
                    &state.pool,
                    &monitor.organization_id,
                    NotificationEvent::MonitorDown {
                        monitor_name: monitor.name.clone(),
                        message: None,
                    },
                )
                .await?;
        }
    } else if status == "up" && repo::resolve_open_incident(&state.pool, monitor).await? {
        state
            .notifier
            .send(
                &state.pool,
                &monitor.organization_id,
                NotificationEvent::MonitorRecovered {
                    monitor_name: monitor.name.clone(),
                },
            )
            .await?;
    }

    Ok(())
}
