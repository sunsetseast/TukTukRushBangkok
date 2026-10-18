# Stores and developed urban ground

The PR #26 base regenerated **5,111 physical generic building parcels** and **77 open roadside rays**. The earlier completeness pass had already created 762 frontage, 1,537 rear and 131 screened parcels; the problem was not simply a lack of building count. Shallow commercial ribbons left conspicuous secondary-block gaps, and the entire land plane was green, causing every service court and interstitial parcel to read as a grass field.

## Implemented

* The global land material now reads as quiet grey-beige urban aggregate. Authored park, temple-garden, hotel-garden and ceremonial-field surfaces remain responsible for their own landscaping. This material change does **not** reclassify empty land as completed development.
* A bounded secondary-block pass places up to 112 low-rise, collision-backed workshop/residential masses behind existing street rows on Ratchadamri, Phaya Thai, Sathorn, Charoen Krung, Silom, Rama IV, Naradhiwas, Charoen Nakhon, Song Wat and the old-town/Siam connector. Heights remain 7.5–17.4 m; widths and depths remain 12–16 m. Each candidate obeys road, water, park, authored-site, existing-building and entrance reservations.
* Existing infill parcels receive narrow mineral ground aprons, tied to their actual footprints. No random trees, fictitious park classification, invented roads or unreachable mission destinations are introduced by this pass.
* The completeness planner now caches its completed plan, preventing a repeated call from duplicating physical parcels.

On the unchanged PR #26 road/layout baseline, these changes produced **5,204 parcels and 71 open roadside rays**. The 112 additions displace some subsequent tiny frontage fits, so net building growth is 93 rather than 112. These are an isolated-change measurement; final full-PR numbers must come from the combined geographic reconstruction, rather than reusing this intermediate result.

## Real 7-Eleven identity

`convenienceStores.ts` converts existing street-facing generic premises, retaining the shared building collision. The current deterministic plan places 35 stores with at least 220 game metres of separation. It covers Chinatown, Siam, Sukhumvit, Silom/Sathorn, Khao San, Talat Noi/Bang Rak, ICONSIAM/Khlong San, west-bank residential districts and the north/south corridors.

Five configurations vary facade width, framing, projecting corner blade, canopy, high-rise frontage and transit shelter. The stores use the real **7-Eleven** name, the square numeral/word mark and orange/red/green fascia. Glass is opaque tinted geometry with selective emissive interior bands, avoiding transparent overdraw and per-store point lights. Details include door handles, product-color strips, a Thai 24-hour/water/snack poster and wall-mounted AC units. Safely available forecourts receive collision-backed bins and parked motorcycles; narrow entrance paths are kept clear. Store architecture uses fewer than 1,600 pieces through the existing spatial city batches, including the optional props.

Brand artwork is separately owned by `storeBrand.ts` and `public/brands/7-eleven-prototype.svg`. The runtime draws one shared 512 × 256 atlas using local fonts and vector commands; no photo texture or hotlinked image is used. This is a recreated, unlicensed prototype depiction. No license, affiliation, approval or endorsement is claimed.

Store positions are **representative compressed-neighborhood premises**, not claims that an exact real branch occupies each game coordinate. The stable `store:7-eleven:<district>:<index>` identifiers, public-road stops, nearest connected road nodes, entrance points and future water/refreshment/snack inventory support later interaction work. Shopping and driver-energy changes remain disabled so this PR does not introduce an incomplete second gameplay loop.

## Source inventory

| Reference | Used for |
| --- | --- |
| [7-Eleven Thailand official store finder](https://www.7eleven.co.th/find-store?filter=s) | Real brand identity and Thai store network context |
| [CP ALL 2024 One Report](https://www.cpall.co.th/wp-content/uploads/2025/03/CP_ALL_56-1_-OneReport_2024_EN_25MAR-Final.pdf) | Distinct residential, office, academic and service-station premises; format variety |
| [Sukhumvit 24 storefront photograph](https://www.bizzboard.com/business/7-eleven-%E0%B8%AA%E0%B8%B2%E0%B8%82%E0%B8%B2-%E0%B8%AA%E0%B8%B8%E0%B8%82%E0%B8%B8%E0%B8%A1%E0%B8%A7%E0%B8%B4%E0%B8%97-24-%E0%B8%AD%E0%B8%B0%E0%B8%A3%E0%B8%B4%E0%B8%AA%E0%B8%95%E0%B8%B1%E0%B9%89/) | Broad glazed frontage, fascia proportions, Thai streetscape context |
| [Ainur Iman night photograph](https://unsplash.com/photos/a-7-eleven-store-is-busy-at-night-TO9WumSU650) | Illuminated fascia, occupied window glow and narrow street context |
| [The Business Times, Bangkok convenience-store street photograph](https://www.businesstimes.com.sg/international/asean/billionaires-muscle-thai-convenience-store-kings-domain) | Compact storefront, adjacent sidewalk trade and projecting shop identity |

References were used for analysis. Their photographs were not copied into runtime assets. The logo is a simplified vector rendition, not an exact reproduction of a brand master file. Store fronts omit motorcycles and exterior bins where a safe forecourt is not available, rather than placing untracked sidewalk obstacles.

## Verification and limits

`scripts/check-convenience-urban.ts` checks neighborhood coverage, five variants, spacing, exact physical-premise reuse, public-road frontage, connected stopping data, dry placement, geometry/road clearance, physical forecourt props, disabled future interactions, bounded piece count, atlas UV separation, shared planning and resource ownership. It also checks that secondary-block parcels stay low and clear of roads and legitimate protected public space. The shipped Thai-font cmap regression now includes both convenience-store promotional phrases.

Visual approval comes from the rendered Chinatown and modern-district storefront views in the main gallery. A pass here proves placement and rendering budgets, not architectural fidelity. Remaining large parcels, world edges and public-space exclusions still require the combined PR's vacancy inventory and manual screenshot review. No physical iPhone test has been performed.
