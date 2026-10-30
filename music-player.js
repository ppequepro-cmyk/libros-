(()=> {
 const $=id=>document.getElementById(id);
 const audio=$("epMusicAudio"), files=$("epMusicFiles"), title=$("epMusicTitle"), sub=$("epMusicSub");
 let tracks=[], index=-1, repeat=false, urls=[];
 const fmt=n=>{if(!Number.isFinite(n))return "0:00";const m=Math.floor(n/60),s=Math.floor(n%60);return m+":"+String(s).padStart(2,"0")};
 function paint(){const t=tracks[index];title.textContent=t?t.name:"Elige música";sub.textContent=t?(t.source==="online"?"Audio con licencia abierta · Internet Archive":"Canción "+(index+1)+" de "+tracks.length+" · Archivo local"):"Añade archivos o busca música con licencia abierta.";$("epMusicQueue").textContent=tracks.length+" canciones";$("epMusicPlay").textContent=audio.paused?"▶":"Ⅱ";}
 function load(i,play=true){if(!tracks.length)return;index=(i+tracks.length)%tracks.length;audio.src=tracks[index].url;paint();if(play)audio.play().catch(()=>{sub.textContent="Toca reproducir para iniciar el audio.";});}
 files.addEventListener("change",()=>{const chosen=Array.from(files.files||[]).filter(f=>f.type.startsWith("audio/")||/\.(mp3|m4a|aac|ogg|wav|flac)$/i.test(f.name));if(!chosen.length)return;const start=tracks.length;chosen.forEach(f=>{const url=URL.createObjectURL(f);urls.push(url);tracks.push({name:f.name.replace(/\.[^.]+$/,""),url,source:"local"});});if(index<0)load(start,false);paint();files.value="";});
 $("epMusicPlay").addEventListener("click",()=>{if(index<0){if(tracks.length)load(0);else{files.click();return;}}else if(audio.paused)audio.play().catch(()=>{});else audio.pause();});
 $("epMusicPrev").addEventListener("click",()=>load(index<=0?tracks.length-1:index-1));
 $("epMusicNext").addEventListener("click",()=>load(index+1));
 $("epMusicHide").addEventListener("click",()=>{$("epMusicPlayer").hidden=true;$("epMusicShow").hidden=false;});
 $("epMusicShow").addEventListener("click",()=>{$("epMusicPlayer").hidden=false;$("epMusicShow").hidden=true;});
 $("epMusicRepeat").addEventListener("click",()=>{repeat=!repeat;audio.loop=repeat;$("epMusicRepeat").textContent="↻ Repetir: "+(repeat?"sí":"no");});

 const searchForm=$("epMusicSearchForm"), searchInput=$("epMusicSearch"), searchResults=$("epMusicResults");
 function safe(s){return String(s||"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
 async function searchOpenMusic(q){
  searchResults.textContent="Buscando música con licencia abierta...";
  try{
   const terms=q.trim().split(/\s+/).map(x=>"title:"+x.replace(/[():"]/g,"")).join(" AND ");
   const license='(licenseurl:"https://creativecommons.org/publicdomain/mark/1.0/" OR licenseurl:"https://creativecommons.org/licenses/by/4.0/" OR licenseurl:"https://creativecommons.org/licenses/by-sa/4.0/" OR licenseurl:"https://creativecommons.org/licenses/by/3.0/" OR licenseurl:"https://creativecommons.org/licenses/by-sa/3.0/")';
   const query=encodeURIComponent('mediatype:audio AND '+license+' AND ('+terms+')');
   const endpoint='https://archive.org/advancedsearch.php?q='+query+'&fl[]=identifier&fl[]=title&fl[]=creator&fl[]=licenseurl&rows=12&page=1&output=json';
   const response=await fetch(endpoint);if(!response.ok)throw new Error("El catálogo no respondió");
   const data=await response.json(), docs=data.response?.docs||[];
   if(!docs.length){searchResults.textContent="No encontré resultados con esas palabras y las licencias permitidas.";return;}
   searchResults.innerHTML=docs.map((d,i)=>'<div class="ep-music-result"><span><strong>'+safe(d.title||d.identifier)+'</strong><small>'+safe(d.creator||"Autor desconocido")+' · '+safe((d.licenseurl||"").includes("publicdomain")?"Dominio público":"Creative Commons")+'</small></span><button type="button" data-id="'+safe(d.identifier)+'" data-title="'+safe(d.title||d.identifier)+'">Reproducir</button></div>').join("");
   searchResults.querySelectorAll("button[data-id]").forEach(btn=>btn.addEventListener("click",()=>addArchiveTrack(btn.dataset.id,btn.dataset.title,btn)));
  }catch(e){searchResults.textContent="No se pudo consultar Internet Archive. Comprueba tu conexión e inténtalo más tarde.";}
 }
 async function addArchiveTrack(id,name,button){
  button.disabled=true;button.textContent="Cargando...";
  try{
   const r=await fetch("https://archive.org/metadata/"+encodeURIComponent(id));if(!r.ok)throw new Error();
   const meta=await r.json(), license=String(meta.metadata?.licenseurl||"");
   const allowed=/publicdomain\/mark\/1\.0|creativecommons\.org\/licenses\/(by|by-sa)\/(3\.0|4\.0)/i.test(license);
   if(!allowed)throw new Error("Licencia no permitida");
   const file=(meta.files||[]).filter(f=>!f["source"]?.includes("metadata")&&/\.(mp3|ogg|oga|m4a)$/i.test(f.name||"")&&!f.name.includes("__ia_thumb")).sort((a,b)=>(Number(b.size)||0)-(Number(a.size)||0))[0];
   if(!file)throw new Error("No hay audio compatible");
   const path=String(file.name).split("/").map(encodeURIComponent).join("/");
   const url="https://archive.org/download/"+encodeURIComponent(id)+"/"+path;
   tracks.push({name,url,source:"online"});if(index<0)load(0);paint();button.textContent="Añadida";
  }catch(e){button.disabled=false;button.textContent="No disponible";}
 }
 searchForm.addEventListener("submit",e=>{e.preventDefault();const q=searchInput.value.trim();if(q)searchOpenMusic(q);});
\n $("epMusicSeek").addEventListener("input",e=>{if(Number.isFinite(audio.duration))audio.currentTime=audio.duration*(Number(e.target.value)/1000);});
 audio.addEventListener("timeupdate",()=>{if(Number.isFinite(audio.duration)){$("epMusicSeek").value=String(Math.round(audio.currentTime/audio.duration*1000));$("epMusicCurrent").textContent=fmt(audio.currentTime);$("epMusicDuration").textContent=fmt(audio.duration);}});
 audio.addEventListener("play",paint);audio.addEventListener("pause",paint);audio.addEventListener("ended",()=>{if(!repeat&&tracks.length>1)load(index+1);else paint();});
 window.addEventListener("beforeunload",()=>urls.forEach(URL.revokeObjectURL));
 paint();
})();