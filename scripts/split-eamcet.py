#!/usr/bin/env python3
import re

TAXONOMY_PATH = '/Users/apple/Durt/Drut/packages/shared/src/lib/taxonomy.ts'

with open(TAXONOMY_PATH, 'r') as f:
    content = f.read()

# We need to find the block for value: 'eamcet'
# It starts with:
#     {
#         value: 'eamcet',
#         label: 'AP/TS EAMCET', ...
# And ends with corresponding closing brace "    },"

# Regex to capture the whole block is tricky because of nested braces.
# We will iterate lines to capture the block.

lines = content.split('\n')
start_idx = -1
end_idx = -1
brace_count = 0

for i, line in enumerate(lines):
    if "value: 'eamcet'," in line:
        # scan backwards to find the opening brace for this object
        # It should be the line before or a few lines before
        if lines[i-1].strip() == '{':
            start_idx = i-1
            brace_count = 1
            # now scan forward to find the matching closing brace
            for j in range(i, len(lines)):
                brace_count += lines[j].count('{')
                brace_count -= lines[j].count('}')
                if brace_count == 0:
                    end_idx = j
                    break
        break

if start_idx != -1 and end_idx != -1:
    eamcet_block_lines = lines[start_idx:end_idx+1]
    eamcet_block = '\n'.join(eamcet_block_lines)
    
    # Create AP EAPCET block
    ap_block = eamcet_block.replace("value: 'eamcet',", "value: 'ap_eapcet',")
    ap_block = ap_block.replace("label: 'AP/TS EAMCET',", "label: 'AP EAPCET',")
    
    # Create TS EAPCET block
    ts_block = eamcet_block.replace("value: 'eamcet',", "value: 'ts_eapcet',")
    ts_block = ts_block.replace("label: 'AP/TS EAMCET',", "label: 'TG EAPCET',")
    
    # Construct new content
    new_content = '\n'.join(lines[:start_idx]) + '\n' + ap_block + ',\n' + ts_block + '\n' + '\n'.join(lines[end_idx+1:])
    
    with open(TAXONOMY_PATH, 'w') as f:
        f.write(new_content)
    print("Successfully split EAMCET into AP and TS variants.")
else:
    print("Could not find EAMCET block.")
