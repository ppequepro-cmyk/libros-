(()=> {
 const $=id=>document.getElementById(id);
 const audio=$("epMusicAudio"), files=$("epMusicFiles"), title=$("epMusicTitle"), sub=$("epMusicSub");
 let tracks=[], index=-1, repeat=false, urls=[];
 const fmt=n=>{if(!Number.isFinite(n))return "0:00";const m=Math.floor(n/60),s=Math.floor(n%60);return m+":"+String(s).padStart(2,"0")};
 function stopEmbed(){const box=$("epMusicEmbed");box.replaceChildren();box.hidden=true;}
 function paint(){const t=tracks[index];title.textContent=t?t.name:"Elige música";sub.textContent=t?"Canción "+(index+1)+" de "+tracks.length+" · Archivo local":"Añade archivos locales o busca música en YouTube."; $("epMusicQueue").textContent=tracks.length+" archivos locales";$("epMusicPlay").textContent=audio.paused?"▶":"Ⅱ";}
 function load(i,play=true){if(!tracks.length)return;stopEmbed();index=(i+tracks.length)%tracks.length;audio.src=tracks[index].url;paint();if(play)audio.play().catch(()=>{sub.textContent="Toca reproducir para iniciar el audio.";});}
 files.addEventListener("change",()=>{const chosen=Array.from(files.files||[]).filter(f=>f.type.startsWith("audio/")||/\.(mp3|m4a|aac|ogg|wav|flac)$/i.test(f.name));if(!chosen.length)return;const start=tracks.length;chosen.forEach(f=>{const url=URL.createObjectURL(f);urls.push(url);tracks.push({name:f.name.replace(/\.[^.]+$/,""),url});});if(index<0)load(start,false);paint();files.value="";});
 $("epMusicPlay").addEventListener("click",()=>{if(index<0){if(tracks.length)load(0);else files.click();}else if(audio.paused)audio.play().catch(()=>{});else audio.pause();});
 $("epMusicPrev").addEventListener("click",()=>{if(tracks.length)load(index<=0?tracks.length-1:index-1)});
 $("epMusicNext").addEventListener("click",()=>{if(tracks.length)load(index+1)});
 $("epMusicHide").addEventListener("click",()=>{$("epMusicPlayer").hidden=true;$("epMusicShow").hidden=false;});
 $("epMusicShow").addEventListener("click",()=>{$("epMusicPlayer").hidden=false;$("epMusicShow").hidden=true;});
 $("epMusicRepeat").addEventListener("click",()=>{repeat=!repeat;audio.loop=repeat;$("epMusicRepeat").textContent="↻ Repetir: "+(repeat?"sí":"no");});
 const searchForm=$("epMusicSearchForm"),searchInput=$("epMusicSearch"),searchResults=$("epMusicResults"),filter=$("epMusicFilter");
 function playInPage(item){
  if(!item.videoId){sub.textContent="Este resultado no ofrece un identificador reproducible. Prueba otro resultado.";return;}
  audio.pause();audio.removeAttribute("src");audio.load();index=-1;paint();
  title.textContent=item.title||"YouTube";
  sub.textContent=(item.artist||"")+" · Reproducción integrada";
  const box=$("epMusicEmbed");box.replaceChildren();box.hidden=false;
  const frame=document.createElement("iframe");
  frame.src="https://www.youtube-nocookie.com/embed/"+encodeURIComponent(item.videoId)+"?autoplay=1&rel=0";
  frame.title="Reproductor de YouTube";
  frame.allow="autoplay; encrypted-media; picture-in-picture; fullscreen";
  frame.allowFullscreen=true;frame.referrerPolicy="strict-origin-when-cross-origin";
  box.append(frame);
  box.scrollIntoView({behavior:"smooth",block:"nearest"});
 }
 function resultCard(item){
  const row=document.createElement("div");row.className="ep-music-result";
  const info=document.createElement("span"),name=document.createElement("strong"),detail=document.createElement("small");
  name.textContent=item.title||"Sin título";detail.textContent=[item.artist,item.duration].filter(Boolean).join(" · ")||"YouTube Music";info.append(name,detail);row.append(info);
  if(item.videoId){const play=document.createElement("button");play.type="button";play.className="ep-music-play";play.textContent="▶ Reproducir aquí";play.addEventListener("click",()=>playInPage(item));row.append(play);}
  else {const link=document.createElement("a");link.textContent="Ver";link.href=item.url||"https://music.youtube.com/";link.target="_blank";link.rel="noopener noreferrer";link.className="ep-music-open";row.append(link);}
  return row;
 }
 async function searchYouTubeMusic(q){
  searchResults.textContent="Buscando...";
  const button=searchForm.querySelector('button[type="submit"]');button.disabled=true;
  try{const params=new URLSearchParams({q,filter:filter?.value||"songs"});const response=await fetch("/.netlify/functions/youtube-search?"+params,{headers:{Accept:"application/json"}});
   const data=await response.json();if(!response.ok)throw new Error(data.detail||data.error||"Error de búsqueda");
   searchResults.replaceChildren();if(!data.results?.length){searchResults.textContent="No encontré resultados. Prueba otro título o artista.";return;}
   data.results.forEach(item=>searchResults.append(resultCard(item)));
  }catch(error){searchResults.textContent="No se pudo buscar: "+(error.message||"inténtalo más tarde.");}finally{button.disabled=false;}
 }
 searchForm.addEventListener("submit",e=>{e.preventDefault();const q=searchInput.value.trim();if(q.length>=2)searchYouTubeMusic(q);});
 $("epMusicSeek").addEventListener("input",e=>{if(Number.isFinite(audio.duration))audio.currentTime=audio.duration*(Number(e.target.value)/1000);});
 audio.addEventListener("timeupdate",()=>{if(Number.isFinite(audio.duration)){$("epMusicSeek").value=String(Math.round(audio.currentTime/audio.duration*1000));$("epMusicCurrent").textContent=fmt(audio.currentTime);$("epMusicDuration").textContent=fmt(audio.duration);}});
 audio.addEventListener("play",paint);audio.addEventListener("pause",paint);
 audio.addEventListener("ended",()=>{if(!repeat&&tracks.length>1)load(index+1);else paint();});
 window.addEventListener("beforeunload",()=>urls.forEach(URL.revokeObjectURL));paint();
})();