// authenticates you with the API standard library
// type `await lib.` to display API autocomplete
const lib = require('lib')({token: process.env.STDLIB_SECRET_TOKEN});
const botMessagesService = require('../../../services/bot_messages_service');

// Retrieve our event.
const reactionEvent = context?.params?.event?.event;
if(!reactionEvent) {
  console.log("no reaction event provided.");
  return;
}

// Ensure that we're working with a message (we don't care about reactions on other entities).
if(reactionEvent.item?.type !== "message") {
  console.log(`skipping reaction on ${reactionEvent?.item?.type || "empty"} item type.`);
  return;
}

// Ensure that we've got a reaction.
if(!reactionEvent.reaction) {
  console.log("no reaction provided.");
  return;
}

// Remove any relevant bot messages that are no longer applicable.
await botMessagesService.RemoveSentBotMessageIfExists(
  reactionEvent.user,
  reactionEvent.reaction,
  reactionEvent.item?.ts,
  reactionEvent.item?.channel,
);



