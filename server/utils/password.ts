import crypto from "node:crypto";

const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LENGTH = 32;

/**
 * Hashes a password with scrypt for storage.
 *
 * @param password the plaintext password.
 * @returns the encoded digest.
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16);
  const derived = crypto.scryptSync(password, salt, KEY_LENGTH, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
  });

  return encodeDigest(salt, derived);
}

/**
 * Checks a password against a stored scrypt digest.
 *
 * @param password the plaintext password.
 * @param digest the stored digest.
 * @returns whether the password matches.
 */
export function verifyPassword(password: string, digest: string): boolean {
  const parsed = parseDigest(digest);
  if (!parsed) {
    return false;
  }

  const derived = crypto.scryptSync(password, parsed.salt, parsed.hash.length, {
    N: parsed.n,
    r: parsed.r,
    p: parsed.p,
  });

  if (derived.length !== parsed.hash.length) {
    return false;
  }

  return crypto.timingSafeEqual(derived, parsed.hash);
}

function encodeDigest(salt: Buffer, hash: Buffer): string {
  return [
    "scrypt",
    SCRYPT_N,
    SCRYPT_R,
    SCRYPT_P,
    salt.toString("base64url"),
    hash.toString("base64url"),
  ].join("$");
}

function parseDigest(digest: string): {
  n: number;
  r: number;
  p: number;
  salt: Buffer;
  hash: Buffer;
} | null {
  const [scheme, n, r, p, salt, hash] = digest.split("$");
  if (scheme !== "scrypt" || !n || !r || !p || !salt || !hash) {
    return null;
  }

  const params = {
    n: Number(n),
    r: Number(r),
    p: Number(p),
  };
  if (
    !Number.isInteger(params.n) ||
    !Number.isInteger(params.r) ||
    !Number.isInteger(params.p) ||
    params.n < 2 ||
    params.r < 1 ||
    params.p < 1
  ) {
    return null;
  }

  return {
    ...params,
    salt: Buffer.from(salt, "base64url"),
    hash: Buffer.from(hash, "base64url"),
  };
}
