-- VizEye post-migration TimescaleDB setup
-- Idempotent — safe to run multiple times

SELECT create_hypertable('metrics','time',chunk_time_interval => INTERVAL '1 day',if_not_exists => TRUE);

ALTER TABLE metrics SET (
  timescaledb.compress,
  timescaledb.compress_orderby   = 'time DESC',
  timescaledb.compress_segmentby = '"assetId","metricName"'
);

SELECT add_compression_policy('metrics', compress_after => INTERVAL '7 days',  if_not_exists => TRUE);
SELECT add_retention_policy  ('metrics', drop_after     => INTERVAL '90 days', if_not_exists => TRUE);

CREATE MATERIALIZED VIEW IF NOT EXISTS metrics_1m
WITH (timescaledb.continuous) AS
SELECT
  time_bucket('1 minute', time)  AS bucket,
  "orgId", "assetId", "metricName",
  AVG(value)::DOUBLE PRECISION   AS avg_value,
  MIN(value)::DOUBLE PRECISION   AS min_value,
  MAX(value)::DOUBLE PRECISION   AS max_value,
  COUNT(*)                       AS sample_count
FROM metrics
GROUP BY 1,2,3,4
WITH NO DATA;

SELECT add_continuous_aggregate_policy('metrics_1m',
  start_offset      => INTERVAL '2 hours',
  end_offset        => INTERVAL '1 minute',
  schedule_interval => INTERVAL '1 minute',
  if_not_exists     => TRUE);

CREATE MATERIALIZED VIEW IF NOT EXISTS metrics_1h
WITH (timescaledb.continuous) AS
SELECT
  time_bucket('1 hour', bucket)    AS bucket,
  "orgId", "assetId", "metricName",
  AVG(avg_value)::DOUBLE PRECISION AS avg_value,
  MIN(min_value)::DOUBLE PRECISION AS min_value,
  MAX(max_value)::DOUBLE PRECISION AS max_value,
  SUM(sample_count)                AS sample_count
FROM metrics_1m
GROUP BY 1,2,3,4
WITH NO DATA;

SELECT add_continuous_aggregate_policy('metrics_1h',
  start_offset      => INTERVAL '2 days',
  end_offset        => INTERVAL '1 hour',
  schedule_interval => INTERVAL '1 hour',
  if_not_exists     => TRUE);

CREATE INDEX IF NOT EXISTS metrics_asset_metric_time_idx ON metrics ("assetId","metricName",time DESC);
CREATE INDEX IF NOT EXISTS metrics_org_time_idx          ON metrics ("orgId",time DESC);
