const express = require("express");
const path = require("path");
const otakudesu = require("./API/otakudesu");

const app = express();
const port = "5555";

app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());

app.get("/", (req, res) => {
  res.sendFile("./public/index.html");
})

app.get("/API/home", async(req, res) => {
  const page = req.query?.page || 1;
  const result = await otakudesu.home(page);
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

app.listen(port, () => console.log("Start in port:", port));