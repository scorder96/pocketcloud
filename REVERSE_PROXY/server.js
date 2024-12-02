const express=require('express')
const httpProxy=require('http-proxy')
const fetch = require("node-fetch");
const fs=require("fs")
const https=require("https")
const app=express()
var cors = require('cors')

const PORT=443
const proxy=httpProxy.createProxy()

app.use(cors())

app.get("/image", (req, res) => {
    res.sendFile(__dirname+"/frog.png");
  });

app.use((req,res)=>{
    const hostname=req.hostname
    const subdomain=hostname.split('.')[0]
    var resolvesTo
    
    if (subdomain=="api") {
      resolvesTo='http://166.0.242.81:9000';
    }
    else{
      resolvesTo='http://'+subdomain+':8080';
    }

    fetch(resolvesTo).then(r=>{
        return proxy.web(req,res,{target:resolvesTo,changeOrigin:true})
        })
        .catch(e=>{
            res.sendFile(__dirname+"/404.html");
          });
  })

var privateKey = fs.readFileSync( __dirname+'/https/privkey1.pem' );
var certificate = fs.readFileSync( __dirname+'/https/fullchain1.pem' );

https.createServer({
    key: privateKey,
    cert: certificate
}, app).listen(PORT,()=>{console.log('Reverse proxy running on '+PORT)});