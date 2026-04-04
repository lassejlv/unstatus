use httpmock::prelude::*;
use serde_json::json;
use unstatus_rust_sdk::{
    Client, CreateIncidentInput, CreateMaintenanceInput, CreateMonitorInput,
    CreateNotificationInput, CreateStatusPageInput, IncidentSeverity, MonitorType,
    NotificationChannelSettings, PaginationParams, UnstatusError,
};

fn client(server: &MockServer) -> Client {
    Client::builder("usk_test")
        .base_url(format!("{}/api/v1", server.base_url()))
        .build()
        .expect("client should build")
}

#[tokio::test]
async fn injects_auth_headers_and_unwraps_list_responses() {
    let server = MockServer::start();
    let mock = server.mock(|when, then| {
        when.method(GET)
            .path("/api/v1/monitors")
            .query_param("limit", "5")
            .header("authorization", "Bearer usk_test")
            .header("user-agent", "@unstatus/rust-sdk");
        then.status(200).json_body(json!({
            "data": [{
                "id": "mon_1",
                "organizationId": "org_1",
                "name": "API",
                "type": "http",
                "active": true,
                "interval": 60,
                "timeout": 10,
                "url": "https://api.example.com",
                "method": "GET",
                "headers": null,
                "body": null,
                "host": null,
                "port": null,
                "rules": null,
                "regions": ["eu"],
                "autoIncidents": false,
                "createdAt": "2025-01-01T00:00:00.000Z",
                "updatedAt": "2025-01-01T00:00:00.000Z",
                "lastCheckedAt": null,
                "nextCheckAt": null,
                "lastStatus": null,
                "lastLatency": null,
                "lastStatusCode": null,
                "lastRegion": null,
                "lastMessage": null
            }],
            "pagination": { "total": 1, "limit": 5, "offset": 0, "hasMore": false }
        }));
    });

    let result = client(&server)
        .monitors()
        .list(Some(&PaginationParams {
            limit: Some(5),
            offset: None,
        }))
        .await
        .expect("list should succeed");

    mock.assert();
    assert_eq!(result.items[0].id, "mon_1");
    assert_eq!(result.pagination.total, 1);
}

#[tokio::test]
async fn serializes_mutation_bodies_and_unwraps_data() {
    let server = MockServer::start();
    let mock = server.mock(|when, then| {
        when.method(POST)
            .path("/api/v1/monitors")
            .header("content-type", "application/json")
            .json_body(json!({
                "name": "API",
                "type": "http",
                "url": "https://api.example.com"
            }));
        then.status(201).json_body(json!({
            "data": {
                "id": "mon_1",
                "organizationId": "org_1",
                "name": "API",
                "type": "http",
                "active": true,
                "interval": 60,
                "timeout": 10,
                "url": "https://api.example.com",
                "method": "GET",
                "headers": null,
                "body": null,
                "host": null,
                "port": null,
                "rules": null,
                "regions": ["eu"],
                "autoIncidents": false,
                "createdAt": "2025-01-01T00:00:00.000Z",
                "updatedAt": "2025-01-01T00:00:00.000Z",
                "lastCheckedAt": null,
                "nextCheckAt": null,
                "lastStatus": null,
                "lastLatency": null,
                "lastStatusCode": null,
                "lastRegion": null,
                "lastMessage": null
            }
        }));
    });

    let monitor = client(&server)
        .monitors()
        .create(&CreateMonitorInput {
            name: "API".into(),
            r#type: MonitorType::Http,
            url: Some("https://api.example.com".into()),
            ..Default::default()
        })
        .await
        .expect("create should succeed");

    mock.assert();
    assert_eq!(monitor.id, "mon_1");
    assert_eq!(monitor.name, "API");
}

