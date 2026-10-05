import crypto from 'crypto';

const IV_LENGTH = 12; // GCM recommended nonce size

function getKey(): Buffer {
  const raw = process.env.MAIL_ENCRYPTION_KEY;
  if (!raw) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('[SECURITY] MAIL_ENCRYPTION_KEY is required in production');
    }
    // Dev-only ephemeral key — data encrypted in dev cannot be decrypted after restart.
    // This is intentional: never rely on a hardcoded default key.
    const ephemeral = (globalThis as any).__DEV_MAIL_KEY__ ?? crypto.randomBytes(32).toString('hex');
    (globalThis as any).__DEV_MAIL_KEY__ = ephemeral;
    return crypto.scryptSync(ephemeral, 'tranle-dev-salt', 32);
  }
  // Support 32-byte utf8 string or 64-char hex.
  if (/^[0-9a-fA-F]{64}$/.test(raw)) return Buffer.from(raw, 'hex');
  return crypto.scryptSync(raw, 'tranle-mail-salt-v1', 32);
}

function legacyDecryptCbc(text: string): string | null {
  // One-time migration support for data encrypted with the legacy AES-256-CBC
  // scheme. Uses ONLY the configured MAIL_ENCRYPTION_KEY — there is no
  // hardcoded fallback key. In production the key is required (see getKey).
  // After all legacy rows are re-encrypted to GCM, this function can be removed.
  try {
    const raw = process.env.MAIL_ENCRYPTION_KEY;
    if (!raw) return null;
    const textParts = text.split(':');
    if (textParts.length < 2) return null;
    if (text.startsWith('gcm:')) return null;
    const iv = Buffer.from(textParts.shift()!, 'hex');
    if (iv.length !== 16) return null;
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(raw.padEnd(32, '0').slice(0, 32)), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch {
    return null;
  }
}

export function encrypt(text: string) {
  if (!text) return text;
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-gcm', getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `gcm:${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decrypt(text: string) {
  if (!text) return text;
  try {
    if (text.startsWith('gcm:')) {
      const [, ivHex, tagHex, dataHex] = text.split(':');
      const decipher = crypto.createDecipheriv('aes-256-gcm', getKey(), Buffer.from(ivHex, 'hex'));
      decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
      const decrypted = Buffer.concat([decipher.update(Buffer.from(dataHex, 'hex')), decipher.final()]);
      return decrypted.toString('utf8');
    }
    // Backward compatibility: data encrypted with legacy AES-256-CBC.
    return legacyDecryptCbc(text);
  } catch (error) {
    return null;
  }
}
