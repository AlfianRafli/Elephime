const axios = require("axios");
const cheerio = require("cheerio");
const baseUrl = "https://otakudesu.cloud";

// Configure axios for better performance
const http = axios.create({
  baseURL: baseUrl,
  timeout: 10000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
  }
});

// Helper functions
const cleanText = (text) => (text || '').trim();
const extractValue = (text, prefix) => {
  if (!text) return null;
  return cleanText(text.replace(prefix, ''));
};

const search = async (query) => {
  if (!query) throw new Error("Query is required");
  
  try {
    const { data } = await http.get(`/?s=${encodeURIComponent(query)}&post_type=anime`);
    const $ = cheerio.load(data);
    const results = [];

    $("ul.chivsrc li").each((_, el) => {
      const $el = $(el);
      results.push({
        title: cleanText($el.find("h2 a").text()),
        url: $el.find("h2 a").attr("href"),
        img: $el.find("img.attachment-post-thumbnail").attr("src")
      });
    });

    return results.length ? results : [];
  } catch (error) {
    console.error('Search error:', error);
    return [];
  }
};

const getAnime = async (animeUrl) => {
  if (!animeUrl || !animeUrl.includes(`${baseUrl}/anime/`)) {
    throw new Error("Invalid anime URL");
  }

  try {
    const { data } = await http.get(animeUrl);
    const $ = cheerio.load(data);

    // Extract synopsis
    const sinopsis = [];
    $(".sinopc p").each((_, el) => {
      sinopsis.push(cleanText($(el).text()));
    });

    // Extract anime info
    const info = {};
    $("div.infozin div.infozingle p").each((_, el) => {
      const $el = $(el);
      const text = $el.text().replace(":", "");
      
      if (text.includes("Judul")) {
        info.title = extractValue(text, "Judul");
      } else if (text.includes("Skor")) {
        info.rating = extractValue(text, "Skor");
      } else if (text.includes("Produser")) {
        info.produser = extractValue(text, "Produser");
      } else if (text.includes("Status")) {
        info.status = extractValue(text, "Status");
      } else if (text.includes("Total Episode")) {
        info.totalEpisode = extractValue(text, "Total Episode");
      } else if (text.includes("Durasi")) {
        info.duration = extractValue(text, "Durasi");
      } else if (text.includes("Tanggal Rilis")) {
        info.released = extractValue(text, "Tanggal Rilis");
      } else if (text.includes("Studio")) {
        info.studio = extractValue(text, "Studio");
      }
    });

    // Extract genres
    info.genres = [];
    $("div.infozin div.infozingle a").each((_, el) => {
      const href = $(el).attr("href");
      if (href.includes("/genres/")) {
        info.genres.push(cleanText($(el).text()));
      }
    });

    info.sinopsis = sinopsis.join("\n");
    return info;
  } catch (error) {
    console.error('Get anime error:', error);
    return {};
  }
};

const getEpisodes = async (animeUrl) => {
  if (!animeUrl) throw new Error("No URL provided");

  try {
    const { data } = await http.get(animeUrl);
    const $ = cheerio.load(data);

    // Extract title
    const title = extractValue($(`p span:contains("Judul")`).text(), "Judul");

    // Extract episodes
    const episodes = [];
    $("div.episodelist ul li a").each((_, el) => {
      const $el = $(el);
      const url = $el.attr("href");
      
      if (url.includes("/episode/")) {
        const episodeText = $el.text();
        const match = episodeText.match(/Episode\s+(\d+(\.\d+)?)/i);
        episodes.push({
          episode: match ? match[1] : null,
          url: url
        });
      }
    });

    return {
      title: title,
      episodes: episodes.reverse()
    };
  } catch (error) {
    console.error('Get episodes error:', error);
    return { title: null, episodes: [] };
  }
};

const getDownloadLink = async (episodeUrl) => {
  if (!episodeUrl || !episodeUrl.includes(baseUrl)) {
    throw new Error("Invalid episode URL");
  }

  try {
    const { data } = await http.get(episodeUrl);
    const $ = cheerio.load(data);

    const result = {
      title: cleanText($("div.download h4").text()),
      resolutionAvailable: [],
      results: {}
    };

    // Extract resolutions and download links
    $("div.download ul > li").each((_, el) => {
      const $el = $(el);
      const resolution = cleanText($el.find("strong").first().text());
      
      if (resolution) {
        result.resolutionAvailable.push(resolution);
        const links = [];
        
        $el.find("a").each((_, link) => {
          links.push({
            source: cleanText($(link).text()),
            link: $(link).attr("href")
          });
        });
        
        result.results[resolution.split(" ")[1] ? resolution.split(" ")[1] : resolution] = links;
      }
    });

    return result;
  } catch (error) {
    console.error('Get download link error:', error);
    return {};
  }
};

