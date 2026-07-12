import { router, publicProcedure } from "@/server/_core/trpc";
import { z } from "zod";
import {
  LegalReferenceModule,
  LegalReferenceQuerySchema,
  IAIDocumentForgeItem,
} from "./legal-reference-assistant";

export const legalReferenceRouter = router({
  /**
   * Get legal reference assistant info
   */
  getAssistantInfo: publicProcedure.query(async () => {
    return LegalReferenceModule.AILegalReferenceAssistant;
  }),

  /**
   * Get compliance configuration
   */
  getComplianceConfig: publicProcedure.query(async () => {
    return LegalReferenceModule.COMPLIANCE_CONFIG;
  }),

  /**
   * Search case law
   */
  searchCaseLaw: publicProcedure
    .input(LegalReferenceQuerySchema)
    .query(async ({ input }) => {
      const cases = LegalReferenceModule.retrieveCaseLaw(input);
      const brief = LegalReferenceModule.generateLegalBrief(cases);
      const disclaimerInjected = LegalReferenceModule.injectLegalDisclaimerToOutput(brief);

      return {
        cases,
        brief: disclaimerInjected,
        resultCount: cases.length,
      };
    }),

  /**
   * Get case law database
   */
  getCaseLawDatabase: publicProcedure.query(async () => {
    return LegalReferenceModule.CASE_LAW_DATABASE;
  }),

  /**
   * Process legal document sale
   */
  processDocumentSale: publicProcedure
    .input(
      z.object({
        documentId: z.string(),
        creatorUserId: z.string(),
        documentType: z.enum(["EBOOK", "POEM", "DOCUMENT", "GUIDE", "LEGAL_REFERENCE_BRIEF"]),
        title: z.string(),
        downloadUrl: z.string(),
        priceUSD: z.number().min(0.99).max(99.99),
        isPublishedToProfile: z.boolean(),
      })
    )
    .mutation(async ({ input }) => {
      const asset: IAIDocumentForgeItem = input;
      const saleResult = LegalReferenceModule.processDigitalProductSale(asset);

      return {
        success: true,
        documentId: asset.documentId,
        creatorUserId: asset.creatorUserId,
        priceUSD: asset.priceUSD,
        saleRoute: saleResult.route,
        urMediaProfit: saleResult.urMediaProfitUSD,
        creatorNetPayout: saleResult.creatorNetPayoutUSD,
        pointsCost: saleResult.pointsCost,
        bankSwipeFee: saleResult.bankSwipeFee,
      };
    }),

  /**
   * Calculate earnings for a given price
   */
  calculateEarnings: publicProcedure
    .input(
      z.object({
        priceUSD: z.number().min(0.99),
      })
    )
    .query(async ({ input }) => {
      const mockAsset: IAIDocumentForgeItem = {
        documentId: "calc_" + Date.now(),
        creatorUserId: "mock_creator",
        documentType: "LEGAL_REFERENCE_BRIEF",
        title: "Mock Document",
        downloadUrl: "https://example.com/mock",
        priceUSD: input.priceUSD,
        isPublishedToProfile: true,
      };

      const result = LegalReferenceModule.processDigitalProductSale(mockAsset);

      return {
        priceUSD: input.priceUSD,
        route: result.route,
        urMediaProfit: result.urMediaProfitUSD,
        creatorNetPayout: result.creatorNetPayoutUSD,
        pointsCost: result.pointsCost,
        bankSwipeFee: result.bankSwipeFee,
        breakdown: {
          creatorPercentage: 85,
          platformPercentage: 15,
          usesPointWall: input.priceUSD < 4.99,
        },
      };
    }),

  /**
   * Get legal brief with disclaimer
   */
  getLegalBrief: publicProcedure
    .input(
      z.object({
        caseIds: z.array(z.string()),
      })
    )
    .query(async ({ input }) => {
      const cases = LegalReferenceModule.CASE_LAW_DATABASE.filter((c) =>
        input.caseIds.includes(c.caseId)
      );
      const brief = LegalReferenceModule.generateLegalBrief(cases);
      const disclaimerInjected = LegalReferenceModule.injectLegalDisclaimerToOutput(brief);

      return {
        brief: disclaimerInjected,
        caseCount: cases.length,
      };
    }),
});
