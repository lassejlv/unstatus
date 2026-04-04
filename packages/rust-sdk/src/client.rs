use crate::error::UnstatusError;
use crate::types::*;
use reqwest::{Method, StatusCode};
use serde::Serialize;
use serde::de::DeserializeOwned;
use serde_json::Value;
use std::sync::Arc;

const DEFAULT_BASE_URL: &str = "https://unstatus.app/api/v1";
const DEFAULT_USER_AGENT: &str = "@unstatus/rust-sdk";

#[derive(Debug, Clone)]
pub struct Client {
    inner: Arc<InnerClient>,
}

#[derive(Debug)]
struct InnerClient {
    http: reqwest::Client,
    base_url: String,
    api_key: String,
    user_agent: String,
}

#[derive(Debug, Clone)]
pub struct ClientBuilder {
    api_key: String,
    base_url: String,
    user_agent: String,
    http: Option<reqwest::Client>,
}

#[derive(Debug, serde::Deserialize)]
struct DataEnvelope<T> {
    data: T,
}

#[derive(Debug, serde::Deserialize)]
struct PaginatedEnvelope<T> {
    data: Vec<T>,
    pagination: Pagination,
}

#[derive(Debug, serde::Deserialize)]
struct ErrorEnvelope {
    error: Option<ApiErrorPayload>,
}

#[derive(Debug, serde::Deserialize)]
struct ApiErrorPayload {
    code: Option<String>,
    message: Option<String>,
}

impl Client {
    pub fn new(api_key: impl Into<String>) -> Result<Self, UnstatusError> {
        Self::builder(api_key).build()
    }

    pub fn builder(api_key: impl Into<String>) -> ClientBuilder {
        ClientBuilder {
            api_key: api_key.into(),
            base_url: DEFAULT_BASE_URL.to_string(),
            user_agent: DEFAULT_USER_AGENT.to_string(),
            http: None,
        }
    }

    pub fn monitors(&self) -> MonitorsClient {
        MonitorsClient {
            client: self.clone(),
        }
    }

    pub fn incidents(&self) -> IncidentsClient {
        IncidentsClient {
            client: self.clone(),
        }
    }

    pub fn status_pages(&self) -> StatusPagesClient {
        StatusPagesClient {
            client: self.clone(),
        }
    }

    pub fn maintenance(&self) -> MaintenanceClient {
        MaintenanceClient {
            client: self.clone(),
        }
    }

    pub fn notifications(&self) -> NotificationsClient {
        NotificationsClient {
            client: self.clone(),
        }
    }

    pub fn organization(&self) -> OrganizationClient {
        OrganizationClient {
            client: self.clone(),
        }
    }

    async fn request<T, B>(
        &self,
        method: Method,
        path: &str,
        query: Option<&[(&str, String)]>,
        body: Option<&B>,
    ) -> Result<T, UnstatusError>
    where
        T: DeserializeOwned,
        B: Serialize + ?Sized,
    {
        let payload = self
            .send::<DataEnvelope<T>, B>(method, path, query, body)
            .await?;
        Ok(payload.data)
    }

    async fn list<T>(
        &self,
        path: &str,
        params: Option<&PaginationParams>,
    ) -> Result<Paginated<T>, UnstatusError>
    where
        T: DeserializeOwned,
    {
        let query = pagination_to_query(params);
        let payload: PaginatedEnvelope<T> = self
            .send(Method::GET, path, query.as_deref(), Option::<&()>::None)
            .await?;
        Ok(Paginated {
            items: payload.data,
            pagination: payload.pagination,
        })
    }

    async fn send<T, B>(
        &self,
        method: Method,
        path: &str,
        query: Option<&[(&str, String)]>,
        body: Option<&B>,
    ) -> Result<T, UnstatusError>
    where
        T: DeserializeOwned,
        B: Serialize + ?Sized,
    {
        let url = format!("{}{}", self.inner.base_url, path);
        let mut request = self
            .inner
            .http
            .request(method, &url)
            .header("Accept", "application/json")
            .header("Authorization", format!("Bearer {}", self.inner.api_key))
            .header("User-Agent", &self.inner.user_agent);

        if let Some(query) = query {
            request = request.query(query);
        }

        if let Some(body) = body {
            request = request.json(body);
        }

        let response = request.send().await?;
        let status = response.status();
        let text = response.text().await?;

        if !status.is_success() {
            return Err(api_error_from_response(status, &text));
        }

        serde_json::from_str(&text).map_err(UnstatusError::from)
    }
}

impl ClientBuilder {
    pub fn base_url(mut self, base_url: impl Into<String>) -> Self {
        self.base_url = normalize_base_url(base_url.into());
        self
    }

    pub fn user_agent(mut self, user_agent: impl Into<String>) -> Self {
        self.user_agent = user_agent.into();
        self
    }

    pub fn http_client(mut self, http: reqwest::Client) -> Self {
        self.http = Some(http);
        self
    }

