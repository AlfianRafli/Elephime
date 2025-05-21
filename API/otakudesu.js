const axios = require("axios");
const cheerio = require("cheerio");

const search = async (query, baseUrl) => {
    let url = baseUrl ?? "https://otakudesu.cloud";
    if (!query) throw Error(new Error("Query is required"));
    const { data } = await axios.get(`${url}/?s=${query}&post_type=anime`);
    const $ = cheerio.load(data);
    const results = [];

    $("ul.chivsrc li").each(function () {
        const thumbnail = $(this)
            .find("img.attachment-post-thumbnail")
            .attr("src");
        const title = $(this).find("h2 a").text();
        const url = $(this).find("h2 a").attr("href");

        results.push({ title: title, img: thumbnail, url: url });
    });
    if (results.length === 0) return [];
    return results;
};

/*
Results: [
  {
    title: 'Boruto: Naruto Next Generations',
    url: 'https://otakudesu.cloud/anime/borto-sub-indo',
    img: 'https://otakudesu.cloud/wp-content/uploads/2021/07/Boruto.jpg'
  }
]
*/

const getAnime = async otakudesuAnimeUrl => {
    let url = otakudesuAnimeUrl;
    if (!otakudesuAnimeUrl) throw Error("No url provided");
    if (!otakudesuAnimeUrl.includes("https://otakudesu.cloud/anime/"))
        return {};
    const { data } = await axios.get(url);
    if (!data) return {};

    let result;
    const $ = cheerio.load(data);
    let sinopsis = [];
    $(".sinopc p").each((index, element) => {
        sinopsis.push($(element).text());
    });
    $("div.infozin div.infozingle")
        .get()
        .map(x => {
            let title = $(`p span:contains("Judul")`).text().split(" ");
            title.shift();
            title = title.join(" ");
            const rating = $(`p span:contains("Skor")`).text().split(" ")[1];
            let produser = $(`p span:contains("Produser")`).text().split(" ");
            produser.shift();
            produser = produser.join(" ");
            const status = $(`p span:contains("Status")`).text().split(" ")[1];
            const totalEpisode = $(`p span:contains("Total Episode")`)
                .text()
                .split(" ")[2];
            let duration = $(`p span:contains("Durasi")`).text().split(" ");
            duration.shift();
            duration = duration.join(" ");
            let tanggalRilis = $(`p span:contains("Tanggal Rilis")`)
                .text()
                .split(" ");
            tanggalRilis.shift();
            tanggalRilis.shift();
            tanggalRilis = tanggalRilis.join(" ");
            let studio = $(`p span:contains("Studio")`).text().split(" ");
            studio.shift();
            studio = studio.join(" ");
            let genres = [];
            $("div.infozin div.infozingle a").each(function () {
                const url = $(this).attr("href");
                if (url.includes("https://otakudesu.cloud/genres/"))
                    genres.push($(this).text());
            });

            result = {
                title: title,
                rating: rating,
                produser: produser,
                status: status,
                totalEpisode: totalEpisode,
                duration: duration,
                released: tanggalRilis,
                genres: genres,
                sinopsis: sinopsis.join("\n"),
                studio: studio
            };
        });
    return result;
};

const getEpisodes = async animeUrl => {
    if (!animeUrl) throw Error("No url provided");
    const { data } = await axios.get(animeUrl);
    if (!data) throw Error("No data");
    const $ = cheerio.load(data);
    let episodes = [];
    let title = $(`p span:contains("Judul")`).text().split(" ");
    title.shift();
    title = title.join(" ");

    $("div.episodelist ul li a")
        .get()
        .map(x => {
            if (x.attribs.href.includes("https://otakudesu.cloud/episode/")) {
                const source = $(x).text();
                
                const match = $(x).text().match(/Episode\s+(\d+(\.\d+)?)/i);
                
                const url = $(x).attr("href");
                
                episodes.push({ episode: match ? match[1] : null, url: url });
            }
        });
    return { title: title, episodes: episodes.reverse() };
};

