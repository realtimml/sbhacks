import { Redis } from "@upstash/redis";
import type { TaskProposal } from "./types";

// Initialize Upstash Redis client
// Uses REST API - works in serverless/edge environments
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const PROPOSAL_TTL = 60 * 60 * 24 * 7; // 7 days
const SEEN_MESSAGE_TTL = 60 * 60; // 1 hour for deduplication

/**
 * Add a new task proposal for a user
 */
export async function addProposal(
  entityId: string,
  proposal: TaskProposal
): Promise<void> {
  const key = `proposals:${entityId}`;
  await redis.lpush(key, JSON.stringify(proposal));
  await redis.expire(key, PROPOSAL_TTL);
}

/**
 * Get all pending proposals for a user
 */
export async function getProposals(
  entityId: string,
  limit: number = 50
): Promise<TaskProposal[]> {
  const key = `proposals:${entityId}`;
  const raw = await redis.lrange(key, 0, limit - 1);
  return raw.map((item) =>
    typeof item === "string" ? JSON.parse(item) : item
  ) as TaskProposal[];
}

/**
 * Remove a specific proposal by ID
 */
export async function removeProposal(
  entityId: string,
  proposalId: string
): Promise<boolean> {
  const key = `proposals:${entityId}`;
  const proposals = await getProposals(entityId);
  const proposalToRemove = proposals.find((p) => p.proposalId === proposalId);

  if (!proposalToRemove) {
    return false;
  }

  // Remove the specific proposal from the list
  const removed = await redis.lrem(key, 1, JSON.stringify(proposalToRemove));
  return removed > 0;
}

/**
 * Get the count of pending proposals
 */
export async function getProposalCount(entityId: string): Promise<number> {
  const key = `proposals:${entityId}`;
  return await redis.llen(key);
}

/**
 * Check if a message has been seen recently (for deduplication)
 */
export async function hasSeenMessage(messageHash: string): Promise<boolean> {
  const key = `seen:${messageHash}`;
  const exists = await redis.exists(key);
  return exists > 0;
}

/**
 * Mark a message as seen
 */
export async function markMessageSeen(messageHash: string): Promise<void> {
  const key = `seen:${messageHash}`;
  await redis.set(key, "1", { ex: SEEN_MESSAGE_TTL });
}

/**
 * Create a hash for message deduplication
 */
export function createMessageHash(
  source: string,
  senderId: string,
  content: string
): string {
  // Simple hash using content + sender + source
  const str = `${source}:${senderId}:${content}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16);
}

/**
 * Store user settings (like Notion database ID)
 */
export async function setUserSetting(
  entityId: string,
  key: string,
  value: string
): Promise<void> {
  const settingKey = `settings:${entityId}:${key}`;
  await redis.set(settingKey, value);
}

/**
 * Get user setting
 */
export async function getUserSetting(
  entityId: string,
  key: string
): Promise<string | null> {
  const settingKey = `settings:${entityId}:${key}`;
  return await redis.get(settingKey);
}

/**
 * Delete user setting
 */
export async function deleteUserSetting(
  entityId: string,
  key: string
): Promise<void> {
  const settingKey = `settings:${entityId}:${key}`;
  await redis.del(settingKey);
}

/**
 * Rate limiting: check if entity has exceeded rate limit
 */
export async function checkRateLimit(
  entityId: string,
  maxRequests: number = 10,
  windowSeconds: number = 60
): Promise<{ allowed: boolean; remaining: number }> {
  const key = `ratelimit:${entityId}`;
  const current = await redis.incr(key);

  if (current === 1) {
    await redis.expire(key, windowSeconds);
  }

  const allowed = current <= maxRequests;
  const remaining = Math.max(0, maxRequests - current);

  return { allowed, remaining };
}
