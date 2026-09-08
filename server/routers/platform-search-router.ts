import { z } from "zod";
import { router, secureProcedure } from "../_core/trpc";
import { PLATFORM_SEARCH_KINDS, PLATFORM_SEARCH_QUERY_MAX } from "../../lib/platform-search-policy";
import { searchPlatform, suggestPlatformSearch } from "../_core/platform-search-service";

export const platformSearchRouter = router({
  search: secureProcedure("social")
    .input(
      z.object({
        query: z.string().trim().min(2).max(PLATFORM_SEARCH_QUERY_MAX),
        kind: z.enum(PLATFORM_SEARCH_KINDS).optional(),
        limit: z.number().int().min(4).max(40).optional(),
      }),
    )
    .query(({ ctx, input }) =>
      searchPlatform({
        query: input.query,
        kind: input.kind,
        limit: input.limit,
        isPlatformOwner: ctx.isPlatformOwner,
      }),
    ),

  suggest: secureProcedure("social").query(({ ctx }) =>
    suggestPlatformSearch({ isPlatformOwner: ctx.isPlatformOwner }),
  ),
});
