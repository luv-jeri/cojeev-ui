import assert from 'node:assert/strict';
import test from 'node:test';
import {catalog,documentationCatalog} from '../lib/catalog';
import {createDocsSearch} from '../lib/docs-search';
test('Bento replaces AspectRatio discovery without deleting the primitive',()=>{
 assert.ok(catalog().some(e=>e.name==='aspect-ratio'));
 assert.ok(documentationCatalog().some(e=>e.name==='bento-grid'));
 assert.equal(documentationCatalog().some(e=>e.name==='aspect-ratio'),false);
 assert.ok(documentationCatalog().find(e=>e.name==='bento-grid')!.meta.api.some(api=>api.name==='AspectRatioProps'));
});
test('old proportional-layout search terms reach the unified Bento guide',async()=>{
 const found=await createDocsSearch().search('AspectRatio');assert.ok(found.some(r=>r.url==='/docs/bento-grid/'));
});
