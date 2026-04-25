import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  // Create a simple HTML page with Tiptap
  await page.goto('http://localhost:3000/es', { waitUntil: 'networkidle0' });
  
  // Wait for the editor to load
  await page.waitForSelector('.ProseMirror', { timeout: 10000 });
  
  // Click on the first ES in the list
  await page.click('button.w-full.flex.items-center.gap-4');
  
  // Wait for editor to become active
  await new Promise(r => setTimeout(r, 1000));
  
  // Focus the editor
  await page.focus('.ProseMirror');
  
  // Select all text
  await page.keyboard.down('Meta');
  await page.keyboard.press('a');
  await page.keyboard.up('Meta');
  
  // Click the text color button
  await page.click('button[title="文字色"]');
  
  // Wait for dropdown and click red
  await page.waitForSelector('[role="menuitemradio"][value="red"]', { visible: true });
  await page.click('[role="menuitemradio"][value="red"]');
  
  // Wait for the state to update
  await new Promise(r => setTimeout(r, 1000));
  
  // Get the content from the editor instance
  const content = await page.evaluate(() => {
    // Attempt to read the innerHTML or if there's a window variable
    return document.querySelector('.ProseMirror').innerHTML;
  });
  
  console.log("HTML AFTER COLOR CHANGE:", content);
  
  await browser.close();
})();
