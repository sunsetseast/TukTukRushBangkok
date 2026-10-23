import type { ParcelDesign } from "../src/game/bangkok/buildingGrammar";
import type { ArtPiece } from "../src/game/bangkok/architecturalBatch";
import { emitChinatownArchitecture } from "../src/game/bangkok/chinatownArchitecture";
/** Historical art gates now inspect the actual replacement emitter. The old
 * displaced-row facade is no longer the rendered Chinatown benchmark. */
export const chinatownBenchmark = (p: ParcelDesign) =>
  p.parcel.chinatown?.character === "yaowarat" &&
  !p.parcel.chinatown.role &&
  p.parcel.chinatown.identity !== "scala-yaowarat";
export function emitChinatownBenchmark(
  p: ParcelDesign,
  emit: (p: ArtPiece) => void,
) {
  if (!emitChinatownArchitecture(p, emit))
    throw Error("Benchmark must exercise the actual Chinatown renderer");
}
