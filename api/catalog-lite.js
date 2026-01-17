export default async function handler(req, res) {
  try {
    // Número máximo de productos que regresamos a Flowise
    const limit = Number(req.query.limit || 20);

    // --- Protección contra timeouts ---
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    // --- Llamada a Shopify (payload reducido para evitar cortes) ---
    const response = await fetch(
      "https://bloomwell.mx/products.json?limit=50",
      {
        headers: { Accept: "application/json" },
        signal: controller.signal
      }
    );

    clearTimeout(timeout);

    if (!response.ok) {
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      return res.status(response.status).json({
        error: "upstream_error",
        status: response.status
      });
    }

    const data = await response.json();

    // --- Normalización del catálogo ---
    const items = (data.products || [])
      .map(product => {
        const variants = product.variants || [];
        const availableVariant =
          variants.find(v => v.available) || variants[0] || {};

        const available = variants.some(v => v.available);

        return {
          title: product.title,
          handle: product.handle,
          url: `https://bloomwell.mx/products/${product.handle}`,
          available,
          price: availableVariant.price ?? null,
          compare_at_price: availableVariant.compare_at_price ?? null,
          tags: product.tags || []
        };
      })
      .filter(item => item.available)
      .slice(0, limit);

    // --- Headers claros para Flowise ---
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");

    return res.status(200).json({ items });
  } catch (error) {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    return res.status(500).json({
      error: "proxy_failed",
      message: String(error?.message || error)
    });
  }
}
