const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { kwh = 1, country = 'cn' } = await req.json().catch(() => ({}));
    const key = Deno.env.get('CARBON_INTERFACE_API_KEY');
    if (!key) throw new Error('Missing CARBON_INTERFACE_API_KEY');
    const response = await fetch('https://www.carboninterface.com/api/v1/estimates', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        type: 'electricity',
        electricity_unit: 'kwh',
        electricity_value: Number(kwh),
        country,
      }),
    });
    const body = await response.json();
    return new Response(JSON.stringify(body), {
      status: response.status,
      headers: { ...corsHeaders, 'content-type': 'application/json; charset=utf-8' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'content-type': 'application/json; charset=utf-8' },
    });
  }
});
