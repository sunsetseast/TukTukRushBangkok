/** Start with the source-backed ~180m gold/restaurant sequence, both sides.
 * Expansion is a deliberate checkpoint after inspecting the rendered showcase. */
export const RENAISSANCE_STAGE:'showcase'|'corridor'='corridor';
export const signatureFrontage=(f:{x:number;z:number;style:string})=>f.style==='yaowarat'&&f.x>=3250&&f.x<=3425&&f.z>=420&&f.z<=615;
export function renaissanceFrontage(f:{x:number;z:number;style:string}){return RENAISSANCE_STAGE==='corridor'||signatureFrontage(f);}

