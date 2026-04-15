use std::sync::Arc;

use anyhow::Result;
use futures::future::join_all;
use tokio::sync::Semaphore;
use tracing::{error, info};

use crate::AppState;
use crate::checkers::external_status;
use crate::db::external as external_db;
use crate::types::RunExternalResponse;

pub async fn run_external_service_checks(state: &AppState) -> Result<RunExternalResponse> {
    let now = crate::types::current_time();
    let services = external_db::list_due_external_services(&state.db, now).await?;
    if services.is_empty() {
        return Ok(RunExternalResponse { checked: 0 });
    }

    let semaphore = Arc::new(Semaphore::new(10));
    let futures = services.into_iter().map(|service| {
        let state = state.clone();
        let semaphore = semaphore.clone();

        async move {
            let _permit = semaphore
                .acquire_owned()
                .await
                .expect("semaphore should stay open");
            let claimed = external_db::claim_external_service(&state.db, &service, now).await?;
            if !claimed {
                return Ok::<bool, anyhow::Error>(false);
            }

            let result = external_status::check_external_service(
                &state.http,
                &service.parser_type,
                service.status_page_api_url.as_deref().unwrap_or_default(),
            )
            .await;

            external_db::record_external_service_status(
                &state.db,
                &service.id,
                &result,
                now,
                service.poll_interval,
            )
            .await?;

            Ok(true)
        }
    });

    let mut checked = 0_usize;
    for result in join_all(futures).await {
        match result {
            Ok(true) => checked += 1,
            Ok(false) => {}
            Err(error) => error!(%error, "external service check failed"),
        }
    }

    if checked > 0 {
        info!(checked, "checked external services");
    }

    Ok(RunExternalResponse { checked })
}

pub async fn run_external_service_maintenance(state: &AppState) -> Result<()> {
    external_db::run_external_service_maintenance(&state.db).await
}
