var express = require('express'),
    url = require('url'),
    app = express(),
    request = require('request');

//var reddit_ddoc = "http://127.0.0.1:9500/default/_design/reddit";
var reddit_ddoc = "http://mango-008:8092/reddalyzr/_design/reddit";

app.use(express.static('public'));

app.get("/api/:view", function(req, resp) {
    var url_parts = url.parse(req.url, true);
    var proxy_url = reddit_ddoc + "/_view/" + req.params.view + url_parts.search;
    request(proxy_url).pipe(resp);
});

console.log("Listening.");
app.listen(8300);
