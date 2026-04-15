use anyhow::Result;
use chrono::NaiveDateTime;
use serde_json::{Map, Value};
use sqlx::{PgPool, Postgres, QueryBuilder, query, query_as};
use uuid::Uuid;

use crate::types::{ExternalServiceRow, ExternalStatusResult};

const DUE_BATCH_SIZE: i64 = 50;
const STATUS_RETENTION_DAYS: i64 = 90;

pub async fn list_due_external_services(
    pool: &PgPool,
    now: NaiveDateTime,
) -> Result<Vec<ExternalServiceRow>> {
    query_as::<_, ExternalServiceRow>(&format!(
        r#"
        SELECT
          id,
          name,
          "statusPageApiUrl" AS status_page_api_url,
          "parserType" AS parser_type,
          "parserConfig" AS parser_config,
          "pollInterval" AS poll_interval,
          "nextFetchAt" AS next_fetch_at
        FROM external_service
        WHERE active = true
          AND "statusPageApiUrl" IS NOT NULL
          AND ("nextFetchAt" IS NULL OR "nextFetchAt" <= $1)
        ORDER BY COALESCE("nextFetchAt", to_timestamp(0)) ASC
        LIMIT {DUE_BATCH_SIZE}
        "#
    ))
    .bind(now)
    .fetch_all(pool)
    .await
    .map_err(Into::into)
}

pub async fn claim_external_service(
    pool: &PgPool,
    service: &ExternalServiceRow,
    now: NaiveDateTime,
) -> Result<bool> {
    let next_fetch_at = now + chrono::TimeDelta::seconds(service.poll_interval as i64);
    let rows = query(
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
    .fetch_all(pool)
    .await?;

    Ok(!rows.is_empty())
}

pub async fn record_external_service_status(
    pool: &PgPool,
    service_id: &str,
    result: &ExternalStatusResult,
    now: NaiveDateTime,
    poll_interval: i32,
) -> Result<()> {
    let next_fetch_at = now + chrono::TimeDelta::seconds(poll_interval as i64);

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
    .bind(service_id)
    .bind(&result.overall_status)
    .bind(&result.description)
    .bind(now)
    .bind(next_fetch_at)
    .execute(pool)
    .await?;

    if !result.components.is_empty() {
        let mut builder = QueryBuilder::<Postgres>::new(
            r#"
            INSERT INTO external_service_component
              (id, "externalServiceId", "externalId", name, description, "groupName", "currentStatus", "updatedAt")
            "#,
        );

        builder.push_values(result.components.iter(), |mut row, component| {
            row.push_bind(Uuid::new_v4().to_string())
                .push_bind(service_id)
                .push_bind(&component.external_id)
                .push_bind(&component.name)
                .push_bind(component.description.as_deref())
                .push_bind(component.group_name.as_deref())
                .push_bind(&component.status)
                .push_bind(now);
        });

        builder.push(
            r#"
            ON CONFLICT ("externalServiceId", "externalId")
            DO UPDATE SET
              name = EXCLUDED.name,
              description = EXCLUDED.description,
              "groupName" = EXCLUDED."groupName",
              "currentStatus" = EXCLUDED."currentStatus",
              "updatedAt" = EXCLUDED."updatedAt"
            "#,
        );

        builder.build().execute(pool).await?;
    }

    let component_statuses = result
        .components
        .iter()
        .map(|component| {
            (
                component.external_id.clone(),
                Value::String(component.status.clone()),
            )
        })
        .collect::<Map<String, Value>>();

    query(
        r#"
        INSERT INTO external_service_status
          (id, "externalServiceId", status, description, "incidentName", "componentStatuses", "checkedAt")
        VALUES
          ($1, $2, $3, $4, $5, $6, $7)
        "#,
    )
    .bind(Uuid::new_v4().to_string())
    .bind(service_id)
    .bind(&result.overall_status)
    .bind(&result.description)
    .bind(result.active_incident_name.as_deref())
    .bind(Value::Object(component_statuses))
    .bind(now)
    .execute(pool)
    .await?;

    Ok(())
}

pub async fn record_external_service_error(
    pool: &PgPool,
    service_id: &str,
    error: &str,
    now: NaiveDateTime,
) -> Result<()> {
    query(
        r#"
        UPDATE external_service
        SET "lastFetchError" = $2,
            "updatedAt" = $3
        WHERE id = $1
        "#,
    )
    .bind(service_id)
    .bind(error)
    .bind(now)
    .execute(pool)
    .await?;

    Ok(())
}

pub async fn run_external_service_maintenance(pool: &PgPool) -> Result<()> {
    let cutoff = crate::types::current_time() - chrono::TimeDelta::days(STATUS_RETENTION_DAYS);
    query(r#"DELETE FROM external_service_status WHERE "checkedAt" < $1"#)
        .bind(cutoff)
        .execute(pool)
        .await?;
    Ok(())
}
