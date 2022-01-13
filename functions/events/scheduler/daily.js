/*
  NOTE: This handles daily tickovers, income and decay. Use current.js to handle your
  custom interval.
*/
const lib = require('lib')({token: process.env.STDLIB_SECRET_TOKEN});
const channelAccountsService = require('../../../services/channel_accounts_service');
const {DAILY_DECAY, DAILY_INCOME} = require('../../../utils/config');

// Retrieve distinct channels.
const distinctChannelIds = await channelAccountsService.GetDistinctChannels();

// If there aren't any channels yet, just exit.
if (!distinctChannelIds?.length) {
  console.log(`no channels for daily update.`);
  return;
}

// Loop through each channel and show the daily leaderboard.
let promises = distinctChannelIds.map((channelId) => {
  return (async () => {
    return lib.slack.messages['@0.6.5'].create({
      id: channelId,
      blocks: await channelAccountsService.GetLeadersToday({channelId}),
    });
  })();
});

await Promise.allSettled(promises);

// NOTE: Don't run the following in parallel or we will likely hit rate limits.

// Reset daily amounts.
await channelAccountsService.ResetDailyAmounts();

// Apply decays.
await channelAccountsService.ApplyDecay({decayAmount: DAILY_DECAY});

// Apply incomes.
await channelAccountsService.ApplyIncome({incomeAmount: DAILY_INCOME});
