/**
 * CRYPTO UTILS - Sidecar Credential Decryption
 *
 * Mirrors the AES-256-GCM implementation in lib/genesis/credential-vault.ts.
 * Must stay in sync with that file's deriveKey / decryptCredential logic.
 *
 * KEY DERIVATION:  SHA-256( masterKey + workspaceId )
 * CIPHER:          AES-256-GCM
 * FORMAT:          base64( iv[16] || authTag[16] || ciphertext )
 */

import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

function deriveKey(workspaceId: string, masterKey: string): Buffer {
  return crypto
    .createHash('sha256')
    .update(masterKey + workspaceId)
    .digest();
}

/**
 * Decrypt an AES-256-GCM encrypted credential blob.
 *
 * @param encryptedData  Base64 string produced by credential-vault.ts encryptCredential()
 * @param workspaceId    The workspace this credential belongs to (used to derive key)
 * @param masterKey      INTERNAL_ENCRYPTION_KEY from environment
 * @returns              Parsed JSON object containing the plaintext credential data
 */
export function decryptCredential(
  encryptedData: string,
  workspaceId: string,
  masterKey: string
): Record<string, unknown> {
  const key = deriveKey(workspaceId, masterKey);
  const blob = Buffer.from(encryptedData, 'base64');

  const iv = blob.subarray(0, IV_LENGTH);
  const authTag = blob.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const data = blob.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
  return JSON.parse(decrypted.toString('utf8'));
}
