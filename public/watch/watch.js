document.addEventListener("DOMContentLoaded", () => {
    // === STATE & CONSTANTS ===
    const state = {
        animeDetails: null,
        episodeList: null,
        currentEpisodeIndex: -1,
        watchedEpisodes: [],
        videoServers: {},
        downloadLinks: {},
        selectedResolution: "",
        selectedServerIndex: 0
    };

    const elements = {
        body: document.body,
        toggleBtn: document.getElementById("theme-toggle-button"),
        title: document.getElementById("title-text"),
        videoWrapper: document.getElementById("video-wrapper"),
        resButtons: document.getElementById("resolution-buttons"),
        serverButtons: document.getElementById("server-buttons"),
        dlLinks: document.getElementById("download-links"),
        prevBtn: document.getElementById("prev-episode"),
        nextBtn: document.getElementById("next-episode"),
        allEpisodesLink: document.getElementById("all-episodes-link")
    };

    // === SKELETON UI ===
    const showSkeleton = () => {
        elements.title.classList.add("skeleton", "skeleton-text");
        elements.videoWrapper.classList.add("skeleton");
        elements.videoWrapper.innerHTML = `<div class="video-placeholder"><i class="fas fa-spinner fa-spin"></i><p>Loading video...</p></div>`;

        const createSkeletonPlaceholders = (container, count) => {
            container.innerHTML = "";
            for (let i = 0; i < count; i++) {
                const skeletonBtn = document.createElement("div");
                skeletonBtn.className = "skeleton-button skeleton";
                container.appendChild(skeletonBtn);
            }
        };
        createSkeletonPlaceholders(elements.resButtons, 3);
        createSkeletonPlaceholders(elements.serverButtons, 4);
        createSkeletonPlaceholders(elements.dlLinks, 2);
    };

    const hideSkeleton = () => {
        elements.title.classList.remove("skeleton", "skeleton-text");
        elements.videoWrapper.classList.remove("skeleton");
        document
            .querySelectorAll(".skeleton-button")
            .forEach(el => el.remove());
    };

    // === UI RENDERING ===
    const renderControlButtons = () => {
        document
            .querySelectorAll(".skeleton-button")
            .forEach(el => el.remove());

        const createButton = (text, onClick, isActive) => {
            const btn = document.createElement("button");
            btn.textContent = text;
            if (isActive) btn.classList.add("active"); // Set kelas active di sini
            btn.addEventListener("click", onClick);
            return btn;
        };

        // Render Resolution Buttons
        const resFragment = document.createDocumentFragment();
        const resolutions = Object.keys(state.videoServers);
        if (resolutions.length > 0) {
            resolutions.forEach(res => {
                const btn = createButton(
                    res,
                    () => switchVideo(res, 0),
                    res === state.selectedResolution
                );
                resFragment.appendChild(btn);
            });
            elements.resButtons.replaceChildren(resFragment);
        } else {
            elements.resButtons.innerHTML =
                "<span>No qualities available.</span>";
        }

        // Render Server Buttons
        const serverFragment = document.createDocumentFragment();
        const currentServers = state.videoServers[state.selectedResolution];
        if (currentServers && currentServers.length > 0) {
            currentServers.forEach((server, idx) => {
                const btn = createButton(
                    server.label,
                    () => switchVideo(state.selectedResolution, idx),
                    idx === state.selectedServerIndex
                );
                serverFragment.appendChild(btn);
            });
            elements.serverButtons.replaceChildren(serverFragment);
        } else {
            elements.serverButtons.innerHTML =
                "<span>No servers available.</span>";
        }

        // Render Download Links
        const dlFragment = document.createDocumentFragment();
        const currentDownloads = state.downloadLinks[state.selectedResolution];
        if (currentDownloads && currentDownloads.length > 0) {
            currentDownloads.forEach(link => {
                const a = document.createElement("a");
                a.href = link.link;
                a.className = "download-link";
                a.target = "_blank";
                a.rel = "noopener noreferrer";
                a.innerHTML = `<i class="fas fa-download"></i> ${link.source}`;
                dlFragment.appendChild(a);
            });
            elements.dlLinks.replaceChildren(dlFragment);
        } else {
            elements.dlLinks.innerHTML = "<span>No download links.</span>";
        }
    };

    const updateNavButtonsState = () => {
        elements.prevBtn.disabled = state.currentEpisodeIndex <= 0;
        elements.nextBtn.disabled =
            state.currentEpisodeIndex >= state.episodeList.length - 1;
    };

    // === CORE LOGIC ===
    const switchVideo = async (resolution, serverIndex) => {
        // **KUNCI PERBAIKAN ADA DI SINI**
        // Jika resolusi berubah, reset server index ke 0
        if (state.selectedResolution !== resolution) {
            state.selectedServerIndex = 0;
        } else {
            state.selectedServerIndex = serverIndex;
        }
        state.selectedResolution = resolution;

        // Tampilkan loading HANYA di video player
        elements.videoWrapper.innerHTML = `<div class="video-placeholder"><i class="fas fa-spinner fa-spin"></i><p>Switching server...</p></div>`;
        // LANGSUNG RENDER ULANG TOMBOL agar status .active diperbarui SEKARANG
        renderControlButtons();

        try {
            const server =
                state.videoServers[resolution][state.selectedServerIndex];
            if (!server) throw new Error("Server not found");

            const response = await fetch("/API/videos", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ dataContent: server.dataContent })
            });

            if (!response.ok) throw new Error("Failed to fetch iframe");
            const video = await response.json();
            if (!video.iframe) throw new Error("Empty iframe from API");

            elements.videoWrapper.innerHTML = video.iframe;
        } catch (error) {
            console.error("Failed to switch video:", error);
            elements.videoWrapper.innerHTML = `<div class="video-placeholder"><i class="fas fa-exclamation-triangle"></i><p>Failed to load video. Try another server.</p></div>`;
        }
    };

    const loadEpisode = async episodeIndex => {
        showSkeleton();
        state.currentEpisodeIndex = episodeIndex;
        const currentEpisode = state.episodeList[episodeIndex];

        try {
            const response = await fetch("/API/getData", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url: currentEpisode.url })
            });
            if (!response.ok) throw new Error("Failed to fetch episode data");

            const data = await response.json();
            state.videoServers = data.servers || {};
            state.downloadLinks = data.results || {};

            elements.title.textContent = `${currentEpisode.episode} - ${state.animeDetails.title}`;
            document.title = `${currentEpisode.episode} - ${state.animeDetails.title} | Elephime`;

            hideSkeleton();
            updateNavButtonsState();

            const firstResolution = Object.keys(state.videoServers)[0] || "";
            // Panggil switchVideo yang sudah diperbaiki
            await switchVideo(firstResolution, 0);
            updateWatchHistory(currentEpisode);
        } catch (error) {
            console.error("Error loading episode:", error);
            elements.videoWrapper.innerHTML = `<div class="video-placeholder"><i class="fas fa-exclamation-triangle"></i><p>Failed to load episode data.</p></div>`;
            hideSkeleton();
            renderControlButtons();
        }
    };

    // === HISTORY & NAVIGATION ===
    const updateWatchHistory = currentEpisode => {
        let history = JSON.parse(localStorage.getItem("history")) || [];

        const dataToSet = {
            url: state.animeDetails.url,
            watchUrl: window.location.href,
            title: state.animeDetails.title,
            img: state.animeDetails.img,
            episode: currentEpisode.episode,
            lastWatched: Date.now()
        };

        const existingIndex = history.findIndex(
            item => item.title === dataToSet.title
        );

        if (existingIndex !== -1) {
            history.splice(existingIndex, 1);
        }

        history.unshift(dataToSet);

        localStorage.setItem("history", JSON.stringify(history.slice(0, 100)));

        if (!state.watchedEpisodes.includes(currentEpisode.url)) {
            state.watchedEpisodes.push(currentEpisode.url);
            localStorage.setItem(
                "watched",
                JSON.stringify(state.watchedEpisodes)
            );
        }
    };

    const navigateEpisode = direction => {
        const newIndex = state.currentEpisodeIndex + direction;
        if (newIndex >= 0 && newIndex < state.episodeList.length) {
            loadEpisode(newIndex);
        }
    };

    // === INITIALIZATION ===
    const initializeApp = () => {
        // Setup Dark Mode
        const isDark = localStorage.getItem("darkMode") === "true";
        elements.body.classList.toggle("dark", isDark);
        elements.toggleBtn.innerHTML = isDark
            ? '<i class="fas fa-sun"></i>'
            : '<i class="fas fa-moon"></i>';
        elements.toggleBtn.addEventListener("click", () => {
            const newIsDark = elements.body.classList.toggle("dark");
            localStorage.setItem("darkMode", newIsDark);
            elements.toggleBtn.innerHTML = newIsDark
                ? '<i class="fas fa-sun"></i>'
                : '<i class="fas fa-moon"></i>';
        });

        // Load data from localStorage
        state.animeDetails = JSON.parse(localStorage.getItem("detail_anime"));
        const episodeData = JSON.parse(localStorage.getItem("listEpisode"));
        state.watchedEpisodes =
            JSON.parse(localStorage.getItem("watched")) || [];

        if (
            !state.animeDetails ||
            !episodeData ||
            !episodeData.listEpisodes ||
            episodeData.listEpisodes.length === 0
        ) {
            elements.videoWrapper.innerHTML = `<div class="video-placeholder"><i class="fas fa-exclamation-triangle"></i><p>Anime data not found. Please select an episode first.</p></div>`;
            hideSkeleton();
            return;
        }

        state.episodeList = episodeData.listEpisodes;
        state.currentEpisodeIndex = episodeData.current;
        elements.allEpisodesLink.href = `/anime`;

        // Setup Event Listeners
        elements.prevBtn.addEventListener("click", () => navigateEpisode(-1));
        elements.nextBtn.addEventListener("click", () => navigateEpisode(1));

        // Initial Load
        loadEpisode(state.currentEpisodeIndex);
    };

    initializeApp();
});
