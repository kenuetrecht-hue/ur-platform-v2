import { z } from "zod";
import axios from "axios";
import { router, publicProcedure } from "./_core/trpc";

/**
 * AI Real Estate Master Router
 * 
 * Comprehensive on-the-job site consultant for real estate investing.
 * Provides voice-enabled guidance, multi-format responses, calculators,
 * study materials, and collaboration capabilities.
 */

// ============================================================================
// Input/Output Schemas
// ============================================================================

const PropertyAnalysisSchema = z.object({
  address: z.string(),
  city: z.string(),
  state: z.string(),
  zipCode: z.string(),
  purchasePrice: z.number(),
  estimatedRepairCosts: z.number(),
  propertyType: z.enum(["single_family", "multi_family", "commercial", "land"]),
});

const VoiceQuerySchema = z.object({
  query: z.string(),
  voiceInput: z.boolean().optional(),
  context: z.string().optional(),
  sessionId: z.string().optional(),
});

const ImageAnalysisSchema = z.object({
  imageUrl: z.string(),
  propertyAddress: z.string().optional(),
  analysisType: z.enum(["condition", "repairs", "value", "general"]),
});

const CalculatorInputSchema = z.object({
  calculatorType: z.enum(["arv", "mao", "roi", "profit_margin", "repair_cost"]),
  propertyData: z.record(z.string(), z.any()),
});

const StudyModuleSchema = z.object({
  moduleId: z.string(),
  userId: z.string(),
  action: z.enum(["start", "continue", "complete"]),
});

const PracticeTestSchema = z.object({
  testId: z.string(),
  userId: z.string(),
  answers: z.array(z.object({
    questionId: z.string(),
    selectedAnswer: z.string(),
  })).optional(),
});

// ============================================================================
// Response Schemas
// ============================================================================

const MultiFormatResponseSchema = z.object({
  text: z.string(),
  videoUrl: z.string().optional(),
  audioUrl: z.string().optional(),
  diagramUrl: z.string().optional(),
  photoExamples: z.array(z.string()).optional(),
  relatedLinks: z.array(z.object({
    title: z.string(),
    url: z.string(),
  })).optional(),
});

const CalculatorResultSchema = z.object({
  calculationType: z.string(),
  result: z.number(),
  breakdown: z.record(z.string(), z.number()),
  recommendation: z.string(),
  status: z.enum(["good_deal", "fair_deal", "pass"]),
});

const PropertyAnalysisResultSchema = z.object({
  address: z.string(),
  arv: z.number(),
  mao: z.number(),
  estimatedRepairCosts: z.number(),
  estimatedProfit: z.number(),
  roi: z.number(),
  dealStatus: z.enum(["good_deal", "fair_deal", "pass"]),
  comparableSales: z.array(z.object({
    address: z.string(),
    salePrice: z.number(),
    soldDate: z.string(),
  })),
  recommendations: z.array(z.string()),
});

// ============================================================================
// Router Definition
// ============================================================================

// Lead Generation & Multi-Source Property Search Schemas
const LeadGenerationSchema = z.object({
  searchType: z.enum(["off_market", "wholesalers", "auctions", "foreclosures", "distressed"]),
  location: z.string(),
  priceRange: z.object({
    min: z.number(),
    max: z.number(),
  }),
  propertyType: z.enum(["single_family", "multi_family", "commercial", "land"]).optional(),
});

const PropertySearchSchema = z.object({
  source: z.enum(["zillow", "redfin", "realtor", "loopnet", "tax_assessor", "all"]),
  location: z.string(),
  filters: z.object({
    minPrice: z.number().optional(),
    maxPrice: z.number().optional(),
    beds: z.number().optional(),
    baths: z.number().optional(),
    sqft: z.number().optional(),
    propertyType: z.string().optional(),
  }).optional(),
});

// ElevenLabs voice synthesis for AI Real Estate Master
const synthesizeVoice = async (text: string, apiKey: string): Promise<string> => {
  try {
    const voiceId = "pNInz6obpgDGcFmaJgB"; // Professional male voice
    const response = await axios.post(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      { text, model_id: "eleven_monolingual_v1" },
      { headers: { "xi-api-key": apiKey }, responseType: "arraybuffer" }
    );
    return Buffer.from(response.data).toString("base64");
  } catch (error) {
    console.error("Voice synthesis error:", error);
    return "";
  }
};

