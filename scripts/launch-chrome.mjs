#!/usr/bin/env node
/**
 * Launch system Chrome via Playwright — already signed in to Google.
 * Usage: node scripts/launch-chrome.mjs
 */
import { chromium } from 'playwright';

const browser = await chromium.launch({ 
  channel: 'chrome',
  headless: false,
  args: ['--no-sandbox', '--start-maximized']
});
const page = await browser.newPage();
await page.goto('https://maps.google.com');
console.log('✅ Chrome is open on screen. Already signed in.');

// Keep alive
await new Promise(() => {});
