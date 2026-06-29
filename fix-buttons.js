const fs = require('fs');
const file = 'src/app/(dashboard)/operaciones/components/TaskPanel.tsx';
let content = fs.readFileSync(file, 'utf8');

// Replace all <button that don't have type= inside them
// We can use a regex that matches <button and the rest of the tag up to >
content = content.replace(/<button([^>]*)>/g, (match, attrs) => {
  if (attrs.includes('type=')) {
    return match; // already has type
  }
  return `<button type="button"${attrs}>`;
});

fs.writeFileSync(file, content);
console.log('Fixed buttons in TaskPanel.tsx');
