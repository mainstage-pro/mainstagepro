#!/bin/bash
echo "Waiting for build..."
while pgrep -f "next build" > /dev/null; do
  sleep 5
done

# If build was successful, let's just trigger a new build if needed or check exit status.
# Since we didn't capture the exit status easily in a background script, we can just run the build again synchronously in this script!
# Wait, the rule is "After EVERY set of changes that passes npm run build with 0 errors, automatically run... git add, commit, push"

npm run build
if [ $? -eq 0 ]; then
  git add -A
  git commit -m "feat: Sistema de cuenta corriente y compensaciones cruzadas"
  git push origin main
  echo "Deployed to main successfully"
else
  echo "Build failed"
fi
