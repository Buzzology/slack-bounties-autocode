const lib = require('lib')({token: process.env.STDLIB_SECRET_TOKEN});
const messageBountyService = require('../../../../services/message_bounties_service');

const event = context?.params?.event;
const responseUrl = event?.response_url;
const targetUserId =
  event?.state?.values?.award_user?.user_to_award?.selected_user;
const messageId = event?.actions?.find(
  (x) => x.block_id === 'award_bounty_confirm'
)?.value;
const channelId = event?.channel?.id;
const currentUserId = event?.user?.id;
const messageIdToDelete = event?.container?.message_ts;

// Show an initial loader (the delay is pretty long, let them know something is happening).
await lib.slack.messages['@0.6.5'].create.asResponse({
  response_url: responseUrl,
  replace_original: true,
  delete_original: false,
  response_type: 'ephemeral',
  blocks: [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: 'Award Bounty',
        emoji: true,
      },
    },
    {type: 'divider'},
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: ':hourglass_flowing_sand:',
      },
    },
    {type: 'divider'},
  ],
});

// Award the bounty to the selected user.
const responseBlocks = await messageBountyService.AwardBounty({
  messageId,
  targetUserId,
  currentUserId,
  channelId,
  responseUrl,
});

// Update the ephemeral bounty message.
if (responseBlocks?.length) {
  return await lib.slack.messages['@0.6.5'].create.asResponse({
    response_url: responseUrl,
    replace_original: true,
    delete_original: false,
    response_type: 'ephemeral',
    blocks: responseBlocks,
  });
}

console.error(`failed to generate blocks response: ${JSON.stringify(event, null, 4)}`);

