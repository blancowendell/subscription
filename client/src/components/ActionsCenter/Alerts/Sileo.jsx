import { sileo } from "sileo";
import { PiTicketBold } from "react-icons/pi";

/**
 * Centralized Toast Service using Sileo
 */

const buildPayload = (title, description) => ({
  title,
  ...(description && { description }),
});

export const showSuccessToast = (
  title = "Success",
  description = ""
) => {
  sileo.success(buildPayload(title, description));
};

export const showErrorToast = (
  title = "Error",
  description = ""
) => {
  sileo.error(buildPayload(title, description));
};

export const showWarningToast = (
  title = "Warning",
  description = ""
) => {
  sileo.warning(buildPayload(title, description));
};

export const showInfoToast = (
  title = "Info",
  description = ""
) => {
  sileo.info(buildPayload(title, description));
};

/**
 * Reusable Promise Toast
 */
export const showPromiseToast = (
  promise,
  {
    loadingTitle = "Processing...",
    loadingDescription = "",
    success,
    error,
  } = {}
) => {
  return sileo.promise(promise, {
    loading: buildPayload(loadingTitle, loadingDescription),

    success: (response) => {
      if (typeof success === "function") {
        return success(response);
      }

      return buildPayload(
        success?.title || "Completed",
        success?.description || ""
      );
    },

    error: (err) => {
      if (typeof error === "function") {
        return error(err);
      }

      return buildPayload(
        error?.title || "Failed",
        error?.description || ""
      );
    },
  });
};

export const showActionToast = ({
  type = "info",
  title = "Notice",
  description = "",
  button,
}) => {
  const payload = {
    title,
    ...(description && { description }),
    ...(button && { button }),
  };

  if (button) {
    sileo.action(payload);
  } else {
    sileo[type](payload);
  }
};

export const showTicketNotification = (ticketId, customerName = "A customer") => {
  sileo.action({
    title: "New Support Request",
    description: `Ticket #${ticketId} submitted by ${customerName}.`,
    // This adds the icon to the side of the toast
    icon: <PiTicketBold size={24} style={{ color: "var(--main-color)" }} />,
    position: "top-right",
    duration: 5000, // 5 seconds
  });
};