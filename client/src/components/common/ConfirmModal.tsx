import type { ReactNode } from 'react';
import { Modal } from 'antd';

interface ConfirmModalProps {
  open: boolean;
  title: string;
  content?: ReactNode;
  okText?: string;
  danger?: boolean;
  confirmLoading?: boolean;
  onOk: () => void | Promise<void>;
  onCancel: () => void;
}

// 승인/반려/삭제 등 단순 확인 모달
function ConfirmModal({ open, title, content, okText = '확인', danger, confirmLoading, onOk, onCancel }: ConfirmModalProps) {
  return (
    <Modal
      open={open}
      title={title}
      okText={okText}
      okButtonProps={{ danger }}
      confirmLoading={confirmLoading}
      onOk={onOk}
      onCancel={onCancel}
    >
      {content}
    </Modal>
  );
}

export default ConfirmModal;
