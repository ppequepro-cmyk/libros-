(()=> {
 const $=id=>document.getElementById(id);
 const audio=$("epMusicAudio"), files=$("epMusicFiles"), title=$("epMusicTitle"), sub=$("epMusicSub");
 let tracks=[], index=-1, repeat=false, urls=[];
 const fmt=n=>{if(!Number.isFinite(n))return "0:00";const m=Math.floor(n/60),s=Math.floor(n%60);return m+":"+String(s).padStart(2,"0")};
 function paint(){
  const t=tracks[index];
  title.textContent=t?t.name:"Elige música";
  sub.textContent=t?(t.source==="local"?"Canción "+(index+1)+" de "+tracks.length+" · Archivo local":"Abre YouTube Music para reproducir esta canción"):"Añade archivos de tu dispositivo o busca en YouTube Music.";
  $("epMusicQueue").textContent=tracks.length+" archivos locales";
  $("epMusicPlay").textContent=audio.paused?"▶":"Ⅱ";
 }
 function load(i,play=true){
  if(!tracks.length)return;
  index=(i+tracks.length)%tracks.length;
  if(tracks[index].source!=="local")return;
  audio.src=tracks[index].url;paint();
  if(play)audio.play().catch(()=>{sub.textContent="Toca reproducir para iniciar el audio.";});
 }
 files.addEventListener("change",()=>{
  const chosen=Array.from(files.files||[]).filter(f=>f.type.startsWith("audio/")||/\.(mp3|m4a|aac|ogg|wav|flac)$/i.test(f.name));
  if(!chosen.length)return;
  const start=tracks.length;
  chosen.forEach(f=>{const url=URL.createObjectURL(f);urls.push(url);tracks.push({name:f.name.replace(/\.[^.]+$/,""),url,source:"local"});});
  if(index<0)load(start,false);paint();files.value="";
 });
 $("epMusicPlay").addEventListener("click",()=>{
  if(index<0){if(tracks.length)load(0);else files.click();}
  else if(tracks[index]?.source!=="local"){sub.textContent="Esta canción se reproduce desde YouTube Music. Usa el enlace de su resultado.";}
  else if(audio.paused)audio.play().catch(()=>{});else audio.pause();
 });
 $("epMusicPrev").addEventListener("click",()=>{if(tracks.length)load(index<=0?tracks.length-1:index-1)});
 $("epMusicNext").addEventListener("click",()=>{if(tracks.length)load(index+1)});
 $("epMusicHide").addEventListener("click",()=>{$("epMusicPlayer").hidden=true;$("epMusicShow").hidden=false;});
 $("epMusicShow").addEventListener("click",()=>{$("epMusicPlayer").hidden=false;$("epMusicShow").hidden=true;});
 $("epMusicRepeat").addEventListener("click",()=>{repeat=!repeat;audio.loop=repeat;$("epMusicRepeat").textContent="↻ Repetir: "+(repeat?"sí":"no");});

 const searchForm=$("epMusicSearchForm"), searchInput=$("epMusicSearch"), searchResults=$("epMusicResults");
 const filter=$("epMusicFilter");
 function resultCard(item){
  const row=document.createElement("div");row.className="ep-music-result";
  const info=document.createElement("span");
  const name=document.createElement("strong");name.textContent=item.title||"Sin título";
  const detail=document.createElement("small");detail.textContent=[item.artist,item.duration].filter(Boolean).join(" · ")||"YouTube Music";
  info.append(name,detail);
  const link=document.createElement("a");link.textContent="Abrir";link.href=item.url||"https://music.youtube.com/";link.target="_blank";link.rel="noopener noreferrer";link.className="ep-music-open";
  row.append(info,link);return row;
 }
 async function searchYouTubeMusic(q){
  searchResults.textContent="Buscando en YouTube Music...";
  const button=searchForm.querySelector("button[type=submit]");button.disabled=true;
  try{
   const params=new URLSearchParams({q,filter:filter?.value||"songs"});
   const response=await fetch("/.netlify/functions/youtube-search?"+params.toString(),{headers:{Accept:"application/json"}});
   const data=await response.json();
   if(!response.ok)throw new Error(data.detail||data.error||"No se pudo completar la búsqueda.");
   searchResults.replaceChildren();
   if(!data.results?.length){searchResults.textContent="No encontré resultados. Prueba con otro título o artista.";return;}
   data.results.forEach(item=>searchResults.append(resultCard(item)));
  }catch(error){
   searchResults.textContent="No se pudo buscar en YouTube Music. "+(error.message||"Inténtalo más tarde.");
  }finally{button.disabled=false;}
 }
 searchForm.addEventListener("submit",e=>{e.preventDefault();const q=searchInput.value.trim();if(q.length>=2)searchYouTubeMusic(q);});
 $("epMusicSeek").addEventListener("input",e=>{if(Number.isFinite(audio.duration))audio.currentTime=audio.duration*(Number(e.target.value)/1000);});
 audio.addEventListener("timeupdate",()=>{if(Number.isFinite(audio.duration)){$("epMusicSeek").value=String(Math.round(audio.currentTime/audio.duration*1000));$("epMusicCurrent").textContent=fmt(audio.currentTime);$("epMusicDuration").textContent=fmt(audio.duration);}});
 audio.addEventListener("play",paint);audio.addEventListener("pause",paint);
 audio.addEventListener("ended",()=>{if(!repeat&&tracks.length>1)load(index+1);else paint();});
 window.addEventListener("beforeunload",()=>urls.forEach(URL.revokeObjectURL));
 paint();
})();