#[tokio::test]
async fn maps_api_errors() {
    let server = MockServer::start();
    server.mock(|when, then| {
        when.method(POST).path("/api/v1/incidents");
        then.status(400).json_body(json!({
            "error": {
                "code": "BAD_REQUEST",
                "message": "title: Too small"
            }
        }));
    });

    let error = client(&server)
        .incidents()
        .create(&CreateIncidentInput {
            monitor_ids: vec![],
            title: String::new(),
            status: None,
            severity: Some(IncidentSeverity::Major),
            message: String::new(),
        })
        .await
        .expect_err("request should fail");

    match error {
        UnstatusError::Api {
            status,
            code,
            message,
            ..
        } => {
            assert_eq!(status.as_u16(), 400);
            assert_eq!(code, "BAD_REQUEST");
            assert_eq!(message, "title: Too small");
        }
        other => panic!("unexpected error: {other:?}"),
    }
}

#[tokio::test]
async fn maps_transport_failures() {
    let error = Client::builder("usk_test")
        .base_url("http://127.0.0.1:1/api/v1")
        .build()
        .expect("client should build")
        .organization()
        .get()
        .await
        .expect_err("request should fail");

    match error {
        UnstatusError::Transport(_) => {}
        other => panic!("unexpected error: {other:?}"),
    }
}

#[tokio::test]
async fn supports_maintenance_action_routes() {
    let server = MockServer::start();
    let mock = server.mock(|when, then| {
        when.method(POST).path("/api/v1/maintenance/mw_1/start");
        then.status(200).json_body(json!({
            "data": {
                "id": "mw_1",
                "organizationId": "org_1",
                "title": "Upgrade",
                "description": null,
                "scheduledStart": "2025-01-01T00:00:00.000Z",
                "scheduledEnd": "2025-01-01T01:00:00.000Z",
                "actualStart": "2025-01-01T00:05:00.000Z",
                "actualEnd": null,
                "status": "in_progress",
                "createdAt": "2025-01-01T00:00:00.000Z",
                "updatedAt": "2025-01-01T00:05:00.000Z",
                "monitors": []
            }
        }));
    });

    let window = client(&server)
        .maintenance()
        .start("mw_1")
        .await
        .expect("start should succeed");

    mock.assert();
    assert_eq!(window.id, "mw_1");
}

#[tokio::test]
async fn exposes_each_resource_group_with_one_happy_path() {
    let server = MockServer::start();

    server.mock(|when, then| {
        when.method(GET).path("/api/v1/incidents");
        then.status(200).json_body(json!({
            "data": [],
            "pagination": { "total": 0, "limit": 20, "offset": 0, "hasMore": false }
        }));
    });

    server.mock(|when, then| {
        when.method(GET).path("/api/v1/status-pages");
        then.status(200).json_body(json!({
            "data": [],
            "pagination": { "total": 0, "limit": 20, "offset": 0, "hasMore": false }
        }));
    });

    server.mock(|when, then| {
        when.method(GET).path("/api/v1/notifications");
        then.status(200).json_body(json!({
            "data": [],
            "pagination": { "total": 0, "limit": 20, "offset": 0, "hasMore": false }
        }));
    });

    server.mock(|when, then| {
        when.method(GET).path("/api/v1/organization");
        then.status(200).json_body(json!({
            "data": {
                "id": "org_1",
                "name": "Acme",
                "slug": "acme",
                "logo": null,
                "createdAt": "2025-01-01T00:00:00.000Z",
                "subscriptionActive": true,
                "subscriptionPlanName": "Pro",
                "cancelAtPeriodEnd": false,
                "plan": "pro"
            }
        }));
    });

    let client = client(&server);
    let incidents = client.incidents().list(None).await.expect("incidents");
    let status_pages = client
        .status_pages()
        .list(None)
        .await
        .expect("status pages");
    let notifications = client
        .notifications()
        .list(None)
        .await
        .expect("notifications");
    let org = client.organization().get().await.expect("organization");

    assert!(incidents.items.is_empty());
    assert!(status_pages.items.is_empty());
    assert!(notifications.items.is_empty());
    assert_eq!(org.slug, "acme");
}

