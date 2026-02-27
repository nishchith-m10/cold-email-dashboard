'use client';

import { memo } from 'react';
import type { NodeProps, Node } from '@xyflow/react';
import { BarChart3 } from 'lucide-react';
import { BaseNode } from './BaseNode';
import type { CustomNodeData } from './types';

type TrackingNodeType = Node<CustomNodeData, 'tracking'>;

function TrackingNodeComponent({ data }: NodeProps<TrackingNodeType>) {
  return (
    <BaseNode
      label={data.label}
      typeLabel={data.typeLabel}
      disabled={data.disabled}
      status={data.status}
      icon={<BarChart3 className="h-4 w-4 text-teal-500" />}
      borderColorClass="border-l-teal-500"
      iconBgClass="bg-teal-500/10"
      hasEditableParams={data.editableParamCount > 0}
    />
  );
}

export const TrackingNode = memo(TrackingNodeComponent);
