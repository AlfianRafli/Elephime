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

    // === Load Anime Data ===
    async function loadAnimeData() {
        try {
            const storage = JSON.parse(localStorage.getItem('selectedAnime'));
            const selectedUrl = storage?.link || storage?.url;
            const watched = JSON.parse(localStorage.getItem('watched')) || [];

            if (!selectedUrl) {
                throw new Error('No anime selected');
            }

            // Fetch anime data
            const response = await fetch(`/API/anime?url=${encodeURIComponent(selectedUrl)}`);
            if (!response.ok) throw new Error('Failed to fetch anime data');
            
            const data = await response.json();
            if (!data?.title) throw new Error('Invalid anime data');

            // Update UI
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
        // Set title
        animeTitle.textContent = data.title;

        // Set image
        if (storage?.img) {
            animeImage.style.backgroundImage = `url('${storage.img}')`;
        }

        // Set rating
        ratingText.textContent = data.rating ? `${data.rating} / 10` : '-';

        // Set meta info
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

        // Set synopsis
        synopsisText.textContent = data.sinopsis || 'No synopsis available.';

        // Set episodes
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
    }

    // Handle episode click
    function handleEpisodeClick(data, storage, episode, index) {
        // Save data for watch page
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

        // Navigate to watch page
        window.location.href = '/watch';
    }

    // Show error state
    function showErrorState() {
        animeTitle.textContent = 'Error Loading Anime';
        animeImage.style.background = 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))';
        animeImage.innerHTML = '<i class="fas fa-exclamation-triangle"></i>';
        
        metaGrid.innerHTML = '<div class="meta-item">Failed to load data</div>';
        synopsisText.textContent = 'We encountered an error while loading this anime. Please try again later.';
        episodesList.innerHTML = '<p>Episodes not available</p>';
    }

    // Initialize the page
    loadAnimeData();
});