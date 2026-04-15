use anyhow::Result;
use chrono::NaiveDateTime;
use sqlx::{PgPool, Postgres, Transaction, query_as};
use uuid::Uuid;

use crate::types::{
    CheckResult, MonitorCheckRecord, WorkerMonitor, get_next_check_at, get_status_count,
};

pub async fn record_monitor_check(
    pool: &PgPool,
    monitor: &WorkerMonitor,
    result: &CheckResult,
    region: &str,
    checked_at: NaiveDateTime,
) -> Result<MonitorCheckRecord> {
    let next_check_at = get_next_check_at(monitor.interval, checked_at);
    let mut tx = pool.begin().await?;

    let check = insert_monitor_check(&mut tx, monitor, result, region, checked_at).await?;

    sqlx::query(
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

    upsert_hourly_rollup(&mut tx, monitor, result, checked_at).await?;
    upsert_daily_rollup(&mut tx, monitor, result, checked_at).await?;

    tx.commit().await?;
    Ok(check)
}

pub async fn record_monitor_check_legacy(
    pool: &PgPool,
    monitor: &WorkerMonitor,
    result: &CheckResult,
    region: &str,
    checked_at: NaiveDateTime,
) -> Result<MonitorCheckRecord> {
    let mut tx = pool.begin().await?;
    let check = insert_monitor_check(&mut tx, monitor, result, region, checked_at).await?;

    sqlx::query(
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
    Ok(check)
}

async fn insert_monitor_check(
    tx: &mut Transaction<'_, Postgres>,
    monitor: &WorkerMonitor,
    result: &CheckResult,
    region: &str,
    checked_at: NaiveDateTime,
) -> Result<MonitorCheckRecord> {
    let check_id = Uuid::new_v4().to_string();

    query_as::<_, MonitorCheckRecord>(
        r#"
        INSERT INTO monitor_check
          (id, "monitorId", status, latency, "statusCode", message, "responseHeaders", "responseBody", region, "checkedAt")
        VALUES
          ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING
          id,
          "monitorId" AS monitor_id,
          status,
          latency,
          "statusCode" AS status_code,
          message,
          region,
          "responseHeaders" AS response_headers,
          "responseBody" AS response_body,
          "checkedAt" AS checked_at
        "#,
    )
    .bind(check_id)
    .bind(&monitor.id)
    .bind(&result.status)
    .bind(result.latency)
    .bind(result.status_code)
    .bind(result.message.as_deref())
    .bind(result.response_headers.as_ref())
    .bind(result.response_body.as_deref())
    .bind(region)
    .bind(checked_at)
    .fetch_one(&mut **tx)
    .await
    .map_err(Into::into)
}

async fn upsert_hourly_rollup(
    tx: &mut Transaction<'_, Postgres>,
    monitor: &WorkerMonitor,
    result: &CheckResult,
    checked_at: NaiveDateTime,
) -> Result<()> {
    sqlx::query(
        r#"
        INSERT INTO monitor_check_hourly_rollup
          ("monitorId", "bucketStart", "totalChecks", "upChecks", "downChecks", "degradedChecks", "latencySum")
        VALUES
          ($1, date_trunc('hour', $2::timestamp), 1, $3, $4, $5, $6)
        ON CONFLICT ("monitorId", "bucketStart")
        DO UPDATE SET
          "totalChecks" = monitor_check_hourly_rollup."totalChecks" + 1,
          "upChecks" = monitor_check_hourly_rollup."upChecks" + EXCLUDED."upChecks",
          "downChecks" = monitor_check_hourly_rollup."downChecks" + EXCLUDED."downChecks",
          "degradedChecks" = monitor_check_hourly_rollup."degradedChecks" + EXCLUDED."degradedChecks",
          "latencySum" = monitor_check_hourly_rollup."latencySum" + EXCLUDED."latencySum"
        "#,
    )
    .bind(&monitor.id)
    .bind(checked_at)
    .bind(get_status_count(&result.status, "up"))
    .bind(get_status_count(&result.status, "down"))
    .bind(get_status_count(&result.status, "degraded"))
    .bind(result.latency)
    .execute(&mut **tx)
    .await?;

    Ok(())
}

async fn upsert_daily_rollup(
    tx: &mut Transaction<'_, Postgres>,
    monitor: &WorkerMonitor,
    result: &CheckResult,
    checked_at: NaiveDateTime,
) -> Result<()> {
    sqlx::query(
        r#"
        INSERT INTO monitor_check_daily_rollup
          ("monitorId", "bucketDate", "totalChecks", "upChecks", "downChecks", "degradedChecks", "latencySum")
        VALUES
          ($1, date_trunc('day', $2::timestamp), 1, $3, $4, $5, $6)
        ON CONFLICT ("monitorId", "bucketDate")
        DO UPDATE SET
          "totalChecks" = monitor_check_daily_rollup."totalChecks" + 1,
          "upChecks" = monitor_check_daily_rollup."upChecks" + EXCLUDED."upChecks",
          "downChecks" = monitor_check_daily_rollup."downChecks" + EXCLUDED."downChecks",
          "degradedChecks" = monitor_check_daily_rollup."degradedChecks" + EXCLUDED."degradedChecks",
          "latencySum" = monitor_check_daily_rollup."latencySum" + EXCLUDED."latencySum"
        "#,
    )
    .bind(&monitor.id)
    .bind(checked_at)
    .bind(get_status_count(&result.status, "up"))
    .bind(get_status_count(&result.status, "down"))
    .bind(get_status_count(&result.status, "degraded"))
    .bind(result.latency)
    .execute(&mut **tx)
    .await?;

    Ok(())
}
