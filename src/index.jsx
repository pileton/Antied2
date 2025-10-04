        const DismissButton = (
          <button
            onClick={() => {
              message.dismissed = true;
              // Force re-render by dispatching a dummy update (or use setState if available; this simulates flux update)
              FluxDispatcher.dispatch({ type: "MESSAGE_UPDATE", message: { ...message } });
            }}
            style={{
              position: "absolute",
              top: "4px",
              right: "4px",
              background: "rgba(240, 71, 71, 0.8)", // Red tint
              color: "white",
              border: "none",
              borderRadius: "3px",
              padding: "2px 6px",
              fontSize: "12px",
              cursor: "pointer",
              zIndex: 10,
            }}
          >
            Dismiss
          </button>
        );

        // Clone and add button as a child (positioned absolutely over the message)
        const childrenWithButton = React.Children.toArray(result.props.children);
        childrenWithButton.push(DismissButton);
        return React.cloneElement(result, { style, children: childrenWithButton });
      } else if (message && message.isDeleted && message.dismissed) {
        // Hide dismissed deleted messages (return null or empty div for ephemeral removal)
        return <div style={{ height: 0, overflow: "hidden" }} />; // Collapses space
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
  name: "Cute Moodle v1.4.4",
  description: "Keeps a temporary record of deleted messages and any edits until you reload the app.",
  authors: [{ name: "Angelw0lf", id: "692632336961110087" }],
};