    pub fn build(self) -> Result<Client, UnstatusError> {
        let http = match self.http {
            Some(http) => http,
            None => reqwest::Client::builder()
                .build()
                .map_err(UnstatusError::Transport)?,
        };

        Ok(Client {
            inner: Arc::new(InnerClient {
                http,
                base_url: normalize_base_url(self.base_url),
                api_key: self.api_key,
                user_agent: self.user_agent,
            }),
        })
    }
}

fn normalize_base_url(base_url: String) -> String {
    base_url.trim_end_matches('/').to_string()
}

fn pagination_to_query(params: Option<&PaginationParams>) -> Option<Vec<(&'static str, String)>> {
    let params = params?;
    let mut query = Vec::new();

    if let Some(limit) = params.limit {
        query.push(("limit", limit.to_string()));
    }

    if let Some(offset) = params.offset {
        query.push(("offset", offset.to_string()));
    }

    if query.is_empty() { None } else { Some(query) }
}

fn api_error_from_response(status: StatusCode, text: &str) -> UnstatusError {
    let parsed_value = serde_json::from_str::<Value>(text).ok();
    let (code, message) = match serde_json::from_str::<ErrorEnvelope>(text)
        .ok()
        .and_then(|envelope| envelope.error)
    {
        Some(error) => (
            error.code.unwrap_or_else(|| "API_ERROR".to_string()),
            error
                .message
                .unwrap_or_else(|| format!("Request failed with status {}", status.as_u16())),
        ),
        None if !text.is_empty() => ("API_ERROR".to_string(), text.to_string()),
        None => (
            "API_ERROR".to_string(),
            format!("Request failed with status {}", status.as_u16()),
        ),
    };

    UnstatusError::Api {
        status,
        code,
        message,
        payload: parsed_value,
    }
}

#[derive(Debug, Clone)]
pub struct MonitorsClient {
    client: Client,
}

impl MonitorsClient {
    pub async fn list(
        &self,
        params: Option<&PaginationParams>,
    ) -> Result<Paginated<Monitor>, UnstatusError> {
        self.client.list("/monitors", params).await
    }

    pub async fn get(&self, id: &str) -> Result<Monitor, UnstatusError> {
        self.client
            .request(
                Method::GET,
                &format!("/monitors/{id}"),
                None,
                Option::<&()>::None,
            )
            .await
    }

    pub async fn create(&self, input: &CreateMonitorInput) -> Result<Monitor, UnstatusError> {
        self.client
            .request(Method::POST, "/monitors", None, Some(input))
            .await
    }

    pub async fn update(
        &self,
        id: &str,
        input: &UpdateMonitorInput,
    ) -> Result<Monitor, UnstatusError> {
        self.client
            .request(Method::PATCH, &format!("/monitors/{id}"), None, Some(input))
            .await
    }

    pub async fn delete(&self, id: &str) -> Result<DeleteResult, UnstatusError> {
        self.client
            .request(
                Method::DELETE,
                &format!("/monitors/{id}"),
                None,
                Option::<&()>::None,
            )
            .await
    }

    pub async fn list_checks(
        &self,
        id: &str,
        params: Option<&PaginationParams>,
    ) -> Result<Paginated<MonitorCheck>, UnstatusError> {
        self.client
            .list(&format!("/monitors/{id}/checks"), params)
            .await
    }

    pub async fn run(&self, id: &str) -> Result<MonitorRunResult, UnstatusError> {
        self.client
            .request(
                Method::POST,
                &format!("/monitors/{id}/run"),
                None,
                Option::<&()>::None,
            )
            .await
    }
}

#[derive(Debug, Clone)]
pub struct IncidentsClient {
    client: Client,
}

impl IncidentsClient {
    pub async fn list(
        &self,
        params: Option<&PaginationParams>,
    ) -> Result<Paginated<IncidentListItem>, UnstatusError> {
        self.client.list("/incidents", params).await
    }

    pub async fn get(&self, id: &str) -> Result<Incident, UnstatusError> {
        self.client
            .request(
                Method::GET,
                &format!("/incidents/{id}"),
                None,
                Option::<&()>::None,
            )
            .await
    }

    pub async fn create(&self, input: &CreateIncidentInput) -> Result<Incident, UnstatusError> {
        self.client
            .request(Method::POST, "/incidents", None, Some(input))
            .await
    }

    pub async fn update(
        &self,
        id: &str,
        input: &UpdateIncidentInput,
    ) -> Result<Incident, UnstatusError> {
        self.client
            .request(
                Method::PATCH,
                &format!("/incidents/{id}"),
                None,
                Some(input),
            )
            .await
    }

    pub async fn delete(&self, id: &str) -> Result<DeleteResult, UnstatusError> {
        self.client
            .request(
                Method::DELETE,
                &format!("/incidents/{id}"),
                None,
                Option::<&()>::None,
            )
            .await
    }
}

