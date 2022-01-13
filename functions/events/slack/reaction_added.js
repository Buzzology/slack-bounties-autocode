// authenticates you with the API standard library
// type `await lib.` to display API autocomplete
const lib = require('lib')({token: process.env.STDLIB_SECRET_TOKEN});
const messageBountyService = require('../../../services/message_bounties_service');
const { BOOST_REACTIONS, TASK_COMPLETED_BY_ME_REACTION, RELEASE_BOUNTY_REACTION } = require('../../../utils/config.js');

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

// Check if it's a boost reaction.
if(BOOST_REACTIONS.some(x => x.emote === reactionEvent.reaction)){
  await messageBountyService.BoostBounty(
    reactionEvent.user,
    reactionEvent.item?.channel,
    reactionEvent.item?.ts,
    reactionEvent.reaction,
  );
  return;
}

// Check if it's a "task completed" reaction.
if(reactionEvent.reaction === TASK_COMPLETED_BY_ME_REACTION) {
  await messageBountyService.ClaimBounty(
    reactionEvent.user,
    reactionEvent.item?.channel,
    reactionEvent.item?.ts,
    reactionEvent.reaction,
  );
  return;
}

// Check if it's an "award bounty" reaction.
if (reactionEvent.reaction === RELEASE_BOUNTY_REACTION) {
  await messageBountyService.PrepareBountyAward({
    messageId: reactionEvent.item?.ts,
    targetUserId: null,
    currentUserId: reactionEvent.user,
    reaction: reactionEvent.reaction,
    channelId: reactionEvent.item?.channel,
  });
}

// `context` is automatically populated with HTTP request data
// you can modify `context.params` test data via [Payload] below

// endpoints are executed as functions, click [> Run] below to test
return;