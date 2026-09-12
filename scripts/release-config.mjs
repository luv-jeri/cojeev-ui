export const ACCOUNT = '25369d7051a3d996a1bca81f462a1fbc';
export const RECOVERY_BUCKET = 'cojeev-ui-private-recovery';
export const RESTORE_DATABASE = '63aab6c0-4d49-4423-b3fc-c5c382290af7';
const environments = {
  beta: {site:'https://beta.000h.cojeev.com',api:'https://feedback-beta.cojeev.com',website:'cojeev-ui-registry-beta',worker:'cojeev-ui-reporting-beta',database:'cojeev-ui-beta-reports',databaseId:'e2adf4c4-5ab0-434d-b90f-96ea451e3be7',media:'cojeev-ui-beta-report-media'},
  production: {site:'https://000h.cojeev.com',api:'https://feedback.cojeev.com',website:'cojeev-ui-registry',worker:'cojeev-ui-reporting',database:'cojeev-ui-reports',databaseId:'056bebac-a74e-403f-8d83-9734870d1ec1',media:'cojeev-ui-report-media'},
};
export function environmentConfig(environment) {
  if (!Object.hasOwn(environments,environment)) throw new Error('Unknown deployment environment');
  return {...environments[environment]};
}
export function buildEnvironment(environment, commit, supplied = {}) {
  const target = environmentConfig(environment);
  if(!/^[a-f0-9]{40}$/.test(commit)) throw new Error('Invalid release commit');
  const fixed = {COJEEV_BASE_PATH:'',NEXT_PUBLIC_DEPLOYMENT_ENVIRONMENT:environment,NEXT_PUBLIC_RELEASE_SHA:commit,NEXT_PUBLIC_SITE_URL:target.site,NEXT_PUBLIC_REGISTRY_URL:target.site,COJEEV_REGISTRY_URL:target.site,NEXT_PUBLIC_REPORTING_API_URL:target.api,NEXT_PUBLIC_POSTHOG_HOST:'https://eu.i.posthog.com'};
  for(const [key,value] of Object.entries(fixed)) if(supplied[key] !== undefined && supplied[key] !== value) throw new Error(`Environment URL/config mismatch: ${key}`);
  const allowed=['NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN','NEXT_PUBLIC_ANALYTICS_ENABLED','NEXT_PUBLIC_CONTACT_ENABLED'];
  for(const key of ['NEXT_PUBLIC_ANALYTICS_ENABLED','NEXT_PUBLIC_CONTACT_ENABLED']) if(supplied[key] !== undefined && !['true','false'].includes(supplied[key])) throw new Error(`Invalid boolean: ${key}`);
  return {...Object.fromEntries(allowed.map(key=>[key,supplied[key]??(key.endsWith('ENABLED')?'false':'')])),...fixed};
}
