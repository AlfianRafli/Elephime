const express = require("express");
const path = require("path");
const https = require("https");
const config = require("./config.json");
const otakudesu = require("./API/otakudesu");
const fs = require("fs");
const cors = require("cors");
const rateLimit = require("express-rate-limit");

const domain = "elephant.my.id"; // this only for logs
const app = express();

app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());
app.set("trust proxy", 1); // read original IP

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 150,
  message: { error: "Too many requests, please try again later" }
});


app.use(cors({
  origin: "http://elephant.my.id",
}));

app.use("/API", apiLimiter)

app.get("/", (req, res) => {
  res.sendFile("./public/index.html");
})

app.get("/API/home", async(req, res) => {
  const page = req.query?.page || 1;
  const result = await otakudesu.getHomePage(page);
  res.json(result);
});

app.get("/API/search", async(req, res) => {
  const query = req.query?.q || "";
  const anime = await otakudesu.search(query);
  res.json({ results: anime });
})

app.get("/watch", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "watch", "watch.html"))
})

app.get("/anime", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "anime", "anime.html"));
})

app.post("/API/getData", async(req, res) => {
  const data = req.body;
  if (!data?.url) return console.error("data.url not defined")
  const result = await otakudesu.getDownloadLink(data.url);
  const response = await otakudesu.getDataContent(data.url);
  
  result.servers = response;
  
  res.json(result);
})

app.post("/API/videos", async(req, res) => {
  const data = req.body;
  if(!data || !data.dataContent ) return console.error("data.dataContent must have a data");
  const response = await otakudesu.getVideos(data.dataContent);
  
  res.json(response);
})

app.get("/API/anime", async(req, res) => {
  const url = req.query?.url;
  if(!url) res.json({});
  
  const { episodes } = await otakudesu.getEpisodes(url);
  const result = await otakudesu.getAnime(url);
  result.episodes = episodes;
  res.json(result);
});

app.get("/API/genre", async(req, res) => {
  const genre = req.query?.genre;
  const page = parseInt(req.query?.page) || 1;
  if(!genre) res.json({});
  
  const result = await otakudesu.searchFromGenre(genre, page);
  result.currentPage = page;
  
  res.json(result);
})

app.use((req, res, next) => {
  res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
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
	app.listen(config.port, () => console.log("Server running on http://" + domain + ":" + config.port));
}
