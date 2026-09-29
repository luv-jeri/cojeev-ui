import { redact } from "../../../lib/reporting/contracts";
import { keyedDigest } from "./security";
import { activationCutoff, emailEnabled, githubEnabled, now, ownerNotificationEmail, type Delivery, type Env, type ReportRow } from "./types";
import { getReport, topicIssue } from "./reports";
import { messageTags, sendResend, testerAllowed } from './resend';

export class DeliveryFailure extends Error {
  constructor(public reason: string, public ambiguous = false, public permanent = false, public quota = false) { super(reason); }
}
export const escapeHTML = (v:string) => v.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]!));
export function emailMessage(row: ReportRow, kind: string, site: string) {
  const completed=kind==="email_resolved", request=row.kind==="request", n=row.issue_number;
  const alreadyAvailable=kind==="email_received"&&request&&row.status==="resolved"&&!!row.component_url;
  let heading:string, message:string, url:string, label:string, link=true;
  if(kind==="email_accepted") {
    heading=`We're tracking your ${request?"request":"report"} as #${n}`;
    message=`Thanks for ${request?"your request":"reporting the issue"}. We checked it, and it's now tracked as #${n}. Follow progress here: ${row.issue_url}. We'll email you again when it's ${request?"live":"fixed"}.`;
    url=row.issue_url??"";label="Follow progress";link=false;
  } else if(kind==="email_rejected") {
    // The AI's reason is internal and is never part of this message.
    heading="About your report";
    message="Thanks for taking the time to write to us. We checked your report, but it isn't something we can act on, so we've closed it. If we misunderstood, just reply to this email and tell us more.";
    url="";label="";link=false;
  } else {
    heading=alreadyAvailable?"Your component is already available":completed?(request?"Your component is live":"The issue you reported is fixed"):(request?"Thanks for your request":"Thanks for reporting this");
    message=alreadyAvailable?"The component you requested is already in the library. You can open it below.":completed?(request?"The component you asked for is now in the library.":"We have released a fix for the issue you reported. Thank you for helping improve the library."):(request?"Thank you for your request. We're looking into it and will let you know.":"Thank you for reporting the issue. We're looking into it and will let you know.");
    url=(completed||alreadyAvailable) && row.component_url?row.component_url:`${site.replace(/\/$/,"")}/requests/`;
    label=(completed||alreadyAvailable)&&row.component_url?"Open your component":"View component requests";
  }
  const reference=`Reference: ${row.id}`;
  const text=`${heading}\n\n${message}\n\n${reference}\n${link?`${label}: ${url}\n`:""}\n000h by Cojeev`;
  const button=url?`<p><a href="${escapeHTML(url)}" style="display:inline-block;background:#f5b8db;color:#111;padding:12px 20px;border-radius:30px;text-decoration:none">${label}</a></p>`:"";
  const html=`<!doctype html><html><body style="margin:0;background:#fbf4e6;color:#111;font:16px/1.6 Arial,sans-serif"><main style="max-width:560px;margin:36px auto;padding:32px"><p style="font-size:13px;letter-spacing:2px">000H BY COJEEV</p><h1 style="font-size:30px;line-height:1.2">${escapeHTML(heading)}</h1><p>${escapeHTML(message)}</p>${button}<p style="font-size:12px;color:#5f5b55">${reference}</p></main></body></html>`;
  return {subject:`${heading} · 000h by Cojeev`,text,html};
}
/** Neutralises @mentions on top of redact(), so a public issue can never notify a stranger. */
export const scrubPublic=(text:string,max:number)=>redact(text,max).replace(/@(?=[A-Za-z0-9_])/g,"@\u200B");
export function publicIssue(row:Pick<ReportRow,"kind"|"triage_title"|"triage_body">,marker:string) {
  return {title:scrubPublic(row.triage_title??"",120),body:`${scrubPublic(row.triage_body??"",20000)}\n\n---\nReported by a visitor.\n\n${marker}`,labels:[row.kind==="request"?"enhancement":"bug"]};
}
// The maintainer alert says a report exists and where to read it. Its private title,
// description, reporter address, diagnostics and media stay in the authenticated inbox.
// It is signed with the same identity it is sent from, so no second brand name appears.
export function ownerMessage(row: ReportRow, site: string) {
  const heading=row.kind==="request"?"New component request saved":"New bug report saved";
  const url=`${site.replace(/\/$/,"")}/feedback-admin/?report=${row.id}`;
  const message="Open the private report to read its details. This alert carries no report content.";
  const reference=`Reference: ${row.id}`;
  const text=`${heading}\n\n${message}\n\n${reference}\nOpen the private report: ${url}\n\n000h by Cojeev`;
  const html=`<!doctype html><html><body style="margin:0;background:#fbf4e6;color:#111;font:16px/1.6 Arial,sans-serif"><main style="max-width:560px;margin:36px auto;padding:32px"><p style="font-size:13px;letter-spacing:2px">000H BY COJEEV</p><h1 style="font-size:30px;line-height:1.2">${escapeHTML(heading)}</h1><p>${escapeHTML(message)}</p><p><a href="${escapeHTML(url)}" style="display:inline-block;background:#f5b8db;color:#111;padding:12px 20px;border-radius:30px;text-decoration:none">Open the private report</a></p><p style="font-size:12px;color:#5f5b55">${reference}</p></main></body></html>`;
  return {subject:`${heading} · 000h by Cojeev`,text,html};
}
// One builder for every outgoing email, so a correlation tag can never be attached to one
// path and forgotten on another. The tags carry no report content: an environment name, the
// report's own opaque UUID and the job kind, which is what lets a shared provider account's
// team-wide webhook be told apart from an unrelated application's traffic.
const emailPayload=(env:Env,job:Delivery,to:string,message:{subject:string;text:string;html:string}) =>
  JSON.stringify({to:[to],from:`000h by Cojeev <${env.EMAIL_FROM}>`,reply_to:'hello@cojeev.com',...message,tags:messageTags(env,job)});
