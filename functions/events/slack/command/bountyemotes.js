// authenticates you with the API standard library
// type `await lib.` to display API autocomplete
const lib = require('lib')({token: process.env.STDLIB_SECRET_TOKEN});
const channelAccountsService = require('../../../../services/channel_accounts_service');
const {
  BOOST_REACTIONS,
  RELEASE_BOUNTY_REACTION,
  TASK_COMPLETED_BY_ME_REACTION,
} = require('../../../../utils/config');

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
        text: `Slack Bounty Emotes`,
      },
    },
    {
      type: 'divider',
    },
    ...BOOST_REACTIONS.map((x) => {
      return {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Boost by ${x.boostValue}*`,
          },
          {
            type: 'mrkdwn',
            text: `:${x.emote}:`,
          },
        ],
      };
    }),
    {
      type: 'divider',
    },
    {
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text: `*Release Bounty*`,
        },
        {
          type: 'mrkdwn',
          text: `:${RELEASE_BOUNTY_REACTION}:`,
        },
      ],
    },
    {
      type: 'divider',
    },
    {
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text: `*Task Completed by Me*`,
        },
        {
          type: 'mrkdwn',
          text: `:${TASK_COMPLETED_BY_ME_REACTION}:`,
        },
      ],
    },
    {
      type: 'divider',
    },
  ],
});