const searchFromGenre = async (query, page = 1) => {
  if (!query) return { results: [], totalPages: 0 };

  try {
    const genreSlug = query.toLowerCase().split(" ").join("-");
    const url = `/genres/${genreSlug}/page/${page}`;
    
    const { data, request } = await http.get(url);
    
    // Check if redirected to homepage (invalid genre)
    if (request.res.responseUrl === baseUrl + "/") {
      return { results: [], totalPages: 0 };
    }

    const $ = cheerio.load(data);
    const results = [];

    $("div.col-anime").each((_, el) => {
      const $el = $(el);
      results.push({
        title: cleanText($el.find("div.col-anime-title a").text()),
        url: $el.find("div.col-anime-title a").attr("href"),
        img: $el.find("div.col-anime-cover img").attr("src")
      });
    });

    // Calculate total pages
    const pageLinks = $("a.page-numbers").toArray();
    let totalPages = 1;
    
    if (pageLinks.length > 1) {
      const lastPage = $(pageLinks[pageLinks.length - 2]).text();
      totalPages = parseInt(lastPage) || 1;
    }

    return { results, totalPages };
  } catch (error) {
    console.error('Search from genre error:', error);
    return { results: [], totalPages: 0 };
  }
};

const availableGenres = async () => {
  try {
    const { data } = await http.get("/genre-list/");
    const $ = cheerio.load(data);
    const genres = [];

    $("ul.genres li a").each((_, el) => {
      genres.push(cleanText($(el).text()).toLowerCase());
    });

    return genres;
  } catch (error) {
    console.error('Available genres error:', error);
    return [];
  }
};

const getDataContent = async (url) => {
  if (!url) return { "360p": [], "480p": [], "720p": [] };

  try {
    const { data } = await http.get(url);
    const $ = cheerio.load(data);
    const result = { "360p": [], "480p": [], "720p": [] };

    // Helper function to extract mirror data
    const extractMirrors = (selector, key) => {
      $(selector).each((_, el) => {
        result[key].push({
          label: cleanText($(el).text()),
          dataContent: $(el).attr("data-content")
        });
      });
    };

    extractMirrors("div.mirrorstream ul.m360p a", "360p");
    extractMirrors("div.mirrorstream ul.m480p a", "480p");
    extractMirrors("div.mirrorstream ul.m720p a", "720p");

    return result;
  } catch (error) {
    console.error('Get data content error:', error);
    return { "360p": [], "480p": [], "720p": [] };
  }
};

const getVideos = async (dataContent) => {
  if (!dataContent) return { iframe: null };

  try {
    // Get nonce first
    const { data: nonceData } = await http.post(
      "/wp-admin/admin-ajax.php",
      "action=aa1208d27f29ca340c92c66d1926f13f"
    );

    // Decode the data content
    const res = JSON.parse(Buffer.from(dataContent, "base64").toString("utf-8"));

    // Prepare request data
    const requestData = new URLSearchParams();
    requestData.append('id', res.id);
    requestData.append('i', res.i);
    requestData.append('q', res.q);
    requestData.append('nonce', nonceData.data);
    requestData.append('action', '2a3505c93b0035d3f455df82bf976b84');

    // Get video iframe
    const { data: responseData } = await http.post(
      "/wp-admin/admin-ajax.php",
      requestData,
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    const decodedData = Buffer.from(responseData.data, "base64").toString("utf-8");
    return { iframe: decodedData };
  } catch (error) {
    console.error('Get videos error:', error);
    return { iframe: null };
  }
};

const getHomePage = async (page = 1) => {
  try {
    const { data } = await http.get(`/ongoing-anime/page/${page}`);
    const $ = cheerio.load(data);
    const results = [];

    $(".venz ul li").each((_, el) => {
      const $el = $(el);
      const episodeText = $el.find(".epz").text();
      const episodeMatch = episodeText.match(/Episode\s+(\d+(\.\d+)?)/i);

      results.push({
        title: cleanText($el.find(".jdlflm").text()),
        img: $el.find("img").attr("src"),
        link: $el.find("a").attr("href"),
        episode: episodeMatch ? episodeMatch[1] : null,
        released: cleanText($el.find(".newnime").text())
      });
    });

    return results;
  } catch (error) {
    console.error('Get home page error:', error);
    return [];
  }
};

module.exports = {
  availableGenres,
  searchFromGenre,
  search,
  getAnime,
  getEpisodes,
  getDownloadLink,
  getDataContent,
  getVideos,
  getHomePage
};