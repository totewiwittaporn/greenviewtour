// Only archived-content-verified, same-intent mappings. Never catch-all redirect.
import {normalizePublicPath} from './public-routes.js'
export const publicLegacyRedirects = Object.freeze({
 '/how-to-get-to-surin-island': '/surin-islands/getting-there',
 '/koh-surin-accommodation': '/surin-islands/accommodation',
 '/sustainable-travel-to-surin-island': '/surin-islands/responsible-travel',
})
export const publicLegacyTarget = pathname => publicLegacyRedirects[normalizePublicPath(pathname)] ?? null
