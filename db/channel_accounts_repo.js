const lib = require('lib')({token: process.env.STDLIB_SECRET_TOKEN});
const { v4: uuidv4 } = require('uuid');
const { LEADERS_TO_SHOW } = require('../utils/config');

/* list retrieves any channel accounts that match the provided filter from airtable. */
async function list(filter = {}, pageSize, pageToken, order) {
  // Retrieve any matching channel accounts from airtable.
  let channelAccounts = await lib.airtable.query["@1.0.0"].select({
    table: 'channel_accounts',
    where: [filter]
  });
  
  return channelAccounts?.rows?.map(x => x.fields);
};

/* create is used to add a new channel account to airtable. */
async function create({
  userId,
  channelId,
  balance,
}) {
  let createdMessageBounty = await lib.airtable.query['@1.0.0'].insert({
    table: `channel_accounts`,
    fieldsets: [
      {
        'id': uuidv4(),
        'user_id': userId,
        'channel_id': channelId,
        'balance': balance,
        'created': new Date().toISOString(),
        'updated': new Date().toISOString(),
      }
    ],
    typecast: true
  });
  
  return createdMessageBounty?.rows?.[0]?.fields;
}

/* getByChannelIdAndUserId retrieves a channel account for specific user and channel. */
async function getByChannelIdAndUserId(
  channelId,
  userId,
) {
  let channelAccounts = await lib.airtable.query["@1.0.0"].select({
    table: 'channel_accounts',
    where: [{
      'channel_id__is': channelId,
      'user_id__is': userId,
    }]
  });
  
  return channelAccounts?.rows?.[0]?.fields;
}

/* spend updates a channel account to reflect a new spend amount. */
async function spend(
  userId,
  channelId,
  spendAmount,
) {
  // Retrieve the channel account we need to work with.
  let channelAccount = await getByChannelIdAndUserId(channelId, userId);
  if(!channelAccount) {
    throw new Error(`channel account not found for: ${userId}, ${channelId}`);
  }
  
  // Update the channel account's spend values.
  let updatedChannelAccounts = await lib.airtable.query["@1.0.0"].update({
    table: 'channel_accounts',
    where: [{
      'channel_id__is': channelId,
      'user_id__is': userId,
    }],
    fields: {
      'balance': channelAccount.balance - spendAmount,
      'spent_today': channelAccount.spent_today + spendAmount,
      'spent_this_interval': channelAccount.spent_this_interval + spendAmount,
      'spent_all_time': channelAccount.spent_all_time + spendAmount,
    }
  });
  
  // Ensure that we actually updates something.
  if(!updatedChannelAccounts?.rows?.length){
    throw new Error(`failed to spend for: ${userId}, ${channelId}, ${spendAmount}`);
  } else if (updatedChannelAccounts.rows.length > 1) {
    throw new Error(`should only have updated a single row when spending: ${userId}, ${channelId}, ${spendAmount}`);
  }
  
  return updatedChannelAccounts.rows[0].fields;
}

/* award increases the users balance and associated metrics. */
async function award(
  userId,
  channelId,
  amount,
) {
  // Retrieve the channel account we need to work on.
  let channelAccount = await getByChannelIdAndUserId(channelId, userId);
  if(!channelAccount) {
    throw new Error(`Channel account not found for award: ${userId}, ${channelId}`);
  }
  
  // Update all of the relevant balances and earning trackers.
  let updatedChannelAccounts = await lib.airtable.query["@1.0.0"].update({
    table: 'channel_accounts',
    where: [{
      'channel_id__is': channelId,
      'user_id__is': userId,
    }],
    fields: {
      'balance': (channelAccount.balance || 0) + amount,
      'earned_today': (channelAccount.earned_today || 0) + amount,
      'earned_this_interval': (channelAccount.earned_this_interval || 0) + amount,
      'earned_all_time': (channelAccount.earned_all_time || 0) + amount,
    }
  });
  
  // Ensure that we actually updates something.
  if(!updatedChannelAccounts?.rows?.length){
    throw new Error(`failed to award for: ${userId}, ${channelId}, ${amount}`);
  } else if (updatedChannelAccounts.rows.length > 1) {
    throw new Error(`should only have updated a single row when awarding: ${userId}, ${channelId}, ${amount}`);
  }
  
  return updatedChannelAccounts.rows[0].fields;
}


/* getLeadersToday retrieves todays leaders for a channel. */
async function getLeadersToday({
  channelId,
}) {
  // Send request to airtable.
  let channelAccounts = await lib.airtable.query['@1.0.0'].select({
    table: `channel_accounts`,
    where: [
      {
        'channel_id__is': channelId,
        'earned_today__gt': `0`
      },
    ],
    limit: {
      'count': LEADERS_TO_SHOW,
      'offset': 0
    },
    view: `earned_today_descending`,
  });
  
  return channelAccounts?.rows?.map(x => x.fields);
}

