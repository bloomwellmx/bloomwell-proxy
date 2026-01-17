export default async function handler(req, res) {
  try {
    const limit = Number(req.query.limit || 20);

    const r = await fetch("https://bloomwell.mx/products.json?limit=250", {
      headers: { Accept: "application/json" }
    });

    if (!r.ok) return res.status(r.status).json({ error: "upstream_error", status: r.status });

    const data = await r.json();

    const items = (data.products || [])
      .map(p => {
        const v = (p.variants || []).find(x => x.available) || (p.variants || [])[0] || {};
        const available = (p.variants || []).some(x => x.available);

        return {
          title: p.title,
          handle: p.handle,
          url: `https://bloomwell.mx/products/${p.handle}`,
          available,
          price: v.price ?? null,
          compare_at_price: v.compare_at_price ?? null,
          tags: p.tags || []
        };
      })
      .filter(x => x.available)
      .slice(0, limit);

    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
    return res.status(200).json({ items });
  } catch (e) {
    return res.status(500).json({ error: "proxy_failed", message: String(e?.message || e) });
  }
}
