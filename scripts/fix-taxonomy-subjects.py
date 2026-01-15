#!/usr/bin/env python3
"""
Carefully add 'subject' field to all topics in taxonomy.ts  
Only adds subject to topic definitions, not subtopics or exam definitions.
"""

import re
import os

TAXONOMY_PATH = '/Users/apple/Durt/Drut/packages/shared/src/lib/taxonomy.ts'

# Read the file
with open(TAXONOMY_PATH, 'r') as f:
    content = f.read()

# Subject mapping
subject_map = {
    # CAT
    'percentages-profit-loss': 'Quantitative Aptitude',
    'ratios-averages-mixtures': 'Quantitative Aptitude',
    'time-speed-distance-work': 'Quantitative Aptitude',
    'simple-compound-interest': 'Quantitative Aptitude',
    'number-systems': 'Quantitative Aptitude',
    'geometry-mensuration': 'Quantitative Aptitude',
    'modern-math': 'Quantitative Aptitude',
    
    # Mathematics (default for most topics)
    'sets-relations-functions': 'Mathematics',
    'quadratic-equations': 'Mathematics',
    'complex-numbers': 'Mathematics',
    'sequences-and-series': 'Mathematics',
    'permutations-combinations': 'Mathematics',
    'binomial-theorem': 'Mathematics',
    'straight-lines': 'Mathematics',
    'conic-sections': 'Mathematics',
    'trigonometry': 'Mathematics',
    'matrices-determinants': 'Mathematics',
    'limits-continuity-differentiability': 'Mathematics',
    'application-of-derivatives': 'Mathematics',
    'integrals': 'Mathematics',
    'differential-equations': 'Mathematics',
    'vectors': 'Mathematics',
    '3d-geometry': 'Mathematics',
    'probability': 'Mathematics',
    'vector-algebra': 'Mathematics',
    'calculus': 'Mathematics',
    'coordinate-geometry': 'Mathematics',
    'trigonometry-ii': 'Mathematics',
    'circles': 'Mathematics',
    'integration': 'Mathematics',
    'differentiation': 'Mathematics',
    'class-12-math': 'Mathematics',
    'algebra': 'Mathematics',  # Will handle CAT context separately
    
    # Physics  
    'units-measurements': 'Physics',
    'kinematics': 'Physics',
    'laws-of-motion': 'Physics',
    'work-energy-power': 'Physics',
    'rotational-motion': 'Physics',
    'gravitation': 'Physics',
    'oscillations-waves': 'Physics',
    'electrostatics': 'Physics',
    'current-electricity': 'Physics',
    'magnetism': 'Physics',
    'electromagnetic-induction': 'Physics',
    'optics': 'Physics',
    'modern-physics': 'Physics',
    'thermodynamics-phy': 'Physics',
    'solids-fluids': 'Physics',
    'motion-in-a-plane': 'Physics',
    
    # Chemistry
    'atomic-structure': 'Chemistry',
    'chemical-bonding': 'Chemistry',
    'states-of-matter': 'Chemistry',
    'thermodynamics-chem': 'Chemistry',
    'equilibrium': 'Chemistry',
    'electrochemistry': 'Chemistry',
    'chemical-kinetics': 'Chemistry',
    'organic-chemistry': 'Chemistry',
    'coordination-compounds': 'Chemistry',
    'physical-chemistry': 'Chemistry',
    'inorganic-chemistry': 'Chemistry',
}

# Regex explanation:
# We look for the pattern of a topic definition.
# It usually starts with { inside the topics array (indentation 12 spaces usually)
# Then value: '...'
# Then label: '...' (order might vary but let's assume standard formatting from previous reads)
# We want to insert subject: '...' if it is missing.

# We will iterate line by line to be safer than a complex multiline regex
lines = content.split('\n')
new_lines = []
i = 0

while i < len(lines):
    line = lines[i]
    
    # Detect start of a topic object: 12 spaces indentation + {
    # But wait, looking at file content, format is:
    #             {
    #                 value: '...',
    #                 label: '...',
    # OR
    #             {
    #                 value: '...',
    #                 subject: '...', <-- if already exists
    
    new_lines.append(line)
    
    # Check if this line is defining a 'value' property for a TOPIC
    # Topics seem to be indented with 16 spaces for properties
    # e.g. "                value: 'percentages-profit-loss',"
    
    match = re.search(r'^(\s{16})value: \'([^\']+)\',', line)
    if match:
        indent = match.group(1)
        value = match.group(2)
        
        # Look ahead to see if 'subject' is already defined in the next few lines/previous lines?
        # Simpler: check if we just added it or if the next line is subject.
        
        # We need to know context (CAT vs others) for 'algebra'
        # A simple hack: check if we are in CAT section.
        # But for now, let's just use the map.
        
        subject = subject_map.get(value, 'Mathematics')
        
        # Handle Algebra context
        # If the value is 'algebra' and we are early in the file (CAT is first), it's Quant.
        # But 'lines' index `i` tells us where we are.
        # CAT is at the top. JEE is further down.
        if value == 'algebra':
            if i < 200: # CAT is usually the first exam
                subject = 'Quantitative Aptitude'
            else:
                subject = 'Mathematics'

        # Check if next line has subject
        if i + 1 < len(lines) and 'subject:' in lines[i+1]:
            # Already exists, do nothing
            pass
        else:
            # Insert subject
            # We already appended the 'value' line. Now append the subject line.
            new_lines.append(f"{indent}subject: '{subject}',")
            
    i += 1

output = '\n'.join(new_lines)

with open(TAXONOMY_PATH, 'w') as f:
    f.write(output)

print("Finished processing taxonomy.ts")
