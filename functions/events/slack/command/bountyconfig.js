// authenticates you with the API standard library
// type `await lib.` to display API autocomplete
const lib = require('lib')({token: process.env.STDLIB_SECRET_TOKEN});
const channelAccountsService = require('../../../../services/channel_accounts_service');
const configuration = require('../../../../utils/config');

// Retrieve relevant params.
const event = context.params?.event;
const channelId = event?.channel_id;
const userId = event?.user_id;

// Show them a ephemeral message with all of the current emotes.
return await lib.slack.messages['@0.6.5'].ephemeral.create({
  channelId,
  userId,
  blocks: [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: `Slack Bounty Configuration`,
      },
    },
    {
      type: 'divider',
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `\`\`\`${JSON.stringify(configuration, null, 4)}\`\`\``,
      },
    },
    {
      type: 'divider',
    },
  ],
});
