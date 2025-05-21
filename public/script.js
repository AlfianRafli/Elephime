(async () => {
    // DOM Elements
    const animeListElem = document.getElementById("animeList");
    const historyList = document.getElementById("historyList");
    const darkModeToggle = document.getElementById("darkModeToggle");
    const searchInput = document.getElementById("searchInput");
    const genreSelect = document.getElementById("genreSelect");
    const navButtons = document.querySelectorAll(".nav-btn");
    const animeBoxes = document.querySelectorAll(".anime-box");
    const loader = document.getElementById("loading-screen");

    // State variables
    let currentPage = 1;
    let totalPages = 1;
    let currentGenre = "";
    let currentSearchQuery = "";

    // === Dark Mode Setup ===
    function initializeDarkMode() {
        const storedDarkMode = localStorage.getItem("darkMode") === "true";
        document.body.classList.toggle("dark", storedDarkMode);
        darkModeToggle.innerHTML = storedDarkMode
            ? '<i class="fas fa-sun"></i>'
            : '<i class="fas fa-moon"></i>';
    }

    darkModeToggle.addEventListener("click", () => {
        const isDark = document.body.classList.toggle("dark");
        localStorage.setItem("darkMode", isDark);
        darkModeToggle.innerHTML = isDark
            ? '<i class="fas fa-sun"></i>'
            : '<i class="fas fa-moon"></i>';
    });

    // === Navigation Tabs ===
    navButtons.forEach(button => {
        button.addEventListener("click", () => {
            // Update active state
            navButtons.forEach(btn => btn.classList.remove("active"));
            button.classList.add("active");

            // Show corresponding box
            const targetBox = button.dataset.section;
            animeBoxes.forEach(box => box.classList.remove("active"));
            document.getElementById(targetBox).classList.add("active");

            // If history tab is clicked, refresh history
            if (targetBox === "historyBox") {
                renderHistory();
            }
        });
    });

    // === Card Creator Function ===
    function createAnimeCard(
        title,
        episode,
        imageUrl,
        released,
        data,
        hideEpisode = false,
        hideReleased = false
    ) {
        const card = document.createElement("div");
        card.className = "anime-card";

        const imgWrapper = document.createElement("div");
        imgWrapper.className = "anime-image-wrapper";

        const img = document.createElement("img");
        img.className = "anime-image";
        img.alt = `${title} cover image`;
        img.src = imageUrl;
        img.loading = "lazy";

        const info = document.createElement("div");
        info.className = "anime-info";

        const animeTitle = document.createElement("h3");
        animeTitle.className = "anime-title";
        animeTitle.textContent = title;
        info.appendChild(animeTitle);

        // Add released information
        if (!hideReleased) {
            const animeReleased = document.createElement("p");
            animeReleased.className = "anime-released";
            animeReleased.textContent = `Released: ${released || "Unknown"}`;
            info.appendChild(animeReleased);
        }

        if (!hideEpisode) {
            const animeEpisode = document.createElement("p");
            animeEpisode.className = "anime-episode";
            animeEpisode.textContent = `Episode ${episode}`;
            info.appendChild(animeEpisode);
        }

        imgWrapper.appendChild(img);
        card.appendChild(imgWrapper);
        card.appendChild(info);

        card.addEventListener("click", () => {
            localStorage.setItem("selectedAnime", JSON.stringify(data));
            window.location.href = "/anime";
        });

        return card;
    }

    // === Render List Function ===
    function renderAnimeList(animeArray, hideEpisode = false, hideReleased = false) {
        animeListElem.innerHTML = "";

        if (!animeArray || !animeArray.length) {
            animeListElem.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-tv"></i>
                <p>No anime found</p>
            </div>
        `;
            return;
        }

        animeArray.forEach(anime => {
            const card = createAnimeCard(
                anime.title,
                anime.episode ?? null,
                anime.img ?? null,
                anime.released ?? null, // Tambahkan released
                anime,
                hideEpisode,
                hideReleased
            );
            animeListElem.appendChild(card);
        });
    }

    // === Pagination ===
    function renderPagination() {
        const pagination = document.getElementById("pagination");
        if (!pagination || totalPages <= 1) {
            pagination.innerHTML = "";
            return;
        }

        pagination.innerHTML = "";

        const maxVisibleButtons = 5;
        let startPage = Math.max(
            1,
            currentPage - Math.floor(maxVisibleButtons / 2)
        );
        let endPage = Math.min(totalPages, startPage + maxVisibleButtons - 1);

        // Adjust if we're at the end
        if (endPage - startPage + 1 < maxVisibleButtons) {
            startPage = Math.max(1, endPage - maxVisibleButtons + 1);
        }

        // Previous button
        if (currentPage > 1) {
            const prevBtn = document.createElement("button");
            prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
            prevBtn.addEventListener("click", () => {
                currentPage--;
                loadAnimeData();
            });
            pagination.appendChild(prevBtn);
        }

        // First page
        if (startPage > 1) {
            const firstBtn = document.createElement("button");
            firstBtn.textContent = "1";
            firstBtn.addEventListener("click", () => {
                currentPage = 1;
                loadAnimeData();
            });
            pagination.appendChild(firstBtn);

            if (startPage > 2) {
                const ellipsis = document.createElement("span");
                ellipsis.textContent = "...";
                ellipsis.className = "pagination-ellipsis";
                pagination.appendChild(ellipsis);
            }
        }

        // Page buttons
        for (let i = startPage; i <= endPage; i++) {
            const btn = document.createElement("button");
            btn.textContent = i;
            if (i === currentPage) btn.classList.add("active");
            btn.addEventListener("click", () => {
                currentPage = i;
                loadAnimeData();
            });
            pagination.appendChild(btn);
        }

        // Last page
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                const ellipsis = document.createElement("span");
                ellipsis.textContent = "...";
                ellipsis.className = "pagination-ellipsis";
                pagination.appendChild(ellipsis);
            }

            const lastBtn = document.createElement("button");
            lastBtn.textContent = totalPages;
            lastBtn.addEventListener("click", () => {
                currentPage = totalPages;
                loadAnimeData();
            });
            pagination.appendChild(lastBtn);
        }

        // Next button
        if (currentPage < totalPages) {
            const nextBtn = document.createElement("button");
            nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
            nextBtn.addEventListener("click", () => {
                currentPage++;
                loadAnimeData();
            });
            pagination.appendChild(nextBtn);
        }
    }

    // === Load Anime Data ===
    async function loadAnimeData() {
        showLoader();

        try {
            let url;
            if (currentSearchQuery.trim()) {
                url = `/API/search?q=${encodeURIComponent(currentSearchQuery)}`;
            } else if (currentGenre) {
                url = `/API/genre?genre=${encodeURIComponent(
                    currentGenre
                )}&page=${currentPage}`;
            } else {
                url = `/API/home?page=${currentPage}`;
            }

            const res = await fetch(url);
            if (!res.ok) throw new Error("Fetch error");

            const data = await res.json();

            // Handle empty home response
            if (
                currentPage > 1 &&
                !currentSearchQuery &&
                !currentGenre &&
                data.length === 0
            ) {
                currentPage = 1;
                await loadAnimeData();
                return;
            }

            // Handle different response structures
            if (data.results) {
                // Genre/search response
                renderAnimeList(data.results, true, true);
                totalPages = data.totalPages || 1;
                currentPage = data.currentPage || 1;
            } else {
                // Home response
                renderAnimeList(data);
                // Update total pages based on response
                totalPages = data.length > 0 ? currentPage + 1 : currentPage;
            }

            renderPagination();
        } catch (err) {
            console.error("Fetch error:", err);
            animeListElem.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Error loading anime</p>
            </div>
        `;
        } finally {
            hideLoader();
        }
    }

    // === Search Functionality ===
    let debounceTimeout;
    searchInput.addEventListener("input", e => {
        currentSearchQuery = e.target.value;
        currentGenre = "";
        currentPage = 1;
        clearTimeout(debounceTimeout);
        debounceTimeout = setTimeout(() => {
            loadAnimeData();
        }, 300);
    });

    // === Genre Filter ===
    genreSelect.addEventListener("change", () => {
        currentGenre = genreSelect.value;
        currentSearchQuery = "";
        currentPage = 1;
        loadAnimeData();
    });

    // === History Management ===
    function renderHistory(page = 1) {
        const history = JSON.parse(localStorage.getItem("history")) || [];
        const historyBox = document.getElementById("historyBox");
        const historyList = document.getElementById("historyList");

        if (!history.length) {
            historyList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-clock-rotate-left"></i>
                    <p>No watch history yet</p>
                </div>
            `;
            return;
        }

        historyList.innerHTML = "";

        const itemsPerPage = 10;
        const totalPages = Math.ceil(history.length / itemsPerPage);
        const startIdx = (page - 1) * itemsPerPage;
        const endIdx = startIdx + itemsPerPage;
        const pageItems = history.slice(startIdx, endIdx);

        pageItems.forEach(anime => {
            const card = createAnimeCard(
                anime.title,
                anime.episode,
                anime.img,
                undefined,
                anime,
                false,
                true
            );
            historyList.appendChild(card);
        });

        renderHistoryPagination(page, totalPages);
    }

    function renderHistoryPagination(currentPage, totalPages) {
        const pagination = document.getElementById("historyPagination");
        if (!pagination || totalPages <= 1) {
            pagination.innerHTML = "";
            return;
        }

        pagination.innerHTML = "";

        // Previous button
        if (currentPage > 1) {
            const prevBtn = document.createElement("button");
            prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
            prevBtn.addEventListener("click", () =>
                renderHistory(currentPage - 1)
            );
            pagination.appendChild(prevBtn);
        }

        // Current page indicator
        const pageInfo = document.createElement("span");
        pageInfo.className = "pagination-info";
        pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
        pagination.appendChild(pageInfo);

        // Next button
        if (currentPage < totalPages) {
            const nextBtn = document.createElement("button");
            nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
            nextBtn.addEventListener("click", () =>
                renderHistory(currentPage + 1)
            );
            pagination.appendChild(nextBtn);
        }
    }

    // === Loading State ===
    function showLoader() {
        loader.style.display = "flex";
    }

    function hideLoader() {
        loader.style.display = "none";
    }

    // === Initialize App ===
    initializeDarkMode();
    loadAnimeData();
    renderHistory();
})();
