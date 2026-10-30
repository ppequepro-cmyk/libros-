(() => {
  const $ = id => document.getElementById(id);
  const audio = $("epMusicAudio");
  const files = $("epMusicFiles");
  const title = $("epMusicTitle");
  const sub = $("epMusicSub");
  const playButton = $("epMusicPlay");
  const seek = $("epMusicSeek");
  const currentLabel = $("epMusicCurrent");
  const durationLabel = $("epMusicDuration");

  let localTracks = [];
  let localIndex = -1;
  let youtubeTracks = [];
  let youtubeIndex = -1;
  let activeSource = "none";
  let repeat = false;
  let objectUrls = [];
  let ytPlayer = null;
  let ytReadyPromise = null;
  let pendingVideo = null;
  let progressTimer = null;

  const fmt = value => {
    if (!Number.isFinite(value) || value < 0) return "0:00";
    const minutes = Math.floor(value / 60);
    const seconds = Math.floor(value % 60);
    return minutes + ":" + String(seconds).padStart(2, "0");
  };

  function updatePlayButton(playing) {
    playButton.textContent = playing ? "Ⅱ" : "▶";
    playButton.setAttribute("aria-label", playing ? "Pausar" : "Reproducir");
  }

  function paint() {
    if (activeSource === "youtube") {
      const track = youtubeTracks[youtubeIndex];
      title.textContent = track?.title || "YouTube";
      sub.textContent = (track?.artist || "YouTube") + " · Reproductor oficial";
      $("epMusicQueue").textContent = youtubeTracks.length + " resultados en cola";
    } else if (activeSource === "local") {
      const track = localTracks[localIndex];
      title.textContent = track?.name || "Archivo local";
      sub.textContent = "Archivo de audio de tu dispositivo";
      $("epMusicQueue").textContent = localTracks.length + " archivos locales";
    } else {
      title.textContent = "Elige música";
      sub.textContent = "Busca música o añade archivos de tu dispositivo.";
      $("epMusicQueue").textContent = "0 canciones";
    }
  }

  function stopYoutube() {
    if (ytPlayer && typeof ytPlayer.stopVideo === "function") ytPlayer.stopVideo();
  }

  function ensureYoutubePlayer() {
    if (ytReadyPromise) return ytReadyPromise;
    ytReadyPromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("El reproductor oficial de YouTube tardó demasiado en cargar.")), 15000);
      window.onYouTubeIframeAPIReady = () => {
        clearTimeout(timeout);
        ytPlayer = new YT.Player("yt-player-host", {
          width: "200",
          height: "200",
          videoId: "",
          playerVars: { autoplay: 0, controls: 0, rel: 0, playsinline: 1, enablejsapi: 1 },
          events: {
            onReady: () => {
              if (pendingVideo) {
                const next = pendingVideo;
                pendingVideo = null;
                ytPlayer.loadVideoById(next.videoId);
              }
              resolve(ytPlayer);
            },
            onStateChange: event => {
              if (event.data === YT.PlayerState.PLAYING) updatePlayButton(true);
              else if (event.data === YT.PlayerState.PAUSED || event.data === YT.PlayerState.ENDED || event.data === YT.PlayerState.CUED) updatePlayButton(false);
              if (event.data === YT.PlayerState.ENDED) {
                if (repeat) ytPlayer.seekTo(0, true);
                else if (youtubeTracks.length > 1) playYoutubeAt(youtubeIndex + 1);
              }
            },
            onError: () => {
              sub.textContent = "YouTube no permite reproducir este vídeo. Prueba otro resultado.";
              updatePlayButton(false);
            }
          }
        });
      };

      if (window.YT?.Player) {
        window.onYouTubeIframeAPIReady();
        return;
      }
      if (!document.querySelector('script[data-youtube-iframe-api]')) {
        const script = document.createElement("script");
        script.src = "https://www.youtube.com/iframe_api";
        script.async = true;
        script.dataset.youtubeIframeApi = "true";
        script.onerror = () => {
          clearTimeout(timeout);
          reject(new Error("No se pudo cargar la API oficial de YouTube."));
        };
        document.head.appendChild(script);
      }
    });
    return ytReadyPromise;
  }

  async function playYoutubeAt(index) {
    if (!youtubeTracks.length) return;
    youtubeIndex = (index + youtubeTracks.length) % youtubeTracks.length;
    const track = youtubeTracks[youtubeIndex];
    await window.playEntrePaginas(track.videoId, track.title, track);
  }

  window.playEntrePaginas = async (videoId, trackTitle, metadata = {}) => {
    if (!/^[a-zA-Z0-9_-]{11}$/.test(String(videoId || ""))) {
      sub.textContent = "Este resultado no tiene un identificador de vídeo válido.";
      return;
    }
    activeSource = "youtube";
    audio.pause();
    audio.removeAttribute("src");
    audio.load();
    if (metadata && metadata.videoId) {
      const existing = youtubeTracks.findIndex(item => item.videoId === videoId);
      if (existing >= 0) youtubeIndex = existing;
      else {
        youtubeTracks.push({ ...metadata, videoId, title: trackTitle || metadata.title || "YouTube" });
        youtubeIndex = youtubeTracks.length - 1;
      }
    } else {
      youtubeTracks = [{ videoId, title: trackTitle || "YouTube", artist: "" }];
      youtubeIndex = 0;
    }
    paint();
    $("epMusicArtwork").src = "https://i.ytimg.com/vi/" + encodeURIComponent(videoId) + "/hqdefault.jpg";
    $("epMusicArtwork").alt = "Portada de " + (trackTitle || "la canción");
    updatePlayButton(true);
    try {
      const player = await ensureYoutubePlayer();
      player.loadVideoById(videoId);
    } catch (error) {
      updatePlayButton(false);
      sub.textContent = error.message || "No se pudo iniciar YouTube.";
    }
  };

  function playLocalAt(index, shouldPlay = true) {
    if (!localTracks.length) return;
    activeSource = "local";
    stopYoutube();
    localIndex = (index + localTracks.length) % localTracks.length;
    audio.src = localTracks[localIndex].url;
    $("epMusicArtwork").src = "";
    $("epMusicArtwork").alt = "";
    paint();
    if (shouldPlay) audio.play().catch(() => {
      sub.textContent = "Toca reproducir para iniciar el audio.";
      updatePlayButton(false);
    });
    else updatePlayButton(false);
  }

  files.addEventListener("change", () => {
    const chosen = Array.from(files.files || []).filter(file =>
      file.type.startsWith("audio/") || /\.(mp3|m4a|aac|ogg|wav|flac)$/i.test(file.name)
    );
    if (!chosen.length) return;
    const start = localTracks.length;
    chosen.forEach(file => {
      const url = URL.createObjectURL(file);
      objectUrls.push(url);
      localTracks.push({ name: file.name.replace(/\.[^.]+$/, ""), url });
    });
    if (localIndex < 0 && activeSource !== "youtube") playLocalAt(start, false);
    paint();
    files.value = "";
  });

  playButton.addEventListener("click", async () => {
    if (activeSource === "youtube") {
      try {
        const player = await ensureYoutubePlayer();
        const state = player.getPlayerState();
        if (state === YT.PlayerState.PLAYING) player.pauseVideo();
        else player.playVideo();
      } catch (error) {
        sub.textContent = error.message;
      }
    } else if (activeSource === "local") {
      if (audio.paused) audio.play().catch(() => {});
      else audio.pause();
    } else if (localTracks.length) {
      playLocalAt(0);
    } else {
      files.click();
    }
  });

  $("epMusicPrev").addEventListener("click", () => {
    if (activeSource === "youtube" && youtubeTracks.length) playYoutubeAt(youtubeIndex - 1);
    else if (localTracks.length) playLocalAt(localIndex - 1);
  });
  $("epMusicNext").addEventListener("click", () => {
    if (activeSource === "youtube" && youtubeTracks.length) playYoutubeAt(youtubeIndex + 1);
    else if (localTracks.length) playLocalAt(localIndex + 1);
  });
  $("epMusicHide").addEventListener("click", () => {
    $("global-player").hidden = true;
    $("epMusicShow").hidden = false;
  });
  $("epMusicShow").addEventListener("click", () => {
    $("global-player").hidden = false;
    $("epMusicShow").hidden = true;
  });
  $("epMusicRepeat").addEventListener("click", () => {
    repeat = !repeat;
    audio.loop = repeat;
    $("epMusicRepeat").textContent = "↻ Repetir: " + (repeat ? "sí" : "no");
  });

  const searchForm = $("epMusicSearchForm");
  const searchInput = $("epMusicSearch");
  const searchResults = $("epMusicResults");
  const filter = $("epMusicFilter");

  function resultCard(item, index) {
    const row = document.createElement("div");
    row.className = "ep-music-result";
    const image = document.createElement("img");
    image.src = item.thumbnail || (item.videoId ? "https://i.ytimg.com/vi/" + encodeURIComponent(item.videoId) + "/hqdefault.jpg" : "");
    image.alt = "";
    image.loading = "lazy";
    image.width = 44;
    image.height = 44;
    const info = document.createElement("span");
    const name = document.createElement("strong");
    const detail = document.createElement("small");
    name.textContent = item.title || "Sin título";
    detail.textContent = [item.artist, item.duration].filter(Boolean).join(" · ") || "YouTube Music";
    info.append(name, detail);
    row.append(image, info);
    if (item.videoId) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "ep-music-play";
      button.textContent = "▶ Reproducir";
      button.addEventListener("click", () => {
        youtubeTracks = currentSearchResults.slice();
        youtubeIndex = index;
        window.playEntrePaginas(item.videoId, item.title, item);
      });
      row.append(button);
    }
    return row;
  }

  let currentSearchResults = [];
  async function searchYouTubeMusic(query) {
    searchResults.textContent = "Buscando...";
    const button = searchForm.querySelector('button[type="submit"]');
    button.disabled = true;
    try {
      const params = new URLSearchParams({ q: query, filter: filter?.value || "songs" });
      const response = await fetch("/.netlify/functions/youtube-search?" + params, { headers: { Accept: "application/json" } });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || data.error || "Error de búsqueda");
      currentSearchResults = data.results || [];
      searchResults.replaceChildren();
      if (!currentSearchResults.length) {
        searchResults.textContent = "No encontré resultados. Prueba otro título o artista.";
        return;
      }
      currentSearchResults.forEach((item, index) => searchResults.append(resultCard(item, index)));
    } catch (error) {
      searchResults.textContent = "No se pudo buscar: " + (error.message || "inténtalo más tarde.");
    } finally {
      button.disabled = false;
    }
  }

  searchForm.addEventListener("submit", event => {
    event.preventDefault();
    const query = searchInput.value.trim();
    if (query.length >= 2) searchYouTubeMusic(query);
  });

  seek.addEventListener("input", event => {
    const ratio = Number(event.target.value) / 1000;
    if (activeSource === "youtube" && ytPlayer?.getDuration) {
      const duration = ytPlayer.getDuration();
      if (duration) ytPlayer.seekTo(duration * ratio, true);
    } else if (Number.isFinite(audio.duration)) {
      audio.currentTime = audio.duration * ratio;
    }
  });

  audio.addEventListener("timeupdate", () => {
    if (activeSource !== "local" || !Number.isFinite(audio.duration)) return;
    seek.value = String(Math.round(audio.currentTime / audio.duration * 1000));
    currentLabel.textContent = fmt(audio.currentTime);
    durationLabel.textContent = fmt(audio.duration);
  });
  audio.addEventListener("play", () => updatePlayButton(true));
  audio.addEventListener("pause", () => { if (activeSource === "local") updatePlayButton(false); });
  audio.addEventListener("ended", () => {
    if (activeSource !== "local") return;
    if (!repeat && localTracks.length > 1) playLocalAt(localIndex + 1);
    else updatePlayButton(false);
  });

  progressTimer = window.setInterval(() => {
    if (activeSource !== "youtube" || !ytPlayer?.getCurrentTime) return;
    const duration = ytPlayer.getDuration();
    const current = ytPlayer.getCurrentTime();
    if (duration > 0) {
      seek.value = String(Math.round(current / duration * 1000));
      currentLabel.textContent = fmt(current);
      durationLabel.textContent = fmt(duration);
    }
  }, 500);

  // Carga la API oficial en segundo plano para que esté lista al primer toque.
  ensureYoutubePlayer().catch(error => console.warn(error.message));
  window.addEventListener("beforeunload", () => objectUrls.forEach(URL.revokeObjectURL));
  paint();
  updatePlayButton(false);
})();
