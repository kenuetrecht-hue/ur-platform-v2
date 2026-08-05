import { z } from "zod";
import { secureProcedure, publicProcedure, router } from "../_core/trpc";
import {
  analyzeSchematicInput,
  BLUEPRINT_INDUSTRY_TRENDS,
  BLUEPRINT_READER_AI_ID,
  detectSchematicType,
  SCHEMATIC_TYPES,
  type SchematicType,
} from "../_core/blueprint-reading-service";

const schematicTypeSchema = z.enum([
  "architectural",
  "structural",
  "electrical",
  "plumbing_pid",
  "mechanical_hvac",
  "site_civil",
  "pcb_electronic",
  "automotive_wiring",
  "robotics_urdf",
  "piping_isometric",
  "fire_protection",
  "landscape",
  "marine",
  "aerospace",
  "general_engineering",
]);

export const blueprintReaderRouter = router({
  aiId: publicProcedure.query(() => ({ creatorId: BLUEPRINT_READER_AI_ID })),

  supportedTypes: publicProcedure.query(() => ({
    types: SCHEMATIC_TYPES,
    trends: BLUEPRINT_INDUSTRY_TRENDS,
  })),

  analyze: secureProcedure("blueprintReader")
    .input(
      z.object({
        description: z.string().min(10).max(8000),
        schematicType: schematicTypeSchema.optional(),
        fileName: z.string().max(256).optional(),
      }),
    )
    .mutation(({ input }) => analyzeSchematicInput(input)),

  detectType: secureProcedure("blueprintReader")
    .input(z.object({ text: z.string().min(3).max(4000) }))
    .query(({ input }) => detectSchematicType(input.text)),
});

export type { SchematicType };
