const React = require("react");
const { findByProps, findByCode } = require("vendetta/metro/common");
const { before } = require("vendetta/patcher");
const { FluxDispatcher } = require("vendetta/metro/common");
const { getByProps } = require("vendetta/utils");

// Stores
const MessageStore = findByProps("getMessage");
const ChannelStore = findByProps("getChannel");

// Patch array for cleanup
let patches = [];

function start() {
  // Patch dispatcher for MESSAGE_DELETE: Prevent deletion, mark as deleted, modify content for red "deleted" display
  patches.push(before("dispatch", FluxDispatcher, (args) => {
    const [action] = args;
    if (action.type === "MESSAGE_DELETE") {
      const { channelId, id: messageId } = action;
      const message = MessageStore.getMessage(channelId, messageId);
      if (message && !message.isDeleted) {
        // Set flags and modify content (original + red diff markdown for deleted look)
        message.isDeleted = true;
        message.deletedAt = Date.now();
        const originalContent = message.content || "";
        message.content = `**This message is deleted!**\n\`\`\`diff\n- ${originalContent}\n\`\`\``;
        // Attachments (images/files) stay intact since we don't delete the message
        // Skip the actual dispatch to keep message in store
        return undefined; // This skips the original dispatch call
      }
    }

    // Patch for MESSAGE_UPDATE: Save edit history temporarily
    if (action.type === "MESSAGE_UPDATE") {
      const updatedMessage = action.message;
      const { id: messageId, channel_id: channelId } = updatedMessage;
      const oldMessage = MessageStore.getMessage(channelId, messageId);
      if (oldMessage && oldMessage.content !== updatedMessage.content && !oldMessage.isDeleted) {
        if (!oldMessage.edits) oldMessage.edits = [];
        oldMessage.edits.unshift({
          content: oldMessage.content,
          timestamp: Date.now(),
        });
        // Let the update proceed normally (new content overwrites, but history is saved)
      }
    }
  }));

  // Optional: Patch message render for custom edit history display (extend here if needed)
  // Find the MessageContent component (search by code for "edited" timestamp)
  const MessageContent = findByCode("renderEmojis", "Markdown");
  if (MessageContent) {
    const originalRender = MessageContent.prototype.render;
    MessageContent.prototype.render = function (...args) {
      const result = originalRender.call(this, ...args);
      const message = this.props.message; // Assuming props has message
      if (message && message.edits && message.edits.length > 0) {
        // Append edit history as a small note (e.g., React fragment)
        const history = message.edits.map(edit => (
          <React.Fragment key={edit.timestamp}>
            <span style={{ color: "gray", fontSize: 10 }}> (orig: {edit.content.slice(0, 20)}...)</span>
          </React.Fragment>
        ));
        // Insert after content (simplified; adjust based on component structure)
        return React.cloneElement(result, {}, ...React.Children.toArray(result.props.children), history);
      }
      return result;
    };
  }

  // Optional: Patch message wrapper for red background on deleted (find Message wrapper component)
  const MessageWrapper = findByCode("type:Message", "compact");
  if (MessageWrapper) {
    const originalRender = MessageWrapper.prototype.render;
    MessageWrapper.prototype.render = function (...args) {
      const result = originalRender.call(this, ...args);
      const message = this.props.message;
      if (message && message.isDeleted) {
        // Add red tint to the message bubble (via style prop)
        const style = { ...result.props.style, backgroundColor: "rgba(255, 0, 0, 0.1)" };
        return React.cloneElement(result, { style });
      }
      return result;
    };
  }
}

function stop() {
  for (const unpatch of patches) {
    unpatch();
  }
  patches = [];
}

module.exports = {
  start,
  stop,
  // Vendetta metadata (matches manifest)
  name: "antied test",
  description: "Keeps a temporary record of deleted messages and any edits until you reload the app.",
  authors: [{ name: "Angelw0lf", id: "692632336961110087" }],
};
