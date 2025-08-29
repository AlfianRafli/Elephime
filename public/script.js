// Menggunakan 'strict mode' untuk kode yang lebih aman
"use strict";

// Dibungkus dalam event listener untuk memastikan DOM siap
document.addEventListener("DOMContentLoaded", () => {
    // === DOM Elements ===
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
        SELECTED_ANIME: "selectedAnime"
    };
    const ITEMS_PER_PAGE = 12; // Untuk history & bookmark

    // === Utility Functions ===
    const showLoader = () => loader.classList.remove("hidden");
    const hideLoader = () => loader.classList.add("hidden");
    const getFromLocalStorage = (key, defaultValue = []) => JSON.parse(localStorage.getItem(key)) || defaultValue;

    // === Dark Mode Setup ===
    const initializeDarkMode = () => {
        const isDark = getFromLocalStorage(LOCAL_STORAGE_KEYS.DARK_MODE, false) === true;
        document.body.classList.toggle("dark", isDark);
        darkModeToggle.innerHTML = isDark ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
    };

    const toggleDarkMode = () => {
        const isDark = document.body.classList.toggle("dark");
        localStorage.setItem(LOCAL_STORAGE_KEYS.DARK_MODE, isDark);
        darkModeToggle.innerHTML = isDark ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
    };
    
    // === Navigation Tabs ===
    const handleNavClick = (e) => {
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

    // === Card Creator Function ===
    const createAnimeCard = (animeData) => {
        const { title, episode, img, released } = animeData;
        const card = document.createElement("div");
        card.className = "anime-card";

        const imgWrapper = document.createElement("div");
        imgWrapper.className = "anime-image-wrapper";

        const image = document.createElement("img");
        image.className = "anime-image";
        image.alt = title;
        image.src = img || 'assets/placeholder.png'; // Fallback image
        image.loading = "lazy";
        image.addEventListener('error', () => { image.src = 'assets/placeholder.png'; }); // Handle broken images

        const titleOverlay = document.createElement("div");
        titleOverlay.className = "anime-title-overlay";

        const animeTitle = document.createElement("h3");
        animeTitle.className = "anime-title";
        animeTitle.textContent = title;
        titleOverlay.appendChild(animeTitle);
        
        const info = document.createElement("div");
        info.className = "anime-info";

        if (released) {
            const animeReleased = document.createElement("p");
            animeReleased.className = "anime-released";
            animeReleased.textContent = `Released: ${released}`;
            info.appendChild(animeReleased);
        }

        if (episode) {
            const animeEpisode = document.createElement("p");
            animeEpisode.className = "anime-episode";
            animeEpisode.textContent = `Episode ${episode}`;
            info.appendChild(animeEpisode);
        }
        
        imgWrapper.append(image, titleOverlay);
        card.append(imgWrapper, info);
        
        card.addEventListener("click", () => {
            localStorage.setItem(LOCAL_STORAGE_KEYS.SELECTED_ANIME, JSON.stringify(animeData));
            window.location.href = "/anime";
        });

        return card;
    };

    // === Generic List Renderer ===
    const renderList = (element, items, emptyState) => {
        element.innerHTML = ""; // Clear previous items
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

    // === Generic Pagination Renderer (REFACTORED) ===
    const renderPagination = (container, currentPage, totalPages, onPageClick) => {
        if (totalPages <= 1) {
            container.innerHTML = "";
            return;
        }

        const createButton = (content, page) => {
            const btn = document.createElement("button");
            btn.innerHTML = content;
            if (page) {
                btn.addEventListener("click", () => onPageClick(page));
            }
            return btn;
        };
        
        const fragment = document.createDocumentFragment();

        // Prev button
        const prevBtn = createButton('<i class="fas fa-chevron-left"></i>', currentPage - 1);
        if (currentPage === 1) prevBtn.disabled = true;
        fragment.appendChild(prevBtn);

        // Page info (simple version for history/bookmarks)
        if (onPageClick.name.includes("renderStoredItems")) {
            const pageInfo = document.createElement("span");
            pageInfo.className = "pagination-info";
            pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
            fragment.appendChild(pageInfo);
        }
        // ... (can add complex pagination logic for main list here if needed)

        // Next button
        const nextBtn = createButton('<i class="fas fa-chevron-right"></i>', currentPage + 1);
        if (currentPage >= totalPages) nextBtn.disabled = true;
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
                url = `/API/genre?genre=${encodeURIComponent(currentGenre)}&page=${currentPage}`;
            } else {
                url = `/API/home?page=${currentPage}`;
            }

            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
            
            const data = await res.json();
            
            const results = data.results || data;
            renderList(animeListElem, results, { icon: 'fa-tv', message: 'No anime found' });
            
            totalPages = data.totalPages || (results.length > 0 ? currentPage + 1 : currentPage);
            // Main pagination logic can be expanded here if needed
            
        } catch (err) {
            console.error("Fetch error:", err);
            renderList(animeListElem, [], { icon: 'fa-exclamation-triangle', message: 'Error loading anime' });
        } finally {
            hideLoader();
        }
    }

    // === Render Stored Items (History/Bookmark - REFACTORED) ===
    const renderStoredItems = (type, page = 1) => {
        const key = type === 'history' ? LOCAL_STORAGE_KEYS.HISTORY : LOCAL_STORAGE_KEYS.BOOKMARKS;
        const items = getFromLocalStorage(key);

        const container = type === 'history' ? historyListElem : bookmarkListElem;
        const paginationContainer = document.getElementById(type === 'history' ? 'historyPagination' : 'bookmarkPagination');

        const totalItems = items.length;
        if (totalItems === 0) {
            const emptyState = type === 'history'
                ? { icon: 'fa-clock-rotate-left', message: 'No watch history yet' }
                : { icon: 'fa-bookmark', message: "You don't have any bookmarks" };
            renderList(container, [], emptyState);
            paginationContainer.innerHTML = "";
            return;
        }
        
        const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
        const startIdx = (page - 1) * ITEMS_PER_PAGE;
        const pageItems = items.slice(startIdx, startIdx + ITEMS_PER_PAGE);

        renderList(container, pageItems, {});
        renderPagination(paginationContainer, page, totalPages, (newPage) => renderStoredItems(type, newPage));
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
        debounceTimeout = setTimeout(loadAnimeData, 300);
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
        // Hide loader initially with JS to avoid flash of content
        document.body.style.overflow = 'hidden'; // Prevent scrolling while loading
        setTimeout(() => {
            hideLoader();
            document.body.style.overflow = '';
        }, 500); // Give a minimum show time for the loader
    };

    initializeApp();
});