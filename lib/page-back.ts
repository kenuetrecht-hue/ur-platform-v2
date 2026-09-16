import { AFTER_ID_PASS_HREF } from "@/lib/after-sign-in";

export const PAGE_BACK_FALLBACK = AFTER_ID_PASS_HREF;

type BackRouter = {
  canGoBack: () => boolean;
  back: () => void;
  replace: (href: typeof PAGE_BACK_FALLBACK) => void;
};

/** Leave this page: previous screen if we have one, otherwise Home. */
export function goBackOrHome(router: BackRouter): void {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  router.replace(PAGE_BACK_FALLBACK);
}
