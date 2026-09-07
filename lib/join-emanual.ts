/**
 * Join e-manual given to every new member — how to print and sell their own e-manuals.
 * Click labels match the live website / app.
 */

export const JOIN_EMANUAL_TITLE = "UR Platform e-manual";
export const JOIN_EMANUAL_SUBTITLE =
  "How to join, print your own e-manual, list it for sale, and get paid.";

export const JOIN_EMANUAL_HREF = "/e-manual" as const;

export const JOIN_EMANUAL_GIFT_LINE =
  "Every person who joins UR Platform receives this e-manual. Print it, keep it, and use it to sell your own.";

export type JoinEmanualStep = {
  number: number;
  title: string;
  clicks: string[];
};

export const JOIN_EMANUAL_STEPS: JoinEmanualStep[] = [
  {
    number: 1,
    title: "Open the website",
    clicks: [
      "Go to https://urplatform.llc in your browser (or open this same site on your phone).",
      "You land on the homepage (Welcome). That is the front door.",
      "Optional: tap Download the app from this website if you want the home-screen app. You can do every money step in the browser.",
    ],
  },
  {
    number: 2,
    title: "Create your account (this is how you join)",
    clicks: [
      "On the homepage, tap Join launch as creator → (or Create account →).",
      "Or go straight to https://urplatform.llc/signup",
      "Type your Name, Email, and Password.",
      "Under the role buttons, tap Content creator — that is the role that can sell e-manuals and keep 85% of those sales.",
      "Check the box that you accept the Terms of Use.",
      "Complete the Cloudflare security check if it appears.",
      "Tap the green/primary button to create the account.",
      "If the site says confirm your email, open your inbox, confirm, then go to Sign in (https://urplatform.llc/login).",
    ],
  },
  {
    number: 3,
    title: "Finish the 18+ ID check",
    clicks: [
      "After you sign in, the site opens Age verify. Play the free Cartoon Studio sample if you want — it explains the pictures. It does not skip the check.",
      "Photograph your ID front, ID back, and a live selfie as the page asks. This keeps fraud off the site and locks your creator name so your content stays yours.",
      "UR does not keep the ID pictures. A third-party checker (Google AI) looks at them only to confirm you are 18+ and that the selfie is you.",
      "When it passes, you are in. UR Platform then hands you this e-manual automatically — it is the welcome gift for every new member.",
    ],
  },
  {
    number: 4,
    title: "Print this e-manual (or save a PDF)",
    clicks: [
      "Stay on this page: https://urplatform.llc/e-manual",
      "On a computer, tap Print / Save as PDF at the top. Choose your printer, or choose Save as PDF / Microsoft Print to PDF.",
      "On a phone, open this page in the website browser, then use the browser Share → Print or Save as PDF.",
      "You now have a paper or PDF copy. You can sell copies of manuals you write the same way buyers will print yours.",
    ],
  },
  {
    number: 5,
    title: "Write your own e-manual with Author Muse",
    clicks: [
      "Tap Home (house icon) at the bottom.",
      "Under Quick Actions, tap Author Muse · Books.",
      "Or tap AIs → look for Writing / Author Muse (AI Author Muse).",
      "Tell it exactly what to write, for example: “Write a step-by-step e-manual on [your topic] for beginners. Short chapters. Clear headings.”",
      "Copy the finished text into a document. You can paste it into a new page, or print that chat from the browser (File → Print / Save as PDF).",
      "That PDF or print-out is the product you will sell.",
    ],
  },
  {
    number: 6,
    title: "Become a content creator (required to sell)",
    clicks: [
      "Tap Home → Quick Actions → Creator Dashboard. Or tap Profile → Creator Dashboard.",
      "If you see Become a content creator, tap it.",
      "Wait until the dashboard opens with Overview, Classes, Merch Shop, Promote, and ContentMate tabs.",
    ],
  },
  {
    number: 7,
    title: "List your e-manual for sale",
    clicks: [
      "On the Creator Dashboard, tap the Merch Shop tab at the top (store icon).",
      "Tap E-manual so the listing is sold as an e-manual, not a mug or shirt.",
      "In Product title, type the name of your manual.",
      "In Description, tell the buyer what they get and that they can print it.",
      "In Price USD, type your price (example 9.99). The lowest allowed is $0.99.",
      "Optional: paste an Image URL (cover picture).",
      "Tap List for sale.",
      "Your shop link is shown at the top as /shop/your-slug — share that link. Buyers also find shops from Home → UR Shop and Discover.",
    ],
  },
  {
    number: 8,
    title: "Connect payouts so you can get paid",
    clicks: [
      "On the Creator Dashboard, stay on Overview.",
      "Find Set up instant payouts (Uphold / blockchain).",
      "Connect Uphold with your Uphold email, or paste a USDC wallet address.",
      "You keep 85% of each e-manual / merch sale. UR keeps 15%. The customer pays their state sales tax and the Stripe card fee — you do not absorb those.",
      "Tips to you are 100% yours; the fan pays the card fee.",
      "Card checkout is still being finished (Stripe). You can list now; live card charges start when Stripe is on.",
    ],
  },
];

export const JOIN_EMANUAL_MONEY_NOTES = [
  "Content creator is the money role for selling your own e-manuals and classes.",
  "Affiliate is a different path: you earn $5 after a referred creator’s free 24 hours and five later sales (launch joiners).",
  "During the 30-day launch, 2,000 different people (1,000 followers + 1,000 paid subscribers) unlocks a full year of 50% off the platform fee after any first/second/third-hundred deal. 4,000 different people (2,000 followers + 2,000 paid) in those same 30 days makes that year 60% off instead. After slot 300, 50% starts the moment you hit 2,000; hitting 4,000 in the window upgrades the rest of that year to 60%.",
  "After the 30-day launch, new creators get regular 85/15.",
];
