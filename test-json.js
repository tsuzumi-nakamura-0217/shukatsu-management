const fs = require('fs');
const path = './data/sync/es-documents.json';
const data = JSON.parse(fs.readFileSync(path, 'utf8'));

// Find first document and add textColor to the first text node
let doc = data[0];
let contentObj = JSON.parse(doc.content);
let firstParagraph = contentObj.content.find(n => n.type === 'paragraph');
if (firstParagraph && firstParagraph.content && firstParagraph.content.length > 0) {
  let firstText = firstParagraph.content[0];
  firstText.marks = firstText.marks || [];
  firstText.marks.push({
    type: "textColor",
    attrs: {
      color: "red"
    }
  });
}
doc.content = JSON.stringify(contentObj);
fs.writeFileSync(path, JSON.stringify(data, null, 2));
console.log("Updated es-documents.json with textColor");
