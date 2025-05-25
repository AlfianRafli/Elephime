document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const loadingScreen = document.getElementById('loading-screen');
    const body = document.body;
    const toggleBtn = document.getElementById('theme-toggle-button');
    const animeTitle = document.getElementById('title-text');
    const animeImage = document.querySelector('.anime-image');
    const metaGrid = document.querySelector('.meta-grid');
    const ratingText = document.querySelector('.rating span');
    const synopsisText = document.querySelector('.synopsis-text');
    const episodesList = document.querySelector('.episodes-list');
    const bookmarkButton = document.getElementById('bookmark-button');
    
    // Show loading screen
    loadingScreen.style.display = 'flex';

    // === Dark Mode Setup ===
    function initializeDarkMode() {
        const storedDarkMode = localStorage.getItem('darkMode') === 'true';
        document.body.classList.toggle('dark', storedDarkMode);
        toggleBtn.innerHTML = storedDarkMode 
            ? '<i class="fas fa-sun"></i>' 
            : '<i class="fas fa-moon"></i>';
    }

    toggleBtn.addEventListener('click', () => {
        const isDark = document.body.classList.toggle('dark');
        localStorage.setItem('darkMode', isDark);
        toggleBtn.innerHTML = isDark 
            ? '<i class="fas fa-sun"></i>' 
            : '<i class="fas fa-moon"></i>';
    });

    // Initialize dark mode
    initializeDarkMode();

    // === Bookmark Functions ===
    function initializeBookmarkButton(animeData) {
        const bookmarks = JSON.parse(localStorage.getItem('bookmarks')) || [];
        const isBookmarked = bookmarks.some(bookmark => 
            bookmark.url === animeData.url || bookmark.link === animeData.link
        );
        updateBookmarkButton(isBookmarked);
        
        bookmarkButton.addEventListener('click', () => {
            toggleBookmark(animeData, bookmarks);
        });
    }

    function updateBookmarkButton(isBookmarked) {
        if (isBookmarked) {
            bookmarkButton.innerHTML = '<i class="fas fa-bookmark"></i> <span>Bookmarked</span>';
            bookmarkButton.classList.add('bookmarked');
        } else {
            bookmarkButton.innerHTML = '<i class="far fa-bookmark"></i> <span>Bookmark</span>';
            bookmarkButton.classList.remove('bookmarked');
        }
    }

    function toggleBookmark(animeData, bookmarks) {
        const index = bookmarks.findIndex(bookmark => 
            bookmark.url === animeData.url || bookmark.link === animeData.link
        );
        
        if (index === -1) {
            bookmarks.push({
                title: animeData.title,
                img: animeData.img,
                url: animeData.url || animeData.link,
                addedAt: new Date().toISOString()
            });
            updateBookmarkButton(true);
        } else {
            bookmarks.splice(index, 1);
            updateBookmarkButton(false);
        }
        
        localStorage.setItem('bookmarks', JSON.stringify(bookmarks.slice(0, 100)));
    }

    // === Load Anime Data ===
    async function loadAnimeData() {
        try {
            const storage = JSON.parse(localStorage.getItem('selectedAnime'));
            const selectedUrl = storage?.link || storage?.url;
            const watched = JSON.parse(localStorage.getItem('watched')) || [];

            if (!selectedUrl) {
                throw new Error('No anime selected');
            }

            const response = await fetch(`/API/anime?url=${encodeURIComponent(selectedUrl)}`);
            if (!response.ok) throw new Error('Failed to fetch anime data');
            
            const data = await response.json();
            if (!data?.title) throw new Error('Invalid anime data');

            updateAnimeUI(data, storage, watched);
        } catch (error) {
            console.error('Error loading anime data:', error);
            showErrorState();
        } finally {
            loadingScreen.style.display = 'none';
        }
    }

    // Update Anime UI
    function updateAnimeUI(data, storage, watched) {
        animeTitle.textContent = data.title;

        if (storage?.img) {
            animeImage.style.backgroundImage = `url('${storage.img}')`;
        }

        ratingText.textContent = data.rating ? `${data.rating} / 10` : '-';

        metaGrid.innerHTML = '';
        const metaItems = [
            data.genres,
            `Episodes: ${data.totalEpisode || '-'}`,
            `Status: ${data.status || '-'}`,
            `Released: ${data.released || '-'}`,
            `Studio: ${data.studio || '-'}`,
            `Producer: ${data.produser || '-'}`
        ].flat().filter(Boolean);

        metaItems.forEach(text => {
            const item = document.createElement('div');
            item.className = 'meta-item';
            item.textContent = text;
            metaGrid.appendChild(item);
        });

        synopsisText.textContent = data.sinopsis || 'No synopsis available.';

        episodesList.innerHTML = '';
        if (data.episodes?.length) {
            data.episodes.forEach((ep, index) => {
                const epLink = document.createElement('a');
                epLink.href = '#';
                epLink.className = 'episode-link';
                if (watched.includes(ep.url)) {
                    epLink.classList.add('watched');
                }
                epLink.textContent = ep.episode || index + 1;
                epLink.setAttribute('aria-label', `Episode ${ep.episode || index + 1}`);
                
                epLink.addEventListener('click', (e) => {
                    e.preventDefault();
                    handleEpisodeClick(data, storage, ep, index);
                });
                
                episodesList.appendChild(epLink);
            });
        } else {
            episodesList.innerHTML = '<p>No episodes available</p>';
        }

        // Initialize bookmark button
        const animeData = {
            ...data,
            url: storage?.url || storage?.link,
            img: storage?.img
        };
        initializeBookmarkButton(animeData);
    }

    function handleEpisodeClick(data, storage, episode, index) {
        const animeData = {
            ...data,
            url: storage?.url || storage?.link,
            img: storage?.img
        };
        
        localStorage.setItem('detail_anime', JSON.stringify(animeData));
        localStorage.setItem('ClickedEpisode', episode.url);
        localStorage.setItem('listEpisode', JSON.stringify({
            current: index,
            listEpisodes: data.episodes
        }));

        window.location.href = '/watch';
    }

    function showErrorState() {
        animeTitle.textContent = 'Error Loading Anime';
        animeImage.style.background = 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))';
        animeImage.innerHTML = '<i class="fas fa-exclamation-triangle"></i>';
        
        metaGrid.innerHTML = '<div class="meta-item">Failed to load data</div>';
        synopsisText.textContent = 'We encountered an error while loading this anime. Please try again later.';
        episodesList.innerHTML = '<p>Episodes not available</p>';
    }

    loadAnimeData();
});