#[derive(Debug, Clone)]
pub struct StatusPagesClient {
    client: Client,
}

impl StatusPagesClient {
    pub async fn list(
        &self,
        params: Option<&PaginationParams>,
    ) -> Result<Paginated<StatusPage>, UnstatusError> {
        self.client.list("/status-pages", params).await
    }

    pub async fn get(&self, id: &str) -> Result<StatusPage, UnstatusError> {
        self.client
            .request(
                Method::GET,
                &format!("/status-pages/{id}"),
                None,
                Option::<&()>::None,
            )
            .await
    }

    pub async fn create(&self, input: &CreateStatusPageInput) -> Result<StatusPage, UnstatusError> {
        self.client
            .request(Method::POST, "/status-pages", None, Some(input))
            .await
    }

    pub async fn update(
        &self,
        id: &str,
        input: &UpdateStatusPageInput,
    ) -> Result<StatusPage, UnstatusError> {
        self.client
            .request(
                Method::PATCH,
                &format!("/status-pages/{id}"),
                None,
                Some(input),
            )
            .await
    }

    pub async fn delete(&self, id: &str) -> Result<DeleteResult, UnstatusError> {
        self.client
            .request(
                Method::DELETE,
                &format!("/status-pages/{id}"),
                None,
                Option::<&()>::None,
            )
            .await
    }
}

#[derive(Debug, Clone)]
pub struct MaintenanceClient {
    client: Client,
}

impl MaintenanceClient {
    pub async fn list(
        &self,
        params: Option<&PaginationParams>,
    ) -> Result<Paginated<MaintenanceWindow>, UnstatusError> {
        self.client.list("/maintenance", params).await
    }

    pub async fn get(&self, id: &str) -> Result<MaintenanceWindow, UnstatusError> {
        self.client
            .request(
                Method::GET,
                &format!("/maintenance/{id}"),
                None,
                Option::<&()>::None,
            )
            .await
    }

    pub async fn create(
        &self,
        input: &CreateMaintenanceInput,
    ) -> Result<MaintenanceWindow, UnstatusError> {
        self.client
            .request(Method::POST, "/maintenance", None, Some(input))
            .await
    }

    pub async fn update(
        &self,
        id: &str,
        input: &UpdateMaintenanceInput,
    ) -> Result<MaintenanceWindow, UnstatusError> {
        self.client
            .request(
                Method::PATCH,
                &format!("/maintenance/{id}"),
                None,
                Some(input),
            )
            .await
    }

    pub async fn delete(&self, id: &str) -> Result<DeleteResult, UnstatusError> {
        self.client
            .request(
                Method::DELETE,
                &format!("/maintenance/{id}"),
                None,
                Option::<&()>::None,
            )
            .await
    }

    pub async fn start(&self, id: &str) -> Result<MaintenanceWindow, UnstatusError> {
        self.client
            .request(
                Method::POST,
                &format!("/maintenance/{id}/start"),
                None,
                Option::<&()>::None,
            )
            .await
    }

    pub async fn complete(&self, id: &str) -> Result<MaintenanceWindow, UnstatusError> {
        self.client
            .request(
                Method::POST,
                &format!("/maintenance/{id}/complete"),
                None,
                Option::<&()>::None,
            )
            .await
    }

    pub async fn cancel(&self, id: &str) -> Result<MaintenanceWindow, UnstatusError> {
        self.client
            .request(
                Method::POST,
                &format!("/maintenance/{id}/cancel"),
                None,
                Option::<&()>::None,
            )
            .await
    }
}

#[derive(Debug, Clone)]
pub struct NotificationsClient {
    client: Client,
}

impl NotificationsClient {
    pub async fn list(
        &self,
        params: Option<&PaginationParams>,
    ) -> Result<Paginated<NotificationChannel>, UnstatusError> {
        self.client.list("/notifications", params).await
    }

    pub async fn create(
        &self,
        input: &CreateNotificationInput,
    ) -> Result<NotificationChannel, UnstatusError> {
        self.client
            .request(Method::POST, "/notifications", None, Some(input))
            .await
    }

    pub async fn update(
        &self,
        id: &str,
        input: &UpdateNotificationInput,
    ) -> Result<NotificationChannel, UnstatusError> {
        self.client
            .request(
                Method::PATCH,
                &format!("/notifications/{id}"),
                None,
                Some(input),
            )
            .await
    }

    pub async fn delete(&self, id: &str) -> Result<DeleteResult, UnstatusError> {
        self.client
            .request(
                Method::DELETE,
                &format!("/notifications/{id}"),
                None,
                Option::<&()>::None,
            )
            .await
    }
}

#[derive(Debug, Clone)]
pub struct OrganizationClient {
    client: Client,
}

impl OrganizationClient {
    pub async fn get(&self) -> Result<Organization, UnstatusError> {
        self.client
            .request(Method::GET, "/organization", None, Option::<&()>::None)
            .await
    }
}
