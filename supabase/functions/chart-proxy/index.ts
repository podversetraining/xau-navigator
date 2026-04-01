import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async () => {
  try {
    const res = await fetch("http://88.99.64.228/ChartShot.png", {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    if (!res.ok) throw new Error(`Upstream ${res.status}`);
    const body = await res.arrayBuffer();
    return new Response(body, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "no-cache",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (e) {
    return new Response("Image proxy error", { status: 502 });
  }
});
