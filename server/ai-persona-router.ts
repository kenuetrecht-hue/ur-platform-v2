/**
 * AI Persona Identity Router
 * tRPC endpoints for loading and streaming agent identities
 */

import { router, publicProcedure } from "./_core/trpc";
import { z } from "zod";
import {
  loadActiveAgentIdentity,
  getAllAgentIdentities,
  streamAgentIdentity,
  AIPersonaIdentitySchema,
} from "./ai-persona-identity-core";

export const aiPersonaRouter = router({
  /**
   * Load a specific agent's vocal and visual identity
   */
  loadAgentIdentity: publicProcedure
    .input(z.object({ agentId: z.string() }))
    .query(async ({ input }: any) => {
      const identity = loadActiveAgentIdentity(input.agentId);
      return {
        success: true,
        identity: AIPersonaIdentitySchema.parse(identity),
        message: `✅ Loaded identity for agent: ${identity.displayName}`,
      };
    }),

  /**
   * Get all available agent identities
   */
  getAllIdentities: publicProcedure.query(async () => {
    const identities = getAllAgentIdentities();
    return {
      success: true,
      count: identities.length,
      identities: identities.map((id) => AIPersonaIdentitySchema.parse(id)),
      message: `✅ Loaded ${identities.length} agent identities`,
    };
  }),

  /**
   * Stream agent identity for real-time interaction
   */
  streamAgentIdentity: publicProcedure
    .input(z.object({ agentId: z.string() }))
    .query(async ({ input }: any) => {
      const stream = streamAgentIdentity(input.agentId);
      return {
        success: true,
        stream,
        message: `🎙️ Streaming identity for: ${stream.displayName}`,
      };
    }),

  /**
   * Get identities by category
   */
  getIdentitiesByCategory: publicProcedure
    .input(z.object({ category: z.string() }))
    .query(async ({ input }: any) => {
      const allIdentities = getAllAgentIdentities();
      const filtered = allIdentities.filter((id) => id.category === input.category);
      return {
        success: true,
        category: input.category,
        count: filtered.length,
        identities: filtered.map((id) => AIPersonaIdentitySchema.parse(id)),
      };
    }),

  /**
   * Get voice configuration for an agent
   */
  getVoiceConfig: publicProcedure
    .input(z.object({ agentId: z.string() }))
    .query(async ({ input }: any) => {
      const identity = loadActiveAgentIdentity(input.agentId);
      return {
        success: true,
        agentId: identity.agentId,
        voiceModelId: identity.elevenLabsVoiceModelId,
        voiceConfig: {
          pitch: identity.vocalPitchModifier,
          speed: identity.vocalSpeed,
          tone: identity.vocalTone,
        },
        message: `🎙️ Voice config loaded for ${identity.displayName}`,
      };
    }),

  /**
   * Get avatar configuration for an agent
   */
  getAvatarConfig: publicProcedure
    .input(z.object({ agentId: z.string() }))
    .query(async ({ input }: any) => {
      const identity = loadActiveAgentIdentity(input.agentId);
      return {
        success: true,
        agentId: identity.agentId,
        displayName: identity.displayName,
        avatarUrl: identity.avatarImageUrl,
        backdrop: identity.visualBackdrop,
        realWorldVibe: identity.realWorldVibe,
        message: `🖼️ Avatar config loaded for ${identity.displayName}`,
      };
    }),
});
