// Mitre BOSS — Stripe Checkout Session creator (zero dependencies).
//
// Creates a secure Stripe-hosted checkout from the cart the browser sends.
// Prices and postage are calculated HERE on the server from a fixed catalogue,
// so a customer can never tamper with what they're charged.
//
// Requires an environment variable in Netlify:  STRIPE_SECRET_KEY = sk_live_...
// (Never put the secret key in the website code — only in Netlify's settings.)

const CATALOG = {
  'boss-bundle': { name: 'Boss Bundle — Box + 2-Inch + Small Tool + 2 Pencils + Stickers', price: 169.00 },
  'mitre-boss':  { name: 'Mitre BOSS — The Box',      price: 129.00 },
  'two-inch':    { name: 'Mitre BOSS 2-Inch Scraper', price: 21.95 },
  'small-tool':  { name: 'Mitre BOSS Small Tool',     price: 10.00 },
};

// Mirrors the site's postage rules: box or bundle = flat $30/order Australia-wide;
// accessories are $4 each, but ride along free when a box or bundle is present.
function postageFor(cart) {
  if (!cart.length) return 0;
  const hasBoxOrBundle = cart.some(c => c.id === 'mitre-boss' || c.id === 'boss-bundle');
  if (hasBoxOrBundle) return 30;
  return Math.ceil(cart.reduce((s, c) => s + c.qty, 0) / 4) * 10;
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const SECRET = process.env.STRIPE_SECRET_KEY;
  if (!SECRET) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Payment is not configured yet.' }) };
  }

  // Parse + sanitise the cart (only known products, sane quantities).
  let cart;
  try {
    cart = (JSON.parse(event.body || '{}').cart || [])
      .filter(c => c && CATALOG[c.id])
      .map(c => ({ id: c.id, qty: Math.max(1, Math.min(99, parseInt(c.qty, 10) || 1)) }));
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Could not read your cart.' }) };
  }
  if (!cart.length) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Your cart is empty.' }) };
  }

  const base = (process.env.URL || 'https://mitreboss.com.au').replace(/\/+$/, '');

  const p = new URLSearchParams();
  p.append('mode', 'payment');
  p.append('success_url', base + '/?paid=1');
  p.append('cancel_url', base + '/#buy');
  p.append('billing_address_collection', 'auto');
  p.append('shipping_address_collection[allowed_countries][0]', 'AU');
  p.append('phone_number_collection[enabled]', 'true');

  let i = 0;
  for (const item of cart) {
    const prod = CATALOG[item.id];
    p.append(`line_items[${i}][price_data][currency]`, 'aud');
    p.append(`line_items[${i}][price_data][product_data][name]`, prod.name);
    p.append(`line_items[${i}][price_data][unit_amount]`, String(Math.round(prod.price * 100)));
    p.append(`line_items[${i}][quantity]`, String(item.qty));
    i++;
  }

  const postage = postageFor(cart);
  if (postage > 0) {
    p.append(`line_items[${i}][price_data][currency]`, 'aud');
    p.append(`line_items[${i}][price_data][product_data][name]`, 'Postage — Australia-wide');
    p.append(`line_items[${i}][price_data][unit_amount]`, String(Math.round(postage * 100)));
    p.append(`line_items[${i}][quantity]`, '1');
  }

  try {
    const resp = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + SECRET,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: p.toString(),
    });
    const data = await resp.json();
    if (!resp.ok) {
      return { statusCode: 400, body: JSON.stringify({ error: (data.error && data.error.message) || 'Stripe error' }) };
    }
    return { statusCode: 200, body: JSON.stringify({ url: data.url }) };
  } catch (e) {
    return { statusCode: 502, body: JSON.stringify({ error: 'Could not reach Stripe. Please try again.' }) };
  }
};