async function github(env:Env,path:string,init:RequestInit={}, send=fetch) {
  let response:Response;
  try { response=await send(`https://api.github.com${path}`,{...init,headers:{Authorization:`Bearer ${env.GITHUB_TOKEN}`,Accept:"application/vnd.github+json","X-GitHub-Api-Version":"2022-11-28","User-Agent":"Cojeev-Reporting","Content-Type":"application/json",...init.headers},signal:AbortSignal.timeout(15000)}); }
  catch { throw new DeliveryFailure("GitHub response unavailable; reconcile before retrying.",init.method==="POST"); }
  if(!response.ok) throw new DeliveryFailure(`GitHub returned HTTP ${response.status}.`,init.method==="POST"&&response.status>=500,[400,401,404,422].includes(response.status));
  try { return await response.json() as Record<string,unknown>; } catch { throw new DeliveryFailure("GitHub returned an unreadable response.",init.method==="POST"); }
}
type GitHubIssue={number:number;node_id:string;html_url:string;body?:string;created_at?:string;user?:{id:number;login:string};pull_request?:unknown};
export async function mirrorIssue(env:Env,row:ReportRow,send=fetch) {
  if(!githubEnabled(env)) throw new DeliveryFailure("GitHub setup required.",false,true);
  if(row.issue_number) return {number:row.issue_number,node_id:row.issue_node_id,html_url:row.issue_url};
  const actor=await github(env,"/user",{},send);
  if(typeof actor.id!=="number"||!Number.isSafeInteger(actor.id)||actor.id<=0) throw new DeliveryFailure("GitHub token owner could not be verified.",false,true);
  // A signed marker prevents a different contributor from spoofing a receipt.
  const marker=`<!-- cojeev-report:${row.id}:${await keyedDigest(env.IP_HASH_SECRET??env.GITHUB_TOKEN!,`github-report:${row.id}`)} -->`;
  const repo=`/repos/${env.GITHUB_REPOSITORY}`;
  const since=new Date(row.created_at-60000).toISOString();
  let original:GitHubIssue|undefined;
  for(let page=1;page<=10;page++) {
    const issues=await github(env,`${repo}/issues?state=all&sort=created&direction=desc&since=${encodeURIComponent(since)}&per_page=100&page=${page}`,{},send) as unknown as GitHubIssue[];
    // Public markers can be copied into older issues. Bind adoption to the token
    // owner's immutable ID and this report's creation window, then choose the first.
    for(const issue of issues) if(!issue.pull_request&&issue.user?.id===actor.id&&Date.parse(issue.created_at??"")>=row.created_at-60000&&issue.body?.includes(marker)&&(!original||issue.number<original.number)) original=issue;
    if(issues.length<100) { if(original) return original; break; }
    if(page===10) throw new DeliveryFailure("Issue reconciliation needs a maintainer: too many matching pages.",false,true);
  }
  return await github(env,`${repo}/issues`,{method:"POST",body:JSON.stringify(publicIssue(row,marker))},send) as unknown as GitHubIssue;
}
const EMAIL_KINDS=["email_received","email_resolved","email_owner_received","email_accepted","email_rejected"];
export async function deliver(env:Env,job:Delivery,row:ReportRow,send=fetch):Promise<string> {
  if(row.private_purged) throw new DeliveryFailure("Private report expired.",false,true);
  if(job.kind==="github") {
    if(row.triage_state!=="approved") throw new DeliveryFailure("Waiting for triage.",false,true);
    // Another report in the topic may have got its issue since this job was queued: share it.
    const shared=row.kind==="request"&&row.topic_id&&!row.issue_number?await topicIssue(env,row.topic_id):null;
    if(shared) {
      const t=now();
      await env.DB.batch([env.DB.prepare("UPDATE reports SET issue_number=?,issue_node_id=?,issue_url=? WHERE id=?").bind(shared.issue_number,shared.issue_node_id,shared.issue_url,row.id),
        ...(row.status==="resolved"?[]:[env.DB.prepare("INSERT OR IGNORE INTO outbox(id,report_id,kind,due_at,created_at,reviewed_at) VALUES(?,?,'email_accepted',?,?,?)").bind(`${row.id}:email_accepted`,row.id,t,t,t)])]);
      return String(shared.issue_number);
    }
    const issue=await mirrorIssue(env,row,send);
    if(!issue.number||!issue.node_id||!issue.html_url) throw new DeliveryFailure("GitHub issue receipt incomplete.",true);
    const statements=[env.DB.prepare("UPDATE reports SET issue_number=?,issue_node_id=?,issue_url=? WHERE id=?").bind(issue.number,issue.node_id,issue.html_url,row.id)];
    statements.push(env.DB.prepare("INSERT OR IGNORE INTO outbox(id,report_id,kind,due_at,created_at,reviewed_at) VALUES(?,?,'email_accepted',?,?,?)").bind(`${row.id}:email_accepted`,row.id,now(),now(),now()));
    if(env.GITHUB_PROJECT_ID) statements.push(env.DB.prepare("INSERT OR IGNORE INTO outbox(id,report_id,kind,due_at,created_at) VALUES(?,?,'github_project',?,?)").bind(`${row.id}:github_project`,row.id,now(),now()));
    await env.DB.batch(statements); return String(issue.number);
  }
  if(job.kind==="github_project") {
    if(!row.issue_node_id||!env.GITHUB_PROJECT_ID) throw new DeliveryFailure("GitHub project setup required.",false,true);
    const result=await github(env,"/graphql",{method:"POST",body:JSON.stringify({query:"mutation($project:ID!,$content:ID!){addProjectV2ItemById(input:{projectId:$project,contentId:$content}){item{id}}}",variables:{project:env.GITHUB_PROJECT_ID,content:row.issue_node_id}})},send);
    if(result.errors) throw new DeliveryFailure("GitHub Project rejected the update. Check project permissions.",false,true);
    return "added";
  }
  if(job.kind==="github_state") {
    const state=(JSON.parse(job.payload_json??"{}") as {state?:string}).state, n=row.issue_number;
    if(!n||(state!=="closed"&&state!=="open")) throw new DeliveryFailure("GitHub issue state change is incomplete.",false,true);
    const issue=`/repos/${env.GITHUB_REPOSITORY}/issues/${n}`;
    await github(env,issue,{method:"PATCH",body:JSON.stringify(state==="closed"?{state,state_reason:"not_planned"}:{state})},send);
    if(state==="closed") await github(env,`${issue}/labels`,{method:"POST",body:JSON.stringify({labels:["invalid"]})},send);
    else try { await github(env,`${issue}/labels/invalid`,{method:"DELETE"},send); } catch(error) { if(!(error instanceof DeliveryFailure&&error.reason.endsWith("HTTP 404."))) throw error; }
    return state;
  }
  if(!EMAIL_KINDS.includes(job.kind)) throw new DeliveryFailure("Unknown delivery type.",false,true);
  if(!emailEnabled(env)) throw new DeliveryFailure("Email domain setup required.",false,true);
  if(job.kind==="email_owner_received") {
    // This recipient is the configured maintainer, never the address on the report.
    const owner=ownerNotificationEmail(env);
    if(!owner) throw new DeliveryFailure("Owner notification address setup required.",false,true);
    if(!testerAllowed(env,owner)) throw new DeliveryFailure('Beta recipient requires allowlist review.',false,true);
    return sendResend(env,job,emailPayload(env,job,owner,ownerMessage(row,env.SITE_URL)),send);
  }
  if(job.kind==="email_resolved" && row.status!=="resolved") throw new DeliveryFailure("Report was reopened before its release email sent. Review before retrying.",false,true);
  if(job.kind==="email_resolved"&&row.triage_state!=="approved") throw new DeliveryFailure("Report is no longer approved.",false,true);
  if(job.kind==="email_accepted"&&(row.triage_state!=="approved"||!row.issue_number||!row.issue_url)) throw new DeliveryFailure("Waiting for an approved issue.",false,true);
  if(job.kind==="email_rejected"&&row.triage_state!=="rejected") throw new DeliveryFailure("Report is no longer rejected.",false,true);
  if(!testerAllowed(env,row.email)) throw new DeliveryFailure('Beta recipient requires allowlist review.',false,true);
  return sendResend(env,job,emailPayload(env,job,row.email,emailMessage(row,job.kind,env.SITE_URL)),send);
}
export async function drain(env:Env,reportId?:string,send=fetch) {
  // A crashed send has an unknown remote outcome. Never blindly resend it.
  await env.DB.prepare("UPDATE outbox SET state='needs_review',last_error='Delivery lease expired; check the provider before retrying.',lease_token=NULL WHERE state='processing' AND lease_until<?").bind(now()).run();
  const cutoff=activationCutoff(env);
  await env.DB.prepare("UPDATE outbox SET state='held',last_error='Delivery activation or historical review required.' WHERE state='pending' AND (? IS NULL OR (reviewed_at IS NULL AND report_id IN (SELECT id FROM reports WHERE created_at<?)))").bind(cutoff,cutoff).run();
  if(cutoff===null) return {processed:0};
  const enabledKinds=[...(emailEnabled(env)?EMAIL_KINDS:[]),...(githubEnabled(env)?["github","github_state",...(env.GITHUB_PROJECT_ID?["github_project"]:[])]:[])];
  if(!enabledKinds.length) return {processed:0};
  // Disabled providers must not consume the batch window and starve enabled work.
  const jobs=await env.DB.prepare(`SELECT * FROM outbox WHERE state='pending' AND due_at<=? AND kind IN (${enabledKinds.map(()=>"?").join(",")}) ${reportId?"AND report_id=?":""} ORDER BY created_at,id LIMIT 20`).bind(now(),...enabledKinds,...(reportId?[reportId]:[])).all<Delivery>();
  let processed=0;
  for(const job of jobs.results) {
    if(job.kind.startsWith("email")&&!emailEnabled(env) || job.kind.startsWith("github")&&!githubEnabled(env)) continue;
    const lease=crypto.randomUUID();
    const claim=await env.DB.prepare("UPDATE outbox SET state='processing',attempts=attempts+1,lease_until=?,lease_token=? WHERE id=? AND state='pending' RETURNING id").bind(now()+300000,lease,job.id).first();
    if(!claim) continue;
    processed++;
    try {
      const provider=await deliver(env,job,await getReport(env,job.report_id),send);
      await env.DB.prepare("UPDATE outbox SET state='done',provider_id=?,lease_token=NULL,last_error=NULL WHERE id=? AND lease_token=?").bind(provider,job.id,lease).run();
    } catch(error) {
      const failure=error instanceof DeliveryFailure?error:new DeliveryFailure("Delivery could not be confirmed. Check provider status.",true);
      const review=!failure.quota&&(failure.ambiguous||failure.permanent||job.attempts>=7);
      await env.DB.prepare("UPDATE outbox SET state=?,last_error=?,due_at=?,lease_token=NULL,delivery_status=? WHERE id=? AND lease_token=?").bind(review?"needs_review":"pending",failure.reason,now()+(failure.quota?3600000:Math.min(86400000,60000*2**job.attempts)),failure.quota?'quota':failure.ambiguous?'uncertain':review?'failed':'queued',job.id,lease).run();
    }
  }
  return {processed};
}
