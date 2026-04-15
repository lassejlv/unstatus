use anyhow::{Result, anyhow};
use chrono::NaiveDateTime;
use sqlx::{PgPool, query, query_as};

use crate::types::{DUE_BATCH_SIZE, OpenIncident, WorkerMonitor};

const MONITOR_SELECT: &str = r#"
    SELECT
      id,
      "organizationId" AS organization_id,
      name,
      type AS kind,
      active,
      interval,
      timeout,
      url,
      method,
      headers,
      body,
      host,
      port,
      rules,
      regions,
      "autoIncidents" AS auto_incidents,
      "createdAt" AS created_at,
      "updatedAt" AS updated_at,
      "lastCheckedAt" AS last_checked_at,
      "nextCheckAt" AS next_check_at
    FROM monitor
"#;

pub async fn get_monitor_by_id(pool: &PgPool, monitor_id: &str) -> Result<WorkerMonitor> {
    let sql = format!("{MONITOR_SELECT} WHERE id = $1 LIMIT 1");
    query_as::<_, WorkerMonitor>(&sql)
        .bind(monitor_id)
        .fetch_optional(pool)
        .await?
        .ok_or_else(|| anyhow!("Monitor {monitor_id} not found"))
}

pub async fn list_due_monitors(
    pool: &PgPool,
    now: NaiveDateTime,
    region: &str,
) -> Result<Vec<WorkerMonitor>> {
    let sql = format!(
        r#"
        {MONITOR_SELECT}
        WHERE active = true
          AND COALESCE(regions, '[]'::jsonb) @> jsonb_build_array($2::text)
          AND ("nextCheckAt" IS NULL OR "nextCheckAt" <= $1)
          AND id NOT IN (
            SELECT mwm."monitorId"
            FROM maintenance_window_monitor mwm
            JOIN maintenance_window mw ON mw.id = mwm."maintenanceWindowId"
            WHERE mw.status = 'in_progress'
          )
        ORDER BY COALESCE("nextCheckAt", to_timestamp(0)) ASC
        LIMIT {DUE_BATCH_SIZE}
        "#
    );

    query_as::<_, WorkerMonitor>(&sql)
        .bind(now)
        .bind(region)
        .fetch_all(pool)
        .await
        .map_err(Into::into)
}

pub async fn list_legacy_due_monitors(
    pool: &PgPool,
    now: NaiveDateTime,
    region: &str,
) -> Result<Vec<WorkerMonitor>> {
    let sql = format!(
        r#"
        {MONITOR_SELECT}
        WHERE active = true
          AND COALESCE(regions, '[]'::jsonb) @> jsonb_build_array($2::text)
          AND (
            "lastCheckedAt" IS NULL
            OR "lastCheckedAt" + make_interval(secs => interval) <= $1
          )
          AND id NOT IN (
            SELECT mwm."monitorId"
            FROM maintenance_window_monitor mwm
            JOIN maintenance_window mw ON mw.id = mwm."maintenanceWindowId"
            WHERE mw.status = 'in_progress'
          )
        ORDER BY COALESCE("lastCheckedAt", to_timestamp(0)) ASC
        LIMIT {DUE_BATCH_SIZE}
        "#
    );

    query_as::<_, WorkerMonitor>(&sql)
        .bind(now)
        .bind(region)
        .fetch_all(pool)
        .await
        .map_err(Into::into)
}

pub async fn claim_due_monitor(
    pool: &PgPool,
    monitor_id: &str,
    claimed_until: NaiveDateTime,
    now: NaiveDateTime,
) -> Result<bool> {
    let rows = query(
        r#"
        UPDATE monitor
        SET "nextCheckAt" = $2,
            "updatedAt" = $1
        WHERE id = $3
          AND active = true
          AND ("nextCheckAt" IS NULL OR "nextCheckAt" <= $1)
        RETURNING id
        "#,
    )
    .bind(now)
    .bind(claimed_until)
    .bind(monitor_id)
    .fetch_all(pool)
    .await?;

    Ok(!rows.is_empty())
}

pub async fn claim_legacy_monitor(
    pool: &PgPool,
    monitor_id: &str,
    previous_last_checked_at: Option<NaiveDateTime>,
    now: NaiveDateTime,
) -> Result<bool> {
    let rows = query(
        r#"
        UPDATE monitor
        SET "lastCheckedAt" = $2,
            "updatedAt" = $2
        WHERE id = $1
          AND active = true
          AND "lastCheckedAt" IS NOT DISTINCT FROM $3
        RETURNING id
        "#,
    )
    .bind(monitor_id)
    .bind(now)
    .bind(previous_last_checked_at)
    .fetch_all(pool)
    .await?;

    Ok(!rows.is_empty())
}

pub async fn list_open_incidents(
    pool: &PgPool,
    monitor_ids: &[String],
) -> Result<Vec<OpenIncident>> {
    if monitor_ids.is_empty() {
        return Ok(Vec::new());
    }

    query_as::<_, OpenIncident>(
        r#"
        SELECT id, "monitorId" AS monitor_id
        FROM incident
        WHERE "monitorId" = ANY($1)
          AND "resolvedAt" IS NULL
        "#,
    )
    .bind(monitor_ids)
    .fetch_all(pool)
    .await
    .map_err(Into::into)
}

pub async fn find_open_incident(pool: &PgPool, monitor_id: &str) -> Result<Option<OpenIncident>> {
    query_as::<_, OpenIncident>(
        r#"
        SELECT id, "monitorId" AS monitor_id
        FROM incident
        WHERE "monitorId" = $1
          AND "resolvedAt" IS NULL
        LIMIT 1
        "#,
    )
    .bind(monitor_id)
    .fetch_optional(pool)
    .await
    .map_err(Into::into)
}
