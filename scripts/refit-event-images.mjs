/**
 * One-time fixer: re-crop every EXISTING event image to 16:9 so the old
 * uploads match the new auto-fit behavior. New uploads are already cropped
 * on the client — this just back-fills the ones uploaded before that.
 *
 * What it does, per event with an image_url:
 *   1. downloads the current image
 *   2. auto-orients (EXIF) + center-crops + resizes to 1600x900 (16:9)
 *   3. uploads the result to a new path in the `event-images` bucket
 *   4. points events.image_url at the new file
 *
 * Run it once, from the repo root, with your service-role credentials.
 * The service-role key bypasses storage rules, so this must run locally
 * (never commit the key, never ship this to the client).
 *
 *   npm install -D sharp        # one-time
 *   node --env-file=.env.local scripts/refit-event-images.mjs
 *
 * Add --groups to also re-crop group covers to 1:1 (1080x1080).
 * Add --dry to preview what it WOULD do without changing anything.
 */
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DRY = process.argv.includes("--dry");
const DO_GROUPS = process.argv.includes("--groups");

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env.\n" +
      "Run with:  node --env-file=.env.local scripts/refit-event-images.mjs",
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function refit({ table, urlColumn, bucket, width, height, label }) {
  const { data: rows, error } = await supabase
    .from(table)
    .select(`id, ${urlColumn}`)
    .not(urlColumn, "is", null);
  if (error) {
    console.error(`[${label}] query failed:`, error.message);
    return;
  }
  const items = (rows ?? []).filter((r) => r[urlColumn]);
  console.log(`[${label}] ${items.length} image(s) to refit (${width}x${height}).`);

  let ok = 0;
  for (const row of items) {
    const src = row[urlColumn];
    try {
      const res = await fetch(src);
      if (!res.ok) throw new Error(`download ${res.status}`);
      const input = Buffer.from(await res.arrayBuffer());

      const output = await sharp(input)
        .rotate() // honor EXIF orientation from phone photos
        .resize(width, height, { fit: "cover", position: "centre" })
        .jpeg({ quality: 85 })
        .toBuffer();

      if (DRY) {
        console.log(`  would refit ${table} ${row.id} (${input.length}B -> ${output.length}B)`);
        ok++;
        continue;
      }

      const path = `refit/${row.id}-${Date.now()}.jpg`;
      const up = await supabase.storage
        .from(bucket)
        .upload(path, output, { contentType: "image/jpeg", upsert: true });
      if (up.error) throw up.error;

      const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path);
      const upd = await supabase
        .from(table)
        .update({ [urlColumn]: pub.publicUrl })
        .eq("id", row.id);
      if (upd.error) throw upd.error;

      console.log(`  refit ${table} ${row.id} -> ${path}`);
      ok++;
    } catch (e) {
      console.error(`  FAILED ${table} ${row.id}:`, e?.message ?? e);
    }
  }
  console.log(`[${label}] done: ${ok}/${items.length} ${DRY ? "(dry run)" : "updated"}.`);
}

await refit({
  table: "events",
  urlColumn: "image_url",
  bucket: "event-images",
  width: 1600,
  height: 900,
  label: "events",
});

if (DO_GROUPS) {
  await refit({
    table: "groups",
    urlColumn: "cover_url",
    bucket: "chat-media",
    width: 1080,
    height: 1080,
    label: "groups",
  });
}

console.log("All done.");
