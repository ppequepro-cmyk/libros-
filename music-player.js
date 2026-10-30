(()=> {
 const $=id=>document.getElementById(id);
 const audio=$("epMusicAudio"), files=$("epMusicFiles"), title=$("epMusicTitle"), sub=$("epMusicSub");
 let tracks=[], index=-1, repeat=false, urls=[];
 const fmt=n=>{if(!Number.isFinite(n))return "0:00";const m=Math.floor(n/60),s=Math.floor(n%60);return m+":"+String(s).padStart(2,"0")};
 function paint(){const t=tracks[index];title.textContent=t?t.name:"Elige música de tu dispositivo";sub.textContent=t?"Canción "+(index+1)+" de "+tracks.length+" · Reproducción local":"Tus archivos se reproducen aquí y no se suben a la web.";$("epMusicQueue").textContent=tracks.length+" canciones";$("epMusicPlay").textContent=audio.paused?"▶":"Ⅱ";}
 function load(i,play=true){if(!tracks.length)return;index=(i+tracks.length)%tracks.length;audio.src=tracks[index].url;paint();if(play)audio.play().catch(()=>{sub.textContent="Toca reproducir para iniciar el audio.";});}
 files.addEventListener("change",()=>{const chosen=Array.from(files.files||[]).filter(f=>f.type.startsWith("audio/")||/\.(mp3|m4a|aac|ogg|wav|flac)$/i.test(f.name));if(!chosen.length)return;const start=tracks.length;chosen.forEach(f=>{const url=URL.createObjectURL(f);urls.push(url);tracks.push({name:f.name.replace(/\.[^.]+$/,""),url});});if(index<0)load(start,false);paint();files.value="";});
 $("epMusicPlay").addEventListener("click",()=>{if(index<0){if(tracks.length)load(0);else{files.click();return;}}else if(audio.paused)audio.play().catch(()=>{});else audio.pause();});
 $("epMusicPrev").addEventListener("click",()=>load(index<=0?tracks.length-1:index-1));
 $("epMusicNext").addEventListener("click",()=>load(index+1));
 $("epMusicHide").addEventListener("click",()=>{$("epMusicPlayer").hidden=true;$("epMusicShow").hidden=false;});
 $("epMusicShow").addEventListener("click",()=>{$("epMusicPlayer").hidden=false;$("epMusicShow").hidden=true;});
 $("epMusicRepeat").addEventListener("click",()=>{repeat=!repeat;audio.loop=repeat;$("epMusicRepeat").textContent="↻ Repetir: "+(repeat?"sí":"no");});
 $("epMusicVolume").value=localStorage.getItem("ep_music_volume")||"0.75";audio.volume=Number($("epMusicVolume").value);
 $("epMusicVolume").addEventListener("input",e=>{audio.volume=Number(e.target.value);localStorage.setItem("ep_music_volume",e.target.value);});
 $("epMusicSeek").addEventListener("input",e=>{if(Number.isFinite(audio.duration))audio.currentTime=audio.duration*(Number(e.target.value)/1000);});
 audio.addEventListener("timeupdate",()=>{if(Number.isFinite(audio.duration)){$("epMusicSeek").value=String(Math.round(audio.currentTime/audio.duration*1000));$("epMusicCurrent").textContent=fmt(audio.currentTime);$("epMusicDuration").textContent=fmt(audio.duration);}});
 audio.addEventListener("play",paint);audio.addEventListener("pause",paint);audio.addEventListener("ended",()=>{if(!repeat&&tracks.length>1)load(index+1);else paint();});
 window.addEventListener("beforeunload",()=>urls.forEach(URL.revokeObjectURL));
 paint();
})();