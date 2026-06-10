import { createCipheriv, createDecipheriv, createHmac, randomBytes, scryptSync } from "crypto";

/**
 * AES-256-GCM encryption / decryption for user-stored API credentials.
 *
 * The key is derived from the server-side SESSION_SECRET via scrypt. This is a
 * *server-only* module; credentials are never decrypted in the browser. All
 * HMAC-SHA256 signing for Binance requests also happens server-side.
 */

const ALG = "aes-256-gcm";
const IV_LEN = 16;
const TAG_LEN = 16;

function getKey(): Buffer {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is required for credential encryption");
  return scryptSync(secret, "binance-credential-salt", 32);
}

export interface EncryptedBlob {
  /** base64-encoded ciphertext + tag + IV */
  c: string;
}

export function encryptCredential(plaintext: string): EncryptedBlob {
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALG, getKey(), iv);
  let encrypted = cipher.update(plaintext, "utf8", "base64");
  encrypted += cipher.final("base64");
  const tag = cipher.getAuthTag();
  const combined = Buffer.concat([iv, tag, Buffer.from(encrypted, "base64")]);
  return { c: combined.toString("base64") };
}

export function decryptCredential(blob: EncryptedBlob): string | null {
  try {
    const combined = Buffer.from(blob.c, "base64");
    const iv = combined.subarray(0, IV_LEN);
    const tag = combined.subarray(IV_LEN, IV_LEN + TAG_LEN);
    const ciphertext = combined.subarray(IV_LEN + TAG_LEN);
    const decipher = createDecipheriv(ALG, getKey(), iv);
    decipher.setAuthTag(tag);
    let decrypted = decipher.update(ciphertext, undefined, "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch {
    return null;
  }
}

/** HMAC-SHA256 signature for Binance API requests. */
export function signBinance(params: string, secret: string): string {
  return createHmac("sha256", secret).update(params).digest("hex");
}