export const aiRealEstateRouter = router({
  /**
   * Voice-enabled real estate consulting
   * User asks a question, AI responds with multi-format answer
   */
  askConsultant: publicProcedure
    .input(VoiceQuerySchema)
    .output(MultiFormatResponseSchema)
    .mutation(async ({ input }: { input: z.infer<typeof VoiceQuerySchema> }) => {
      const { query, voiceInput, context, sessionId } = input;

      // Determine query type and generate response
      let responseText = "";
      let videoUrl: string | undefined;
      let audioUrl: string | undefined;
      let diagramUrl: string | undefined;
      let relatedLinks: Array<{ title: string; url: string }> = [];

      // Example responses based on query keywords
      if (query.toLowerCase().includes("arv") || query.toLowerCase().includes("value")) {
        responseText = `To calculate After Repair Value (ARV), you need to:
1. Research comparable sales in the area
2. Adjust for property condition and upgrades
3. Factor in market trends
4. Use the 70% rule for maximum offer price

The ARV is typically 20-30% higher than current market value after renovations.`;
        videoUrl = "https://example.com/videos/arv-calculation";
        diagramUrl = "https://example.com/diagrams/arv-formula";
        relatedLinks = [
          { title: "ARV Calculation Guide", url: "https://example.com/arv-guide" },
          { title: "Comparable Sales Research", url: "https://example.com/comps" },
        ];
      } else if (query.toLowerCase().includes("funding") || query.toLowerCase().includes("finance")) {
        responseText = `Real estate funding options include:
1. Traditional bank loans (best rates, longer approval)
2. Hard money lenders (fast, higher rates)
3. Private money/investors (flexible terms)
4. Home equity loans (if you have equity)
5. Partnerships & joint ventures (shared risk)

Each has pros and cons depending on your situation.`;
        videoUrl = "https://example.com/videos/funding-options";
        diagramUrl = "https://example.com/diagrams/funding-comparison";
        relatedLinks = [
          { title: "Funding Comparison Chart", url: "https://example.com/funding-chart" },
          { title: "Hard Money Lenders Directory", url: "https://example.com/lenders" },
        ];
      } else if (query.toLowerCase().includes("contractor") || query.toLowerCase().includes("team")) {
        responseText = `Building your real estate team:
1. General Contractor - oversees all work
2. Licensed Electrician - electrical systems
3. Licensed Plumber - plumbing systems
4. HVAC Specialist - heating/cooling
5. Real Estate Agent - marketing & sales
6. Accountant - financial tracking
7. Attorney - legal matters

Vet each team member thoroughly before hiring.`;
        videoUrl = "https://example.com/videos/building-team";
        relatedLinks = [
          { title: "Contractor Vetting Checklist", url: "https://example.com/contractor-checklist" },
          { title: "Team Contact Template", url: "https://example.com/team-template" },
        ];
      } else {
        responseText = `I'm your real estate consultant. Ask me about:
- Property analysis & valuation
- Funding & financing options
- Contractor selection & management
- Renovation planning
- Deal analysis & ROI calculation
- Market research & comps
- House flipping strategies
- Getting started in real estate`;
      }

      return {
        text: responseText,
        videoUrl,
        audioUrl,
        diagramUrl,
        relatedLinks,
      };
    }),

  /**
   * Analyze property from image
   * Upload photo, AI identifies issues and provides guidance
   */
  analyzePropertyImage: publicProcedure
    .input(ImageAnalysisSchema)
    .output(MultiFormatResponseSchema)
    .mutation(async ({ input }: { input: z.infer<typeof ImageAnalysisSchema> }) => {
      const { imageUrl, propertyAddress, analysisType } = input;

      // Mock analysis results
      const analysisResults: Record<string, { text: string; videoUrl?: string; diagramUrl?: string }> = {
        condition: {
          text: `Property Condition Analysis:
- Roof: Fair condition, estimated 5-7 years remaining life
- Foundation: No visible cracks, appears sound
- Siding: Needs replacement, estimated cost $8,000-12,000
- Windows: Original, single-pane, recommend replacement
- HVAC: Age unknown, recommend inspection

Estimated total repair costs: $25,000-35,000`,
          videoUrl: "https://example.com/videos/property-inspection",
          diagramUrl: "https://example.com/diagrams/inspection-report",
        },
        repairs: {
          text: `Priority Repairs Identified:
1. Roof replacement (HIGH - safety concern)
2. Electrical panel upgrade (HIGH - code compliance)
3. Plumbing updates (MEDIUM - functionality)
4. HVAC replacement (MEDIUM - efficiency)
5. Cosmetic updates (LOW - aesthetic)

Recommended contractor specialties needed.`,
          videoUrl: "https://example.com/videos/repair-priority",
        },
        value: {
          text: `Property Value Assessment:
- Current market value: $150,000
- Estimated ARV after repairs: $195,000
- Potential profit (70% rule): $45,000
- Recommended offer price: $105,000

This appears to be a good investment opportunity.`,
        },
        general: {
          text: `General Property Overview:
- Property type: Single-family home
- Estimated square footage: 1,800 sq ft
- Lot size: 0.25 acres
- Year built: 1985
- Overall condition: Fair

Recommend full professional inspection before purchase.`,
        },
      };

      const result = analysisResults[analysisType] || analysisResults.general;

      return {
        text: result.text,
        videoUrl: result.videoUrl,
        diagramUrl: result.diagramUrl,
        relatedLinks: [
          { title: "Property Inspection Checklist", url: "https://example.com/inspection-checklist" },
          { title: "Repair Cost Database", url: "https://example.com/repair-costs" },
        ],
      };
    }),

  /**
   * Calculate property metrics
   * ARV, MAO, ROI, profit margin, repair costs
   */
  calculateMetrics: publicProcedure
    .input(CalculatorInputSchema)
    .output(CalculatorResultSchema)
    .mutation(async ({ input }: { input: z.infer<typeof CalculatorInputSchema> }) => {
      const { calculatorType, propertyData } = input;

      let result = 0;
      let breakdown: Record<string, number> = {};
      let recommendation = "";
      let status: "good_deal" | "fair_deal" | "pass" = "fair_deal";

      if (calculatorType === "arv") {
        // ARV = comparable sales average adjusted for property condition
        const comparableAverage = (propertyData.comparableAverage as number) || 200000;
        const conditionAdjustment = (propertyData.conditionAdjustment as number) || 0.95;
        result = comparableAverage * conditionAdjustment;
        breakdown = {
          comparableAverage,
          conditionAdjustment: conditionAdjustment * 100,
          arv: result,
        };
        recommendation = `ARV of $${result.toLocaleString()} is reasonable for this market.`;
      } else if (calculatorType === "mao") {
        // MAO = (ARV * 0.70) - repair costs
        const arv = (propertyData.arv as number) || 200000;
        const repairCosts = (propertyData.repairCosts as number) || 30000;
        result = arv * 0.70 - repairCosts;
        breakdown = {
          arv,
          seventyPercent: arv * 0.70,
          repairCosts,
          mao: result,
        };
        recommendation = `Maximum offer price: $${result.toLocaleString()}`;
        status = result > 0 ? "good_deal" : "pass";
      } else if (calculatorType === "roi") {
        // ROI = (profit / investment) * 100
        const profit = (propertyData.profit as number) || 45000;
        const investment = (propertyData.investment as number) || 150000;
        result = (profit / investment) * 100;
        breakdown = {
          profit,
          investment,
          roi: result,
        };
        recommendation = `${result.toFixed(1)}% ROI is ${result > 20 ? "excellent" : result > 15 ? "good" : "fair"}`;
        status = result > 20 ? "good_deal" : result > 15 ? "fair_deal" : "pass";
      } else if (calculatorType === "profit_margin") {
        // Profit margin = (ARV - purchase price - repairs) / ARV
        const arv = (propertyData.arv as number) || 200000;
        const purchasePrice = (propertyData.purchasePrice as number) || 150000;
        const repairCosts = (propertyData.repairCosts as number) || 30000;
        const profit = arv - purchasePrice - repairCosts;
        result = (profit / arv) * 100;
        breakdown = {
          arv,
          purchasePrice,
          repairCosts,
          profit,
          marginPercent: result,
        };
        recommendation = `Profit margin of ${result.toFixed(1)}% - ${result > 20 ? "Strong" : "Moderate"} opportunity`;
        status = result > 20 ? "good_deal" : result > 10 ? "fair_deal" : "pass";
      } else if (calculatorType === "repair_cost") {
        // Estimate repair costs based on square footage and condition
        const sqft = (propertyData.sqft as number) || 1800;
        const costPerSqft = (propertyData.costPerSqft as number) || 15;
        result = sqft * costPerSqft;
        breakdown = {
          sqft,
          costPerSqft,
          estimatedTotal: result,
        };
        recommendation = `Estimated repair costs: $${result.toLocaleString()}. Get multiple contractor bids.`;
      }

      return {
        calculationType: calculatorType,
        result,
        breakdown,
        recommendation,
        status,
      };
    }),

  /**
   * Analyze property deal
   * Complete analysis with ARV, MAO, comps, recommendations
   */
  analyzePropertyDeal: publicProcedure
    .input(PropertyAnalysisSchema)
    .output(PropertyAnalysisResultSchema)
    .mutation(async ({ input }: { input: z.infer<typeof PropertyAnalysisSchema> }) => {
      const { address, city, state, zipCode, purchasePrice, estimatedRepairCosts, propertyType } = input;

      // Mock comparable sales
      const comparableSales = [
        { address: "123 Main St", salePrice: 195000, soldDate: "2026-04-15" },
        { address: "456 Oak Ave", salePrice: 198000, soldDate: "2026-04-10" },
        { address: "789 Elm Rd", salePrice: 192000, soldDate: "2026-03-28" },
      ];

      const avgComps = comparableSales.reduce((sum, comp) => sum + comp.salePrice, 0) / comparableSales.length;
      const arv = avgComps * 0.95; // Adjust for condition
      const mao = arv * 0.70 - estimatedRepairCosts;
      const estimatedProfit = arv - purchasePrice - estimatedRepairCosts;
      const roi = (estimatedProfit / purchasePrice) * 100;

      let dealStatus: "good_deal" | "fair_deal" | "pass" = "fair_deal";
      if (estimatedProfit > purchasePrice * 0.25 && roi > 20) {
        dealStatus = "good_deal";
      } else if (estimatedProfit < purchasePrice * 0.10 || roi < 10) {
        dealStatus = "pass";
      }

      return {
        address: `${address}, ${city}, ${state} ${zipCode}`,
        arv: Math.round(arv),
        mao: Math.round(mao),
        estimatedRepairCosts,
        estimatedProfit: Math.round(estimatedProfit),
        roi: Math.round(roi * 10) / 10,
        dealStatus,
        comparableSales,
        recommendations: [
          dealStatus === "good_deal"
            ? "This is a strong investment opportunity. Consider making an offer."
            : dealStatus === "fair_deal"
              ? "This deal has potential but needs careful analysis. Get more comps."
              : "This deal doesn't meet investment criteria. Keep looking.",
          "Get a professional home inspection before purchase.",
          "Verify all repair estimates with licensed contractors.",
          "Research the local market and neighborhood trends.",
          "Consider holding vs. selling based on rental market.",
        ],
      };
    }),

  /**
   * Get study module content
   * Learning materials for real estate licensing prep
   */
  getStudyModule: publicProcedure
    .input(StudyModuleSchema)
    .output(z.object({
      moduleId: z.string(),
      title: z.string(),
      content: z.string(),
      videoUrl: z.string().optional(),
      nextModule: z.string().optional(),
      progress: z.number(),
    }))
    .mutation(async ({ input }: { input: z.infer<typeof StudyModuleSchema> }) => {
      const { moduleId, userId, action } = input;

      const modules: Record<string, { title: string; content: string; videoUrl?: string }> = {
        "intro-to-real-estate": {
          title: "Introduction to Real Estate Investing",
          content: `Real estate investing is the purchase, ownership, management, and sale of real property for profit.

Key concepts:
1. Property Types: residential, commercial, industrial, land
2. Investment Strategies: buy-and-hold, fix-and-flip, wholesaling, rental income
3. Market Analysis: understanding supply, demand, and pricing
4. Risk Management: diversification, insurance, contingencies
5. Financial Analysis: ROI, cash flow, cap rate calculations

Getting started requires capital, knowledge, and a solid team.`,
          videoUrl: "https://example.com/videos/intro-to-real-estate",
        },
        "property-analysis": {
          title: "Property Analysis & Valuation",
          content: `Property analysis is critical for making informed investment decisions.

Key metrics:
1. ARV (After Repair Value): estimated value after renovations
2. MAO (Maximum Allowable Offer): highest price you should pay
3. Comparable Sales: recent sales of similar properties
4. Cap Rate: annual income divided by property price
5. Cash Flow: monthly income minus expenses

The 70% Rule: Offer no more than 70% of ARV minus repair costs.`,
          videoUrl: "https://example.com/videos/property-analysis",
        },
        "financing-options": {
          title: "Financing & Funding Strategies",
          content: `Understanding your financing options is crucial for real estate success.

Financing sources:
1. Traditional Banks: best rates, longer approval, strict requirements
2. Hard Money Lenders: fast funding, higher rates, asset-based
3. Private Money: flexible terms, relationship-based
4. Home Equity Lines: if you have existing equity
5. Partnerships: shared investment and risk

Each option has trade-offs in terms of cost, speed, and flexibility.`,
          videoUrl: "https://example.com/videos/financing-options",
        },
      };

      const module = modules[moduleId] || modules["intro-to-real-estate"];

      return {
        moduleId,
        title: module.title,
        content: module.content,
        videoUrl: module.videoUrl,
        nextModule: "property-analysis",
        progress: action === "complete" ? 100 : action === "continue" ? 50 : 0,
      };
    }),

  /**
   * Get practice test
   * Real estate licensing exam prep questions
   */
  getPracticeTest: publicProcedure
    .input(PracticeTestSchema)
    .output(z.object({
      testId: z.string(),
      title: z.string(),
      questions: z.array(z.object({
        questionId: z.string(),
        question: z.string(),
        options: z.array(z.string()),
        correctAnswer: z.string().optional(),
        explanation: z.string().optional(),
      })),
      score: z.number().optional(),
      passed: z.boolean().optional(),
    }))
    .mutation(async ({ input }: { input: z.infer<typeof PracticeTestSchema> }) => {
      const { testId, userId, answers } = input;

      // Mock test questions
      const testQuestions = [
        {
          questionId: "q1",
          question: "What does ARV stand for?",
          options: [
            "Average Repair Value",
            "After Repair Value",
            "Annual Return Value",
            "Asset Recovery Value",
          ],
          correctAnswer: "After Repair Value",
          explanation: "ARV is the estimated value of a property after repairs and renovations are complete.",
        },
        {
          questionId: "q2",
          question: "What is the 70% rule in real estate investing?",
          options: [
            "Offer 70% of the asking price",
            "Offer no more than 70% of ARV minus repair costs",
            "Invest 70% of your capital",
            "Expect 70% ROI annually",
          ],
          correctAnswer: "Offer no more than 70% of ARV minus repair costs",
          explanation: "The 70% rule helps investors determine the maximum offer price to ensure profitability.",
        },
        {
          questionId: "q3",
          question: "Which financing option typically has the fastest approval?",
          options: [
            "Traditional bank loans",
            "Hard money lenders",
            "Home equity lines",
            "Government loans",
          ],
          correctAnswer: "Hard money lenders",
          explanation: "Hard money lenders typically approve loans within days, though at higher interest rates.",
        },
      ];

      let score = 0;
      if (answers && Array.isArray(answers)) {
        answers.forEach((answer: any) => {
          const question = testQuestions.find((q) => q.questionId === answer.questionId);
          if (question && answer.selectedAnswer === question.correctAnswer) {
            score++;
          }
        });
      }

      const scorePercentage = answers ? (score / answers.length) * 100 : 0;
      const passed = scorePercentage >= 70;

      return {
        testId,
        title: "Real Estate Investing Fundamentals - Practice Test",
        questions: testQuestions.map((q) => ({
          ...q,
          correctAnswer: answers ? q.correctAnswer : undefined,
          explanation: answers ? q.explanation : undefined,
        })),
        score: answers ? scorePercentage : undefined,
        passed: answers ? passed : undefined,
      };
    }),

  /**
   * Generate hot leads from multiple sources
   * Hunt down off-market deals, wholesalers, auctions, foreclosures
   */
  generateLeads: publicProcedure
    .input(LeadGenerationSchema)
    .output(z.object({
      searchType: z.string(),
      location: z.string(),
      leadsFound: z.number(),
      leads: z.array(z.object({
        id: z.string(),
        address: z.string(),
        price: z.number(),
        source: z.string(),
        dealType: z.string(),
        estimatedArv: z.number(),
        estimatedProfit: z.number(),
        urgency: z.enum(["high", "medium", "low"]),
        contactInfo: z.string().optional(),
        notes: z.string(),
      })),
      nextSteps: z.array(z.string()),
    }))
    .mutation(async ({ input }: { input: z.infer<typeof LeadGenerationSchema> }) => {
      const { searchType, location, priceRange } = input;

      const mockLeads = [
        {
          id: "lead_001",
          address: "123 Main St, " + location,
          price: 95000,
          source: "wholesaler_network",
          dealType: "Off-Market Deal",
          estimatedArv: 185000,
          estimatedProfit: 45000,
          urgency: "high" as const,
          contactInfo: "John Smith - (555) 123-4567",
          notes: "Motivated seller, needs quick sale, vacant property",
        },
        {
          id: "lead_002",
          address: "456 Oak Ave, " + location,
          price: 110000,
          source: "auction",
          dealType: "Foreclosure Auction",
          estimatedArv: 195000,
          estimatedProfit: 36500,
          urgency: "high" as const,
          contactInfo: "County Courthouse",
          notes: "Auction in 2 weeks, needs inspection",
        },
      ];

      return {
        searchType,
        location,
        leadsFound: mockLeads.length,
        leads: mockLeads,
        nextSteps: [
          "Contact sellers immediately",
          "Schedule property inspections",
          "Run full financial analysis",
          "Prepare offers for top 3 deals",
          "Secure financing pre-approval",
        ],
      };
    }),

  /**
   * Search properties across multiple sources
   * Zillow, Redfin, Realtor.com, LoopNet, Tax Assessor
   */
  searchProperties: publicProcedure
    .input(PropertySearchSchema)
    .output(z.object({
      source: z.string(),
      location: z.string(),
      resultsFound: z.number(),
      properties: z.array(z.object({
        id: z.string(),
        address: z.string(),
        price: z.number(),
        beds: z.number(),
        baths: z.number(),
        sqft: z.number(),
        yearBuilt: z.number(),
        listingUrl: z.string(),
        daysOnMarket: z.number().optional(),
        pricePerSqft: z.number(),
        zestimate: z.number().optional(),
        rentEstimate: z.number().optional(),
      })),
      sourceInfo: z.object({
        name: z.string(),
        description: z.string(),
        strengths: z.array(z.string()),
        bestFor: z.string(),
      }),
    }))
    .mutation(async ({ input }: { input: z.infer<typeof PropertySearchSchema> }) => {
      const { source, location } = input;

      const sourceInfo: Record<string, any> = {
        zillow: {
          name: "Zillow",
          description: "Largest real estate marketplace with MLS data",
          strengths: ["Largest inventory", "Zestimate valuations", "Rental estimates"],
          bestFor: "Comprehensive market analysis",
        },
        redfin: {
          name: "Redfin",
          description: "Real estate brokerage with MLS access",
          strengths: ["Detailed market data", "Agent insights", "Price trends"],
          bestFor: "Market analysis and competitive pricing",
        },
        realtor: {
          name: "Realtor.com",
          description: "NAR-backed platform with official MLS listings",
          strengths: ["Official MLS data", "Agent network", "Property history"],
          bestFor: "Official listings and agent connections",
        },
        loopnet: {
          name: "LoopNet",
          description: "Commercial real estate marketplace",
          strengths: ["Commercial properties", "Investment data", "Market analysis"],
          bestFor: "Commercial and multi-family investments",
        },
        tax_assessor: {
          name: "Tax Assessor Records",
          description: "Public property records and tax information",
          strengths: ["Owner information", "Property history", "Tax data"],
          bestFor: "Finding off-market deals",
        },
      };

      const mockProperties = [
        {
          id: "prop_001",
          address: "123 Main St, " + location,
          price: 150000,
          beds: 3,
          baths: 2,
          sqft: 1800,
          yearBuilt: 1985,
          listingUrl: "https://example.com/listing/123-main",
          daysOnMarket: 12,
          pricePerSqft: 83,
          zestimate: 155000,
          rentEstimate: 1200,
        },
      ];

      const sourceData = sourceInfo[source as string] || sourceInfo.zillow;

      return {
        source: sourceData.name,
        location,
        resultsFound: mockProperties.length,
        properties: mockProperties,
        sourceInfo: sourceData,
      };
    }),

  /**
   * Get printable documents
   * Checklists, templates, guides for real estate investing
   */
  getPrintableDocuments: publicProcedure
    .input(z.object({ documentType: z.string() }))
    .output(z.object({
      documentType: z.string(),
      title: z.string(),
      content: z.string(),
      downloadUrl: z.string(),
    }))
    .mutation(async ({ input }: { input: { documentType: string } }) => {
      const { documentType } = input;

      const documents: Record<string, { title: string; content: string; downloadUrl: string }> = {
        "property-analysis-worksheet": {
          title: "Property Analysis Worksheet",
          content: `PROPERTY ANALYSIS WORKSHEET
          
Address: _________________________________
City/State/ZIP: _________________________________
Property Type: _________________________________
Purchase Price: $_________________________________

COMPARABLE SALES ANALYSIS
Comp 1: $_____________ (Date: ________)
Comp 2: $_____________ (Date: ________)
Comp 3: $_____________ (Date: ________)
Average: $_____________
ARV Estimate: $_____________

REPAIR COST ESTIMATE
Roof: $_____________
Foundation: $_____________
Electrical: $_____________
Plumbing: $_____________
HVAC: $_____________
Cosmetic: $_____________
Total Repairs: $_____________

FINANCIAL ANALYSIS
ARV: $_____________
70% of ARV: $_____________
Minus Repairs: $_____________
MAO (Maximum Offer): $_____________
Profit Potential: $_____________
ROI: _____________%

RECOMMENDATION: [ ] Good Deal [ ] Fair Deal [ ] Pass`,
          downloadUrl: "https://example.com/downloads/property-analysis-worksheet.pdf",
        },
        "contractor-vetting-checklist": {
          title: "Contractor Vetting Checklist",
          content: `CONTRACTOR VETTING CHECKLIST

Contractor Name: _________________________________
License #: _________________ Expiration: __________
Insurance: [ ] Yes [ ] No Type: _________________

VERIFICATION
[ ] License verified with state board
[ ] Insurance verified and current
[ ] References checked (minimum 3)
[ ] Background check completed
[ ] Previous projects reviewed

INTERVIEW QUESTIONS
[ ] How long in business?
[ ] What's your warranty?
[ ] How do you handle changes?
[ ] Payment schedule discussed?
[ ] Timeline and deadlines confirmed?

RECOMMENDATIONS FROM REFERENCES
Reference 1: _________________ Rating: ___/5
Reference 2: _________________ Rating: ___/5
Reference 3: _________________ Rating: ___/5

DECISION: [ ] Hire [ ] Interview Others [ ] Pass`,
          downloadUrl: "https://example.com/downloads/contractor-checklist.pdf",
        },
        "house-flipping-guide": {
          title: "House Flipping Quick Start Guide",
          content: `HOUSE FLIPPING QUICK START GUIDE

STEP 1: FIND DEALS
- MLS listings
- Off-market properties
- Wholesalers
- Auctions
- Direct mail

STEP 2: ANALYZE PROPERTY
- Run comps
- Calculate ARV
- Estimate repairs
- Calculate MAO
- Determine profit potential

STEP 3: MAKE OFFER
- Submit at or below MAO
- Include inspection contingency
- Negotiate terms
- Get pre-approval

STEP 4: DUE DILIGENCE
- Professional inspection
- Verify repairs
- Check title
- Review permits

STEP 5: SECURE FINANCING
- Hard money lender
- Private money
- Bank loan
- Partnership

STEP 6: EXECUTE RENOVATIONS
- Hire contractors
- Manage timeline
- Track expenses
- Quality control

STEP 7: SELL PROPERTY
- List on MLS
- Show to buyers
- Negotiate offers
- Close sale`,
          downloadUrl: "https://example.com/downloads/house-flipping-guide.pdf",
        },
      };

      const doc = documents[documentType] || documents["property-analysis-worksheet"];

      return {
        documentType,
        title: doc.title,
        content: doc.content,
        downloadUrl: doc.downloadUrl,
      };
    }),

  synthesizeVoiceResponse: publicProcedure
    .input(z.object({ text: z.string() }))
    .mutation(async ({ input }) => {
      const apiKey = process.env.ELEVENLABS_API_KEY || "";
      if (!apiKey) {
        return { audio: null, error: "Voice API not configured" };
      }
      const audio = await synthesizeVoice(input.text, apiKey);
      return { audio: audio || null, error: audio ? null : "Failed to synthesize voice" };
    }),
});
