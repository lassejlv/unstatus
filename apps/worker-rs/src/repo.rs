use chrono::{Duration, NaiveDateTime, Utc};
use cuid2::create_id;
use sqlx::{Row, query, query_as};

use crate::models::{
    CheckResult, DUE_BATCH_SIZE, EXTERNAL_DUE_BATCH_SIZE, ExternalServiceRow, IncidentRow,
    MaintenanceWindowRow, MonitorCheckApi, MonitorCheckRow, MonitorNameRow, NotificationChannelRow,
    WorkerMonitorRow,
};

const MONITOR_SELECT: &str = r#"
SELECT
  id,
  "organizationId",
  name,
  type,
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
  "autoIncidents",
  "lastCheckedAt",
  "nextCheckAt"
FROM monitor
"#;

pub async fn get_monitor_by_id(
    pool: &sqlx::PgPool,
    monitor_id: &str,
) -> anyhow::Result<WorkerMonitorRow> {
    let query = format!("{MONITOR_SELECT} WHERE id = $1 LIMIT 1");
    let monitor = query_as::<_, WorkerMonitorRow>(&query)
        .bind(monitor_id)
        .fetch_optional(pool)
        .await?;

    monitor.ok_or_else(|| anyhow::anyhow!("Monitor {monitor_id} not found"))
}

