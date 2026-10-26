import fs from "node:fs";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
const ledger = JSON.parse(
  fs.readFileSync(
    new URL(
      "../../../docs/qa/geographic-gameplay/source-adaptations.json",
      import.meta.url,
    ),
    "utf8",
  ),
);
const hash = (value: string | Buffer) =>
  createHash("sha256").update(value).digest("hex");
/** Exact successor contract, not a blanket hash replacement. Reversing only the
 * reviewed adapter additions must recover the previously protected source bytes. */
export function assertGeographicGameplaySource(
  path: string,
  current: Buffer,
  predecessor: string,
) {
  const record = ledger.files[path];
  if (!record) return false;
  assert.equal(
    record.beforeSha256,
    predecessor,
    "Adapter predecessor matches the existing preservation ledger",
  );
  assert.equal(
    hash(current),
    record.afterSha256,
    "Exact geographic adapter source revision",
  );
  let restored = current.toString();
  for (const change of record.adaptations) {
    assert.equal(
      restored.split(change.after).length - 1,
      1,
      "Each reviewed adaptation is unique",
    );
    restored = restored.replace(change.after, change.before);
  }
  assert.equal(
    hash(restored),
    predecessor,
    "Every legacy source byte survives reversing the adapters",
  );
  return true;
}
