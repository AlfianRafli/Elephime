// Using 'strict mode' for safer code
"use strict";

document.addEventListener("DOMContentLoaded", () => {
    // === DOM Elements ===
    const elements = {
        body: document.body,
        toggleBtn: document.getElementById("theme-toggle-button"),
        title: document.getElementById("title-text"),
        image: document.querySelector(".anime-image"),
        metaGrid: document.querySelector(".meta-grid"),
        rating: document.getElementById("rating-text"),
        synopsis: document.querySelector(".synopsis-text"),
        episodesList: document.querySelector(".episodes-list"),
        bookmarkButton: document.getElementById("bookmark-button"),
        actionButtonsContainer: document.querySelector(".action-buttons"),
        commentsContainer: document.getElementById("comments-container")
    };

    const SKELETON_CLASSES = ".skeleton, .skeleton-text";

    // === English Utility: Time Ago ===
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
        if (interval > 1) return Math.floor(interval) + " mins ago";

        return "Just now";
    };

    // === Skeleton UI Functions ===
    const showSkeleton = () => {
        elements.title.textContent = "";
        elements.rating.textContent = "";
        elements.synopsis.textContent = "";

        const createSkeletons = (count, className) =>
            Array(count)
                .fill()
                .map(() => {
                    const el = document.createElement("div");
                    el.className = `${className} skeleton`;
                    return el;
                });

        elements.metaGrid.replaceChildren(...createSkeletons(6, "meta-item"));
        elements.episodesList.replaceChildren(
            ...createSkeletons(12, "episode-link")
        );
        document
            .querySelectorAll('[id*="-text"], .anime-image, .bookmark-btn')
            .forEach(el => el.classList.add("skeleton"));
    };

    const hideSkeleton = () => {
        document
            .querySelectorAll(SKELETON_CLASSES)
            .forEach(el => el.classList.remove("skeleton", "skeleton-text"));
    };

    // === Dark Mode ===
    const setupDarkMode = () => {
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
    };

    // === Share Button Feature ===
    const addShareButton = (title, url) => {
        // Prevent duplicate button
        if (document.getElementById("share-btn")) return;

        const shareBtn = document.createElement("button");
        shareBtn.id = "share-btn";
        shareBtn.className = "share-btn";
        shareBtn.innerHTML =
            '<i class="fas fa-share-alt"></i> <span>Share</span>';

        shareBtn.addEventListener("click", async () => {
            try {
                // Construct a shareable URL (assuming user opens via home, but works if we had dynamic routing)
                // For now, we copy the current URL
                await navigator.clipboard.writeText(window.location.href);

                const originalText = shareBtn.innerHTML;
                shareBtn.innerHTML =
                    '<i class="fas fa-check"></i> <span>Copied!</span>';
                setTimeout(() => (shareBtn.innerHTML = originalText), 2000);
            } catch (err) {
                console.error("Failed to copy", err);
                alert("Failed to copy URL");
            }
        });

        // Insert before bookmark button
        elements.actionButtonsContainer.insertBefore(
            shareBtn,
            elements.bookmarkButton
        );
    };

    // === UI Rendering Functions ===
    const renderMetaGrid = data => {
        const fragment = document.createDocumentFragment();

        // Helper to format English Labels
        // API often returns keys like "produser", "status" in Indonesian. We map or format them.
        const createMetaItem = (label, value) => {
            if (!value) return null;
            const item = document.createElement("div");
            item.className = "meta-item";
            item.innerHTML = `<strong>${label}:</strong> ${value}`;
            return item;
        };

        const items = [
            ...(data.genres || []).map(
                g => `<span class="genre-tag">${g}</span>`
            ),
            createMetaItem("Episodes", data.totalEpisode),
            createMetaItem("Status", data.status), // Content might still be ID, but label is EN
            createMetaItem("Released", data.released),
            createMetaItem("Studio", data.studio),
            createMetaItem("Duration", data.duration)
        ].filter(Boolean);

        items.forEach(item => {
            if (typeof item === "string") {
                const div = document.createElement("div");
                div.className = "meta-item";
                div.innerHTML = item;
                fragment.appendChild(div);
            } else {
                fragment.appendChild(item);
            }
        });

        elements.metaGrid.replaceChildren(fragment);
    };

    const renderEpisodes = (data, watched) => {
        if (!data.episodes?.length) {
            elements.episodesList.innerHTML =
                "<p>No episodes available yet.</p>";
            return;
        }

        const fragment = document.createDocumentFragment();
        data.episodes.forEach((ep, index) => {
            const epLink = document.createElement("a");
            epLink.href = "/watch";
            epLink.className = "episode-link";
            if (watched.includes(ep.url)) epLink.classList.add("watched");

            // Format "Episode 1" to "1" or keep "OVA"
            const epNum = ep.episode.replace(/episode/i, "").trim();
            epLink.textContent = epNum || index + 1;
            epLink.title = `Watch Episode ${ep.episode}`;

            epLink.addEventListener("click", e => {
                e.preventDefault();
                localStorage.setItem("ClickedEpisode", ep.url);
                localStorage.setItem(
                    "listEpisode",
                    JSON.stringify({
                        current: index,
                        listEpisodes: data.episodes
                    })
                );
                window.location.href = epLink.href;
            });
            fragment.appendChild(epLink);
        });
        elements.episodesList.replaceChildren(fragment);
    };

    // === Bookmark Logic ===
    const setupBookmarkButton = animeData => {
        const bookmarks = JSON.parse(localStorage.getItem("bookmarks")) || [];
        let isBookmarked = bookmarks.some(b => b.url === animeData.url);

        const updateButtonState = () => {
            if (isBookmarked) {
                elements.bookmarkButton.innerHTML =
                    '<i class="fas fa-bookmark"></i> <span>Saved</span>';
                elements.bookmarkButton.classList.add("bookmarked");
            } else {
                elements.bookmarkButton.innerHTML =
                    '<i class="far fa-bookmark"></i> <span>Bookmark</span>';
                elements.bookmarkButton.classList.remove("bookmarked");
            }
        };

        elements.bookmarkButton.onclick = () => {
            // Use onclick to prevent multiple listeners
            const currentBookmarks =
                JSON.parse(localStorage.getItem("bookmarks")) || [];
            const index = currentBookmarks.findIndex(
                b => b.url === animeData.url
            );

            if (index === -1) {
                currentBookmarks.unshift({
                    title: animeData.title,
                    img: animeData.img,
                    url: animeData.url
                });
            } else {
                currentBookmarks.splice(index, 1);
            }
            localStorage.setItem(
                "bookmarks",
                JSON.stringify(currentBookmarks.slice(0, 100))
            );
            isBookmarked = !isBookmarked;
            updateButtonState();
        };

        updateButtonState();
    };

    // === Comment Section Logic (Using Disqus - Online & Public) ===
    const renderCommentSection = async (animeUrl, title, id) => {
        elements.commentsContainer.innerHTML = `
            <div class="comments-header">
                <h2><i class="fas fa-comments"></i> Discussion</h2>
            </div>
            <div id="disqus_thread"></div>
            <noscript>Please enable JavaScript to view the <a href="https://disqus.com/?ref_noscript">comments powered by Disqus.</a></noscript>
        `;

        const res = await fetch("/API/settings");
        const settings = await res.json();
        const disqus_shortname = settings.disqusShortname;

        if (window.DISQUS) {
            window.DISQUS.reset({
                reload: true,
                config: function () {
                    this.page.url = window.location.href;
                    this.page.identifier = animeUrl;
                    this.page.title = title;
                }
            });
        } else {
            window.disqus_config = function () {
                this.page.url = window.location.href;
                this.page.identifier = animeUrl;
                this.page.title = title;
            };

            (function () {
                var d = document,
                    s = d.createElement("script");
                s.src = `https://${disqus_shortname}.disqus.com/embed.js`;
                s.setAttribute("data-timestamp", +new Date());
                (d.head || d.body).appendChild(s);
            })();
        }
    };

    // === Main Data Loading Function ===
    const loadAnimeData = async () => {
        showSkeleton();
        try {
            const storage = JSON.parse(localStorage.getItem("selectedAnime"));
            const selectedUrl = storage?.link || storage?.url;
            if (!selectedUrl)
                throw new Error("No anime selected. Redirecting...");

            // Fetch Data
            const [animeResponse, watchedResponse] = await Promise.all([
                fetch(`/API/anime?url=${encodeURIComponent(selectedUrl)}`),
                Promise.resolve(
                    JSON.parse(localStorage.getItem("watched")) || []
                )
            ]);

            if (!animeResponse.ok)
                throw new Error("Failed to fetch anime data");
            const data = await animeResponse.json();
            if (!data?.title) throw new Error("Invalid anime data received");

            // Save Detail for Watch Page
            // Use Image Proxy for stored data to prevent broken images later
            const proxyImg = storage?.img
                ? `/API/proxy-image?url=${encodeURIComponent(storage.img)}`
                : "assets/placeholder.png";

            localStorage.setItem(
                "detail_anime",
                JSON.stringify({ ...data, img: proxyImg, url: selectedUrl })
            );

            // --- Populate UI ---
            elements.title.textContent = data.title;

            // Image handling with Proxy logic
            const imgUrl = storage.img || data.img;
            elements.image.style.backgroundImage = `url('${
                imgUrl
                    ? `/API/proxy-image?url=${encodeURIComponent(imgUrl)}`
                    : "assets/placeholder.png"
            }')`;

            elements.rating.textContent = data.rating
                ? `${data.rating} / 10`
                : "N/A";
            elements.synopsis.textContent =
                data.sinopsis || "No synopsis available for this title.";

            renderMetaGrid(data);
            renderEpisodes(data, watchedResponse);
            setupBookmarkButton({
                title: data.title,
                img: imgUrl,
                url: selectedUrl
            });
            addShareButton(data.title, selectedUrl);

            // Initialize Comments (Disqus)
            if (elements.commentsContainer) {
                // Pass URL, Title, dan ID unik (URL anime)
                renderCommentSection(selectedUrl, data.title, selectedUrl);
            }
        } catch (error) {
            console.error("Error loading anime data:", error);
            elements.synopsis.innerHTML = `<span style="color:var(--color-primary)">Error: ${error.message}</span>`;
            // Optional: setTimeout(() => window.location.href = '/', 3000);
        } finally {
            hideSkeleton();
        }
    };

    // === Initialize App ===
    setupDarkMode();
    loadAnimeData();
});
