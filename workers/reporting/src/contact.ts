import { isUUID } from '../../../lib/reporting/contracts';
import { DeliveryFailure, escapeHTML } from './delivery';
import { sendContactResend } from './resend';
import { checkAbuse, HttpError, readJSON } from './security';
import { emailEnabled, now, type Env } from './types';

type ContactMessage={id:string;name:string;email:string;message:string;page:string;delivery_status:string;provider_id:string|null};
const ADDRESS=/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/;
function outcome(row:ContactMessage) {
  if(row.delivery_status==='accepted') return {ok:true};
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
  if(existing) {
    if([existing.name,existing.email,existing.message,existing.page].some((value,i)=>value!==values[i])) throw new HttpError(409,'This message was already saved with different details. Retry the original draft.');
    return outcome(existing);
  }
  await checkAbuse(request,env,turnstileToken,id);
  // Only the request that wins the insert can send, including simultaneous submissions.
  const row=await env.DB.prepare("INSERT OR IGNORE INTO contact_messages(id,created_at,name,email,message,page,delivery_status) VALUES(?,?,?,?,?,?,'sending') RETURNING *").bind(id,now(),...values).first<ContactMessage>();
  if(!row) return outcome((await env.DB.prepare('SELECT * FROM contact_messages WHERE id=?').bind(id).first<ContactMessage>())!);
  if(!emailEnabled(env)) {
    await env.DB.prepare("UPDATE contact_messages SET delivery_status='disabled' WHERE id=?").bind(id).run();
    return outcome({...row,delivery_status:'disabled'});
  }
  const text=`Name: ${row.name}\nEmail: ${row.email}\nPage: ${row.page}\n\n${row.message}`;
  const body=JSON.stringify({from:env.EMAIL_FROM,to:env.CONTACT_NOTIFICATION_EMAIL,reply_to:row.email,subject:`000h contact from ${row.name}`,text,html:`<pre>${escapeHTML(text)}</pre>`});
  let providerId:string;
  try {providerId=await sendContactResend(env,id,body,send);}
  catch(error) {
    const status=error instanceof DeliveryFailure&&error.quota?'limited':'needs_review';
    await env.DB.prepare('UPDATE contact_messages SET delivery_status=? WHERE id=?').bind(status,id).run();
    return outcome({...row,delivery_status:status});
  }
  await env.DB.prepare("UPDATE contact_messages SET delivery_status='accepted',provider_id=? WHERE id=?").bind(providerId,id).run();
  return {ok:true};
}
