use anyhow::Result;
use sqlx::{PgPool, query, query_scalar};
use tracing::error;
use uuid::Uuid;

use crate::AppState;
use crate::notifications::{self, NotifyEvent};
use crate::types::{AutoIncidentMonitor, OpenIncident};

pub async fn handle_auto_incident(
    state: &AppState,
    monitor: AutoIncidentMonitor,
    status: &str,
    existing_incident: Option<OpenIncident>,
) -> Result<()> {
    if !monitor.auto_incidents {
        return Ok(());
    }

    if status == "down" && existing_incident.is_none() {
        create_auto_incident(&state.db, &monitor).await?;
        if let Err(err) = notifications::send_notifications(
            state,
            &monitor.organization_id,
            NotifyEvent::MonitorDown {
                monitor_name: monitor.name.clone(),
                message: None,
            },
        )
        .await
        {
            error!(%err, monitor_id = %monitor.id, "monitor down notification failed");
        }
    } else if status == "up"
        && let Some(incident) = existing_incident
    {
        resolve_auto_incident(&state.db, &incident).await?;
        if let Err(err) = notifications::send_notifications(
            state,
            &monitor.organization_id,
            NotifyEvent::MonitorRecovered {
                monitor_name: monitor.name.clone(),
            },
        )
        .await
        {
            error!(%err, monitor_id = %monitor.id, "monitor recovered notification failed");
        }
    }

    Ok(())
}

async fn create_auto_incident(pool: &PgPool, monitor: &AutoIncidentMonitor) -> Result<()> {
    let incident_id = Uuid::new_v4().to_string();
    let update_id = Uuid::new_v4().to_string();
    let relation_id = Uuid::new_v4().to_string();

    let mut tx = pool.begin().await?;

    query(
        r#"
        INSERT INTO incident
          (id, "monitorId", title, status, severity, "startedAt", "createdAt", "updatedAt")
        VALUES
          ($1, $2, $3, 'investigating', 'major', NOW(), NOW(), NOW())
        "#,
    )
    .bind(&incident_id)
    .bind(&monitor.id)
    .bind(format!("{} is down", monitor.name))
    .execute(&mut *tx)
    .await?;

    query(
        r#"
        INSERT INTO incident_update
          (id, "incidentId", status, message, "createdAt")
        VALUES
          ($1, $2, 'investigating', 'Monitor detected as down.', NOW())
        "#,
    )
    .bind(update_id)
    .bind(&incident_id)
    .execute(&mut *tx)
    .await?;

    query(
        r#"
        INSERT INTO incident_monitor
          (id, "incidentId", "monitorId")
        VALUES
          ($1, $2, $3)
        "#,
    )
    .bind(relation_id)
    .bind(&incident_id)
    .bind(&monitor.id)
    .execute(&mut *tx)
    .await?;

    tx.commit().await?;
    Ok(())
}

async fn resolve_auto_incident(pool: &PgPool, incident: &OpenIncident) -> Result<()> {
    let mut tx = pool.begin().await?;

    query(
        r#"
        UPDATE incident
        SET status = 'resolved',
            "resolvedAt" = NOW(),
            "updatedAt" = NOW()
        WHERE id = $1
        "#,
    )
    .bind(&incident.id)
    .execute(&mut *tx)
    .await?;

    query(
        r#"
        INSERT INTO incident_update
          (id, "incidentId", status, message, "createdAt")
        VALUES
          ($1, $2, 'resolved', 'Monitor recovered automatically.', NOW())
        "#,
    )
    .bind(Uuid::new_v4().to_string())
    .bind(&incident.id)
    .execute(&mut *tx)
    .await?;

    tx.commit().await?;
    Ok(())
}

#[allow(dead_code)]
async fn _count_open_incidents(pool: &PgPool, monitor_id: &str) -> Result<i64> {
    query_scalar::<_, i64>(
        r#"
        SELECT COUNT(*)
        FROM incident
        WHERE "monitorId" = $1
          AND "resolvedAt" IS NULL
        "#,
    )
    .bind(monitor_id)
    .fetch_one(pool)
    .await
    .map_err(Into::into)
}
