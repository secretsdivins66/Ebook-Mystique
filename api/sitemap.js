const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://kaujtphylrcautstokzw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImthdWp0cGh5bHJjYXV0c3Rva3p3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2MDM3MjUsImV4cCI6MjA5NjE3OTcyNX0.Aa9MxgVA2f5wAC2T0ameQx4OleNrQox3UcWw8E_v6Ew';
const SITE_URL = 'https://arcanes-mystiques.fr';

const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

module.exports = async (req, res) => {
  const { data: products } = await sb
    .from('products')
    .select('slug, updated_at')
    .eq('status', 'published');

  const staticUrls = [
    { loc: `${SITE_URL}/`, changefreq: 'weekly', priority: '1.0' },
    { loc: `${SITE_URL}/contact.html`, changefreq: 'monthly', priority: '0.5' },
  ];

  const productUrls = (products || []).map(p => ({
    loc: `${SITE_URL}/ebooks/${p.slug}`,
    changefreq: 'monthly',
    priority: '0.8',
    lastmod: p.updated_at ? p.updated_at.slice(0, 10) : undefined,
  }));

  const allUrls = staticUrls.concat(productUrls);

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allUrls.map(u => `  <url>\n    <loc>${u.loc}</loc>\n${u.lastmod ? `    <lastmod>${u.lastmod}</lastmod>\n` : ''}    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>`).join('\n')}
</urlset>
`;

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=3600');
  res.status(200).send(xml);
};
