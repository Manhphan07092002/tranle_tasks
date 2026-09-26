import crypto from 'crypto';

const IV_LENGTH = 16;

function resolveEncryptionKey(): string {
  const envKey = process.env.MAIL_ENCRYPTION_KEY;
  if (envKey) return envKey;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('[SECURITY] MAIL_ENCRYPTION_KEY is not set in production. Refusing to start with insecure default.');
  }
  console.warn('[SECURITY] MAIL_ENCRYPTION_KEY is not set. Using an ephemeral random key for this dev/test session only.');
  return crypto.randomBytes(32).toString('hex');
}

const ENCRYPTION_KEY = resolveEncryptionKey();

export function encrypt(text: string) {
  if (!text) return text;
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32)), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

export function decrypt(text: string) {
  if (!text) return text;
  try {
    const textParts = text.split(':');
    const iv = Buffer.from(textParts.shift()!, 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32)), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (error) {
    // Silently fail or log minimally to avoid spamming the terminal
    // console.warn('Decryption failed for mail password.');
    return null;
  }
}
