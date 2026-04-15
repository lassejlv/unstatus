#[tokio::main]
async fn main() -> anyhow::Result<()> {
    worker_rs::run().await
}
