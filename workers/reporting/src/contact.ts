import { isUUID } from '../../../lib/reporting/contracts';
import { DeliveryFailure, escapeHTML } from './delivery';
import { sendContactResend } from './resend';
import { checkAbuse, HttpError, readJSON } from './security';
import { emailEnabled, now, type Env } from './types';

type ContactMessage={id:string;name:string;email:string;message:string;page:string;created_at:number;delivery_status:string;provider_id:string|null;lease_until:number|null;payload_json:string|null};
const LEASE=15*60*1000,RETRY_WINDOW=23*60*60*1000;
const ADDRESS=/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/;
function outcome(row:ContactMessage) {
  if(row.delivery_status==='accepted') return {ok:true};
  if(['limited','needs_review'].includes(row.delivery_status)) return {ok:true,queued:true};
  throw new HttpError(503,row.delivery_status==='sending'?'Your message is still being sent. Keep your draft and retry.':'Your message is saved, but email is unavailable. Please use Email me to get in touch.');
}
export async function contact(request:Request,env:Env,send=fetch) {
  if(!env.CONTACT_NOTIFICATION_EMAIL||!ADDRESS.test(env.CONTACT_NOTIFICATION_EMAIL)||/\s/.test(env.CONTACT_NOTIFICATION_EMAIL)) throw new HttpError(503,'Contact is not configured.');
  const raw=await readJSON(request,8192);
  if(!raw||typeof raw!=='object'||Array.isArray(raw)) throw new HttpError(400,'Enter your name, email and message.');
  const {id,name,email,message,page,company,turnstileToken}=raw as Record<string,unknown>;
  if(typeof company==='string'&&company.length) return {ok:true};
  if(!isUUID(id)||typeof name!=='string'||/[\r\n]/.test(name)||name.trim().length<1||name.trim().length>100) throw new HttpError(400,'Enter a name of 1–100 characters without line breaks.');
  if(typeof email!=='string'||email.length>254||/\s/.test(email)||!ADDRESS.test(email)) throw new HttpError(400,'Enter a valid email address without spaces or line breaks.');
  if(typeof message!=='string'||message.trim().length<10||message.length>4000) throw new HttpError(400,'Write a message of 10–4000 characters.');
  if(typeof page!=='string'||page.length>500||!/^\/(?!\/)[^\s?#]*$/.test(page)) throw new HttpError(400,'Send the page path without a query or fragment.');
  const values=[name.trim(),email,message.trim(),page];
  const existing=await env.DB.prepare('SELECT * FROM contact_messages WHERE id=?').bind(id).first<ContactMessage>();
  if(existing) { assertSameDraft(existing,values);return outcome(existing); }
  await checkAbuse(request,env,turnstileToken,id);
  // Only the request that wins the insert can send, including simultaneous submissions.
  const row=await env.DB.prepare("INSERT OR IGNORE INTO contact_messages(id,created_at,name,email,message,page,lease_until,delivery_status) VALUES(?,?,?,?,?,?,?,'sending') RETURNING *").bind(id,now(),...values,now()+LEASE).first<ContactMessage>();
  if(!row) {
    const saved=(await env.DB.prepare('SELECT * FROM contact_messages WHERE id=?').bind(id).first<ContactMessage>())!;
    assertSameDraft(saved,values);return outcome(saved);
  }
  if(!emailEnabled(env)) {
    await env.DB.prepare("UPDATE contact_messages SET delivery_status='disabled',lease_until=NULL WHERE id=?").bind(id).run();
    return outcome({...row,delivery_status:'disabled'});
  }
  const result=await deliverContact(env,row,send);
  if(!result) throw new HttpError(503,'Your message is saved, but email is unavailable. Please use Email me to get in touch.');
  return result;
}
function assertSameDraft(row:ContactMessage,values:string[]) {
  if([row.name,row.email,row.message,row.page].some((value,i)=>value!==values[i])) throw new HttpError(409,'This message was already saved with different details. Retry the original draft.');
}
async function deliverContact(env:Env,row:ContactMessage,send:typeof fetch) {
  const id=row.id;
  const text=`Name: ${row.name}\nEmail: ${row.email}\nPage: ${row.page}\n\n${row.message}`;
  const body=row.payload_json??JSON.stringify({from:env.EMAIL_FROM,to:env.CONTACT_NOTIFICATION_EMAIL,reply_to:row.email,subject:`000h contact from ${row.name}`,text,html:`<pre>${escapeHTML(text)}</pre>`});
  // Preserve the exact serialized request across configuration changes and retries.
  // Reading through the owned lease also rechecks the live status after a cron claim.
  const saved=await env.DB.prepare("UPDATE contact_messages SET payload_json=COALESCE(payload_json,?) WHERE id=? AND delivery_status='sending' AND lease_until=? RETURNING *").bind(body,id,row.lease_until).first<ContactMessage>();
  if(!saved) return null;
  if(now()-saved.created_at>=RETRY_WINDOW) {
    await env.DB.prepare("UPDATE contact_messages SET delivery_status='expired',lease_until=NULL WHERE id=? AND delivery_status='sending' AND lease_until=?").bind(id,row.lease_until).run();
    return null;
  }
  let providerId:string;
  try {providerId=await sendContactResend(env,id,saved.payload_json!,send);}
  catch(error) {
    const status=error instanceof DeliveryFailure&&error.quota?'limited':'needs_review';
    await env.DB.prepare("UPDATE contact_messages SET delivery_status=?,lease_until=NULL WHERE id=? AND delivery_status='sending' AND lease_until=?").bind(status,id,row.lease_until).run();
    return outcome({...row,delivery_status:status});
  }
  await env.DB.prepare("UPDATE contact_messages SET delivery_status='accepted',provider_id=?,lease_until=NULL WHERE id=? AND delivery_status='sending' AND lease_until=?").bind(providerId,id,row.lease_until).run();
  return {ok:true};
}

export async function retryContacts(env:Env,send=fetch) {
  const time=now(),cutoff=time-RETRY_WINDOW;
  // Stop before Resend's 24-hour idempotency window can lapse.
  // A send that still holds its lease finishes first; it expires here only after the lease lapses.
  await env.DB.prepare("UPDATE contact_messages SET delivery_status='expired',lease_until=NULL WHERE delivery_status IN ('limited','needs_review','sending') AND created_at<=? AND NOT (delivery_status='sending' AND lease_until IS NOT NULL AND lease_until>?)").bind(cutoff,time).run();
  if(!emailEnabled(env)||!env.CONTACT_NOTIFICATION_EMAIL||!ADDRESS.test(env.CONTACT_NOTIFICATION_EMAIL)) return;
  const pending=await env.DB.prepare("SELECT * FROM contact_messages WHERE created_at>? AND (delivery_status IN ('limited','needs_review') OR (delivery_status='sending' AND ((lease_until IS NOT NULL AND lease_until<=?) OR (lease_until IS NULL AND created_at<?)))) ORDER BY created_at").bind(cutoff,time,time-LEASE).all<ContactMessage>();
  for(const row of pending.results) {
    const claimTime=now();
    // Snapshots may overlap. Only the atomic claim can authorize a provider attempt.
    // Unleased legacy sends retain the original fifteen-minute recovery delay.
    const claimed=await env.DB.prepare("UPDATE contact_messages SET delivery_status='sending',lease_until=? WHERE id=? AND delivery_status IN ('limited','needs_review','sending') AND (lease_until IS NULL OR lease_until<=?) AND (delivery_status!='sending' OR lease_until IS NOT NULL OR created_at<?) RETURNING *").bind(claimTime+LEASE,row.id,claimTime,claimTime-LEASE).first<ContactMessage>();
    if(claimed) await deliverContact(env,claimed,send);
  }
}
