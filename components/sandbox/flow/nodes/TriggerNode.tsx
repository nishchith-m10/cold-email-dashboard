'use client';

import { memo } from 'react';
import type { NodeProps, Node } from '@xyflow/react';
import { Zap } from 'lucide-react';
import { BaseNode } from './BaseNode';
import type { CustomNodeData } from './types';

type TriggerNodeType = Node<CustomNodeData, 'trigger'>;

function TriggerNodeComponent({ data }: NodeProps<TriggerNodeType>) {
  return (
    <BaseNode
      label={data.label}
      typeLabel={data.typeLabel}
      disabled={data.disabled}
      status={data.status}
      icon={<Zap className="h-4 w-4 text-green-500" />}
      borderColorClass="border-l-green-500"
      iconBgClass="bg-green-500/10"
      hasEditableParams={data.editableParamCount > 0}
    />
  );
}

export const TriggerNode = memo(TriggerNodeComponent);
