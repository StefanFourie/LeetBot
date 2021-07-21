const { App } = require('@slack/bolt');
require('dotenv').config();
const os = require('os');
const fs = require('fs');
const puppeteer = require('puppeteer');
const simpleStore = require('./simple_storage');
let storage = new simpleStore({ path: './json_database' });
let baseurl = 'https://leetcode.com';
const cheerio = require('cheerio');
const timezone = 'Africa/Johannesburg';


// Initializes your app with your bot token and signing secret
const app = new App({
    token: process.env.SLACK_BOT_TOKEN,
    signingSecret: process.env.SLACK_SIGNING_SECRET,
    socketMode: true,
    appToken: process.env.SLACK_APP_TOKEN
});

// Listens to incoming messages that contain "Hi/Hello/Hey". Case insensitive
app.message(/^(hi|hello|hey).*/i, async ({ message, say }) => {
    // say() sends a message to the channel where the event was triggered
    app.client.reactions.add(
        {
            timestamp: message.ts,
            channel: message.channel,
            name: 'robot_face',
        }
    );
    storage.users.get(message.user, async (err, user) => {
        if (user && user.name) {
            await say(`Hello ${user.name}!!`);
        } else {
            await say('Hello.');
        }
    });
});

// Creates the user file in the storage
app.message(/^call me (.*)|my name is (.*)/i, async ({ message, context, say }) => {
    var name = context.matches[1] === undefined ? context.matches[2] : context.matches[1];
    storage.users.get(message.user, (err, user) => {
        if (!user) {
            user = {
                id: message.user,
                star: 0,
                weekStar: 0,
                todayStar: 0,
                todayCount: 0,
                todaySubmissions: [],
            };
        }
        user.name = name;
        storage.users.save(user, async (err, id) => {
            await say(`Got it. I will call you ${user.name} from now on.`);
        });
    });
});

// Register the users leetcode username
app.message(/^sign ?up (.*)/i, async ({ message, context, say }) => {
    var leet = context.matches[1];
    storage.users.get(message.user, (err, user) => {
        if (!user) {
            user = {
                id: message.user
            };
        }
        user.leet = leet;
        storage.users.save(user, async (err, id) => {
            await say(`Got it. Your Leetcode username is ${user.leet}.`);
        });
    });
});

// Help command - different responses based on origin channel
app.message(/^help/i, async ({ message, context, say }) => {
    if (message.channel_type === 'im') {
        // DM message - provides commands
        await say(
            ':robot_face: Here are some commands you can use:\n' +
            '`my name is [your name]` - register/update your name for the leaderboard\n' +
            '`signup [leetcode username]` - register leetcode account\n' +
            '`update [leetcode username]` - update leetcode username\n' +
            '`my progress` - show your current progress (week star, rank, submit history etc.)\n' +
            '`status` - show team\'s progress (current stars and leaderboard)\n' +
            '`who am i` - check user profile\n'
        );

    } else {
        // Open channel message
        await say(
            ':robot_face: You can send me a DM if you are trying to register or join in!\n' +
            'Or you can just send a message saying `help`, and I\'ll give you a list of handy commands :)'
        );
    }
});

// Who am I
app.message(/^who am I/i, async ({ message, say }) => {
    storage.users.get(message.user, async (err, user) => {
        await say(`Your name is ${user.name}.\n` + (user.leet ? (`Your Leetcode username is ${user.leet}`) : 'Leetcode username not set'))
    });
});

// Status for user
app.message(/^status/i, async ({ message, say }) => {
    storage.users.all(function (err, all) {
        //init with each user's url
        var urls = [];
        all.forEach(function (node) {
            urls.push({ url: baseurl + '/' + node.leet });
        })
        var pages = Promise.all(urls.map(puppetMaster));
        //create promise all to wait for all query to finish. Responses will have same order with promises
        pages.then(function (response) {
            return Promise.all(response.map(homeParser));
        }).then(function (json) {
            var objs = Promise.all(json.map(timeFilter));
            return objs;
        })
            .then(data => {
                return updateCurrentStatus(data, all, function (result) {
                    say(result);
                });
            }).then(data => {
                // console.log(data);
            })
            .catch(function (error) {
                console.log(error);
            });
    });
});

var puppetMaster = async (url) => {
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

var homeParser = function (html) {
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

function updateCurrentStatus(lists, all, callback) {
    var result = "Today's progress:\n"
    for (var i = 0; i < lists.length; i++) {
        storage.users.get(all[i].id, function (err, user) {
            var nameSet = new Set();
            var subs = user.todaySubmissions;
            var count = 0;
            if (user.todayLinks == null) {
                user.todayLinks = [];
            }
            if (subs == null) {
                user.todaySubmissions = [];
            }
            if (subs != null) {
                subs.forEach(function (sub) {
                    nameSet.add(sub);
                })
            }
            var names = lists[i][0];
            var links = lists[i][1];
            if (names != null) {
                for (var k = 0; k < names.length; k++) {
                    if (!nameSet.has(names[k])) {
                        nameSet.add(names[k]);
                        user.todaySubmissions.push(names[k]);
                        user.todayLinks.push(baseurl + links[k]);
                        count++;
                    }
                }
            }
            user.todayCount += count;
            user.todayStar = countStars(user.todayCount);
            result += user.name + ": " + user.todayStar + " stars. Week total: " + user.weekStar + " stars.\n";
            storage.users.save(user, function (err, id) {
            });
        });
    }
    callback(result);
    return new Promise((resolve, reject) => {
        return resolve(all);
    })
}

var timeFilter = function (json) {
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
function countStars(count) {
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

// Bot command to show user their progress
app.message(/^my progress/i, async ({ message, context, say }) => {
    storage.users.get(message.user, function (err, user) {
        var res = "";
        // console.log(user);
        if (user && user.name) {
            res += 'Hello ' + user.name + '\n';
            res += "Today's finishes: " + user.todayCount + ", which stands for " + user.todayStar + " stars \n";
            res += "Week's total stars: " + user.weekStar + ", your rank is " + user.weekRank + "\n";
            res += "Submit history:\n";
            if (user.todaySubmissions != null) {
                var index = 0;
                user.todaySubmissions.forEach(function (each) {
                    res += each + ": " + user.todayLinks[index++] + "\n";
                })
            }
            if (user.oldSubmissions != null) {
                var index = 0;
                user.oldSubmissions.forEach(function (each) {
                    res += each + ": " + user.oldLinks[index++] + "\n";
                })
            }
            say(res);
        } else {
            say("I don't have your details, please DM with the `help` command to get started.");
        }
    });
});

// Bot info command
app.message(/^uptime|who are you/i, async ({ message, context, say }) => {
    var hostname = os.hostname();
    var uptime = formatUptime(process.uptime());


    await say(
        `:robot_face: I am a bot named <@${context.botUserId}>.\n` +
        `I have been running for ${uptime} on ${hostname}.`
    );
});

function formatUptime(uptime) {
    var unit = 'second';
    if (uptime > 60) {
        uptime = uptime / 60;
        unit = 'minute';
    }
    if (uptime > 60) {
        uptime = uptime / 60;
        unit = 'hour';
    }
    if (uptime != 1) {
        unit = unit + 's';
    }

    uptime = uptime + ' ' + unit;
    return uptime;
}

(async () => {
    // Start your app
    await app.start(process.env.PORT || 3000);

    console.log('LeetBot is running!');
})();

