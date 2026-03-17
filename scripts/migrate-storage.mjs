#!/usr/bin/env node

/**
 * Storage Migration Script
 * Migrates files from old Supabase project to new one.
 */

const OLD_URL = 'https://fcsiqoebtpfhzreamotp.supabase.co';
const NEW_URL = 'https://cymbadkegbibhxbfevuq.supabase.co';
const OLD_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZjc2lxb2VidHBmaHpyZWFtb3RwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Njk0NTc4MywiZXhwIjoyMDgyNTIxNzgzfQ._ZtGprgcAiUpAqab3F3IYOPCdLoNnLjw-VjUvHcHAyg';
const NEW_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN5bWJhZGtlZ2JpYmh4YmZldnVxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mzc3MTQxOCwiZXhwIjoyMDg5MzQ3NDE4fQ.ugP-03Gv2buAILoeEt3HM7kKzYyP8EFmVlUTMPsAB1w';

const BUCKETS = ['singularity-uploads', 'trip-media'];
const CONCURRENCY = 5;

async function listAllObjects(bucket, prefix = '') {
  const allObjects = [];
  let offset = 0;
  const limit = 1000;

  while (true) {
    const body = { prefix, limit, offset, sortBy: { column: 'name', order: 'asc' } };
    const resp = await fetch(`${OLD_URL}/storage/v1/object/list/${bucket}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OLD_SERVICE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`List failed for ${bucket}/${prefix}: ${resp.status} ${text}`);
    }

    const items = await resp.json();
    if (items.length === 0) break;

    for (const item of items) {
      const fullPath = prefix ? `${prefix}/${item.name}` : item.name;
      if (item.id) {
        // It's a file
        allObjects.push(fullPath);
      } else {
        // It's a folder - recurse
        const subItems = await listAllObjects(bucket, fullPath);
        allObjects.push(...subItems);
      }
    }

    if (items.length < limit) break;
    offset += limit;
  }

  return allObjects;
}

async function downloadFile(bucket, path) {
  const resp = await fetch(`${OLD_URL}/storage/v1/object/${bucket}/${encodeURIComponent(path)}`, {
    headers: { 'Authorization': `Bearer ${OLD_SERVICE_KEY}` },
  });
  if (!resp.ok) {
    // Try public URL as fallback
    const publicResp = await fetch(`${OLD_URL}/storage/v1/object/public/${bucket}/${path}`);
    if (!publicResp.ok) throw new Error(`Download failed: ${bucket}/${path} - ${resp.status}`);
    return publicResp;
  }
  return resp;
}

async function uploadFile(bucket, path, data, contentType) {
  const resp = await fetch(`${NEW_URL}/storage/v1/object/${bucket}/${path}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${NEW_SERVICE_KEY}`,
      'Content-Type': contentType || 'application/octet-stream',
      'x-upsert': 'true',
    },
    body: data,
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Upload failed: ${bucket}/${path} - ${resp.status} ${text}`);
  }
  return resp;
}

async function migrateFile(bucket, path) {
  const resp = await downloadFile(bucket, path);
  const contentType = resp.headers.get('content-type') || 'application/octet-stream';
  const buffer = await resp.arrayBuffer();
  await uploadFile(bucket, path, buffer, contentType);
}

async function processBatch(items, fn) {
  const results = { success: 0, failed: 0, errors: [] };

  for (let i = 0; i < items.length; i += CONCURRENCY) {
    const batch = items.slice(i, i + CONCURRENCY);
    const promises = batch.map(async (item) => {
      try {
        await fn(item);
        results.success++;
      } catch (err) {
        results.failed++;
        results.errors.push({ item, error: err.message });
      }
    });
    await Promise.all(promises);

    // Progress
    const done = Math.min(i + CONCURRENCY, items.length);
    if (done % 50 === 0 || done === items.length) {
      process.stdout.write(`\r  Progress: ${done}/${items.length} (${results.success} ok, ${results.failed} failed)`);
    }
  }
  console.log('');
  return results;
}

async function main() {
  console.log('=== Storage Migration ===\n');

  for (const bucket of BUCKETS) {
    console.log(`\nBucket: ${bucket}`);
    console.log('  Listing files...');

    const files = await listAllObjects(bucket);
    console.log(`  Found ${files.length} files`);

    if (files.length === 0) continue;

    console.log('  Migrating...');
    const results = await processBatch(files, (path) => migrateFile(bucket, path));

    console.log(`  Done: ${results.success} success, ${results.failed} failed`);
    if (results.errors.length > 0) {
      console.log('  Errors:');
      results.errors.slice(0, 10).forEach(e => console.log(`    ${e.item}: ${e.error}`));
      if (results.errors.length > 10) console.log(`    ... and ${results.errors.length - 10} more`);
    }
  }

  console.log('\n=== Migration Complete ===');
}

main().catch(console.error);
