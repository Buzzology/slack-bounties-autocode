const lib = require('lib')({token: process.env.STDLIB_SECRET_TOKEN});
const { MESSAGE_BOUNTY_STATUSES } = require('../utils/constants');

/* list retrieves any message bounties that match the provided filter. */
async function list(filter = {}, pageSize, pageToken, order) {
   // Retrieve any matching message bounties from airtable.
   let messageBounties = await lib.airtable.query["@1.0.0"].select({
     table: 'message_bounties',
     where: [filter]
   });
   
   return messageBounties?.rows?.map(x => x.fields);
 };

/* getByMessageId retrieves a specific bounty by message id. */
async function getByMessageId(messageId) {
  // Retrieve the mesage bounty from airtable.
   let messageBounties = await lib.airtable.query["@1.0.0"].select({
     table: 'message_bounties',
     where: [{
      'message_id__is': messageId,
    }]
   });
  
  return messageBounties?.rows?.[0]?.fields;
}

/* create is used to add a new message bounty to airtable. */
async function create(
  messageId,
  userId,
  channelId,
  currentBounty,
  status,
  awardedTo,
) {
  let createdMessageBounty = await lib.airtable.query['@1.0.0'].insert({
    table: `message_bounties`,
    fieldsets: [
      {
        'message_id': messageId,
        'user_id': userId,
        'channel_id': channelId,
        'current_bounty': currentBounty,
        'status': status,
        'awarded_to': awardedTo,
      }
    ],
    typecast: true
  });
  
  return createdMessageBounty?.fields;
}

/* create is used to add a new bot message to airtable. */
async function boostBounty( 
  messageId,
  boostAmount,
) {
  let messageBounty = await getByMessageId(messageId);
  if (!messageBounty) {
    throw new Error(`message bounty not found when attempting to boost: ${messageId}`);
  }
  
  // Update the message bounties current balance.
  let updatedMessageBounties = await lib.airtable.query["@1.0.0"].update({
    table: 'message_bounties',
    where: [{
      'message_id__is': messageId,
    }],
    fields: {
      'current_bounty': (messageBounty.current_bounty || 0) + boostAmount,
    }
  });
  
  // Ensure that we actually update something.
  if(!updatedMessageBounties?.rows?.length){
    throw new Error(`failed to boost bounty for: ${messageId}`);
  } else if (updatedMessageBounties.rows.length > 1) {
    throw new Error(`should only have updated a single row when boosting: ${messageId}`);
  }
  
  return updatedMessageBounties.rows[0].fields;
}

/* claimBounty marks a bounty as claimed by the specified user. */
async function claimBounty(messageId, userId) {
  // Update the message bounties "awarded_to" value.
  let updatedMessageBounties = await lib.airtable.query["@1.0.0"].update({
    table: 'message_bounties',
    where: [{
      'message_id__is': messageId,
    }],
    fields: {
      'awarded_to': userId,
    }
  });
  
  // Ensure that we actually update something.
  if(!updatedMessageBounties?.rows?.length){
    throw new Error(`failed to award bounty for: ${messageId}`);
  } else if (updatedMessageBounties.rows.length > 1) {
    throw new Error(`should only have updated a single row when awarded: ${messageId}`);
  }
  
  return updatedMessageBounties.rows[0].fields;
}

/* awardBounty marks a bounty as awarded to the specified user. */
async function awardBounty(messageId, channelId, targetUserId) {
  // Update the message bounties "awarded_to" value.
  let updatedMessageBounties = await lib.airtable.query["@1.0.0"].update({
    table: 'message_bounties',
    where: [{
      'message_id__is': messageId,
      'channel_id__is': channelId,
    }],
    fields: {
      'awarded_to': targetUserId,
      'status': MESSAGE_BOUNTY_STATUSES.AWARDED,
    }
  });
  
  // Ensure that we actually update something.
  if(!updatedMessageBounties?.rows?.length){
    throw new Error(`failed to award bounty for: ${messageId}`);
  } else if (updatedMessageBounties.rows.length > 1) {
    throw new Error(`should only have updated a single row when awarded: ${messageId}`);
  }
  
  return updatedMessageBounties.rows[0].fields;
}
 
 module.exports = {
   List: list,
   Create: create,
   ClaimBounty: claimBounty,
   AwardBounty: awardBounty,
   BoostBounty: boostBounty,
   GetByMessageId: getByMessageId,
 }