import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {assertWranglerVersion,satisfiesRange,wranglerSpec} from '../scripts/wrangler-version.mjs';

// The regression this file exists for: release.mjs hardcoded 4.130.0 while the
// lockfile had moved to 4.136.3, so CI failed at "Prepare both environments" and
// every check after it was skipped. The guard must track package.json, not a literal.
test('the release guard tracks the declared wrangler range instead of a hardcoded version',async()=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'cojeev-wrangler-pin-'));
  try {
    const write=async(manifest)=>fs.writeFile(path.join(root,'package.json'),JSON.stringify(manifest));
    const install=async version=>{
      await fs.mkdir(path.join(root,'node_modules/wrangler'),{recursive:true});
      await fs.writeFile(path.join(root,'node_modules/wrangler/package.json'),JSON.stringify({name:'wrangler',version}));
    };
    const guard=()=>assertWranglerVersion(path.join(root,'node_modules/wrangler'),path.join(root,'package.json'),'Locked Wrangler');

    await write({devDependencies:{wrangler:'^4.136.3'}});
    await install('4.136.3');
    assert.equal(guard(),'4.136.3','the lockfile install satisfies the declared range');

    await install('4.136.4');
    assert.equal(guard(),'4.136.4','a newer patch inside the declared caret range is not a failure');

    await install('5.0.0');
    assert.throws(guard,/Locked Wrangler \^4\.136\.3 required, found 5\.0\.0/,'a major outside the range must fail and name both versions');

    await install('4.130.0');
    assert.throws(guard,/\^4\.136\.3 required, found 4\.130\.0/,'the historically stale 4.130.0 pin no longer passes once the range has moved');

    // Moving the range in package.json must move the guard with it, with no code edit.
    await write({devDependencies:{wrangler:'4.140.0'}});
    await install('4.140.0');
    assert.equal(guard(),'4.140.0');
    await install('4.136.3');
    assert.throws(guard,/4\.140\.0 required, found 4\.136\.3/,'an exact pin is enforced exactly');

    await write({dependencies:{wrangler:'~4.136.3'}});
    await install('4.137.0');
    assert.throws(guard,/~4\.136\.3 required/, 'a tilde pin does not silently accept a later minor');
    await install('4.136.9');
    assert.equal(guard(),'4.136.9');

    // A missing declared dependency is a configuration error, not a silent pass.
    await write({devDependencies:{}});
    await install('4.136.3');
    assert.throws(guard,/declares no wrangler dependency/);
    assert.throws(()=>wranglerSpec(path.join(root,'package.json')),/declares no wrangler dependency/);
  } finally {await fs.rm(root,{recursive:true,force:true});}
});

test('the wrangler range checker covers the forms this repository actually pins',()=>{
  for(const [version,spec] of [['4.136.3','^4.136.3'],['4.200.1','^4.136.3'],['4.136.3','4.136.3'],['4.136.3','>=4.130.0'],['4.136.3','~4.136.0'],['4.136.3','>=4.0.0 <5.0.0'],['5.1.0','^4.136.3 || ^5.0.0'],['0.2.5','^0.2.0']]) {
    assert.equal(satisfiesRange(version,spec),true,`${version} should satisfy ${spec}`);
  }
  for(const [version,spec] of [['4.130.0','^4.136.3'],['5.0.0','^4.136.3'],['4.135.9','^4.136.3'],['4.136.3','>4.136.3'],['4.137.0','~4.136.3'],['0.3.0','^0.2.0'],['4.136.3','latest'],['4.136.3-beta.1','^4.136.3'],['','^4.136.3']]) {
    assert.equal(satisfiesRange(version,spec),false,`${version} should not satisfy ${spec}`);
  }
});

test('the installed lockfile wrangler satisfies the declared range',async()=>{
  const root=await fs.realpath(new URL('..',import.meta.url).pathname);
  const version=assertWranglerVersion(path.join(root,'node_modules/wrangler'),path.join(root,'package.json'),'Locked Wrangler');
  const declared=JSON.parse(await fs.readFile(path.join(root,'node_modules/wrangler/package.json'),'utf8')).version;
  assert.equal(version,declared);
  assert.match(version,/^\d+\.\d+\.\d+$/);
});
