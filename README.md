# Leetbot

<!-- Leetbot is a bot that can trace your leecode progress, and compete it with your teammates on slack. It will update the leaderboard daily, and count each week's result. -->

Leetbot is a bot that can track your LeetCode progress, and allow you to compare yourself against your teammates on Slack. The leaderboard is updated daily, and counts towards each weeks result.

### Deployment:

<!-- The bot should always be running so it is strongly recommend that all the following operation should be done on a cloud machine(e.g. AWS EC2). -->

The bot should always be running, so it is strongly recommended that the bot be hosted on a server or cloud machine.

#### Install the Code:

```bash
git clone https://github.com/StefanFourie/LeetBot.git
cd LeetBot
npm install
```

#### Setting the Bot up:

1. If you don't already have one, [create a new slack workspace](https://slack.com).

2. Create a new bot app. Click [here](https://api.slack.com/apps/new). For more information about Slack Bots/Apps, see the [documentation](https://api.slack.com/#read_the_docs).

3. Configure your app as follows:

   - Enable Socket Mode with the `connections:write` scope. Keep the generated App Token handy.
   - Enable Interactivity if not already enabled.
   - Grant the following OAuth & Permission scopes:
     - ```
       channels:history
       chat:write
       groups:history
       im:history
       im:write
       mpim:history
       reactions:write
       ```
   - Enable Event Subscriptions and subscribe to the following events:
     - ```
       message.channels
       message.groups
       message.im
       message.mpim
       ```
   - Enable the Messages Tab, found under App Home
   - Depending on whether you previously installed the bot to your chosen workspace, you can now install/reinstall the bot to the workspace.

4. Rename the `example.env` to `.env` and add your credentials and tokens into the provided fields.
   - `SLACK_BOT_TOKEN` : Found under the OAuth & Permissions tab
   - `SLACK_SIGNING_SECRET` : Found under the Basic Information tab
   - `SLACK_APP_TOKEN` : Found under the Basic Information tab > App-Level Tokens section. Click on the named Token to access it.
   - `PORT` : The port your app will run and listen on
   - `CHANNEL` : Leaderboards will be posted to a dedicated Slack channel, please get the ID
   - `DB_NAME` : Default name for the JSON file database. Can be changed.

#### Running the Code:

Run the command on your cloud or local machine.

```
node newbot.js
```

### Configuration and Usage:

Use direct messages to your bot to configure/register yourself and check your progress.

#### Available Commands:

| Format                     |                            What it does                             |
| -------------------------- | :-----------------------------------------------------------------: |
| call me [your name]        |       register/update username (required for first time use)        |
| signup [LeetCode username] |       register LeetCode account (required for first time use)       |
| my progress                | show user's current progress (week star, rank, submit history etc.) |
| status                     |        show team's progress (current stars and leaderboard)         |
| who am I                   |                         check user profile                          |
| help                       |         sends a list of available commands and what they do         |

<!-- | update [LeetCode username] | update LeetCode account      | -->

### Notes

The Bot uses a module from BotKit v0.7 called `simple_storage` that writes the stored info for each user to a JSON file. The name for this "database" can be configured in the .env file (`DB_NAME`), and is by default created in the project root directory.

### Further Reading & Tutorials

- [Bolt for JavaScript](https://slack.dev/bolt-js/concepts)
- [Getting Started with Bolt for JS (Socket Mode)](https://slack.dev/bolt-js/tutorial/getting-started)
- [Getting Started with Bolt for JS (HTTP Mode)](https://slack.dev/bolt-js/tutorial/getting-started-http)
- [Block Kit](https://api.slack.com/block-kit)
