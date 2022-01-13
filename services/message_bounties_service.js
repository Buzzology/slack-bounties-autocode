const lib = require('lib')({token: process.env.STDLIB_SECRET_TOKEN});
const channelAccountsService = require('./channel_accounts_service');
const messageBountiesRepo = require('../db/message_bounties_repo');
const {MESSAGE_BOUNTY_STATUSES} = require('../utils/constants');
const {BOOST_REACTIONS} = require('../utils/config');
const botMessagesService = require('./bot_messages_service');

/* claimBounty is performed by the task completer. The bounty is not awarded until confirmed by the bounty owner. */
async function claimBounty(userId, channelId, messageId, reaction) {
  // Retrieve the message bounty.
  let messageBounty = await messageBountiesRepo.GetByMessageId(messageId);
  if (!messageBounty) {
    throw new Error(
      `Message bounty not found when claiming bounty: ${messageId}, ${userId}`
    );
  }

  // Ensure that the message bounty is still open.
  if (messageBounty.status !== MESSAGE_BOUNTY_STATUSES.PENDING) {
    await botMessagesService.SendRemovableBotMessage(
      userId,
      reaction,
      messageId,
      channelId,
      `Heads up <@${userId}>! This bounty is not able to be claimed.`
    );
    return;
  }

  // Claim the bounty.
  await messageBountiesRepo.ClaimBounty(messageId, userId);

  // Send a message to the thread.
  await lib.slack.messages['@0.6.5'].create({
    id: channelId,
    text: `<@${userId}> is ready to claim the bounty.`,
    thread_ts: messageId,
  });
  return;
}

// generateAwardBountyToUserBlocks creates an interaction message that can be sent to the user
// in order to award a bounty.
function generateAwardBountyToUserBlocks({
  channelId,
  bountyAmount,
  targetUserId,
  messageId,
}) {
  // This is normally the starting point (where the medal emote is added).
  return [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: 'Award Bounty',
        emoji: true,
      },
    },
    {
      type: 'section',
      block_id: 'award_user',
      text: {
        type: 'mrkdwn',
        text: `Award the ${bountyAmount} point bounty to:`,
      },
      accessory: {
        action_id: 'user_to_award',
        type: 'users_select',
        initial_user: targetUserId,
        placeholder: {
          type: 'plain_text',
          text: 'Select a user',
        },
      },
    },
    {
      type: 'actions',
      block_id: 'award_bounty_confirm', // NOTE: This is what maps to the endpoint.
      elements: [
        {
          type: 'button',
          text: {
            type: 'plain_text',
            emoji: true,
            text: 'Confirm',
          },
          value: messageId,
          style: 'primary',
        },
      ],
    },
  ];
}

/* generateAwardBountyToUserSuccessBlocks shows a success message to the user. */
function generateAwardBountyToUserSuccessBlocks({
  channelId,
  bountyAmount,
  targetUserId,
  messageId,
  successMessage,
}) {
  successMessage = successMessage || `${bountyAmount} point bounty awarded to <@${targetUserId}>`;
  
  return [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: 'Award Bounty',
        emoji: true,
      },
    },
    {
      type: 'divider',
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text:  `:white_check_mark: ${successMessage}`,
      },
    },
    {
      type: 'divider',
    },
  ];
}

/* generateAwardBountyToUserValidationBlocks generates the award bounty interactive message along
with a validation error. */
function generateAwardBountyToUserValidationBlocks({
  channelId,
  bountyAmount,
  targetUserId,
  messageId,
  validationError,
}) {
  // Retrieve the base template.
  let initialBlocks = generateAwardBountyToUserBlocks({
    channelId,
    bountyAmount,
    targetUserId,
    messageId,
  });

  // Add a validation error to the end of it.
  return [
    ...initialBlocks,
    {
      type: 'divider',
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `:warning: _*${validationError}*_`,
      },
    },
    {
      type: 'divider',
    },
  ];
}

