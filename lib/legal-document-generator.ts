/**
 * Legal Document Generator
 * Generates attorney-ready legal framework PDF for UR LLC
 * Includes Terms of Service, Privacy Policy, DMCA, FTC, and COPPA compliance
 */

export interface LegalDocumentConfig {
  companyName: string;
  stateOfIncorporation: string;
  dmcaEmail: string;
  subscriptionPrice: number;
  generatedDate: Date;
  managingDirector: string;
  attorneyName?: string;
}

export function generateLegalHTML(config: LegalDocumentConfig): string {
  const formattedDate = config.generatedDate.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
    @page {
        size: A4;
        margin: 20mm 15mm;
        background-color: #ffffff;
        @bottom-right {
            content: "Page " counter(page) " of " counter(pages);
            font-family: 'Helvetica Neue', Arial, sans-serif;
            font-size: 8pt;
            color: #718096;
        }
        @bottom-left {
            content: "${config.companyName} — Legal Review Framework (Draft)";
            font-family: 'Helvetica Neue', Arial, sans-serif;
            font-size: 8pt;
            color: #718096;
        }
    }
    
    body {
        font-family: 'Times New Roman', Times, serif;
        font-size: 11pt;
        line-height: 1.6;
        color: #1a1a1a;
        margin: 0;
        padding: 0;
    }
    
    *, *::before, *::after {
        box-sizing: border-box;
    }
    
    .header-container {
        border-bottom: 2px solid #2d3748;
        padding-bottom: 12px;
        margin-bottom: 30px;
    }
    
    .company-title {
        font-family: 'Helvetica Neue', Arial, sans-serif;
        font-size: 24pt;
        font-weight: bold;
        color: #1a202c;
        text-transform: uppercase;
        letter-spacing: 1px;
        margin: 0;
    }
    
    .doc-subtitle {
        font-family: 'Helvetica Neue', Arial, sans-serif;
        font-size: 12pt;
        font-style: italic;
        color: #4a5568;
        margin-top: 5px;
        margin-bottom: 0;
    }
    
    .attorney-note-box {
        background-color: #edf2f7;
        border-left: 4px solid #4a5568;
        padding: 12px 15px;
        margin-bottom: 25px;
        font-family: 'Helvetica Neue', Arial, sans-serif;
        font-size: 10pt;
        color: #2d3748;
        page-break-inside: avoid;
    }
    
    .attorney-note-box strong {
        color: #1a202c;
    }
    
    h1 {
        font-family: 'Helvetica Neue', Arial, sans-serif;
        font-size: 16pt;
        font-weight: bold;
        color: #1a202c;
        margin-top: 30px;
        margin-bottom: 15px;
        border-bottom: 1px solid #e2e8f0;
        padding-bottom: 5px;
        page-break-after: avoid;
    }
    
    h2 {
        font-family: 'Helvetica Neue', Arial, sans-serif;
        font-size: 12pt;
        font-weight: bold;
        color: #2d3748;
        margin-top: 20px;
        margin-bottom: 10px;
        page-break-after: avoid;
    }
    
    p {
        margin-top: 0;
        margin-bottom: 12px;
        text-align: justify;
    }
    
    ol, ul {
        margin-top: 0;
        margin-bottom: 15px;
        padding-left: 25px;
    }
    
    li {
        margin-bottom: 6px;
        text-align: justify;
    }
    
    .bracket-field {
        background-color: #fffaf0;
        color: #b7791f;
        font-weight: bold;
        padding: 0 2px;
        border-bottom: 1px dashed #b7791f;
    }
    
    .signature-section {
        margin-top: 50px;
        page-break-inside: avoid;
    }
    
    .signature-table {
        display: table;
        width: 100%;
        margin-top: 30px;
    }
    
    .signature-row {
        display: table-row;
    }
    
    .signature-cell {
        display: table-cell;
        width: 45%;
        padding-bottom: 40px;
    }
    
    .signature-spacer {
        display: table-cell;
        width: 10%;
    }
    
    .line {
        border-top: 1px solid #4a5568;
        margin-top: 40px;
        padding-top: 5px;
        font-family: 'Helvetica Neue', Arial, sans-serif;
        font-size: 9pt;
        color: #4a5568;
    }
</style>
<title>${config.companyName} — Legal Documents Review Package</title>
</head>
<body>

    <div class="header-container">
        <h1 class="company-title">${config.companyName}</h1>
        <p class="doc-subtitle">Legal Terms, Disclosures, & Rules Framework for Attorney Review</p>
    </div>

    <div class="attorney-note-box">
        <strong>ATTORNEY REVIEW NOTE:</strong> This draft layout outlines the specific architectural, operational, and structural components of the <strong>"U R" cross-platform application</strong> (Expo Router framework deploying to iOS, Android, and Desktop Web browser environments). Key monetization features include a Freemium model with a <strong>\$${config.subscriptionPrice}/month subscription paywall</strong> for user-generated "Content Creator Groups," AI synthetic persona conversational models, and programmatic or curated third-party e-commerce affiliate linking (Walmart/Amazon). Please verify absolute compliance with the Federal Trade Commission (FTC) "Click-to-Cancel" Option rules, FTC Affiliate Endorsement Guides, and ${config.stateOfIncorporation} State data privacy and consumer statutes.
    </div>

    <h1>DOCUMENT 1: USER TERMS OF SERVICE & PRIVACY COMBINED FRAMEWORK</h1>
    
    <h2>1. BINDING AGREEMENT & MANDATORY REGISTRATION ACCEPTANCE</h2>
    <p>By registering an account, utilizing the "U R" application, or checking the mandatory "I have read and agree to the Terms of Use, Rules, & Regulations" registration block, the user explicitly enters into a legally binding contract with ${config.companyName} <span class="bracket-field">[${config.stateOfIncorporation}, USA]</span>. Access to the core interface is granted as a free-to-surf public venue; however, entry into explicit premium tiers remains subject to strict financial criteria outlined herein.</p>
    
    <h2>2. INTELLECTUAL PROPERTY LIABILITIES & USER-GENERATED CONTENT (UGC) SHIELD</h2>
    <p>U R operates strictly as an interactive computer service provider, hosting venue, and passive conduit for independent, non-employee third-party content creators. U R does not proactively monitor, review, verify, validate, or guarantee the accuracy, safety, originality, or legal compliance of materials, text, expressions, images, links, or recordings published by its creators or users.</p>
    <ul>
        <li><strong>Plagiarism and Ethical Disclaimers:</strong> U R expressly disclaims any and all liability arising from acts of plagiarism, ethical violations, uncredited appropriation of third-party concepts, or copying of data models committed by platform users. Creators assume sole, direct, civil, and professional liability for ensuring all shared workflows are original or properly licensed.</li>
        <li><strong>Secondary Copyright Infringement Immunity:</strong> In absolute accordance with 17 U.S.C. Section 512 (Digital Millennium Copyright Act "DMCA" Safe Harbor), UR LLC claims total statutory immunity from direct or contributory copyright claims. U R enforces a strict, zero-tolerance Repeat Infringer Policy requiring immediate termination of any creator account found to have violated intellectual property guidelines on multiple distinct occasions.</li>
    </ul>

    <h2>3. DMCA COPYRIGHT NOTICE & TAKEDOWN PROTOCOLS</h2>
    <p>If any external entity maintains a good-faith belief that content residing within the platform violates valid copyrights, a formal Takedown Notice must be submitted to our Designated DMCA Agent at: <span class="bracket-field">${config.dmcaEmail}</span>. To achieve statutory validity, the notice must contain: (i) identification of the copyrighted work claimed to have been infringed; (ii) exact identification of the specific location, Creator ID, or conversation node within the app; (iii) direct contact information for the claimant; and (iv) an explicit, signed statement executed under penalty of perjury confirming the accurate rights-holder representation.</p>

    <h2>4. FINANCIAL TRANSFERS & AUTOMATED SUBSCRIPTION TERMS</h2>
    <p>Access to individual Premium Content Creator Groups requires a recurring monthly subscription charge of exactly <span class="bracket-field">\$${config.subscriptionPrice} USD</span>. 
    By executing a transaction on the billing screen, the consumer provides express, affirmative consent to automated recurring cycles billed continuously every thirty (30) days until canceled.
    Cancellation structures operate under a strict parity framework: cancellation requires a single-action, non-delayed direct action button inside the primary user settings menu dashboard, interfacing securely via the Stripe Customer Portal. No auxiliary questionnaires, processing fees, or electronic messaging hurdles shall be imposed to delay or obstruct cancel commands.</p>

    <h1>DOCUMENT 2: REGULATORY STATUTORY COMPLIANCE DISCLOSURES</h1>
    
    <h2>1. FTC MANDATORY ADVERTISEMENT & AFFILIATE ENDORSEMENT DISCLOSURE</h2>
    <p>Pursuant to FTC Guides Concerning the Use of Endorsements and Testimonials in Advertising, notice is hereby given that the application incorporates systemic programmatic affiliate hyperlinks, tracking cookies, and product checkout modules tied directly to retail systems, specifically including but not limited to the Walmart Affiliate Program and Amazon Associates Network. Automated conversations, curated dashboards, list builders, and specific recommendations are structurally synchronized to generate variable financial commissions, transaction referral values, or direct affiliate payouts to ${config.companyName}. The presence of premium subscription frameworks (\$${config.subscriptionPrice}/mo) does not alter, diminish, or extinguish the commercial nature of recommended purchase points.</p>

    <h2>2. SYNTHETIC PERSONA & ARTIFICIAL INTELLIGENCE (AI) OPERATIONAL BOUNDARIES</h2>
    <p>Users are hereby explicitly notified that various functional personas, including but not limited to the interactive entity designated as "Aura," operate entirely as synthetic computer models generated via non-human Large Language Model (LLM) Application Programming Interfaces (APIs). 
    All textual output, checklist items, structured guides, and conversational text blocks are generated autonomously by software algorithms.</p>
    <ul>
        <li><strong>Absolute Medical and Clinical Disclaimer:</strong> Interactive AI outputs are provided strictly, entirely, and exclusively for generalized educational, organizational, and recreational purposes. No behavioral guidance, responses, tracking metrics, or textual interactions shall be construed, interpreted, or relied upon as valid clinical diagnosis, formal psychiatric care, medical prescriptions, counseling, or therapeutic advice. </li>
        <li><strong>Limitation of Practical Liability:</strong> ${config.companyName} maintains zero responsibility for errors, omissions, factual inaccuracies, or hallucinations introduced by artificial intelligence pipelines. Users engage with automated bots entirely at their own risk and assume full personal liability for verifying the safety and efficacy of external recommendations.</li>
    </ul>

    <h2>3. VERIFICATION OF AGE & JUVENILE PROTECTIONS</h2>
    <p>In adherence to the Children's Online Privacy Protection Act (COPPA), the app strictly bars users under thirteen (13) years of age. All registrants must successfully navigate the mandatory integrated age-verification screen. If data logs indicate a minor has circumvented the barrier, ${config.companyName} reserves the right to immediately purge all associated account histories and transaction data from current data environments.</p>

    <div class="signature-section">
        <p><em>The provisions above have been compiled strictly to serve as a comprehensive operational outline reflecting current system design files. They await final execution by legal counsel.</em></p>
        
        <div class="signature-table">
            <div class="signature-row">
                <div class="signature-cell">
                    <div class="line">${config.managingDirector}, Managing Director / President</div>
                </div>
                <div class="signature-spacer"></div>
                <div class="signature-cell">
                    <div class="line">Date Signed: ${formattedDate}</div>
                </div>
            </div>
            <div class="signature-row">
                <div class="signature-cell">
                    <div class="line">${config.attorneyName || "Reviewing Corporate Legal Attorney"} (Signature)</div>
                </div>
                <div class="signature-spacer"></div>
                <div class="signature-cell">
                    <div class="line">Date of Approval & Verification</div>
                </div>
            </div>
        </div>
    </div>

</body>
</html>
`;
}

export function getLegalDocumentConfig(): LegalDocumentConfig {
  return {
    companyName: "UR LLC",
    stateOfIncorporation: "Indiana",
    dmcaEmail: "legal@ur.app",
    subscriptionPrice: 4.99,
    generatedDate: new Date(),
    managingDirector: "Kenneth",
    attorneyName: undefined,
  };
}
