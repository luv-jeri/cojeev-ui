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
