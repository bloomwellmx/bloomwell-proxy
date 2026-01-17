export default async function handler(req, res) {
  try {
    const response = await fetch(
      "https://bloomwell.mx/products.json?limit=250",
      { headers: { Accept: "application/json" } }
    );

    if (!response.ok) {
      return res
        .status(response.status)
        .json({ error: "shopify_error", status: response.status });
    }

    const data = await response.json();

    const products = (data.products || []).map(p => {
      const variants = (p.variants || []).map(v => ({
        id: v.id,
        title: v.title,
        available: v.available,
        price: v.price,
        compare_at_price: v.compare_at_price
      }));

      return {
        id: p.id,
        title: p.title,
        handle: p.handle,
        tags: p.tags,
        available: variants.some(v => v.available),
        variants
      };
    });

    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
    return res.status(200).json({ products });
  } catch (error) {
    return res.status(500).json({ error: "proxy_failed", message: error.message });
  }
}
