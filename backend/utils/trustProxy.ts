/**
 * Resolve `app.set('trust proxy', ...)` from the environment.
 *
 * X-Forwarded-For is attacker-controlled input. Express only believes it for
 * addresses listed in `trust proxy`; anything else is ignored. So the value here
 * decides both whether the real client IP reaches the rate limiters and whether
 * a client can pick its own bucket.
 *
 * Express accepts: false | true | hop count | list of IPs/subnets/CIDRs.
 * Returning the CIDR list is what actually closes the hole — with a hop count,
 * any client that reaches the app directly puts an arbitrary address in the
 * header and every per-IP limiter becomes meaningless.
 */
export function resolveTrustProxy(env: NodeJS.ProcessEnv = process.env): false | number | string[] {
  const cidrs = (env.TRUST_PROXY_CIDRS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (cidrs.length > 0) return cidrs;

  const raw = (env.TRUST_PROXY || '').trim().toLowerCase();
  if (raw === 'none' || raw === 'false' || raw === 'off') return false;

  const hops = Number(env.TRUST_PROXY_HOPS);
  if (Number.isInteger(hops) && hops > 0) return hops;

  // Unset: keep the previous behaviour (1 hop). This is the one place where
  // "fail closed" would do more harm than good — loginLimiter allows 10 attempts
  // per 15 minutes, so `false` behind a real proxy pools every employee into the
  // proxy's IP and ten typos lock the whole company out. Set TRUST_PROXY_CIDRS to
  // the proxy addresses to get the strict behaviour safely.
  return 1;
}

/** Human-readable note for the startup log, so a half-configured proxy is visible. */
export function describeTrustProxy(value: false | number | string[], env: NodeJS.ProcessEnv = process.env): string {
  const configured = Boolean(env.TRUST_PROXY_CIDRS || env.TRUST_PROXY_HOPS || env.TRUST_PROXY);
  if (configured) return '';
  return (
    ' | CHƯA cấu hình TRUST_PROXY_*: X-Forwarded-For vẫn còn giả được nếu proxy ' +
    'không ghi đè bằng $remote_addr. Đặt TRUST_PROXY_CIDRS theo địa chỉ proxy, ' +
    'xem .env.production.example.'
  );
}
