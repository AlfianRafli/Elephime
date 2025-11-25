"use strict";

document.addEventListener("DOMContentLoaded", () => {
    const animeListElem = document.getElementById("animeList");
    const historyListElem = document.getElementById("historyList");
    const bookmarkListElem = document.getElementById("bookmarkList");
    const darkModeToggle = document.getElementById("darkModeToggle");
    const refreshButton = document.getElementById("refreshButton");
    const searchInput = document.getElementById("searchInput");
    const genreSelect = document.getElementById("genreSelect");
    const navLinks = document.querySelectorAll(".nav-link");
    const animeBoxes = document.querySelectorAll(".anime-box");
    const loader = document.getElementById("loading-screen");

    // === State variables ===
    let currentPage = 1;
    let totalPages = 1;
    let currentGenre = "";
    let currentSearchQuery = "";
    let debounceTimeout;

    // === Constants ===
    const LOCAL_STORAGE_KEYS = {
        DARK_MODE: "darkMode",
        HISTORY: "history",
        BOOKMARKS: "bookmarks",
        SELECTED_ANIME: "selectedAnime",
        WATCHED: "watched"
    };
    const ITEMS_PER_PAGE = 12;

    // === Utility Functions ===
    const showLoader = () => loader.classList.remove("hidden");
    const hideLoader = () => loader.classList.add("hidden");
    const getFromLocalStorage = (key, defaultValue = []) =>
        JSON.parse(localStorage.getItem(key)) || defaultValue;

    const timeAgo = dateTimestamp => {
        if (!dateTimestamp) return "";
        const seconds = Math.floor((Date.now() - dateTimestamp) / 1000);

        let interval = seconds / 31536000;
        if (interval > 1) return Math.floor(interval) + " years ago";
        interval = seconds / 2592000;
        if (interval > 1) return Math.floor(interval) + " months ago";
        interval = seconds / 86400;
        if (interval > 1) return Math.floor(interval) + " days ago";
        interval = seconds / 3600;
        if (interval > 1) return Math.floor(interval) + " hours ago";
        interval = seconds / 60;
        if (interval > 1) return Math.floor(interval) + " minutes ago";

        return "Just now";
    };

    // === Dark Mode Setup ===
    const initializeDarkMode = () => {
        const isDark =
            getFromLocalStorage(LOCAL_STORAGE_KEYS.DARK_MODE, false) === true;
        document.body.classList.toggle("dark", isDark);
        darkModeToggle.innerHTML = isDark
            ? '<i class="fas fa-sun"></i>'
            : '<i class="fas fa-moon"></i>';
    };

    const toggleDarkMode = () => {
        const isDark = document.body.classList.toggle("dark");
        localStorage.setItem(LOCAL_STORAGE_KEYS.DARK_MODE, isDark);
        darkModeToggle.innerHTML = isDark
            ? '<i class="fas fa-sun"></i>'
            : '<i class="fas fa-moon"></i>';
    };

    // === Navigation Tabs ===
    const handleNavClick = e => {
        e.preventDefault();
        const clickedLink = e.currentTarget;

        navLinks.forEach(link => link.classList.remove("active"));
        clickedLink.classList.add("active");

        const targetBoxId = clickedLink.dataset.section;
        animeBoxes.forEach(box => box.classList.remove("active"));
        document.getElementById(targetBoxId).classList.add("active");

        switch (targetBoxId) {
            case "historyBox":
                renderStoredItems("history");
                break;
            case "bookmarkBox":
                renderStoredItems("bookmarks");
                break;
        }
    };

    // === Card Creator Function (UPDATED) ===
    const createAnimeCard = animeData => {
        const { title, episode, img, released, lastWatched } = animeData;
        const card = document.createElement("div");
        card.className = "anime-card";

        // --- Image Container ---
        const imgWrapper = document.createElement("div");
        imgWrapper.className = "anime-image-wrapper";

        const image = document.createElement("img");
        image.className = "anime-image";
        image.alt = title;
        image.src = img
            ? `/API/proxy-image?url=${encodeURIComponent(img)}`
            : "assets/placeholder.png";
        image.loading = "lazy";
        image.addEventListener("error", () => {
            image.src = "assets/placeholder.png";
        });

        if (lastWatched) {
            const deleteBtn = document.createElement("button");
            deleteBtn.innerHTML = '<i class="fas fa-trash-alt"></i>';
            Object.assign(deleteBtn.style, {
                position: "absolute",
                top: "8px",
                right: "8px",
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                border: "none",
                cursor: "pointer",
                zIndex: "10",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "rgba(0, 0, 0, 0.6)",
                color: "#ff4757",
                backdropFilter: "blur(4px)",
                transition: "all 0.2s ease",
                fontSize: "0.9rem"
            });

            // Efek Hover
            deleteBtn.onmouseenter = () => {
                deleteBtn.style.backgroundColor = "#ff4757";
                deleteBtn.style.color = "white";
            };
            deleteBtn.onmouseleave = () => {
                deleteBtn.style.backgroundColor = "rgba(0, 0, 0, 0.6)";
                deleteBtn.style.color = "#ff4757";
            };

            deleteBtn.addEventListener("click", e => {
                e.stopPropagation(); 
                if (confirm(`Delete "${title}" from history?`)) {
                    let history = getFromLocalStorage(
                        LOCAL_STORAGE_KEYS.HISTORY
                    );
                    history = history.filter(item => item.title !== title
                    );
                    localStorage.setItem(
                        LOCAL_STORAGE_KEYS.HISTORY,
                        JSON.stringify(history)
                    );

                    card.style.transition = "all 0.3s ease";
                    card.style.transform = "scale(0.8)";
                    card.style.opacity = "0";
                    setTimeout(() => card.remove(), 300);
                }
            });

            imgWrapper.appendChild(deleteBtn);
        }
        else {
            const history = getFromLocalStorage(LOCAL_STORAGE_KEYS.HISTORY);
            const historyItem = history.find(h => h.title === title);
            if (historyItem) {
                const badge = document.createElement("div");
                badge.innerHTML = `<i class="fas fa-history"></i> Ep ${historyItem.episode}`;
                Object.assign(badge.style, {
                    position: "absolute",
                    top: "8px",
                    right: "8px",
                    backgroundColor: "rgba(255, 71, 87, 0.9)",
                    color: "white",
                    padding: "4px 8px",
                    borderRadius: "4px",
                    fontSize: "0.75rem",
                    fontWeight: "600",
                    zIndex: "2",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.2)"
                });
                imgWrapper.appendChild(badge);
            }
        }

        const titleOverlay = document.createElement("div");
        titleOverlay.className = "anime-title-overlay";
        const animeTitle = document.createElement("h3");
        animeTitle.className = "anime-title";
        animeTitle.textContent = title;
        titleOverlay.appendChild(animeTitle);

        imgWrapper.append(image, titleOverlay);

        const info = document.createElement("div");
        info.className = "anime-info";

        if (lastWatched) {
            const historyInfoContainer = document.createElement("div");
            Object.assign(historyInfoContainer.style, {
                display: "flex",
                flexDirection: "column",
                gap: "4px", 
                marginTop: "auto"
            });

            const timeRow = document.createElement("div");
            timeRow.innerHTML = `<i class="fas fa-clock" style="font-size: 0.85em;"></i> ${timeAgo(
                lastWatched
            )}`;
            Object.assign(timeRow.style, {
                display: "flex",
                alignItems: "center",
                gap: "6px",
                color: "var(--color-primary)",
                fontWeight: "600",
                fontSize: "0.85rem"
            });
            const epRow = document.createElement("div");
            epRow.innerHTML = `Watched: <span style="font-weight:700; font-size: 1rem;">Ep ${episode}</span>`;
            Object.assign(epRow.style, {
                fontSize: "0.9rem",
                opacity: "0.9"
            });

            historyInfoContainer.append(timeRow, epRow);
            info.appendChild(historyInfoContainer);
        } else {
            if (released) {
                const animeReleased = document.createElement("p");
                animeReleased.className = "anime-released";
                animeReleased.textContent = released;
                info.appendChild(animeReleased);
            }

            if (episode) {
                const animeEpisode = document.createElement("p");
                animeEpisode.className = "anime-episode";
                animeEpisode.textContent = `Episode ${episode}`;
                info.appendChild(animeEpisode);
            }
        }

        card.append(imgWrapper, info);

        card.addEventListener("click", () => {
            localStorage.setItem(
                LOCAL_STORAGE_KEYS.SELECTED_ANIME,
                JSON.stringify(animeData)
            );
            window.location.href = "/anime";
        });

        return card;
    };

    // === Generic List Renderer ===
    const renderList = (element, items, emptyState) => {
        element.innerHTML = "";
        if (!items || items.length === 0) {
            element.innerHTML = `
                <div class="empty-state">
                    <i class="fas ${emptyState.icon}"></i>
                    <p>${emptyState.message}</p>
                </div>`;
            return;
        }
        const fragment = document.createDocumentFragment();
        items.forEach(item => fragment.appendChild(createAnimeCard(item)));
        element.appendChild(fragment);
    };

    // === Pagination Renderer ===
    const renderPagination = (
        container,
        currentPage,
        totalPages,
        onPageClick
    ) => {
        if (totalPages <= 1) {
            container.innerHTML = "";
            return;
        }

        const createButton = (content, page) => {
            const btn = document.createElement("button");
            btn.innerHTML = content;
            if (page) btn.addEventListener("click", () => onPageClick(page));
            return btn;
        };

        const fragment = document.createDocumentFragment();
        const prevBtn = createButton(
            '<i class="fas fa-chevron-left"></i>',
            currentPage - 1
        );
        if (currentPage === 1) prevBtn.disabled = true;
        fragment.appendChild(prevBtn);

        const pageInfo = document.createElement("span");
        pageInfo.className = "pagination-info";
        pageInfo.textContent = `Page ${currentPage}`;
        if (totalPages) pageInfo.textContent += ` of ${totalPages}`;
        fragment.appendChild(pageInfo);

        const nextBtn = createButton(
            '<i class="fas fa-chevron-right"></i>',
            currentPage + 1
        );
        if (totalPages && currentPage >= totalPages) nextBtn.disabled = true;

        fragment.appendChild(nextBtn);
        container.replaceChildren(fragment);
    };

    // === Load & Render API Data ===
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
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

            const data = await res.json();
            const results = data.results || data;
            totalPages =
                data.totalPages ||
                (results.length > 0 ? currentPage + 1 : currentPage);

            renderList(animeListElem, results, {
                icon: "fa-tv",
                message: "No anime found"
            });

            renderPagination(
                document.getElementById("pagination"),
                currentPage,
                totalPages,
                newPage => {
                    currentPage = newPage;
                    loadAnimeData();
                    document
                        .getElementById("animeBox")
                        .scrollIntoView({ behavior: "smooth" });
                }
            );
        } catch (err) {
            console.error("Fetch error:", err);
            renderList(animeListElem, [], {
                icon: "fa-exclamation-triangle",
                message: "Error loading anime"
            });
        } finally {
            hideLoader();
        }
    }

    // === Render Stored Items ===
    const renderStoredItems = (type, page = 1) => {
        const key =
            type === "history"
                ? LOCAL_STORAGE_KEYS.HISTORY
                : LOCAL_STORAGE_KEYS.BOOKMARKS;
        const items = getFromLocalStorage(key);

        const container =
            type === "history" ? historyListElem : bookmarkListElem;
        const paginationContainer = document.getElementById(
            type === "history" ? "historyPagination" : "bookmarkPagination"
        );

        const totalItems = items.length;
        if (totalItems === 0) {
            const emptyState =
                type === "history"
                    ? {
                          icon: "fa-clock-rotate-left",
                          message: "No watch history yet"
                      }
                    : {
                          icon: "fa-bookmark",
                          message: "You don't have any bookmarks"
                      };
            renderList(container, [], emptyState);
            paginationContainer.innerHTML = "";
            return;
        }

        const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
        const startIdx = (page - 1) * ITEMS_PER_PAGE;
        const pageItems = items.slice(startIdx, startIdx + ITEMS_PER_PAGE);

        renderList(container, pageItems, {});
        renderPagination(paginationContainer, page, totalPages, newPage =>
            renderStoredItems(type, newPage)
        );
    };

    // === Event Listeners Setup ===
    darkModeToggle.addEventListener("click", toggleDarkMode);
    refreshButton.addEventListener("click", () => location.reload());
    navLinks.forEach(link => link.addEventListener("click", handleNavClick));

    searchInput.addEventListener("input", e => {
        currentSearchQuery = e.target.value;
        currentGenre = "";
        genreSelect.value = "";
        currentPage = 1;
        clearTimeout(debounceTimeout);
        debounceTimeout = setTimeout(loadAnimeData, 500);
    });

    genreSelect.addEventListener("change", () => {
        currentGenre = genreSelect.value;
        currentSearchQuery = "";
        searchInput.value = "";
        currentPage = 1;
        loadAnimeData();
    });

    // === Initialize App ===
    const initializeApp = () => {
        initializeDarkMode();
        loadAnimeData();
        document.body.style.overflow = "hidden";
        setTimeout(() => {
            hideLoader();
            document.body.style.overflow = "";
        }, 500);
    };

    initializeApp();
});
