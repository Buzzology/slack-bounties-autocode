/*
  NOTE: This handles custom (current interval) tickovers and leaderboards. Setting the schedule
  will determine how often the "current" leaderboard should last.
*/
const lib = require('lib')({token: process.env.STDLIB_SECRET_TOKEN});
const channelAccountsService = require('../../../services/channel_accounts_service');

// Retrieve distinct channels.
const distinctChannelIds = await channelAccountsService.GetDistinctChannels();

// If there aren't any channels yet, just exit.
if (!distinctChannelIds?.length) {
  console.log(`no channels for daily update.`);
  return;
}

// Loop through each channel and show the current leaderboard.
await Promise.allSettled(
  distinctChannelIds.map((channelId) => {
    return (async () => {
      return lib.slack.messages['@0.6.5'].create({
        id: channelId,
        blocks: await channelAccountsService.GetLeadersThisInterval({channelId}),
      });
    })();
  })
);

// Reset current interval amounts.
await channelAccountsService.ResetIntervalAmounts();
