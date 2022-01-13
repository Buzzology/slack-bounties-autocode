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

await channelAccountsService.GetLeadersToday({channelId});

// Retrieve the user's account.
const channelAccount = await channelAccountsService.GetOrCreateChannelAccount(
  userId,
  channelId
);

// Show them a ephemeral message with their current bounty.
return await lib.slack.messages['@0.6.5'].ephemeral.create({
  channelId,
  userId,
  blocks: [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: `Your Bounty: :${TASK_COMPLETED_BY_ME_REACTION}:`,
      },
    },
    {
      type: 'divider',
    },
    {
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text: '*Current Balance*',
        },
        {
          type: 'plain_text',
          text: `${channelAccount.balance || '-'}`,
        },
      ],
    },
    /* Spent section. */
    {
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text: '*Spent Today*',
        },
        {
          type: 'plain_text',
          text: `${channelAccount.spent_today || '-'}`,
        },
        {
          type: 'mrkdwn',
          text: '*Spent this Interval*',
        },
        {
          type: 'plain_text',
          text: `${channelAccount.spent_this_interval || '-'}`,
        },
        {
          type: 'mrkdwn',
          text: '*Spent All Time*',
        },
        {
          type: 'plain_text',
          text: `${channelAccount.spent_all_time || '-'}`,
        },
      ],
    },
    {
      type: 'divider',
    },
    /* Earned section. */
    {
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text: 'Earned Today',
        },
        {
          type: 'plain_text',
          text: `${channelAccount.earned_today || '-'}`,
        },
        {
          type: 'mrkdwn',
          text: 'Earned this Interval',
        },
        {
          type: 'plain_text',
          text: `${channelAccount.earned_this_interval || '-'}`,
        },
        {
          type: 'mrkdwn',
          text: 'Earned All Time',
        },
        {
          type: 'plain_text',
          text: `${channelAccount.earned_all_time || '-'}`,
        },
      ],
    },
  ],
});
