import { isUUID, LIMITS, matchesMedia, redact, validateReport, type Receipt, type ReportStatus, type RequestTopic } from "../../../lib/reporting/contracts";
import { boundedBody, checkAbuse, appAdmission, APP_WINDOW_LIMIT, digest, equalSecret, HttpError, keyedDigest, readJSON } from "./security";
import { emailEnabled, githubEnabled, now, ownerNotificationEmail, type Env, type ReportRow, type AttachmentRow, type Delivery, type AppReportPayload, type AppReportReceipt } from "./types";
import { testerAllowed } from './resend';
import type { PublicStage, PublicStatus } from "../../../lib/reporting/public-status";

export async function getReport(env: Env, id: string) {
  if(!isUUID(id)) throw new HttpError(404,"Report not found.");
  const row=await env.DB.prepare("SELECT * FROM reports WHERE id=?").bind(id).first<ReportRow>();
  if(!row) throw new HttpError(404,"Report not found."); return row;
}
export async function authorizeReceipt(request: Request, env: Env, id: string) {
  const row=await getReport(env,id); const token=(request.headers.get("Authorization")??"").replace(/^Bearer /,"");
  if(!/^[a-f0-9]{64}$/.test(token) || !await equalSecret(await digest(token),row.token_hash)) throw new HttpError(404,"Report not found.");
  return {row,token};
}
// Compared when a row has no key, so every failure runs the same comparison.
const NO_KEY="0".repeat(64);
export async function authorizeStatus(request: Request, env: Env, id: string) {
  const row=isUUID(id)?await env.DB.prepare("SELECT * FROM reports WHERE id=?").bind(id).first<ReportRow>():null;
  const token=(request.headers.get("Authorization")??"").replace(/^Bearer /,"");
  const same=await equalSecret(token,row?.status_key??NO_KEY);
  if(!row || !row.status_key || !/^[a-f0-9]{64}$/.test(token) || !same) throw new HttpError(404,"Report not found.");
  return row;
}
export async function publicStatus(env: Env, row: ReportRow): Promise<PublicStatus> {
  const files=await env.DB.prepare("SELECT COUNT(*) AS n FROM attachments WHERE report_id=?").bind(row.id).first<{n:number}>();
  const stage:PublicStage=row.triage_state==="rejected"||row.status==="declined"?"closed":row.status==="resolved"?"fixed":row.issue_number!==null?"tracked":row.triage_state==="approved"?"reviewing":"received";
  const issue=(stage==="tracked"||stage==="fixed")&&row.triage_state==="approved"&&row.issue_number!==null&&row.issue_url?{issueNumber:row.issue_number,issueUrl:row.issue_url}:{};
  return {kind:row.kind,sentAt:row.created_at,stage,...issue,attachments:files?.n??0};
}
export async function receipt(env: Env, row: ReportRow, token: string): Promise<Receipt & {emailDelivery:string}> {
  const [files,jobs]=await Promise.all([env.DB.prepare("SELECT id,state FROM attachments WHERE report_id=?").bind(row.id).all<{id:string;state:string}>(),env.DB.prepare("SELECT kind,state,delivery_status FROM outbox WHERE report_id=?").bind(row.id).all<Delivery>()]);
  const email=jobs.results.find(j=>j.kind==="email_received"); const github=jobs.results.find(j=>j.kind==="github");
  return {id:row.id,token,kind:row.kind,...(row.status_key?{statusKey:row.status_key}:{}),status:row.status,topicId:row.topic_id,...(row.kind==="request"&&row.status==="resolved"&&row.component_url?{componentUrl:row.component_url}:{}),
    ...(row.triage_state==='approved'&&row.issue_number!=null&&row.issue_url?{issueNumber:row.issue_number,issueUrl:row.issue_url}:{}),
    emailDelivery:email?.state==='held'?'held':email?.delivery_status??'queued',
    email:email?.delivery_status==='delivered'?"sent":email?.state==="needs_review"||['failed','bounced'].includes(email?.delivery_status??'')?"needs_review":!emailEnabled(env)?"setup_required":"pending",
    issue:row.triage_state==="rejected"?"not_planned":row.issue_number?"created":github?.state==="needs_review"?"needs_review":!githubEnabled(env)?"setup_required":"pending",
    // The legacy enum collapses held into pending. Carry the job's own state so the receipt can say which it is; a missing job claims nothing.
    issueDelivery:row.triage_state==="pending"?"triage":github?.state,attachments:files.results};
}
export async function topicIssue(env: Env, topicId: string) {
  return env.DB.prepare("SELECT issue_number,issue_node_id,issue_url FROM reports WHERE topic_id=? AND triage_state='approved' AND issue_number IS NOT NULL ORDER BY created_at LIMIT 1").bind(topicId).first<{issue_number:number;issue_node_id:string;issue_url:string}>();
}
export async function acceptApp(request: Request, env: Env): Promise<{receipt:AppReportReceipt;fresh:boolean}> {
  if(request.headers.has("Origin")) throw new HttpError(403,"Native app reports must not carry an Origin header.");
  if(request.headers.get("Content-Type")!=="application/json") throw new HttpError(415,"Send app reports as application/json.");
  const raw=await readJSON(request,16384);
  if(!raw||typeof raw!=="object"||Array.isArray(raw)) throw new HttpError(422,"Invalid app report.");
  const v=raw as Record<string,unknown>;
  if(Object.keys(v).some(key=>!["id","installId","category","message","diagnostics","appVersion","platform"].includes(key))||!isUUID(v.id)||!isUUID(v.installId)) throw new HttpError(422,"Invalid app report fields or UUID.");
  if(typeof v.category!=="string"||!["memory","handoff","sharing","updates","skills-beta","crash","ui"].includes(v.category)||typeof v.platform!=="string"||!["macos","windows"].includes(v.platform)) throw new HttpError(422,"Choose a valid app category and platform.");
  for(const [key,max,required] of [["message",2000,true],["diagnostics",1600,false],["appVersion",64,true]] as const) {
    const value=v[key];if(key==="diagnostics"&&value===null) continue;
    if(typeof value!=="string"||(required&&!value.trim())) throw new HttpError(422,`Invalid ${key}.`);
    if(value.length>max) throw new HttpError(413,`The ${key} is too large.`);
  }
  const report={id:v.id.toLowerCase(),installId:v.installId.toLowerCase(),category:v.category,message:v.message,diagnostics:v.diagnostics,appVersion:v.appVersion,platform:v.platform} as AppReportPayload;
  const canonical=JSON.stringify(report);
  if(canonical.length>4000) throw new HttpError(413,"The app report is too large.");
  const payloadHash=await digest(canonical),receipt:AppReportReceipt={id:report.id,status:"accepted"};
  const retry=(saved:ReportRow) => {
    if(saved.source!=="app"||saved.payload_hash!==payloadHash) throw new HttpError(409,"This report ID is already saved with different details. Start a new report.");
    return {receipt,fresh:false};
  };
  const existing=await env.DB.prepare("SELECT * FROM reports WHERE id=?").bind(report.id).first<ReportRow>();
  if(existing) return retry(existing);
  const destination=env.APP_GITHUB_REPOSITORY;
  if(!destination||!/^[\w.-]+\/[\w.-]+$/.test(destination)) throw new HttpError(503,"App reporting destination is not configured yet.");
  // No client credential: legacy receipt endpoints cannot authorize an app report.
  const tokenHash=await digest(crypto.randomUUID());
  const admission=await appAdmission(request,env,report.installId,report.id,tokenHash);
  const timestamp=now(),installHash=await keyedDigest(env.IP_HASH_SECRET??"local-only",`app-install:${report.installId}`);
  const title=`[${report.category}] Cojeev ${redact(report.appVersion,64)} (${report.platform})`;
  try {
    const results=await env.DB.batch([
      env.DB.prepare("INSERT INTO reports(id,token_hash,payload_hash,kind,title,description,email,contact_hash,references_json,diagnostics_json,pins_json,created_at,updated_at,triage_state,source,app_category,destination_repository) SELECT ?,?,?,'bug',?,?,'',?,'[]',?,'[]',?,?,'approved','app',?,? WHERE COALESCE((SELECT count FROM rate_limits WHERE key=?),0)<5 AND COALESCE((SELECT count FROM rate_limits WHERE key=?),0)<10 AND COALESCE((SELECT count FROM rate_limits WHERE key=?),0)<?")
        .bind(report.id,tokenHash,payloadHash,title,redact(report.message,2000),installHash,report.diagnostics===null?null:JSON.stringify(redact(report.diagnostics,1600)),timestamp,timestamp,report.category,destination,...admission.keys,APP_WINDOW_LIMIT),
      ...admission.statements,
      env.DB.prepare("INSERT INTO outbox(id,report_id,kind,due_at,created_at,reviewed_at) SELECT ?,?,'github',?,?,? FROM reports WHERE id=? AND payload_hash=?").bind(`${report.id}:github`,report.id,timestamp,timestamp,timestamp,report.id,payloadHash)
    ]);
    if(!results[0].meta.changes) throw new HttpError(429,"Too many reports right now. Please try again later.",admission.retryAfter);
  } catch(error) {
    const saved=await env.DB.prepare("SELECT * FROM reports WHERE id=?").bind(report.id).first<ReportRow>();
    if(saved) return retry(saved);
    throw error;
  }
  return {receipt,fresh:true};
}
export async function accept(request: Request, env: Env): Promise<{receipt:Receipt;fresh:boolean}> {
  const raw=await readJSON(request) as {report?:unknown;token?:unknown;turnstileToken?:unknown};
  if(!raw || typeof raw!=="object" || typeof raw.token!=="string" || !/^[a-f0-9]{64}$/.test(raw.token)) throw new HttpError(422,"A valid private receipt token is required.");
  let report; try { report=validateReport(raw.report); } catch(error) { throw new HttpError(422,error instanceof Error?error.message:"Invalid report."); }
  if(!testerAllowed(env,report.email)) throw new HttpError(403,'Reporting access is limited to invited beta testers.');
  if(report.kind==="request" && redact(report.title)!==report.title) throw new HttpError(422,"Keep email addresses, links and secrets out of the public request title.");
  const tokenHash=await digest(raw.token); const payloadHash=await digest(JSON.stringify(report));
  const existing=await env.DB.prepare("SELECT * FROM reports WHERE id=?").bind(report.id).first<ReportRow>();
  if(existing) {
    if(!await equalSecret(tokenHash,existing.token_hash)) throw new HttpError(409,"This report ID is already in use. Start a new report.");
    if(existing.payload_hash!==payloadHash) throw new HttpError(409,"This report was already saved with different details. Start a new report to add new details.");
    return {receipt:await receipt(env,existing,raw.token),fresh:false};
  }
  await checkAbuse(request,env,raw.turnstileToken,report.id);
  // Retain only a keyed identity for distinct demand after the contact expires.
  const contactHash=await keyedDigest(env.IP_HASH_SECRET??"local-only",`report-contact:${report.email}`);
  const timestamp=now();
  const statusKey=Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,"0")).join("");
  let topicId:string|null=null, topicKey:string|null=null;
  if(report.kind==="request") {
    if(report.topicId) {
      const topic=await env.DB.prepare("SELECT id FROM topics WHERE id=?").bind(report.topicId).first<{id:string}>();
      if(!topic) throw new HttpError(422,"That request no longer exists. Start a new request.");topicId=topic.id;
    } else topicKey=report.title.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu," ").trim();
  }
  // Joining a topic that already has an issue needs no verdict: it shares that issue.
  const joinTopic=topicId ?? (topicKey!==null?(await env.DB.prepare("SELECT id FROM topics WHERE title_key=?").bind(topicKey).first<{id:string}>())?.id??null:null);
  const issue=joinTopic?await topicIssue(env,joinTopic):null;
  // A released topic will never send the follow-up email that the tracking email promises.
  const released=joinTopic?(await env.DB.prepare("SELECT status FROM topics WHERE id=?").bind(joinTopic).first<{status:string}>())?.status==="resolved":false;
  const statements=[];
  if(topicKey!==null) statements.push(env.DB.prepare("INSERT OR IGNORE INTO topics(id,title,title_key,created_at,updated_at) VALUES(?,?,?,?,?)").bind(report.id,report.title,topicKey,timestamp,timestamp));
  statements.push(env.DB.prepare(`INSERT INTO reports(id,token_hash,payload_hash,kind,title,description,email,contact_hash,references_json,diagnostics_json,pins_json,topic_id,status,component_url,triage_state,triage_by,triaged_at,issue_number,issue_node_id,issue_url,created_at,updated_at,status_key)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,COALESCE(?,(SELECT id FROM topics WHERE title_key=?)),COALESCE((SELECT status FROM topics WHERE id=COALESCE(?,(SELECT id FROM topics WHERE title_key=?))),'received'),(SELECT component_url FROM topics WHERE id=COALESCE(?,(SELECT id FROM topics WHERE title_key=?))),?,?,?,?,?,?,?,?,?)`)
    .bind(report.id,tokenHash,payloadHash,report.kind,report.title,report.description,report.email,contactHash,JSON.stringify(report.references),report.diagnostics?JSON.stringify(report.diagnostics):null,JSON.stringify(report.pins),topicId,topicKey,topicId,topicKey,topicId,topicKey,issue?'approved':'pending',issue?'join':null,issue?timestamp:null,issue?.issue_number??null,issue?.issue_node_id??null,issue?.issue_url??null,timestamp,timestamp,statusKey));
  for(const file of report.attachments) statements.push(env.DB.prepare("INSERT INTO attachments(id,report_id,name,type,size,sha256,object_key) VALUES(?,?,?,?,?,?,?)").bind(file.id,report.id,file.name,file.type,file.size,file.sha256,`${report.id}/${file.id}`));
  // The maintainer alert is queued with the report it belongs to, so configuring an
  // owner address later can never manufacture alerts for the existing backlog.
  // No GitHub job: a triage verdict decides whether an issue exists.
  const kinds=["email_received",...(ownerNotificationEmail(env)?["email_owner_received"]:[]),...(issue&&!released?["email_accepted"]:[])];
  for(const kind of kinds) statements.push(env.DB.prepare("INSERT INTO outbox(id,report_id,kind,due_at,created_at,reviewed_at) VALUES(?,?,?,?,?,?)").bind(`${report.id}:${kind}`,report.id,kind,timestamp,timestamp,kind==="email_accepted"?timestamp:null));
  try { await env.DB.batch(statements); }
  catch(error) {
    // A simultaneous retry may have won the unique ID race. Never manufacture a second record.
    const saved=await env.DB.prepare("SELECT * FROM reports WHERE id=?").bind(report.id).first<ReportRow>();
    if(saved && saved.token_hash===tokenHash && saved.payload_hash===payloadHash) return {receipt:await receipt(env,saved,raw.token),fresh:false};
    throw error;
  }
  return {receipt:await receipt(env,await getReport(env,report.id),raw.token),fresh:true};
}
export async function upload(request: Request, env: Env, reportId: string, fileId: string) {
  const {row}=await authorizeReceipt(request,env,reportId);
  if(row.technical_purged || now()-row.created_at>30*86400000) throw new HttpError(410,"This report's attachment window has expired. Its text is still saved.");
  const file=await env.DB.prepare("SELECT * FROM attachments WHERE report_id=? AND id=?").bind(reportId,fileId).first<AttachmentRow>();
  if(!file) throw new HttpError(404,"Attachment slot not found.");
  if(request.headers.get("Content-Type")!==file.type) throw new HttpError(422,"The file type does not match the saved attachment.");
  const bytes=await boundedBody(request,Math.min(file.size,LIMITS.fileBytes));
  if(bytes.byteLength!==file.size || await digest(bytes)!==file.sha256 || !matchesMedia(new Uint8Array(bytes),file.type)) throw new HttpError(422,"The attachment changed or is not a supported image or video. The text report is already saved.");
  await env.MEDIA.put(file.object_key,bytes,{httpMetadata:{contentType:file.type},customMetadata:{sha256:file.sha256}});
  await env.DB.prepare("UPDATE attachments SET state='uploaded' WHERE report_id=? AND id=?").bind(reportId,fileId).run();
  return {ok:true};
}
// The earliest maintainer-approved verdict title in a topic; pending and rejected titles never reach the public list.
const approvedTitle="(SELECT a.triage_title FROM reports a WHERE a.topic_id=t.id AND a.triage_state='approved' AND a.triage_title IS NOT NULL ORDER BY a.created_at,a.id LIMIT 1)";
export async function listRequests(env: Env, url: URL) {
  const offset=Math.max(0,Math.min(100000,Number.parseInt(url.searchParams.get("offset")??"0")||0));
  const search=(url.searchParams.get("q")??"").slice(0,120);
  const q=search.replace(/[\\%_]/g,"\\$&");
  const generic="'Component request '||substr(t.id,1,8)";
  // The SQL match runs on the stored title; redaction happens after, so the filter below closes the probe for redacted text.
  const rows=await env.DB.prepare(`SELECT t.id,COALESCE(t.public_title,${approvedTitle},${generic}) AS title,(t.public_title IS NOT NULL OR ${approvedTitle} IS NOT NULL) AS approved,t.public_title IS NOT NULL AS hasPublic,t.status,t.component_url AS componentUrl,t.created_at AS createdAt,t.updated_at AS updatedAt,COUNT(DISTINCT r.contact_hash) AS demand FROM topics t LEFT JOIN reports r ON r.topic_id=t.id WHERE COALESCE(t.public_title,${approvedTitle},${generic}) LIKE ? ESCAPE '\\' GROUP BY t.id ORDER BY t.created_at DESC,t.id LIMIT 21 OFFSET ?`).bind(`%${q}%`,offset).all<{id:string;title:string;approved:number;hasPublic:number;status:ReportStatus;componentUrl:string|null;createdAt:number;updatedAt:number;demand:number}>();
  const needle=search.toLowerCase();
  const requests:RequestTopic[]=rows.results.slice(0,20).map(({hasPublic,approved,title,...row})=>({...row,title:hasPublic||!approved?title:redact(title,120),approved:approved===1}))
    .filter(row=>!needle||row.title.toLowerCase().includes(needle));
  return {requests,hasMore:rows.results.length>20};
}
export function componentURL(value: unknown, env: Env): string {
  try {
    const url=new URL(String(value)),site=new URL(env.SITE_URL);
    const loopback=["localhost","127.0.0.1","[::1]"];
    const localHTTP=env.LOCAL_MODE==="true"&&url.protocol==="http:"&&site.protocol==="http:"&&loopback.includes(url.hostname)&&loopback.includes(site.hostname)&&url.origin===site.origin;
    if((url.protocol!=="https:"&&!localHTTP) || url.origin!==site.origin || !url.pathname.startsWith(site.pathname.replace(/\/$/,"")+"/docs/") || url.username || url.password || url.search || url.hash) throw new Error();
    return url.href;
  }
  catch { throw new HttpError(422,"Choose a live component URL under this library's /docs/ path."); }
}
export async function setStatus(env: Env, row: ReportRow, status: unknown, link: unknown) {
  if(!["received","planned","in_progress","resolved","declined"].includes(String(status))) throw new HttpError(422,"Choose a valid report status.");
  const resolved=status==="resolved";
  const url=resolved && row.kind==="request"?componentURL(link ?? row.component_url,env):null;
  if(row.status===status && row.component_url===url) return;
  const timestamp=now();const statements=[];
  const condition=row.topic_id?"topic_id=?":"id=?";const scope=row.topic_id ?? row.id;
  if(row.topic_id) statements.push(env.DB.prepare("UPDATE topics SET status=?,component_url=?,updated_at=? WHERE id=?").bind(status,url,timestamp,row.topic_id));
  statements.push(env.DB.prepare(`UPDATE reports SET status=?,component_url=?,updated_at=? WHERE ${condition}`).bind(status,url,timestamp,scope));
  if(resolved) statements.push(env.DB.prepare(`INSERT OR IGNORE INTO outbox(id,report_id,kind,due_at,created_at,reviewed_at) SELECT id||':email_resolved',id,'email_resolved',?,?,? FROM reports WHERE ${condition} AND email<>'' AND triage_state='approved'`).bind(timestamp,timestamp,timestamp,scope));
  await env.DB.batch(statements);
}
export async function privateDetail(env: Env,id:string) {
  const row=await getReport(env,id);
  const {token_hash: _token, payload_hash:_payload, contact_hash:_contact, status_key:_key, ...report}=row; void _token; void _payload; void _contact; void _key;
  const [files,jobs]=await Promise.all([env.DB.prepare("SELECT id,name,type,size,state FROM attachments WHERE report_id=?").bind(id).all(),env.DB.prepare("SELECT id,kind,state,attempts,last_error,provider_id,delivery_status,first_attempt_at,reviewed_at FROM outbox WHERE report_id=? ORDER BY created_at").bind(id).all()]);
  const shared=!!row.issue_number&&!!await env.DB.prepare("SELECT 1 AS x FROM reports WHERE issue_number=? AND id<>? AND triage_state='approved' AND source=? AND destination_repository IS ?").bind(row.issue_number,id,row.source,row.destination_repository).first();
  return {report,attachments:files.results,deliveries:jobs.results,shared};
}
export async function privateAttachment(env: Env,id:string,fileId:string) {
  await getReport(env,id);const file=await env.DB.prepare("SELECT * FROM attachments WHERE report_id=? AND id=? AND state='uploaded'").bind(id,fileId).first<AttachmentRow>();
  if(!file) throw new HttpError(404,"Attachment not found or expired.");
  const object=await env.MEDIA.get(file.object_key);if(!object) throw new HttpError(410,"This attachment has expired.");
  return new Response(object.body as unknown as ReadableStream,{headers:{"Content-Type":file.type,"Content-Disposition":`attachment; filename*=UTF-8''${encodeURIComponent(file.name)}`,"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}});
}
export const knownStatus = (s: unknown): s is ReportStatus => ["received","planned","in_progress","resolved","declined"].includes(String(s));
