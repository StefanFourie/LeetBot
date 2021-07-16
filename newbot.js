const { App } = require('@slack/bolt');
require('dotenv').config();
const os = require('os');
const simpleStore = require('./simple_storage');
storage = new simpleStore({ path: './json_database' });

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

    console.log('⚡️ Bolt app is running!');
})();

