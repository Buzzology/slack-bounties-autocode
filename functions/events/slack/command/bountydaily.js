// authenticates you with the API standard library
// type `await lib.` to display API autocomplete
const lib = require('lib')({token: process.env.STDLIB_SECRET_TOKEN});
const channelAccountsService = require('../../../../services/channel_accounts_service');

// Retrieve relevant params.
const event = context.params?.event;
const channelId = event?.channel_id;
const userId = event?.user_id;

// Show them a ephemeral message with their current bounty.
return await lib.slack.messages['@0.6.5'].ephemeral.create({
  channelId,
  userId,
  blocks: await channelAccountsService.GetLeadersToday({channelId}),
});