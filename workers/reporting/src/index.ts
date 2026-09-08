import { accept, authorizeReceipt, getReport, listRequests, privateAttachment, privateDetail, receipt, upload } from "./reports";
import { assertBrowserOrigin, HttpError, origins, readJSON, requireAdmin } from "./security";
import { emailEnabled, now, type Env } from "./types";
import { drain } from "./delivery";
import { cleanup, updateFromAdmin, webhook } from "./lifecycle";
type Context = {waitUntil(promise:Promise<unknown>):void};
const json=(body:unknown,status=200)=>Response.json(body,{status});
async function route(request:Request,env:Env,ctx:Context):Promise<Response> {
  const url=new URL(request.url),path=url.pathname.replace(/\/$/,"");
  if(env.LOCAL_MODE==="true" && !["localhost","127.0.0.1","[::1]"].includes(url.hostname)) throw new HttpError(503,"Local reporting mode cannot accept remote traffic.");
  if(request.method==="OPTIONS") { assertBrowserOrigin(request,env);return new Response(null,{status:204}); }
  if(path==="/v1/github/webhook"&&request.method==="POST") { const result=await webhook(request,env);ctx.waitUntil(drain(env));return json(result,202); }
  if(path==="/v1/config"&&request.method==="GET") return json({emailEnabled:emailEnabled(env),turnstileSiteKey:env.TURNSTILE_SITE_KEY??"",local:env.LOCAL_MODE==="true"});
  if(path==="/v1/requests"&&request.method==="GET") return json(await listRequests(env,url));
  if(path==="/v1/reports"&&request.method==="POST") {
    assertBrowserOrigin(request,env);const result=await accept(request,env);
    ctx.waitUntil(drain(env,result.receipt.id));return json(result.receipt,result.fresh?201:200);
  }
  const fileMatch=path.match(/^\/v1\/reports\/([^/]+)\/attachments\/([^/]+)$/);
  if(fileMatch&&request.method==="PUT") { assertBrowserOrigin(request,env);return json(await upload(request,env,fileMatch[1],fileMatch[2])); }
  const reportMatch=path.match(/^\/v1\/reports\/([^/]+)$/);
  if(reportMatch&&request.method==="GET") { const {row,token}=await authorizeReceipt(request,env,reportMatch[1]);return json(await receipt(env,row,token)); }
  if(path.startsWith("/v1/admin/")) {
    await requireAdmin(request,env);
    if(!["GET","HEAD"].includes(request.method)) assertBrowserOrigin(request,env);
    if(path==="/v1/admin/reports"&&request.method==="GET") {
      const offset=Math.max(0,Math.min(100000,parseInt(url.searchParams.get("offset")??"0")||0));
      const rows=await env.DB.prepare("SELECT id,kind,title,status,created_at,issue_number,email,topic_id FROM reports ORDER BY created_at DESC,id LIMIT 21 OFFSET ?").bind(offset).all();return json({reports:rows.results.slice(0,20),hasMore:rows.results.length>20});
    }
    const adminFile=path.match(/^\/v1\/admin\/reports\/([^/]+)\/attachments\/([^/]+)$/);
    if(adminFile&&request.method==="GET") return privateAttachment(env,adminFile[1],adminFile[2]);
    const adminReport=path.match(/^\/v1\/admin\/reports\/([^/]+)$/);
    if(adminReport&&request.method==="GET") return json(await privateDetail(env,adminReport[1]));
    if(adminReport&&request.method==="PATCH") {const result=await updateFromAdmin(env,adminReport[1],await readJSON(request,4000));ctx.waitUntil(drain(env));return json(result);}
    if(path==="/v1/admin/drain"&&request.method==="POST") return json(await drain(env));
    const retry=path.match(/^\/v1\/admin\/deliveries\/([^/]+)\/retry$/);
    if(retry&&request.method==="POST") {
      const id=decodeURIComponent(retry[1]);
      const result=await env.DB.prepare("UPDATE outbox SET state='pending',due_at=?,attempts=0,last_error=NULL WHERE id=? AND state IN ('pending','needs_review') RETURNING report_id").bind(now(),id).first<{report_id:string}>();
      if(!result) throw new HttpError(409,"This delivery is finished or is already running.");
      await getReport(env,result.report_id);ctx.waitUntil(drain(env,result.report_id));return json({ok:true});
    }
  }
  throw new HttpError(404,"This reporting endpoint does not exist.");
}
export default {
  async fetch(request:Request,env:Env,ctx:Context):Promise<Response> {
    let response:Response;
    try { response=await route(request,env,ctx); }
    catch(error) {
      const known=error instanceof HttpError;
      response=json({error:known?error.message:"Reporting is temporarily unavailable. Keep your draft and retry.",...(known&&error.retryAfter?{retryAfter:error.retryAfter}:{})},known?error.status:503);
      if(known&&error.retryAfter) response.headers.set("Retry-After",String(error.retryAfter));
      // Never log report payloads, addresses, tokens or raw provider errors.
      if(!known) console.error("reporting_request_failed");
    }
    const headers=new Headers(response.headers);const origin=request.headers.get("Origin");
    if(origin&&origins(env).includes(origin)) headers.set("Access-Control-Allow-Origin",origin);
    headers.set("Vary","Origin");headers.set("Access-Control-Allow-Methods","GET,POST,PUT,PATCH,OPTIONS");
    headers.set("Access-Control-Allow-Headers","Content-Type,Authorization");headers.set("Access-Control-Expose-Headers","Retry-After");
    headers.set("Cache-Control","no-store");headers.set("X-Content-Type-Options","nosniff");headers.set("Referrer-Policy","no-referrer");
    return new Response(response.body,{status:response.status,headers});
  },
  async scheduled(_controller:unknown,env:Env,ctx:Context) {ctx.waitUntil(Promise.all([drain(env),cleanup(env)]));}
};
