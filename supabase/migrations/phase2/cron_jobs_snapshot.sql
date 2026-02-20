[
  {
    "jobid": 4,
    "schedule": "*/10 * * * *",
    "command": "\r\n    select net.http_post(\r\n      url := (select decrypted_secret from vault.decrypted_secrets where name='project_url')\r\n            || '/functions/v1/content_fetch/run?limit=30&since_hours=168&write=true&trigger=cron',\r\n      headers := jsonb_build_object(\r\n        'Content-Type', 'application/json',\r\n        'x-ingest-key', (select decrypted_secret from vault.decrypted_secrets where name='INGEST_API_KEY')\r\n      ),\r\n      body := '{}'::jsonb,\r\n      timeout_milliseconds := 600000\r\n    ) as request_id;\r\n  ",
    "nodename": "localhost",
    "nodeport": 5432,
    "database": "postgres",
    "username": "postgres",
    "active": true,
    "jobname": "content_fetch_every_10min"
  },
  {
    "jobid": 5,
    "schedule": "*/5 * * * *",
    "command": "\r\n  with req as (\r\n    select net.http_post(\r\n      url := (select decrypted_secret from vault.decrypted_secrets where name='project_url')\r\n            || '/functions/v1/ai-worker/run?limit=5',\r\n      headers := jsonb_build_object(\r\n        'Content-Type', 'application/json',\r\n        'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name='publishable_key'),\r\n        'apikey', (select decrypted_secret from vault.decrypted_secrets where name='publishable_key'),\r\n        'x-ai-worker-key', (select decrypted_secret from vault.decrypted_secrets where name='ai_worker_api_key')\r\n      ),\r\n      body := '{}'::jsonb,\r\n      timeout_milliseconds := 600000\r\n    ) as resp_id\r\n  )\r\n  insert into m.worker_http_log (cron_jobid, http_response_id, url)\r\n  select\r\n    5,\r\n    resp_id,\r\n    (select decrypted_secret from vault.decrypted_secrets where name='project_url')\r\n      || '/functions/v1/ai-worker/run?limit=5'\r\n  from req;\r\n  ",
    "nodename": "localhost",
    "nodeport": 5432,
    "database": "postgres",
    "username": "postgres",
    "active": true,
    "jobname": "ai-worker-every-5m"
  },
  {
    "jobid": 1,
    "schedule": "0 */6 * * *",
    "command": "\r\n    select net.http_post(\r\n      url := (select decrypted_secret from vault.decrypted_secrets where name='project_url')\r\n            || '/functions/v1/ingest/ingest/run-all?max_items=10&write=true&normalize=true&canonicalize=true&trigger=cron',\r\n      headers := jsonb_build_object(\r\n        'Content-Type', 'application/json',\r\n        'x-ingest-key', (select decrypted_secret from vault.decrypted_secrets where name='ingest_api_key')\r\n      ),\r\n      body := '{}'::jsonb,\r\n      timeout_milliseconds := 600000\r\n    ) as request_id;\r\n  ",
    "nodename": "localhost",
    "nodeport": 5432,
    "database": "postgres",
    "username": "postgres",
    "active": true,
    "jobname": "rss-ingest-run-all-hourly"
  },
  {
    "jobid": 7,
    "schedule": "*/10 * * * *",
    "command": "\r\n    select net.http_post(\r\n      url := (select decrypted_secret from vault.decrypted_secrets where name='project_url')\r\n            || '/functions/v1/publisher/run?limit=2',\r\n      headers := jsonb_build_object(\r\n        'Content-Type', 'application/json',\r\n        'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name='publishable_key'),\r\n        'apikey', (select decrypted_secret from vault.decrypted_secrets where name='publishable_key'),\r\n        'x-publisher-key', (select decrypted_secret from vault.decrypted_secrets where name='publisher_api_key')\r\n      ),\r\n      body := '{}'::jsonb,\r\n      timeout_milliseconds := 600000\r\n    ) as request_id;\r\n  ",
    "nodename": "localhost",
    "nodeport": 5432,
    "database": "postgres",
    "username": "postgres",
    "active": true,
    "jobname": "publisher-every-10m"
  },
  {
    "jobid": 11,
    "schedule": "*/10 * * * *",
    "command": "\r\n    select m.seed_and_enqueue_ai_jobs_v1('facebook', 10);\r\n  ",
    "nodename": "localhost",
    "nodeport": 5432,
    "database": "postgres",
    "username": "postgres",
    "active": true,
    "jobname": "seed-and-enqueue-facebook-every-10m"
  },
  {
    "jobid": 8,
    "schedule": "*/5 * * * *",
    "command": "\r\n    insert into m.post_publish_queue (ai_job_id, post_draft_id, client_id, platform, scheduled_for, status)\r\n    select\r\n      j.ai_job_id,\r\n      j.post_draft_id,\r\n      j.client_id,\r\n      'facebook',\r\n      now(),\r\n      'queued'\r\n    from m.ai_job j\r\n    where j.status = 'succeeded'\r\n      and j.platform = 'facebook'\r\n      and j.post_draft_id is not null\r\n      and not exists (select 1 from m.post_publish_queue q where q.post_draft_id = j.post_draft_id)\r\n      and not exists (select 1 from m.post_publish p where p.post_draft_id = j.post_draft_id and p.status = 'published')\r\n    on conflict (post_draft_id) do nothing;\r\n  ",
    "nodename": "localhost",
    "nodeport": 5432,
    "database": "postgres",
    "username": "postgres",
    "active": true,
    "jobname": "enqueue-publish-queue-every-5m"
  },
  {
    "jobid": 9,
    "schedule": "*/10 * * * *",
    "command": "\r\n    -- AI jobs stuck in running for > 20 min → requeue\r\n    update m.ai_job\r\n    set status='queued', locked_at=null, locked_by=null, updated_at=now()\r\n    where status='running'\r\n      and locked_at < now() - interval '20 minutes';\r\n\r\n    -- Publish queue stuck in running for > 20 min → requeue\r\n    update m.post_publish_queue\r\n    set status='queued', locked_at=null, locked_by=null, scheduled_for=now(), updated_at=now()\r\n    where status='running'\r\n      and locked_at < now() - interval '20 minutes';\r\n  ",
    "nodename": "localhost",
    "nodeport": 5432,
    "database": "postgres",
    "username": "postgres",
    "active": true,
    "jobname": "sweep-stale-running-every-10m"
  },
  {
    "jobid": 12,
    "schedule": "0 * * * *",
    "command": "\r\n    with clients as (\r\n      select unnest(array['property-pulse','ndis-yarns']) as slug\r\n    ),\r\n    runs as (\r\n      select slug, m.create_digest_run_for_client(slug) as digest_run_id\r\n      from clients\r\n    )\r\n    select slug, m.populate_digest_items_v1(digest_run_id) as items_created\r\n    from runs;\r\n  ",
    "nodename": "localhost",
    "nodeport": 5432,
    "database": "postgres",
    "username": "postgres",
    "active": true,
    "jobname": "planner-hourly"
  }
]