const getDownloadLink = async episodeUrl => {
    if (!episodeUrl) return {};
    if (!episodeUrl.includes("https://otakudesu.cloud/")) return {};
    const { data } = await axios.get(episodeUrl);
    if (!data) return {};
    const $ = cheerio.load(data);

    let title = $("div.download h4").text();
    let results = {};
    let resolutions = [];

    $("div.download ul li strong").each(function () {
        const resolution = $(this).text();
        resolutions.push(resolution);
    });

    $("div.download ul > li").each(function () {
        const strong = $(this).find("strong").first();
        const key = strong.text();
        const hrefs = [];

        $(this)
            .find("a")
            .each(function () {
                hrefs.push({
                    source: $(this).text(),
                    link: $(this).attr("href")
                });
            });
        results[key.split(" ")[1]] = hrefs;
    });
    return { title: title, resolutionAvailable: resolutions, results: results };
};

const searchFromGenre = async (query, pages) => {
    let page = pages ?? 0;
    const base = "https://otakudesu.cloud/";
    if (!query) return [];
    let que = query.split(" ");
    que = que.join("-");
    let q = `${base}genres/${que}`;
    if (page) {
        q = `${base}genres/${que}/page/${pages}`;
    }
    const result = await axios.get(q);
    if (result.request.res.responseUrl === "https://otakudesu.io") return [];
    const $ = cheerio.load(result.data);

    let results = [];

    $("div.col-anime").each(function () {
        const url = $(this).find("div.col-anime-title a").attr("href");
        const title = $(this).find("div.col-anime-title a").text();
        const thumb = $(this).find("div.col-anime-cover img").attr("src");
        results.push({ title: title, url: url, img: thumb });
    });

    const tp = $("a.page-numbers").toArray();
    let totalPages = 1;

    if (tp.length) {
        const last = tp[tp.length - 2];
        totalPages = parseInt($(last).text());
    }

    return { results: results, totalPages: totalPages };
};

const availableGenres = async () => {
    const { data } = await axios.get("https://otakudesu.cloud/genre-list/");
    const $ = cheerio.load(data);
    const results = [];

    $("ul.genres li a").each(function () {
        results.push($(this).text().toLowerCase());
    });
    return results;
};

const getDataContent = async url => {
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);

    const result = { "360p": [], "480p": [], "720p": [] };

    $("div.mirrorstream ul.m360p a").each(function () {
        result["360p"].push({
            label: $(this).text(),
            dataContent: $(this).attr("data-content")
        });
    });

    $("div.mirrorstream ul.m480p a").each(function () {
        result["480p"].push({
            label: $(this).text(),
            dataContent: $(this).attr("data-content")
        });
    });

    $("div.mirrorstream ul.m720p a").each(function () {
        result["720p"].push({
            label: $(this).text(),
            dataContent: $(this).attr("data-content")
        });
    });

    return result;
};

const getVideos = async dataContent => {
    if (!dataContent) return [];

    const nonce = await axios.post(
        "https://otakudesu.cloud/wp-admin/admin-ajax.php",
        "action=aa1208d27f29ca340c92c66d1926f13f"
    );

    const res = JSON.parse(
        Buffer.from(dataContent, "base64").toString("utf-8")
    );

    const requiredData = `id=${res.id}&i=${res.i}&q=${res.q}&nonce=${nonce.data.data}&action=2a3505c93b0035d3f455df82bf976b84`;

    const response = await axios.post(
        "https://otakudesu.cloud/wp-admin/admin-ajax.php",
        requiredData,
        { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    const decodedData = Buffer.from(response.data.data, "base64").toString(
        "utf-8"
    );

    return { iframe: decodedData };
};

const home = async (page) => {
    let url = "https://otakudesu.cloud/ongoing-anime/page/";
    const { data } = await axios.get(url + page || 1);
    const $ = cheerio.load(data);
    let cur = 0;

    const results = [];

    $(".venz ul li").each(function () {
        const title = $(this).find(".jdlflm").text();
        const thumb = $(this).find("img").attr("src");
        const link = $(this).find("a").attr("href");
        const eps = $(this).find(".epz").text().match((/Episode\s+(\d+(\.\d+)?)/i));
        const released = $(this).find(".newnime").text();

        results.push({
            title: title,
            img: thumb,
            link: link,
            episode: eps ? eps[1] : null,
            released: released
        });
    });
    return results;
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
    home
};