/* prepareBountyAward sends the current user an ephemeral message to confirm the bounty award. */
async function prepareBountyAward({
  messageId,
  targetUserId,
  currentUserId,
  reaction,
  channelId,
}) {
  // Retrieve the message bounty.
  let messageBounty = await messageBountiesRepo.GetByMessageId(messageId);
  if (!messageBounty) {
    // NOTE: This will occur if people user the same emote for other "non-bounty" messages.
    console.log(
      `message bounty not found when awarding bounty: ${messageId}, ${currentUserId}`
    );
    return;
  }

  // Ensure that the message bounty hasn't already been awarded.
  if (messageBounty.status !== MESSAGE_BOUNTY_STATUSES.PENDING) {
    await botMessagesService.SendRemovableBotMessage(
      currentUserId,
      reaction,
      messageId,
      channelId,
      `Heads up <@${currentUserId}>! This bounty has already been awarded to <@${messageBounty.awarded_to}>.`
    );
    return;
  }

  // Ensure that the owner of the bounty is the one who awards it.
  if (messageBounty.user_id != currentUserId) {
    await botMessagesService.SendRemovableBotMessage(
      currentUserId,
      reaction,
      messageId,
      channelId,
      `Heads up <@${currentUserId}>! This bounty can only be awarded by <@${messageBounty.user_id}> .`
    );
    return;
  }

  // Ensure that the user isn't giving it to themself.
  if (currentUserId === messageBounty.awarded_to) {
    await botMessagesService.SendRemovableBotMessage(
      currentUserId,
      reaction,
      messageId,
      channelId,
      `Heads up <@${currentUserId}>! You cannot award a bounty to yourself.`
    );
    return;
  }

  // Send a message to the current user confirming who should be awarded the bounty.
  // TODO: Ideally we want to be able to provided thread_ts here but it doesn't seem to
  // be available via autocode (is in the Slack spec). Check in Discord later.
  await lib.slack.messages['@0.6.5'].ephemeral.create({
    channelId,
    userId: currentUserId,
    threadTs: messageId,
    blocks: generateAwardBountyToUserBlocks({
      channelId,
      bountyAmount: messageBounty.current_bounty,
      messageId,
      currentUserId,
    }),
  });
}

/* awardBounty gives the current bounty on a message to the target user. If a user is not
provided we will check if someone has attemped to claim it instead. */
async function awardBounty({
  messageId,
  targetUserId,
  currentUserId,
  channelId,
  messageIdToDelete,
}) {
  // Retrieve the message bounty.
  let messageBounty = await messageBountiesRepo.GetByMessageId(messageId);
  if (!messageBounty) {
    throw new Error(
      `message bounty not found when awarding bounty: ${messageId}, ${currentUserId}`
    );
  }

  // Ensure that the message bounty hasn't already been awarded.
  if (messageBounty.status !== MESSAGE_BOUNTY_STATUSES.PENDING) {
    return generateAwardBountyToUserSuccessBlocks({
      channelId,
      bountyAmount: messageBounty.current_bounty,
      messageId,
      targetUserId: messageBounty.awarded_to,
      successMessage: `This bounty has already been awarded to <@${messageBounty.awarded_to}>.`,
    });
  }

  // If there's no target user ensure that someone has claimed it.
  if (!targetUserId) {
    return generateAwardBountyToUserValidationBlocks({
      channelId,
      bountyAmount: messageBounty.current_bounty,
      messageId,
      currentUserId,
      validationError: `You need to pick a user to award the bounty.`,
    });
  } else {
    messageBounty.awarded_to = targetUserId;
  }

  // Ensure that the owner of the bounty is the one who awards it.
  if (messageBounty.user_id != currentUserId) {
    return generateAwardBountyToUserValidationBlocks({
      channelId,
      bountyAmount: messageBounty.current_bounty,
      messageId,
      targetUserId: messageBounty.awarded_to,
      validationError: `This bounty can only be awarded by <@${messageBounty.user_id}>.`,
    });
  }

  // Ensure that the user isn't giving it to themself.
  if (currentUserId === messageBounty.awarded_to) {
    return generateAwardBountyToUserValidationBlocks({
      channelId,
      bountyAmount: messageBounty.current_bounty,
      messageId,
      targetUserId: messageBounty.awarded_to,
      validationError: `You cannot award a bounty to yourself. Please select a difference user.`,
    });
  }

  // Mark the bounty as awarded.
  await messageBountiesRepo.AwardBounty(
    messageId,
    channelId,
    messageBounty.awarded_to
  );

  // Award the bounty.
  await channelAccountsService.Award(
    messageBounty.awarded_to,
    channelId,
    messageBounty.current_bounty
  );

  // Post reply to message that the bounty has been awarded tagging the awarder.
  await lib.slack.messages['@0.6.5'].create({
    id: channelId,
    text: `<@${currentUserId}> has awarded the bounty of ${messageBounty.current_bounty} to <@${targetUserId}>.`,
    thread_ts: messageId,
  });

  return generateAwardBountyToUserSuccessBlocks({
    channelId,
    bountyAmount: messageBounty.current_bounty,
    messageId,
    targetUserId: messageBounty.awarded_to,
    successMessage: null,
  });
}

