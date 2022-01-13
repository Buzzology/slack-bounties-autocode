const lib = require('lib')({token: process.env.STDLIB_SECRET_TOKEN});
const botMessagesRepo = require('../db/bot_messages_repo');

/* sendRemovableBotMessage sends a message to the user and allows for it to be removed it the action is corrected. */
async function sendRemovableBotMessage(targetUserId, targetReaction, threadTs, channelId, text) {
  // Save the message if we've been provided with a reaction.
  if(targetReaction) {
    let createdMessage = await lib.slack.messages['@0.6.5'].create({
      id: channelId,
      text: `${text}\n\n_Removing the :${targetReaction}: emote will delete this message._`,
      thread_ts: threadTs,
    });
    
    await botMessagesRepo.Create(
      threadTs, 
      createdMessage.message.ts,
      channelId,
      targetReaction,
      targetUserId,
    )
  } else {
    // Otherwise, just send a PM.
    await lib.slack.messages['@0.6.5'].create({
      id: targetUserId,
      text,
    });
  }
}

/* RemoveSentBotMessageIfExists removes any bot messages that are no longer relevant. */
async function removeSentBotMessageIfExists(
  targetUserId,
  targetReaction,
  targetMessageId,
  targetChannelId,
) {
  // Remove from airtable as well.
  let deletedMessages = await botMessagesRepo.Remove(
    targetUserId,
    targetReaction,
    targetMessageId,
    targetChannelId,
  );
  
  // If there was anything to delete we'll also need to remove it from slack.
  if (deletedMessages?.length) {
    await Promise.allSettled(deletedMessages.map(x => {
      return lib.slack.messages['@0.6.5'].destroy({
        id: x.channel_id,
        ts: x.sent_message_id,
        as_user: false,
      });
    }));
  }
}

module.exports = {
  SendRemovableBotMessage: sendRemovableBotMessage,
  RemoveSentBotMessageIfExists: removeSentBotMessageIfExists,
};