import { Hono } from "jsr:@hono/hono";
import { createClient } from "jsr:@supabase/supabase-js@2";

const app = new Hono();

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, apikey, authorization, x-worker-id, x-ai-worker-key",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
};

const VERSION = "ai-worker-v2.2.0";

// NOTE: This is the last committed local version.
// Deployed version is v2.6.1 with D051 format advisor seed extraction fix.
// The deployed source was not committed back to GitHub after deploy.
// TODO: recover deployed source and update this file.
