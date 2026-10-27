// Vercel Serverless Function: Discord notification for bank-transfer order requests.
// Configure DISCORD_ORDER_WEBHOOK_URL in Vercel Project Settings > Environment Variables.
const MAX_BODY_BYTES = 12_000;
const SINGLE_PRICE = 9800;
const BUNDLE_PRICE = 15000;

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const webhook = process.env.DISCORD_ORDER_WEBHOOK_URL;
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return res.status(503).json({ error: 'Order storage not configured' });
  if (Number(req.headers['content-length'] || 0) > MAX_BODY_BYTES) {
    return res.status(413).json({ error: 'Request too large' });
  }
  let body = req.body;
  try {
    if (typeof body === 'string') body = JSON.parse(body);
    if (JSON.stringify(body).length > MAX_BODY_BYTES) throw new Error('Too large');
  } catch (_) { return res.status(400).json({ error: 'Invalid request' }); }
  const { orderId, email, depositorName, items, total, bundles, singles } = body || {};
  const validItems = Array.isArray(items) && items.length >= 1 && items.length <= 30 &&
    items.every(x => x && typeof x.id === 'string' && x.id.length <= 80 &&
      typeof x.title === 'string' && x.title.length >= 1 && x.title.length <= 160);
  const validEmail = typeof email === 'string' && email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const validDepositorName = typeof depositorName === 'string' && depositorName.trim().length >= 1 && depositorName.trim().length <= 60 && !/[\r\n<>]/.test(depositorName);
  const validOrderId = typeof orderId === 'string' && /^ONDA-[A-Z0-9]{5,24}$/.test(orderId);
  const expectedBundles = Math.floor((items?.length || 0) / 3);
  const expectedSingles = (items?.length || 0) % 3;
  const expectedTotal = expectedBundles * BUNDLE_PRICE + expectedSingles * SINGLE_PRICE;
  if (!validItems || !validEmail || !validDepositorName || !validOrderId || bundles !== expectedBundles ||
      singles !== expectedSingles || total !== expectedTotal) {
    return res.status(400).json({ error: 'Invalid order details' });
  }
  // Persist the order server-side. Service role credentials never reach the browser.
  // Duplicate order IDs are rejected by the database unique constraint.
  try {
    const saved = await fetch(`${supabaseUrl.replace(/\/$/, '')}/rest/v1/onda_orders`, {
      method: 'POST',
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal'
      },
      body: JSON.stringify({ order_id: orderId, email, depositor_name: depositorName.trim(), items, total, bundles, singles, status: 'pending' })
    });
    if (saved.status === 409) return res.status(409).json({ error: 'Order already exists' });
    if (!saved.ok) throw new Error(`Order database HTTP ${saved.status}: ${(await saved.text()).slice(0, 300)}`);
  } catch (error) {
    console.error('[ONDA] Order save failed:', error.message);
    return res.status(503).json({ error: 'Order could not be saved' });
  }
  // Prevent Discord mentions from untrusted customer-entered content.
  const safe = value => String(value).replace(/@/g, '@\u200b').replace(/[`*_~|<>]/g, '');
  const tracks = items.map((x, i) => `${i + 1}. ${safe(x.title)} [${safe(x.id)}]`).join('\n').slice(0, 1000);
  const payload = {
    username: 'ONDA beat · 주문 알림',
    allowed_mentions: { parse: [] },
    embeds: [{
      title: '🛒 새로운 계좌이체 주문 접수',
      description: '⚠️ 입금 대기 · 실제 입금 완료 알림이 아닙니다.',
      color: 0xFF2D87,
      fields: [
        { name: '주문번호', value: safe(orderId), inline: true },
        { name: '입금 예정 금액', value: `₩${total.toLocaleString('ko-KR')}`, inline: true },
        { name: '고객 이메일', value: safe(email), inline: false },
        { name: '입금자명', value: safe(depositorName.trim()), inline: true },
        { name: `구매 곡 (${items.length}곡)`, value: tracks, inline: false },
        { name: '가격 구성', value: `3곡 묶음 ${bundles}건 / 단품 ${singles}곡`, inline: false }
      ],
      timestamp: new Date().toISOString()
    }]
  };
  if (!webhook) return res.status(200).json({ ok: true, saved: true, notified: false });
  try {
    const response = await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error(`Discord HTTP ${response.status}`);
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('[ONDA] Discord notification error:', error.message);
    return res.status(200).json({ ok: true, saved: true, notified: false });
  }
};
