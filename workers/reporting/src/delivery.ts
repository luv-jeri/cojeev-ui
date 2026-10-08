import { redact } from "../../../lib/reporting/contracts";
import { keyedDigest } from "./security";
import { activationCutoff, emailEnabled, githubEnabled, now, ownerNotificationEmail, type Delivery, type Env, type ReportRow } from "./types";
import { getReport, topicIssue } from "./reports";
import { messageTags, sendResend, testerAllowed } from './resend';

export class DeliveryFailure extends Error {
  constructor(public reason: string, public ambiguous = false, public permanent = false, public quota = false) { super(reason); }
}
export const escapeHTML = (v:string) => v.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]!));
type EmailLink={label:string;url:string};
const EMAIL_STYLE="@media (prefers-color-scheme: dark){html,body,.em-bg{background:#15171a !important}.em-card{background:#20242a !important}.em-text{color:#f3f4f4 !important}.em-muted{color:#bdc1c5 !important}.em-link{color:#f0a4cc !important}}";
export function emailMessage(row: ReportRow, kind: string, site: string) {
  const completed=kind==="email_resolved", request=row.kind==="request", n=row.issue_number;
  const alreadyAvailable=kind==="email_received"&&request&&row.status==="resolved"&&!!row.component_url;
  let heading:string, message:string, plain:EmailLink|null=null;
  if(kind==="email_accepted") {
    heading=`We're tracking your ${request?"request":"report"} as #${n}`;
    message=`Thanks for ${request?"your request":"reporting the issue"}. We checked it, and it's now tracked as #${n}. We'll email you again when it's ${request?"live":"fixed"}.`;
    plain={label:`Follow on GitHub (#${n})`,url:row.issue_url??""};
  } else if(kind==="email_rejected") {
    // The AI's reason is internal and is never part of this message.
    heading="About your report";
    message="Thanks for taking the time to write to us. We checked your report, but it isn't something we can act on, so we've closed it. If we misunderstood, just reply to this email and tell us more.";
  } else {
    heading=alreadyAvailable?"Your component is already available":completed?(request?"Your component is live":"The issue you reported is fixed"):(request?"Thanks for your request":"Thanks for reporting this");
    message=alreadyAvailable?"The component you requested is already in the library. You can open it below.":completed?(request?"The component you asked for is now in the library.":"We have released a fix for the issue you reported. Thank you for helping improve the library."):(request?"Thank you for your request. We're looking into it and will let you know.":"Thank you for reporting the issue. We're looking into it and will let you know.");
  }
  // Rows from before the status key have none: they get no tracking link.
  const tracking:EmailLink|null=row.status_key?{label:request?"Track your request":"Track your report",url:`${site.replace(/\/$/,"")}/track/#${row.id}.${row.status_key}`}:null;
  const component:EmailLink|null=(completed||alreadyAvailable)&&request&&row.component_url?{label:"Open your component",url:row.component_url}:null;
  const button=component??tracking;
  const links=[...(button?[button]:[]),...(plain?[plain]:[])];
  const reference=`Reference: ${row.id}`;
  const text=`${heading}\n\n${message}\n\n${reference}\n${links.map(l=>`${l.label}: ${l.url}\n`).join("")}\n000h by Cojeev`;
  const buttonHTML=button?`<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0"><tr><td style="background:#f5b8db;border-radius:30px"><a href="${escapeHTML(button.url)}" style="display:inline-block;padding:14px 24px;color:#111;text-decoration:none;font-weight:bold;font-size:16px;line-height:20px">${escapeHTML(button.label)}</a></td></tr></table>`:"";
  const plainHTML=plain?`<p style="margin:0 0 16px;font-size:14px"><a class="em-link" href="${escapeHTML(plain.url)}" style="color:#111">${escapeHTML(plain.label)}</a></p>`:"";
  const html=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light dark"><meta name="supported-color-schemes" content="light dark"><style>${EMAIL_STYLE}</style></head><body class="em-bg" style="margin:0;background:#fbf4e6;color:#111;font:16px/1.6 Arial,sans-serif"><table role="presentation" class="em-bg" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fbf4e6"><tr><td align="center" style="padding:36px 12px"><table role="presentation" class="em-card" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#fff;border-radius:16px"><tr><td class="em-text" style="padding:32px;color:#111"><p style="margin:0 0 16px;font-size:12px;font-weight:bold;letter-spacing:2px">000H BY COJEEV</p><h1 style="margin:0 0 16px;font-size:28px;line-height:1.2">${escapeHTML(heading)}</h1><p style="margin:0">${escapeHTML(message)}</p>${buttonHTML}${plainHTML}<p class="em-muted" style="margin:0 0 8px;font-size:12px;color:#5f5b55">${escapeHTML(reference)}</p></td></tr></table><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px"><tr><td align="center" class="em-muted" style="padding:16px 32px 0;font-size:12px;color:#5f5b55">000h by Cojeev · Reply to this email if you need help.</td></tr></table></td></tr></table></body></html>`;
  return {subject:`${heading} · 000h by Cojeev`,text,html};
}
/** Neutralises @mentions on top of redact(), so a public issue can never notify a stranger. */
export const scrubPublic=(text:string,max:number)=>redact(text,max).replace(/@(?=[A-Za-z0-9_])/g,"@\u200B");
// Code fences keep every submitted field literal, including encoded HTML/mentions.
// Choose a delimiter longer than every backtick run so content cannot close it.
function appLiteral(text:string,max:number) {
  const value=scrubPublic(text,max);
  const fence="`".repeat(Math.max(3,...Array.from(value.matchAll(/`+/g),match=>match[0].length+1)));
  return `${fence}\n${value}\n${fence}`;
}
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
type GitHubIssue={number:number;node_id:string;html_url:string;labels?:Array<string|{name?:string}>;body?:string;created_at?:string;user?:{id:number;login:string};pull_request?:unknown};
export async function mirrorIssue(env:Env,row:ReportRow,send=fetch) {
  const repository=row.source==="app"?row.destination_repository:env.GITHUB_REPOSITORY;
  if(!githubEnabled({...env,GITHUB_REPOSITORY:repository??undefined})) throw new DeliveryFailure("GitHub setup required.",false,true);
  if(row.issue_number) return {number:row.issue_number,node_id:row.issue_node_id,html_url:row.issue_url};
  const actor=await github(env,"/user",{},send);
  if(typeof actor.id!=="number"||!Number.isSafeInteger(actor.id)||actor.id<=0) throw new DeliveryFailure("GitHub token owner could not be verified.",false,true);
  // A signed marker prevents a different contributor from spoofing a receipt.
  const marker=`<!-- cojeev-report:${row.id}:${await keyedDigest(env.IP_HASH_SECRET??env.GITHUB_TOKEN!,`github-report:${row.id}`)} -->`;
  const repo=`/repos/${repository}`;
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
  const payload=row.source==="app"?{
    title:`[${row.app_category}] Cojeev app report`,
    body:`## Context\n${appLiteral(row.title,120)}\n\n## Message\n${appLiteral(row.description,2000)}${row.diagnostics_json?`\n\n## Diagnostics\n${appLiteral(JSON.parse(row.diagnostics_json) as string,1600)}`:""}\n\n${marker}`,
    labels:["user-report",row.app_category]
  }:publicIssue(row,marker);
  return await github(env,`${repo}/issues`,{method:"POST",body:JSON.stringify(payload)},send) as unknown as GitHubIssue;
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
    if(row.source==="app"&&!row.issue_number) {
      const returned=(issue as GitHubIssue).labels;
      const labels=Array.isArray(returned)?returned.map(label=>typeof label==="string"?label:label?.name):[];
      if(!["user-report",row.app_category].every(label=>labels.includes(label??""))) throw new DeliveryFailure("GitHub issue labels require maintainer review.",false,true);
    }
    const statements=[env.DB.prepare("UPDATE reports SET issue_number=?,issue_node_id=?,issue_url=? WHERE id=?").bind(issue.number,issue.node_id,issue.html_url,row.id)];
    if(row.source!=="app") {
      statements.push(env.DB.prepare("INSERT OR IGNORE INTO outbox(id,report_id,kind,due_at,created_at,reviewed_at) VALUES(?,?,'email_accepted',?,?,?)").bind(`${row.id}:email_accepted`,row.id,now(),now(),now()));
      if(env.GITHUB_PROJECT_ID) statements.push(env.DB.prepare("INSERT OR IGNORE INTO outbox(id,report_id,kind,due_at,created_at) VALUES(?,?,'github_project',?,?)").bind(`${row.id}:github_project`,row.id,now(),now()));
    }
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
  // App creation is safe to retry only through mirrorIssue's signed-marker scan.
  await env.DB.prepare("UPDATE outbox SET state='pending',due_at=?,lease_token=NULL,delivery_status='uncertain' WHERE kind='github' AND state='processing' AND lease_until<? AND attempts<8 AND report_id IN (SELECT id FROM reports WHERE source='app')").bind(now(),now()).run();
  // A crashed send has an unknown remote outcome. Never blindly resend it.
  await env.DB.prepare("UPDATE outbox SET state='needs_review',last_error='Delivery lease expired; check the provider before retrying.',lease_token=NULL WHERE state='processing' AND lease_until<?").bind(now()).run();
  const cutoff=activationCutoff(env);
  await env.DB.prepare("UPDATE outbox SET state='held',last_error='Delivery activation or historical review required.' WHERE state='pending' AND (? IS NULL OR (reviewed_at IS NULL AND report_id IN (SELECT id FROM reports WHERE created_at<?)))").bind(cutoff,cutoff).run();
  if(cutoff===null) return {processed:0};
  const appEnabled=!!env.GITHUB_TOKEN&&/^[\w.-]+\/[\w.-]+$/.test(env.APP_GITHUB_REPOSITORY??"");
  const enabledKinds=[...(emailEnabled(env)?EMAIL_KINDS:[]),...(githubEnabled(env)?["github","github_state",...(env.GITHUB_PROJECT_ID?["github_project"]:[])]:appEnabled?["github"]:[])];
  if(!enabledKinds.length) return {processed:0};
  // Disabled providers must not consume the batch window and starve enabled work.
  const jobs=await env.DB.prepare(`SELECT * FROM outbox WHERE state='pending' AND due_at<=? AND kind IN (${enabledKinds.map(()=>"?").join(",")}) AND (kind<>'github' OR report_id IN (SELECT id FROM reports WHERE (source='website' AND ?=1) OR (source='app' AND ?=1))) ${reportId?"AND report_id=?":""} ORDER BY created_at,id LIMIT 20`).bind(now(),...enabledKinds,Number(githubEnabled(env)),Number(appEnabled),...(reportId?[reportId]:[])).all<Delivery>();
  let processed=0;
  for(const job of jobs.results) {
    const row=await getReport(env,job.report_id);
    const appJob=job.kind==="github"&&row.source==="app";
    if(job.kind.startsWith("email")&&!emailEnabled(env) || job.kind.startsWith("github")&&!(appJob?appEnabled:githubEnabled(env))) continue;
    const lease=crypto.randomUUID();
    const claim=await env.DB.prepare("UPDATE outbox SET state='processing',attempts=attempts+1,lease_until=?,lease_token=? WHERE id=? AND state='pending' RETURNING id").bind(now()+300000,lease,job.id).first();
    if(!claim) continue;
    processed++;
    try {
      const provider=await deliver(env,job,row,send);
      await env.DB.prepare("UPDATE outbox SET state='done',provider_id=?,lease_token=NULL,last_error=NULL WHERE id=? AND lease_token=?").bind(provider,job.id,lease).run();
    } catch(error) {
      const failure=error instanceof DeliveryFailure?error:new DeliveryFailure("Delivery could not be confirmed. Check provider status.",true);
      const review=!failure.quota&&((failure.ambiguous&&!appJob)||failure.permanent||job.attempts>=7);
      await env.DB.prepare("UPDATE outbox SET state=?,last_error=?,due_at=?,lease_token=NULL,delivery_status=? WHERE id=? AND lease_token=?").bind(review?"needs_review":"pending",failure.reason,now()+(failure.quota?3600000:Math.min(86400000,60000*2**job.attempts)),failure.quota?'quota':failure.ambiguous?'uncertain':review?'failed':'queued',job.id,lease).run();
    }
  }
  return {processed};
}
