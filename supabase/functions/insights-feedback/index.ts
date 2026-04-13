import { createClient } from 'jsr:@supabase/supabase-js@2';

const VERSION = 'insights-feedback-v1.0.0';

Deno.serve(async () => {
  const url = Deno.env.get('SUPABASE_URL')!;
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const { data: clients } = await supabase.rpc('exec_sql', {
    query: `SELECT client_id, client_name FROM c.client WHERE status = 'active'`
  });

  const results: any[] = [];

  for (const client of (clients ?? []) as any[]) {
    try {
      const { data: weightCount } = await supabase.rpc('recalculate_topic_weights', {
        p_client_id: client.client_id
      });
      results.push({
        client: client.client_name,
        topics_updated: Number(weightCount ?? 0)
      });
      console.log(`[insights-feedback] ${client.client_name}: ${weightCount} topics updated`);
    } catch (e: any) {
      results.push({ client: client.client_name, topics_updated: 0, error: e.message });
      console.error(`[insights-feedback] ${client.client_name} failed:`, e.message);
    }
  }

  return new Response(
    JSON.stringify({ ok: true, version: VERSION, results }),
    { headers: { 'Content-Type': 'application/json' } }
  );
});
