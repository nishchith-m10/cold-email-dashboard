'use client';

import { memo } from 'react';
import type { NodeProps, Node } from '@xyflow/react';
import { Mail } from 'lucide-react';
import { BaseNode } from './BaseNode';
import type { CustomNodeData } from './types';

type EmailSendNodeType = Node<CustomNodeData, 'email_send'>;

function EmailSendNodeComponent({ data }: NodeProps<EmailSendNodeType>) {
  return (
    <BaseNode
      label={data.label}
      typeLabel={data.typeLabel}
      disabled={data.disabled}
      status={data.status}
      icon={<Mail className="h-4 w-4 text-blue-500" />}
      borderColorClass="border-l-blue-500"
      iconBgClass="bg-blue-500/10"
      hasEditableParams={data.editableParamCount > 0}
    />
  );
}

export const EmailSendNode = memo(EmailSendNodeComponent);