/* getLeadersThisInterval retrieves this intervals leaders for a channel. */
async function getLeadersThisInterval({
  channelId,
}) {
  // Send request to airtable.
  let channelAccounts = await lib.airtable.query['@1.0.0'].select({
    table: `channel_accounts`,
    where: [
      {
        'channel_id__is': channelId,
        'earned_this_interval__gt': `0`
      },
    ],
    limit: {
      'count': LEADERS_TO_SHOW,
      'offset': 0
    },
    view: `earned_this_interval_descending`,
  });
  
  return channelAccounts?.rows?.map(x => x.fields);
}

/* getLeadersAllTime retrieves all time leaders for a channel. */
async function getLeadersAllTime({
  channelId,
}) {
  // Send request to airtable.
  let channelAccounts = await lib.airtable.query['@1.0.0'].select({
    table: `channel_accounts`,
    where: [
      {
        'channel_id__is': channelId,
        'earned_all_time__gt': `0`
      },
    ],
    limit: {
      'count': LEADERS_TO_SHOW,
      'offset': 0
    },
    view: `earned__all_time_descending`,
  });
  
  return channelAccounts?.rows?.map(x => x.fields);
}

/* resetDailyAmounts updates all channel account daily values. */
async function resetDailyAmounts() {
  // Reset all daily trackers.
  let updatedChannelAccounts = await lib.airtable.query["@1.0.0"].update({
    table: 'channel_accounts',
    fields: {
      'spent_today': 0,
      'earned_today': 0,
    }
  });
  
  return updatedChannelAccounts?.rows?.map(x => x.fields);
}

/* resetIntervalAmounts updates all channel account interval values. */
async function resetIntervalAmounts() {
  // Reset all interval trackers.
  let updatedChannelAccounts = await lib.airtable.query["@1.0.0"].update({
    table: 'channel_accounts',
    fields: {
      'spent_this_interval': 0,
      'earned_this_interval': 0,
    }
  });
  
  return updatedChannelAccounts?.rows?.map(x => x.fields);
}

/* applyDecay updates all channel account balances with the appropriate decay. */
async function applyDecay({
  decayAmount,
}) {
  // Retrieve all channel accounts where balance is greater than zero.
  // NOTE: This is pretty bad, but there are no inline update support in airtable yet. 
  // May need to batch these if there are ever too many rows.
  const channelAccounts = (await lib.airtable.query["@1.0.0"].select({
    table: 'channel_accounts',
    where: [
      {
        'balance__gt': 0,
      },
    ],
  }))?.rows?.map(x => x.fields)
  
  if(!channelAccounts?.length){
    console.log('no channel accounts require decay to be applied.')
    return;
  }
  
  // Update each of the relevant rows.
  await Promise.allSettled(
    channelAccounts.map(channelAccount => {
      return lib.airtable.query['@1.0.0'].update({
        table: `channel_accounts`,
        where: [
          {
            'channel_id__is': channelAccount.channel_id,
            'user_id__is': channelAccount.user_id,
          },
        ],
        fields: {
          'balance': (channelAccount.balance || 0) > decayAmount ? channelAccount.balance - decayAmount : 0,
        },
      });
    })
  );
  
  return;
}

/* applyIncome updates all channel account balances with the appropriate income. */
async function applyIncome({
  incomeAmount,
}) {
  // NOTE: This is pretty bad, but there are no inline update support in airtable yet. 
  // May need to batch these if there are ever too many rows.
  const channelAccounts = (await lib.airtable.query["@1.0.0"].select({
    table: 'channel_accounts',
  }))?.rows?.map(x => x.fields) || [];
  
  // Update each of the relevant rows.
  await Promise.allSettled(
      channelAccounts.map(channelAccount => {
        return lib.airtable.query['@1.0.0'].update({
          table: `channel_accounts`,
          where: [
            {
              'channel_id__is': channelAccount.channel_id,
              'user_id__is': channelAccount.user_id,
            },
          ],
          fields: {
            'balance': (channelAccount.balance || 0) + incomeAmount,
          },
        });
    })
  );
  
  return;
}

/* getDistinctChannels returns an array of all distinct channels in airtable. */
async function getDistinctChannels() {
  const distinctChannels = await lib.airtable.query['@1.0.0'].distinct({
    table: `channel_accounts`,
    field: `channel_id`
  });
  
  console.log(JSON.stringify(distinctChannels, null, 4))
  
  return distinctChannels?.distinct?.values;
}

module.exports = {
  List: list,
  Create: create,
  Spend: spend,
  Award: award,
  GetLeadersToday: getLeadersToday,
  GetLeadersThisInterval: getLeadersThisInterval,
  GetLeadersAllTime: getLeadersAllTime,
  ResetDailyAmounts: resetDailyAmounts,
  ResetIntervalAmounts: resetIntervalAmounts,
  ApplyDecay: applyDecay,
  ApplyIncome: applyIncome,
  GetDistinctChannels: getDistinctChannels,
}