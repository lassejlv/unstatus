use std::collections::HashMap;

use anyhow::Result;
use chrono::NaiveDateTime;
use sqlx::{PgPool, query, query_as};

use crate::types::{
    DAILY_BACKFILL_DAYS, HOURLY_BACKFILL_DAYS, HOURLY_RETENTION_DAYS, MaintenanceWindowRow,
    RAW_RETENTION_DAYS,
};

#[derive(Debug, sqlx::FromRow)]
struct MaintenanceMonitorName {
    maintenance_window_id: String,
    name: String,
}

pub async fn list_windows_to_start(
    pool: &PgPool,
    now: NaiveDateTime,
) -> Result<Vec<MaintenanceWindowRow>> {
    query_as::<_, MaintenanceWindowRow>(
        r#"
        SELECT id, "organizationId" AS organization_id, title
        FROM maintenance_window
        WHERE status = 'scheduled'
          AND "scheduledStart" <= $1
        "#,
    )
    .bind(now)
    .fetch_all(pool)
    .await
    .map_err(Into::into)
}

pub async fn list_windows_to_complete(
    pool: &PgPool,
    now: NaiveDateTime,
) -> Result<Vec<MaintenanceWindowRow>> {
    query_as::<_, MaintenanceWindowRow>(
        r#"
        SELECT id, "organizationId" AS organization_id, title
        FROM maintenance_window
        WHERE status = 'in_progress'
          AND "scheduledEnd" <= $1
        "#,
    )
    .bind(now)
    .fetch_all(pool)
    .await
    .map_err(Into::into)
}

pub async fn list_monitor_names_by_window(
    pool: &PgPool,
    ids: &[String],
) -> Result<HashMap<String, Vec<String>>> {
    if ids.is_empty() {
        return Ok(HashMap::new());
    }

    let rows = query_as::<_, MaintenanceMonitorName>(
        r#"
        SELECT
          mwm."maintenanceWindowId" AS maintenance_window_id,
          m.name
        FROM maintenance_window_monitor mwm
        JOIN monitor m ON m.id = mwm."monitorId"
        WHERE mwm."maintenanceWindowId" = ANY($1)
        ORDER BY m.name ASC
        "#,
    )
    .bind(ids)
    .fetch_all(pool)
    .await?;

    let mut grouped = HashMap::new();
    for row in rows {
        grouped
            .entry(row.maintenance_window_id)
            .or_insert_with(Vec::new)
            .push(row.name);
    }
    Ok(grouped)
}

pub async fn mark_windows_started(pool: &PgPool, ids: &[String], now: NaiveDateTime) -> Result<()> {
    if ids.is_empty() {
        return Ok(());
    }

    query(
        r#"
        UPDATE maintenance_window
        SET status = 'in_progress',
            "actualStart" = $2
        WHERE id = ANY($1)
        "#,
    )
    .bind(ids)
    .bind(now)
    .execute(pool)
    .await?;

    Ok(())
}

pub async fn mark_windows_completed(
    pool: &PgPool,
    ids: &[String],
    now: NaiveDateTime,
) -> Result<()> {
    if ids.is_empty() {
        return Ok(());
    }

    query(
        r#"
        UPDATE maintenance_window
        SET status = 'completed',
            "actualEnd" = $2
        WHERE id = ANY($1)
        "#,
    )
    .bind(ids)
    .bind(now)
    .execute(pool)
    .await?;

    Ok(())
}

pub async fn run_monitor_perf_maintenance(pool: &PgPool) -> Result<()> {
    let now = crate::types::current_time();
    let raw_cutoff = now - chrono::TimeDelta::days(RAW_RETENTION_DAYS);
    let hourly_cutoff = now - chrono::TimeDelta::days(HOURLY_RETENTION_DAYS);
    let hourly_backfill_cutoff = now - chrono::TimeDelta::days(HOURLY_BACKFILL_DAYS);
    let daily_backfill_cutoff = now - chrono::TimeDelta::days(DAILY_BACKFILL_DAYS);

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
              NOW()
            ),
            "updatedAt" = NOW()
        WHERE "nextCheckAt" IS NULL
        "#,
    )
    .execute(pool)
    .await?;

    query(
        r#"
        INSERT INTO monitor_check_hourly_rollup
          ("monitorId", "bucketStart", "totalChecks", "upChecks", "downChecks", "degradedChecks", "latencySum")
        SELECT
          mc."monitorId",
          date_trunc('hour', mc."checkedAt") AS "bucketStart",
          COUNT(*)::int AS "totalChecks",
          COUNT(*) FILTER (WHERE mc.status = 'up')::int AS "upChecks",
          COUNT(*) FILTER (WHERE mc.status = 'down')::int AS "downChecks",
          COUNT(*) FILTER (WHERE mc.status = 'degraded')::int AS "degradedChecks",
          COALESCE(SUM(mc.latency), 0)::int AS "latencySum"
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
          date_trunc('day', mc."checkedAt") AS "bucketDate",
          COUNT(*)::int AS "totalChecks",
          COUNT(*) FILTER (WHERE mc.status = 'up')::int AS "upChecks",
          COUNT(*) FILTER (WHERE mc.status = 'down')::int AS "downChecks",
          COUNT(*) FILTER (WHERE mc.status = 'degraded')::int AS "degradedChecks",
          COALESCE(SUM(mc.latency), 0)::int AS "latencySum"
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
