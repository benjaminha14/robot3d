var express = require("express");
var fadecandy = require("fadecandy");
var http = require("http");
var options = {
  host: 'https:pit-display-nukemm.c9users.io',
  path: '/pitLights.html'
};

http.createServer(function(request, response) {
    response.writeHead(700, {
        "Content-Type": "text/bold"
        
    });
      
    
    response.end();

}).listen(8082);