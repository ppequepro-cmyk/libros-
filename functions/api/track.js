const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Methods":"GET,POST,OPTIONS","Access-Control-Allow-Headers":"Content-Type"};
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{"Content-Type":"application/json; charset=utf-8",...cors}});
export async function onRequestOptions(){return new Response(null,{status:204,headers:cors})}
export async function onRequestPost({request,env}){
 if(!env.DB)return json({error:"D1 binding DB is not configured"},503);
 let body;try{body=await request.json()}catch{return json({error:"Invalid JSON"},400)}
 const {sessionId,type,bookId}=body||{};
 if(typeof sessionId!=="string"||sessionId.length<8||sessionId.length>100)return json({error:"Invalid sessionId"},400);
 if(type==="visit"){await env.DB.prepare("INSERT OR IGNORE INTO sessions(session_id) VALUES (?)").bind(sessionId).run();return json({ok:true})}
 if(!["started","finished"].includes(type)||typeof bookId!=="string"||bookId.length>180)return json({error:"Invalid event"},400);
 await env.DB.prepare("INSERT OR IGNORE INTO sessions(session_id) VALUES (?)").bind(sessionId).run();
 await env.DB.prepare("INSERT OR IGNORE INTO reading_events(session_id,book_id,event_type) VALUES (?,?,?)").bind(sessionId,bookId,type).run();
 return json({ok:true});
}
