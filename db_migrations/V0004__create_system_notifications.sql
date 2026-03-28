CREATE TABLE t_p10644084_yandex_alisa_bot_cre.system_notifications (
  id SERIAL PRIMARY KEY,
  username VARCHAR(64) NOT NULL,
  type VARCHAR(32) NOT NULL,
  text TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX ON t_p10644084_yandex_alisa_bot_cre.system_notifications (username, created_at DESC);