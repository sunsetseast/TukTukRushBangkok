import type { Bay, ParcelDesign } from "./buildingGrammar";

/** Local facade +u runs along the shop and +v faces the street. Cabinet,
 * lettering, cornice and canopy share this contract, with normal depth testing. */
export const STOREFRONT = {
  fasciaY: 4.32,
  letteringHeight: 0.95,
  cabinetHeight: 1.2,
  cabinetDepth: 0.7,
  cabinetCenter: 0.4,
  faceRelief: 0.09,
  corniceY: 5.12,
  awningY: 3.25,
  awningLipY: 3.03,
  awningDepth: 1.7,
  bladeRelief: 0.09,
} as const;

export function storefrontMount(p: ParcelDesign, a: Bay) {
  const W = a.width - 0.16,
    facade = Math.max(a.front, ...p.bays.map((b) => b.front));
  const width = Math.min(W - 0.55, a.type === "workshop" ? W * 0.65 : W - 0.55);
  return {
    u: a.u,
    y: STOREFRONT.fasciaY,
    v: facade + STOREFRONT.cabinetCenter,
    width,
    height: STOREFRONT.cabinetHeight,
    depth: STOREFRONT.cabinetDepth,
    face:
      facade +
      STOREFRONT.cabinetCenter +
      STOREFRONT.cabinetDepth / 2 +
      STOREFRONT.faceRelief,
    letteringWidth: width - 0.1,
    letteringHeight: STOREFRONT.letteringHeight,
    owner: p.id,
    protectedBottom: STOREFRONT.fasciaY - STOREFRONT.letteringHeight / 2 - 0.2,
    protectedTop: STOREFRONT.fasciaY + STOREFRONT.letteringHeight / 2 + 0.2,
    wallFront: a.front,
  };
}
export function facadePoint(p: ParcelDesign, u: number, y: number, v: number) {
  const b = p.parcel,
    yaw = b.yaw ?? 0,
    c = Math.cos(yaw),
    s = Math.sin(yaw);
  return { x: b.x + c * u + s * v, y, z: b.z - s * u + c * v };
}
/** Beyond both cabinet body and its decorative/luminous rails. */
export function districtFaceOffset(round = false) {
  return (round ? 0.31 : 0.3) + STOREFRONT.bladeRelief;
}
