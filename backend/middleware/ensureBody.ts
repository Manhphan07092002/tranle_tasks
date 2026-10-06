// req.body is undefined when no body parser matched (e.g. missing
// Content-Type). Default it so route destructuring fails gracefully
// with 400s instead of throwing a 500.
export function ensureBody(req: any, _res: any, next: any) {
  if (req.body === undefined) req.body = {};
  next();
}
