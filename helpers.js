const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
// const fs = require('fs');

const puppetMaster = async (url) => {
    console.log(url.url);
    let html;
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    return new Promise(async (resolve, reject) => {
        try {
            // await page.setDefaultTimeout(5000);
            await page.goto(url.url);
            // We have to wait for the JS to fully complete doing its magic before we can properly traverse & parse the dom.
            // A 5s timeout was the most successful I found
            await page.waitForTimeout(5000);
            // await page.waitForSelector('li.ant-list-item.css-nvdml7');
            // await page.waitForSelector('.css-lw67gk');
            // await page.waitForNavigation({ waitUntil: "domcontentloaded" });
            html = await page.content();

        } catch (error) {
            // Theoretically with the forced 5s wait we shouldn't step into the catch, but we'll leave it here just in case
            console.log(`Timed out waiting for ${url.url}\nERROR: ${error}`);
            // Try again and just wait for the heatmap. Shouldn't break parsing
            await page.goto(url.url);
            await page.waitForSelector('.react-calendar-heatmap');
            html = await page.content();
            console.log('fetched page again: ' + url.url);
        } finally {
            await browser.close();
            // fs.writeFileSync(`/home/calvin/Documents/TDS/LeetBot/someHTML_${url.url.split('.com/')[1]}.html`, html);
            return resolve(html);
        }
    });
}

const homeParser = (html) => {
    var $ = cheerio.load(html);
    var names = [];
    var times = [];
    var links = [];
    var status = [];
    return new Promise((resolve, reject) => {

        if ($('.ant-list-item.css-nvdml7') == null)
            console.log("leetcode homepage no found");
        else {
            // Following 3 lines traverse the dom, into the the appropriate parent element to iterate the list of submissions - DON'T TOUCH IT
            var list = $('.css-lw67gk').first().next();
            list = list.children().children().first().next();
            list = list.children().children().children()
            // var list = $('.ant-list-item.css-nvdml7').parent();
            list.children().each(function (i, ele) {
                //get all subject name and finish times, as well as acceptance state
                links[i] = $(this).children().attr('href');
                names[i] = $(this).children().children().first().text();
                times[i] = $(this).children().children().first().next().text();
                status[i] = $(this).children().children().first().next().next().children().first().next().text();
            });

            // console.log(JSON.stringify({ "names": names, "times": times, "links": links, "status": status }));
            return resolve(JSON.stringify({ "names": names, "times": times, "links": links, "status": status }));
        }
    })
}

const timeFilter = (json) => {
    var obj = JSON.parse(json);
    var names = [];
    var links = [];
    return new Promise((resolve, reject) => {
        if (obj == null)
            return reject("count star error\n");
        else {
            var nameSet = new Set();
            var times = obj.times;
            // filter out those should be count as today's finish
            for (var i = 0; i < times.length; i++) {
                // We only want accepted results to count towards stars
                if (obj.status[i] != 'Accepted') { continue; }
                // Filter out submissions not in the current day
                if (times[i].indexOf("day") > -1 || times[i].indexOf("days") > -1 || times[i].indexOf("week") > -1 || times[i].indexOf("weeks") > -1
                    || times[i].indexOf("month") > -1 || times[i].indexOf("months") > -1 || times[i].indexOf("year") > -1 || times[i].indexOf("years") > -1) { }
                else {
                    var now = new Date();
                    var end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 55, 00);
                    var s = times[i].replace(new RegExp(String.fromCharCode(160), "g"), " ");
                    // use regex to caculate how many ms ago
                    var hregex = /(\d+) hour/g;
                    var hour = hregex.exec(s);
                    var mregex = /(\d+) minute/g;
                    var min = mregex.exec(s);
                    var sregex = /(\d+) second/g;
                    var sec = sregex.exec(s);
                    var max = now.getTime() - end.getTime();  // how many ms have been after yesterday 23:55:00
                    var escape = 1000 * ((hour == null ? 0 : hour[1] * 3600) + (min == null ? 0 : min[1] * 60) + (sec == null ? 0 : sec[1]));
                    // if within max scope, this subject should be count as today's finish
                    if (escape < max) {
                        if (!nameSet.has(obj.names[i])) {
                            nameSet.add(obj.names[i]);
                            names.push(obj.names[i]);
                            links.push(obj.links[i]);
                        }
                    }
                }
            }
            // console.log([names, links]);
            return resolve([names, links]);
        }
    })
}

// Arb calculation of stars
const countStars = (count) => {
    var res = 0;
    if (count >= 10) {
        res = 5;
    }
    else if (count >= 5) {
        res = 3;
    }
    else if (count >= 3) {
        res = 2;
    }
    else if (count > 0) {
        res = 1;
    }
    return res;
}

const formatUptime = (rawUptime) => {
    // https://stackoverflow.com/a/55164534
    // console.log("Uptime raw:", rawUptime)
    const date = new Date(rawUptime * 1000);
    const days = date.getUTCDate() - 1,
        hours = date.getUTCHours(),
        minutes = date.getUTCMinutes(),
        seconds = date.getUTCSeconds();
    // milliseconds = date.getUTCMilliseconds();

    let segments = [];

    // Format the uptime string. 	
    if (days > 0) segments.push(days + ' day' + ((days == 1) ? '' : 's'));
    if (hours > 0) segments.push(hours + ' hour' + ((hours == 1) ? '' : 's'));
    if (minutes > 0) segments.push(minutes + ' minute' + ((minutes == 1) ? '' : 's'));
    if (seconds > 0) segments.push(seconds + ' second' + ((seconds == 1) ? '' : 's'));
    // if (milliseconds > 0) segments.push(milliseconds + ' millisecond' + ((seconds == 1) ? '' : 's'));
    const dateString = segments.join(', ');

    // console.log("Uptime: " + dateString);
    return dateString;
}

exports.puppetMaster = puppetMaster;
exports.homeParser = homeParser;
exports.timeFilter = timeFilter;
exports.countStars = countStars;
exports.formatUptime = formatUptime;