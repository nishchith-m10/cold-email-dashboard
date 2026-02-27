'use client';

import { memo } from 'react';
import type { NodeProps, Node } from '@xyflow/react';
import { GitBranch } from 'lucide-react';
import { BaseNode } from './BaseNode';
import type { CustomNodeData } from './types';

type LogicRoutingNodeType = Node<CustomNodeData, 'logic_routing'>;

function LogicRoutingNodeComponent({ data }: NodeProps<LogicRoutingNodeType>) {
  return (
    <BaseNode
      label={data.label}
      typeLabel={data.typeLabel}
      disabled={data.disabled}
      status={data.status}
      icon={<GitBranch className="h-4 w-4 text-gray-400" />}
      borderColorClass="border-l-gray-400"
      iconBgClass="bg-gray-400/10"
      hasEditableParams={data.editableParamCount > 0}
    />
  );
}

export const LogicRoutingNode = memo(LogicRoutingNodeComponent);
