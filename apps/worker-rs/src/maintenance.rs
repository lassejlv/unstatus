use anyhow::Result;
use futures::future::join_all;
use tracing::{error, info};

use crate::AppState;
use crate::db::maintenance as maintenance_db;
use crate::notifications::{self, NotifyEvent};

pub async fn process_maintenance_windows(state: &AppState) -> Result<()> {
    let now = crate::types::current_time();

    let to_start = maintenance_db::list_windows_to_start(&state.db, now).await?;
    if !to_start.is_empty() {
        let ids = to_start
            .iter()
            .map(|window| window.id.clone())
            .collect::<Vec<_>>();
        let monitor_names = maintenance_db::list_monitor_names_by_window(&state.db, &ids).await?;
        maintenance_db::mark_windows_started(&state.db, &ids, now).await?;

        let futures = to_start.into_iter().map(|window| {
            let monitor_names = monitor_names.get(&window.id).cloned().unwrap_or_default();
            let state = state.clone();
            async move {
                info!(maintenance_window_id = %window.id, "maintenance started");
                if let Err(error) = notifications::send_notifications(
                    &state,
                    &window.organization_id,
                    NotifyEvent::MaintenanceStarted {
                        title: window.title,
                        monitor_names,
                    },
                )
                .await
                {
                    error!(%error, maintenance_window_id = %window.id, "maintenance start notification failed");
                }
            }
        });

        join_all(futures).await;
    }

    let to_complete = maintenance_db::list_windows_to_complete(&state.db, now).await?;
    if !to_complete.is_empty() {
        let ids = to_complete
            .iter()
            .map(|window| window.id.clone())
            .collect::<Vec<_>>();
        let monitor_names = maintenance_db::list_monitor_names_by_window(&state.db, &ids).await?;
        maintenance_db::mark_windows_completed(&state.db, &ids, now).await?;

        let futures = to_complete.into_iter().map(|window| {
            let monitor_names = monitor_names.get(&window.id).cloned().unwrap_or_default();
            let state = state.clone();
            async move {
                info!(maintenance_window_id = %window.id, "maintenance completed");
                if let Err(error) = notifications::send_notifications(
                    &state,
                    &window.organization_id,
                    NotifyEvent::MaintenanceCompleted {
                        title: window.title,
                        monitor_names,
                    },
                )
                .await
                {
                    error!(%error, maintenance_window_id = %window.id, "maintenance completion notification failed");
                }
            }
        });

        join_all(futures).await;
    }

    Ok(())
}
