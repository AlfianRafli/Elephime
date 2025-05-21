(async () => {
    // DOM Elements
    const loadingScreen = document.getElementById("loading-screen");
    const body = document.body;
    const toggleBtn = document.getElementById("theme-toggle-button");
    const videoTitle = document.getElementById("title-text");
    const videoWrapper = document.getElementById("video-wrapper");
    const resButtons = document.getElementById("resolution-buttons");
    const serverButtons = document.getElementById("server-buttons");
    const dlLinks = document.getElementById("download-links");
    const prevBtn = document.getElementById("prev-episode");
    const nextBtn = document.getElementById("next-episode");

    // Show loading screen
    loadingScreen.style.display = "flex";

    // === Dark Mode Setup ===
    function initializeDarkMode() {
        const storedDarkMode = localStorage.getItem("darkMode") === "true";
        document.body.classList.toggle("dark", storedDarkMode);
        toggleBtn.innerHTML = storedDarkMode 
            ? '<i class="fas fa-sun"></i>' 
            : '<i class="fas fa-moon"></i>';
    }

    toggleBtn.addEventListener("click", () => {
        const isDark = document.body.classList.toggle("dark");
        localStorage.setItem("darkMode", isDark);
        toggleBtn.innerHTML = isDark 
            ? '<i class="fas fa-sun"></i>' 
            : '<i class="fas fa-moon"></i>';
    });

    // Initialize dark mode
    initializeDarkMode();

    // === Video Player Functions ===
    async function loadVideoData() {
        try {
            const url = localStorage.getItem("ClickedEpisode");
            const eps = JSON.parse(localStorage.getItem("listEpisode"));
            const detail = JSON.parse(localStorage.getItem("detail_anime"));
            
            if (!url || !eps) {
                throw new Error("Episode data not found");
            }

            // Set episode title
            const currentEp = eps.listEpisodes[eps.current];
            videoTitle.textContent = `${currentEp.episode} - ${detail.title || "Untitled"}`;

            // Fetch video data
            const res = await fetch("/API/getData", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ url: url })
            });
            
            if (!res.ok) throw new Error("Failed to fetch video data");
            
            const response = await res.json();
            const videoServers = response.servers;
            const downloadLinks = response.results;

            // Initialize video player
            let selectedResolution = Object.keys(videoServers)[0];
            let selectedServerIndex = 0;

            // Create button helper
            function createButton(label, onClick, active = false) {
                const btn = document.createElement("button");
                btn.textContent = label;
                btn.addEventListener("click", onClick);
                if (active) btn.classList.add("active");
                return btn;
            }

            // Switch video function
            async function switchVideo(res, index) {
                try {
                    loadingScreen.style.display = "flex";
                    const server = videoServers[res][index];
                    
                    // Fetch video iframe
                    const fetchRes = await fetch("/API/videos", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({ dataContent: server.dataContent })
                    });

                    const videos = await fetchRes.json();

                    if (!videos.iframe) {
                        throw new Error("Empty iframe from API");
                    }

                    // Update video player
                    videoWrapper.innerHTML = videos.iframe;
                    selectedResolution = res;
                    selectedServerIndex = index;
                    
                    // Update UI
                    renderServerButtons();
                    renderDownloadLinks();
                    updateActiveButtons();
                } catch (e) {
                    console.error("Failed to switch video:", e);
                    videoWrapper.innerHTML = `
                        <div class="video-placeholder">
                            <i class="fas fa-exclamation-triangle"></i>
                            <p>Failed to load video. Please try another server.</p>
                        </div>
                    `;
                } finally {
                    loadingScreen.style.display = "none";
                }
            }

            // Render resolution buttons
            function renderResolutionButtons() {
                resButtons.innerHTML = "";
                Object.keys(videoServers).forEach(res => {
                    const btn = createButton(
                        `${res}`, 
                        () => switchVideo(res, 0),
                        res === selectedResolution
                    );
                    btn.dataset.res = res;
                    resButtons.appendChild(btn);
                });
            }

            // Render server buttons
            function renderServerButtons() {
                serverButtons.innerHTML = "";
                videoServers[selectedResolution].forEach((server, idx) => {
                    const btn = createButton(
                        server.label,
                        () => switchVideo(selectedResolution, idx),
                        idx === selectedServerIndex
                    );
                    btn.dataset.idx = idx;
                    serverButtons.appendChild(btn);
                });
            }

            // Render download links
            function renderDownloadLinks() {
                dlLinks.innerHTML = "";
                (downloadLinks[selectedResolution] || []).forEach(link => {
                    const a = document.createElement("a");
                    a.href = link.link;
                    a.innerHTML = `<i class="fas fa-download"></i> ${link.source}`;
                    a.className = "download-link";
                    a.target = "_blank";
                    a.rel = "noopener noreferrer";
                    dlLinks.appendChild(a);
                });
            }

            // Update active buttons
            function updateActiveButtons() {
                resButtons.querySelectorAll("button").forEach(btn => {
                    btn.classList.toggle(
                        "active",
                        btn.dataset.res === selectedResolution
                    );
                });
                serverButtons.querySelectorAll("button").forEach(btn => {
                    btn.classList.toggle(
                        "active",
                        parseInt(btn.dataset.idx) === selectedServerIndex
                    );
                });
            }

            // Episode navigation
            prevBtn.addEventListener("click", () => {
                if (eps.current === 0) return;
                
                const prevEpisode = eps.listEpisodes[eps.current - 1];
                localStorage.setItem(
                    "listEpisode",
                    JSON.stringify({
                        current: eps.current - 1,
                        listEpisodes: eps.listEpisodes
                    })
                );
                localStorage.setItem("ClickedEpisode", prevEpisode.url);
                location.reload();
            });

            nextBtn.addEventListener("click", () => {
                if (eps.current >= eps.listEpisodes.length - 1) return;
                
                const nextEpisode = eps.listEpisodes[eps.current + 1];
                localStorage.setItem(
                    "listEpisode",
                    JSON.stringify({
                        current: eps.current + 1,
                        listEpisodes: eps.listEpisodes
                    })
                );
                localStorage.setItem("ClickedEpisode", nextEpisode.url);
                location.reload();
            });

            // Disable buttons if needed
            prevBtn.disabled = eps.current === 0;
            nextBtn.disabled = eps.current >= eps.listEpisodes.length - 1;

            // Initialize UI
            renderResolutionButtons();
            await switchVideo(selectedResolution, 0);

            // Update history
            updateWatchHistory();
        } catch (error) {
            console.error("Failed to load video data:", error);
            videoWrapper.innerHTML = `
                <div class="video-placeholder">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Failed to load episode data. Please try again.</p>
                </div>
            `;
        } finally {
            loadingScreen.style.display = "none";
        }
    }

    // Update watch history
    function updateWatchHistory() {
        const storage = JSON.parse(localStorage.getItem("detail_anime"));
        const ep = JSON.parse(localStorage.getItem("listEpisode"));
        const history = JSON.parse(localStorage.getItem("history")) || [];
        const watched = JSON.parse(localStorage.getItem("watched")) || [];

        if (!storage || !ep) return;

        const dataToSet = {
            url: storage.url,
            title: storage.title,
            img: storage.img,
            episode: ep.listEpisodes[ep.current].episode
        };

        // Check if already in history
        const existingIndex = history.findIndex(item => 
            item.url === dataToSet.url && 
            item.episode === dataToSet.episode
        );

        // Update history
        if (existingIndex >= 0) {
            history.splice(existingIndex, 1);
        }
        history.unshift(dataToSet);

        // Update watched episodes
        if (!watched.includes(ep.listEpisodes[ep.current].url)) {
            watched.push(ep.listEpisodes[ep.current].url);
        }

        // Save to localStorage (limit history to 50 items)
        localStorage.setItem("history", JSON.stringify(history.slice(0, 50)));
        localStorage.setItem("watched", JSON.stringify(watched));
    }

    // Initialize the page
    loadVideoData();
})();