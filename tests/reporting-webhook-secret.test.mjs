import assert from 'node:assert/strict';
import test from 'node:test';
import {deploymentSecrets} from '../scripts/release.mjs';

test('a separately protected webhook secret preserves existing provider credentials',()=>{
  const env={REPORTING_SECRETS_JSON:JSON.stringify({RESEND_API_KEY:'re_existing'}),REPORTING_ADDITIONAL_SECRETS_JSON:JSON.stringify({GITHUB_TOKEN:'github_existing'}),RESEND_WEBHOOK_SECRET:'whsec_new'};
  assert.deepEqual(deploymentSecrets('production',env),{RESEND_API_KEY:'re_existing',GITHUB_TOKEN:'github_existing',RESEND_WEBHOOK_SECRET:'whsec_new'});
  assert.deepEqual(deploymentSecrets('production',{...env,RESEND_WEBHOOK_SECRET:''}),{RESEND_API_KEY:'re_existing',GITHUB_TOKEN:'github_existing'});
});

test('a conflicting webhook secret stops deployment without exposing either secret',()=>{
  for(const bundle of ['REPORTING_SECRETS_JSON','REPORTING_ADDITIONAL_SECRETS_JSON']) {
    const env={REPORTING_SECRETS_JSON:'{}',[bundle]:JSON.stringify({RESEND_WEBHOOK_SECRET:'whsec_existing_private'}),RESEND_WEBHOOK_SECRET:'whsec_new_private'};
    assert.throws(()=>deploymentSecrets('production',env),error=>{
      assert.match(error.message,/Duplicate reporting secret/);
      assert.ok(!error.message.includes('whsec_'));
      return true;
    });
  }
});

const OLD='o'.repeat(32),NEW='n'.repeat(40);
const adminEnv={REPORTING_SECRETS_JSON:JSON.stringify({ADMIN_TOKEN:OLD,RESEND_API_KEY:'re_existing'})};
test('admin_token_override_replaces_bundle_value',()=>{
  const lines=[];
  const secrets=deploymentSecrets('production',{...adminEnv,REPORTING_ADMIN_TOKEN:NEW},line=>lines.push(line));
  assert.deepEqual(secrets,{ADMIN_TOKEN:NEW,RESEND_API_KEY:'re_existing'});
  assert.deepEqual(lines,['ADMIN_TOKEN: rotated value from REPORTING_ADMIN_TOKEN']);
});
test('admin_token_override_absent_is_unchanged',()=>{
  const lines=[],plain=deploymentSecrets('production',adminEnv,line=>lines.push(line));
  assert.deepEqual(deploymentSecrets('production',{...adminEnv,REPORTING_ADMIN_TOKEN:''},line=>lines.push(line)),plain);
  assert.deepEqual(plain,{ADMIN_TOKEN:OLD,RESEND_API_KEY:'re_existing'});
  assert.deepEqual(lines,[]);
});
test('admin_token_override_short_value_fails_without_printing_it',()=>{
  for(const value of ['short_secret_value','   ']) assert.throws(()=>deploymentSecrets('production',{...adminEnv,REPORTING_ADMIN_TOKEN:value},()=>{}),error=>{
    assert.match(error.message,/REPORTING_ADMIN_TOKEN/);
    assert.ok(!error.message.includes(value.trim()||'\0'));
    return true;
  });
});
// other_keys_still_refuse_overlap: proved by 'a conflicting webhook secret stops deployment...' above
// and by operations.test.mjs 'deployment ships the composed bundle and refuses an overlapping key...'.
