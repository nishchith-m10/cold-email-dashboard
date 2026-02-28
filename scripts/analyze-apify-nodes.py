#!/usr/bin/env python3
import json, sys, os

def find_nodes(filepath):
    with open(filepath) as f:
        data = json.load(f)
    
    nodes = data.get('nodes', [])
    if not nodes:
        nodes = data.get('workflow', {}).get('nodes', [])
    
    print(f"\n{'='*60}")
    print(f"FILE: {filepath}")
    print(f"Total nodes: {len(nodes)}")
    print(f"{'='*60}")
    
    for node in nodes:
        name = node.get('name', '')
        ntype = node.get('type', '')
        params = node.get('parameters', {})
        
        name_lower = name.lower()
        
        # Apify / Google Reviews nodes
        if any(k in name_lower for k in ['apify', 'review', 'google maps', 'google review']):
            print(f"\n[APIFY/REVIEW NODE] {name}")
            print(f"  type: {ntype}")
            # Show URL
            url = params.get('url', '')
            if url:
                print(f"  url: {url}")
            # Show body/requestBody
            for bkey in ['body', 'requestBody', 'jsonBody']:
                if bkey in params:
                    val = params[bkey]
                    if isinstance(val, str):
                        try:
                            val = json.loads(val)
                        except:
                            pass
                    print(f"  {bkey}: {json.dumps(val)[:500]}")
            # Query params
            qp = params.get('queryParameters', params.get('query', {}))
            if qp:
                print(f"  queryParams: {json.dumps(qp)[:300]}")
            # Options
            opts = params.get('options', {})
            if opts:
                print(f"  options: {json.dumps(opts)[:200]}")
        
        # Filter nodes
        if any(k in name_lower for k in ['filter', 'star', 'rating', 'low', '3 star', 'three']):
            print(f"\n[FILTER NODE] {name}")
            print(f"  type: {ntype}")
            # Show conditions
            for ckey in ['conditions', 'rules', 'options', 'expression']:
                if ckey in params:
                    print(f"  {ckey}: {json.dumps(params[ckey])[:400]}")
            # Show full params if small
            if len(str(params)) < 600:
                print(f"  params: {json.dumps(params)[:600]}")
        
        # Claude/Anthropic/email drafting nodes
        if any(k in name_lower for k in ['claude', 'anthropic', 'draft email', 'write email', 'open analysis', 'pain point', 'personaliz']):
            print(f"\n[AI/DRAFTING NODE] {name}")
            print(f"  type: {ntype}")
            prompt = params.get('prompt', params.get('text', params.get('message', params.get('systemMessage', ''))))
            if isinstance(prompt, dict):
                prompt = json.dumps(prompt)
            if prompt:
                print(f"  prompt (first 400 chars): {str(prompt)[:400]}")
        
        # Research report / HTML output nodes
        if any(k in name_lower for k in ['report', 'html', 'research', 'output', 'generate report']):
            print(f"\n[REPORT/HTML NODE] {name}")
            print(f"  type: {ntype}")
            for pk in ['html', 'content', 'template', 'text', 'message']:
                if pk in params:
                    print(f"  {pk} (first 500): {str(params[pk])[:500]}")

# Run for both systems
for fp in [
    'base-cold-email/Email Preparation.json',
    'base-cold-email/Research Report.json',
    'cold-email-system/Email Preparation.json',
    'cold-email-system/Research Report.json',
]:
    if os.path.exists(fp):
        find_nodes(fp)
    else:
        print(f"\n[MISSING] {fp}")
