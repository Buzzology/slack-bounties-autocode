const lib = require('lib')({token: process.env.STDLIB_SECRET_TOKEN});
const channelAccountsRepo = require('../db/channel_accounts_repo');
const {DAILY_INCOME, DOCUMENTATION_URL} = require('../utils/config');

/* getOrCreateChannelAccount retrieves an existing account for the user in the specified channel. If
an account doesn't exist, a new one is created. If it's the user's first account a welcome message 
is sent to them. */
const getOrCreateChannelAccount = async (userId, channelId) => {
  // Retrieve the channel account if it exists.
  let channelAccounts = await channelAccountsRepo.List({
    channel_id__is: channelId,
    user_id__is: userId,
  });

  // If a channel account exists we return it immediately.
  if (channelAccounts?.length) {
    return channelAccounts[0];
  }

  if (channelAccounts?.length < 1) {
    // If no channel account exist we need to create one.
    let createdChannelAccount = await channelAccountsRepo.Create({
      userId,
      channelId,
      balance: DAILY_INCOME,
    });

    // Send the user a welcome message.
    await lib.slack.messages['@0.6.5'].create({
      id: userId,
      text: `Welcome to SlackBounties! You'll start off with ${DAILY_INCOME} point and can earn more by completing bounties. Use slash commands in the relevant channel to see more details:
\t- _/bountyemotes_ to see the full list of emotes
\t- _/bountyme_ to see your details
\t- _/bountycurrent_ to see the current leaderboard.

Check out the following page for more info: ${DOCUMENTATION_URL}`,
    });
    
    return createdChannelAccount;
  }
};

/* award increases the specified users channel account balance. */
async function award(userId, channelId, amount) {
  // Ensure that the user actually has a channel account.
  await getOrCreateChannelAccount(userId, channelId);

  // Increase their balance.
  channelAccount = await channelAccountsRepo.Award(userId, channelId, amount);

  return channelAccount;
}

/* generateLeaderboardBlocks creates a leaderboard based on provided channel accounts. */
async function generateLeaderboardBlocks({title, leaders, balanceField}) {
  // Generate blocks for each leader.
  let leadersSection = leaders.map((x, i) => {
    return {
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text: `${i + 1}) <@${x.user_id}>`,
        },
        {
          type: 'mrkdwn',
          text: `${x[balanceField]} _points_`,
        },
      ]
    }
  });
  
  // If there are no leaders, generate a placeholder.
  if(!leadersSection?.length) {
    leadersSection = [{
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text: `_No bounties claimed yet_`,
        },
      ]
    }];
  }
  
  // Merge all the parts and return.
  return [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: title,
      },
    },
    {
      type: 'divider',
    },
    ...leadersSection,
  ];
}

/* getLeadersTodayBlocks retrieves todays leaders and generates the appropriate blocks. */
async function getLeadersTodayBlocks({channelId}) {
  // Retrieve today's leaders.
  const todaysLeaders = await channelAccountsRepo.GetLeadersToday({channelId});
  
  // Generate and then return relevant blocks.
  return generateLeaderboardBlocks({
    title: 'Today\'s Leaderboard',
    leaders: todaysLeaders,
    balanceField: 'earned_today',
  });
}

/* getLeadersThisIntervalBlocks retrieves current intervals leaders and generates the appropriate blocks. */
async function getLeadersThisIntervalBlocks({channelId}) {
  // Retrieve leaders.
  const leaders = await channelAccountsRepo.GetLeadersThisInterval({channelId});
  
  // Generate and then return relevant blocks.
  return generateLeaderboardBlocks({
    title: 'Final Leaderboard Results',
    leaders,
    balanceField: 'earned_this_interval',
  });
}

/* getLeadersAllTimeBlocks retrieves all time leaders and generates the appropriate blocks. */
async function getLeadersAllTimeBlocks({channelId}) {
  // Retrieve leaders.
  const leaders = await channelAccountsRepo.GetLeadersThisInterval({channelId});
  
  // Generate and then return relevant blocks.
  return generateLeaderboardBlocks({
    title: 'All Time Leaderboard',
    leaders,
    balanceField: 'earned_all_time',
  });
}

module.exports = {
  GetOrCreateChannelAccount: getOrCreateChannelAccount,
  Spend: channelAccountsRepo.Spend,
  Award: award,
  GetLeadersToday: getLeadersTodayBlocks,
  GetLeadersThisInterval: getLeadersThisIntervalBlocks,
  GetLeadersAllTime: getLeadersAllTimeBlocks,
  ResetDailyAmounts: channelAccountsRepo.ResetDailyAmounts,
  ResetIntervalAmounts: channelAccountsRepo.ResetIntervalAmounts,
  ApplyDecay: channelAccountsRepo.ApplyDecay,
  ApplyIncome: channelAccountsRepo.ApplyIncome,
  GetDistinctChannels: channelAccountsRepo.GetDistinctChannels,
};
