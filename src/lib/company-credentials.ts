import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function getEncryptionKey(): Buffer {
  const secret = process.env.COMPANY_CREDENTIALS_SECRET;
  if (!secret) {
    throw new Error("COMPANY_CREDENTIALS_SECRET is not set");
  }

  return createHash("sha256").update(secret).digest();
}

export function encryptCompanyPassword(password: string): string {
  if (!password) return "";

  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  const encrypted = Buffer.concat([
    cipher.update(password, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return `${iv.toString("base64")}:${tag.toString("base64")}:${encrypted.toString("base64")}`;
}

export function decryptCompanyPassword(encryptedValue: string): string {
  if (!encryptedValue) return "";

  const key = getEncryptionKey();
  const [ivB64, tagB64, payloadB64] = encryptedValue.split(":");

  if (!ivB64 || !tagB64 || !payloadB64) {
    return "";
  }

  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const payload = Buffer.from(payloadB64, "base64");

  const decipher = createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([
    decipher.update(payload),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}
