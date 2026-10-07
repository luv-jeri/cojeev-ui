import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {environmentConfig} from '../scripts/release-config.mjs';
import {validateDeploymentConfig} from '../scripts/operations.mjs';

const readConfig=worker=>JSON.parse(readFileSync(new URL(`../workers/${worker}/wrangler.jsonc`,import.meta.url),'utf8'));
const registry=readConfig('registry-host'),reporting=readConfig('reporting');
const productionRoutes=[{pattern:'000h.cojeev.com',custom_domain:true},{pattern:'cojeev.com/ui*',zone_name:'cojeev.com'}];
const betaRoutes=[{pattern:'beta.000h.cojeev.com',custom_domain:true}];
const fixedWorkerFirst=['/*','!/_next/*','!/ui/_next/*','!/ui/*.txt','!/ui/brand/*','!/ui/icon.png','!/ui/opengraph-image.png','!/ui/twitter-image.png'];
const targets={
  beta:{legacySite:'https://beta.000h.cojeev.com',canonicalSite:'https://beta.000h.cojeev.com/ui',origin:'https://beta.000h.cojeev.com',basePath:'/ui',routes:betaRoutes,homepageService:null,registrySiteService:'cojeev-ui-registry-beta',allowedOrigins:['https://beta.000h.cojeev.com','https://feedback-beta.cojeev.com']},
  production:{legacySite:'https://000h.cojeev.com',canonicalSite:'https://cojeev.com/ui',origin:'https://cojeev.com',basePath:'/ui',routes:productionRoutes,homepageService:'cojeev-coming-soon',registrySiteService:'cojeev-ui-registry',allowedOrigins:['https://000h.cojeev.com','https://cojeev.com','https://feedback.cojeev.com','https://luv-jeri.github.io']},
};

test('apex_ui_route_wins_and_catches_query_bearing_bare_ui',()=>{
  assert.deepEqual(registry.routes,productionRoutes);
  assert.deepEqual(registry.env.production.routes,productionRoutes);
  assert.deepEqual(registry.env.beta.routes,betaRoutes);
  for(const block of [registry,...Object.values(registry.env)]) {
    assert.ok(!block.routes.some(route=>route.pattern==='cojeev.com/*'||route.pattern==='cojeev.com'&&route.custom_domain));
  }
});

test('reporting_cors_accepts_cojeev_origin_without_path',()=>{
  for(const [environment,block] of [['production',reporting],...Object.entries(reporting.env)]) {
    const origins=block.vars.ALLOWED_ORIGINS.split(',');
    assert.deepEqual(new Set(origins),new Set(targets[environment].allowedOrigins));
    for(const origin of origins) assert.equal(origin,new URL(origin).origin);
    if(environment==='production') assert.ok(origins.includes('https://cojeev.com'));
  }
});

test('reporting_live_head_binds_only_same_environment_registry',()=>{
  for(const [environment,block] of [['production',reporting],...Object.entries(reporting.env)]) {
    assert.deepEqual(block.services,[{binding:'REGISTRY_SITE',service:targets[environment].registrySiteService}]);
  }
});

test('default_and_environment_configs_agree',()=>{
  for(const [kind,source] of [['website',registry],['api',reporting]]) {
    for(const field of ['routes','services','vars','assets']) assert.deepEqual(source[field],source.env.production[field],`${kind} ${field}`);
    for(const [environment,block] of [['production',source],...Object.entries(source.env)]) {
      const config={...source,...block,vars:{...block.vars},services:block.services};delete config.env;
      if(kind==='website') {
        assert.equal(block.assets.directory,'../../out');
        assert.deepEqual(block.assets.run_worker_first,fixedWorkerFirst);
        assert.deepEqual(block.services??[],environment==='production'?[{binding:'COJEEV_HOMEPAGE',service:'cojeev-coming-soon'}]:[]);
        for(const field of ['MIGRATION_STAGE','REGISTRY_GRAPH']) assert.equal(block.vars[field],'unconfigured');
        config.assets={...block.assets,directory:'../site'};
      } else {
        assert.equal(block.vars.SITE_URL,targets[environment].canonicalSite);
        assert.equal(block.vars.LEGACY_SITE_URL,targets[environment].legacySite);
      }
      for(const field of ['PHASE','DEPLOYMENT_ID']) assert.equal(block.vars[field],'unconfigured');
      assert.doesNotThrow(()=>validateDeploymentConfig(environment,config,kind,{source:true}));
    }
  }
  for(const [environment,expected] of Object.entries(targets)) {
    const config=environmentConfig(environment);
    for(const [field,value] of Object.entries(expected)) assert.deepEqual(config[field],value,`${environment} ${field}`);
    assert.equal(config.site,config.legacySite);
    // A packaging caller cannot change the approved targets used by the next guard.
    config.routes[0].pattern='unreviewed.cojeev.com';
    config.allowedOrigins.push('https://unreviewed.cojeev.com');
    assert.deepEqual(environmentConfig(environment).routes,expected.routes);
    assert.deepEqual(environmentConfig(environment).allowedOrigins,expected.allowedOrigins);
  }
});
