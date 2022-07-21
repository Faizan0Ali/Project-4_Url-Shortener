const urlModel = require("../models/urlModel");
const shortid = require('shortid');
const axios = require('axios');

const redis = require("redis");
const { promisify } = require("util");


const isValidBody = function (x) {
    return Object.keys(x).length > 0;
};

const isvalid = function (x) {
    if (typeof x === "undefined" || x === null) return false;
    if (typeof x === "string" && x.trim().length === 0) return false;
    return true;
}


//Connect to redis

const redisClient = redis.createClient(
    11713,
    "redis-11713.c264.ap-south-1-1.ec2.cloud.redislabs.com",
    { no_ready_check: true }
);
redisClient.auth("uDwPvY62yVwScr0397qSOoEfXrI0kYb2", function (err) {
    if (err) throw err;
});
redisClient.on("connect", async function () {
    console.log("Connected to Redis..");
});

//1. connect to the server
//2. use the commands :

const SET_ASYNC = promisify(redisClient.SET).bind(redisClient);
const GET_ASYNC = promisify(redisClient.GET).bind(redisClient);



// ==> POST api : to shorten the URL

const urlShortener = async function (req, res) {
    try {
        if (!isValidBody(req.body)) return res.status(400).send({ status: false, message: "Provide the longUrl in the body." })

        let longUrl = req.body.longUrl
        if (!isvalid(longUrl)) return res.status(400).send({ status: false, message: 'Provide the longUrl in the body.' })
        
        let found = false;
        await axios
        .get(longUrl)
        .then((response) => {
            if (response.status == 200 || response.status == 201) found = true
        })
        .catch((error) => {})
        if (found == false) return res.status(400).send({ status: false, message: "Enter a valid URL." })
        
        let urlPresent = await urlModel.findOne({ longUrl: longUrl }).select({ createdAt:0, updatedAt:0, __v:0, _id:0 })
        if (urlPresent) return res.status(200).send({ status: true, message: "urlCode is already generated for this URL.", data: urlPresent })

        let urlCode = shortid.generate(longUrl);
        let shortUrl = 'http://localhost:3000/' + urlCode;
        let data = { longUrl: longUrl, shortUrl: shortUrl, urlCode: urlCode };

        let urlGenerated = await urlModel.create(data);
        let result = { longUrl: urlGenerated.longUrl, shortUrl: urlGenerated.shortUrl, urlCode: urlGenerated.urlCode };
        return res.status(201).send({ status: true, data: result })
    } catch (err) {
        return res.status(500).send({ status: false, message: err.message })
    }
}



// GET api : redirecting to Original URL

const getUrl = async function (req, res) {
    try {
        let urlCode = req.params.urlCode;
        let url = await GET_ASYNC(urlCode);

        if (url) return res.status(302).redirect(url);
        else {
            let urlDoc = await urlModel.findOne({ urlCode: urlCode });
            if (!urlDoc) return res.status(404).send({ status: false, message: "URL doesn't exist. Please provide a valid URL code." });

            await SET_ASYNC(urlCode, urlDoc.longUrl);
            return res.status(302).redirect(urlDoc.longUrl);
        }
    } catch (err) {
        return res.status(500).send({ status: false, message: err.message })
    }
}



module.exports = { urlShortener, getUrl }  // --> exporting the functions