'use client';

import { memo } from 'react';
import type { NodeProps, Node } from '@xyflow/react';
import { Brain } from 'lucide-react';
import { BaseNode } from './BaseNode';
import type { CustomNodeData } from './types';

type AiLlmNodeType = Node<CustomNodeData, 'ai_llm'>;

function AiLlmNodeComponent({ data }: NodeProps<AiLlmNodeType>) {
  return (
    <BaseNode
      label={data.label}
      typeLabel={data.typeLabel}
      disabled={data.disabled}
      status={data.status}
      icon={<Brain className="h-4 w-4 text-purple-500" />}
      borderColorClass="border-l-purple-500"
      iconBgClass="bg-purple-500/10"
      hasEditableParams={data.editableParamCount > 0}
    />
  );
}

export const AiLlmNode = memo(AiLlmNodeComponent);
