use std::collections::HashMap;
use std::sync::Arc;

use anyhow::{Result, anyhow};
use futures::future::join_all;
use tokio::sync::Semaphore;
use tracing::error;

use crate::AppState;
use crate::checkers;
use crate::db::{checks as checks_db, monitors as monitors_db};
use crate::incidents;
use crate::types::{
    AutoIncidentMonitor, CheckResult, MonitorCheckRecord, OpenIncident, RunChecksResponse,
    WorkerMonitor, current_time, get_next_check_at, is_missing_monitor_perf_schema,
};

pub async fn run_single_check(state: &AppState, monitor_id: &str) -> Result<MonitorCheckRecord> {
    let monitor = monitors_db::get_monitor_by_id(&state.db, monitor_id).await?;
    let result = run_monitor_check(state, &monitor).await;
    let checked_at = current_time();

    let check = match checks_db::record_monitor_check(
        &state.db,
        &monitor,
        &result,
        &state.config.region,
        checked_at,
    )
    .await
    {
        Ok(check) => check,
        Err(error) if is_missing_monitor_perf_schema(error.as_ref()) => {
            checks_db::record_monitor_check_legacy(
                &state.db,
                &monitor,
                &result,
                &state.config.region,
                checked_at,
            )
            .await?
        }
        Err(error) => return Err(error),
    };

    if monitor.auto_incidents {
        let existing = monitors_db::find_open_incident(&state.db, &monitor.id).await?;
        let incident_monitor = AutoIncidentMonitor {
            id: monitor.id.clone(),
            name: monitor.name.clone(),
            organization_id: monitor.organization_id.clone(),
            auto_incidents: monitor.auto_incidents,
        };

        let state = state.clone();
        let status = result.status.clone();
        tokio::spawn(async move {
            if let Err(error) =
                incidents::handle_auto_incident(&state, incident_monitor, &status, existing).await
            {
                error!(%error, "auto incident handling failed");
            }
        });
    }

    Ok(check)
}

pub async fn run_checks(state: &AppState) -> Result<RunChecksResponse> {
    let now = current_time();

    match monitors_db::list_due_monitors(&state.db, now, &state.config.region).await {
        Ok(monitors) => process_due_monitors(state, monitors, now, false).await,
        Err(error) => {
            if !is_missing_monitor_perf_schema(error.as_ref()) {
                return Err(error);
            }

            let monitors =
                monitors_db::list_legacy_due_monitors(&state.db, now, &state.config.region).await?;
            process_due_monitors(state, monitors, now, true).await
        }
    }
}

async fn process_due_monitors(
    state: &AppState,
    monitors: Vec<WorkerMonitor>,
    now: chrono::NaiveDateTime,
    legacy: bool,
) -> Result<RunChecksResponse> {
    let open_incident_map = load_open_incidents(&state.db, &monitors).await?;
    let open_incident_map = Arc::new(open_incident_map);
    let semaphore = Arc::new(Semaphore::new(state.config.check_concurrency));

    let futures = monitors.iter().map(|monitor| {
        let state = state.clone();
        let semaphore = semaphore.clone();
        let open_incident_map = open_incident_map.clone();
        let monitor = monitor.clone();

        async move {
            let _permit = semaphore
                .acquire_owned()
                .await
                .map_err(|_| anyhow!("semaphore closed"))?;
            let claimed = if legacy {
                monitors_db::claim_legacy_monitor(
                    &state.db,
                    &monitor.id,
                    monitor.last_checked_at,
                    now,
                )
                .await?
            } else {
                let claimed_until = get_next_check_at(monitor.interval, now);
                monitors_db::claim_due_monitor(&state.db, &monitor.id, claimed_until, now).await?
            };

            if !claimed {
                return Ok::<bool, anyhow::Error>(false);
            }

            let result = run_monitor_check(&state, &monitor).await;
            let checked_at = current_time();

            if legacy {
                checks_db::record_monitor_check_legacy(
                    &state.db,
                    &monitor,
                    &result,
                    &state.config.region,
                    checked_at,
                )
                .await?
            } else {
                match checks_db::record_monitor_check(
                    &state.db,
                    &monitor,
                    &result,
                    &state.config.region,
                    checked_at,
                )
                .await
                {
                    Ok(check) => check,
                    Err(error) if is_missing_monitor_perf_schema(error.as_ref()) => {
                        checks_db::record_monitor_check_legacy(
                            &state.db,
                            &monitor,
                            &result,
                            &state.config.region,
                            checked_at,
                        )
                        .await?
                    }
                    Err(error) => return Err(error),
                }
            };

            if monitor.auto_incidents {
                let incident_monitor = AutoIncidentMonitor {
                    id: monitor.id.clone(),
                    name: monitor.name.clone(),
                    organization_id: monitor.organization_id.clone(),
                    auto_incidents: monitor.auto_incidents,
                };
                incidents::handle_auto_incident(
                    &state,
                    incident_monitor,
                    &result.status,
                    open_incident_map.get(&monitor.id).cloned(),
                )
                .await?;
            }
            Ok(true)
        }
    });

    let results = join_all(futures).await;
    let failed = results.iter().filter(|result| result.is_err()).count();
    Ok(RunChecksResponse {
        total: monitors.len(),
        failed,
    })
}

async fn run_monitor_check(state: &AppState, monitor: &WorkerMonitor) -> CheckResult {
    match monitor.kind.as_str() {
        "tcp" => checkers::tcp::check_tcp(monitor).await,
        "ping" => checkers::ping::check_ping(monitor).await,
        "redis" => checkers::redis::check_redis(monitor).await,
        "postgres" => checkers::postgres::check_postgres(monitor).await,
        _ => checkers::http::check_http(&state.http, monitor).await,
    }
}

async fn load_open_incidents(
    pool: &sqlx::PgPool,
    monitors: &[WorkerMonitor],
) -> Result<HashMap<String, OpenIncident>> {
    let auto_ids = monitors
        .iter()
        .filter(|monitor| monitor.auto_incidents)
        .map(|monitor| monitor.id.clone())
        .collect::<Vec<_>>();

    let incidents = monitors_db::list_open_incidents(pool, &auto_ids).await?;
    Ok(incidents
        .into_iter()
        .map(|incident| (incident.monitor_id.clone(), incident))
        .collect())
}
