import fs from 'fs';

const content = fs.readFileSync('src/pages/ProductsPage.tsx', 'utf8');
const lines = content.split('\n');

let balance = 0;
lines.forEach((line, index) => {
  // Find all <div but NOT followed by /> 
  // This is a bit tricky with regex for multi-line but let's try line by line for common cases
  const opens = (line.match(/<div(?![^>]*\/>)/g) || []).length;
  const closes = (line.match(/<\/div>/g) || []).length;
  balance += opens - closes;
  if (opens > 0 || closes > 0) {
    console.log(`Line ${index + 1}: Balance ${balance}`);
  }
});

console.log(`Final balance: ${balance}`);
