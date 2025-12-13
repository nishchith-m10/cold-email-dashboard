import crypto from 'crypto';
import { supabaseAdmin } from './supabase';

const ALGO = 'aes-256-gcm';

function getKey(): Buffer | null {
  const raw = process.env.ASK_KEY_ENCRYPTION_KEY;
  if (!raw) return null;
  // Expect hex or base64; prefer hex
  if (/^[0-9a-fA-F]+$/.test(raw) && raw.length === 64) {
    return Buffer.from(raw, 'hex');
  }
  const buf = Buffer.from(raw, 'base64');
  if (buf.length === 32) return buf;
  return null;
}

function encryptSecret(plain: string): string {
  const key = getKey();
  if (!key) throw new Error('ASK_KEY_ENCRYPTION_KEY is not configured or invalid (needs 32 bytes).');
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, key as any, iv as any);
  const ciphertext = Buffer.concat([new Uint8Array(cipher.update(new Uint8Array(Buffer.from(plain, 'utf8')))), new Uint8Array(cipher.final())]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${ciphertext.toString('hex')}:${tag.toString('hex')}`;
}

function decryptSecret(payload: string): string {
  const key = getKey();
  if (!key) throw new Error('ASK_KEY_ENCRYPTION_KEY is not configured or invalid (needs 32 bytes).');
  const [ivHex, ctHex, tagHex] = payload.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const ct = Buffer.from(ctHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGO, key as any, iv as any);
  decipher.setAuthTag(new Uint8Array(tag) as any);
  const plain = Buffer.concat([new Uint8Array(decipher.update(new Uint8Array(ct))), new Uint8Array(decipher.final())]).toString('utf8');
  return plain;
}

export async function setAskKey(params: {
  userId: string;
  workspaceId: string;
  provider: 'openai' | 'openrouter';
  apiKey: string;
}): Promise<{ success: boolean; error?: string }> {
  if (!supabaseAdmin) return { success: false, error: 'Database not configured' };
  if (!params.apiKey.trim()) return { success: false, error: 'Empty key' };
  try {
    const ciphertext = encryptSecret(params.apiKey.trim());
    const { error } = await supabaseAdmin
      .from('ask_api_keys')
      .upsert(
        {
          user_id: params.userId,
          workspace_id: params.workspaceId,
          provider: params.provider,
          key_ciphertext: ciphertext,
        },
        { onConflict: 'user_id,workspace_id,provider' }
      );
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e?.message || 'Encryption failed' };
  }
}

export async function deleteAskKey(params: {
  userId: string;
  workspaceId: string;
  provider: 'openai' | 'openrouter';
}): Promise<{ success: boolean; error?: string }> {
  if (!supabaseAdmin) return { success: false, error: 'Database not configured' };
  const { error } = await supabaseAdmin
    .from('ask_api_keys')
    .delete()
    .eq('user_id', params.userId)
    .eq('workspace_id', params.workspaceId)
    .eq('provider', params.provider);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function getAskKey(params: {
  userId: string;
  workspaceId: string;
  provider: 'openai' | 'openrouter';
}): Promise<{ apiKey: string | null; error?: string }> {
  if (!supabaseAdmin) return { apiKey: null, error: 'Database not configured' };
  try {
    const { data, error } = await supabaseAdmin
      .from('ask_api_keys')
      .select('key_ciphertext')
      .eq('user_id', params.userId)
      .eq('workspace_id', params.workspaceId)
      .eq('provider', params.provider)
      .maybeSingle();
    if (error) return { apiKey: null, error: error.message };
    if (!data?.key_ciphertext) return { apiKey: null };
    const apiKey = decryptSecret(data.key_ciphertext);
    return { apiKey };
  } catch (e: any) {
    return { apiKey: null, error: e?.message || 'Decrypt failed' };
  }
}

export async function getAskKeyStatus(params: {
  userId: string;
  workspaceId: string;
}): Promise<{
  openaiConfigured: boolean;
  openrouterConfigured: boolean;
  hasEnvOpenAI: boolean;
  hasEnvOpenRouter: boolean;
  error?: string;
}> {
  if (!supabaseAdmin) return { openaiConfigured: false, openrouterConfigured: false, hasEnvOpenAI: false, hasEnvOpenRouter: false, error: 'Database not configured' };

  const hasEnvOpenAI = Boolean(process.env.OPENAI_API_KEY);
  const hasEnvOpenRouter = Boolean(process.env.OPENROUTER_API_KEY);

  try {
    const { data, error } = await supabaseAdmin
      .from('ask_api_keys')
      .select('provider')
      .eq('user_id', params.userId)
      .eq('workspace_id', params.workspaceId);
    if (error) return { openaiConfigured: false, openrouterConfigured: false, hasEnvOpenAI, hasEnvOpenRouter, error: error.message };
    const openaiConfigured = data?.some((row: any) => row.provider === 'openai') ?? false;
    const openrouterConfigured = data?.some((row: any) => row.provider === 'openrouter') ?? false;
    return { openaiConfigured, openrouterConfigured, hasEnvOpenAI, hasEnvOpenRouter };
  } catch (e: any) {
    return { openaiConfigured: false, openrouterConfigured: false, hasEnvOpenAI, hasEnvOpenRouter, error: e?.message || 'Status failed' };
  }
}
