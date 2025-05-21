const baseURL = "https://v9.animasu.cc/";
const axios = require("axios");
const cheerio = require("cheerio");

async function home() {
  const { data } = await axios.get(baseURL);
  const $ = cheerio.load(data);
  const result = [];
  
  $("div.bixbox div.listupd div.listupd listupd_custompage div.bs div.bsx").each(function() {
    const url = $(this).find("a").attr("href");
    const title = $(this).find("a div.tt").text();
    const img = $(this).find("a div.limit div.bt img").attr("src");
    const eps = $(this).find("a div.limit div.bt span.epx").text();
    
    result.push({ link: url, title: title, img: img, episode: eps });
  })
  
  return result.slice(0, 10);
}

async function search(query) {
  const { data } = await axios.get(baseURL + `?s=${query}`);
  const $ = cheerio.load(data);
  const result = [];
  
  $("div.bixbox div.listupd div.listupd listupd_custompage div.bs div.bsx").each(function() {
    const url = $(this).find("a").attr("href");
    const title = $(this).find("a div.tt").text();
    const img = $(this).find("a div.limit div.bt img").attr("src");
    const eps = $(this).find("a div.limit div.bt span.epx").text();
    
    result.push({ link: url, title: title, img: img, episode: eps })
  })
  
  return result;
}

async function searchByGenre(genre, page) {
  https://v9.animasu.cc/pencarian/?genre%5B%5D=slice-of-life&status=&tipe=&urutan=default&halaman=1
}