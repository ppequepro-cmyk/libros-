const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Methods":"POST,OPTIONS","Access-Control-Allow-Headers":"Content-Type"};
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{"Content-Type":"application/json; charset=utf-8",...cors}});
export async function onRequestOptions(){return new Response(null,{status:204,headers:cors})}
export async function onRequestPost({request,env}){
 if(!env.AI_API_KEY||!env.AI_BASE_URL||!env.AI_MODEL)return json({error:"AI provider is not configured"},503);
 let body;try{body=await request.json()}catch{return json({error:"Invalid JSON"},400)}
 const question=typeof body?.question==="string"?body.question.trim().slice(0,700):"";
 const catalog=Array.isArray(body?.catalog)?body.catalog.slice(0,100).map(b=>({title:String(b.title||"").slice(0,160),author:String(b.author||"").slice(0,100),genre:String(b.genre||"").slice(0,60),year:Number(b.year)||null,description:String(b.description||"").slice(0,400),tags:Array.isArray(b.tags)?b.tags.slice(0,8):[]})): [];
 if(!question)return json({error:"Question is required"},400);
 const prompt="Eres el asistente de la biblioteca Entre Páginas. Responde en español, de forma breve y clara. El catálogo proporcionado es la única fuente para afirmar que un libro está disponible. Si no aparece, di que no está registrado en esta web, no que no exista en el mundo. No inventes títulos, autores, ediciones ni disponibilidad. Puedes recomendar títulos del catálogo y explicar por qué. Si te preguntan algo ajeno a libros, responde brevemente que ayudas con lecturas y el catálogo.\nCATÁLOGO:\n"+JSON.stringify(catalog);
 let upstream;try{upstream=await fetch(env.AI_BASE_URL,{method:"POST",headers:{"Authorization":"Bearer "+env.AI_API_KEY,"Content-Type":"application/json"},body:JSON.stringify({model:env.AI_MODEL,messages:[{role:"system",content:prompt},{role:"user",content:question}],temperature:0.3,max_tokens:350})})}catch{return json({error:"AI provider connection failed"},502)}
 const data=await upstream.json().catch(()=>({}));
 if(!upstream.ok)return json({error:"AI provider returned an error",status:upstream.status},502);
 const answer=data.choices?.[0]?.message?.content;
 if(typeof answer!=="string"||!answer.trim())return json({error:"Empty AI response"},502);
 return json({answer:answer.trim()});
}