/* boostBounty increases the bounty being offered on a message. If the bounty does not
exist it will be created. */
async function boostBounty(userId, channelId, messageId, reaction) {
  // Retrieve the relevant boost reaction.
  var boostReaction = BOOST_REACTIONS.find((x) => x.emote === reaction);
  if (!boostReaction) {
    throw new Error(`Boost reaction not found: ${reaction}`);
  }

  // To start, ensure that the user has an account that they can use.
  let channelAccount = await channelAccountsService.GetOrCreateChannelAccount(
    userId,
    channelId
  );
  if (!channelAccount) {
    throw new Error(
      `failed to find or create a channel account for the provided user: ${userId}, ${channelId}`
    );
  }

  // Ensure that the user has a balance that is able to give this reward.
  if (channelAccount.balance < boostReaction.boostValue) {
    // Send a removable bot message saying that the user does have a high enough balance.
    await botMessagesService.SendRemovableBotMessage(
      userId,
      boostReaction.emote,
      messageId,
      channelId,
      `Heads up <@${userId}>! Your balance isn't high enough to award :${boostReaction.emote}:.`
    );
    return;
  }

  // Check if there's an existing bounty for the message.
  let messageBounties = await messageBountiesRepo.List({
    channel_id__is: channelId,
    message_id__is: messageId,
  });

  // If there's no existing bounty for this message we need to create one.
  let messageBounty;
  if (!messageBounties?.length) {
    messageBounty = await messageBountiesRepo.Create(
      messageId,
      userId,
      channelId,
      0,
      MESSAGE_BOUNTY_STATUSES.PENDING
    );
  } else {
    // Use the existing bounty.
    messageBounty = messageBounties[0];

    // Ensure that the bounty hasn't already been awarded.
    if (messageBounty.awarded_to) {
      await botMessagesService.SendRemovableBotMessage(
        userId,
        boostReaction.emote,
        messageId,
        channelId,
        `Heads up <@${userId}>! This bounty has already been awarded to <@${messageBounty.awarded_to}>. Remove your emote to delete this message.`
      );
      return;
    }
  }

  // Deduct from the user's balance.
  await channelAccountsService.Spend(
    userId,
    channelId,
    boostReaction.boostValue,
    boostReaction.emote
  );

  // Boost the message bounty.
  let boostedMessageBounty = await messageBountiesRepo.BoostBounty(
    messageId,
    boostReaction.boostValue
  );

  // Acknowledge the bounty in chat.
  await lib.slack.messages['@0.6.5'].create({
    id: channelId,
    text: `<@${userId}> has boosted the bounty to ${boostedMessageBounty.current_bounty}.`,
    thread_ts: messageId,
  });
}

module.exports = {
  BoostBounty: boostBounty,
  ClaimBounty: claimBounty,
  AwardBounty: awardBounty,
  PrepareBountyAward: prepareBountyAward,
};