pub async fn list_due_monitors(
    pool: &sqlx::PgPool,
    now: NaiveDateTime,
    region: &str,
) -> Result<Vec<WorkerMonitorRow>, sqlx::Error> {
    let query = format!(
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

    query_as::<_, WorkerMonitorRow>(&query)
        .bind(now)
        .bind(region)
        .fetch_all(pool)
        .await
}

pub async fn list_legacy_due_monitors(
    pool: &sqlx::PgPool,
    now: NaiveDateTime,
    region: &str,
) -> anyhow::Result<Vec<WorkerMonitorRow>> {
    let query = format!(
        r#"
{MONITOR_SELECT}
WHERE active = true
  AND COALESCE(regions, '[]'::jsonb) @> jsonb_build_array($2::text)
  AND ("lastCheckedAt" IS NULL OR "lastCheckedAt" + make_interval(secs => interval) <= $1)
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

    Ok(query_as::<_, WorkerMonitorRow>(&query)
        .bind(now)
        .bind(region)
        .fetch_all(pool)
        .await?)
}

pub async fn claim_due_monitor(
    pool: &sqlx::PgPool,
    monitor: &WorkerMonitorRow,
    now: NaiveDateTime,
) -> anyhow::Result<bool> {
    let claimed_until = now + Duration::seconds(monitor.interval as i64);
    let row = query(
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
    .bind(&monitor.id)
    .fetch_optional(pool)
    .await?;

    Ok(row.is_some())
}

pub async fn claim_legacy_monitor(
    pool: &sqlx::PgPool,
    monitor: &WorkerMonitorRow,
    now: NaiveDateTime,
) -> anyhow::Result<bool> {
    let row = query(
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
    .bind(&monitor.id)
    .bind(now)
    .bind(monitor.last_checked_at)
    .fetch_optional(pool)
    .await?;

    Ok(row.is_some())
}

pub async fn record_monitor_check(
    pool: &sqlx::PgPool,
    monitor: &WorkerMonitorRow,
    result: &CheckResult,
    region: &str,
    checked_at: NaiveDateTime,
) -> anyhow::Result<MonitorCheckApi> {
    match record_monitor_check_full(pool, monitor, result, region, checked_at).await {
        Ok(check) => Ok(check),
        Err(error) if is_missing_monitor_perf_schema(&error) => {
            record_monitor_check_legacy(pool, monitor, result, region, checked_at).await
        }
        Err(error) => Err(error.into()),
    }
}

async fn record_monitor_check_full(
    pool: &sqlx::PgPool,
    monitor: &WorkerMonitorRow,
    result: &CheckResult,
    region: &str,
    checked_at: NaiveDateTime,
) -> Result<MonitorCheckApi, sqlx::Error> {
    let mut tx = pool.begin().await?;
    let next_check_at = checked_at + Duration::seconds(monitor.interval as i64);
    let check_id = create_id();

    let check = query_as::<_, MonitorCheckRow>(
        r#"
INSERT INTO monitor_check
  ("id", "monitorId", "status", "latency", "statusCode", "message", "region", "responseHeaders", "responseBody", "checkedAt")
VALUES
  ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
RETURNING
  id,
  "monitorId",
  status,
  latency,
  "statusCode",
  message,
  region,
  "responseHeaders",
  "responseBody",
  "checkedAt"
"#,
    )
    .bind(check_id)
    .bind(&monitor.id)
    .bind(&result.status)
    .bind(result.latency)
    .bind(result.status_code)
    .bind(result.message.as_deref())
    .bind(region)
    .bind(result.response_headers.clone())
    .bind(result.response_body.as_deref())
    .bind(checked_at)
    .fetch_one(&mut *tx)
    .await?;

    query(
        r#"
UPDATE monitor
SET "lastCheckedAt" = $2,
    "nextCheckAt" = $3,
    "lastStatus" = $4,
    "lastLatency" = $5,
    "lastStatusCode" = $6,
    "lastRegion" = $7,
    "lastMessage" = $8,
    "updatedAt" = $2
WHERE id = $1
"#,
    )
    .bind(&monitor.id)
    .bind(checked_at)
    .bind(next_check_at)
    .bind(&result.status)
    .bind(result.latency)
    .bind(result.status_code)
    .bind(region)
    .bind(result.message.as_deref())
    .execute(&mut *tx)
    .await?;

    query(
        r#"
INSERT INTO monitor_check_hourly_rollup
  ("monitorId", "bucketStart", "totalChecks", "upChecks", "downChecks", "degradedChecks", "latencySum")
VALUES
  ($1, date_trunc('hour', $2::timestamp), 1, $3, $4, $5, $6)
ON CONFLICT ("monitorId", "bucketStart")
DO UPDATE SET
  "totalChecks" = monitor_check_hourly_rollup."totalChecks" + EXCLUDED."totalChecks",
  "upChecks" = monitor_check_hourly_rollup."upChecks" + EXCLUDED."upChecks",
  "downChecks" = monitor_check_hourly_rollup."downChecks" + EXCLUDED."downChecks",
  "degradedChecks" = monitor_check_hourly_rollup."degradedChecks" + EXCLUDED."degradedChecks",
  "latencySum" = monitor_check_hourly_rollup."latencySum" + EXCLUDED."latencySum"
"#,
    )
    .bind(&monitor.id)
    .bind(checked_at)
    .bind((result.status == "up") as i32)
    .bind((result.status == "down") as i32)
    .bind((result.status == "degraded") as i32)
    .bind(result.latency)
    .execute(&mut *tx)
    .await?;

    query(
        r#"
INSERT INTO monitor_check_daily_rollup
  ("monitorId", "bucketDate", "totalChecks", "upChecks", "downChecks", "degradedChecks", "latencySum")
VALUES
  ($1, date_trunc('day', $2::timestamp), 1, $3, $4, $5, $6)
ON CONFLICT ("monitorId", "bucketDate")
DO UPDATE SET
  "totalChecks" = monitor_check_daily_rollup."totalChecks" + EXCLUDED."totalChecks",
  "upChecks" = monitor_check_daily_rollup."upChecks" + EXCLUDED."upChecks",
  "downChecks" = monitor_check_daily_rollup."downChecks" + EXCLUDED."downChecks",
  "degradedChecks" = monitor_check_daily_rollup."degradedChecks" + EXCLUDED."degradedChecks",
  "latencySum" = monitor_check_daily_rollup."latencySum" + EXCLUDED."latencySum"
"#,
    )
    .bind(&monitor.id)
    .bind(checked_at)
    .bind((result.status == "up") as i32)
    .bind((result.status == "down") as i32)
    .bind((result.status == "degraded") as i32)
    .bind(result.latency)
    .execute(&mut *tx)
    .await?;

    tx.commit().await?;

    Ok(check.into())
}

async fn record_monitor_check_legacy(
    pool: &sqlx::PgPool,
    monitor: &WorkerMonitorRow,
    result: &CheckResult,
    region: &str,
    checked_at: NaiveDateTime,
) -> anyhow::Result<MonitorCheckApi> {
    let mut tx = pool.begin().await?;
    let check = query_as::<_, MonitorCheckRow>(
        r#"
INSERT INTO monitor_check
  ("id", "monitorId", "status", "latency", "statusCode", "message", "region", "responseHeaders", "responseBody", "checkedAt")
VALUES
  ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
RETURNING
  id,
  "monitorId",
  status,
  latency,
  "statusCode",
  message,
  region,
  "responseHeaders",
  "responseBody",
  "checkedAt"
"#,
    )
    .bind(create_id())
    .bind(&monitor.id)
    .bind(&result.status)
    .bind(result.latency)
    .bind(result.status_code)
    .bind(result.message.as_deref())
    .bind(region)
    .bind(result.response_headers.clone())
    .bind(result.response_body.as_deref())
    .bind(checked_at)
    .fetch_one(&mut *tx)
    .await?;

    query(
        r#"
UPDATE monitor
SET "lastCheckedAt" = $2,
    "updatedAt" = $2
WHERE id = $1
"#,
    )
    .bind(&monitor.id)
    .bind(checked_at)
    .execute(&mut *tx)
    .await?;

    tx.commit().await?;
    Ok(check.into())
}

pub fn is_missing_monitor_perf_schema(error: &sqlx::Error) -> bool {
    let message = error.to_string();
    let code = error
        .as_database_error()
        .and_then(|database_error| database_error.code().as_deref().map(ToOwned::to_owned));

    matches!(code.as_deref(), Some("42P01") | Some("42703"))
        || message.contains("monitor_check_hourly_rollup")
        || message.contains("monitor_check_daily_rollup")
        || message.contains("nextCheckAt")
        || message.contains("lastStatus")
        || message.contains("does not exist")
}

pub async fn create_incident_if_missing(
    pool: &sqlx::PgPool,
    monitor: &WorkerMonitorRow,
) -> anyhow::Result<bool> {
    let mut tx = pool.begin().await?;
    let incident_id = create_id();
    let update_id = create_id();
    let incident_monitor_id = create_id();
    let now = Utc::now().naive_utc();
    let title = format!("{} is down", monitor.name);

    let created = query_as::<_, IncidentRow>(
        r#"
INSERT INTO incident ("id", "monitorId", "title", "status", "severity", "startedAt", "createdAt", "updatedAt")
SELECT $1, $2, $3, 'investigating', 'major', $4, $4, $4
WHERE NOT EXISTS (
  SELECT 1 FROM incident
  WHERE "monitorId" = $2 AND "resolvedAt" IS NULL
)
RETURNING id
"#,
    )
    .bind(&incident_id)
    .bind(&monitor.id)
    .bind(&title)
    .bind(now)
    .fetch_optional(&mut *tx)
    .await?;

    if created.is_none() {
        tx.rollback().await?;
        return Ok(false);
    }

    query(
        r#"
INSERT INTO incident_update ("id", "incidentId", "status", "message", "createdAt")
VALUES ($1, $2, 'investigating', 'Monitor detected as down.', $3)
"#,
    )
    .bind(update_id)
    .bind(&incident_id)
    .bind(now)
    .execute(&mut *tx)
    .await?;

    query(
        r#"
INSERT INTO incident_monitor ("id", "incidentId", "monitorId")
VALUES ($1, $2, $3)
"#,
    )
    .bind(incident_monitor_id)
    .bind(&incident_id)
    .bind(&monitor.id)
    .execute(&mut *tx)
    .await?;

    tx.commit().await?;
    Ok(true)
}

pub async fn resolve_open_incident(
    pool: &sqlx::PgPool,
    monitor: &WorkerMonitorRow,
) -> anyhow::Result<bool> {
    let mut tx = pool.begin().await?;
    let now = Utc::now().naive_utc();
    let updated = query_as::<_, IncidentRow>(
        r#"
WITH updated AS (
  UPDATE incident
  SET status = 'resolved',
      "resolvedAt" = $2,
      "updatedAt" = $2
  WHERE id = (
    SELECT id
    FROM incident
    WHERE "monitorId" = $1 AND "resolvedAt" IS NULL
    ORDER BY "startedAt" ASC
    LIMIT 1
  )
  RETURNING id
)
SELECT id FROM updated
"#,
    )
    .bind(&monitor.id)
    .bind(now)
    .fetch_optional(&mut *tx)
    .await?;

    let Some(incident) = updated else {
        tx.rollback().await?;
        return Ok(false);
    };

    query(
        r#"
INSERT INTO incident_update ("id", "incidentId", "status", "message", "createdAt")
VALUES ($1, $2, 'resolved', 'Monitor recovered automatically.', $3)
"#,
    )
    .bind(create_id())
    .bind(incident.id)
    .bind(now)
    .execute(&mut *tx)
    .await?;

    tx.commit().await?;
    Ok(true)
}

pub async fn list_due_external_services(
    pool: &sqlx::PgPool,
    now: NaiveDateTime,
) -> anyhow::Result<Vec<ExternalServiceRow>> {
    Ok(query_as::<_, ExternalServiceRow>(&format!(
        r#"
SELECT
  id,
  name,
  "statusPageApiUrl",
  "parserType",
  "parserConfig",
  "pollInterval",
  "nextFetchAt"
FROM external_service
WHERE active = true
  AND "statusPageApiUrl" IS NOT NULL
  AND ("nextFetchAt" IS NULL OR "nextFetchAt" <= $1)
ORDER BY COALESCE("nextFetchAt", to_timestamp(0)) ASC
LIMIT {EXTERNAL_DUE_BATCH_SIZE}
"#
    ))
    .bind(now)
    .fetch_all(pool)
    .await?)
}

pub async fn claim_external_service(
    pool: &sqlx::PgPool,
    service: &ExternalServiceRow,
    now: NaiveDateTime,
) -> anyhow::Result<bool> {
    let next_fetch_at = now + Duration::seconds(service.poll_interval as i64);
    let row = query(
        r#"
UPDATE external_service
SET "nextFetchAt" = $2,
    "updatedAt" = $3
WHERE id = $1
  AND active = true
  AND ("nextFetchAt" IS NULL OR "nextFetchAt" <= $3)
RETURNING id
"#,
    )
    .bind(&service.id)
    .bind(next_fetch_at)
    .bind(now)
    .fetch_optional(pool)
    .await?;

    Ok(row.is_some())
}

pub async fn record_external_service_status(
    pool: &sqlx::PgPool,
    service: &ExternalServiceRow,
    result: &crate::models::ExternalStatusResult,
    now: NaiveDateTime,
) -> anyhow::Result<()> {
    let mut tx = pool.begin().await?;
    let next_fetch_at = now + Duration::seconds(service.poll_interval as i64);

    query(
        r#"
UPDATE external_service
SET "currentStatus" = $2,
    "currentDescription" = $3,
    "lastFetchedAt" = $4,
    "lastFetchError" = NULL,
    "nextFetchAt" = $5,
    "updatedAt" = $4
WHERE id = $1
"#,
    )
    .bind(&service.id)
    .bind(&result.overall_status)
    .bind(&result.description)
    .bind(now)
    .bind(next_fetch_at)
    .execute(&mut *tx)
    .await?;

    for component in &result.components {
        query(
            r#"
INSERT INTO external_service_component
  ("id", "externalServiceId", "externalId", "name", "description", "groupName", "currentStatus", "updatedAt")
VALUES
  ($1, $2, $3, $4, $5, $6, $7, $8)
ON CONFLICT ("externalServiceId", "externalId")
DO UPDATE SET
  "name" = EXCLUDED."name",
  "description" = EXCLUDED."description",
  "groupName" = EXCLUDED."groupName",
  "currentStatus" = EXCLUDED."currentStatus",
  "updatedAt" = EXCLUDED."updatedAt"
"#,
        )
        .bind(create_id())
        .bind(&service.id)
        .bind(&component.external_id)
        .bind(&component.name)
        .bind(component.description.as_deref())
        .bind(component.group_name.as_deref())
        .bind(&component.status)
        .bind(now)
        .execute(&mut *tx)
        .await?;
    }

    let component_statuses = serde_json::Value::Object(
        result
            .components
            .iter()
            .map(|component| {
                (
                    component.external_id.clone(),
                    serde_json::Value::String(component.status.clone()),
                )
            })
            .collect(),
    );

    query(
        r#"
INSERT INTO external_service_status
  ("id", "externalServiceId", "status", "description", "incidentName", "componentStatuses", "checkedAt")
VALUES
  ($1, $2, $3, $4, $5, $6, $7)
"#,
    )
    .bind(create_id())
    .bind(&service.id)
    .bind(&result.overall_status)
    .bind(&result.description)
    .bind(result.active_incident_name.as_deref())
    .bind(component_statuses)
    .bind(now)
    .execute(&mut *tx)
    .await?;

    tx.commit().await?;
    Ok(())
}

pub async fn record_external_service_error(
    pool: &sqlx::PgPool,
    service_id: &str,
    message: &str,
    now: NaiveDateTime,
) -> anyhow::Result<()> {
    query(
        r#"
UPDATE external_service
SET "lastFetchError" = $2,
    "updatedAt" = $3
WHERE id = $1
"#,
    )
    .bind(service_id)
    .bind(message)
    .bind(now)
    .execute(pool)
    .await?;

    Ok(())
}

pub async fn delete_old_external_service_statuses(
    pool: &sqlx::PgPool,
    cutoff: NaiveDateTime,
) -> anyhow::Result<()> {
    query(r#"DELETE FROM external_service_status WHERE "checkedAt" < $1"#)
        .bind(cutoff)
        .execute(pool)
        .await?;
    Ok(())
}

pub async fn run_monitor_perf_maintenance_queries(
    pool: &sqlx::PgPool,
    now: NaiveDateTime,
    raw_cutoff: NaiveDateTime,
    hourly_cutoff: NaiveDateTime,
    hourly_backfill_cutoff: NaiveDateTime,
    daily_backfill_cutoff: NaiveDateTime,
) -> Result<(), sqlx::Error> {
    query(
        r#"
UPDATE monitor m
SET "lastCheckedAt" = latest."checkedAt",
    "nextCheckAt" = COALESCE(
      m."nextCheckAt",
      latest."checkedAt" + make_interval(secs => m.interval)
    ),
    "lastStatus" = latest.status,
    "lastLatency" = latest.latency,
    "lastStatusCode" = latest."statusCode",
    "lastRegion" = latest.region,
    "lastMessage" = latest.message,
    "updatedAt" = GREATEST(m."updatedAt", latest."checkedAt")
FROM (
  SELECT DISTINCT ON (mc."monitorId")
    mc."monitorId",
    mc.status,
    mc.latency,
    mc."statusCode",
    mc.region,
    mc.message,
    mc."checkedAt"
  FROM monitor_check mc
  ORDER BY mc."monitorId", mc."checkedAt" DESC
) latest
WHERE m.id = latest."monitorId"
"#,
    )
    .execute(pool)
    .await?;

    query(
        r#"
UPDATE monitor
SET "nextCheckAt" = COALESCE(
      "lastCheckedAt" + make_interval(secs => interval),
      $1
    ),
    "updatedAt" = $1
WHERE "nextCheckAt" IS NULL
"#,
    )
    .bind(now)
    .execute(pool)
    .await?;

    query(
        r#"
INSERT INTO monitor_check_hourly_rollup
  ("monitorId", "bucketStart", "totalChecks", "upChecks", "downChecks", "degradedChecks", "latencySum")
SELECT
  mc."monitorId",
  date_trunc('hour', mc."checkedAt") as "bucketStart",
  COUNT(*)::int as "totalChecks",
  COUNT(*) FILTER (WHERE mc.status = 'up')::int as "upChecks",
  COUNT(*) FILTER (WHERE mc.status = 'down')::int as "downChecks",
  COUNT(*) FILTER (WHERE mc.status = 'degraded')::int as "degradedChecks",
  COALESCE(SUM(mc.latency), 0)::int as "latencySum"
FROM monitor_check mc
WHERE mc."checkedAt" >= $1
GROUP BY mc."monitorId", date_trunc('hour', mc."checkedAt")
ON CONFLICT ("monitorId", "bucketStart")
DO UPDATE SET
  "totalChecks" = EXCLUDED."totalChecks",
  "upChecks" = EXCLUDED."upChecks",
  "downChecks" = EXCLUDED."downChecks",
  "degradedChecks" = EXCLUDED."degradedChecks",
  "latencySum" = EXCLUDED."latencySum"
"#,
    )
    .bind(hourly_backfill_cutoff)
    .execute(pool)
    .await?;

    query(
        r#"
INSERT INTO monitor_check_daily_rollup
  ("monitorId", "bucketDate", "totalChecks", "upChecks", "downChecks", "degradedChecks", "latencySum")
SELECT
  mc."monitorId",
  date_trunc('day', mc."checkedAt") as "bucketDate",
  COUNT(*)::int as "totalChecks",
  COUNT(*) FILTER (WHERE mc.status = 'up')::int as "upChecks",
  COUNT(*) FILTER (WHERE mc.status = 'down')::int as "downChecks",
  COUNT(*) FILTER (WHERE mc.status = 'degraded')::int as "degradedChecks",
  COALESCE(SUM(mc.latency), 0)::int as "latencySum"
FROM monitor_check mc
WHERE mc."checkedAt" >= $1
GROUP BY mc."monitorId", date_trunc('day', mc."checkedAt")
ON CONFLICT ("monitorId", "bucketDate")
DO UPDATE SET
  "totalChecks" = EXCLUDED."totalChecks",
  "upChecks" = EXCLUDED."upChecks",
  "downChecks" = EXCLUDED."downChecks",
  "degradedChecks" = EXCLUDED."degradedChecks",
  "latencySum" = EXCLUDED."latencySum"
"#,
    )
    .bind(daily_backfill_cutoff)
    .execute(pool)
    .await?;

    query(r#"DELETE FROM monitor_check WHERE "checkedAt" < $1"#)
        .bind(raw_cutoff)
        .execute(pool)
        .await?;

    query(r#"DELETE FROM monitor_check_hourly_rollup WHERE "bucketStart" < $1"#)
        .bind(hourly_cutoff)
        .execute(pool)
        .await?;

    Ok(())
}

pub async fn list_notification_channels(
    pool: &sqlx::PgPool,
    organization_id: &str,
    flag_column: &str,
) -> anyhow::Result<Vec<NotificationChannelRow>> {
    let query = format!(
        r#"
SELECT id, type, "webhookUrl", "recipientEmail"
FROM notification_channel
WHERE "organizationId" = $1
  AND enabled = true
  AND "{flag_column}" = true
"#
    );

    Ok(query_as::<_, NotificationChannelRow>(&query)
        .bind(organization_id)
        .fetch_all(pool)
        .await?)
}

pub async fn list_scheduled_maintenance_window_ids(
    pool: &sqlx::PgPool,
    now: NaiveDateTime,
) -> anyhow::Result<Vec<String>> {
    let rows = query(r#"SELECT id FROM maintenance_window WHERE status = 'scheduled' AND "scheduledStart" <= $1"#)
        .bind(now)
        .fetch_all(pool)
        .await?;

    Ok(rows
        .into_iter()
        .map(|row| row.get::<String, _>("id"))
        .collect())
}

pub async fn list_in_progress_maintenance_window_ids(
    pool: &sqlx::PgPool,
    now: NaiveDateTime,
) -> anyhow::Result<Vec<String>> {
    let rows = query(r#"SELECT id FROM maintenance_window WHERE status = 'in_progress' AND "scheduledEnd" <= $1"#)
        .bind(now)
        .fetch_all(pool)
        .await?;

    Ok(rows
        .into_iter()
        .map(|row| row.get::<String, _>("id"))
        .collect())
}

pub async fn start_maintenance_window(
    pool: &sqlx::PgPool,
    maintenance_window_id: &str,
    now: NaiveDateTime,
) -> anyhow::Result<Option<MaintenanceWindowRow>> {
    Ok(query_as::<_, MaintenanceWindowRow>(
        r#"
UPDATE maintenance_window
SET status = 'in_progress',
    "actualStart" = $2,
    "updatedAt" = $2
WHERE id = $1
  AND status = 'scheduled'
  AND "scheduledStart" <= $2
RETURNING id, "organizationId", title
"#,
    )
    .bind(maintenance_window_id)
    .bind(now)
    .fetch_optional(pool)
    .await?)
}

pub async fn complete_maintenance_window(
    pool: &sqlx::PgPool,
    maintenance_window_id: &str,
    now: NaiveDateTime,
) -> anyhow::Result<Option<MaintenanceWindowRow>> {
    Ok(query_as::<_, MaintenanceWindowRow>(
        r#"
UPDATE maintenance_window
SET status = 'completed',
    "actualEnd" = $2,
    "updatedAt" = $2
WHERE id = $1
  AND status = 'in_progress'
  AND "scheduledEnd" <= $2
RETURNING id, "organizationId", title
"#,
    )
    .bind(maintenance_window_id)
    .bind(now)
    .fetch_optional(pool)
    .await?)
}

pub async fn list_monitor_names_for_maintenance_window(
    pool: &sqlx::PgPool,
    maintenance_window_id: &str,
) -> anyhow::Result<Vec<String>> {
    let rows = query_as::<_, MonitorNameRow>(
        r#"
SELECT m.name
FROM maintenance_window_monitor mwm
JOIN monitor m ON m.id = mwm."monitorId"
WHERE mwm."maintenanceWindowId" = $1
"#,
    )
    .bind(maintenance_window_id)
    .fetch_all(pool)
    .await?;

    Ok(rows.into_iter().map(|row| row.name).collect())
}
