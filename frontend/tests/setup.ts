import { Browser, Page } from 'puppeteer';

declare global {
  var browser: Browser;
  var page: Page;
}

// Increase timeout for all tests
jest.setTimeout(30000);