#[tokio::test]
async fn serializes_status_pages_maintenance_and_notifications_payloads() {
    let server = MockServer::start();

    let status_page_mock = server.mock(|when, then| {
        when.method(POST)
            .path("/api/v1/status-pages")
            .json_body(json!({
                "name": "Acme Status",
                "slug": "acme"
            }));
        then.status(201).json_body(json!({
            "data": {
                "id": "sp_1",
                "organizationId": "org_1",
                "name": "Acme Status",
                "slug": "acme",
                "customDomain": null,
                "isPublic": true,
                "logoUrl": null,
                "faviconUrl": null,
                "brandColor": "#000000",
                "headerText": null,
                "footerText": null,
                "customCss": null,
                "customJs": null,
                "showResponseTimes": true,
                "showDependencies": false,
                "createdAt": "2025-01-01T00:00:00.000Z",
                "updatedAt": "2025-01-01T00:00:00.000Z",
                "monitors": []
            }
        }));
    });

    let maintenance_mock = server.mock(|when, then| {
        when.method(POST)
            .path("/api/v1/maintenance")
            .json_body(json!({
                "title": "Upgrade",
                "scheduledStart": "2025-01-01T00:00:00.000Z",
                "scheduledEnd": "2025-01-01T01:00:00.000Z",
                "monitorIds": ["mon_1"]
            }));
        then.status(201).json_body(json!({
            "data": {
                "id": "mw_1",
                "organizationId": "org_1",
                "title": "Upgrade",
                "description": null,
                "scheduledStart": "2025-01-01T00:00:00.000Z",
                "scheduledEnd": "2025-01-01T01:00:00.000Z",
                "actualStart": null,
                "actualEnd": null,
                "status": "scheduled",
                "createdAt": "2025-01-01T00:00:00.000Z",
                "updatedAt": "2025-01-01T00:00:00.000Z",
                "monitors": []
            }
        }));
    });

    let notifications_mock = server.mock(|when, then| {
        when.method(POST)
            .path("/api/v1/notifications")
            .json_body(json!({
                "type": "discord",
                "name": "Discord",
                "webhookUrl": "https://discord.example/webhook"
            }));
        then.status(201).json_body(json!({
            "data": {
                "id": "nc_1",
                "organizationId": "org_1",
                "name": "Discord",
                "type": "discord",
                "webhookUrl": "https://discord.example/webhook",
                "recipientEmail": null,
                "enabled": true,
                "onIncidentCreated": true,
                "onIncidentResolved": true,
                "onIncidentUpdated": true,
                "onMonitorDown": true,
                "onMonitorRecovered": true,
                "onMaintenanceScheduled": true,
                "onMaintenanceStarted": true,
                "onMaintenanceCompleted": true,
                "createdAt": "2025-01-01T00:00:00.000Z",
                "updatedAt": "2025-01-01T00:00:00.000Z"
            }
        }));
    });

    let client = client(&server);

    let status_page = client
        .status_pages()
        .create(&CreateStatusPageInput {
            name: "Acme Status".into(),
            slug: "acme".into(),
            ..Default::default()
        })
        .await
        .expect("status page");

    let maintenance = client
        .maintenance()
        .create(&CreateMaintenanceInput {
            title: "Upgrade".into(),
            scheduled_start: "2025-01-01T00:00:00.000Z".into(),
            scheduled_end: "2025-01-01T01:00:00.000Z".into(),
            monitor_ids: vec!["mon_1".into()],
            ..Default::default()
        })
        .await
        .expect("maintenance");

    let notification = client
        .notifications()
        .create(&CreateNotificationInput::Discord {
            name: "Discord".into(),
            webhook_url: "https://discord.example/webhook".into(),
            recipient_email: None,
            settings: NotificationChannelSettings::default(),
        })
        .await
        .expect("notification");

    status_page_mock.assert();
    maintenance_mock.assert();
    notifications_mock.assert();

    assert_eq!(status_page.slug, "acme");
    assert_eq!(maintenance.id, "mw_1");
    assert_eq!(notification.id, "nc_1");
}
