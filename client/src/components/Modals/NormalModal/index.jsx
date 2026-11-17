import { Modal, Button } from "antd";

const NormalModal = ({
  open,
  title = "Modal",
  children,
  confirmText = "Proceed",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
  hideCancel = false,
  width = 600,
  loading = false,
  zIndex = 1000,
  confirmBtnClass = "",
}) => {
  return (
    <Modal
      title={<span className="dark:text-white font-semibold">{title}</span>}
      open={open}
      onCancel={onCancel}
      centered
      maskClosable={false}
      width={width}
      zIndex={zIndex}
      focusTriggerAfterClose={false}
      styles={{
        content: {
          backgroundColor: "white",
          padding: "24px",
          borderRadius: "12px",
        },
        header: {
          backgroundColor: "transparent",
          marginBottom: "20px",
        },
        body: {
          backgroundColor: "transparent",
        },
        footer: {
          marginTop: "24px",
        },
      }}
      wrapClassName="custom-modal-stack"
      className="dark:bg-slate-900 rounded-xl overflow-hidden"
      footer={[
        !hideCancel && (
          <Button
            key="cancel"
            onClick={onCancel}
            className="bg-transparent dark:bg-slate-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-slate-600 hover:!border-blue-500 hover:!text-blue-500 transition-all"
          >
            {cancelText}
          </Button>
        ),
        onConfirm && (
          <Button
            key="confirm"
            type="primary"
            loading={loading}
            disabled={loading}
            onClick={onConfirm}
            className={`font-medium transition-all hover:opacity-90 active:scale-95 ${confirmBtnClass}`}
            style={{
              backgroundColor: "var(--main-color)",
              color: "var(--main-text-color)",
              border: "none",
              boxShadow: "0 4px 10px rgba(0, 0, 0, 0.1)",
            }}
          >
            {confirmText}
          </Button>
        ),
      ]}
    >
      <div className="dark:text-gray-300 text-sm leading-relaxed">
        {children}
      </div>
    </Modal>
  );
};

export default NormalModal;