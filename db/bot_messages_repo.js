const lib = require('lib')({token: process.env.STDLIB_SECRET_TOKEN});
const { v4: uuidv4 } = require('uuid');

/* list retrieves any bot messages that match the provided filter from airtable. */
async function list(filter = {}, pageSize, pageToken, order) {
  // Retrieve any matching bot messages from airtable.
  let botMessages = await lib.airtable.query["@1.0.0"].select({
    table: 'bot_messages',
    where: [filter]
  });
  
  return botMessages?.rows;
};

/* create is used to add a new bot message to airtable. */
async function create(
  messageId,
  sentMessageId,
  channelId,
  reaction,
  targetUserId,
) {
  let createdBotMessage = await lib.airtable.query['@1.0.0'].insert({
    table: `bot_messages`,
    fieldsets: [
      {
        'id': uuidv4(),
        'sent_message_id': sentMessageId,
        'message_id': messageId,
        'channel_id': channelId,
        'reaction': reaction,
        'target_user_id': targetUserId,
        'created': new Date().toISOString(),
        'updated': new Date().toISOString(),
      }
    ],
    typecast: true
  });
  
  return createdBotMessage?.rows?.[0]?.fields;
}

/* delete removes the relevant bot message if it exists. */
async function remove(
  targetUserId,
  targetReaction,
  targetMessageId,
  targetChannelId,
){
  let deletedBotMessages = await lib.airtable.query['@1.0.0'].delete({
    table: `bot_messages`,
    where: [{
      'message_id__is': targetMessageId,
      'channel_id__is': targetChannelId,
      'reaction__is': targetReaction,
      'target_user_id__is': targetUserId,
    }]
  });
  
  return deletedBotMessages?.rows?.map(x => x.fields);
}

module.exports = {
  List: list,
  Create: create,
  Remove: remove,
}