import sys

def check_balance(filename):
    with open(filename, 'r') as f:
        lines = f.readlines()
        
    stack = []
    
    for i, line in enumerate(lines):
        in_string = False
        quote = ''
        
        for j, c in enumerate(line):
            if not in_string and (c == '"' or c == "'" or c == "`"):
                in_string = True
                quote = c
            elif in_string and c == quote:
                in_string = False
            elif not in_string:
                if c == '{':
                    stack.append(('{', i+1))
                elif c == '}':
                    if not stack or stack[-1][0] != '{':
                        print(f"Mismatched }} at line {i+1}. Stack: {stack[-5:]}")
                        return
                    stack.pop()
                elif c == '(':
                    stack.append(('(', i+1))
                elif c == ')':
                    if not stack or stack[-1][0] != '(':
                        print(f"Mismatched ) at line {i+1}. Stack: {stack[-5:]}")
                        return
                    stack.pop()
                    
    print(f"Final stack: {stack}")
    
check_balance('src/components/crm/DiscoveryForm.tsx')
