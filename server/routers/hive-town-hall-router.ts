import { z } from "zod";
import { assertAiEntitled } from "../_core/access-entitlements";
import {
  endTownHallSession,
  getTownHallPanelPreview,
  getTownHallSession,
  getTownHallTurns,
  listTownHallSessions,
  scheduleTownHallSession,
  sendTownHallMessage,
  type TownHallPanelMode,
} from "../_core/hive-town-hall-service";
import { assertSectionEnabledForRequest } from "../_core/platform-section-guard";
import { secureProcedure, router, TRPCError } from "../_core/trpc";

const panelModeSchema = z.enum(["all_categories", "category", "recommended", "custom"]);

export const hiveTownHallRouter = router({
  listSessions: secureProcedure("hiveTownHall").query(({ ctx }) =>
    listTownHallSessions(String(ctx.user.id)),
  ),

  getSession: secureProcedure("hiveTownHall")
    .input(z.object({ sessionId: z.string().uuid() }))
    .query(({ ctx, input }) => {
      const session = getTownHallSession(input.sessionId, String(ctx.user.id));
      if (!session) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Town hall session not found." });
      }
      const panel = getTownHallPanelPreview({
        mode: session.panelMode,
        category: session.category,
        specialistIds: session.specialistIds,
      });
      return {
        session,
        panel,
        turns: getTownHallTurns(input.sessionId),
      };
    }),

  previewPanel: secureProcedure("hiveTownHall")
    .input(
      z.object({
        mode: panelModeSchema,
        category: z.string().max(64).optional(),
        specialistIds: z.array(z.string().max(64)).max(12).optional(),
        seedMessage: z.string().max(500).optional(),
      }),
    )
    .query(({ input }) => ({
      panel: getTownHallPanelPreview({
        mode: input.mode as TownHallPanelMode,
        category: input.category,
        specialistIds: input.specialistIds,
        seedMessage: input.seedMessage,
      }),
    })),

  schedule: secureProcedure("hiveTownHall")
    .input(
      z.object({
        title: z.string().trim().min(1).max(120),
        /** ISO datetime — use now or near-future for instant town halls */
        scheduledAt: z.string().datetime(),
        panelMode: panelModeSchema.default("all_categories"),
        category: z.string().max(64).optional(),
        specialistIds: z.array(z.string().max(64)).max(12).optional(),
        seedMessage: z.string().max(500).optional(),
      }),
    )
    .mutation(({ ctx, input }) => {
      assertSectionEnabledForRequest("hive_town_hall", ctx.isPlatformOwner);
      assertAiEntitled({
        userId: ctx.user.id,
        email: ctx.user.email,
        isPlatformOwner: ctx.isPlatformOwner,
        feature: "ai_hive",
      });

      const session = scheduleTownHallSession({
        hostUserId: String(ctx.user.id),
        title: input.title,
        scheduledAt: input.scheduledAt,
        panelMode: input.panelMode,
        category: input.category,
        specialistIds: input.specialistIds,
        seedMessage: input.seedMessage,
      });

      return {
        session,
        panel: getTownHallPanelPreview({
          mode: session.panelMode,
          category: session.category,
          specialistIds: session.specialistIds,
          seedMessage: input.seedMessage,
        }),
      };
    }),

  sendMessage: secureProcedure("hiveTownHall")
    .input(
      z.object({
        sessionId: z.string().uuid(),
        message: z.string().trim().min(1).max(2000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      assertSectionEnabledForRequest("hive_town_hall", ctx.isPlatformOwner);
      assertAiEntitled({
        userId: ctx.user.id,
        email: ctx.user.email,
        isPlatformOwner: ctx.isPlatformOwner,
        feature: "ai_hive",
      });

      return sendTownHallMessage({
        sessionId: input.sessionId,
        hostUserId: String(ctx.user.id),
        message: input.message,
      });
    }),

  endSession: secureProcedure("hiveTownHall")
    .input(z.object({ sessionId: z.string().uuid() }))
    .mutation(({ ctx, input }) =>
      endTownHallSession(input.sessionId, String(ctx.user.id)),
    ),
});
