const express = require('express')
const router = express.Router()
const urlController = require("../controllers/urlController")


router.post("/url/shorten", urlController.urlShortener)  // --> to shorten the URL
router.get("/:urlCode", urlController.getUrl)  // --> to redirect to the original URL


router.all("/**", function (req, res) {
    return res.status(400).send({ status: false, message: "invalid URL" })
})


module.exports = router