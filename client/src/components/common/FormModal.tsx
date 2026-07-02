import type { ReactNode } from 'react';
import { Modal } from 'antd';
import { FormProvider, useForm } from 'react-hook-form';
import type { DefaultValues, FieldValues } from 'react-hook-form';

interface FormModalProps<T extends FieldValues> {
  open: boolean;
  title: string;
  defaultValues?: DefaultValues<T>;
  confirmLoading?: boolean;
  onSubmit: (values: T) => void | Promise<void>;
  onCancel: () => void;
  children: ReactNode;
}

// 등록/수정 공통 모달 — 실제 입력 필드는 children에서 useFormContext()로 접근
function FormModal<T extends FieldValues>({
  open,
  title,
  defaultValues,
  confirmLoading,
  onSubmit,
  onCancel,
  children,
}: FormModalProps<T>) {
  const methods = useForm<T>({ defaultValues });

  return (
    <Modal
      open={open}
      title={title}
      confirmLoading={confirmLoading}
      onOk={() => methods.handleSubmit(onSubmit)()}
      onCancel={onCancel}
      destroyOnClose
    >
      <FormProvider {...methods}>
        <form onSubmit={(e) => e.preventDefault()}>{children}</form>
      </FormProvider>
    </Modal>
  );
}

export default FormModal;
