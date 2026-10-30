const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Methods":"GET,OPTIONS","Access-Control-Allow-Headers":"Content-Type"};
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{"Content-Type":"application/json; charset=utf-8",...cors}});
export async function onRequestOptions(){return new Response(null,{status:204,headers:cors})}
export async function onRequestGet({env}){
 if(!env.DB)return json({error:"D1 binding DB is not configured"},503);
 const [v,s,f]=await Promise.all([
  env.DB.prepare("SELECT COUNT(*) AS total FROM sessions").first(),
  env.DB.prepare("SELECT COUNT(*) AS total FROM reading_events WHERE event_type='started'").first(),
  env.DB.prepare("SELECT COUNT(*) AS total FROM reading_events WHERE event_type='finished'").first()
 ]);
 return json({visits:v?.total||0,started:s?.total||0,finished:f?.total||0});
}
