# PR #5: Yaowarat visual fidelity — reference and QA log

**Source of truth:** Existing curved driving world + original 3D miniatures. This
change is a focused *art-direction implementation*, not a surveyed or
photogrammetric reconstruction of the entire Chinatown district. It does not
distribute any photographs or copyrighted commercial logo art.

## Address / photograph cross-check (critical)

| Game facade | Verified location | Evidence | What is accurate and what is not |
| --- | --- | --- | --- |
| Hua Seng Heng `hua418` | 418–420 Yaowarat at the Yao Phanit corner | [Official branch details](https://www.huasengheng.com/en/branch/บริษัท-ห้างขายทองฮั่วเซ่งเฮง-4/) | Correct name and branch address. Current cream arch + red storefront is inspired by the **different** Hua Seng Heng location at 255–257 in [official renovation coverage](https://www.huasengheng.com/news/hua-seng-heng-new-shop-at-yaowarat/). It is **not** asserted to be the actual elevation at 418. Need a dated 418 photo before exactness claims. |
| Nai Ek Roll Noodles `nai442` | 442 Yaowarat / Soi 9 | [2025 photo and description](https://www.phuket101.net/nai-ek-roll-noodle/), [442 storefront photo](https://th.trip.com/moments/detail/bangkok-191-16580510/) | White/red Thai restaurant sign, open serving counter, pots, stools, lamps and busy sidewalk are reference-inspired; neighboring facade widths remain approximate. |
| Thong Bai `thong444` | 444–444/1 Yaowarat | [Company website](https://thongbai.com/) | Thai wording and gold-shop category are plausible. **Do not copy** [BangkokType's photograph at 152–154](https://bangkoktype.com/2025/06/16/thong-bai-goldshop/) as an exact image of branch 444. Original sign artwork is a color-family interpretation only. |
| So Seng Heng `so456` | 456 Yaowarat | [Official company history](https://www.sosengheng.com/about-us) | Landmark model has original dragon-inspired crown, tall cabinet, pale masonry arch and shop name. Placement and physical construction are adapted; exact contemporary signage still needs photographic verification. |
| Context facades | **Fictional** | [BangkokType Yaowarat photographic typography archive](https://bangkoktype.com/category/yaowarat/), [Chulalongkorn signage discussion](https://www.imarch.arch.chula.ac.th/showcases/advanced-architectural-design-and-development-2025-section-2/) | Functional traditional Chinese trade labels `茶樓`, `旅店`, `麵館`, `藥房`, `布莊`, `飯店`. These are generic terms, not claims of actual store identity or location. |

## Delivered visual changes

- Eliminated the **generic facade architecture underneath the real-business
  hero compositions**; four main storefronts now have their own upper window
  arrangement, arches/pilasters, fascia, merchandising and counter modules.
- Added original artwork per signature sign, including Nai Ek's white/red Thai
  menu with correct shaping and differentiated gold-shop banners.
- Fixed an actual 3D bug: decorative vertical sign planes used to be embedded
  **inside** their 3D sign cabinets. Each new sign face is offset to its outward
  physical surface; black sign-box backs no longer hide the intended art.
- Added strongly differentiated heights, crown pieces, cabinet construction and
  Chinese functional signage to fictional neighboring fronts.
- Added small, local reference-inspired sidewalk vendor cart/table/lantern
  clusters at appropriate storefronts with multi-road and facade clearance
  checks. Props remain **visual-only**, not permanent physics obstacles.
- Harmonized the stylized tropical dusk sky, warm sunlight, cool ambient tone,
  and fog for stronger material and sign contrast.
- Preserved core driving, missions, pedestrian reactions, left-side traffic,
  original hero tuk-tuk, Fast/Pretty quality and mobile-focused geometry batching.

## Real WebGL visual evidence

The `Yaowarat art inspection` GitHub Actions workflow captures actual browser
WebGL, not hand-painted mockups:
`hua-418`, `nai-442`, `thong-444`, `so-456`,
`street-perspective`, `street-overview`, `landscape-844x390`,
`chase-on-yaowarat` and `chase-reverse-yaowarat`.

The chase captures use the real following camera and actual road coordinates.
They are static starting poses; **not** a substitute for a driven iPhone session.
Linux SwiftShader GPU measurements are **not iPhone performance evidence**.

## Remaining deficiencies: explicit non-acceptance items

- Building-by-building photos of the actual 418 and 444 branch facades and
  neighboring blocks; the existing art is still an interpretation, **not an
  identical 3D rendering of those real locations**.
- Proper street-level alignment to Soi 9 / Yao Phanit entrances, exact facade
  dimensions, real sign mounts and accurate storefront neighbors.
- Dense real-world motorbike and taxi traffic, sidewalk crowds and larger
  Chinatown nighttime sign glow. The new carts are a visual prototype.
- Real iPhone 17 Pro Max Safari driving and frame-time proof; verify reverse,
  steering, object collision, signage visibility and text legibility on-device.
- Commercial review of real businesses and any desired exact trade dress or
  logos before publishing the game.

**Keep PR draft** until user sees gameplay, especially the chase views, and
confirms the direction. Passing automated code tests alone is insufficient.
