'use client';

import { memo } from 'react';
import type { NodeProps, Node } from '@xyflow/react';
import { Database } from 'lucide-react';
import { BaseNode } from './BaseNode';
import type { CustomNodeData } from './types';

type DataDbNodeType = Node<CustomNodeData, 'data_db'>;

function DataDbNodeComponent({ data }: NodeProps<DataDbNodeType>) {
  return (
    <BaseNode
      label={data.label}
      typeLabel={data.typeLabel}
      disabled={data.disabled}
      status={data.status}
      icon={<Database className="h-4 w-4 text-amber-500" />}
      borderColorClass="border-l-amber-500"
      iconBgClass="bg-amber-500/10"
      hasEditableParams={data.editableParamCount > 0}
    />
  );
}

export const DataDbNode = memo(DataDbNodeComponent);
