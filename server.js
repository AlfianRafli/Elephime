const express = require("express");
const path = require("path");
const https = require("https");
const config = require("./config.json");
const otakudesu = require("./API/otakudesu");
const fs = require("fs");
const cors = require("cors");
const axios = require("axios");
const rateLimit = require("express-rate-limit");
const NodeCache = require("node-cache");
const myCache = new NodeCache({ stdTTL: 300 }); // Cache disimpan selama 300 detik (5 menit)

const domain = "elephant.my.id"; // this only for logs
const app = express();

app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());
app.set("trust proxy", 1); // read original IP

const cacheMiddleware = (req, res, next) => {
    const key = "__express__" + req.originalUrl || req.url;
    const cachedBody = myCache.get(key);
    if (cachedBody) {
        // Jika data ada di memori, kirim langsung tanpa scraping lagi
        return res.json(cachedBody);
    } else {
        // Jika tidak ada, timpa res.json untuk menyimpan data ke cache sebelum dikirim
        res.sendResponse = res.json;
        res.json = body => {
            myCache.set(key, body);
            res.sendResponse(body);
        };
        next();
    }
};

const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 300,               
  standardHeaders: true,  
  legacyHeaders: false,    
  message: { 
      status: 429, 
      error: "Terlalu banyak request, santai dulu kawan! Coba lagi dalam 1 menit." 
  }
});
app.use(
    cors({
        origin: "http://elephant.my.id"
    })
);

app.use("/API", apiLimiter);

app.get("/", (req, res) => {
    res.sendFile("./public/index.html");
});

app.get("/API/home", cacheMiddleware, async (req, res) => {
    const page = req.query?.page || 1;
    const result = await otakudesu.getHomePage(page);
    res.json(result);
});

app.get("/API/search", async (req, res) => {
    const query = req.query?.q || "";
    const anime = await otakudesu.search(query);
    res.json({ results: anime });
});

app.get("/watch", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "watch", "watch.html"));
});

app.get("/anime", cacheMiddleware, (req, res) => {
    res.sendFile(path.join(__dirname, "public", "anime", "anime.html"));
});

app.post("/API/getData", async (req, res) => {
    const data = req.body;
    if (!data?.url) return console.error("data.url not defined");
    const result = await otakudesu.getDownloadLink(data.url);
    const response = await otakudesu.getDataContent(data.url);

    result.servers = response;

    res.json(result);
});

app.post("/API/videos", async (req, res) => {
    const data = req.body;
    if (!data || !data.dataContent)
        return console.error("data.dataContent must have a data");
    const response = await otakudesu.getVideos(data.dataContent);

    res.json(response);
});

app.get("/API/anime", async (req, res) => {
    const url = req.query?.url;
    if (!url) res.json({});

    const { episodes } = await otakudesu.getEpisodes(url);
    const result = await otakudesu.getAnime(url);
    result.episodes = episodes;
    res.json(result);
});

app.get("/API/genre", async (req, res) => {
    const genre = req.query?.genre;
    const page = parseInt(req.query?.page) || 1;
    if (!genre) res.json({});

    const result = await otakudesu.searchFromGenre(genre, page);
    result.currentPage = page;

    res.json(result);
});

// Endpoint Proxy Gambar
app.get("/API/proxy-image", async (req, res) => {
    const imageUrl = req.query.url;
    if (!imageUrl) return res.status(400).send("URL required");

    try {
        const response = await axios({
            url: imageUrl,
            method: "GET",
            responseType: "stream",
            headers: {
                "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0.4472.124 Safari/537.36",
                Referer: "https://otakudesu.best/"
            }
        });
        res.set("Content-Type", response.headers["content-type"]);
        response.data.pipe(res);
    } catch (error) {
        console.error("Proxy Image Error:", error.message);
        res.sendFile(
            path.join(__dirname, "public", "assets", "placeholder.png")
        );
    }
});

app.get("/API/settings", (req, res) => {
    res.json({
        disqusShortname: config.disqus || undefined
    });
});

app.use((req, res, next) => {
    res.status(404).sendFile(path.join(__dirname, "public", "404.html"));
});

if (config.https) {
    const options = {
        key: fs.readFileSync(config.key), // select ur key and cert
        cert: fs.readFileSync(config.cert)
    };
    https.createServer(options, app).listen(443, () => {
        console.log("Server running on https://" + domain);
    });
} else {
    app.listen(config.port, () =>
        console.log("Server running on http://" + domain + ":" + config.port)
    );
}
