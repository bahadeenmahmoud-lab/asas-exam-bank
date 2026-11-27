-- Rate limiting for OTP requests, OTP verification and admin login.
-- Each row is one attempt; the bucket is a hashed key (IP or phone), never the raw value.
CREATE TABLE IF NOT EXISTS rate_limit_events (
  id BIGSERIAL PRIMARY KEY,
  bucket TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS rate_limit_events_bucket_time_idx ON rate_limit_events (bucket, created_at);
CREATE INDEX IF NOT EXISTS rate_limit_events_time_idx ON rate_limit_events (created_at);
